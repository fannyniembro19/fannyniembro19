// Mis Facturas: foto del ticket → se leen proveedor y datos (gratis en el celular, o con Claude si hay clave)
// → copia datos → marcador llena el formulario.


const SDK_URL = "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.130.0/+esm";
const MODELO = "claude-opus-5-5";

const K_DATOS = "facturas.datos";
const K_HISTORIAL = "facturas.historial";
const K_PORTALES = "facturas.portales"; // proveedor → url que ya funcionó

const $ = (s) => document.querySelector(s);

// ---------- almacenamiento local (solo en este celular) ----------
const guardado = {
  leer(k, def) { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch (e) { return def; } },
  escribir(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* modo privado */ } },
};
const misDatos = () => guardado.leer(K_DATOS, {});
const clave = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

// ---------- utilidades de interfaz ----------
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3000);
}
function estado(el, msg, tipo = "") { el.textContent = msg; el.className = "estado " + tipo; }

function irA(vista) {
  document.querySelectorAll(".pestana").forEach((b) => b.classList.toggle("activa", b.dataset.vista === vista));
  document.querySelectorAll(".vista").forEach((v) => { v.hidden = v.id !== "vista-" + vista; });
  if (vista === "historial") pintarHistorial();
  window.scrollTo(0, 0);
}
document.querySelectorAll("[data-vista]").forEach((b) => b.addEventListener("click", () => irA(b.dataset.vista)));
document.querySelectorAll("[data-ir]").forEach((b) => b.addEventListener("click", () => irA(b.dataset.ir)));

function revisarConfig() {
  const d = misDatos();
  $("#aviso-config").hidden = Boolean(d.rfc && d.email);
}

// ---------- Mis datos ----------
const form = $("#form-datos");
function cargarForm() {
  const d = misDatos();
  for (const el of form.elements) if (el.name && d[el.name] != null) el.value = d[el.name];
}
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(form));
  d.rfc = d.rfc.trim().toUpperCase();
  d.razonSocial = d.razonSocial.trim().toUpperCase();
  d.apiKey = d.apiKey.trim();
  guardado.escribir(K_DATOS, d);
  estado($("#estado-datos"), "Guardado ✓", "ok");
  revisarConfig();
});

// Marcador: se arma a partir de llenar.js
let codigoMarcador = "";
fetch("llenar.js?v=2").then((r) => r.text()).then((src) => {
  codigoMarcador = "javascript:" + encodeURIComponent(src.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, ""));
  $("#marcador").href = codigoMarcador;
});
$("#marcador").addEventListener("click", (e) => { e.preventDefault(); toast("Guárdalo en tus marcadores; se usa en la página de facturación."); });
$("#btn-copiar-marcador").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(codigoMarcador); toast("Código copiado. Pégalo como dirección de un marcador."); }
  catch (e) { toast("No pude copiar. Mantén presionado el botón rosa y copia el enlace."); }
});

// ---------- Foto ----------
let fotoBase64 = null;
let fotoOriginal = null; // archivo tal cual, para que el lector gratis vea todo el detalle
const K_CAMARA = "facturas.abriendoCamara";
async function alElegirFoto(e) {
  try { sessionStorage.removeItem(K_CAMARA); } catch (x) { /* nada */ }
  const archivo = e.target.files[0];
  e.target.value = ""; // permite volver a elegir la misma foto
  if (!archivo) return;
  estado($("#estado"), "Abriendo foto…");
  try {
    fotoBase64 = await reducirImagen(archivo, 2000);
    fotoOriginal = archivo;
    $("#vista-previa").src = "data:image/jpeg;base64," + fotoBase64;
    $("#vista-previa").hidden = false;
    $("#zona-foto").classList.add("con-foto");
    $("#foto-texto").textContent = "Tocar para cambiar foto";
    $("#btn-leer").disabled = false;
    $("#resultado").hidden = true;
    estado($("#estado"), "Foto lista. Toca «Leer ticket».", "ok");
  } catch (err) {
    console.error(err);
    estado($("#estado"), "No pude abrir esa foto. Intenta con otra o elígela de la galería.", "error");
  }
}
$("#input-camara").addEventListener("change", alElegirFoto);
$("#input-galeria").addEventListener("change", alElegirFoto);
// Algunos Android cierran el navegador al abrir la cámara y la página vuelve a empezar.
$("#input-camara").addEventListener("click", () => { try { sessionStorage.setItem(K_CAMARA, "1"); } catch (x) { /* nada */ } });
try {
  if (sessionStorage.getItem(K_CAMARA)) {
    sessionStorage.removeItem(K_CAMARA);
    estado($("#estado"), "Tu celular cerró la app al abrir la cámara. Toma la foto con tu cámara normal y luego toca «Elegir de galería».", "error");
  }
} catch (x) { /* nada */ }

async function reducirImagen(archivo, max) {
  const url = URL.createObjectURL(archivo);
  try {
    let img;
    try { img = await createImageBitmap(archivo); }
    catch (x) { img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = url; }); }
    const escala = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85).split(",")[1];
  } finally { URL.revokeObjectURL(url); }
}

// ---------- Leer ticket con Claude ----------
const SISTEMA = `Eres una asistente que ayuda a una emprendedora en México a facturar (CFDI) sus gastos.
Recibes la foto de un ticket de compra. Tu trabajo:
1. Leer el ticket con cuidado y extraer los datos que los portales de autofacturación suelen pedir.
2. Encontrar la página OFICIAL de facturación del proveedor. Si el ticket la trae impresa, úsala.
   Si no, búscala en la web (prefiere el dominio oficial de la empresa; evita sitios de terceros).
3. Responder SOLO con un objeto JSON, sin texto adicional, con esta forma exacta:
{
  "proveedor": "nombre comercial (ej. OXXO, Walmart, Pemex - Gasolinera X)",
  "emisor_razon_social": "razón social del emisor si aparece, si no \\"\\"",
  "emisor_rfc": "RFC del emisor si aparece, si no \\"\\"",
  "fecha": "YYYY-MM-DD",
  "total": "importe total con punto decimal, sin signo ni comas",
  "folio": "número de ticket / folio / transacción principal",
  "tienda": "número o nombre de tienda/sucursal/estación si aparece",
  "campos_extra": [{"etiqueta": "texto tal como viene en el ticket (ej. TR, TC, Caja, Web ID, Código de facturación)", "valor": "..."}],
  "portal_url": "URL de la página de facturación o \\"\\" si no la encontraste",
  "portal_fuente": "ticket | busqueda | conocido | no_encontrado",
  "notas": "1-2 frases útiles: qué pide ese portal, plazo para facturar (ej. mismo mes), o si algo del ticket no se lee"
}
Si un dato no se ve, deja "" (no inventes). Copia los números exactamente como vienen.`;

async function leerTicket() {
  const d = misDatos();
  const btn = $("#btn-leer");
  btn.disabled = true;
  try {
    const datos = d.apiKey ? await leerConClaude(d.apiKey) : await leerGratis();
    terminarLectura(datos);
  } catch (err) {
    console.error(err);
    let msg = err.message || "Algo falló.";
    if (err.status === 401) msg = "La clave de Claude no es válida. Bórrala en Mis datos para usar la lectura gratis.";
    else if (err.status === 400 && /credit|balance/i.test(msg)) msg = "Tu clave de Claude no tiene saldo. Bórrala en Mis datos para usar la lectura gratis.";
    else if (err.status === 429) msg = "Demasiadas solicitudes; espera un minuto e intenta otra vez.";
    else if (err.status >= 500) msg = "El servicio de Claude no respondió. Intenta en un momento.";
    else if (err instanceof TypeError) msg = "Sin conexión. Revisa tu internet.";
    estado($("#estado"), msg, "error");
  } finally {
    btn.disabled = false;
  }
}
$("#btn-leer").addEventListener("click", leerTicket);

async function leerGratis() {
  estado($("#estado"), "Preparando el lector (la primera vez tarda un poco)…");
  const { leerTicketGratis } = await import("./lector.js?v=10");
  const url = URL.createObjectURL(fotoOriginal);
  try {
    const datos = await leerTicketGratis(url, (pasada, p) =>
      estado($("#estado"), pasada ? `Revisando otra vez para encontrar lo que faltó… ${p}%` : `Leyendo ticket… ${p}%`));
    estado($("#estado"), "Buscando código de barras o QR…");
    const { leerCodigos, aplicarCodigos } = await import("./codigos.js?v=1");
    aplicarCodigos(datos, await leerCodigos(fotoOriginal));
    if (datos.texto.replace(/\s/g, "").length < 15) throw new Error("No se alcanza a leer el ticket. Toma la foto más de cerca, derecha y con buena luz.");
    return datos;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function leerConClaude(apiKey) {
  estado($("#estado"), "Leyendo ticket y buscando su página de facturación…");
  const { default: Anthropic } = await import(SDK_URL);
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const conocidos = guardado.leer(K_PORTALES, {});
  const lista = Object.values(conocidos).map((p) => `- ${p.nombre}: ${p.url}`).join("\n");
  const messages = [{
    role: "user",
    content: [
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: fotoBase64 } },
      { type: "text", text: "Este es el ticket." + (lista ? `\nPortales que ya me funcionaron (úsalos si es el mismo proveedor, portal_fuente "conocido"):\n${lista}` : "") },
    ],
  }];

  let resp;
  for (let vuelta = 0; vuelta < 4; vuelta++) {
    resp = await client.beta.messages.create({
      model: MODELO,
      max_tokens: 16000,
      system: SISTEMA,
      output_config: { effort: "medium" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3, user_location: { type: "approximate", country: "MX" } }],
      // Si el modelo declina por error, la API reintenta sola con otro modelo.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages,
    });
    if (resp.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: resp.content }); // la búsqueda sigue en curso
  }
  if (resp.stop_reason === "refusal") throw new Error("Claude no pudo procesar esta imagen. Intenta con otra foto.");

  const texto = resp.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const datos = extraerJSON(texto);
  if (!datos) throw new Error("No entendí la respuesta. Intenta de nuevo con una foto más clara.");
  return datos;
}

function terminarLectura(datos) {
  // Si ya tenemos un portal guardado para este proveedor, ese manda.
  const previo = guardado.leer(K_PORTALES, {})[clave(datos.proveedor)];
  if (previo && previo.url) { datos.portal_url = previo.url; datos.portal_fuente = "conocido"; }

  const registro = { id: Date.now(), creado: new Date().toISOString(), datos, facturado: false };
  const hist = guardado.leer(K_HISTORIAL, []);
  hist.unshift(registro);
  guardado.escribir(K_HISTORIAL, hist.slice(0, 200));

  mostrar(registro);
  estado($("#estado"), "Listo ✓ Revisa los datos.", "ok");
}

function extraerJSON(texto) {
  const bloque = texto.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidato = bloque ? bloque[1] : texto.slice(texto.indexOf("{"), texto.lastIndexOf("}") + 1);
  try { return JSON.parse(candidato); } catch (e) { return null; }
}

// ---------- Mostrar resultado ----------
let actual = null;

const FUENTES = {
  ticket: "Viene impresa en el ticket.",
  busqueda: "La encontré buscando en internet; confirma que sea la oficial.",
  conocido: "Es la que usaste antes con este proveedor.",
  catalogo: "Es la página oficial de facturación de esta tienda.",
  qr: "Viene en el código QR del ticket.",
  no_encontrado: "No venía en el ticket. Toca Buscar, abre la página oficial, copia su dirección y pégala aquí: la recordaré.",
};

function mostrar(registro) {
  actual = registro;
  const x = registro.datos;
  const d = misDatos();
  $("#r-proveedor").value = x.proveedor || "";
  $("#r-texto").textContent = x.texto || "";
  $("#r-texto-caja").hidden = !x.texto;
  $("#r-emisor").textContent = [x.emisor_razon_social, x.emisor_rfc].filter(Boolean).join(" · ");
  $("#r-notas").textContent = x.notas || "";
  $("#r-notas").hidden = !x.notas;
  $("#r-portal").value = x.portal_url || "";
  $("#r-portal-origen").textContent = FUENTES[x.portal_fuente] || "";

  // Datos del ticket: siempre visibles y editables (la lectura puede equivocarse).
  const extraDe = (et) => {
    let c = (x.campos_extra || []).find((e) => e.etiqueta === et);
    if (!c) { c = { etiqueta: et, valor: "" }; (x.campos_extra = x.campos_extra || []).push(c); }
    return c;
  };
  // Walmart (y Bodega Aurrera / Sam's) solo pide Número de Ticket (TC), # Transacción (TR) y el total.
  const walmart = esWalmart(x);
  const delTicket = walmart ? [
    ["Número de ticket (TC)", () => extraDe("TC").valor, (v) => { extraDe("TC").valor = v; }],
    ["# Transacción (TR)", () => extraDe("TR").valor, (v) => { extraDe("TR").valor = v; }],
    ["Total", () => x.total, (v) => { x.total = v; }],
  ] : [
    ["Folio / ticket", () => x.folio, (v) => { x.folio = v; }],
    ["Tienda / sucursal", () => x.tienda, (v) => { x.tienda = v; }],
    ["Fecha (año-mes-día)", () => x.fecha, (v) => { x.fecha = v; }],
    ["Total", () => x.total, (v) => { x.total = v; }],
    ...(x.campos_extra || []).map((c) => [c.etiqueta, () => c.valor, (v) => { c.valor = v; }]),
  ];
  const tuyos = [
    ["Tu RFC", d.rfc], ["Razón social", d.razonSocial], ["Código postal", d.cp],
    ["Régimen fiscal", d.regimen], ["Uso de CFDI", d.usoCfdi], ["Email", d.email],
  ].filter(([, v]) => v);

  const fila = (nombre, valorEl, leer) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="c-texto"><span class="c-nombre"></span><span class="c-valor"></span></span>
      <button class="btn btn--copiar" type="button">Copiar</button>`;
    li.querySelector(".c-nombre").textContent = nombre;
    li.querySelector(".c-valor").append(valorEl);
    li.querySelector("button").addEventListener("click", () => copiar(leer(), `${nombre} copiado`));
    return li;
  };
  $("#r-campos").replaceChildren(
    ...delTicket.map(([nombre, leer, poner]) => {
      const inp = document.createElement("input");
      inp.value = leer() || "";
      inp.placeholder = "no se leyó; escríbelo";
      inp.addEventListener("change", () => { poner(inp.value.trim()); actualizarHistorial(registro); });
      return fila(nombre, inp, () => inp.value);
    }),
    ...tuyos.map(([nombre, valor]) => fila(nombre, document.createTextNode(valor), () => valor)),
  );

  $("#btn-facturado").textContent = registro.facturado ? "Facturado ✓ (tocar para desmarcar)" : "Ya la generé ✓";
  $("#resultado").hidden = false;
  irA("ticket");
  $("#resultado").scrollIntoView({ behavior: "smooth" });
}

async function copiar(texto, msg) {
  try { await navigator.clipboard.writeText(texto); toast(msg); }
  catch (e) { toast("No pude copiar en este navegador."); }
}

function paqueteParaMarcador() {
  const x = actual.datos, d = misDatos();
  const ex = (et) => ((x.campos_extra || []).find((c) => c.etiqueta === et) || {}).valor || "";
  const walmart = esWalmart(x);
  return JSON.stringify({
    __factura: 1,
    rfc: d.rfc, razonSocial: d.razonSocial, cp: d.cp, regimen: d.regimen, usoCfdi: d.usoCfdi, email: d.email,
    // En Walmart «Número de Ticket» es el TC y «# Transacción» es el TR.
    folio: walmart ? ex("TC") : x.folio,
    transaccion: ex("TR"),
    tienda: x.tienda, fecha: x.fecha, total: x.total, extras: x.campos_extra || [],
  });
}

function esWalmart(x) {
  return /^(Walmart|Bodega Aurrera|Sam's Club)$/i.test(x.proveedor || "") || /walmart/i.test(x.portal_url || "");
}

function recordarPortal() {
  const url = $("#r-portal").value.trim();
  if (!actual || !url) return;
  actual.datos.portal_url = url;
  const p = guardado.leer(K_PORTALES, {});
  p[clave(actual.datos.proveedor)] = { nombre: actual.datos.proveedor, url };
  guardado.escribir(K_PORTALES, p);
  actualizarHistorial(actual);
}
$("#r-proveedor").addEventListener("change", () => {
  if (!actual) return;
  actual.datos.proveedor = $("#r-proveedor").value.trim();
  const previo = guardado.leer(K_PORTALES, {})[clave(actual.datos.proveedor)];
  if (previo && previo.url && !$("#r-portal").value.trim()) {
    $("#r-portal").value = previo.url;
    $("#r-portal-origen").textContent = FUENTES.conocido;
  }
  actualizarHistorial(actual);
});

$("#btn-buscar-portal").addEventListener("click", () => {
  const nombre = $("#r-proveedor").value.trim();
  if (!nombre) { toast("Escribe primero el nombre de la tienda."); $("#r-proveedor").focus(); return; }
  window.open("https://www.google.com/search?q=" + encodeURIComponent(`facturación ${nombre} portal oficial`), "_blank", "noopener");
});

$("#r-portal").addEventListener("change", () => {
  recordarPortal();
  $("#r-portal-origen").textContent = "Guardada para la próxima vez.";
});

$("#btn-facturar").addEventListener("click", () => {
  const url = $("#r-portal").value.trim();
  if (!/^https?:\/\//i.test(url)) { toast("Falta la dirección de la página de facturación."); $("#r-portal").focus(); return; }
  // Copiar y abrir en el mismo toque (si no, el navegador bloquea la ventana).
  navigator.clipboard.writeText(paqueteParaMarcador())
    .then(() => toast("Datos copiados. En la página toca «Llenar factura»."))
    .catch(() => toast("No pude copiar; usa los botones Copiar de cada dato."));
  window.open(url, "_blank", "noopener");
  recordarPortal();
});

$("#btn-facturado").addEventListener("click", () => {
  if (!actual) return;
  actual.facturado = !actual.facturado;
  actualizarHistorial(actual);
  mostrar(actual);
  if (actual.facturado) toast("¡Listo! Marcado como facturado.");
});

// ---------- Historial ----------
function actualizarHistorial(reg) {
  const hist = guardado.leer(K_HISTORIAL, []);
  const i = hist.findIndex((h) => h.id === reg.id);
  if (i >= 0) { hist[i] = reg; guardado.escribir(K_HISTORIAL, hist); }
}

const pesos = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
function pintarHistorial() {
  const hist = guardado.leer(K_HISTORIAL, []);
  $("#historial-vacio").hidden = hist.length > 0;
  $("#lista-historial").replaceChildren(...hist.map((h) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="h-texto"><strong></strong><small></small></span><span class="chip"></span>`;
    li.querySelector("strong").textContent = h.datos.proveedor || "Ticket";
    const total = Number(h.datos.total);
    li.querySelector("small").textContent = [h.datos.fecha, isNaN(total) ? "" : pesos.format(total)].filter(Boolean).join(" · ");
    const chip = li.querySelector(".chip");
    chip.textContent = h.facturado ? "Facturado" : "Pendiente";
    chip.classList.toggle("ok", h.facturado);
    li.addEventListener("click", () => mostrar(h));
    return li;
  }));
}

// Cualquier error inesperado se muestra en pantalla (para poder mandar captura).
window.addEventListener("error", (e) => estado($("#estado"), "Error: " + (e.message || "desconocido"), "error"));
window.addEventListener("unhandledrejection", (e) => estado($("#estado"), "Error: " + ((e.reason && e.reason.message) || e.reason || "desconocido"), "error"));

// ---------- versión ----------
// Si ya hay una versión más nueva publicada, avisamos para no quedarnos con la vieja guardada.
const VERSION = 10;
$("#version").textContent = "Versión " + VERSION;
fetch("version.json?t=" + Date.now(), { cache: "no-store" })
  .then((r) => r.json())
  .then((v) => { if (v.version > VERSION) $("#aviso-version").hidden = false; })
  .catch(() => {});
$("#btn-actualizar").addEventListener("click", () => location.reload());

// ---------- inicio ----------
// La primera versión guardaba una página de Walmart que ya no sirve: la olvidamos.
(() => {
  const p = guardado.leer(K_PORTALES, {});
  let cambio = false;
  for (const k of Object.keys(p)) if (/walmartmexico\.com\.mx/i.test(p[k].url || "")) { delete p[k]; cambio = true; }
  if (cambio) guardado.escribir(K_PORTALES, p);
})();
cargarForm();
revisarConfig();
