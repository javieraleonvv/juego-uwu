/* =====================================================================
   combate.js - Proyectiles, rayos, explosiones y números de daño.
   Sirve para el jugador (de:'jugador') y para los enemigos (de:'enemigo').
   ===================================================================== */
'use strict';

const Combate = {
  proy: [], rayos: [], expl: [], textos: [],
  reiniciar() { this.proy = []; this.rayos = []; this.expl = []; this.textos = []; },
  texto(x, y, txt, c) { this.textos.push({ x, y, txt, c: c || '#fff', t: 0 }); },
  ruido(x, radio) { Enemigos.ruido(x, radio); },
  solido(x, y) { return Mundo.solidos.some(s => x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h); },

  /* Crea los proyectiles o el rayo de un arma */
  disparar(a, x, y, ang, de) {
    if (a.tipo === 'rayo') return this.rayo(a, x, y, ang);
    const n = a.perdigones || 1, mult = de === 'jugador' ? Campana.multDano() : 1;   // mejoras de nivel del jugador
    for (let i = 0; i < n; i++) {
      const an = ang + (n > 1 ? (Math.random() - 0.5) * 2 * a.dispersion : (Math.random() - 0.5) * (a.imprecision || 0));
      this.proy.push({ x, y, vx: Math.cos(an) * a.vel, vy: Math.sin(an) * a.vel, vida: a.vida, dano: a.dano * mult, de,
        color: a.color, grande: !!a.grande, perfora: a.perfora || 0, grav: a.grav || 0, expl: a.explosivo ? { radio: a.explosivo.radio, dano: a.explosivo.dano * mult } : null,
        aturde: a.aturde || 0, golpeados: [] });
    }
  },

  /* Disparo instantáneo: avanza por la línea hasta chocar con el escenario o agotar el alcance */
  rayo(a, x, y, ang) {
    const dx = Math.cos(ang) * 4, dy = Math.sin(ang) * 4, golpeados = [];
    let px = x, py = y;
    for (let i = 0; i < a.alcance / 4; i++) {
      px += dx; py += dy;
      if (this.solido(px, py)) break;
      for (const e of Enemigos.lista) {
        if (e.estado === 'muerte' || golpeados.includes(e) || !Enemigos.toca(e, px, py)) continue;
        golpeados.push(e); Enemigos.herir(e, a.dano * Campana.multDano(), Math.sign(dx), 0); this.impacto({ x: px, y: py, color: a.color });
      }
      if (golpeados.length > (a.perfora || 0)) break;
    }
    this.rayos.push({ x1: x, y1: y, x2: px, y2: py, t: 6, color: a.color, grueso: a.dano > 30 });
  },

  impacto(p) {
    Ambiente.chispas(p.x, p.y, p.color, 5);
    if (p.expl) this.explosion(p.x, p.y, p.expl);
  },

  explosion(x, y, e) {
    this.expl.push({ x, y, t: 0, r: e.radio });
    for (const en of Enemigos.lista) {
      if (en.estado === 'muerte') continue;
      const d = Math.hypot(en.x + en.w / 2 - x, en.y + en.h / 2 - y);
      if (d < e.radio) Enemigos.herir(en, Math.round(e.dano * (1 - d / e.radio * 0.5)), Math.sign(en.x - x) || 1, 20);
    }
    const J = Jugador, d = Math.hypot(J.x + J.w / 2 - x, J.y + J.h / 2 - y);
    if (d < e.radio) Juego.herirJugador(Math.round(e.dano * 0.4), Math.sign(J.x - x) || 1);   // la explosión también te daña
    Ambiente.chispas(x, y, '#ff9a3b', 24); Juego.sacudida = 9;
  },

  actualizar(J) {
    const caja = Arsenal.d && Arsenal.arma().refleja ? J.cajaAtaque() : null;   // la katana refleja disparos
    for (const p of this.proy) {
      if (caja && p.de === 'enemigo' && p.x > caja.x && p.x < caja.x + caja.w && p.y > caja.y && p.y < caja.y + caja.h) {
        p.de = 'jugador'; p.vx *= -1.4; p.vy *= -1.4; p.dano *= 2; p.golpeados = []; p.color = '#9aff3b';
        Ambiente.chispas(p.x, p.y, '#9aff3b', 6); this.texto(p.x, p.y - 8, 'REFLEJO', '#9aff3b'); continue;
      }
      p.x += p.vx; p.y += p.vy; p.vy += p.grav; p.vida--;
      if (this.solido(p.x, p.y) || p.vida <= 0) { this.impacto(p); p.muerto = true; continue; }
      if (p.de === 'jugador') {
        for (const e of Enemigos.lista) {
          if (e.estado === 'muerte' || p.golpeados.includes(e) || !Enemigos.toca(e, p.x, p.y)) continue;
          p.golpeados.push(e); Enemigos.herir(e, p.dano, Math.sign(p.vx), p.aturde); this.impacto(p);
          if (p.expl || p.perfora-- <= 0) { p.muerto = true; break; }
        }
      } else if (p.x > J.x && p.x < J.x + J.w && p.y > J.y && p.y < J.y + J.h) {
        if (Juego.herirJugador(p.dano, Math.sign(p.vx))) { this.impacto(p); p.muerto = true; }
      }
    }
    this.proy = this.proy.filter(p => !p.muerto);
    this.rayos.forEach(r => r.t--); this.rayos = this.rayos.filter(r => r.t > 0);
    this.expl.forEach(e => e.t++); this.expl = this.expl.filter(e => e.t < 18);
    this.textos.forEach(t => t.t++); this.textos = this.textos.filter(t => t.t < 40);
  },

  dibujar(ctx) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of this.proy) {
      ctx.fillStyle = p.color; ctx.strokeStyle = p.color;
      if (p.grande) { ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, 7); ctx.fill(); }
      else { ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(p.x - p.vx * 1.6, p.y - p.vy * 1.6); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.globalAlpha = 1; }
      ctx.fillStyle = '#fff'; ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    }
    for (const r of this.rayos) {
      ctx.globalAlpha = r.t / 6; ctx.strokeStyle = r.color; ctx.lineWidth = r.grueso ? 4 : 2;
      ctx.beginPath(); ctx.moveTo(r.x1, r.y1); ctx.lineTo(r.x2, r.y2); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
    }
    for (const e of this.expl) {
      const k = e.t / 18; ctx.globalAlpha = 1 - k; ctx.fillStyle = 'rgba(255,154,59,.6)';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (0.3 + k * 0.7), 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore(); ctx.lineWidth = 1;
    ctx.font = '7px "Share Tech Mono", monospace'; ctx.textAlign = 'center';
    for (const t of this.textos) { ctx.globalAlpha = 1 - t.t / 40; ctx.fillStyle = t.c; ctx.fillText(t.txt, t.x, t.y - t.t * 0.4); }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }
};