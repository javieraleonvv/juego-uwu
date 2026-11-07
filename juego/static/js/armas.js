/* =====================================================================
   armas.js - Datos de las armas y estado del arsenal del jugador.
   'tipo' decide cómo funciona cada arma:
     proy  -> proyectil físico (velocidad, gravedad, explosión, perforación...)
     rayo  -> disparo instantáneo con línea de luz (puede atravesar enemigos)
     melee -> cuerpo a cuerpo (la katana además refleja proyectiles)
   'spr' = piezas del sprite provisional, dibujadas a lo largo del brazo.
   ===================================================================== */
'use strict';

const ARMAS = {
  tubo: { n: 'Tubo de metal', tipo: 'melee', dano: 10, dur: 18, alc: 22, color: '#9a9ab0',
          spr: [[-1, 5, 2, 14, '#9a9ab0']] },
  // ---- Armas iniciales ----
  pistola_electrica: { n: 'Pistola eléctrica', tipo: 'proy', dano: 8, cadencia: 18, vel: 7, vida: 45, mag: 12, recarga: 70,
    muni: 'bateria', color: '#21d4ff', aturde: 30, imprecision: 0.04, retro: 0.3,
    spr: [[-1, 4, 3, 3, '#2a2442'], [-1, 7, 2, 5, '#21d4ff'], [0, 6, 1, 1, '#ffffff']] },
  pistola_plasma: { n: 'Pistola de plasma', tipo: 'proy', dano: 16, cadencia: 28, vel: 4, vida: 60, mag: 8, recarga: 90,
    muni: 'plasma', color: '#ff2e9a', grande: true, retro: 0.6,
    spr: [[-1, 4, 3, 4, '#3a1a4a'], [-1, 8, 3, 5, '#ff2e9a']] },
  rifle_laser: { n: 'Rifle láser', tipo: 'rayo', dano: 7, cadencia: 8, alcance: 220, mag: 30, recarga: 100, auto: true,
    muni: 'laser', color: '#ff3b4e', perfora: 1, retro: 0.2,
    spr: [[-1, 3, 3, 5, '#2a2442'], [-1, 8, 3, 2, '#9a9ab0'], [0, 10, 1, 11, '#ff3b4e']] },
  escopeta: { n: 'Escopeta tecnológica', tipo: 'proy', dano: 6, perdigones: 6, dispersion: 0.3, cadencia: 46, vel: 6, vida: 16,
    mag: 6, recarga: 110, muni: 'cartuchos', color: '#ffd23b', retro: 2.4,
    spr: [[-1, 3, 3, 4, '#5a3a2a'], [-1, 7, 3, 3, '#2a2442'], [-1, 10, 2, 10, '#9a9ab0']] },
  katana: { n: 'Katana de energía', tipo: 'melee', dano: 22, dur: 22, alc: 30, refleja: true, color: '#9aff3b',
    spr: [[-1, 4, 3, 2, '#2a2442'], [-2, 6, 5, 1, '#9aff3b'], [0, 7, 1, 15, '#d9ffd0']] },
  // ---- Armas especiales (secretos y recompensas) ----
  rifle_em: { n: 'Rifle electromagnético', tipo: 'rayo', dano: 42, cadencia: 70, alcance: 480, mag: 4, recarga: 130,
    muni: 'laser', color: '#9ff0ff', perfora: 99, retro: 1.6,
    spr: [[-1, 3, 3, 5, '#1b1630'], [-2, 8, 5, 2, '#9ff0ff'], [0, 10, 1, 14, '#9a9ab0']] },
  lanzador: { n: 'Lanzador explosivo', tipo: 'proy', dano: 10, explosivo: { radio: 34, dano: 32 }, grav: 0.12, vel: 3.8, vida: 90,
    cadencia: 60, mag: 4, recarga: 120, muni: 'granadas', color: '#ff9a3b', grande: true, retro: 1.8,
    spr: [[-2, 3, 4, 5, '#55602e'], [-2, 8, 4, 8, '#ff9a3b']] },
  pulsos: { n: 'Arma de pulsos', tipo: 'proy', dano: 9, rafaga: 3, cadencia: 40, vel: 6, vida: 40, mag: 18, recarga: 100,
    muni: 'bateria', color: '#a56bff', imprecision: 0.06, retro: 0.4,
    spr: [[-1, 4, 3, 4, '#2a2442'], [-2, 8, 4, 6, '#7b2fff']] },
  canon: { n: 'Cañón de energía', tipo: 'proy', dano: 55, perfora: 99, cadencia: 90, vel: 2.6, vida: 120, mag: 3, recarga: 150,
    muni: 'plasma', color: '#ff2e9a', grande: true, retro: 2.6,
    spr: [[-2, 3, 4, 6, '#3a1a4a'], [-2, 9, 4, 10, '#ff2e9a'], [-1, 19, 2, 2, '#ffffff']] }
};
Object.values(ARMAS).forEach(a => { a.largo = Math.max(...a.spr.map(s => s[1] + s[3])); });

const MUNICION = {
  bateria: { n: 'Baterías', c: '#21d4ff' }, plasma: { n: 'Plasma', c: '#ff2e9a' }, laser: { n: 'Cargas láser', c: '#ff3b4e' },
  cartuchos: { n: 'Cartuchos', c: '#ffd23b' }, granadas: { n: 'Granadas', c: '#ff9a3b' }
};

/* Arsenal: armas que tienes, cargadores y reserva. Vive dentro de la partida (se guarda). */
const Arsenal = {
  d: null, cd: 0, recarga: 0, flash: 0, retro: 0, vacio: 0, cola: [],

  iniciar(p) {
    const a = p.arsenal = p.arsenal || { armas: ['pistola_electrica'], actual: 'pistola_electrica',
      cargador: { pistola_electrica: 12 }, municion: { bateria: 24 } };
    a.armas = (a.armas || []).filter(id => ARMAS[id] && id !== 'tubo');
    if (!a.armas.length) a.armas = ['pistola_electrica'];
    if (!a.armas.includes(a.actual)) a.actual = a.armas[0];
    a.cargador = a.cargador || {};
    a.municion = Object.assign({ bateria: 0, plasma: 0, laser: 0, cartuchos: 0, granadas: 0 }, a.municion);
    this.d = a; this.cd = this.recarga = this.flash = this.retro = this.vacio = 0; this.cola = [];
  },
  arma() { return ARMAS[this.d.actual]; },
  esMelee() { return this.arma().tipo === 'melee'; },
  cargador() { return this.d.cargador[this.d.actual] || 0; },
  reserva() { const a = this.arma(); return a.muni ? this.d.municion[a.muni] : 0; },
  tiposQueTengo() { return [...new Set(this.d.armas.map(id => ARMAS[id].muni).filter(Boolean))]; },

  cambiar() {
    const l = this.d.armas; if (l.length < 2) return;
    this.d.actual = l[(l.indexOf(this.d.actual) + 1) % l.length];
    this.recarga = 0; this.cola = []; this.cd = 10;
    Juego.mostrarMensaje(['Arma: ' + this.arma().n], 70);
  },
  recargar() {
    const a = this.arma();
    if (a.tipo === 'melee' || this.recarga > 0 || this.cargador() >= a.mag || this.reserva() <= 0) return;
    this.recarga = a.recarga;
  },
  darArma(id) {                                           // true si es un arma nueva
    const a = ARMAS[id];
    if (this.d.armas.includes(id)) { if (a.muni) this.d.municion[a.muni] += a.mag; return false; }
    this.d.armas.push(id); if (a.mag) this.d.cargador[id] = a.mag; return true;
  },
  darMunicion(tipo, n) { this.d.municion[tipo] = (this.d.municion[tipo] || 0) + n; },

  muzzle(J, ang) {                                        // boca del arma
    const l = this.arma().largo;
    return { x: J.x + J.w / 2 + J.dir * 3 + Math.cos(ang) * l, y: J.y + 9 + Math.sin(ang) * l };
  },

  actualizar(J, ang, mantiene, pulsa) {
    if (this.cd > 0) this.cd--; if (this.flash > 0) this.flash--; if (this.retro > 0) this.retro--; if (this.vacio > 0) this.vacio--;
    const a = this.arma();
    this.cola = this.cola.filter(b => { if (--b.t > 0) return true; if (this.cargador() > 0) this.tiro(J, ang); return false; });
    if (this.recarga > 0) {                               // recargando: no se puede disparar
      if (--this.recarga === 0) { const n = Math.min(a.mag - this.cargador(), this.reserva());
        this.d.cargador[this.d.actual] = this.cargador() + n; this.d.municion[a.muni] -= n; }
      return;
    }
    if (a.tipo === 'melee') return;
    if ((a.auto ? mantiene : pulsa) && this.cd <= 0) {
      if (this.cargador() <= 0) { this.cd = 14; this.vacio = 20; this.recargar(); }   // sin munición: intenta recargar
      else {
        this.cd = a.cadencia; this.tiro(J, ang);
        for (let i = 1; i < (a.rafaga || 1); i++) this.cola.push({ t: 5 * i });
      }
    }
  },
  tiro(J, ang) {
    const a = this.arma(), m = this.muzzle(J, ang);
    this.d.cargador[this.d.actual]--; this.flash = 4; this.retro = 4;
    Combate.disparar(a, m.x, m.y, ang, 'jugador');
    J.vx -= Math.cos(ang) * (a.retro || 0) * 0.5;         // retroceso del arma
    Juego.sacudida = Math.max(Juego.sacudida, a.retro ? a.retro * 1.2 : 0.8);
    Combate.ruido(J.x, 240);                              // los enemigos oyen los disparos
  }
};