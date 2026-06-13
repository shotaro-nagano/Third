/* ============================================================
   Third — Seed data（部屋／常連／コピー）
   MVP プロトタイプ用の初期データ。実運用では運営の手動登録＋
   リアルタイム購読に置き換わる（要件 §11）。
   ============================================================ */
(function (global) {
  'use strict';

  var Third = global.Third || (global.Third = {});

  /* 常連認定のしきい値（要件 §2 / §5.3）。
     L-3「一定時間以上の滞在」の分数は未確定のため、プロトタイプでは 30 分とする。 */
  var RULES = {
    REGULAR_DAYS: 5,        // 別々の日に5回で「常連」
    STAY_MINUTES: 30,       // 各回これ以上の滞在を「有効な来店」とする
    SIGNALS_PER_NIGHT: 2     // 一晩に送れる合図の上限（S-3：1〜2回）
  };

  /* バー＝「部屋」。presentNow は「今その店にいる常連」（シード） */
  var STORES = [
    {
      id: 'tomoshibi', name: 'Bar 燈', kana: 'ばー ともしび',
      area: '神楽坂', walkMin: 4, hours: '18:00–26:00', open: true,
      presentNow: ['kenji', 'midori', 'take', 'nobu', 'sachi'],
      blurb: '重い扉の向こう、琥珀色のボトルが並ぶ一軒。常連の出入りが絶えない。'
    },
    {
      id: 'nigohan', name: 'Whisky Bar 月光', kana: 'うぃすきーばー げっこう',
      area: '神楽坂', walkMin: 9, hours: '19:00–27:00', open: true,
      presentNow: ['ryo', 'aoi'],
      blurb: 'モルトを静かに傾ける夜に。会話は控えめ、グラスは深め。'
    },
    {
      id: 'yoake', name: 'Bar よあけ', kana: 'ばー よあけ',
      area: '飯田橋', walkMin: 12, hours: '20:00–28:00', open: true,
      presentNow: [],
      blurb: '明け方まで灯るオーセンティックバー。あなたはあと少しで常連。'
    },
    {
      id: 'haze', name: 'Cocktail Bar はぜ', kana: 'かくてるばー はぜ',
      area: '四谷', walkMin: 16, hours: '18:00–25:00', open: true,
      presentNow: ['yuki'],
      blurb: 'カクテルが評判の、カウンター七席の小箱。'
    },
    {
      id: 'chidori', name: 'Bar ちどり', kana: 'ばー ちどり',
      area: '神楽坂', walkMin: 7, hours: '18:00–24:00', open: false,
      presentNow: [],
      blurb: '磨かれたカウンターの老舗バー。本日は休み。'
    }
  ];

  /* 常連たち。gender は性別比モニタリング（F-4）のためのみ保持し、UIには出さない。
     regularAt: その人が常連である店ごとの在籍ラベル。 */
  var USERS = {
    kenji:  { id: 'kenji',  name: 'ケンジ',  initial: 'ケ', gender: 'm', regularAt: { tomoshibi: '常連2年' },  word: '今夜はハイボールから。' },
    midori: { id: 'midori', name: 'ミドリ',  initial: 'ミ', gender: 'f', regularAt: { tomoshibi: '常連8ヶ月' }, word: 'ジントニックが定位置。' },
    take:   { id: 'take',   name: 'タケ',    initial: 'タ', gender: 'm', regularAt: { tomoshibi: '常連1年' },  word: 'カウンターの端で、モルトを一杯。' },
    nobu:   { id: 'nobu',   name: 'ノブ',    initial: 'ノ', gender: 'm', regularAt: { tomoshibi: '常連3年' },  word: 'マティーニを、ステアで。' },
    sachi:  { id: 'sachi',  name: 'サチ',    initial: 'サ', gender: 'f', regularAt: { tomoshibi: '常連半年' }, word: '初めましての人にも会釈はします。' },
    ryo:    { id: 'ryo',    name: 'リョウ',  initial: 'リ', gender: 'm', regularAt: { nigohan: '常連1年半' },  word: 'ウイスキーの品書きを端から。' },
    aoi:    { id: 'aoi',    name: 'アオイ',  initial: 'ア', gender: 'f', regularAt: { nigohan: '常連10ヶ月' }, word: '静かに飲みたい派。' },
    yuki:   { id: 'yuki',   name: 'ユキ',    initial: 'ユ', gender: 'f', regularAt: { haze: '常連4ヶ月' },    word: '新作カクテル、できたら声かけて。' }
  };

  /* 「あなた」の初期来店履歴（別々の日のシード）。
     これにより 燈=常連 / 二合半=常連 / よあけ=3/5（あと2回）になる。
     日付は「state.js」が今日からの相対日で生成する。 */
  var ME_SEED_VISITS = {
    tomoshibi: 6,   // 既に常連（>5）
    nigohan: 5,     // ちょうど常連
    yoake: 3,       // あと2回で常連（ホームの「あと2回通えば常連」に一致）
    haze: 1
  };

  /* 画面コピー（デザインの文言を正とする） */
  var COPY = {
    brand: 'THIRD',
    introLead: '行きつけにいる間だけ、<em>常連</em>と知り合える。',
    introSub: '盛らない。追ってこない。店を出れば、関係はそっと消える。',
    introNote: 'サードプレイスの常連関係を、そのままデジタルに。',

    homeTitle: 'あなたの止まり木',
    homeLead: '今夜、<em>灯っている</em>店。',
    homeSub: '常連がいる店ほど、明るく見える',

    venueHint: '気になる人をそっと選んで、合図を',
    venueHere: '今、この店にいる常連',

    signalLead: '声をかける代わりに、<br>小さな合図をひとつ送れます。',
    signalCta: '乾杯しませんか',
    signalNote: '片方向です。返事がなくても、誰にも分かりません',

    creedTitle: '通った時間が、信頼になる',
    creedFoot: 'つながるのは、店にいる間だけ。<br><em>店を出れば、また今度ね。</em>',

    leaveLine: 'また今度ね。',
    leaveSub: 'やりとりは残りません。同じ店で会えば、また。'
  };

  Third.data = {
    RULES: RULES,
    STORES: STORES,
    USERS: USERS,
    ME_SEED_VISITS: ME_SEED_VISITS,
    COPY: COPY,
    store: function (id) { return STORES.filter(function (s) { return s.id === id; })[0] || null; },
    user: function (id) { return USERS[id] || null; }
  };
})(window);
