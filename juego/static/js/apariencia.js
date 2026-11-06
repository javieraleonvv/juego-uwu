/* =====================================================================
   apariencia.js - Sistema MODULAR de apariencia (piezas combinables)
   - PAL: paletas de colores
   - Catalogo: categorías > subcategorías (slots) > opciones
   - Apariencia: guardar/validar/aleatorio + dibujo del personaje por capas
   Cada pieza se dibuja por código (sprite provisional). Para usar sprites
   reales, sustituye el bloque de la pieza correspondiente en dibujarPersonaje().
   El mismo dibujo se usa en el mundo y en la vista previa.
   ===================================================================== */
'use strict';

const PAL = {
  PIEL: ['#f1c8a5', '#d9a88a', '#b5835e', '#8d5a3c', '#5c3a28', '#c9d3ee'],
  CABELLO: ['#120d22', '#4a2e1a', '#d9b36a', '#c9c9d9', '#ff2e9a', '#21d4ff', '#7b2fff', '#ff3b4e'],
  ROPA: ['#3b1d6e', '#1b1630', '#6e2a2a', '#2e4f7a', '#55602e', '#d9d2ee', '#ff2e9a', '#21d4ff'],
  NEON: ['#ff2e9a', '#21d4ff', '#7b2fff', '#ff3b4e', '#9aff3b', '#ffd23b'],
  OJOS: ['#21d4ff', '#ff2e9a', '#9aff3b', '#b5835e', '#d9d2ee'],
  METAL: ['#9a9ab0', '#c9a14a', '#ff3b4e', '#21d4ff']
};
const NINGUNO = 'Ninguno';

/* s = clave interna, n = nombre visible, op = opciones (índice 0 = primera), pal = paleta de color */
const Catalogo = {
  'Apariencia': [
    { s: 'rostro', n: 'Rostro', op: ['Angular', 'Redondo', 'Afilado', 'Robusto'] },
    { s: 'piel', n: 'Tono de piel', pal: 'PIEL' },
    { s: 'ojos', n: 'Ojos', op: ['Normales', 'Rasgados', 'Grandes', 'Cansados'], pal: 'OJOS' },
    { s: 'cabello', n: 'Peinado y color', op: ['Calvo', 'Rapado', 'Corto', 'Largo', 'Mohicano', 'Coleta', 'Rizado', 'Afro'], pal: 'CABELLO' },
    { s: 'cicatriz', n: 'Cicatrices', op: [NINGUNO, 'Mejilla', 'Ceja', 'Cruz'] },
    { s: 'marca', n: 'Marcas faciales', op: [NINGUNO, 'Lunares', 'Línea neón', 'Ojeras', 'Código'], pal: 'NEON' },
    { s: 'maquillaje', n: 'Maquillaje', op: [NINGUNO, 'Sombra', 'Labial', 'Delineado neón'], pal: 'NEON' },
    { s: 'tatuaje', n: 'Tatuajes', op: [NINGUNO, 'Circuito en el brazo', 'Tribal en la mejilla', 'Tribal en el brazo'], pal: 'NEON' }
  ],
  'Ropa': [
    { s: 'polera', n: 'Poleras', op: [NINGUNO, 'Lisa', 'Rayas', 'Logo NEOCORP', 'Tirantes'], pal: 'ROPA' },
    { s: 'chaqueta', n: 'Chaquetas', op: [NINGUNO, 'Cuero', 'Bomber', 'Táctica', 'Neón'], pal: 'ROPA' },
    { s: 'pantalon', n: 'Pantalones', op: [NINGUNO, 'Largos', 'Cortos', 'Rotos', 'Cargo'], pal: 'ROPA' },
    { s: 'falda', n: 'Faldas', op: [NINGUNO, 'Corta', 'Larga', 'Plisada'], pal: 'ROPA' },
    { s: 'vestido', n: 'Vestidos', op: [NINGUNO, 'Corto', 'Largo', 'Neón'], pal: 'ROPA' },
    { s: 'botas', n: 'Botas', op: [NINGUNO, 'Combate', 'Altas', 'Metálicas'], pal: 'ROPA' },
    { s: 'zapatillas', n: 'Zapatillas', op: [NINGUNO, 'Urbanas', 'Neón'], pal: 'ROPA' },
    { s: 'guantes', n: 'Guantes', op: [NINGUNO, 'Sin dedos', 'Cuero', 'Tácticos'], pal: 'ROPA' },
    { s: 'abrigo', n: 'Abrigos', op: [NINGUNO, 'Impermeable', 'Largo', 'Poncho'], pal: 'ROPA' }
  ],
  'Accesorios': [
    { s: 'gafas', n: 'Gafas', op: [NINGUNO, 'Redondas', 'Visor', 'Aviador'], pal: 'NEON' },
    { s: 'mascara', n: 'Máscaras', op: [NINGUNO, 'Gas', 'Tela', 'Neón'], pal: 'ROPA' },
    { s: 'auriculares', n: 'Auriculares', op: [NINGUNO, 'Clásicos', 'Cyber'], pal: 'ROPA' },
    { s: 'collar', n: 'Collares', op: [NINGUNO, 'Cadena', 'Gargantilla neón'], pal: 'NEON' },
    { s: 'piercing', n: 'Piercings', op: [NINGUNO, 'Ceja', 'Nariz', 'Oreja'], pal: 'NEON' },
    { s: 'casco', n: 'Cascos', op: [NINGUNO, 'Moto', 'Táctico', 'Capucha'], pal: 'ROPA' },
    { s: 'mochila', n: 'Mochilas', op: [NINGUNO, 'Pequeña', 'Militar', 'Tecnológica'], pal: 'ROPA' }
  ],
  'Cyberpunk': [
    { s: 'protesis', n: 'Piernas mecánicas', op: [NINGUNO, 'Parcial', 'Total'], pal: 'METAL' },
    { s: 'brazo', n: 'Brazo robótico', op: [NINGUNO, 'Básico', 'Neón', 'Pesado'], pal: 'METAL' },
    { s: 'ojoCib', n: 'Ojo cibernético', op: [NINGUNO, 'Rojo', 'Azul', 'Escáner'] },
    { s: 'implantes', n: 'Implantes visibles', op: [NINGUNO, 'Sien', 'Nuca', 'Núcleo en el pecho'] },
    { s: 'circuitos', n: 'Circuitos luminosos', op: [NINGUNO, 'Brazo', 'Torso', 'Rostro'], pal: 'NEON' },
    { s: 'modificacion', n: 'Modificaciones corporales', op: [NINGUNO, 'Placas craneales', 'Hombros metálicos', 'Columna expuesta'], pal: 'METAL' }
  ]
};
const PALDE = {};    // slot -> nombre de paleta
Object.values(Catalogo).flat().forEach(d => { if (d.pal) PALDE[d.s] = d.pal; });

const Apariencia = {
  clavePlantilla: 'cyberwasteland_plantilla_v1',
  pronombres: ['él', 'ella', 'elle', 'ninguno'],
  animaciones: ['respirar', 'mirar', 'saludar'],
  posturas: ['recta', 'relajada', 'alerta'],

  defecto() {
    return this.validar({ nombre: 'Nómada', pronombres: 'elle', animEspera: 'respirar', postura: 'recta',
      pielC: 1, cabello: 2, polera: 1, poleraC: 1, chaqueta: 1, pantalon: 1, pantalonC: 1, botas: 1, botasC: 1, gafas: 2, gafasC: 1 });
  },
  copiar(a) { return JSON.parse(JSON.stringify(a)); },
  /* Corrige datos que falten o estén corruptos (guardados antiguos, edición manual...) */
  validar(a) {
    a = a || {};
    const lim = (v, max) => Math.max(0, Math.min(max, Number(v) | 0));
    a.nombre = String(a.nombre || 'Nómada').slice(0, 16);
    if (!this.pronombres.includes(a.pronombres)) a.pronombres = 'elle';
    if (!this.animaciones.includes(a.animEspera)) a.animEspera = 'respirar';
    if (!this.posturas.includes(a.postura)) a.postura = 'recta';
    Object.values(Catalogo).flat().forEach(d => {
      if (d.op) a[d.s] = lim(a[d.s], d.op.length - 1);
      if (d.pal) a[d.s + 'C'] = lim(a[d.s + 'C'], PAL[d.pal].length - 1);
    });
    return a;
  },
  aleatoria(actual) {
    const a = this.defecto(), rnd = n => (Math.random() * n) | 0;
    Object.values(Catalogo).flat().forEach(d => {
      if (d.op) a[d.s] = (d.op[0] === NINGUNO && Math.random() < 0.45) ? 0 : rnd(d.op.length);
      if (d.pal) a[d.s + 'C'] = rnd(PAL[d.pal].length);
    });
    if (actual) { a.nombre = actual.nombre; a.pronombres = actual.pronombres; a.animEspera = actual.animEspera; a.postura = actual.postura; }
    return a;
  },
  cargarPlantilla() {
    try { return this.validar(JSON.parse(localStorage.getItem(this.clavePlantilla))); } catch (e) { return this.defecto(); }
  },
  guardarPlantilla(a) { localStorage.setItem(this.clavePlantilla, JSON.stringify(a)); },

  /* ---------------------------------------------------------------
     DIBUJO POR CAPAS. Origen (0,0) = pies; +x = hacia donde mira.
     p = { lp (alto piernas), torso, paso, enSuelo, agachado, ataqueProg, t, quieto }
     --------------------------------------------------------------- */
  dibujarPersonaje(ctx, a, p) {
    const quieto = p.quieto && !p.agachado;
    const respira = quieto && a.animEspera === 'respirar' && Math.floor(p.t / 30) % 2 === 0;
    const mira = quieto && a.animEspera === 'mirar' && p.t % 300 > 200;
    const saluda = quieto && a.animEspera === 'saludar' && p.t % 300 < 90;
    const lp = p.lp - (quieto && a.postura === 'alerta' ? 1 : 0), to = p.torso, T = -lp - to;
    const lean = a.postura === 'relajada' ? 1 : 0, HY = T - 7 + (respira ? 1 : 0);
    const W = [7, 8, 6, 8][a.rostro], x0 = -((W / 2) | 0) + lean, fx = x0 + W, ex = fx - 3;
    const piel = PAL.PIEL[a.pielC], HC = PAL.CABELLO[a.cabelloC];
    const r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const C = s => PAL[PALDE[s]][a[s + 'C']];
    const on = (s, f) => { if (a[s] > 0) f(a[s], PALDE[s] ? C(s) : null); };    // dibuja la pieza solo si hay una elegida
    const legs = p.enSuelo ? [[-5 + p.paso, -lp, 4, lp], [1 - p.paso, -lp, 4, lp]] : [[-5, -lp, 4, lp - 1], [1, -lp + 2, 4, lp - 3]];

    // 1. Mochila (queda detrás del cuerpo)
    on('mochila', (i, c) => { r(-9, T + 1, i === 1 ? 4 : 5, to - (i === 1 ? 3 : 0), c);
      if (i === 2) r(-9, T + 1, 1, to, 'rgba(0,0,0,.35)'); if (i === 3) { r(-8, T + 2, 3, 1, '#21d4ff'); r(-9, T - 2, 1, 3, '#9a9ab0'); } });
    // 2. Piernas y todo lo que las cubre
    legs.forEach(([x, y, w, h]) => { r(x, y, w, h, piel); r(x, y, w, 2, '#1b1630'); });
    on('pantalon', (i, c) => legs.forEach(([x, y, w, h]) => { r(x, y, w, i === 2 ? h >> 1 : h, c);
      if (i === 3) r(x, y + 4, w, 2, piel); if (i === 4) r(x + 1, y + 3, 2, 2, 'rgba(0,0,0,.3)'); }));
    on('falda', (i, c) => { const h = [0, 4, 8, 5][i]; r(-6, -lp - 1, 12, h, c);
      if (i === 3) for (let x = -5; x < 6; x += 2) r(x, -lp - 1, 1, h, 'rgba(0,0,0,.25)'); });
    on('protesis', (i, c) => legs.forEach(([x, y, w, h]) => { const y0 = i === 1 ? y + (h >> 1) : y;
      r(x, y0, w, y + h - y0, c); r(x, y0 + (i === 1 ? 0 : 3), w, 1, '#120d22'); if (i === 2) r(x + 1, y, 1, h, '#21d4ff'); }));
    on('botas', (i, c) => legs.forEach(([x, y, w, h]) => { const bh = [0, 4, 6, 4][i];
      r(x, y + h - bh, w + 1, bh, c); r(x, y + h - bh, w + 1, 1, 'rgba(255,255,255,.2)'); if (i === 3) r(x, y + h - 1, w + 1, 1, '#9a9ab0'); }));
    on('zapatillas', (i, c) => legs.forEach(([x, y, w, h]) => { r(x, y + h - 2, w + 1, 2, c); r(x, y + h - 1, w + 1, 1, i === 2 ? '#21d4ff' : '#e8e8f0'); }));
    // 3. Torso y prendas superiores
    r(-5, T, 10, to, piel);
    on('polera', (i, c) => { if (i === 4) { r(-4, T + 2, 8, to - 2, c); r(-3, T, 2, 2, c); r(1, T, 2, 2, c); return; }
      r(-5, T, 10, to, c); if (i === 2) for (let y = T + 1; y < T + to; y += 3) r(-5, y, 10, 1, 'rgba(0,0,0,.3)'); if (i === 3) r(1, T + 3, 3, 3, '#ff2e9a'); });
    on('vestido', (i, c) => { const h = i === 2 ? to + lp - 1 : to + 4; r(-5, T, 10, h, c);
      r(-5, T + to - 1, 10, 1, 'rgba(0,0,0,.25)'); if (i === 3) r(-5, T + h - 1, 10, 1, '#21d4ff'); });
    on('chaqueta', (i, c) => { r(-5, T, 10, to - (i === 2 ? 1 : 0), c); r(-5, T, 10, 1, 'rgba(255,255,255,.2)');
      if (i !== 2) r(-1, T + 1, 2, to - 1, a.polera ? C('polera') : piel);
      if (i === 1) r(-5, T + to - 2, 10, 1, 'rgba(0,0,0,.3)'); if (i === 3) { r(-4, T + 4, 2, 2, 'rgba(0,0,0,.3)'); r(2, T + 4, 2, 2, 'rgba(0,0,0,.3)'); }
      if (i === 4) r(-5, T + to - 1, 10, 1, '#ff2e9a'); });
    on('abrigo', (i, c) => { const h = i === 2 ? to + lp - 2 : to + 3; r(-6, T, 12, h, c); if (i === 3) r(-7, T + to, 14, 2, c);
      if (i === 1) r(-6, T - 2, 3, 3, c); r(-6, T, 12, 1, 'rgba(255,255,255,.2)'); r(-6, T + h - 1, 12, 1, 'rgba(0,0,0,.3)'); });
    on('circuitos', (i, c) => { if (i === 2) { r(-3, T + 2, 1, to - 4, c); r(-3, T + to - 3, 5, 1, c); r(1, T + 2, 1, 3, c); } });
    on('implantes', i => { if (i === 3) { r(2, T + 3, 3, 3, '#21d4ff'); r(3, T + 4, 1, 1, '#fff'); } });
    on('modificacion', (i, c) => { if (i === 2) { r(-6, T, 3, 2, c); r(3, T, 3, 2, c); }
      if (i === 3) { r(-6, T + 1, 1, to - 1, c); r(-6, T + 3, 1, 1, '#21d4ff'); } });
    on('collar', (i, c) => { r(-2, T - 1, 4, 1, c); if (i === 1) r(-1, T, 2, 1, c); });

    // 4. Cabeza (se voltea entera si "mira alrededor")
    ctx.save();
    if (mira) { const cx = x0 + W / 2; ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.translate(-cx, 0); }
    r(x0, HY, W, 7, piel); r(x0, HY + 6, W, 1, 'rgba(0,0,0,.18)');
    if (a.rostro === 1) r(fx - 3, HY + 4, 2, 1, 'rgba(255,90,90,.25)');
    on('cabello', (i, c) => { const h = { 1: () => r(x0, HY, W, 1, c), 2: () => { r(x0, HY - 1, W, 3, c); r(x0, HY + 2, 1, 2, c); },
      3: () => { r(x0, HY - 1, W, 3, c); r(x0 - 1, HY, 2, 11, c); }, 4: () => { r(x0 + 2, HY - 4, 3, 5, c); r(x0, HY, W, 1, c); },
      5: () => { r(x0, HY - 1, W, 3, c); r(x0 - 3, HY + 1, 3, 3, c); r(x0 - 4, HY + 3, 2, 6, c); },
      6: () => { r(x0 - 1, HY - 2, W + 2, 4, c); r(x0 - 1, HY + 2, 1, 2, c); }, 7: () => r(x0 - 2, HY - 3, W + 4, 6, c) }; h[i](); });
    const OJ = PAL.OJOS[a.ojosC], BL = '#e8e8f0';
    if (a.ojos === 0) { r(ex - 1, HY + 3, 1, 2, BL); r(ex, HY + 3, 1, 2, OJ); }
    else if (a.ojos === 1) r(ex - 1, HY + 3, 2, 1, OJ);
    else if (a.ojos === 2) { r(ex - 1, HY + 3, 2, 2, BL); r(ex, HY + 3, 1, 2, OJ); }
    else { r(ex - 1, HY + 3, 2, 1, 'rgba(0,0,0,.35)'); r(ex - 1, HY + 4, 2, 1, OJ); }
    on('ojoCib', i => { r(ex - 1, HY + 3, 2, 2, ['', '#ff3b4e', '#21d4ff', '#9aff3b'][i]); if (i === 3) r(ex + 1, HY + 3, 3, 1, 'rgba(33,212,255,.6)'); });
    on('cicatriz', i => { const c = 'rgba(150,60,60,.85)'; if (i === 1) r(fx - 4, HY + 4, 3, 1, c);
      if (i === 2) r(ex - 1, HY + 1, 1, 3, 'rgba(240,220,220,.8)'); if (i === 3) { r(fx - 4, HY + 4, 3, 1, c); r(fx - 3, HY + 3, 1, 3, c); } });
    on('marca', (i, c) => { if (i === 1) { r(fx - 4, HY + 5, 1, 1, '#5a3a2a'); r(fx - 2, HY + 4, 1, 1, '#5a3a2a'); }
      if (i === 2) r(fx - 5, HY + 3, 5, 1, c); if (i === 3) r(ex - 1, HY + 5, 3, 1, 'rgba(90,50,110,.6)');
      if (i === 4) { r(fx - 4, HY + 4, 1, 1, c); r(fx - 3, HY + 5, 1, 1, c); r(fx - 2, HY + 4, 1, 1, c); } });
    on('maquillaje', (i, c) => { if (i === 1) r(ex - 1, HY + 2, 3, 1, c); if (i === 2) r(fx - 3, HY + 5, 3, 1, c);
      if (i === 3) { r(ex - 1, HY + 2, 4, 1, c); r(ex + 2, HY + 3, 1, 1, c); } });
    on('tatuaje', (i, c) => { if (i === 2) r(fx - 3, HY + 4, 2, 2, c); });
    on('piercing', (i, c) => { if (i === 1) r(ex, HY + 1, 1, 1, '#e8e8f0'); if (i === 2) r(fx, HY + 4, 1, 1, c); if (i === 3) r(x0 + 2, HY + 5, 1, 2, c); });
    on('implantes', i => { if (i === 1) { r(fx - 3, HY, 2, 1, '#21d4ff'); r(fx - 2, HY + 1, 1, 1, '#9a9ab0'); }
      if (i === 2) { r(x0, HY + 3, 1, 3, '#9a9ab0'); r(x0, HY + 4, 1, 1, '#ff3b4e'); } });
    on('circuitos', (i, c) => { if (i === 3) { r(fx - 2, HY + 4, 1, 3, c); r(fx - 4, HY + 6, 3, 1, c); } });
    on('modificacion', (i, c) => { if (i === 1) { r(x0 + 1, HY - 1, W - 2, 1, c); r(x0 + 3, HY - 2, 1, 1, c); } });
    on('gafas', (i, c) => { if (i === 1) { r(ex - 1, HY + 2, 3, 3, c); r(ex, HY + 3, 1, 1, 'rgba(0,0,0,.6)'); }
      if (i === 2) r(x0 + 1, HY + 2, W - 1, 2, c); if (i === 3) { r(ex - 2, HY + 2, 4, 3, '#120d22'); r(ex - 2, HY + 2, 4, 1, c); } });
    on('mascara', (i, c) => { if (i === 1) { r(fx - 4, HY + 4, 5, 4, '#3a3a4a'); r(fx + 1, HY + 5, 2, 2, c); }
      if (i === 2) r(x0, HY + 4, W, 3, c); if (i === 3) { r(x0 + 1, HY + 4, W - 1, 3, '#120d22'); r(x0 + 1, HY + 5, W - 1, 1, c); } });
    on('casco', (i, c) => { if (i === 1) { r(x0 - 1, HY - 2, W + 2, 7, c); r(fx - 2, HY + 2, 3, 3, '#21d4ff'); }
      if (i === 2) { r(x0 - 1, HY - 2, W + 2, 4, c); r(x0 - 1, HY + 1, W + 2, 1, '#120d22'); }
      if (i === 3) { r(x0 - 2, HY - 2, W + 3, 3, c); r(x0 - 2, HY + 1, 2, 8, c); } });
    on('auriculares', (i, c) => { r(x0, HY - 1, W, 1, c); r(x0 + 2, HY + 2, 2, 3, c); if (i === 2) r(x0 + 3, HY + 3, 1, 1, '#21d4ff'); });
    ctx.restore();

    // 5. Brazo (pivota desde el hombro: camina, saluda o golpea)
    const ang = p.ataqueProg != null ? 2.6 - p.ataqueProg * 4.1 : saluda ? 3 + Math.sin(p.t * 0.4) * 0.3 : p.paso * 0.18;
    ctx.save(); ctx.translate(3 + lean, T + 2); ctx.rotate(ang);
    const manga = a.chaqueta ? C('chaqueta') : a.abrigo ? C('abrigo') : (a.polera && a.polera !== 4) ? C('polera') : null;
    if (a.brazo > 0) { const m = C('brazo'); r(-1, 0, 3, 6, m); r(-1, 2, 3, 1, '#120d22'); r(0, 3, 1, 1, '#21d4ff');
      if (a.brazo === 2) r(1, 0, 1, 6, '#21d4ff'); if (a.brazo === 3) r(-2, 4, 5, 3, m); }
    else { r(-1, 0, 3, 5, piel); if (manga) r(-1, 0, 3, (a.chaqueta || a.abrigo) ? 5 : 2, manga);
      if (a.tatuaje === 1 || a.tatuaje === 3) r(0, 1, 1, 3, C('tatuaje')); }
    if (a.circuitos === 1) r(0, 1, 1, 4, C('circuitos'));
    on('guantes', (i, c) => { r(-1, 4, 3, 2, c); if (i === 3) r(-1, 4, 3, 1, 'rgba(255,255,255,.3)'); });
    if (p.ataqueProg != null) r(-1, 5, 2, 14, '#9a9ab0');          // tubo de metal (se sustituirá por el arma equipada)
    ctx.restore();
  }
};