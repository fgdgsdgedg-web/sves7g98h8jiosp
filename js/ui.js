function $(sel, root) { return (root || document).querySelector(sel); }
function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

function el(tag, attrs, children) {
  attrs = attrs || {};
  children = children || [];
  var node = document.createElement(tag);
  Object.keys(attrs).forEach(function (k) {
    var v = attrs[k];
    if (k === 'className') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.indexOf('on') === 0 && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== false && v != null) node.setAttribute(k, v);
  });
  [].concat(children).forEach(function (c) {
    if (c == null) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

function icon(name, size, cls) {
  size = size || 18;
  cls = cls || '';
  var span = el('span', { className: 'inline-flex ' + cls });
  span.innerHTML = '<i data-lucide="' + name + '" width="' + size + '" height="' + size + '"></i>';
  return span;
}

function toast(msg, type) {
  type = type || 'info';
  var colors = {
    info: 'border-accent/40 text-glow',
    success: 'border-success/40 text-success',
    error: 'border-danger/40 text-danger',
    warn: 'border-warn/40 text-warn'
  };
  var t = el('div', {
    className: 'fixed bottom-6 right-6 z-[100] glass-strong px-4 py-3 rounded-xl text-sm font-medium border ' + (colors[type] || colors.info) + ' fade-in shadow-glow-sm'
  }, [msg]);
  document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, 3200);
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function protectDevtools() {
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('keydown', function (e) {
    var k = (e.key || '').toUpperCase();
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].indexOf(k) >= 0) || (e.ctrlKey && k === 'U')) {
      e.preventDefault();
      e.stopPropagation();
      if (window._vanishAudit) window._vanishAudit('devtools_key', { key: e.key });
      return false;
    }
  });
}

window.UI = { $, $$, el, icon, toast, formatDate, protectDevtools };
