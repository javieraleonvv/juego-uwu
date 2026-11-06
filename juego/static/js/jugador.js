/* =====================================================================
   jugador.js - Personaje: movimiento, físicas, ataque, daño y sprite.
   El sprite se dibuja por código (provisional): cuando tengas sprites
   reales, solo hay que sustituir la función dibujar().
   ===================================================================== */
'use strict';

const Jugador = {
  x: 80, y: 190, w: 12, h: 26, vx: 0, vy: 0, dir: 1,
  enSuelo: false, agachado: false,
  vida: 100, vidaMax: 100,
  ataque: 0, golpeo: false, invulnerable: 0,
  coyote: 0, buffer: 0, animT: 0, estado: 'quieto',
  apariencia: Apariencia.defecto(),   // se sustituye al cargar la partida

  reiniciar(x, y) {
    Object.assign(this, { x, y, vx: 0, vy: 0, h: 26, agachado: false, ataque: 0, invulnerable: 60 });
  },

  /* Devuelve el sólido con el que choca un rectángulo (o undefined) */
  choca(x, y, w, h) {
    return Mundo.solidos.find(s => x < s.x + s.w && x + w > s.x && y < s.y + s.h && y + h > s.y);
  },

  actualizar(inp) {
    // --- Movimiento horizontal con aceleración y rozamiento ---
    const dirIn = (inp.der ? 1 : 0) - (inp.izq ? 1 : 0);
    const vMax = this.agachado ? 0.7 : (inp.shift ? 2.4 : 1.3);
    if (dirIn) { this.vx += dirIn * (this.enSuelo ? 0.3 : 0.2); this.dir = dirIn; }
    else this.vx *= this.enSuelo ? 0.75 : 0.96;
    this.vx = Math.max(-vMax, Math.min(vMax, this.vx));
    if (Math.abs(this.vx) < 0.05) this.vx = 0;

    // --- Agacharse (no se levanta si hay techo encima) ---
    const quiere = inp.abajo && this.enSuelo;
    if (quiere && !this.agachado) { this.agachado = true; this.y += 10; this.h = 16; }
    else if (!quiere && this.agachado && !this.choca(this.x, this.y - 10, this.w, 26)) {
      this.agachado = false; this.y -= 10; this.h = 26;
    }

    // --- Salto: "coyote time" y buffer hacen que responda mejor ---
    if (this.enSuelo) this.coyote = 6; else if (this.coyote > 0) this.coyote--;
    if (inp.saltoPulsado) this.buffer = 6; else if (this.buffer > 0) this.buffer--;
    if (this.buffer > 0 && this.coyote > 0 && !this.agachado) { this.vy = -5.7; this.buffer = 0; this.coyote = 0; }
    if (!inp.saltoMantenido && this.vy < -2.2) this.vy = -2.2;      // salto corto si sueltas la tecla
    this.vy = Math.min(this.vy + 0.28, 7);                           // gravedad

    // --- Ataque cuerpo a cuerpo ---
    if (inp.ataquePulsado && this.ataque === 0) { this.ataque = 18; this.golpeo = false; }
    if (this.ataque > 0) this.ataque--;
    if (this.invulnerable > 0) this.invulnerable--;

    // --- Colisiones: primero eje X, luego eje Y ---
    this.x += this.vx;
    let s = this.choca(this.x, this.y, this.w, this.h);
    if (s) { this.x = this.vx > 0 ? s.x - this.w : s.x + s.w; this.vx = 0; }
    this.y += this.vy; this.enSuelo = false;
    s = this.choca(this.x, this.y, this.w, this.h);
    if (s) { if (this.vy > 0) { this.y = s.y - this.h; this.enSuelo = true; } else this.y = s.y + s.h; this.vy = 0; }

    // --- Estado para la animación ---
    this.animT += Math.abs(this.vx) * 0.22;
    this.estado = this.ataque > 0 ? 'ataque' : !this.enSuelo ? 'salto' : this.agachado ? 'agachado'
      : Math.abs(this.vx) > 1.5 ? 'correr' : Math.abs(this.vx) > 0.1 ? 'caminar' : 'quieto';
  },

  /* Zona que golpea el ataque (solo en los fotogramas "activos") */
  cajaAtaque() {
    if (this.ataque > 6 && this.ataque < 13 && !this.golpeo)
      return { x: this.dir > 0 ? this.x + this.w : this.x - 22, y: this.y + 4, w: 22, h: 16 };
    return null;
  },

  recibirDano(cantidad, dirEmpuje) {
    if (this.invulnerable > 0) return false;
    this.vida = Math.max(0, this.vida - cantidad);
    this.invulnerable = 60; this.vx = dirEmpuje * 2.5; this.vy = -2.5; this.enSuelo = false;
    return true;
  },

  /* Dibuja al personaje con su apariencia (ver apariencia.js). Origen = pies, se voltea según la dirección. */
  dibujar(ctx, t) {
    ctx.save();
    ctx.translate(Math.round(this.x + this.w / 2), Math.round(this.y + this.h));
    ctx.scale(this.dir, 1);
    if (this.invulnerable > 0 && Math.floor(this.invulnerable / 4) % 2) ctx.globalAlpha = 0.4;
    Apariencia.dibujarPersonaje(ctx, this.apariencia, {
      lp: this.agachado ? 3 : 9, torso: this.agachado ? 6 : 10,
      paso: Math.round(Math.sin(this.animT) * (this.estado === 'correr' ? 3 : 2)),
      enSuelo: this.enSuelo, agachado: this.agachado, quieto: this.estado === 'quieto', t: t || 0,
      ataqueProg: this.ataque > 0 ? 1 - this.ataque / 18 : null
    });
    ctx.restore();
  }
};