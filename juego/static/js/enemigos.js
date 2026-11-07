/* =====================================================================
   enemigos.js - 5 tipos de enemigo, su IA y su dibujo.
   Estados: patrulla -> persecucion (los ve u oye) -> regreso (los pierde) -> patrulla
            muerte (animación y desaparece)
   ===================================================================== */
'use strict';

const TIPOS = {
  soldado: { n: 'Soldado corporativo', hp: 40, w: 12, h: 26, vel: 0.8, det: 190, pref: 110, rango: 150, cd: 80, rafaga: 3,
    arma: { dano: 7, vel: 5, vida: 50, color: '#ff9a3b' } },
  mercenario: { n: 'Mercenario cibernético', hp: 60, w: 12, h: 26, vel: 1.2, det: 210, pref: 70, rango: 110, cd: 60, rafaga: 2, esquiva: true,
    arma: { dano: 9, vel: 5.5, vida: 40, color: '#ff3b4e' } },
  robot: { n: 'Robot de combate', hp: 90, w: 16, h: 28, vel: 0.55, det: 170, pref: 20, rango: 24, cd: 70, melee: 16, escudo: 0.5 },
  mutante: { n: 'Mutante', hp: 55, w: 14, h: 22, vel: 1.5, det: 160, pref: 8, rango: 22, cd: 45, melee: 14, salta: true },
  dron: { n: 'Dron armado', hp: 25, w: 12, h: 8, vel: 1.1, det: 210, pref: 90, rango: 170, cd: 60, vuela: true,
    arma: { dano: 6, vel: 4.5, vida: 60, color: '#ff3b4e' } }
};

const Enemigos = {
  lista: [],

  iniciar(defs, muertos) {
    this.lista = defs.filter(d => !muertos.includes(d.id)).map(d => {
      const T = TIPOS[d.tipo];
      return { id: d.id, tipo: d.tipo, T, x: d.x, y: d.y != null ? d.y : Mundo.suelo - T.h, y0: d.y, w: T.w, h: T.h, vx: 0, vy: 0,
        dir: 1, hp: T.hp, hpMax: T.hp, estado: 'patrulla', pat: d.pat, home: d.x, t: (Math.random() * 100) | 0, cd: 60, atk: 0,
        flash: 0, stun: 0, perdido: 0, alerta: 0, rafaga: 0, sig: 0, esq: 0, cdEsq: 0, suelo: false, knock: 0, hitOk: false };
    });
  },
  vivos() { return this.lista.filter(e => e.estado !== 'muerte').length; },
  toca(e, x, y) { return x > e.x && x < e.x + e.w && y > e.y && y < e.y + e.h; },
  choca(e) { return Mundo.solidos.find(s => e.x < s.x + s.w && e.x + e.w > s.x && e.y < s.y + s.h && e.y + e.h > s.y); },

  /* ¿Hay línea de visión libre hasta el jugador? (las coberturas y paredes la bloquean) */
  linea(e, J) {
    const x1 = e.x + e.w / 2, y1 = e.y + e.h / 2, x2 = J.x + J.w / 2, y2 = J.y + J.h / 2, n = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 8);
    for (let i = 1; i < n; i++) if (Combate.solido(x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n)) return false;
    return true;
  },
  ruido(x, radio) {
    for (const e of this.lista) if (e.estado === 'patrulla' && Math.abs(e.x - x) < radio) { e.estado = 'persecucion'; e.alerta = 40; e.cd = Math.max(e.cd, 30); }
  },

  herir(e, dano, dirX, aturde) {
    if (e.estado === 'muerte') return;
    dano = Math.round(dano);
    if (e.esq > 0) { Combate.texto(e.x + e.w / 2, e.y - 8, 'ESQUIVA', '#9ff0ff'); return; }
    if (e.T.escudo && dirX === -e.dir) { dano = Math.round(dano * e.T.escudo); Ambiente.chispas(e.x + (e.dir > 0 ? e.w : 0), e.y + 10, '#9a9ab0', 3); }
    e.hp -= dano; e.flash = 6; e.knock = dirX * 1.2; if (aturde) e.stun = aturde;
    if (e.estado !== 'persecucion') { e.estado = 'persecucion'; e.alerta = 40; }
    Combate.texto(e.x + e.w / 2, e.y - 8, '-' + dano, '#ffd23b');
    if (e.hp <= 0) { e.hp = 0; e.estado = 'muerte'; e.t = 0; e.vy = -2; Ambiente.chispas(e.x + e.w / 2, e.y + e.h / 2, '#ff9a3b', 14); this.soltar(e); Juego.alMorirEnemigo(e); }
  },

  /* Recompensa al morir: munición de un arma que tengas, o a veces salud */
  soltar(e) {
    const r = Math.random(), x = e.x + e.w / 2, y = Math.min(e.y + e.h, Mundo.suelo);
    if (r < 0.45) { const tipos = Arsenal.tiposQueTengo(); if (tipos.length) Mundo.objetos.push({ t: 'muni', id: 'd' + Math.random(), temp: true, x, y,
      tipo: tipos[(Math.random() * tipos.length) | 0], n: 8 }); }
    else if (r < 0.62) Mundo.objetos.push({ t: 'cura', id: 'd' + Math.random(), temp: true, x, y, n: 25 });
  },

  mover(e) {
    e.bloqueado = false; if (e.knock) { e.vx += e.knock; e.knock = 0; }
    e.x += e.vx; let s = this.choca(e);
    if (s) { e.x = e.vx > 0 ? s.x - e.w : s.x + s.w; e.vx = 0; e.bloqueado = true; }
    if (!e.T.vuela || e.estado === 'muerte') e.vy = Math.min(e.vy + 0.28, 7);
    e.y += e.vy; e.suelo = false; s = this.choca(e);
    if (s) { if (e.vy > 0) { e.y = s.y - e.h; e.suelo = true; } else e.y = s.y + s.h; e.vy = 0; }
    e.x = Math.max(0, Math.min(Mundo.ancho - e.w, e.x));
  },

  /* Comportamiento al perseguir: devuelve la velocidad horizontal deseada */
  perseguir(e, J, dx, dy, dist, ve) {
    const T = e.T, ex = e.x + e.w / 2; let v = 0;
    if (dist > T.pref + 12) v = e.dir * T.vel; else if (dist < T.pref - 25 && !T.melee) v = -e.dir * T.vel * 0.8;   // mantiene la distancia
    if (T.salta && dist < 100) v = e.dir * T.vel * 1.8;                                                           // embiste
    if (T.salta && e.suelo && dy < -30 && dist < 70) e.vy = -5.5;
    if (T.esquiva && e.cdEsq <= 0 && e.suelo)                                                                     // esquiva disparos
      for (const p of Combate.proy) if (p.de === 'jugador' && Math.abs(p.x - ex) < 55 && Math.abs(p.y - (e.y + e.h / 2)) < 16 && Math.sign(p.vx) === -e.dir) { e.esq = 14; e.cdEsq = 100; break; }
    if (ve && e.cd <= 0) {
      if (T.melee) { if (dist <= T.rango && Math.abs(dy) < 26) { e.atk = 16; e.cd = T.cd; e.hitOk = true; } }
      else if (dist <= T.rango) { e.rafaga = T.rafaga || 1; e.sig = 0; e.cd = T.cd; }
    }
    if (T.melee && e.atk === 8 && e.hitOk) { e.hitOk = false; if (dist <= T.rango + 8 && Math.abs(dy) < 28) Juego.herirJugador(T.melee, e.dir); }
    if (e.rafaga > 0 && --e.sig <= 0) {
      const ang = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.12;
      Combate.disparar(T.arma, ex + e.dir * 10, e.y + (T.vuela ? 6 : 10), ang, 'enemigo');
      e.atk = 8; e.sig = 9; e.rafaga--;
    }
    return v;
  },

  actualizar(J) {
    const cx = J.x + J.w / 2, cy = J.y + J.h / 2;
    for (const e of this.lista) {
      const T = e.T; e.t++;
      if (e.estado === 'muerte') { e.vx *= 0.9; this.mover(e); continue; }
      if (e.flash > 0) e.flash--; if (e.cd > 0) e.cd--; if (e.atk > 0) e.atk--; if (e.alerta > 0) e.alerta--; if (e.cdEsq > 0) e.cdEsq--;
      if (e.stun > 0) { e.stun--; e.vx *= 0.8; this.mover(e); continue; }                 // aturdido: no actúa
      const ex = e.x + e.w / 2, dx = cx - ex, dy = cy - (e.y + e.h / 2), dist = Math.abs(dx);
      const ve = dist < T.det && Math.abs(dy) < 80 && this.linea(e, J);
      let v = 0;
      if (e.estado === 'patrulla') {
        v = e.dir * T.vel * 0.5; if (e.x < e.pat[0]) e.dir = 1; if (e.x > e.pat[1]) e.dir = -1; if (e.bloqueado) e.dir *= -1;
        if (ve) { e.estado = 'persecucion'; e.alerta = 45; e.cd = Math.max(e.cd, 35); }
      } else if (e.estado === 'persecucion') {
        if (ve) e.perdido = 0; else if (++e.perdido > 160) e.estado = 'regreso';
        e.dir = dx >= 0 ? 1 : -1; v = this.perseguir(e, J, dx, dy, dist, ve);
      } else {                                                                              // regreso a su zona
        const h = e.home - ex; e.dir = h >= 0 ? 1 : -1; v = e.dir * T.vel * 0.6;
        if (Math.abs(h) < 6) e.estado = 'patrulla';
        if (ve) { e.estado = 'persecucion'; e.alerta = 45; }
      }
      if (e.esq > 0) { e.esq--; v = -e.dir * 3.6; }                                         // esquiva: dash hacia atrás
      if (T.vuela) { const ty = e.estado === 'persecucion' ? J.y - 50 + Math.sin(e.t * 0.05) * 10 : e.y0; e.vy = Math.max(-1.5, Math.min(1.5, (ty - e.y) * 0.05)); }
      e.vx += (v - e.vx) * (e.esq > 0 ? 0.5 : 0.2);
      this.mover(e);
    }
    this.lista = this.lista.filter(e => !(e.estado === 'muerte' && e.t > 50));
  },

  dibujar(ctx, t) {
    for (const e of this.lista) {
      if (!Mundo.visible(e.x, e.w, Juego.cam.x)) continue;
      const muerto = e.estado === 'muerte', w = !muerto && Math.abs(e.vx) > 0.2 ? Math.round(Math.sin(e.t * 0.3) * 2) : 0, a = e.atk > 0;
      const r = (x, y, ww, hh, c) => { ctx.fillStyle = e.flash > 0 ? '#fff' : c; ctx.fillRect(x, y, ww, hh); };
      ctx.save(); ctx.translate(Math.round(e.x + e.w / 2), Math.round(e.y + e.h)); ctx.scale(e.dir, 1);
      if (muerto) { ctx.rotate(-Math.min(1, e.t / 16) * 1.45); ctx.globalAlpha = e.t > 25 ? Math.max(0, 1 - (e.t - 25) / 25) : 1; }
      if (e.esq > 0) ctx.globalAlpha = 0.45;
      if (e.tipo === 'soldado') {
        r(-4 + w, -8, 3, 8, '#1b1630'); r(1 - w, -8, 3, 8, '#1b1630'); r(-5, -19, 10, 11, '#2e4f7a'); r(-5, -14, 10, 1, '#21d4ff');
        r(-3, -26, 7, 7, '#1b1630'); r(1, -24, 3, 2, '#21d4ff'); r(3, -16, a ? 12 : 10, 2, '#9a9ab0'); if (a) r(14, -17, 3, 3, '#ffd23b');
      } else if (e.tipo === 'mercenario') {
        r(-4 + w, -8, 3, 8, '#2a1f3a'); r(1 - w, -8, 3, 8, '#2a1f3a'); r(-5, -19, 10, 11, '#2a1f3a'); r(-5, -12, 10, 1, '#ff3b4e');
        r(-3, -26, 7, 7, '#d9a88a'); r(1, -23, 3, 2, '#ff3b4e'); r(-3, -27, 7, 2, '#120d22'); r(3, -18, 3, 9, '#9a9ab0');
        r(6, -15, a ? 8 : 6, 2, '#9a9ab0'); if (a) r(14, -16, 3, 3, '#ffd23b');
      } else if (e.tipo === 'robot') {
        r(-6 + w, -9, 5, 9, '#3a3a52'); r(1 - w, -9, 5, 9, '#3a3a52'); r(-8, -24, 16, 15, '#4a4a66'); r(-5, -28, 10, 5, '#3a3a52');
        r(1, -26, 4, 2, '#ff3b4e'); r(8, -24, 2, 14, '#9a9ab0'); r(7, -20, a && e.atk > 8 ? 14 : 5, 5, '#7a7a98');
      } else if (e.tipo === 'mutante') {
        r(-5 + w, -7, 4, 7, '#3a4a26'); r(1 - w, -7, 4, 7, '#3a4a26'); r(-6, -17, 12, 10, '#55602e'); r(0, -22, 7, 6, '#6a7a3a');
        r(4, -20, 2, 2, '#ff2e9a'); r(4, -14, 8, 3, '#6a7a3a'); if (a) r(11, -15, 6, 2, '#d9d2ee');
      } else {
        const yb = Math.round(Math.sin(e.t * 0.2));
        r(-6, -8 + yb, 12, 5, '#3a3a52'); r(2, -7 + yb, 3, 2, '#ff3b4e'); r(-2, -3 + yb, 3, 3, '#9a9ab0');
        if (e.t % 4 < 2) r(-8, -10 + yb, 16, 1, 'rgba(255,255,255,.5)');
      }
      ctx.restore();
      if (muerto) continue;
      const bx = Math.round(e.x + e.w / 2 - 9), by = Math.round(e.y - 6);                  // barra de vida
      ctx.fillStyle = '#120d22'; ctx.fillRect(bx, by, 18, 3);
      ctx.fillStyle = e.hp / e.hpMax > 0.35 ? '#ff3b4e' : '#ffd23b'; ctx.fillRect(bx + 1, by + 1, Math.round(16 * e.hp / e.hpMax), 1);
      if (e.alerta > 0) { ctx.fillStyle = '#ff3b4e'; ctx.fillRect(bx + 9, by - 8, 1, 4); ctx.fillRect(bx + 9, by - 3, 1, 1); }   // "!"
    }
  }
};