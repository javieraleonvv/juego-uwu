/* =====================================================================
   personalizar.js - Interfaz de personalización (capa superpuesta)
   Se abre con Personalizar.abrir(origen):
     'menu'      -> edita la partida guardada (o la plantilla si no hay partida)
     'plantilla' -> edita la apariencia con la que empezará una partida nueva
     'juego'     -> desde el espejo del refugio (se ve el cambio en el mundo)
   ===================================================================== */
'use strict';

const Personalizar = {
  abierto: false, origen: '', cat: 'Apariencia', slot: 'rostro',
  ap: null, original: null, destino: null, t: 0, idBucle: 0,
  el(id) { return document.getElementById(id); },

  abrir(origen) {
    this.origen = origen;
    const guardada = origen === 'menu' && Guardado.existe() ? Guardado.leer() : null;
    if (origen === 'juego') {
      this.original = Apariencia.copiar(Jugador.apariencia);
      this.destino = a => { Jugador.apariencia = Apariencia.copiar(a); Juego.guardarProgreso(); };
      Juego.pausado = true; Juego.teclas = {};
    } else if (guardada) {
      this.original = Apariencia.validar(guardada.apariencia);
      this.destino = a => { guardada.apariencia = a; Guardado.escribir(guardada); Menu.actualizarEstado(); };
    } else {
      this.original = Apariencia.cargarPlantilla();
      this.destino = a => Apariencia.guardarPlantilla(a);
    }
    this.ap = Apariencia.copiar(this.original);
    this.el('pers-origen').textContent = origen === 'juego' ? 'Espejo del refugio'
      : guardada ? 'Partida guardada' : 'Nueva partida';
    this.el('pers-nombre').value = this.ap.nombre; this.el('pers-pron').value = this.ap.pronombres;
    this.el('pers-anim').value = this.ap.animEspera; this.el('pers-postura').value = this.ap.postura;
    this.cat = 'Apariencia'; this.slot = Catalogo.Apariencia[0].s;
    this.render();
    this.el('personalizar').classList.add('abierta');
    this.abierto = true; this.t = 0;
    const id = ++this.idBucle; requestAnimationFrame(() => this.bucle(id));
  },

  guardar() {
    this.ap.nombre = this.el('pers-nombre').value.trim() || 'Nómada';
    this.destino(Apariencia.validar(Apariencia.copiar(this.ap)));
    this.cerrar();
  },
  cancelar() { if (this.origen === 'juego') Jugador.apariencia = this.original; this.cerrar(); },
  cerrar() {
    this.abierto = false; this.idBucle++;
    this.el('personalizar').classList.remove('abierta');
    if (this.origen === 'juego') { Juego.pausado = false; Juego.ultimo = performance.now(); }
    else Menu.seleccionar(Menu.indice);
  },

  /* ---------- Interfaz ---------- */
  def() { return Object.values(Catalogo).flat().find(d => d.s === this.slot); },
  boton(texto, activo, fn) {
    const b = document.createElement('button'); b.textContent = texto; b.className = activo ? 'sel' : '';
    b.onclick = fn; return b;
  },
  render() {
    const cats = this.el('pers-cats'), subs = this.el('pers-subs'); cats.innerHTML = ''; subs.innerHTML = '';
    [...Object.keys(Catalogo), 'Identidad'].forEach(c => cats.appendChild(this.boton(c, c === this.cat, () => {
      this.cat = c; this.slot = c === 'Identidad' ? null : Catalogo[c][0].s; this.render(); })));
    if (this.cat !== 'Identidad') Catalogo[this.cat].forEach(d =>
      subs.appendChild(this.boton(d.n, d.s === this.slot, () => { this.slot = d.s; this.render(); })));
    this.el('pers-identidad').style.display = this.cat === 'Identidad' ? 'block' : 'none';
    this.el('pers-selector').style.display = this.cat === 'Identidad' ? 'none' : 'block';
    if (this.cat !== 'Identidad') this.renderSelector();
  },
  renderSelector() {
    const d = this.def(), a = this.ap, pal = this.el('pers-paleta'); pal.innerHTML = '';
    const total = d.op ? d.op.length : PAL[d.pal].length, idx = d.op ? a[d.s] : a[d.s + 'C'];
    this.el('pers-valor').textContent = d.n + ': ' + (d.op ? d.op[a[d.s]] : 'color ' + (idx + 1)) + '  (' + (idx + 1) + '/' + total + ')';
    if (d.pal) PAL[d.pal].forEach((color, i) => {                       // paleta de colores
      const b = document.createElement('button'); b.className = 'muestra' + (i === a[d.s + 'C'] ? ' sel' : '');
      b.style.background = color; b.setAttribute('aria-label', 'Color ' + (i + 1));
      b.onclick = () => { a[d.s + 'C'] = i; this.cambio(); }; pal.appendChild(b);
    });
  },
  cambiar(dir) {                                                         // flechas ◀ ▶
    if (!this.slot) return; const d = this.def(), a = this.ap;
    if (d.op) a[d.s] = (a[d.s] + dir + d.op.length) % d.op.length;
    else a[d.s + 'C'] = (a[d.s + 'C'] + dir + PAL[d.pal].length) % PAL[d.pal].length;
    this.cambio();
  },
  cambio() {                                                             // aplica al instante
    if (this.origen === 'juego') Jugador.apariencia = this.ap;          // se ve ya en el mundo
    this.renderSelector();
  },
  reemplazar(nueva) {
    this.ap = nueva; this.el('pers-nombre').value = nueva.nombre; this.el('pers-pron').value = nueva.pronombres;
    this.el('pers-anim').value = nueva.animEspera; this.el('pers-postura').value = nueva.postura;
    if (this.origen === 'juego') Jugador.apariencia = nueva;
    this.render();
  },

  /* Vista previa: el mismo dibujo que se usa en el juego, ampliado x6 */
  bucle(id) {
    if (id !== this.idBucle) return;
    const c = this.el('pers-vista'), ctx = c.getContext('2d'); this.t++;
    ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, c.width, c.height);
    ctx.save(); ctx.scale(6, 6);
    ctx.fillStyle = '#14101f'; ctx.fillRect(0, 29, 24, 3);
    ctx.fillStyle = '#ff2e9a'; ctx.fillRect(0, 29, 24, 1);
    ctx.translate(12, 29);
    Apariencia.dibujarPersonaje(ctx, this.ap, { lp: 9, torso: 10, paso: 0, enSuelo: true, agachado: false,
      ataqueProg: null, t: this.t, quieto: true });
    ctx.restore();
    requestAnimationFrame(() => this.bucle(id));
  },

  iniciar() {
    this.el('pers-prev').onclick = () => this.cambiar(-1);
    this.el('pers-next').onclick = () => this.cambiar(1);
    this.el('pers-azar').onclick = () => this.reemplazar(Apariencia.aleatoria(this.ap));
    this.el('pers-reset').onclick = () => { const d = Apariencia.defecto(); d.nombre = this.ap.nombre; d.pronombres = this.ap.pronombres; this.reemplazar(d); };
    this.el('pers-guardar').onclick = () => this.guardar();
    this.el('pers-cancelar').onclick = () => this.cancelar();
    this.el('pers-nombre').oninput = e => { this.ap.nombre = e.target.value; };
    this.el('pers-pron').onchange = e => { this.ap.pronombres = e.target.value; };
    this.el('pers-anim').onchange = e => { this.ap.animEspera = e.target.value; };
    this.el('pers-postura').onchange = e => { this.ap.postura = e.target.value; };
    window.addEventListener('keydown', e => {
      if (!this.abierto) return;
      if (e.code === 'Escape') { e.preventDefault(); this.cancelar(); return; }
      if (e.target.matches('input,select')) return;
      if (e.code === 'ArrowLeft') { e.preventDefault(); this.cambiar(-1); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); this.cambiar(1); }
      else if ((e.code === 'ArrowUp' || e.code === 'ArrowDown') && this.cat !== 'Identidad') {
        e.preventDefault(); const l = Catalogo[this.cat], i = l.findIndex(d => d.s === this.slot);
        this.slot = l[(i + (e.code === 'ArrowDown' ? 1 : -1) + l.length) % l.length].s; this.render();
      }
    });
  }
};