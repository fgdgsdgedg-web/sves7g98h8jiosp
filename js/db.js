const DB_KEY = 'vanish_rat_v2';

const defaultDB = {
  users: [],
  keys: [],
  clients: [],
  bans: [],
  logs: [],
  audit: [],
  banner: {
    enabled: false,
    text: '',
    media: '',
    mediaType: 'image',
    dismissAfter: 5
  },
  settings: {
    domain: 'vanish.new.tg',
    siteName: 'Vanish Rat',
    title: 'Vanish Rat',
    version: '1.1.0',
    adminGate: 'vanish_op_7x9k',
    opPassHash: ''
  },
  roles: [
    { id: 'r_operator', name: 'operator', perms: ['*'] },
    { id: 'r_user', name: 'user', perms: ['panel', 'builder_view', 'logs', 'stealer', 'loader', 'tools'] },
    { id: 'r_trial', name: 'trial', perms: ['panel'] }
  ]
};

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) {
      const seed = structuredClone(defaultDB);
      const adminKey = generateKey();
      seed.keys.push({
        id: 'k_admin',
        key: adminKey,
        login: 'vanish',
        roleId: 'r_operator',
        expires: null,
        created: Date.now(),
        note: 'master',
        used: true
      });
      seed.users.push({
        id: 'u_admin',
        login: 'vanish',
        keyId: 'k_admin',
        roleId: 'r_operator',
        created: Date.now(),
        lastLogin: null,
        ip: '',
        ua: '',
        fp: '',
        status: 'active',
        sub: { type: 'lifetime', until: null }
      });
      auditPush(seed, 'system', 'first_run', { keyHint: adminKey.slice(0, 4) + '****' });
      saveDB(seed);
      console.info('%c[Vanish] first run — login: vanish | key: ' + adminKey, 'color:#a855f7;font-weight:bold');
      console.info('%c[Vanish] admin gate hash: #' + seed.settings.adminGate, 'color:#c084fc');
      return seed;
    }
    const db = JSON.parse(raw);
    if (!db.audit) db.audit = [];
    if (!db.banner) db.banner = structuredClone(defaultDB.banner);
    if (!db.settings) db.settings = structuredClone(defaultDB.settings);
    return db;
  } catch (e) {
    return structuredClone(defaultDB);
  }
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function generateId(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function generateKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 4; i++) {
    if (i) out += '-';
    for (let j = 0; j < 4; j++) out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

function auditPush(db, actor, action, meta) {
  if (!db.audit) db.audit = [];
  db.audit.push({
    id: generateId('a'),
    ts: Date.now(),
    actor: actor || 'system',
    action,
    meta: meta || {},
    ua: typeof navigator !== 'undefined' ? (navigator.userAgent || '').slice(0, 120) : ''
  });
  if (db.audit.length > 5000) db.audit = db.audit.slice(-5000);
}

window.VanishDB = { loadDB, saveDB, generateId, generateKey, generateToken, auditPush, defaultDB };
