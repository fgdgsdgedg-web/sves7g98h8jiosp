function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

function icon(name, size = 18, cls = '') {
  const span = el('span', { className: 'inline-flex ' + cls });
  span.innerHTML = `<i data-lucide="${name}" width="${size}" height="${size}"></i>`;
  return span;
}

function toast(msg, type = 'info') {
  const colors = {
    info: 'border-accent/40 text-glow',
    success: 'border-success/40 text-success',
    error: 'border-danger/40 text-danger',
    warn: 'border-warn/40 text-warn'
  };
  const t = el('div', {
    className: `fixed bottom-6 right-6 z-[100] glass-strong px-4 py-3 rounded-xl text-sm font-medium border ${colors[type] || colors.info} fade-in shadow-glow-sm`
  }, [msg]);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function protectDevtools() {
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) || (e.ctrlKey && e.key.toUpperCase() === 'U')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  });
  setInterval(() => {
    const start = performance.now();
    debugger;
    if (performance.now() - start > 100) {
      document.body.innerHTML = '<div class="min-h-screen flex items-center justify-center bg-void text-danger font-display text-xl">ACCESS RESTRICTED</div>';
    }
  }, 1500);
}

window.UI = { $, $$, el, icon, toast, formatDate, protectDevtools };
