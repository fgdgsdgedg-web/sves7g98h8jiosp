class Captcha {
  constructor(canvasId, inputId) {
    this.canvas = document.getElementById(canvasId);
    this.input = document.getElementById(inputId);
    this.code = '';
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
  }

  generate() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    this.code = '';
    for (let i = 0; i < 6; i++) {
      this.code += chars[Math.floor(Math.random() * chars.length)];
    }
    this.draw();
    if (this.input) this.input.value = '';
    return this.code;
  }

  draw() {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    const grad = this.ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#0c0c14');
    grad.addColorStop(1, '#1a0a2e');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 40; i++) {
      this.ctx.fillStyle = `rgba(168, 85, 247, ${Math.random() * 0.15})`;
      this.ctx.beginPath();
      this.ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 2 + 0.5, 0, Math.PI * 2);
      this.ctx.fill();
    }

    for (let i = 0; i < 5; i++) {
      this.ctx.strokeStyle = `rgba(168, 85, 247, ${0.15 + Math.random() * 0.25})`;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(Math.random() * w, Math.random() * h);
      this.ctx.bezierCurveTo(
        Math.random() * w, Math.random() * h,
        Math.random() * w, Math.random() * h,
        Math.random() * w, Math.random() * h
      );
      this.ctx.stroke();
    }

    const spacing = w / 7;
    for (let i = 0; i < 6; i++) {
      const x = spacing * (i + 0.7);
      const y = h / 2 + (Math.random() * 12 - 6);
      const angle = (Math.random() - 0.5) * 0.4;
      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.rotate(angle);
      this.ctx.font = `bold ${22 + Math.random() * 6}px JetBrains Mono, monospace`;
      this.ctx.fillStyle = `hsl(${270 + Math.random() * 40}, 80%, ${65 + Math.random() * 15}%)`;
      this.ctx.shadowColor = 'rgba(168, 85, 247, 0.8)';
      this.ctx.shadowBlur = 8;
      this.ctx.fillText(this.code[i], 0, 0);
      this.ctx.restore();
    }
  }

  validate(val) {
    return val && val.toUpperCase().replace(/\s/g, '') === this.code;
  }

  refresh() {
    this.generate();
  }
}

window.Captcha = Captcha;
