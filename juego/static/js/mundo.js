/* =====================================================================
   mundo.js - ZONA 1: "Barrio 7 // Calle Muerta"
   Contiene los DATOS del mundo (sólidos, luces, objetos, peligros)
   y las funciones que lo DIBUJAN con rectángulos pixel art.
   Para crear otra zona en el futuro, bastará con otro objeto como este.
   ===================================================================== */
'use strict';

/* Generador pseudoaleatorio con semilla: el skyline sale igual cada vez */
function semilla(s) {
  return function () {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const Mundo = {
  nombre: 'Barrio 7 // Calle Muerta',
  ancho: 3600, alto: 270, suelo: 232,
  inicio: { x: 80, y: 190 },
  neon: ['#ff2e9a', '#21d4ff', '#7b2fff', '#ff3b4e'],
  capas: [],

  /* Todo lo que colisiona (x, y, ancho, alto, tipo) */
  solidos: [
    { x: 0, y: 232, w: 3600, h: 38, t: 'suelo' },
    { x: -20, y: 0, w: 20, h: 270, t: 'muro' }, { x: 3600, y: 0, w: 20, h: 270, t: 'muro' },
    { x: 420, y: 208, w: 64, h: 24, t: 'contenedor', c: 0 },
    { x: 440, y: 184, w: 48, h: 24, t: 'contenedor', c: 1 },
    { x: 1000, y: 216, w: 76, h: 16, t: 'coche' },
    { x: 1500, y: 186, w: 70, h: 6, t: 'andamio' },
    { x: 1640, y: 140, w: 70, h: 6, t: 'andamio' },
    { x: 1780, y: 96, w: 80, h: 6, t: 'andamio' },
    { x: 2000, y: 208, w: 64, h: 24, t: 'contenedor', c: 2 },
    { x: 2750, y: 192, w: 24, h: 40, t: 'barrera' }
  ],

  /* Luces: farolas y neones. Las usa la iluminación dinámica. */
  luces: [
    ...[160, 560, 900, 1380, 1900, 2380, 2900, 3300].map((x, i) =>
      ({ x, y: 150, r: 95, c: i % 2 ? '#21d4ff' : '#ff2e9a', farola: true, parpadeo: i === 3 || i === 6 })),
    { x: 730, y: 110, r: 80, c: '#21d4ff' }, { x: 1730, y: 110, r: 80, c: '#ff2e9a' },
    { x: 2930, y: 110, r: 80, c: '#21d4ff' },
    { x: 2585, y: 215, r: 55, c: '#ff3b4e' }, { x: 3450, y: 195, r: 80, c: '#21d4ff' }
  ],

  /* Decorado de fondo (no colisiona) */
  edificios: [
    { x: 140, w: 110, h: 150 }, { x: 560, w: 140, h: 190 }, { x: 1100, w: 120, h: 170 },
    { x: 1420, w: 160, h: 200 }, { x: 2050, w: 130, h: 160 }, { x: 2600, w: 120, h: 185 },
    { x: 3000, w: 150, h: 175 }
  ],
  carteles: [
    { x: 700, y: 70, txt: 'NEOCORP', sub: 'COMPRA TU FUTURO' },
    { x: 1700, y: 70, txt: 'SYNTH-LIFE', sub: 'SIN DOLOR' },
    { x: 2900, y: 70, txt: 'SECTOR 7', sub: 'ZONA CERRADA' }
  ],
  peligros: [{ x: 2560, y: 206, w: 50, h: 26, desfase: 0 }],

  /* Objetos interactivos */
  objetos: [
    { t: 'terminal', id: 'doc_001', x: 300, titulo: 'Terminal NEOCORP // Registro 114',
      texto: ['"Protocolo Lázaro activado en el Sector 7."', '"Evacuación denegada. Que nadie salga."'] },
    { t: 'item', id: 'racion_1', x: 660, y: 232, nombre: 'Ración sintética', c: '#ff2e9a' },
    { t: 'item', id: 'botiquin_1', x: 464, y: 184, nombre: 'Botiquín', c: '#ff3b4e' },
    { t: 'item', id: 'chatarra_1', x: 1530, y: 186, nombre: 'Chatarra electrónica', c: '#21d4ff' },
    { t: 'dummy', x: 2200, vida: 3, flash: 0, reaparece: 0 },
    { t: 'terminal', id: 'doc_002', x: 2350, titulo: 'Radio rota // Mensaje grabado',
      texto: ['"...si alguien oye esto, el refugio sigue abierto."', '"Al final de la calle. No toquen los cables."'] },
    { t: 'espejo', x: 3385 },
    { t: 'refugio', x: 3450 }
  ],

  reiniciarObjetos() {
    this.objetos.forEach(o => { if (o.t === 'dummy') { o.vida = 3; o.flash = 0; o.reaparece = 0; } });
  },
  chispasActivas(h, t) { return (t + h.desfase) % 240 < 90; },

  /* Crea las 3 capas de edificios lejanos (parallax) */
  iniciarCapas() {
    const rnd = semilla(7);
    const defs = [
      { vel: 0.1, color: '#120d22', brillo: 0.3, alt: [50, 60], ancho: [18, 22] },
      { vel: 0.25, color: '#0e0a1c', brillo: 0.55, alt: [70, 80], ancho: [24, 26] },
      { vel: 0.5, color: '#0a0714', brillo: 0.8, alt: [90, 100], ancho: [30, 30] }
    ];
    this.capas = defs.map(d => {
      const edificios = []; let x = 0;
      while (x < 800) {
        const w = d.ancho[0] + rnd() * d.ancho[1], h = d.alt[0] + rnd() * d.alt[1], v = [];
        for (let vy = 8; vy < h - 6; vy += 9) for (let vx = 4; vx < w - 5; vx += 7)
          if (rnd() < 0.15) v.push({ x: vx, y: vy, c: this.neon[(rnd() * 4) | 0], f: rnd() * 6 });
        edificios.push({ x, w, h, v, antena: rnd() < 0.3, borde: this.neon[(rnd() * 3) | 0] });
        x += w + 2 + rnd() * 8;
      }
      return { ...d, edificios, ancho: x };
    });
  },

  /* ---------- DIBUJO ---------- */
  visible(x, w, camx) { return x + w > camx - 10 && x < camx + 490; },

  dibujarFondo(ctx, camx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, 270);
    g.addColorStop(0, '#07050d'); g.addColorStop(0.65, '#1c0f33'); g.addColorStop(1, '#3a0d46');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 480, 270);
    const r = ctx.createRadialGradient(360, 70, 5, 360, 70, 130);   // resplandor contaminado
    r.addColorStop(0, 'rgba(255,46,154,.35)'); r.addColorStop(1, 'rgba(255,46,154,0)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, 480, 270);
    for (const c of this.capas) {
      const base = -((camx * c.vel) % c.ancho);        // cada capa se mueve a distinta velocidad
      for (let k = 0; k < 2; k++) for (const e of c.edificios) {
        const x = base + k * c.ancho + e.x;
        if (x > 480 || x + e.w < 0) continue;
        const y = this.suelo - e.h;
        ctx.fillStyle = c.color; ctx.fillRect(x | 0, y, e.w | 0, e.h);
        ctx.globalAlpha = c.brillo; ctx.fillStyle = e.borde; ctx.fillRect(x | 0, y, e.w | 0, 1);
        if (e.antena) { ctx.fillStyle = c.color; ctx.fillRect((x + e.w / 2) | 0, y - 10, 1, 10); }
        for (const v of e.v) {
          ctx.globalAlpha = c.brillo * (Math.sin(t * 0.03 + v.f) > -0.95 ? 1 : 0.1);
          ctx.fillStyle = v.c; ctx.fillRect((x + v.x) | 0, y + v.y, 2, 3);
        }
        ctx.globalAlpha = 1;
      }
    }
  },

  /* Todo lo que se dibuja en coordenadas del mundo (la cámara ya está aplicada) */
  dibujarMundo(ctx, camx, t, recogido) {
    const S = this.suelo;
    // Edificios abandonados cercanos
    this.edificios.forEach((e, i) => {
      if (!this.visible(e.x, e.w, camx)) return;
      ctx.fillStyle = '#0d0a18'; ctx.fillRect(e.x, S - e.h, e.w, e.h);
      ctx.fillStyle = '#2a2142'; ctx.fillRect(e.x, S - e.h, e.w, 2);
      for (let vy = 12, j = 0; vy < e.h - 10; vy += 16, j++) for (let vx = 8, k = 0; vx < e.w - 12; vx += 14, k++) {
        const h = (i * 7 + j * 13 + k * 5) % 6;
        ctx.fillStyle = h === 0 ? this.neon[(i + j) % 4] : '#17122a';
        ctx.globalAlpha = h === 0 ? (Math.sin(t * 0.05 + k + j) > -0.8 ? 0.85 : 0.2) : 1;
        ctx.fillRect(e.x + vx, S - e.h + vy, 8, 10); ctx.globalAlpha = 1;
      }
    });
    // Carteles holográficos con parpadeo
    for (const c of this.carteles) {
      if (!this.visible(c.x, 70, camx)) continue;
      const f = Math.sin(t * 0.4 + c.x) > 0.92 ? 0.25 : 1;
      ctx.fillStyle = '#2a2142'; ctx.fillRect(c.x + 8, c.y + 36, 2, S - c.y - 36);
      ctx.globalAlpha = 0.45 * f; ctx.fillStyle = '#21d4ff'; ctx.fillRect(c.x, c.y, 66, 34);
      ctx.globalAlpha = 0.9 * f; ctx.fillStyle = '#9ff0ff'; ctx.font = 'bold 9px monospace';
      ctx.fillText(c.txt, c.x + 4, c.y + 14); ctx.font = '6px monospace'; ctx.fillText(c.sub, c.x + 4, c.y + 26);
      ctx.globalAlpha = 1;
    }
    // Farolas
    for (const l of this.luces) if (l.farola && this.visible(l.x, 6, camx)) {
      ctx.fillStyle = '#2a2142'; ctx.fillRect(l.x, l.y, 2, S - l.y); ctx.fillRect(l.x - 5, l.y, 8, 2);
      ctx.fillStyle = l.c; ctx.fillRect(l.x - 5, l.y + 2, 4, 2);
    }
    this.dibujarSolidos(ctx, camx);
    this.dibujarObjetos(ctx, camx, t, recogido);
    // Cables eléctricos peligrosos
    for (const h of this.peligros) {
      ctx.fillStyle = '#2a2142'; ctx.fillRect(h.x, h.y + 6, 3, h.h - 6); ctx.fillRect(h.x + h.w - 3, h.y + 6, 3, h.h - 6);
      if (this.chispasActivas(h, t)) {
        ctx.strokeStyle = '#9ff0ff'; ctx.beginPath(); ctx.moveTo(h.x + 3, h.y + 8);
        for (let x = h.x + 8; x < h.x + h.w - 3; x += 6) ctx.lineTo(x, h.y + 4 + Math.random() * 16);
        ctx.lineTo(h.x + h.w - 3, h.y + 8); ctx.stroke();
      } else if ((t + h.desfase) % 240 > 200 && t % 8 < 4) { ctx.fillStyle = '#ff3b4e'; ctx.fillRect(h.x + 1, h.y + 4, 2, 2); }
    }
  },

  dibujarSolidos(ctx, camx) {
    const S = this.suelo;
    for (const s of this.solidos) {
      if (!this.visible(s.x, s.w, camx)) continue;
      if (s.t === 'suelo') {
        const x0 = Math.floor(camx) - 2;
        ctx.fillStyle = '#14101f'; ctx.fillRect(x0, s.y, 490, s.h);
        ctx.fillStyle = '#2a2142'; ctx.fillRect(x0, s.y, 490, 2);
        for (let x = x0 - (x0 % 16); x < x0 + 490; x += 16) {
          const h = (((x / 16) * 2654435761) >>> 0) % 11;
          if (h < 2) { ctx.fillStyle = '#1d2a4a'; ctx.fillRect(x, s.y + 1, 12, 2);        // charco
                       ctx.fillStyle = 'rgba(255,46,154,.4)'; ctx.fillRect(x + 3, s.y + 1, 5, 1); }
          else if (h < 4) { ctx.fillStyle = '#0a0714'; ctx.fillRect(x + 4, s.y + 5, 1, 7); }  // grieta
        }
      } else if (s.t === 'contenedor') {
        ctx.fillStyle = ['#7a2e2e', '#2e4f7a', '#55602e'][s.c]; ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = 'rgba(0,0,0,.3)'; for (let x = s.x + 4; x < s.x + s.w; x += 6) ctx.fillRect(x, s.y + 2, 2, s.h - 4);
        ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(s.x, s.y, s.w, 1);
        ctx.fillStyle = '#7a4a2a'; ctx.fillRect(s.x + 5, s.y + s.h - 6, 8, 3);       // óxido
      } else if (s.t === 'coche') {
        ctx.fillStyle = '#4a2e26'; ctx.fillRect(s.x, s.y + 6, s.w, 7);
        ctx.fillStyle = '#3a2420'; ctx.fillRect(s.x + 18, s.y, 38, 7);
        ctx.fillStyle = '#1d2a4a'; ctx.fillRect(s.x + 21, s.y + 1, 14, 5); ctx.fillRect(s.x + 38, s.y + 1, 15, 5);
        ctx.fillStyle = '#7a4a2a'; ctx.fillRect(s.x + 4, s.y + 8, 12, 2); ctx.fillRect(s.x + 50, s.y + 9, 14, 2);
        ctx.fillStyle = '#050308'; ctx.fillRect(s.x + 8, s.y + 11, 10, 5); ctx.fillRect(s.x + s.w - 18, s.y + 11, 10, 5);
      } else if (s.t === 'andamio') {
        ctx.fillStyle = '#2a2142'; ctx.fillRect(s.x + 4, s.y + 6, 2, S - s.y - 6); ctx.fillRect(s.x + s.w - 6, s.y + 6, 2, S - s.y - 6);
        ctx.fillStyle = '#3a3350'; ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = '#6a5fa0'; ctx.fillRect(s.x, s.y, s.w, 1);
      } else if (s.t === 'barrera') {
        ctx.fillStyle = '#2a1f3a'; ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = '#ff3b4e'; for (let y = s.y + 4; y < s.y + s.h - 4; y += 10) ctx.fillRect(s.x, y, s.w, 3);
      }
    }
  },

  dibujarObjetos(ctx, camx, t, recogido) {
    const S = this.suelo;
    for (const o of this.objetos) {
      if (!this.visible(o.x - 20, 40, camx)) continue;
      if (o.t === 'terminal') {
        ctx.fillStyle = '#1a1626'; ctx.fillRect(o.x - 6, S - 22, 12, 22);
        ctx.fillStyle = Math.sin(t * 0.2 + o.x) > -0.6 ? '#21d4ff' : '#0e5a6e'; ctx.fillRect(o.x - 4, S - 19, 8, 7);
      } else if (o.t === 'item' && !recogido(o.id)) {
        const y = o.y - 8 + Math.sin(t * 0.08 + o.x) * 1.5;
        ctx.fillStyle = o.c; ctx.fillRect(o.x - 3, y, 6, 6);
        ctx.fillStyle = '#fff'; ctx.fillRect(o.x - 3, y, 6, 1);
      } else if (o.t === 'refugio') {
        ctx.fillStyle = '#0d0a18'; ctx.fillRect(o.x - 20, S - 50, 40, 50);
        ctx.fillStyle = '#21d4ff'; ctx.fillRect(o.x - 20, S - 50, 40, 2); ctx.fillRect(o.x - 12, S - 40, 24, 1);
        ctx.fillStyle = '#17122a'; ctx.fillRect(o.x - 9, S - 38, 18, 38);
        ctx.fillStyle = '#21d4ff'; ctx.fillRect(o.x - 9, S - 38, 1, 38); ctx.fillRect(o.x + 8, S - 38, 1, 38);
      } else if (o.t === 'espejo') {                   // espejo: abre la personalización
        ctx.fillStyle = '#2a2142'; ctx.fillRect(o.x - 8, S - 36, 16, 30); ctx.fillRect(o.x - 1, S - 6, 2, 6);
        ctx.fillStyle = '#1d2a4a'; ctx.fillRect(o.x - 6, S - 34, 12, 26);
        ctx.fillStyle = 'rgba(159,240,255,.5)'; ctx.fillRect(o.x - 4, S - 32, 2, 10);
      } else if (o.t === 'dummy') {                    // dron de práctica
        if (o.vida <= 0) { ctx.fillStyle = '#3a3350'; ctx.fillRect(o.x - 8, S - 5, 16, 5); continue; }
        ctx.fillStyle = '#2a2142'; ctx.fillRect(o.x - 5, S - 10, 3, 10); ctx.fillRect(o.x + 2, S - 10, 3, 10);
        ctx.fillStyle = o.flash > 0 ? '#ffffff' : '#4a4a66'; ctx.fillRect(o.x - 7, S - 24, 14, 14);
        ctx.fillStyle = '#ff3b4e'; ctx.fillRect(o.x - 3, S - 20, 6, 2);
      }
    }
  }
};