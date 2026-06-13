/* Third — service worker（PWA: オフライン起動 / Windowsインストール対応） */
var CACHE = 'third-v1';
var ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/tokens.css',
  'css/app.css',
  'css/screens.css',
  'js/data.js',
  'js/state.js',
  'js/icons.js',
  'js/ui.js',
  'js/screens.js',
  'js/app.js',
  'assets/icon.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  // ナビゲーションは network-first（更新を取りつつオフラインでも起動）
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(function () { return caches.match('index.html'); })
    );
    return;
  }
  // それ以外は cache-first
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res && res.status === 200 && req.url.indexOf('http') === 0) {
          var clone = res.clone();
          caches.open(CACHE).then(function (c) { try { c.put(req, clone); } catch (e2) {} });
        }
        return res;
      }).catch(function () { return hit; });
    })
  );
});
