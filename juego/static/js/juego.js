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
  teclas: {}, pulsadas: {}, mouse: { x: 0, y: 0, activo: false }, ang: 0, vineta: 0,

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
    Campana.iniciar(p); Mundo.cargar(p.campana.nivel); Campana.aplicar();   // carga el nivel y las mejoras
    p.apariencia = Apariencia.validar(p.apariencia || Apariencia.defecto());
    Jugador.apariencia = Apariencia.copiar(p.apariencia);
    p.jugador = p.jugador || {}; p.objetosRecogidos = p.objetosRecogidos || []; p.documentos = p.documentos || [];
    Mundo.reiniciarObjetos();
    p.enemigosMuertos = p.enemigosMuertos || [];
    Arsenal.iniciar(p); Combate.reiniciar(); Enemigos.iniciar(Mundo.enemigos, p.enemigosMuertos); this.calcularSalida();
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
      if (e.code === 'Escape' && this.resumenAbierto) { this.cerrarResumen(); return; }
      if (e.code === 'Escape') { this.pausado ? this.reanudar() : this.pausar(); return; }
      if (this.pausado) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pulsadas[e.code] = true;
      this.teclas[e.code] = true;
    });
    window.addEventListener('keyup', e => { this.teclas[e.code] = false; });
    this.lienzo.addEventListener('mousedown', e => { if (this.activo && !this.pausado && e.button === 0) { this.pulsadas.Mouse = true; this.teclas.Mouse = true; } });
    window.addEventListener('mouseup', e => { if (e.button === 0) this.teclas.Mouse = false; });
    this.lienzo.addEventListener('contextmenu', e => e.preventDefault());
    this.lienzo.addEventListener('mousemove', e => {                // posición del ratón en coordenadas del lienzo (480x270)
      const r = this.lienzo.getBoundingClientRect(), s = Math.min(r.width / 480, r.height / 270);
      this.mouse.x = (e.clientX - r.left - (r.width - 480 * s) / 2) / s; this.mouse.y = (e.clientY - r.top - (r.height - 270 * s) / 2) / s;
      this.mouse.activo = true;
    });
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
    const melee = Arsenal.esMelee(), m = melee ? Arsenal.arma() : ARMAS.tubo;
    this.calcularPunteria();
    Jugador.actualizar({
      izq: k.KeyA || k.ArrowLeft, der: k.KeyD || k.ArrowRight, abajo: k.KeyS || k.ArrowDown,
      shift: k.ShiftLeft || k.ShiftRight, saltoMantenido: k.KeyW || k.Space || k.ArrowUp,
      saltoPulsado: p.KeyW || p.Space || p.ArrowUp,
      ataquePulsado: p.KeyF || (melee && p.Mouse),                  // F = cuerpo a cuerpo; con katana también el clic
      meleeDur: m.dur, meleeAlc: m.alc, meleeDano: m.dano * Campana.multDano()
    });
    if (!melee && this.mouse.activo) J.dir = Math.cos(this.ang) >= 0 ? 1 : -1;   // mira hacia donde apuntas
    Arsenal.actualizar(J, this.ang, k.Mouse && !melee, p.Mouse && !melee);       // clic = disparar
    if (p.KeyR) Arsenal.recargar();
    if (p.KeyQ) Arsenal.cambiar();
    this.combateYPeligros();
    Enemigos.actualizar(J); Combate.actualizar(J); this.recogerAutomaticos();
    if (this.vineta > 0) this.vineta--;
    this.buscarInteractivo();
    if (p.KeyE && this.cercano) this.usar(this.cercano);
    if (p.KeyI) this.mostrarMensaje(['INVENTARIO: se activa en la Etapa 5.'], 150);

    if (J.vida <= 0) {                                   // muerte provisional (pantalla de muerte: Etapa 10)
      J.reiniciar(this.puntoSeguro.x, this.puntoSeguro.y); J.vida = J.vidaMax; Combate.reiniciar();
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
    if (caja) for (const e of Enemigos.lista) {                      // golpe cuerpo a cuerpo contra enemigos
      if (e.estado === 'muerte' || J.golpeados.has(e) || caja.x > e.x + e.w || caja.x + caja.w < e.x || caja.y > e.y + e.h || caja.y + caja.h < e.y) continue;
      J.golpeados.add(e); Enemigos.herir(e, J.danoMelee, J.dir, Arsenal.esMelee() ? 14 : 8);
      this.sacudida = 3; Ambiente.chispas(e.x + e.w / 2, e.y + 10, '#9aff3b', 8);
    }
    for (const o of Mundo.objetos) {
      if (o.t !== 'dummy') continue;
      if (caja && o.vida > 0 && !J.golpeados.has(o) && caja.x < o.x + 8 && caja.x + caja.w > o.x - 8 && caja.y < S && caja.y + caja.h > S - 30) {
        o.vida--; o.flash = 8; J.golpeados.add(o); this.sacudida = 3; Ambiente.chispas(o.x, S - 16, '#ff2e9a', 10);
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

  /* Apunta con el ratón (o hacia donde mira, si solo usas teclado) */
  calcularPunteria() {
    const J = Jugador;
    this.ang = this.mouse.activo ? Math.atan2(this.mouse.y - (J.y + 9), this.mouse.x + this.cam.x - (J.x + J.w / 2))
                                 : (J.dir > 0 ? 0 : Math.PI);
  },

  /* El jugador recibe daño de un enemigo: vibración, viñeta roja y número de daño */
  herirJugador(dano, dir) {
    const J = Jugador;
    if (!J.recibirDano(dano, dir)) return false;
    this.sacudida = 6; this.vineta = 14; Combate.texto(J.x + 6, J.y, '-' + dano, '#ff3b4e'); Ambiente.chispas(J.x + 6, J.y + 10, '#ff3b4e', 8);
    return true;
  },

  /* La salida se abre cuando han muerto los enemigos clave del nivel */
  calcularSalida() {
    const antes = this.salidaAbierta;
    this.salidaAbierta = Mundo.necesarios.every(id => partidaActual.enemigosMuertos.includes(id));
    return this.salidaAbierta && !antes;
  },

  alMorirEnemigo(e) {
    partidaActual.enemigosMuertos.push(e.id);                        // se guarda: el enemigo no reaparece al cargar
    Campana.dar(Campana.XP[e.tipo] || 10);
    if (this.calcularSalida()) this.mostrarMensaje(['SALIDA ABIERTA', 'El camino al siguiente sector está libre.'], 260);
    else if (Enemigos.vivos() === 0) this.mostrarMensaje(['Zona despejada: no quedan hostiles.'], 240);
  },

  /* Resumen de misión (pausa el juego hasta que elijas seguir o avanzar) */
  mostrarResumen(titulo, lineas, siguiente) {
    const g = id => document.getElementById(id);
    g('resumen-titulo').textContent = titulo; g('resumen-lineas').textContent = lineas.join('\n');
    g('btn-siguiente').disabled = !(siguiente && siguiente.listo);
    g('btn-siguiente').textContent = siguiente ? 'Ir al Nivel ' + siguiente.id : 'Siguiente nivel';
    g('resumen-nota').textContent = siguiente && !siguiente.listo ? '> El Nivel ' + siguiente.id + ' ya está desbloqueado y guardado, pero todavía no está construido.' : '';
    this.pausado = true; this.resumenAbierto = true; this.teclas = {};
    g('resumen').classList.add('abierta'); Menu.seleccionar(0);
  },
  cerrarResumen() {
    this.resumenAbierto = false; this.pausado = false; this.ultimo = performance.now();
    document.getElementById('resumen').classList.remove('abierta'); document.activeElement.blur();
  },

  /* Munición, armas y botiquines se recogen al tocarlos */
  recogerAutomaticos() {
    const J = Jugador, p = partidaActual;
    for (let i = Mundo.objetos.length - 1; i >= 0; i--) {
      const o = Mundo.objetos[i];
      if (!['muni', 'arma', 'cura'].includes(o.t) || this.recogido(o.id)) continue;
      if (!(o.x > J.x - 6 && o.x < J.x + J.w + 6 && J.y < o.y && J.y + J.h > o.y - 12)) continue;
      if (o.t === 'cura') { if (J.vida >= J.vidaMax) continue; J.vida = Math.min(J.vidaMax, J.vida + o.n); Combate.texto(o.x, o.y - 12, '+' + o.n + ' salud', '#ff3b4e'); }
      else if (o.t === 'muni') { Arsenal.darMunicion(o.tipo, o.n); Combate.texto(o.x, o.y - 12, '+' + o.n + ' ' + MUNICION[o.tipo].n, MUNICION[o.tipo].c); }
      else { const nueva = Arsenal.darArma(o.arma);
        this.mostrarMensaje(nueva ? ['Arma obtenida: ' + ARMAS[o.arma].n, 'Pulsa Q para cambiar de arma'] : [ARMAS[o.arma].n + ' (ya la tienes): munición extra'], 200); }
      if (o.temp) Mundo.objetos.splice(i, 1); else p.objetosRecogidos.push(o.id);
    }
  },

  /* Busca el objeto interactivo más cercano al jugador */
  buscarInteractivo() {
    const J = Jugador, cx = J.x + J.w / 2, pies = J.y + J.h; let mejor = null, dmin = 22;
    for (const o of Mundo.objetos) {
      if (['dummy', 'muni', 'arma', 'cura'].includes(o.t) || (o.t === 'item' && this.recogido(o.id))) continue;
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
    } else if (o.t === 'salida') {
      if (this.salidaAbierta) Campana.completarNivel();
      else this.mostrarMensaje(['SALIDA BLOQUEADA', 'Faltan ' + Mundo.necesarios.filter(id => !p.enemigosMuertos.includes(id)).length + ' hostiles clave por eliminar.'], 180);
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
    Enemigos.dibujar(ctx, t);
    Jugador.dibujar(ctx, t);
    if (Arsenal.flash > 0 && !Arsenal.esMelee()) {                  // fogonazo en la boca del arma
      const mz = Arsenal.muzzle(Jugador, this.ang); ctx.fillStyle = Arsenal.arma().color; ctx.fillRect(mz.x - 3, mz.y - 3, 6, 6);
      ctx.fillStyle = '#fff'; ctx.fillRect(mz.x - 1, mz.y - 1, 3, 3);
    }
    Combate.dibujar(ctx); Ambiente.dibujarMundo(ctx);
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
    const nj = Campana.nivelJugador(); this.texto('NV ' + nj.lvl + ' · ' + nj.resto + '/' + nj.necesita + ' XP', 474, 44, '#a56bff', 'right');
    this.texto('Hostiles ' + Enemigos.vivos(), 474, 34, Enemigos.vivos() ? '#ff3b4e' : '#9aff3b', 'right');
    const A = Arsenal.arma();                                       // panel del arma
    ctx.fillStyle = 'rgba(10,8,18,.8)'; ctx.fillRect(6, 236, 116, 28); ctx.strokeStyle = A.color; ctx.strokeRect(6.5, 236.5, 115, 27);
    this.texto(A.n.toUpperCase(), 10, 246, A.color);
    if (A.tipo === 'melee') this.texto('CUERPO A CUERPO', 10, 258, '#d9d2ee');
    else if (Arsenal.recarga > 0) { this.texto('RECARGANDO', 10, 258, '#ffd23b'); ctx.fillStyle = A.color; ctx.fillRect(64, 254, Math.round(54 * (1 - Arsenal.recarga / A.recarga)), 3); }
    else this.texto(Arsenal.cargador() + ' / ' + Arsenal.reserva() + (Arsenal.vacio > 0 ? '  SIN MUNICIÓN' : ''), 10, 258, Arsenal.vacio > 0 ? '#ff3b4e' : '#d9d2ee');
    if (this.vineta > 0) { ctx.strokeStyle = 'rgba(255,59,78,' + (this.vineta / 20) + ')'; ctx.lineWidth = 6; ctx.strokeRect(0, 0, 480, 270); ctx.lineWidth = 1; }
    this.texto('Docs ' + partidaActual.documentos.length + '  Objetos ' + partidaActual.objetosRecogidos.length, 474, 24, '#8a80ad', 'right');
    if (this.ayuda > 0) {
      ctx.globalAlpha = Math.min(1, this.ayuda / 120);
      this.texto('A/D mover · Shift correr · W saltar · S agacharse · E usar · Esc pausa', 240, 44, '#d9d2ee', 'center');
      this.texto('Clic disparar · R recargar · Q cambiar arma · F cuerpo a cuerpo', 240, 55, '#d9d2ee', 'center');
      ctx.globalAlpha = 1;
    }
    if (this.cercano) {
      const o = this.cercano, txt = o.t === 'terminal' ? '[E] Leer' : o.t === 'item' ? '[E] Recoger ' + o.nombre
        : o.t === 'espejo' ? '[E] Personalizar personaje'
        : o.t === 'salida' ? (this.salidaAbierta ? '[E] Cruzar la salida' : '[E] Salida bloqueada') : '[E] Entrar al refugio';
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