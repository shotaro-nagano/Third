/* ============================================================
   Third — Icon set（デザインのSVGを踏襲した線画アイコン）
   ============================================================ */
(function (global) {
  'use strict';
  var Third = global.Third || (global.Third = {});

  var P = {
    home:    '<path d="M4 21V9l8-6 8 6v12"/><path d="M9 21v-7h6v7"/>',
    search:  '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    clock:   '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    inn:     '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>',
    person:  '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    sun:     '<circle cx="12" cy="12" r="5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
    bell:    '<path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    lock:    '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    close:   '<path d="M18 6 6 18M6 6l12 12"/>',
    check:   '<path d="M20 6 9 17l-5-5"/>',
    pin:     '<path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
    cheers:  '<path d="M7 3h6l-1 8a2 2 0 0 1-4 0z"/><path d="M10 13v6M7 21h6"/><path d="m15 4 3 1-1 5"/>',
    shield:  '<path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z"/>',
    back:    '<path d="m15 18-6-6 6-6"/>',
    eye:     '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff:  '<path d="M2 12s3.5-7 10-7c2.2 0 4.1.7 5.7 1.6M22 12s-3.5 7-10 7c-2.2 0-4.1-.7-5.7-1.6"/><path d="M9.5 9.5a3 3 0 0 0 4.2 4.2"/><path d="m4 4 16 16"/>',
    flag:    '<path d="M5 22V4M5 4h12l-2 4 2 4H5"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/><circle cx="12" cy="12" r="2.5"/>',
    gear:    '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    info:    '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    door:    '<path d="M14 3v18M14 3 5 5v15l9 1M9 12h.01"/><path d="M14 3h5v18h-5"/>'
  };

  function icon(name, opts) {
    opts = opts || {};
    var d = P[name] || '';
    var sw = opts.sw || 1.5;
    var cls = 'ic' + (opts.cls ? ' ' + opts.cls : '');
    return '<svg class="' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      d + '</svg>';
  }

  Third.icons = { paths: P, icon: icon };
})(window);
