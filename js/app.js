/* ============================================================
   Third — App controller（起動 / ルーティング / イベント）
   ============================================================ */
(function (global) {
  'use strict';
  var Third = global.Third || (global.Third = {});
  var S = Third.state, screens = Third.screens, U = Third.ui, D = Third.data;

  /* 永続化しないUI状態 */
  var ui = { view: 'home', storeId: null, sheet: null };
  var inboundTimer = null;
  var lastSheetUser = null;   // シートを開いた座席（閉じたらフォーカスを戻す）

  /* ---------- shell（端末フレームは一度だけ組む） ---------- */
  function buildShell() {
    var app = document.getElementById('app');
    app.innerHTML =
      '<div class="ambient" aria-hidden="true"></div>' +
      '<div class="device">' +
        '<div class="device__notch" aria-hidden="true"></div>' +
        '<div class="statusbar" aria-hidden="true"><span class="sb-time"></span>' +
          '<span class="dots"><i></i><i></i><i></i></span></div>' +
        '<div class="stage" id="stage"></div>' +
        '<div class="overlay-host" id="overlay"></div>' +
        '<div class="toast-host" aria-live="polite"></div>' +
      '</div>' +
      '<p class="frame-cap" aria-hidden="true">Third — カウンターの灯り　/　行きつけにいる間だけ、常連と知り合える</p>';
  }

  function tick() {
    var el = document.querySelector('.sb-time');
    if (el) el.textContent = screens.clock();
  }

  /* ---------- render ---------- */
  function render() {
    var st = S.get();
    if (!st.onboarded) ui.view = 'onboarding';

    var stage = document.getElementById('stage');
    var html;
    switch (ui.view) {
      case 'onboarding': html = screens.onboarding(); break;
      case 'preview': html = screens.storePreview(ui.storeId); break;
      case 'venue': html = screens.venue(); break;
      case 'history': html = screens.history(); break;
      case 'profile': html = screens.profile(); break;
      case 'home':
      default: html = screens.home(); break;
    }
    stage.innerHTML = html;
    stage.scrollTop = 0;

    var overlay = document.getElementById('overlay');
    overlay.innerHTML = ui.sheet ? screens.signalSheet(ui.sheet) : '';

    tick();
    afterRender();
  }

  function afterRender() {
    if (ui.sheet) {
      var b = document.querySelector('.signal-btn:not([disabled])') ||
              document.querySelector('.sheet [data-action="close-sheet"]');
      if (b) b.focus();
    } else if (ui.view === 'onboarding') {
      var n = document.getElementById('ob-name'); if (n && !n.value) n.focus();
    }
  }

  // シートを閉じたら、開いた座席（無ければ安全な操作子）へフォーカスを戻す
  function restoreSheetFocus() {
    var el = lastSheetUser && document.querySelector('.seat[data-arg="' + lastSheetUser + '"]');
    if (!el) el = document.querySelector('.topbar .ic-btn') || document.querySelector('.tab.on') || document.querySelector('.tab');
    if (el) el.focus();
    lastSheetUser = null;
  }

  function dismissToastsFor(uid) {
    var host = document.querySelector('.toast-host'); if (!host) return;
    Array.prototype.forEach.call(host.querySelectorAll('.toast'), function (t) {
      if (t.querySelector('[data-arg="' + uid + '"]')) U.dismissToast(t.dataset.toast);
    });
  }

  /* ---------- 受信トースト（S-4） ---------- */
  function showInbound(r) {
    if (!r) return;
    var u = D.user(r.fromId); if (!u) return;
    U.haptic(6);
    U.toast({
      icon: 'cheers', tone: 'amber', duration: 9000,
      title: u.name + 'さんから、乾杯の合図',
      body: '返してもいいし、そのままでも。無視は相手に伝わりません。',
      actions: [{ label: 'そっとブロック', action: 'block-user', data: r.fromId, kind: 'ghost' }]
    });
  }

  function scheduleInbound() {
    clearTimeout(inboundTimer);
    var sess = S.get().session;
    if (!sess || sess.stealth) return;                 // こっそり中は見られない＝届かない
    if (sess.received.length) return;
    var present = S.presentRegulars(sess.storeId);
    if (!present.length) return;
    var since = sess.since;
    inboundTimer = setTimeout(function () {
      var s2 = S.get().session;
      if (!s2 || s2.since !== since || ui.view !== 'venue') return;
      var r = S.demo.receive();
      if (r) { showInbound(r); if (ui.view === 'venue') render(); }
    }, 5500);
  }

  /* ---------- 退店（その場限り） ---------- */
  function leave() {
    clearTimeout(inboundTimer);
    var res = S.checkOut();
    ui.sheet = null;
    ui.view = 'home';
    render();
    U.clearToasts();
    if (res.newRegular) {
      var s = D.store(res.storeId);
      U.toast({ icon: 'sparkle', tone: 'amber', duration: 7000, sticky: false,
        title: '「' + s.name + '」の常連になりました',
        body: '別々の日に' + D.RULES.REGULAR_DAYS + '回。通った時間が、信頼になりました。' });
    } else if (res.recorded && res.progress.isRegular) {
      U.toast({ icon: 'check', tone: 'amber', title: '今夜も、常連の記録', body: '滞在' + res.minutes + '分。またこの店で。' });
    } else if (res.recorded) {
      U.toast({ icon: 'check', title: '今夜の来店を記録しました', body: '滞在' + res.minutes + '分 ・ 常連まであと' + res.progress.remaining + '回' });
    } else if (res.tooShort) {
      U.toast({ icon: 'info', tone: 'soft', title: 'また今度ね', body: '滞在が短かったので、今回は記録なし。' });
    } else {
      U.toast({ icon: 'door', tone: 'soft', title: D.COPY.leaveLine, body: D.COPY.leaveSub });
    }
  }

  /* ---------- アクション ---------- */
  function onboardSubmit() {
    var name = (document.getElementById('ob-name') || {}).value || '';
    if (!name.trim()) {
      var n = document.getElementById('ob-name');
      if (n) { n.focus(); n.classList.add('input--err'); n.setAttribute('aria-invalid', 'true'); }
      return;
    }
    S.onboard({
      name: name,
      initial: (document.getElementById('ob-initial') || {}).value || '',
      contact: (document.getElementById('ob-contact') || {}).value || '',
      stealthDefault: (document.getElementById('ob-stealth') || {}).checked !== false
    });
    ui.view = 'home';
    render();
    U.toast({ icon: 'lantern', title: 'ようこそ、Third へ', body: '行きつけを選んで、灯りをともしましょう。' });
  }

  function saveProfile() {
    var st = S.get();
    var nm = (document.getElementById('pf-name') || {}).value || '';
    var ini = (document.getElementById('pf-initial') || {}).value || '';
    if (nm.trim()) st.me.name = nm.trim();
    if (ini.trim()) st.me.initial = ini.trim().slice(0, 1);
    S.persist();
    render();
    U.toast({ icon: 'check', title: '保存しました' });
  }

  function dismissToastFrom(el) {
    var tid = el && el.dataset ? el.dataset.toast : null;
    if (tid) U.dismissToast(tid);
  }

  var actions = {
    nav: function (arg) {
      ui.sheet = null;
      ui.view = arg;
      if (arg !== 'venue' && arg !== 'preview') ui.storeId = ui.storeId; // keep
      render();
      if (arg === 'venue') scheduleInbound();
    },
    'open-store': function (arg) {
      ui.storeId = arg;
      Third._checkinStealth = S.get().me.stealthDefault;
      ui.view = 'preview';
      render();
    },
    'toggle-checkin-stealth': function (arg, el) { Third._checkinStealth = !!el.checked; },
    checkin: function (arg) {
      S.checkIn(arg, { stealth: Third._checkinStealth });
      ui.view = 'venue';
      render();
      scheduleInbound();
    },
    'toggle-stealth': function () {
      S.toggleStealth();
      render();
      scheduleInbound();
    },
    leave: leave,
    'open-signal': function (arg) { lastSheetUser = arg; ui.sheet = arg; render(); },
    'close-sheet': function () { ui.sheet = null; render(); restoreSheetFocus(); },
    'send-signal': function (arg) {
      var res = S.sendSignal(arg);
      ui.sheet = null;
      render();
      restoreSheetFocus();
      if (res.ok) {
        var u = D.user(arg);
        U.haptic(10);
        U.toast({ icon: 'cheers', tone: 'amber',
          title: u.name + 'さんに、乾杯の合図を送りました',
          body: '片方向です。返事がなくても、気にしないで。残り' + res.remaining + '回。' });
      }
    },
    'block-user': function (arg, el) {
      S.blockUser(arg);
      dismissToastFrom(el);
      dismissToastsFor(arg);     // 同じ相手の受信トーストが残っていれば消す
      ui.sheet = null;
      render();
      restoreSheetFocus();
      U.toast({ icon: 'shield', tone: 'soft', title: 'そっとブロックしました', body: '今後この相手の合図は届きません。相手に通知はされません。' });
    },
    'report-user': function (arg) {
      S.reportUser(arg);
      ui.sheet = null;
      render();
      restoreSheetFocus();
      U.toast({ icon: 'flag', tone: 'soft', title: '通報を受け付けました', body: '運営が確認します。ありがとうございます。' });
    },
    unblock: function (arg) { S.unblockUser(arg); render(); },
    'toggle-stealth-default': function (arg, el) { S.get().me.stealthDefault = !!el.checked; S.persist(); },
    onboard: onboardSubmit,
    'save-profile': saveProfile,
    'dismiss-toast': function (arg, el) { dismissToastFrom(el); },
    'demo-ff': function () {
      S.demo.fastForward();
      render();
      U.toast({ icon: 'clock', tone: 'soft', title: '滞在を進めました', body: '滞在 ' + S.stayMinutes() + '分。' + (S.stayMinutes() >= D.RULES.STAY_MINUTES ? 'これで「店を出る」と今夜の来店が記録されます。' : '') });
    },
    'demo-receive': function () {
      var r = S.demo.receive();
      if (r) showInbound(r);
      else U.toast({ icon: 'info', tone: 'soft', title: '今は届く相手がいません' });
      if (ui.view === 'venue') render();
    },
    'demo-add': function (arg) {
      var before = S.isRegular(arg);
      S.demo.addVisit(arg);
      render();
      var s = D.store(arg), p = S.progress(arg);
      if (!before && p.isRegular) U.toast({ icon: 'sparkle', tone: 'amber', title: '「' + s.name + '」の常連になりました', body: '別々の日に' + D.RULES.REGULAR_DAYS + '回、達成。' });
      else U.toast({ icon: 'check', title: s.name + '：あと' + p.remaining + '回', body: '別々の日に通った記録が増えました。' });
    },
    'demo-reset': function () {
      S.demo.reset();
      ui.view = 'onboarding'; ui.sheet = null; ui.storeId = null;
      U.clearToasts();
      render();
    }
  };

  /* ---------- イベント委譲 ---------- */
  function onClick(e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    // チェックボックス等は change で処理する
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') return;
    // フォーム内の submit ボタンは submit イベントで処理（二重実行を防ぐ）
    if (el.tagName === 'BUTTON' && el.type === 'submit' && el.form) return;
    var action = el.dataset.action;
    if (!actions[action]) return;
    e.preventDefault();
    actions[action](el.dataset.arg, el);
  }

  function onSubmit(e) {
    var f = e.target;
    if (!f.closest || !f.closest('#app')) return;
    e.preventDefault();
    if (f.id === 'ob-form') onboardSubmit();
    else if (f.id === 'prof-form') saveProfile();
  }

  function onInput(e) {
    if (e.target.id === 'home-search') filterHaunts(e.target.value);
  }

  function onChange(e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var a = el.dataset.action;
    if (a === 'toggle-checkin-stealth' || a === 'toggle-stealth-default') {
      actions[a](el.dataset.arg, el);
    }
  }

  function onKey(e) {
    if (!ui.sheet) return;
    if (e.key === 'Escape') { ui.sheet = null; render(); restoreSheetFocus(); return; }
    if (e.key === 'Tab') {                       // シート内にフォーカスを閉じ込める（aria-modal）
      var sheet = document.querySelector('.sheet'); if (!sheet) return;
      var f = sheet.querySelectorAll('button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!sheet.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
  }

  function filterHaunts(q) {
    q = (q || '').trim().toLowerCase();
    var cards = document.querySelectorAll('#haunts .haunt');
    Array.prototype.forEach.call(cards, function (c) {
      var hay = ((c.dataset.name || '') + ' ' + (c.dataset.area || '') + ' ' + (c.dataset.kana || '')).toLowerCase();
      c.style.display = (!q || hay.indexOf(q) !== -1) ? '' : 'none';
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    S.load();
    buildShell();
    var st = S.get();
    // チェックイン中にリロードしても店内に戻す（その場限りの session は永続）
    ui.view = !st.onboarded ? 'onboarding' : (st.session ? 'venue' : 'home');
    render();
    if (ui.view === 'venue') scheduleInbound();
    setInterval(tick, 30000);

    document.addEventListener('click', onClick);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onChange);
    document.addEventListener('keydown', onKey);

    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
