/* ============================================================
   Third — State & domain logic
   ・localStorage 永続化
   ・チェックイン / 滞在判定 / 常連認定（別々の日に5回）
   ・ゆるい合図（片方向・一晩の上限）
   ・その場限り（店を出ると session を破棄）
   ・そっとブロック / 通報 / 可視性デフォルト
   ============================================================ */
(function (global) {
  'use strict';

  var Third = global.Third || (global.Third = {});
  var data = Third.data;
  var RULES = data.RULES;
  var KEY = 'third.state.v1';

  var state = null;
  var rseq = 0;   // 受信IDの単調増加カウンタ（同一ms衝突を防ぐ）

  /* ---------- 日付ユーティリティ ---------- */
  function dayKey(d) {
    d = d || new Date();
    var y = d.getFullYear();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var day = ('0' + d.getDate()).slice(-2);
    return y + '-' + m + '-' + day;
  }
  function daysAgo(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return d;
  }

  /* ---------- 永続化 ---------- */
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { /* プライベートモード等では黙って続行 */ }
  }
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) {}
    if (raw) {
      try { state = JSON.parse(raw); } catch (e) { state = null; }
    }
    if (!state || state.v !== 1) { state = freshState(); persist(); }
    // 後方互換のための既定値補完
    if (!state.nightSignals) state.nightSignals = { day: dayKey(), to: [] };
    if (!state.me) state.me = freshState().me;
    if (!state.me.blocked) state.me.blocked = [];
    if (!state.me.reports) state.me.reports = [];
    if (!state.visits) state.visits = {};
    return state;
  }

  function freshState() {
    return {
      v: 1,
      onboarded: false,
      me: {
        id: 'me', name: 'あなた', initial: 'あ', contact: '',
        stealthDefault: true,   // 可視性は安全側がデフォルト（F-3）
        blocked: [],
        reports: []
      },
      visits: {},               // { storeId: [ {day, minutes, valid} ] }
      // 合図の上限は「一晩」単位（夜をまたぐ／再チェックインでリセットしない）
      nightSignals: { day: dayKey(), to: [] },
      session: null             // 現在のチェックイン（その場限り）
    };
  }

  /* 「あなた」の初期来店履歴を別々の過去日で生成 */
  function seedVisits() {
    var offsets = {
      tomoshibi: [30, 21, 14, 9, 5, 2],
      nigohan:   [28, 18, 11, 6, 3],
      yoake:     [12, 7, 3],
      haze:      [9]
    };
    var minutes = [52, 64, 41, 73, 48, 58];
    var visits = {};
    Object.keys(data.ME_SEED_VISITS).forEach(function (sid) {
      var n = data.ME_SEED_VISITS[sid];
      var offs = offsets[sid] || [];
      var list = [];
      for (var i = 0; i < n; i++) {
        list.push({ day: dayKey(daysAgo(offs[i] != null ? offs[i] : (i + 1) * 3)),
                    minutes: minutes[i % minutes.length], valid: true });
      }
      visits[sid] = list;
    });
    return visits;
  }

  /* ---------- オンボーディング ---------- */
  function onboard(form) {
    state.me.name = (form.name || '').trim() || 'あなた';
    state.me.initial = (form.initial || state.me.name.slice(0, 1) || 'あ').slice(0, 1);
    state.me.contact = (form.contact || '').trim();
    state.me.stealthDefault = form.stealthDefault !== false;
    state.visits = seedVisits();
    state.onboarded = true;
    persist();
  }

  /* ---------- 常連判定（R-1 / R-2） ---------- */
  function validDays(storeId) {
    var list = state.visits[storeId] || [];
    var days = {};
    list.forEach(function (v) { if (v.valid) days[v.day] = true; });
    return Object.keys(days).length;
  }
  function isRegular(storeId) { return validDays(storeId) >= RULES.REGULAR_DAYS; }
  function progress(storeId) {
    var n = validDays(storeId);
    return { count: n, need: RULES.REGULAR_DAYS, remaining: Math.max(0, RULES.REGULAR_DAYS - n), isRegular: n >= RULES.REGULAR_DAYS };
  }
  /* 在籍ラベル（例：常連1年2ヶ月）。最初の有効来店からの経過で概算 */
  function regularTenure(storeId) {
    var list = (state.visits[storeId] || []).filter(function (v) { return v.valid; });
    if (!list.length) return '';
    var first = list.map(function (v) { return v.day; }).sort()[0];
    var fp = first.split('-');                          // 'YYYY-MM-DD' をローカル日付として解釈（UTC解釈のズレを防ぐ）
    var ms = Date.now() - new Date(+fp[0], +fp[1] - 1, +fp[2]).getTime();
    var months = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24 * 30)));
    if (months < 12) return '常連' + months + 'ヶ月';
    var y = Math.floor(months / 12), m = months % 12;
    return '常連' + y + '年' + (m ? m + 'ヶ月' : '');
  }

  /* ---------- ブロック / 通報（F-1 / F-2） ---------- */
  function isBlocked(uid) { return state.me.blocked.indexOf(uid) !== -1; }
  function blockUser(uid) {
    if (!isBlocked(uid)) state.me.blocked.push(uid);
    if (state.session) {
      state.session.received = state.session.received.filter(function (r) { return r.fromId !== uid; });
    }
    persist();
  }
  function unblockUser(uid) {
    state.me.blocked = state.me.blocked.filter(function (x) { return x !== uid; });
    persist();
  }
  function reportUser(uid) {
    state.me.reports.push({ uid: uid, at: Date.now() });
    persist();
    return true;
  }

  /* ---------- 今いる常連（S-1） ---------- */
  function presentRegulars(storeId) {
    var s = data.store(storeId);
    if (!s) return [];
    return s.presentNow.filter(function (uid) { return !isBlocked(uid); });
  }
  /* 性別比モニタリング（F-4・運営運用） */
  function genderBalance(storeId) {
    var ids = presentRegulars(storeId);
    var m = 0, f = 0;
    ids.forEach(function (uid) {
      var u = data.user(uid); if (!u) return;
      if (u.gender === 'm') m++; else if (u.gender === 'f') f++;
    });
    var total = m + f;
    return { m: m, f: f, total: total, skewed: total >= 3 && (m === 0 || f === 0) };
  }

  /* ---------- チェックイン / 滞在 / 退店（L-2〜L-4） ---------- */
  function checkIn(storeId, opts) {
    opts = opts || {};
    var stealth = opts.stealth != null ? opts.stealth : state.me.stealthDefault;
    state.session = {
      storeId: storeId,
      since: Date.now(),
      bonusMinutes: 0,                 // デモ用の早送り分
      stealth: !!stealth,
      sentTo: [],                      // この滞在で✓表示する相手
      received: []
    };
    persist();
    return state.session;
  }
  function stayMinutes() {
    if (!state.session) return 0;
    var real = (Date.now() - state.session.since) / 60000;
    return Math.floor(real + state.session.bonusMinutes);
  }
  function toggleStealth() {
    if (!state.session) return;
    state.session.stealth = !state.session.stealth;
    persist();
  }

  /* 退店＝その場限りのリセット。
     滞在が一定以上かつ「今日まだ数えていなければ」有効来店として記録。 */
  function checkOut() {
    var s = state.session;
    if (!s) return { recorded: false };
    var sid = s.storeId;
    var wasRegular = isRegular(sid);
    var mins = stayMinutes();
    var today = dayKey();
    var list = state.visits[sid] || (state.visits[sid] = []);
    var countedToday = list.some(function (v) { return v.valid && v.day === today; });

    var recorded = false;
    if (mins >= RULES.STAY_MINUTES && !countedToday) {
      list.push({ day: today, minutes: mins, valid: true });
      recorded = true;
    }
    var nowRegular = isRegular(sid);

    state.session = null;          // ← その場限り：やりとりは破棄
    persist();

    return {
      recorded: recorded,
      minutes: mins,
      tooShort: mins < RULES.STAY_MINUTES,
      storeId: sid,
      newRegular: !wasRegular && nowRegular,
      progress: progress(sid)
    };
  }

  /* ---------- ゆるい合図（S-2〜S-4） ---------- */
  /* 一晩の合図上限（夜単位で持続。再チェックインしてもリセットされない＝乱射の最大ブレーキ §7.2.1） */
  function nightState() {
    if (!state.nightSignals || state.nightSignals.day !== dayKey()) {
      state.nightSignals = { day: dayKey(), to: [] };
    }
    return state.nightSignals;
  }
  function hasSignaled(uid) { return nightState().to.indexOf(uid) !== -1; }
  function signalsRemaining() { return Math.max(0, RULES.SIGNALS_PER_NIGHT - nightState().to.length); }

  function canSignal(uid) {
    var s = state.session;
    if (!s) return { ok: false, reason: 'not-in-store' };
    if (s.stealth) return { ok: false, reason: 'stealth' };            // こっそり＝見るだけ。送るには表示へ（L-4）
    if (isBlocked(uid)) return { ok: false, reason: 'blocked' };
    if (hasSignaled(uid)) return { ok: false, reason: 'already' };
    if (signalsRemaining() <= 0) return { ok: false, reason: 'no-quota' };
    if (presentRegulars(s.storeId).indexOf(uid) === -1) return { ok: false, reason: 'absent' };
    return { ok: true };
  }
  function sendSignal(uid) {
    var c = canSignal(uid);
    if (!c.ok) return c;
    nightState().to.push(uid);                       // 夜単位で記録（永続）
    if (state.session) state.session.sentTo.push(uid);
    persist();
    return { ok: true, remaining: signalsRemaining() };
  }

  /* 受信（S-4）。無視しても送り手には伝わらない。 */
  function receiveSignal(fromId) {
    if (!state.session || isBlocked(fromId)) return null;
    var r = { id: 'r' + Date.now() + '_' + (++rseq), fromId: fromId, at: Date.now(), status: 'new' };
    state.session.received.unshift(r);
    persist();
    return r;
  }
  function ignoreReceived(id) {
    if (!state.session) return;
    state.session.received.forEach(function (r) { if (r.id === id) r.status = 'seen'; });
    persist();
  }
  function receivedNew() {
    if (!state.session) return [];
    return state.session.received.filter(function (r) { return r.status === 'new'; });
  }

  /* ---------- デモ補助（透明性のため明示的に分離） ---------- */
  var demo = {
    addVisit: function (storeId) {              // 別の日に来店した、として1回ぶん加算
      var list = state.visits[storeId] || (state.visits[storeId] = []);
      // 既存と重複しない過去日を選ぶ
      var used = {}; list.forEach(function (v) { used[v.day] = 1; });
      var n = 1, day;
      do { day = dayKey(daysAgo(n)); n++; } while (used[day] && n < 400);
      list.push({ day: day, minutes: 46, valid: true });
      persist();
      return progress(storeId);
    },
    fastForward: function (mins) {              // 滞在時間を進める
      if (state.session) { state.session.bonusMinutes += (mins || RULES.STAY_MINUTES); persist(); }
      return stayMinutes();
    },
    receive: function () {                      // 在店の常連から合図が届く
      if (!state.session || state.session.stealth) return null;   // こっそり中は見られない＝届かない
      var present = presentRegulars(state.session.storeId)
        .filter(function (uid) { return state.session.sentTo.indexOf(uid) === -1; });
      if (!present.length) return null;
      return receiveSignal(present[Math.floor(Math.random() * present.length)]);
    },
    reset: function () {
      state = freshState();
      persist();
    }
  };

  Third.state = {
    load: load, get: function () { return state; }, persist: persist,
    onboard: onboard,
    dayKey: dayKey,
    validDays: validDays, isRegular: isRegular, progress: progress, regularTenure: regularTenure,
    isBlocked: isBlocked, blockUser: blockUser, unblockUser: unblockUser, reportUser: reportUser,
    presentRegulars: presentRegulars, genderBalance: genderBalance,
    checkIn: checkIn, stayMinutes: stayMinutes, toggleStealth: toggleStealth, checkOut: checkOut,
    canSignal: canSignal, sendSignal: sendSignal, signalsRemaining: signalsRemaining, hasSignaled: hasSignaled,
    receiveSignal: receiveSignal, ignoreReceived: ignoreReceived, receivedNew: receivedNew,
    demo: demo
  };
})(window);
