/* ============================================================
   Third — UI helpers（エスケープ / トースト / 小物）
   ============================================================ */
(function (global) {
  'use strict';
  var Third = global.Third || (global.Third = {});
  var icon = Third.icons.icon;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function host() { return document.querySelector('.toast-host'); }

  var seq = 0;
  /* toast({ title, body, icon, tone, duration, sticky, actions:[{label,action,data,kind}] }) */
  function toast(o) {
    o = o || {};
    var h = host();
    if (!h) return null;
    var id = 't' + (++seq);
    var el = document.createElement('div');
    el.className = 'toast' + (o.tone ? ' toast--' + o.tone : '');
    el.setAttribute('role', 'status');
    el.dataset.toast = id;

    var ic = o.icon ? '<div class="toast__ic">' + icon(o.icon) + '</div>' : '';
    var actions = '';
    if (o.actions && o.actions.length) {
      actions = '<div class="toast__actions">' + o.actions.map(function (a) {
        return '<button class="toast__btn' + (a.kind ? ' toast__btn--' + a.kind : '') +
          '" data-action="' + esc(a.action) + '"' +
          (a.data ? ' data-arg="' + esc(a.data) + '"' : '') +
          ' data-toast="' + id + '">' + esc(a.label) + '</button>';
      }).join('') + '</div>';
    }
    el.innerHTML =
      ic +
      '<div class="toast__main">' +
        (o.title ? '<div class="toast__title">' + esc(o.title) + '</div>' : '') +
        (o.body ? '<div class="toast__body">' + (o.html ? o.body : esc(o.body)) + '</div>' : '') +
        actions +
      '</div>' +
      '<button class="toast__close" data-action="dismiss-toast" data-toast="' + id +
        '" aria-label="閉じる">' + icon('close', { sw: 1.6 }) + '</button>';

    h.appendChild(el);

    var dur = o.sticky ? 0 : (o.duration != null ? o.duration : 4200);
    if (dur > 0) {
      setTimeout(function () { dismissToast(id); }, dur);
    }
    return id;
  }

  function dismissToast(id) {
    var el = document.querySelector('.toast[data-toast="' + id + '"]');
    if (!el) return;
    el.classList.add('toast--out');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 240);
  }

  function clearToasts() {
    var h = host(); if (!h) return;
    Array.prototype.forEach.call(h.children, function (c) {
      dismissToast(c.dataset.toast);
    });
  }

  function haptic(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) {}
  }

  Third.ui = { esc: esc, toast: toast, dismissToast: dismissToast, clearToasts: clearToasts, haptic: haptic, icon: icon };
})(window);
