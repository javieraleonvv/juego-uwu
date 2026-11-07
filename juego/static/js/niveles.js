/* =====================================================================
   niveles.js - Campaña de 6 niveles y progresión del jugador
   - CAMPANA: lista de niveles (los que aún no existen se marcan solos)
   - NIVELES: datos de cada nivel; cada nivel se registra aquí con NIVELES[n] = {...}
   - Campana: nivel actual, desbloqueos, experiencia y mejoras (se guarda en partida.campana)
   CONVENCIÓN: los ids de enemigos, objetos y documentos de los niveles 2..6
   llevan prefijo (n3_e1, n3_doc1...) para no chocar con los del nivel 1.
   ===================================================================== */
'use strict';

const CAMPANA = [
  { id: 1, titulo: 'Los restos de la ciudad' }, { id: 2, titulo: 'RAZOR-09' },
  { id: 3, titulo: 'Distrito de los millonarios' }, { id: 4, titulo: 'La capital del control' },
  { id: 5, titulo: 'El orden mundial' }, { id: 6, titulo: 'Protocolo Zero' }
];
const NIVELES = {};

const Campana = {
  c: null,
  XP: { soldado: 20, mercenario: 30, robot: 40, mutante: 25, dron: 15 },   // experiencia por enemigo

  iniciar(p) {
    const c = p.campana = p.campana || {};
    c.nivel = Math.max(1, Math.min(CAMPANA.length, (c.nivel | 0) || 1));
    c.desbloqueados = c.desbloqueados || [1]; c.completados = c.completados || []; c.xp = Math.max(0, c.xp | 0);
    this.c = c;
  },
  /* Nivel del jugador según la experiencia total: cada nivel pide 80 x nivel de XP */
  nivelJugador() {
    let lvl = 1, resto = this.c ? this.c.xp : 0;
    while (resto >= 80 * lvl) { resto -= 80 * lvl; lvl++; }
    return { lvl, resto, necesita: 80 * lvl };
  },
  /* Cada nivel de jugador da: +10 salud máxima, +4% daño, +2% velocidad */
  multDano() { return 1 + 0.04 * (this.nivelJugador().lvl - 1); },
  multVel() { return Math.min(1.2, 1 + 0.02 * (this.nivelJugador().lvl - 1)); },
  aplicar() { Jugador.vidaMax = 100 + 10 * (this.nivelJugador().lvl - 1); },

  dar(n) {
    const antes = this.nivelJugador().lvl; this.c.xp += n;
    Combate.texto(Jugador.x + 6, Jugador.y - 10, '+' + n + ' XP', '#a56bff');
    const ahora = this.nivelJugador().lvl;
    if (ahora > antes) {
      this.aplicar(); Jugador.vida = Math.min(Jugador.vidaMax, Jugador.vida + 25);
      Juego.mostrarMensaje(['SUBES AL NIVEL ' + ahora, '+10 salud máx · +4% daño · +2% velocidad'], 240);
    }
  },

  /* Fin de nivel: recompensa, desbloqueo del siguiente, guardado automático y resumen */
  completarNivel() {
    const p = partidaActual, c = this.c, n = Mundo.id, sig = n + 1;
    if (!c.completados.includes(n)) { c.completados.push(n); this.dar(150 * n); }
    if (sig <= CAMPANA.length && !c.desbloqueados.includes(sig)) c.desbloqueados.push(sig);
    Juego.guardarProgreso();
    const muertos = p.enemigosMuertos.filter(id => Mundo.enemigos.some(e => e.id === id)).length, s = Math.floor(Juego.t / 60);
    const nj = this.nivelJugador();
    Juego.mostrarResumen('NIVEL ' + n + ' COMPLETADO', [
      'Hostiles eliminados: ' + muertos + ' / ' + Mundo.enemigos.length,
      'Documentos leídos: ' + p.documentos.length + '   Objetos recogidos: ' + p.objetosRecogidos.length,
      'Tiempo de esta sesión: ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'),
      'Nivel de jugador: ' + nj.lvl + '  (' + nj.resto + ' / ' + nj.necesita + ' XP)',
      sig <= CAMPANA.length ? 'Desbloqueado: Nivel ' + sig + ' — ' + CAMPANA[sig - 1].titulo : 'Campaña completada',
      'Partida guardada automáticamente.'
    ], sig <= CAMPANA.length ? { id: sig, titulo: CAMPANA[sig - 1].titulo, listo: !!NIVELES[sig] } : null);
  },

  irANivel(n) {
    const p = partidaActual;
    if (!NIVELES[n] || !this.c.desbloqueados.includes(n)) return;
    this.c.nivel = n; p.jugador = { x: 0, y: 0 }; delete p.puntoSeguro;
    Juego.cerrarResumen(); Juego.detener(); Juego.iniciar();
  }
};