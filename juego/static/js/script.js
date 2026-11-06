/* =====================================================================
   CYBER//WASTELAND - script.js (ETAPA 1)
   Secciones:
   1. CONFIG        -> constantes del juego
   2. Ajustes       -> opciones del jugador (LocalStorage)
   3. Guardado      -> guardar / cargar partida (LocalStorage)
   4. Pantallas     -> cambio entre menú, config, créditos, juego
   5. Fondo         -> animación de Canvas (skyline, lluvia, niebla)
   6. Menú          -> botones y navegación con teclado
   Las siguientes etapas añadirán sus propios bloques aquí o en archivos nuevos.
   ===================================================================== */
'use strict';

/* ---------- 1. CONFIG ---------- */
const CONFIG = {
  claveGuardado: 'cyberwasteland_partida_v1',
  claveAjustes: 'cyberwasteland_ajustes_v1',
  version: 1
};

/* ---------- 2. AJUSTES ---------- */
const Ajustes = {
  valores: { lluvia: 70, volumen: 60, crt: true },

  cargar() {
    try {
      const guardado = JSON.parse(localStorage.getItem(CONFIG.claveAjustes));
      if (guardado) Object.assign(this.valores, guardado);
    } catch (e) { /* si está corrupto, usamos los valores por defecto */ }
  },
  guardar() {
    localStorage.setItem(CONFIG.claveAjustes, JSON.stringify(this.valores));
  },
  aplicar() {
    document.body.classList.toggle('sin-crt', !this.valores.crt);
  }
};

/* ---------- 3. GUARDADO ---------- */
/* Esta estructura crecerá en cada etapa (stats, inventario, misiones...). */
const Guardado = {
  estadoNuevo() {
    return {
      version: CONFIG.version,
      fecha: new Date().toISOString(),
      jugador: { x: 0, y: 0 },
      estadisticas: {},   // Etapa 4
      inventario: [],     // Etapa 5
      misiones: {},       // Etapa 9
      decisiones: {}      // Etapa 9
    };
  },
  existe() { return localStorage.getItem(CONFIG.claveGuardado) !== null; },
  leer() {
    try { return JSON.parse(localStorage.getItem(CONFIG.claveGuardado)); }
    catch (e) { return null; }
  },
  escribir(estado) {
    estado.fecha = new Date().toISOString();
    localStorage.setItem(CONFIG.claveGuardado, JSON.stringify(estado));
  },
  borrar() { localStorage.removeItem(CONFIG.claveGuardado); }
};

/* Partida en memoria. Las futuras etapas leerán y modificarán este objeto. */
let partidaActual = null;

/* ---------- 4. PANTALLAS ---------- */
const Pantallas = {
  actual: 'menu',
  mostrar(nombre) {
    document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
    document.getElementById('pantalla-' + nombre).classList.add('activa');
    this.actual = nombre;
    Menu.seleccionar(0);
  }
};

/* ---------- 5. FONDO (Canvas) ---------- */
const Fondo = {
  canvas: document.getElementById('fondo'),
  ctx: null, w: 0, h: 0,
  capas: [], gotas: [], tiempo: 0,
  colores: ['#ff2e9a', '#21d4ff', '#7b2fff', '#ff3b4e'],

  iniciar() {
    this.ctx = this.canvas.getContext('2d');
    window.addEventListener('resize', () => this.redimensionar());
    this.redimensionar();
    requestAnimationFrame(t => this.bucle(t));
  },

  redimensionar() {
    this.w = this.canvas.width = window.innerWidth;
    this.h = this.canvas.height = window.innerHeight;
    // 3 capas de edificios: lejana, media y cercana (efecto parallax)
    this.capas = [
      this.crearCapa(0.15, '#120d22', 40, 120, 0.2),
      this.crearCapa(0.35, '#0d0919', 60, 200, 0.45),
      this.crearCapa(0.7,  '#080510', 80, 300, 0.8)
    ];
    this.gotas = [];
    for (let i = 0; i < 220; i++) this.gotas.push(this.nuevaGota(true));
  },

  /* Genera una fila de edificios con ventanas de neón al azar */
  crearCapa(velocidad, color, anchoMin, altoMax, brillo) {
    const edificios = [];
    let x = 0;
    while (x < this.w * 2) {
      const ancho = anchoMin + Math.random() * 70;
      const alto = 80 + Math.random() * altoMax;
      const ventanas = [];
      for (let vy = 12; vy < alto - 8; vy += 14)
        for (let vx = 8; vx < ancho - 8; vx += 12)
          if (Math.random() < 0.18)
            ventanas.push({ x: vx, y: vy, c: this.colores[(Math.random() * 4) | 0], f: Math.random() * 6 });
      edificios.push({ x, ancho, alto, ventanas, antena: Math.random() < 0.3 });
      x += ancho + 4 + Math.random() * 14;
    }
    return { velocidad, color, brillo, edificios, ancho: x, desplazamiento: 0 };
  },

  nuevaGota(inicial) {
    return { x: Math.random() * this.w, y: inicial ? Math.random() * this.h : -20,
             largo: 8 + Math.random() * 14, v: 10 + Math.random() * 10 };
  },

  bucle(t) {
    this.tiempo = t / 1000;
    this.dibujar();
    requestAnimationFrame(tt => this.bucle(tt));
  },

  dibujar() {
    const { ctx, w, h } = this;
    // Cielo
    const cielo = ctx.createLinearGradient(0, 0, 0, h);
    cielo.addColorStop(0, '#07050d'); cielo.addColorStop(0.7, '#1c0f33'); cielo.addColorStop(1, '#3a0d46');
    ctx.fillStyle = cielo; ctx.fillRect(0, 0, w, h);

    // Edificios por capas
    this.capas.forEach(capa => {
      capa.desplazamiento = (capa.desplazamiento + capa.velocidad * 0.3) % capa.ancho;
      for (const copia of [0, 1]) {
        const base = -capa.desplazamiento + copia * capa.ancho;
        capa.edificios.forEach(e => {
          const ex = base + e.x;
          if (ex > w || ex + e.ancho < 0) return;
          const ey = h - e.alto;
          ctx.fillStyle = capa.color; ctx.fillRect(ex, ey, e.ancho, e.alto);
          // Borde de neón superior
          ctx.fillStyle = `rgba(255,46,154,${0.25 * capa.brillo})`; ctx.fillRect(ex, ey, e.ancho, 2);
          if (e.antena) { ctx.fillStyle = capa.color; ctx.fillRect(ex + e.ancho / 2, ey - 18, 2, 18); }
          // Ventanas encendidas con parpadeo ocasional
          e.ventanas.forEach(v => {
            const parpadeo = Math.sin(this.tiempo * 2 + v.f) > -0.9 ? 1 : 0.1;
            ctx.globalAlpha = capa.brillo * parpadeo;
            ctx.fillStyle = v.c; ctx.fillRect(ex + v.x, ey + v.y, 5, 7);
          });
          ctx.globalAlpha = 1;
        });
      }
    });

    // Cartel holográfico parpadeante
    const flick = Math.sin(this.tiempo * 17) > 0.85 ? 0.3 : 1;
    ctx.globalAlpha = 0.55 * flick; ctx.fillStyle = '#21d4ff';
    ctx.font = 'bold 22px "Orbitron", sans-serif';
    ctx.fillText('NEOCORP', w * 0.72, h * 0.28);
    ctx.font = '12px monospace'; ctx.fillText('SIN SEÑAL // SECTOR 7', w * 0.72, h * 0.28 + 18);
    ctx.globalAlpha = 1;

    // Niebla
    const niebla = ctx.createLinearGradient(0, h * 0.55, 0, h);
    niebla.addColorStop(0, 'rgba(123,47,255,0)'); niebla.addColorStop(1, 'rgba(123,47,255,.28)');
    ctx.fillStyle = niebla; ctx.fillRect(0, h * 0.55, w, h * 0.45);

    // Lluvia (cantidad según Configuración)
    const cantidad = Math.floor(this.gotas.length * Ajustes.valores.lluvia / 100);
    ctx.strokeStyle = 'rgba(150,200,255,.45)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < cantidad; i++) {
      const g = this.gotas[i];
      ctx.moveTo(g.x, g.y); ctx.lineTo(g.x - 2, g.y + g.largo);
      g.y += g.v; g.x -= 1;
      if (g.y > h) this.gotas[i] = this.nuevaGota(false);
    }
    ctx.stroke();
  }
};

/* ---------- 6. MENÚ ---------- */
const Menu = {
  indice: 0,

  botonesVisibles() {
    const pantalla = document.querySelector('.pantalla.activa');
    return [...pantalla.querySelectorAll('.menu button:not(:disabled)')];
  },
  seleccionar(i) {
    const botones = this.botonesVisibles();
    if (!botones.length) return;
    this.indice = (i + botones.length) % botones.length;
    document.querySelectorAll('.menu button.sel').forEach(b => b.classList.remove('sel'));
    botones[this.indice].classList.add('sel');
    botones[this.indice].focus({ preventScroll: true });
  },

  /* Acciones de cada botón (atributo data-accion en el HTML) */
  acciones: {
    nueva() {
      const hay = Guardado.existe();
      document.getElementById('texto-nueva').textContent = hay
        ? 'Ya existe una partida guardada. Si inicias una nueva, se sobrescribirá.'
        : 'Se creará una partida nueva y se guardará en este navegador.';
      Pantallas.mostrar('nueva');
    },
    continuar() {
      const datos = Guardado.leer();
      if (!datos) return Menu.actualizarEstado();
      partidaActual = datos;
      Pantallas.mostrar('juego');
    },
    iniciar() {
      partidaActual = Guardado.estadoNuevo();
      Guardado.escribir(partidaActual);
      Pantallas.mostrar('juego');
    },
    guardar() {
      if (partidaActual) Guardado.escribir(partidaActual);
      Menu.actualizarEstado();
    },
    config() { Pantallas.mostrar('config'); },
    creditos() { Pantallas.mostrar('creditos'); },
    borrar() {
      Guardado.borrar();
      Menu.actualizarEstado();
    },
    volver() { Menu.actualizarEstado(); Pantallas.mostrar('menu'); }
  },

  /* Activa/desactiva "Continuar" y muestra el estado del guardado */
  actualizarEstado() {
    const hay = Guardado.existe();
    const datos = hay ? Guardado.leer() : null;
    document.getElementById('btn-continuar').disabled = !hay;
    const estado = document.getElementById('estado-guardado');
    estado.classList.toggle('alerta', !hay);
    estado.textContent = datos
      ? '> Partida detectada: ' + new Date(datos.fecha).toLocaleString('es')
      : '> Sin partida guardada';
  },

  iniciar() {
    document.querySelectorAll('[data-accion]').forEach(boton =>
      boton.addEventListener('click', () => this.acciones[boton.dataset.accion]()));

    // Teclado: flechas/W/S para moverse, Enter para elegir, Esc para volver
    document.addEventListener('keydown', e => {
      if (e.target.matches('input')) { if (e.key !== 'Escape') return; }
      const k = e.key.toLowerCase();
      if (k === 'arrowdown' || k === 's') { e.preventDefault(); this.seleccionar(this.indice + 1); }
      else if (k === 'arrowup' || k === 'w') { e.preventDefault(); this.seleccionar(this.indice - 1); }
      else if (k === 'escape' && Pantallas.actual !== 'menu') this.acciones.volver();
    });
    // Enter/Espacio sobre el botón enfocado ya lo gestiona el navegador (click).
    this.actualizarEstado();
    this.seleccionar(0);
  }
};

/* ---------- Configuración: enlazar controles con Ajustes ---------- */
function iniciarConfiguracion() {
  const lluvia = document.getElementById('cfg-lluvia');
  const volumen = document.getElementById('cfg-volumen');
  const crt = document.getElementById('cfg-efectos');
  const salidaLluvia = document.getElementById('out-lluvia');
  const salidaVolumen = document.getElementById('out-volumen');

  lluvia.value = Ajustes.valores.lluvia;
  volumen.value = Ajustes.valores.volumen;
  crt.checked = Ajustes.valores.crt;
  const refrescar = () => {
    salidaLluvia.textContent = lluvia.value + '%';
    salidaVolumen.textContent = volumen.value + '%';
  };
  refrescar();

  const alCambiar = () => {
    Ajustes.valores = { lluvia: +lluvia.value, volumen: +volumen.value, crt: crt.checked };
    Ajustes.guardar(); Ajustes.aplicar(); refrescar();
  };
  [lluvia, volumen, crt].forEach(el => el.addEventListener('input', alCambiar));
}

/* ---------- ARRANQUE ---------- */
window.addEventListener('DOMContentLoaded', () => {
  Ajustes.cargar();
  Ajustes.aplicar();
  iniciarConfiguracion();
  Fondo.iniciar();
  Menu.iniciar();
});