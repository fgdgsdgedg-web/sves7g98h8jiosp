const SESSION_KEY = 'vanish_session';
const COOKIE_NAME = 'vr_sid';

function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + days * 86400000);
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Strict`;
}

function getCookie(name) {
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return m ? m[2] : null;
}

function clearCookie(name) {
  document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
}

function createSession(user, token) {
  const session = {
    token,
    userId: user.id,
    login: user.login,
    roleId: user.roleId,
    created: Date.now(),
    expires: Date.now() + 7 * 86400000
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  setCookie(COOKIE_NAME, token, 7);
  return session;
}

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s.expires < Date.now()) {
      destroySession();
      return null;
    }
    const cookieTok = getCookie(COOKIE_NAME);
    if (!cookieTok || cookieTok !== s.token) {
      destroySession();
      return null;
    }
    return s;
  } catch (e) {
    return null;
  }
}

function destroySession() {
  localStorage.removeItem(SESSION_KEY);
  clearCookie(COOKIE_NAME);
}

function hasPerm(session, perm) {
  if (!session) return false;
  const db = VanishDB.loadDB();
  const role = db.roles.find(r => r.id === session.roleId);
  if (!role) return false;
  if (role.perms.includes('*')) return true;
  return role.perms.includes(perm);
}

function isOperator(session) {
  return hasPerm(session, '*');
}

async function login(login, key, fpHash) {
  const db = VanishDB.loadDB();
  const ban = db.bans.find(b => b.fp === fpHash && b.active);
  if (ban) {
    return { ok: false, error: 'access_denied' };
  }

  const keyObj = db.keys.find(k => k.key === key.toUpperCase() && k.login.toLowerCase() === login.toLowerCase());
  if (!keyObj) {
    return { ok: false, error: 'invalid_credentials' };
  }

  if (keyObj.expires && keyObj.expires < Date.now()) {
    return { ok: false, error: 'key_expired' };
  }

  let user = db.users.find(u => u.login.toLowerCase() === login.toLowerCase());
  if (!user) {
    user = {
      id: VanishDB.generateId('u'),
      login: login,
      keyId: keyObj.id,
      roleId: keyObj.roleId,
      created: Date.now(),
      lastLogin: Date.now(),
      ip: '',
      ua: navigator.userAgent,
      fp: fpHash,
      status: 'active',
      sub: keyObj.expires ? { type: 'timed', until: keyObj.expires } : { type: 'lifetime', until: null }
    };
    db.users.push(user);
  } else {
    if (user.status === 'banned') {
      return { ok: false, error: 'banned' };
    }
    user.lastLogin = Date.now();
    user.fp = fpHash;
    user.ua = navigator.userAgent;
    user.keyId = keyObj.id;
    user.roleId = keyObj.roleId;
  }

  const token = VanishDB.generateToken();
  db.users = db.users.map(u => u.id === user.id ? user : u);
  VanishDB.saveDB(db);

  const session = createSession(user, token);
  return { ok: true, session, user };
}

function register(login, key, fpHash) {
  const db = VanishDB.loadDB();
  if (db.users.some(u => u.login.toLowerCase() === login.toLowerCase()) ||
      db.keys.some(k => k.login.toLowerCase() === login.toLowerCase())) {
    return { ok: false, error: 'login_taken' };
  }

  const keyObj = db.keys.find(k => k.key === key.toUpperCase() && !k.used);
  if (!keyObj) {
    return { ok: false, error: 'invalid_key' };
  }

  if (keyObj.expires && keyObj.expires < Date.now()) {
    return { ok: false, error: 'key_expired' };
  }

  keyObj.used = true;
  keyObj.login = login;

  const user = {
    id: VanishDB.generateId('u'),
    login,
    keyId: keyObj.id,
    roleId: keyObj.roleId || 'r_user',
    created: Date.now(),
    lastLogin: Date.now(),
    ip: '',
    ua: navigator.userAgent,
    fp: fpHash,
    status: 'active',
    sub: keyObj.expires ? { type: 'timed', until: keyObj.expires } : { type: 'lifetime', until: null }
  };

  db.users.push(user);
  VanishDB.saveDB(db);

  const token = VanishDB.generateToken();
  const session = createSession(user, token);
  return { ok: true, session, user };
}

window.Auth = {
  login, register, getSession, destroySession, hasPerm, isOperator, createSession
};
