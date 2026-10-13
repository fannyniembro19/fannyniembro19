(function () {
  "use strict";

  const N = window.NEGOCIO;
  const CATS = window.CATEGORIAS;
  const CLAVE = "nina-pedido-v1";

  const productos = {};
  CATS.forEach(c => c.productos.forEach(p => {
    p.minimo = p.minimo ?? N.minimoLatas;
    p.latas = p.latas ?? 1;
    productos[p.id] = p;
  }));

  const $ = sel => document.querySelector(sel);
  const dinero = n => N.moneda + n.toLocaleString("es-MX");
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // ---------- Estado del pedido ----------
  // carrito: { "id|opcion": cantidad }
  let carrito = {};
  try { carrito = JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { carrito = {}; }
  Object.keys(carrito).forEach(k => { if (!productos[k.split("|")[0]]) delete carrito[k]; });

  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(carrito)); } catch (e) { /* sin almacenamiento */ }
  }

  function calcular() {
    const lineas = Object.entries(carrito).map(([clave, cant]) => {
      const [id, opcion] = clave.split("|");
      return { clave, p: productos[id], opcion: opcion || "", cant };
    });
    const latas = lineas.reduce((s, l) => s + l.cant * l.p.latas, 0);
    const evento = latas >= N.latasParaEvento;
    let subtotal = 0, normal = 0;
    lineas.forEach(l => {
      l.unit = evento && l.p.precioEvento ? l.p.precioEvento : l.p.precio;
      l.total = l.unit * l.cant;
      subtotal += l.total;
      normal += l.p.precio * l.cant;
    });
    const piezas = lineas.reduce((s, l) => s + l.cant, 0);
    return { lineas, latas, evento, subtotal, ahorro: normal - subtotal, piezas };
  }

  function fotoDe(p, opcion) {
    return (p.fotosOpcion && p.fotosOpcion[opcion]) || p.foto || "";
  }

  function cantidadDe(id) {
    return Object.entries(carrito).reduce((s, [k, c]) => s + (k.split("|")[0] === id ? c : 0), 0);
  }

  function cambiar(clave, delta) {
    const p = productos[clave.split("|")[0]];
    const actual = carrito[clave] || 0;
    let nueva = actual === 0 && delta > 0 ? p.minimo : actual + delta;
    if (nueva < p.minimo) {
      nueva = 0;
      if (actual > 0 && p.minimo > 1) aviso(`Mínimo ${p.minimo} latas por sabor`);
    }
    if (nueva > 0) carrito[clave] = nueva; else delete carrito[clave];
    if (actual === 0 && nueva > 0) aviso(`${p.nombre} agregado${p.minimo > 1 ? ` (${p.minimo} latas)` : ""}`);
    guardar();
    actualizar();
  }

  // ---------- Encabezado e información ----------
  $("#eslogan").textContent = N.eslogan;
  $("#link-wa").href = `https://wa.me/${N.whatsapp}?text=${encodeURIComponent(`¡Hola ${N.nombre}! Vi su menú y tengo una pregunta.`)}`;
  $("#link-ig").href = `https://instagram.com/${N.instagram}`;
  $("#ciudad").textContent = "📍 " + N.ciudad;
  $("#notas").innerHTML = N.notas.map(t => `<li>${esc(t)}</li>`).join("");
  $("#horario").innerHTML = N.horarioTexto.map(t => `<li>${esc(t)}</li>`).join("");
  $("#tipo-evento").insertAdjacentHTML("beforeend", N.tiposDeEvento.map(t => `<option>${esc(t)}</option>`).join(""));
  $("#eventos-tipos").innerHTML = N.tiposDeEvento.filter(t => t !== "Otro").map(t => `<li>${esc(t)}</li>`).join("");
  $("#eventos-min").textContent = N.latasParaEvento;
  $("#eventos-dias").textContent = N.diasAnticipacionEvento;
  $("#link-evento").href = `https://wa.me/${N.whatsapp}?text=${encodeURIComponent(
    `¡Hola ${N.nombre}! Quiero cotizar latas para un evento 🎉\n\n` + N.cotizacionEvento.join("\n"))}`;

  // Galería de eventos con visor
  $("#galeria").innerHTML = N.galeriaEventos.map((g, i) =>
    `<button type="button" class="galeria__item" data-foto="${i}"><img src="${esc(g.foto)}" alt="${esc(g.texto)}" loading="lazy"><span>${esc(g.texto)}</span></button>`).join("");
  $("#galeria").addEventListener("click", e => {
    const b = e.target.closest("[data-foto]");
    if (!b) return;
    const g = N.galeriaEventos[b.dataset.foto];
    $("#visor-img").src = g.foto;
    $("#visor-img").alt = g.texto;
    $("#visor-texto").textContent = g.texto;
    $("#visor").hidden = false;
  });
  $("#visor").addEventListener("click", () => { $("#visor").hidden = true; });
  $("#pagos").insertAdjacentHTML("beforeend", N.formasDePago.map((f, i) =>
    `<label class="chip"><input type="radio" name="pago" value="${esc(f)}" ${i === 0 ? "required" : ""}> ${esc(f)}</label>`).join(""));

  function ahoraLocal() {
    const partes = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone: N.zonaHoraria, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date()).map(x => [x.type, x.value]));
    const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(partes.weekday);
    return { dia, hhmm: `${partes.hour}:${partes.minute}`, fecha: `${partes.year}-${partes.month}-${partes.day}` };
  }

  (function estado() {
    try {
      const { dia, hhmm } = ahoraLocal();
      const h = N.horario[dia];
      const abierto = h && hhmm >= h[0] && hhmm < h[1];
      const el = $("#estado");
      el.textContent = abierto ? `Abierto ahora · hasta las ${formatoHora(h[1])}` : "Cerrado ahora · deja tu pedido por WhatsApp";
      el.classList.toggle("abierto", !!abierto);
      el.hidden = false;
    } catch (e) { /* navegador sin soporte de zona horaria */ }
  })();

  function formatoHora(hhmm) {
    let [h, m] = hhmm.split(":").map(Number);
    const suf = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;
    return m ? `${h}:${String(m).padStart(2, "0")} ${suf}` : `${h} ${suf}`;
  }

  // ---------- Menú ----------
  const nav = $("#categorias");
  const menu = $("#menu");
  const logoSinFoto = `<div class="tarjeta__sinfoto"><img src="img/logo.png" alt="" loading="lazy"></div>`;

  nav.innerHTML = CATS.map(c => `<a href="#${slug(c.nombre)}">${esc(c.nombre)}</a>`).join("") +
    `<a href="#eventos">Eventos ✨</a>`;
  menu.innerHTML = CATS.map(c => `
    <section class="seccion" id="${slug(c.nombre)}">
      <h2 class="titulo-script seccion__titulo">${esc(c.nombre)}</h2>
      ${c.productos.some(p => p.latas === 1) ? `<p class="seccion__nota">Precio por lata · mínimo ${N.minimoLatas} del mismo sabor</p>` : ""}
      <div class="grid">
        ${c.productos.map(tarjeta).join("")}
      </div>
    </section>`).join("");

  function tarjeta(p) {
    return `
      <article class="tarjeta" data-id="${p.id}">
        <div class="tarjeta__foto">
          ${p.fotosOpcion
            ? `<div class="tarjeta__duo">${Object.entries(p.fotosOpcion).map(([o, f]) =>
                `<figure><img src="${esc(f)}" alt="${esc(p.nombre)} ${esc(o)}" loading="lazy"><figcaption>${esc(o)}</figcaption></figure>`).join("")}</div>`
            : p.foto ? `<img src="${esc(p.foto)}" alt="${esc(p.nombre)}" loading="lazy">` : logoSinFoto}
          ${p.etiqueta ? `<span class="etiqueta">¡${esc(p.etiqueta)}!</span>` : ""}
        </div>
        <div class="tarjeta__info">
          <h3 class="tarjeta__nombre">${esc(p.nombre)}</h3>
          <p class="tarjeta__desc">${esc(p.descripcion)}</p>
          <div class="tarjeta__precios">
            <span class="precio">${dinero(p.precio)}${p.latas === 1 ? " <small>c/u</small>" : ""}</span>
            ${p.precioEvento ? `<span class="precio-evento">${dinero(p.precioEvento)} en pedidos de ${N.latasParaEvento}+</span>` : ""}
            ${p.peso ? `<span class="peso">≈ ${p.peso} g con envase</span>` : ""}
          </div>
          <div class="control"></div>
        </div>
      </article>`;
  }

  function pintarControles() {
    document.querySelectorAll(".tarjeta").forEach(t => {
      const p = productos[t.dataset.id];
      const ctrl = t.querySelector(".control");
      if (p.agotado) { ctrl.innerHTML = `<button class="agregar" disabled>Agotado</button>`; return; }
      if (p.opciones) {
        const n = cantidadDe(p.id);
        ctrl.innerHTML = `<button class="agregar" data-elegir="${p.id}">${n ? `Agregar otro · ${n} en pedido` : "Elegir y agregar"}</button>`;
        return;
      }
      const n = carrito[p.id] || 0;
      ctrl.innerHTML = n
        ? `<div class="contador"><button data-menos="${p.id}" aria-label="Quitar uno">−</button><span>${n}</span><button data-mas="${p.id}" aria-label="Agregar uno">+</button></div>`
        : `<button class="agregar" data-mas="${p.id}">Agregar${p.minimo > 1 ? ` ${p.minimo}` : ""}</button>`;
    });
  }

  document.addEventListener("click", e => {
    const b = e.target.closest("button, [data-cerrar]");
    if (!b) return;
    if (b.dataset.mas) cambiar(b.dataset.mas, +1);
    else if (b.dataset.menos) cambiar(b.dataset.menos, -1);
    else if (b.dataset.elegir) abrirSelector(productos[b.dataset.elegir]);
    else if (b.hasAttribute("data-cerrar")) cerrar(b.closest(".panel"));
  });

  // Resaltar la categoría visible
  const enlaces = [...nav.querySelectorAll("a")];
  const obs = new IntersectionObserver(entradas => {
    entradas.forEach(en => {
      if (!en.isIntersecting) return;
      enlaces.forEach(a => {
        const activa = a.getAttribute("href") === "#" + en.target.id;
        a.classList.toggle("activa", activa);
        // Mover solo la barra de pestañas (scrollIntoView también movía la página y frenaba el scroll)
        if (activa) nav.scrollLeft = a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2;
      });
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  document.querySelectorAll(".seccion, #eventos").forEach(s => obs.observe(s));

  // ---------- Selector de opciones ----------
  function abrirSelector(p) {
    $("#selector-titulo").textContent = p.nombre;
    const fotos = !!p.fotosOpcion;
    $("#selector-opciones").classList.toggle("con-fotos", fotos);
    $("#selector-opciones").innerHTML = p.opciones.map(o => `<button type="button" data-opcion="${esc(o)}">${
      fotos && p.fotosOpcion[o] ? `<img src="${esc(p.fotosOpcion[o])}" alt="">` : ""}<span>${esc(o)}</span></button>`).join("");
    $("#selector-opciones").onclick = e => {
      const b = e.target.closest("[data-opcion]");
      if (!b) return;
      cambiar(`${p.id}|${b.dataset.opcion}`, +1);
      cerrar($("#selector"));
    };
    abrir($("#selector"));
  }

  // ---------- Paneles ----------
  let ultimoFoco = null;
  function abrir(panel) {
    ultimoFoco = document.activeElement;
    panel.hidden = false;
    document.body.style.overflow = "hidden";
    const foco = panel.querySelector("button, input");
    if (foco) foco.focus({ preventScroll: true });
  }
  function cerrar(panel) {
    if (!panel) return;
    panel.hidden = true;
    if ($("#panel").hidden && $("#selector").hidden) document.body.style.overflow = "";
    if (ultimoFoco) ultimoFoco.focus({ preventScroll: true });
  }
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (!$("#visor").hidden) { $("#visor").hidden = true; return; }
    if (!$("#selector").hidden) cerrar($("#selector"));
    else if (!$("#panel").hidden) cerrar($("#panel"));
  });
  $("#carrito-btn").addEventListener("click", () => abrir($("#panel")));

  // ---------- Lista del pedido ----------
  function actualizar() {
    const r = calcular();
    pintarControles();

    $("#carrito-btn").hidden = r.piezas === 0;
    $("#carrito-cant").textContent = r.piezas;
    $("#carrito-total").textContent = dinero(r.subtotal);

    $("#lista").innerHTML = r.lineas.length ? r.lineas.map(l => `
      <li class="item">
        ${fotoDe(l.p, l.opcion) ? `<img src="${esc(fotoDe(l.p, l.opcion))}" alt="">` : `<div class="item__sinfoto"></div>`}
        <div>
          <p class="item__nombre">${esc(l.p.nombre)}${l.opcion ? ` · ${esc(l.opcion)}` : ""}</p>
          <p class="item__detalle">${dinero(l.unit)} c/u · <strong>${dinero(l.total)}</strong></p>
        </div>
        <div class="contador"><button data-menos="${esc(l.clave)}" aria-label="Quitar uno">−</button><span>${l.cant}</span><button data-mas="${esc(l.clave)}" aria-label="Agregar uno">+</button></div>
      </li>`).join("") : `<li class="ayuda centrado">Tu pedido está vacío. Agrega tus postres favoritos 💕</li>`;

    const faltan = N.latasParaEvento - r.latas;
    $("#aviso-evento").innerHTML = !r.latas ? "" : r.evento
      ? `🎉 <strong>¡Precio de evento aplicado!</strong> (${r.latas} latas). Los pedidos de evento se hacen con ${N.diasAnticipacionEvento} días de anticipación.`
      : `Llevas <strong>${r.latas} latas</strong>. Con ${faltan} más obtienes el precio especial de eventos.`;

    $("#subtotal").textContent = dinero(r.subtotal);
    $("#fila-ahorro").hidden = r.ahorro <= 0;
    $("#ahorro").textContent = "−" + dinero(r.ahorro);
    $("#total").textContent = dinero(r.subtotal) + ($("#form").entrega.value === "Domicilio" ? " + envío" : "");
    $("#anticipo-txt").textContent = `Anticipo ${N.anticipo}% para apartar`;
    $("#anticipo").textContent = dinero(Math.ceil(r.subtotal * N.anticipo / 100));

    actualizarFecha(r.evento);
    if (!r.piezas && !$("#panel").hidden) cerrar($("#panel"));
  }

  // ---------- Formulario ----------
  const form = $("#form");

  function sumarDias(fechaISO, dias) {
    const d = new Date(fechaISO + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + dias);
    return d.toISOString().slice(0, 10);
  }
  function hoyISO() {
    try { return ahoraLocal().fecha; } catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  function diaDisponible(iso, evento) {
    const dia = new Date(iso + "T12:00:00Z").getUTCDay();
    return !!N.horario[dia] || (evento && dia === 0 && N.domingoSoloEventos);
  }
  function fechaMinima(evento) {
    let f = sumarDias(hoyISO(), evento ? N.diasAnticipacionEvento : N.diasAnticipacion);
    while (!diaDisponible(f, evento)) f = sumarDias(f, 1);
    return f;
  }
  function actualizarFecha(evento) {
    const min = fechaMinima(evento);
    form.fecha.min = min;
    const domingo = evento && N.domingoSoloEventos ? "Eventos: también entregamos en domingo" : "Domingo no hay entregas (solo eventos de 15+ latas)";
    $("#fecha-ayuda").textContent = `Con ${evento ? N.diasAnticipacionEvento : N.diasAnticipacion} días de anticipación · ${domingo} · Primera fecha disponible: ${fechaBonita(min)}`;
  }
  function fechaBonita(iso) {
    return new Date(iso + "T12:00:00Z").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  }

  form.addEventListener("change", e => {
    if (e.target.name === "entrega") {
      const dom = form.entrega.value === "Domicilio";
      $("#campo-direccion").hidden = !dom;
      $("#envio-txt").textContent = dom ? "Se cotiza por WhatsApp según tu dirección" : "Sin costo (pasas a recoger)";
      actualizar();
    }
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const r = calcular();
    const d = Object.fromEntries(new FormData(form));
    const err = validar(r, d);
    $("#error").textContent = err;
    if (err) return;

    const lineas = r.lineas.map(l =>
      `• ${l.cant} × ${l.p.nombre}${l.opcion ? ` (${l.opcion})` : ""} — ${dinero(l.total)}`);
    const msg = [
      `¡Hola ${N.nombre}! 👋 Quiero hacer un pedido:`,
      "",
      "*PEDIDO*",
      ...lineas,
      "",
      r.evento ? `🎉 Precio de evento (${r.latas} latas)` : null,
      `*Total: ${dinero(r.subtotal)}*${d.entrega === "Domicilio" ? " + envío" : ""}`,
      `Anticipo ${N.anticipo}%: ${dinero(Math.ceil(r.subtotal * N.anticipo / 100))}`,
      "",
      "*MIS DATOS*",
      `Nombre: ${d.nombre.trim()}`,
      `Celular: ${d.celular.trim()}`,
      `Entrega: ${d.entrega === "Domicilio" ? "Envío a domicilio" : "Paso a recoger"}`,
      d.entrega === "Domicilio" ? `Dirección: ${d.direccion.trim()}` : null,
      d.evento ? `Evento: ${d.evento}` : null,
      `Fecha: ${fechaBonita(d.fecha)}`,
      `Pago: ${d.pago}`,
      d.notas && d.notas.trim() ? `Notas: ${d.notas.trim()}` : null,
    ].filter(x => x !== null).join("\n");

    window.open(`https://wa.me/${N.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  });

  function validar(r, d) {
    if (!r.piezas) return "Agrega al menos un producto.";
    if (!d.nombre || !d.nombre.trim()) return "Escribe tu nombre.";
    if ((d.celular || "").replace(/\D/g, "").length < 10) return "Escribe tu celular a 10 dígitos.";
    if (!d.entrega) return "Elige si pasas a recoger o envío a domicilio.";
    if (d.entrega === "Domicilio" && !(d.direccion || "").trim()) return "Escribe la dirección de entrega.";
    if (!d.fecha) return "Elige la fecha de entrega.";
    if (d.fecha < fechaMinima(r.evento)) return `La primera fecha disponible es ${fechaBonita(fechaMinima(r.evento))}.`;
    if (!diaDisponible(d.fecha, r.evento)) return `Los domingos solo entregamos eventos (${N.latasParaEvento} latas o más). Elige otro día.`;
    if (!d.pago) return "Elige la forma de pago.";
    return "";
  }

  // ---------- Avisos ----------
  let tAviso;
  function aviso(texto) {
    const t = $("#toast");
    t.textContent = texto;
    t.classList.add("visible");
    clearTimeout(tAviso);
    tAviso = setTimeout(() => t.classList.remove("visible"), 2200);
  }

  actualizar();
})();
