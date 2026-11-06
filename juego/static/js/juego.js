/* =====================================================================
   juego.js - Bucle principal, cámara, entrada, ambiente e iluminación.
   Dibuja en un lienzo pequeño (480x270) que el CSS amplía sin suavizar:
   así se consigue el aspecto pixel art.
   ===================================================================== */
'use strict';

/* ---------- AMBIENTE: lluvia, partículas y chispas ---------- */
const Ambiente = {
  gotas: [], polvo: [], salpicaduras: [], chispasMundo: [],
  iniciar() {
    this.gotas = Array.from({ length: 160 }, () => this.nuevaGota(true));
    this.polvo = Array.from({ length: 30 }, () => ({ x: Math.random() * 480, y: Math.random() * 232,
      v: 0.1 + Math.random() * 0.3, c: Mundo.neon[(Math.random() * 3) | 0] }));
  },
  nuevaGota(inicial) {
    return { x: Math.random() * 540, y: inicial ? Math.random() * 232 : -10, v: 5 + Math.random() * 3,
             piso: 236 + Math.random() * 28 };
  },
  chispas(x, y, c, n) {
    for (let i = 0; i < n; i++) this.chispasMundo.push({ x, y, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2.5, vida: 20 + Math.random() * 10, c });
  },
  actualizar() {
    this.gotas.forEach((g, i) => {
      g.y += g.v; g.x -= 1.2;
      if (g.y > g.piso) { this.salpicaduras.push({ x: g.x, y: g.piso, v: 6 }); this.gotas[i] = this.nuevaGota(false); }
    });
    this.salpicaduras = this.salpicaduras.filter(s => --s.v > 0);
    this.polvo.forEach(p => { p.x -= p.v; p.y += Math.sin(p.x * 0.05) * 0.1; if (p.x < 0) p.x = 480; });
    this.chispasMundo.forEach(c => { c.x += c.vx; c.y += c.vy; c.vy += 0.15; c.vida--; });
    this.chispasMundo = this.chispasMundo.filter(c => c.vida > 0);
  },
  dibujarMundo(ctx) {                                   // chispas (coordenadas del mundo)
    this.chispasMundo.forEach(c => { ctx.fillStyle = c.c; ctx.fillRect(c.x | 0, c.y | 0, 2, 2); });
  },
  dibujarPantalla(ctx, t) {                             // niebla, polvo y lluvia (pantalla)
    for (let i = 0; i < 4; i++) {
      const x = ((t * 0.2 * (i + 1) + i * 170) % 640) - 80;
      const g = ctx.createRadialGradient(x, 218, 5, x, 218, 100);
      g.addColorStop(0, 'rgba(123,47,255,.16)'); g.addColorStop(1, 'rgba(123,47,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 110, 480, 160);
    }
    this.polvo.forEach(p => { ctx.globalAlpha = 0.5; ctx.fillStyle = p.c; ctx.fillRect(p.x | 0, p.y | 0, 1, 1); });
    const n = Math.floor(this.gotas.length * Ajustes.valores.lluvia / 100);
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#9ac8ff';
    for (let i = 0; i < n; i++) ctx.fillRect(this.gotas[i].x | 0, this.gotas[i].y | 0, 1, 4);
    ctx.fillStyle = '#21d4ff';
    this.salpicaduras.forEach(s => ctx.fillRect(s.x | 0, s.y | 0, 3, 1));
    ctx.globalAlpha = 1;
  }
};

/* ---------- JUEGO ---------- */
const Juego = {
  activo: false, pausado: false, idBucle: 0,
  t: 0, acum: 0, ultimo: 0, cam: { x: 0 }, sacudida: 0,
  mensaje: null, cercano: null, ayuda: 600, puntoSeguro: null,
  teclas: {}, pulsadas: {},

  /* Arranca (o reanuda al cargar) la partida: lee partidaActual */
  iniciar() {
    if (!this.ctx) {
      this.lienzo = document.getElementById('juego');
      this.lienzo.width = 480; this.lienzo.height = 270;
      this.ctx = this.lienzo.getContext('2d');
      this.oscuro = document.createElement('canvas'); this.oscuro.width = 480; this.oscuro.height = 270;
      this.octx = this.oscuro.getContext('2d');
      Mundo.iniciarCapas(); Ambiente.iniciar(); this.conectarTeclado();
    }
    const p = partidaActual;
    p.apariencia = Apariencia.validar(p.apariencia || Apariencia.defecto());
    Jugador.apariencia = Apariencia.copiar(p.apariencia);
    p.jugador = p.jugador || {}; p.objetosRecogidos = p.objetosRecogidos || []; p.documentos = p.documentos || [];
    Mundo.reiniciarObjetos();
    const pj = p.jugador, cargado = pj.x > 0;
    const x = cargado ? pj.x : Mundo.inicio.x, y = cargado ? pj.y : Mundo.inicio.y;
    Jugador.reiniciar(x, y); Jugador.vida = pj.vida > 0 ? pj.vida : Jugador.vidaMax;
    this.puntoSeguro = p.puntoSeguro || { ...Mundo.inicio };
    this.cam.x = x - 240; this.pausado = false; this.ayuda = 600; this.mensaje = null; this.t = 0;
    document.getElementById('pausa').classList.remove('abierta');
    this.activo = true; this.ultimo = performance.now(); this.acum = 0;
    const id = ++this.idBucle;
    requestAnimationFrame(ts => this.bucle(ts, id));
  },
  detener() { this.activo = false; this.idBucle++; this.teclas = {}; },

  pausar() { this.pausado = true; this.teclas = {};
    document.getElementById('pausa-estado').textContent = '';
    document.getElementById('pausa').classList.add('abierta'); Menu.seleccionar(0); },
  reanudar() { this.pausado = false; this.ultimo = performance.now();
    document.getElementById('pausa').classList.remove('abierta'); document.activeElement.blur(); },

  conectarTeclado() {
    window.addEventListener('keydown', e => {
      if (!this.activo) return;
      if (Personalizar.abierto) return;           // la personalización gestiona sus propias teclas
      if (e.code === 'Escape') { this.pausado ? this.reanudar() : this.pausar(); return; }
      if (this.pausado) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pulsadas[e.code] = true;
      this.teclas[e.code] = true;
    });
    window.addEventListener('keyup', e => { this.teclas[e.code] = false; });
    this.lienzo.addEventListener('mousedown', e => { if (this.activo && !this.pausado && e.button === 0) this.pulsadas.Mouse = true; });
    window.addEventListener('blur', () => { this.teclas = {}; if (this.activo && !this.pausado && !Personalizar.abierto) this.pausar(); });
  },

  /* Bucle con paso fijo (60 actualizaciones/s) para que las físicas sean iguales en todos los PC */
  bucle(ts, id) {
    if (id !== this.idBucle) return;
    if (!this.pausado) {
      this.acum = Math.min(this.acum + (ts - this.ultimo), 100);
      while (this.acum >= 16.67) { this.actualizar(); this.acum -= 16.67; }
    }
    this.ultimo = ts;
    this.dibujar();
    requestAnimationFrame(tt => this.bucle(tt, id));
  },

  actualizar() {
    this.t++;
    const k = this.teclas, p = this.pulsadas, J = Jugador;
    Jugador.actualizar({
      izq: k.KeyA || k.ArrowLeft, der: k.KeyD || k.ArrowRight, abajo: k.KeyS || k.ArrowDown,
      shift: k.ShiftLeft || k.ShiftRight, saltoMantenido: k.KeyW || k.Space || k.ArrowUp,
      saltoPulsado: p.KeyW || p.Space || p.ArrowUp, ataquePulsado: p.KeyF || p.Mouse
    });
    this.combateYPeligros();
    this.buscarInteractivo();
    if (p.KeyE && this.cercano) this.usar(this.cercano);
    if (p.KeyI) this.mostrarMensaje(['INVENTARIO: se activa en la Etapa 5.'], 150);

    if (J.vida <= 0) {                                   // muerte provisional (pantalla de muerte: Etapa 10)
      J.reiniciar(this.puntoSeguro.x, this.puntoSeguro.y); J.vida = J.vidaMax;
      this.mostrarMensaje(['CONEXIÓN PERDIDA.', 'Reiniciando en el último punto seguro.'], 200);
    }
    // Cámara suave con ligero adelanto hacia donde miras
    const objetivo = J.x + J.w / 2 - 240 + J.dir * 30;
    this.cam.x += (objetivo - this.cam.x) * 0.08;
    this.cam.x = Math.max(0, Math.min(Mundo.ancho - 480, this.cam.x));

    Ambiente.actualizar();
    this.sacudida *= 0.85; if (this.ayuda > 0) this.ayuda--;
    if (this.mensaje && --this.mensaje.tiempo <= 0) this.mensaje = null;
    this.pulsadas = {};
  },

  combateYPeligros() {
    const J = Jugador, S = Mundo.suelo, caja = J.cajaAtaque();
    for (const o of Mundo.objetos) {
      if (o.t !== 'dummy') continue;
      if (caja && o.vida > 0 && caja.x < o.x + 8 && caja.x + caja.w > o.x - 8 && caja.y < S && caja.y + caja.h > S - 30) {
        o.vida--; o.flash = 8; J.golpeo = true; this.sacudida = 3; Ambiente.chispas(o.x, S - 16, '#ff2e9a', 10);
        if (o.vida <= 0) { o.reaparece = 420; this.mostrarMensaje(['Dron de práctica destruido.'], 120); }
      }
      if (o.flash > 0) o.flash--;
      if (o.vida <= 0 && --o.reaparece <= 0) o.vida = 3;
    }
    for (const h of Mundo.peligros) {
      if (Mundo.chispasActivas(h, this.t) && J.x < h.x + h.w && J.x + J.w > h.x && J.y < h.y + h.h && J.y + J.h > h.y) {
        if (J.recibirDano(12, J.x + J.w / 2 < h.x + h.w / 2 ? -1 : 1)) {     // vibración + partículas
          this.sacudida = 8; Ambiente.chispas(J.x + 6, J.y + 10, '#21d4ff', 12);
        }
      }
    }
  },

  /* Busca el objeto interactivo más cercano al jugador */
  buscarInteractivo() {
    const J = Jugador, cx = J.x + J.w / 2, pies = J.y + J.h; let mejor = null, dmin = 22;
    for (const o of Mundo.objetos) {
      if (o.t === 'dummy' || (o.t === 'item' && this.recogido(o.id))) continue;
      const d = Math.abs(o.x - cx);
      if (d < dmin && Math.abs((o.y || Mundo.suelo) - pies) < 30) { mejor = o; dmin = d; }
    }
    this.cercano = mejor;
  },
  recogido(id) { return partidaActual.objetosRecogidos.includes(id); },

  usar(o) {
    const p = partidaActual;
    if (o.t === 'terminal') {
      this.mostrarMensaje([o.titulo, ...o.texto], 420);
      if (!p.documentos.includes(o.id)) p.documentos.push(o.id);
    } else if (o.t === 'item') {
      p.objetosRecogidos.push(o.id);
      this.mostrarMensaje(['Recogido: ' + o.nombre, '(el inventario real llega en la Etapa 5)'], 180);
    } else if (o.t === 'espejo') {
      Personalizar.abrir('juego');
    } else if (o.t === 'refugio') {
      this.puntoSeguro = { x: o.x - 30, y: Mundo.suelo - 26 }; p.puntoSeguro = this.puntoSeguro;
      Jugador.vida = Jugador.vidaMax; this.guardarProgreso();
      this.mostrarMensaje(['Refugio alcanzado: salud restaurada y partida guardada.', 'Fin de la zona de prueba.'], 300);
    }
  },

  /* Copia el estado del juego a partidaActual (el menú lo escribe en LocalStorage) */
  volcarEstado() {
    const J = Jugador; partidaActual.jugador = { x: Math.round(J.x), y: Math.round(J.y), vida: J.vida };
    partidaActual.apariencia = Apariencia.copiar(J.apariencia);
  },
  guardarProgreso() { this.volcarEstado(); Guardado.escribir(partidaActual); },
  mostrarMensaje(lineas, duracion) { this.mensaje = { lineas, tiempo: duracion || 240 }; },

  /* ---------- DIBUJO ---------- */
  dibujar() {
    const ctx = this.ctx, cx = Math.round(this.cam.x), t = this.t;
    ctx.imageSmoothingEnabled = false;
    Mundo.dibujarFondo(ctx, cx, t);
    ctx.save();
    ctx.translate(-cx + Math.round((Math.random() - 0.5) * this.sacudida), Math.round((Math.random() - 0.5) * this.sacudida));
    Mundo.dibujarMundo(ctx, cx, t, id => this.recogido(id));
    Jugador.dibujar(ctx, t); Ambiente.dibujarMundo(ctx);
    ctx.restore();
    Ambiente.dibujarPantalla(ctx, t);
    this.dibujarLuz(ctx, cx, t);
    this.dibujarHUD(ctx, cx);
  },

  /* Oscuridad con "agujeros" de luz + brillo de neón aditivo */
  dibujarLuz(ctx, cx, t) {
    const o = this.octx, J = Jugador;
    const luces = Mundo.luces.filter(l => l.x > cx - l.r && l.x < cx + 480 + l.r).map(l => ({ ...l,
      r: l.r * (l.parpadeo && Math.random() < 0.08 ? 0.5 : 1 + 0.03 * Math.sin(t * 0.1 + l.x)) }));
    luces.push({ x: J.x + J.w / 2, y: J.y + 10, r: 55, c: '#9a6bff' });       // luz del propio jugador
    o.globalCompositeOperation = 'source-over'; o.clearRect(0, 0, 480, 270);
    o.fillStyle = 'rgba(6,3,16,.72)'; o.fillRect(0, 0, 480, 270);
    o.globalCompositeOperation = 'destination-out';
    for (const l of luces) { const x = l.x - cx, g = o.createRadialGradient(x, l.y, 2, x, l.y, l.r);
      g.addColorStop(0, 'rgba(0,0,0,.95)'); g.addColorStop(1, 'rgba(0,0,0,0)'); o.fillStyle = g; o.fillRect(x - l.r, l.y - l.r, l.r * 2, l.r * 2); }
    ctx.drawImage(this.oscuro, 0, 0);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.2;
    for (const l of luces) { const x = l.x - cx, g = ctx.createRadialGradient(x, l.y, 1, x, l.y, l.r * 0.8);
      g.addColorStop(0, l.c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - l.r, l.y - l.r, l.r * 2, l.r * 2); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  },

  texto(s, x, y, color, align) {
    const ctx = this.ctx; ctx.font = '8px "Share Tech Mono", monospace';
    ctx.textAlign = align || 'left'; ctx.fillStyle = color; ctx.fillText(s, x, y); ctx.textAlign = 'left';
  },

  dibujarHUD(ctx, cx) {
    const J = Jugador, f = J.vida / J.vidaMax;
    ctx.fillStyle = 'rgba(10,8,18,.8)'; ctx.fillRect(6, 6, 92, 20);
    ctx.strokeStyle = '#3a3256'; ctx.strokeRect(6.5, 6.5, 91, 19);
    this.texto(J.apariencia.nombre.toUpperCase() + ' · ' + Math.ceil(J.vida), 10, 15, '#d9d2ee');
    ctx.fillStyle = f > 0.3 ? '#ff2e9a' : '#ff3b4e'; ctx.fillRect(10, 19, Math.round(84 * f), 3);
    this.texto(Mundo.nombre, 474, 14, '#21d4ff', 'right');
    this.texto('Docs ' + partidaActual.documentos.length + '  Objetos ' + partidaActual.objetosRecogidos.length, 474, 24, '#8a80ad', 'right');
    if (this.ayuda > 0) {
      ctx.globalAlpha = Math.min(1, this.ayuda / 120);
      this.texto('A/D mover · Shift correr · W/Espacio saltar · S agacharse · F/clic atacar · E interactuar · Esc pausa', 240, 262, '#d9d2ee', 'center');
      ctx.globalAlpha = 1;
    }
    if (this.cercano) {
      const o = this.cercano, txt = o.t === 'terminal' ? '[E] Leer' : o.t === 'item' ? '[E] Recoger ' + o.nombre
        : o.t === 'espejo' ? '[E] Personalizar personaje' : '[E] Entrar al refugio';
      this.texto(txt, Math.round(J.x + J.w / 2 - cx), Math.round(J.y - 8), '#ffffff', 'center');
    }
    if (this.mensaje) {
      const ls = this.mensaje.lineas; ctx.font = '8px "Share Tech Mono", monospace';
      const w = Math.max(...ls.map(l => ctx.measureText(l).width)) + 16, h = ls.length * 11 + 8, x = 240 - w / 2, y = 236 - h;
      ctx.fillStyle = 'rgba(10,8,18,.9)'; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#21d4ff'; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ls.forEach((l, i) => this.texto(l, 240, y + 12 + i * 11, i === 0 && ls.length > 1 ? '#21d4ff' : '#d9d2ee', 'center'));
    }
  }
};