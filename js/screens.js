/* ============================================================
   Third — Screens（各画面の描画）
   stage に差し込む HTML 文字列を返す純粋関数群。
   イベントは app.js が data-action のデリゲートで処理する。
   ============================================================ */
(function (global) {
  'use strict';
  var Third = global.Third || (global.Third = {});
  var D = Third.data, S = Third.state, U = Third.ui, icon = Third.icons.icon, esc = Third.ui.esc;
  var COPY = D.COPY;

  /* ---------- 小物 ---------- */
  function avatar(o) {
    o = o || {};
    var cls = 'av' + (o.me ? ' av--me' : '') + (o.lg ? ' av--lg' : '') + (o.sm ? ' av--sm' : '') + (o.ghost ? ' av--ghost' : '');
    var glow = o.glow ? '<span class="av__glow" style="animation-delay:' + (o.delay || 0) + 's"></span>' : '';
    return '<div class="' + cls + '">' + esc(o.initial || '・') + glow + '</div>';
  }

  function tabbar(active, opts) {
    opts = opts || {};
    var innDis = opts.innDisabled ? ' is-dim' : '';
    function tab(view, key, label) {
      return '<button class="tab' + (active === view ? ' on' : '') + (view === 'venue' ? innDis : '') +
        '" data-action="nav" data-arg="' + view + '" aria-current="' + (active === view ? 'page' : 'false') + '">' +
        icon(key, { sw: 1.5 }) + '<span>' + label + '</span></button>';
    }
    return '<nav class="tabbar" aria-label="メインナビゲーション">' +
      tab('home', 'home', '止まり木') +
      tab('venue', 'inn', '店内') +
      tab('history', 'clock', '履歴') +
      '</nav>';
  }

  function topbar(o) {
    o = o || {};
    var left = o.back
      ? '<button class="ic-btn" data-action="' + esc(o.back.action || 'nav') + '"' +
          (o.back.arg ? ' data-arg="' + esc(o.back.arg) + '"' : '') + ' aria-label="戻る">' + icon('back', { sw: 1.6 }) + '</button>'
      : '<span class="lantern" aria-hidden="true"></span>';
    var right = o.right || '';
    return '<header class="topbar">' +
      '<div class="topbar__l">' + left + '<span class="topbar__title">' + (o.title || '') + '</span></div>' +
      '<div class="topbar__r">' + right + '</div>' +
      '</header>';
  }

  function lampRow(present, regular, remaining) {
    var lit = Math.min(present, 5);
    var dots = '';
    for (var i = 0; i < 5; i++) dots += '<span class="lamp' + (i < lit ? '' : ' off') + '"></span>';
    var cap, dim = false;
    if (present >= 5) cap = '今夜は賑わってる';
    else if (present >= 3) cap = 'ぽつぽつと灯る';
    else if (present >= 1) cap = '静かな夜';
    else { cap = regular ? '誰もいない' : (remaining + '回で灯る'); dim = true; }
    return '<div class="lamp-row">' + dots +
      '<span class="lamp-cap' + (dim ? ' dim' : '') + '">' + cap + '</span></div>';
  }

  /* ============================================================
     0. オンボーディング（A-1 / A-2 / F-3）
     ============================================================ */
  function onboarding() {
    var me = S.get().me;
    return '<div class="ob">' +
      '<div class="ob__intro">' +
        '<div class="brand"><span class="lantern"></span><span class="brand__t">' + COPY.brand + '</span></div>' +
        '<h1 class="ob__h">' + COPY.introLead + '</h1>' +
        '<p class="ob__sub">' + COPY.introSub + '</p>' +
        '<p class="ob__note">' + esc(COPY.introNote) + '</p>' +
        '<div class="rule"></div>' +
      '</div>' +
      '<form class="ob__form" id="ob-form" autocomplete="off" novalidate>' +
        '<label class="field"><span class="field__l">ニックネーム</span>' +
          '<input id="ob-name" class="input" type="text" maxlength="12" placeholder="店での呼ばれ方" value="' + esc(me.name === 'あなた' ? '' : me.name) + '" required></label>' +
        '<label class="field"><span class="field__l">頭文字（アイコン）</span>' +
          '<input id="ob-initial" class="input" type="text" maxlength="1" placeholder="例：あ" value="' + esc(me.initial === 'あ' ? '' : me.initial) + '"></label>' +
        '<label class="field"><span class="field__l">電話番号 または メール<span class="field__opt">本人確認用・最小限</span></span>' +
          '<input id="ob-contact" class="input" type="text" inputmode="email" placeholder="090… / you@example.com" value="' + esc(me.contact) + '"></label>' +
        '<label class="check" for="ob-stealth"><input id="ob-stealth" type="checkbox" checked>' +
          '<span class="check__box">' + icon('check', { sw: 2 }) + '</span>' +
          '<span class="check__t">最初は「こっそり」で入る<small>リストに載らず、様子を見るだけ。あとで変えられます</small></span></label>' +
        '<button class="btn btn--amber" type="submit" data-action="onboard">はじめる</button>' +
        '<p class="ob__fine">' + icon('shield', { sw: 1.4 }) + 'フォロワー数も、いいねも、実名もありません。残るのは「通った事実」だけ。</p>' +
      '</form>' +
    '</div>';
  }

  /* ============================================================
     1. 止まり木（ホーム）— S-1 入口 / 灯り
     ============================================================ */
  function home() {
    var me = S.get().me;
    var right = '<button class="ic-btn ic-btn--avatar" data-action="nav" data-arg="profile" aria-label="プロフィール">' +
      avatar({ initial: me.initial, sm: true }) + '</button>';
    var cards = D.STORES.map(haunt).join('');
    return topbar({ title: COPY.homeTitle, right: right }) +
      '<div class="pbody"><div class="home">' +
        '<div class="home__head">' +
          '<div class="home-lead">' + COPY.homeLead + '</div>' +
          '<div class="home-sub">' + esc(COPY.homeSub) + '</div>' +
        '</div>' +
        '<label class="search" aria-label="店をさがす">' + icon('search', { sw: 1.5 }) +
          '<input id="home-search" class="search__in" type="search" placeholder="店をさがす（名前・エリア）" autocomplete="off"></label>' +
        '<div class="haunts" id="haunts">' + cards + '</div>' +
        '<p class="home__foot">' + esc('灯っているのは、今その店に常連がいる印。店を出れば、灯も消える。') + '</p>' +
      '</div></div>' +
      tabbar('home');
  }

  function haunt(store) {
    var present = S.presentRegulars(store.id).length;
    var reg = S.isRegular(store.id);
    var prog = S.progress(store.id);
    var lit = present > 0;
    var meta = reg
      ? ('徒歩' + store.walkMin + '分 ・ 今いる常連 ' + present + '人')
      : (store.open ? ('徒歩' + store.walkMin + '分 ・ あと' + prog.remaining + '回通えば常連')
                    : ('徒歩' + store.walkMin + '分 ・ 本日休み'));
    var badge = reg ? '<span class="badge">常連</span>' : '';
    return '<button class="haunt' + (lit ? ' lit' : '') + '" data-action="open-store" data-arg="' + store.id +
        '" data-name="' + esc(store.name) + '" data-area="' + esc(store.area) + '" data-kana="' + esc(store.kana) + '">' +
      badge +
      '<div class="haunt__r1"><h3 class="haunt__name">' + esc(store.name) + '</h3>' +
        '<div class="haunt__meta">' + esc(meta) + '</div></div>' +
      lampRow(present, reg, prog.remaining) +
      '</button>';
  }

  /* ============================================================
     2. 店のプレビュー → チェックイン（L-2 / L-3 / L-4）
     ============================================================ */
  function storePreview(storeId) {
    var s = D.store(storeId);
    if (!s) return home();
    var present = S.presentRegulars(s.id).length;
    var reg = S.isRegular(s.id);
    var prog = S.progress(s.id);
    var pref = Third._checkinStealth != null ? Third._checkinStealth : S.get().me.stealthDefault;

    var status = !s.open ? '本日休み'
      : present > 0 ? ('今 ' + present + '人の常連が灯しています')
      : 'まだ誰も灯していません';

    var cta = s.open
      ? '<button class="btn btn--amber" data-action="checkin" data-arg="' + s.id + '">' +
          icon('pin', { sw: 1.5 }) + 'この店にチェックイン</button>'
      : '<button class="btn btn--ghost" disabled>本日は休み</button>';

    return topbar({ title: '止まり木', back: { action: 'nav', arg: 'home' } }) +
      '<div class="pbody"><div class="preview">' +
        '<div class="preview__badge">' + (reg ? '<span class="badge">常連</span>' : '<span class="badge badge--soft">あと' + prog.remaining + '回</span>') + '</div>' +
        '<div class="preview__lantern"><span class="lantern" style="width:16px;height:16px"></span></div>' +
        '<h2 class="preview__name">' + esc(s.name) + '</h2>' +
        '<div class="preview__kana">' + esc(s.kana) + '</div>' +
        '<div class="preview__chips"><span class="chip">' + icon('pin', { sw: 1.4 }) + esc(s.area + ' ・ 徒歩' + s.walkMin + '分') + '</span>' +
          '<span class="chip">' + icon('clock', { sw: 1.4 }) + esc(s.hours) + '</span></div>' +
        '<p class="preview__blurb">' + esc(s.blurb) + '</p>' +
        '<div class="preview__status">' + lampRow(present, reg, prog.remaining) + '<div class="preview__statusT">' + esc(status) + '</div></div>' +
        '<label class="check check--row" for="pv-stealth"><input id="pv-stealth" type="checkbox" data-action="toggle-checkin-stealth"' + (pref ? ' checked' : '') + '>' +
          '<span class="check__box">' + icon('check', { sw: 2 }) + '</span>' +
          '<span class="check__t">こっそり入る<small>自分はリストに載らず、見るだけ</small></span></label>' +
        cta +
        '<p class="preview__gps">' + icon('shield', { sw: 1.4 }) + '位置情報は「この店にいる」の確認だけに使います。</p>' +
      '</div></div>' +
      tabbar('home');
  }

  /* ============================================================
     3. 店内（今いる常連）— S-1 / S-2 / その場限り
     ============================================================ */
  var LAYOUTS = {
    1: ['top:20%;left:50%;transform:translateX(-50%)'],
    2: ['top:18%;left:24%', 'top:18%;right:24%'],
    3: ['top:15%;left:17%', 'top:9%;left:50%;transform:translateX(-50%)', 'top:15%;right:17%'],
    4: ['top:14%;left:15%', 'top:9%;left:40%', 'top:9%;right:15%', 'top:40%;left:14%'],
    5: ['top:14%;left:16%', 'top:8%;left:50%;transform:translateX(-50%)', 'top:14%;right:16%', 'top:40%;left:13%', 'top:40%;right:13%'],
    6: ['top:13%;left:15%', 'top:8%;left:40%', 'top:13%;right:15%', 'top:39%;left:12%', 'top:42%;left:42%', 'top:39%;right:12%']
  };

  function venue(storeId) {
    var sess = S.get().session;
    if (!sess) return venueEmpty();
    var s = D.store(sess.storeId);
    var present = S.presentRegulars(sess.storeId);
    var me = S.get().me;
    var stealthBtn = '<button class="ic-btn" data-action="toggle-stealth" aria-pressed="' + (sess.stealth ? 'true' : 'false') +
      '" aria-label="' + (sess.stealth ? 'こっそり中：表示に切替' : '表示中：こっそりに切替') + '" title="' + (sess.stealth ? 'こっそり中' : '表示中') + '">' +
      icon(sess.stealth ? 'eyeOff' : 'eye', { sw: 1.5 }) + '</button>';

    var seats = '';
    var layout = LAYOUTS[Math.min(present.length, 6)] || LAYOUTS[6];
    present.forEach(function (uid, i) {
      var u = D.user(uid); if (!u) return;
      var pos = present.length <= 6 ? layout[i] : ('top:' + (10 + (i % 3) * 16) + '%;left:' + (12 + Math.floor(i / 3) * 30) + '%');
      var signaled = S.hasSignaled(uid);
      seats += '<button class="seat" style="' + pos + '" data-action="open-signal" data-arg="' + uid + '" aria-label="' + esc(u.name) + 'に合図">' +
        avatar({ initial: u.initial, glow: true, delay: (i * 0.5) }) +
        '<div class="seat__nm">' + esc(u.name) + (signaled ? ' <span class="seat__sent">✓</span>' : '') + '</div>' +
        '<div class="seat__yrs">' + esc(u.regularAt[s.id] || '常連') + '</div></button>';
    });

    var meSeat = '<div class="seat seat--me" style="bottom:12%;left:50%;transform:translateX(-50%)">' +
      avatar({ initial: me.initial, me: true, ghost: sess.stealth }) +
      '<div class="seat__nm" style="color:var(--amber-soft)">' + esc(me.name) + (sess.stealth ? '（見るだけ）' : '') + '</div>' +
      '<div class="seat__yrs">' + esc(S.regularTenure(s.id) || ('滞在 ' + S.stayMinutes() + '分')) + '</div></div>';

    var hint = present.length
      ? '<div class="hint">' + esc(COPY.venueHint) + '</div>'
      : '<div class="hint">' + esc('今はまだ、誰も灯していません。ゆっくりどうぞ。') + '</div>';

    var quota = '<span class="mini-quota">' + esc('今夜の合図 残り' + S.signalsRemaining() + '回') + '</span>';

    return topbar({ title: s.name, back: { action: 'leave' }, right: stealthBtn }) +
      '<div class="pbody"><div class="inn">' +
        '<div class="inn-hd"><div class="st"><span class="lantern"></span>チェックイン中 ・ ' + clock(sess.since) + '〜</div>' +
          '<div class="inn-hd__sub">' + esc(COPY.venueHere) + ' ' + present.length + '人</div></div>' +
        '<div class="inn-stage"><div class="counter-cap"></div>' + seats + meSeat + hint + '</div>' +
        '<div class="inn-foot">' +
          '<div class="inn-foot__row"><span class="dwell">' + icon('clock', { sw: 1.4 }) + '滞在 ' + S.stayMinutes() + '分</span>' + quota + '</div>' +
          '<button class="btn btn--leave" data-action="leave">' + icon('door', { sw: 1.5 }) + '店を出る</button>' +
          '<p class="inn-foot__safe">' + icon('shield', { sw: 1.3 }) + esc('片方向・一晩に上限・いつでもそっとブロック。') + '</p>' +
          demoBar([
            { label: 'デモ：滞在を進める', action: 'demo-ff' },
            { label: 'デモ：合図が届く', action: 'demo-receive' }
          ]) +
        '</div>' +
      '</div></div>' +
      tabbar('venue');
  }

  function venueEmpty() {
    return topbar({ title: '店内' }) +
      '<div class="pbody"><div class="empty">' +
        '<div class="empty__ic">' + icon('inn', { sw: 1.2 }) + '</div>' +
        '<h2 class="empty__h">今は、どの店にもいません</h2>' +
        '<p class="empty__p">止まり木から店を選んでチェックインすると、<br>今いる常連が見えます。</p>' +
        '<button class="btn btn--amber" data-action="nav" data-arg="home">止まり木をひらく</button>' +
      '</div></div>' +
      tabbar('venue', { innDisabled: true });
  }

  /* ============================================================
     4. 履歴 / 常連の証（R-1〜R-3）
     ============================================================ */
  function history() {
    var withVisits = D.STORES.filter(function (s) { return (S.get().visits[s.id] || []).length; });
    // 注目：常連未満で最も近い店（なければ最初の常連店）
    var featured = withVisits.filter(function (s) { return !S.isRegular(s.id); })
      .sort(function (a, b) { return S.validDays(b.id) - S.validDays(a.id); })[0]
      || withVisits.filter(function (s) { return S.isRegular(s.id); })[0]
      || withVisits[0];

    var body;
    if (!featured) {
      body = '<div class="empty"><div class="empty__ic">' + icon('clock', { sw: 1.2 }) + '</div>' +
        '<h2 class="empty__h">まだ記録がありません</h2>' +
        '<p class="empty__p">店に通うと、ここに「通った時間」が積もります。</p>' +
        '<button class="btn btn--amber" data-action="nav" data-arg="home">止まり木をひらく</button></div>';
    } else {
      body = creed(featured.id) +
        '<div class="rooms"><div class="rooms__t">通っている部屋</div>' +
        withVisits.map(function (s) { return roomRow(s); }).join('') + '</div>';
    }
    return topbar({ title: '通った記録' }) +
      '<div class="pbody"><div class="hist">' + body + '</div></div>' +
      tabbar('history');
  }

  function creed(storeId) {
    var s = D.store(storeId);
    var p = S.progress(storeId);
    var C = 389.5;
    var shown = Math.min(p.count, p.need);
    var to = Math.round(C * (1 - shown / p.need));
    var cap = p.isRegular ? 'この店の常連です' : ('常連まで、あと' + p.remaining + '歩');
    var sub = p.isRegular ? '通い続けた事実が、ここでの信頼。' : '別々の日に、あと' + p.remaining + '回';
    return '<div class="creed">' +
      '<div class="creed__store">' + esc(s.name) + '</div>' +
      '<div class="creed-ttl">' + esc(COPY.creedTitle) + '</div>' +
      '<div class="ring-wrap"><svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label="' + esc('常連まで ' + shown + ' / ' + p.need + ' 回') + '">' +
        '<circle cx="75" cy="75" r="62" fill="none" stroke="rgba(216,154,78,.14)" stroke-width="5"/>' +
        '<circle class="ring-prog" cx="75" cy="75" r="62" fill="none" stroke="url(#rg)" stroke-width="5" stroke-linecap="round" ' +
          'stroke-dasharray="' + C + '" stroke-dashoffset="' + to + '" transform="rotate(-90 75 75)" style="--from:' + C + ';--to:' + to + '"/>' +
        '<defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E6B978"/><stop offset="1" stop-color="#A85838"/></linearGradient></defs>' +
        '<text x="75" y="70" text-anchor="middle" fill="#F2E4CC" font-family="\'Shippori Mincho\',serif" font-weight="700" font-size="34">' + shown + '</text>' +
        '<text x="75" y="92" text-anchor="middle" fill="#8A7A66" font-size="10" letter-spacing="2">/ ' + p.need + ' 回</text>' +
      '</svg>' +
        '<div class="ring-cap">' + esc(cap) + '</div>' +
        '<div class="ring-sub">' + esc(sub) + '</div>' +
        '<div class="ring-sub ring-sub--q">急いで通っても近道はない。それでいい。</div>' +
      '</div>' +
      '<div class="timeline">' +
        '<div class="tl"><div class="dc"><span class="d fill"></span><span class="ln"></span></div>' +
          '<div class="tx"><b>1〜' + Math.min(p.count, p.need) + '回目</b><span>別々の夜に、ちゃんと飲んだ記録</span></div></div>' +
        '<div class="tl"><div class="dc"><span class="d' + (p.isRegular ? ' fill' : '') + '"></span></div>' +
          '<div class="tx"><b>' + p.need + '回目で「常連」に</b><span>同じ店に通い続けた事実だけが、ここでの信頼になる</span></div></div>' +
      '</div>' +
      '<div class="creed-foot"><p>' + COPY.creedFoot + '</p></div>' +
      '</div>';
  }

  function roomRow(s) {
    var p = S.progress(s.id);
    var reg = p.isRegular;
    var right = reg
      ? '<span class="badge">常連</span>'
      : '<span class="room__prog"><span class="room__bar"><i style="width:' + Math.round(p.count / p.need * 100) + '%"></i></span>' + p.count + '/' + p.need + '</span>';
    return '<button class="room" data-action="open-store" data-arg="' + s.id + '">' +
      '<span class="room__l"><span class="lantern" style="width:8px;height:8px"></span>' +
        '<span class="room__txt"><span class="room__nm">' + esc(s.name) + '</span>' +
        '<span class="room__sub">' + esc(reg ? S.regularTenure(s.id) : (s.area + ' ・ 徒歩' + s.walkMin + '分')) + '</span></span></span>' +
      '<span class="room__r">' + right + icon('chevron', { sw: 1.5, cls: 'room__chev' }) + '</span></button>';
  }

  /* ============================================================
     5. プロフィール / 設定（A-2 / F-1 / F-3 / プライバシー）
     ============================================================ */
  function profile() {
    var st = S.get(), me = st.me;
    var blocked = me.blocked.map(function (uid) {
      var u = D.user(uid); if (!u) return '';
      return '<div class="blk"><span class="blk__l">' + avatar({ initial: u.initial, sm: true }) + '<span>' + esc(u.name) + '</span></span>' +
        '<button class="link" data-action="unblock" data-arg="' + uid + '">解除</button></div>';
    }).join('') || '<div class="muted-row">ブロック中の相手はいません</div>';

    return topbar({ title: 'あなたと、安全', back: { action: 'nav', arg: 'home' } }) +
      '<div class="pbody"><div class="prof">' +
        '<div class="prof__id">' + avatar({ initial: me.initial, lg: true }) +
          '<div class="prof__idT"><div class="prof__nm">' + esc(me.name) + '</div>' +
          '<div class="prof__sub">' + esc(me.contact ? maskContact(me.contact) : '本人確認：未設定') + '</div></div></div>' +

        '<form class="card-form" id="prof-form">' +
          '<label class="field field--sm"><span class="field__l">ニックネーム</span>' +
            '<input id="pf-name" class="input" type="text" maxlength="12" value="' + esc(me.name) + '"></label>' +
          '<label class="field field--sm"><span class="field__l">頭文字</span>' +
            '<input id="pf-initial" class="input" type="text" maxlength="1" value="' + esc(me.initial) + '"></label>' +
          '<button class="btn btn--ghost btn--sm" type="submit" data-action="save-profile">保存</button>' +
        '</form>' +

        section('安全', icon('shield', { sw: 1.4 }),
          '<label class="row-toggle"><span class="row-toggle__t">こっそりを既定にする<small>新しい店では、まずリストに載らない</small></span>' +
            '<input type="checkbox" data-action="toggle-stealth-default"' + (me.stealthDefault ? ' checked' : '') + ' class="switch"></label>' +
          '<div class="sub-h">そっとブロック中</div>' + blocked +
          '<p class="fine">合図は片方向・一晩に上限つき。無視しても相手に伝わりません。困った相手は通報できます。</p>'
        ) +

        section('その場限り', icon('door', { sw: 1.4 }),
          '<p class="fine">つながるのは、店にいる間だけ。<b>店を出れば、合図のやりとりは残りません。</b>位置情報は「この店にいる」の確認に必要な分だけ取得します。</p>'
        ) +

        section('デモ操作', icon('gear', { sw: 1.4 }),
          '<p class="fine">プロトタイプ用。「通った時間が信頼になる」を体感するための操作です。</p>' +
          demoBar([
            { label: 'よあけに別の日として通う', action: 'demo-add', arg: 'yoake' },
            { label: '最初から（リセット）', action: 'demo-reset' }
          ], true)
        ) +

        '<p class="prof__credit">Third — カウンターの灯り　/　MVP v0.1 プロトタイプ</p>' +
      '</div></div>' +
      tabbar('');   // プロフィールはアバターから開く副画面：タブは非アクティブ
  }

  function section(title, ic, inner) {
    return '<section class="sect"><div class="sect__h">' + ic + '<span>' + esc(title) + '</span></div>' +
      '<div class="sect__b">' + inner + '</div></section>';
  }

  /* ============================================================
     合図シート（S-2 / S-3 / F-1 / F-2）— overlay
     ============================================================ */
  function signalSheet(uid) {
    var u = D.user(uid);
    var sess = S.get().session;
    if (!u || !sess) return '';
    var s = D.store(sess.storeId);
    var can = S.canSignal(uid);
    var spent = Third.data.RULES.SIGNALS_PER_NIGHT - S.signalsRemaining();
    var quotaDots = '';
    for (var i = 0; i < Third.data.RULES.SIGNALS_PER_NIGHT; i++) {
      quotaDots += '<span class="q' + (i < spent ? ' spent' : '') + '"></span>';
    }
    var btn;
    if (can.ok) {
      btn = '<button class="signal-btn" data-action="send-signal" data-arg="' + uid + '">' + esc(COPY.signalCta) + '</button>';
    } else {
      var msg = can.reason === 'already' ? 'もう合図を送りました'
        : can.reason === 'no-quota' ? '今夜の合図は使い切りました'
        : can.reason === 'stealth' ? 'こっそり中は送れません（表示に切替）'
        : can.reason === 'blocked' ? 'ブロック中の相手です' : '今は送れません';
      btn = '<button class="signal-btn" disabled>' + esc(msg) + '</button>';
    }

    return '<div class="sheet-backdrop" data-action="close-sheet"></div>' +
      '<div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(u.name) + 'に合図">' +
        '<button class="sheet__grip" data-action="close-sheet" aria-label="閉じる"></button>' +
        '<div class="who">' + avatar({ initial: u.initial, lg: true, glow: true }) +
          '<div class="who__nm">' + esc(u.name) + '</div>' +
          '<div class="who__tag">' + esc((u.regularAt[s.id] || 'この店の常連')) + (u.word ? ' ・ 「' + u.word + '」' : '') + '</div></div>' +
        '<div class="sl">' + COPY.signalLead + '</div>' +
        btn +
        '<div class="signal-note">' + icon('lock', { sw: 1.5 }) + esc(COPY.signalNote) + '</div>' +
        '<div class="signal-quota">' + quotaDots + '<span>今夜あと' + S.signalsRemaining() + '回</span></div>' +
        '<div class="sheet__more">' +
          '<button class="link link--mute" data-action="block-user" data-arg="' + uid + '">そっとブロック</button>' +
          '<span class="dot-sep">・</span>' +
          '<button class="link link--mute" data-action="report-user" data-arg="' + uid + '">通報する</button>' +
        '</div>' +
      '</div>';
  }

  /* ---------- 共有小物 ---------- */
  function demoBar(items, plain) {
    return '<div class="demo' + (plain ? ' demo--plain' : '') + '">' +
      (plain ? '' : '<span class="demo__l">デモ操作</span>') +
      items.map(function (it) {
        return '<button class="demo__btn" data-action="' + esc(it.action) + '"' + (it.arg ? ' data-arg="' + esc(it.arg) + '"' : '') + '>' + esc(it.label) + '</button>';
      }).join('') + '</div>';
  }

  function clock(ts) {
    var d = ts ? new Date(ts) : new Date();
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  function maskContact(c) {
    if (c.indexOf('@') !== -1) { var p = c.split('@'); return p[0].slice(0, 2) + '***@' + p[1]; }
    return c.slice(0, 3) + '****' + c.slice(-2);
  }

  Third.screens = {
    onboarding: onboarding, home: home, storePreview: storePreview,
    venue: venue, venueEmpty: venueEmpty, history: history, profile: profile,
    signalSheet: signalSheet, clock: clock
  };
})(window);
