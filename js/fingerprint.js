async function collectFingerprint() {
  const components = {};

  components.ua = navigator.userAgent || '';
  components.lang = navigator.language || '';
  components.langs = (navigator.languages || []).join(',');
  components.platform = navigator.platform || '';
  components.hw = navigator.hardwareConcurrency || 0;
  components.mem = navigator.deviceMemory || 0;
  components.touch = navigator.maxTouchPoints || 0;
  components.screen = `${screen.width}x${screen.height}x${screen.colorDepth}`;
  components.avail = `${screen.availWidth}x${screen.availHeight}`;
  components.tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  components.tzOffset = new Date().getTimezoneOffset();

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(10, 10, 100, 30);
    ctx.fillStyle = '#fff';
    ctx.fillText('VanishFP:' + navigator.userAgent.slice(0, 20), 15, 18);
    ctx.strokeStyle = '#7c3aed';
    ctx.strokeRect(5, 5, 200, 40);
    components.canvas = canvas.toDataURL().slice(-64);
  } catch (e) {
    components.canvas = 'err';
  }

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      components.webgl = debug
        ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) + '|' + gl.getParameter(debug.UNMASKED_VENDOR_WEBGL)
        : gl.getParameter(gl.RENDERER);
    } else {
      components.webgl = 'none';
    }
  } catch (e) {
    components.webgl = 'err';
  }

  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const analyser = audioCtx.createAnalyser();
    const gain = audioCtx.createGain();
    gain.gain.value = 0;
    oscillator.connect(analyser);
    analyser.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start(0);
    const data = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(data);
    components.audio = data.slice(0, 8).map(v => v.toFixed(2)).join(',');
    oscillator.stop();
    audioCtx.close();
  } catch (e) {
    components.audio = 'err';
  }

  components.plugins = Array.from(navigator.plugins || []).map(p => p.name).join(',').slice(0, 120);
  components.cookie = navigator.cookieEnabled ? '1' : '0';
  components.dnt = navigator.doNotTrack || '0';

  let fpLib = '';
  try {
    if (window.FingerprintJS) {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      fpLib = result.visitorId;
    }
  } catch (e) {}

  const raw = JSON.stringify(components) + '|' + fpLib;
  const hash = await sha256(raw);
  return { hash, components, visitorId: fpLib };
}

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

window.collectFingerprint = collectFingerprint;
