// Lectura GRATIS del ticket, dentro del celular (sin clave ni internet de pago).
// Tesseract.js reconoce el texto; luego buscamos los datos con reglas.

const TESSERACT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.esm.min.js";

// Nombres que aparecen en tickets de cadenas comunes (los más específicos primero).
const MARCAS = [
  "OXXO GAS", "OXXO", "BODEGA AURRERA", "WALMART", "WAL-MART", "SAM'S CLUB", "SAMS CLUB", "COSTCO",
  "SORIANA", "CHEDRAUI", "LA COMER", "CITY MARKET", "FRESKO", "HEB", "H-E-B", "SMART", "ALSUPER", "CASA LEY",
  "HOME DEPOT", "OFFICE DEPOT", "OFFICEMAX", "LIVERPOOL", "SUBURBIA", "COPPEL", "SEARS", "SANBORNS", "ELEKTRA",
  "FARMACIAS GUADALAJARA", "FARMACIA GUADALAJARA", "FARMACIAS DEL AHORRO", "FARMACIA DEL AHORRO",
  "FARMACIAS BENAVIDES", "FARMACIAS SIMILARES", "FARMACIAS SAN PABLO",
  "7-ELEVEN", "7 ELEVEN", "CIRCLE K", "TIENDAS EXTRA", "KIOSKO",
  "PEMEX", "G500", "MOBIL", "SHELL", "HIDROSINA", "TOTAL ENERGIES",
  "STARBUCKS", "MCDONALD", "BURGER KING", "DOMINO", "LITTLE CAESARS", "VIPS", "TOKS", "SANBORNS CAFE",
  "CINEPOLIS", "CINEMEX", "TELCEL", "TELMEX", "AT&T", "CFE", "AUTOZONE", "TRUPER", "DEL SOL", "WOOLWORTH",
];

export async function leerTextoTicket(imagenBase64, alAvanzar) {
  const { default: Tesseract } = await import(TESSERACT_URL);
  let worker;
  // Si algo falla dentro del lector (p. ej. sin internet al bajar el idioma), no dejamos la app esperando.
  const fallo = new Promise((_, mal) => {
    const aviso = () => mal(new Error("No pude preparar el lector. Revisa tu internet e intenta otra vez."));
    setTimeout(aviso, 120000);
    leerTextoTicket.alFallar = aviso;
  });
  const trabajo = (async () => {
    worker = await Tesseract.createWorker("spa", 1, {
      logger: (m) => { if (m.status === "recognizing text" && alAvanzar) alAvanzar(Math.round(m.progress * 100)); },
      errorHandler: () => leerTextoTicket.alFallar(),
    });
    const { data } = await worker.recognize(await realzar(imagenBase64));
    return data.text || "";
  })();
  try {
    return await Promise.race([trabajo, fallo]);
  } finally {
    if (worker) worker.terminate().catch(() => {});
  }
}

// Tickets térmicos suelen salir grises y pálidos: pasamos a blanco y negro con más contraste.
async function realzar(imagenBase64) {
  try {
    const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = "data:image/jpeg;base64," + imagenBase64; });
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, c.width, c.height);
    const d = px.data, hist = new Uint32Array(256);
    for (let i = 0; i < d.length; i += 4) {
      const g = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000 | 0;
      d[i] = g; hist[g]++;
    }
    // Estiramos entre el 2 % más oscuro y el 2 % más claro.
    const total = d.length / 4;
    let acum = 0, bajo = 0, alto = 255;
    for (let v = 0; v < 256; v++) { acum += hist[v]; if (acum > total * 0.02) { bajo = v; break; } }
    acum = 0;
    for (let v = 255; v >= 0; v--) { acum += hist[v]; if (acum > total * 0.02) { alto = v; break; } }
    const rango = Math.max(1, alto - bajo);
    for (let i = 0; i < d.length; i += 4) {
      const g = Math.max(0, Math.min(255, ((d[i] - bajo) * 255) / rango));
      d[i] = d[i + 1] = d[i + 2] = g;
    }
    ctx.putImageData(px, 0, 0);
    return c.toDataURL("image/png");
  } catch (e) {
    return "data:image/jpeg;base64," + imagenBase64;
  }
}

const sinAcentos = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

export function datosDelTexto(texto) {
  const lineas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // El lector confunde O/0 e I/1 dentro de números: «2O26» → «2026».
  const T = sinAcentos(texto.toUpperCase())
    .replace(/(\d)[OQ](?=[\d\s\/.,:-]|$)/gm, "$10").replace(/(\d)[OQ](?=[\d\s\/.,:-]|$)/gm, "$10")
    .replace(/(^|[\s\/.-])[OQ](?=\d)/gm, "$10")
    .replace(/(\d)[IL|](?=\d)/g, "$11");
  const LT = lineas.map((l) => sinAcentos(l.toUpperCase()));

  // RFC del emisor (3-4 letras, 6 dígitos de fecha, 3 de homoclave)
  const rfc = (T.match(/\b([A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3})\b/) || [])[1] || "";

  // Fecha: 15/10/2026, 15-10-26, 2026-10-15, 15/OCT/2026
  let fecha = "";
  const MESES = { ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6, JUL: 7, AGO: 8, SEP: 9, SET: 9, OCT: 10, NOV: 11, DIC: 12 };
  const dos = (n) => String(n).padStart(2, "0");
  let m;
  if ((m = T.match(/\b(20\d{2})\s?[\/.-]\s?(\d{1,2})\s?[\/.-]\s?(\d{1,2})\b/))) fecha = `${m[1]}-${dos(m[2])}-${dos(m[3])}`;
  else if ((m = T.match(/\b(\d{1,2})\s?[\/.-]\s?(\d{1,2})\s?[\/.-]\s?(\d{4}|\d{2})\b/))) {
    const y = m[3].length === 2 ? "20" + m[3] : m[3];
    if (+m[2] <= 12) fecha = `${y}-${dos(m[2])}-${dos(m[1])}`;
  } else if ((m = T.match(/\b(\d{1,2})[\/ .-]?(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|SET|OCT|NOV|DIC)[A-Z]*[\/ .-]?(\d{2,4})\b/))) {
    const y = m[3].length === 2 ? "20" + m[3] : m[3];
    fecha = `${y}-${dos(MESES[m[2]])}-${dos(m[1])}`;
  }

  // Total: renglón con TOTAL que no sea SUBTOTAL; el último importe del renglón.
  const importe = (l) => { const ns = l.replace(/(\d),(\d{3})/g, "$1$2").match(/\d+[.,]\d{2}\b/g); return ns ? ns[ns.length - 1].replace(",", ".") : ""; };
  let total = "";
  for (let i = 0; i < LT.length && !total; i++) {
    const l = LT[i];
    if (/\bTOTAL\b/.test(l) && !/SUB ?-?TOTAL|ARTICULOS|PIEZAS|PRODUCTOS|AHORRO|DESCUENTO/.test(l)) {
      total = importe(l) || (LT[i + 1] ? importe(LT[i + 1]) : "");
    }
  }

  const valorTras = (re) => { const x = T.match(re); return x ? x[1] : ""; };
  // Los valores siempre llevan al menos un número (así no tomamos palabras como «ATENDIMOS»).
  const COD = "((?=[A-Z0-9-]*\\d)[A-Z0-9][A-Z0-9-]*)";
  const folio = valorTras(new RegExp("\\b(?:FOLIO|F0LIO|TICKET|TIKET|TKT|TRANSACCION|TRANSAC|TRANS|TRX|NO\\.? ?(?:DE )?(?:VENTA|TICKET|OPERACION)|OPERACION|NOTA|ORDEN|CUENTA|CONSECUTIVO)\\b\\.?\\s*(?:NO\\.?|NUM\\.?|#)?\\s*[:#]?\\s*" + COD));
  const tienda = valorTras(new RegExp("\\b(?:TIENDA|SUCURSAL|SUC|ESTACION|EST|TDA|UNIDAD|ESTABLECIMIENTO)\\b\\.?\\s*(?:NO\\.?|NUM\\.?|#)?\\s*[:#]?\\s*" + COD));

  // Códigos especiales que piden algunos portales.
  const campos_extra = [];
  const reExtra = /\b(TR|TC|TE|TDA|CAJA|WEB ?ID|ID WEB|REFERENCIA|REF|CODIGO DE FACTURACION|CODIGO FACTURACION|ID DE FACTURACION|ID FACTURACION|AUTORIZACION|AUT)\b\.?\s*[:#]?\s*((?=[A-Z0-9-]*\d)[A-Z0-9][A-Z0-9-]*)/g;
  for (const x of T.matchAll(reExtra)) {
    if (!campos_extra.some((c) => c.etiqueta === x[1])) campos_extra.push({ etiqueta: x[1], valor: x[2] });
  }

  // Página de facturación impresa en el ticket (preferimos la que esté cerca de «factur»).
  const reUrl = /((?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|mx|net|org|com\.mx)(?:\/[^\s]*)?)/i;
  let portal_url = "";
  for (let i = 0; i < lineas.length; i++) {
    // El lector a veces separa la dirección: «Www .oxxo .com/ facturacion»
    const u = lineas[i].replace(/\s*([./])\s*/g, "$1").match(reUrl);
    if (!u) continue;
    const cerca = [LT[i - 1], LT[i], LT[i + 1]].join(" ");
    if (!portal_url || /FACTUR/.test(cerca)) portal_url = u[1];
    if (/FACTUR/.test(cerca)) break;
  }
  portal_url = portal_url.toLowerCase();
  if (portal_url && !/^https?:\/\//.test(portal_url)) portal_url = "https://" + portal_url.replace(/^\/+/, "");

  // Proveedor: una marca conocida o el primer renglón con nombre.
  const esPalabra = (mk) => new RegExp("(^|[^A-Z])" + mk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^A-Z])").test(T);
  let proveedor = MARCAS.find(esPalabra) || "";
  // Siglas se quedan en mayúsculas; los nombres van como «Bodega Aurrera».
  if (proveedor && !/^(OXXO|HEB|H-E-B|CFE|AT&T|G500|7-ELEVEN|7 ELEVEN|OXXO GAS)$/.test(proveedor)) {
    proveedor = proveedor.toLowerCase().replace(/(^|[\s-])(\S)/g, (a) => a.toUpperCase());
  }
  if (!proveedor) proveedor = lineas.find((l) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/.test(l) && !/RFC|FECHA|TICKET|\d{6}/i.test(l)) || "";
  const razon = lineas.find((l) => /\b(S\.?\s?A\.?|S\.? ?DE R\.?L\.?|S\.?A\.?P\.?I\.?)\b/i.test(l)) || "";

  return {
    proveedor: proveedor.slice(0, 60),
    emisor_razon_social: razon,
    emisor_rfc: rfc,
    fecha, total, folio, tienda, campos_extra,
    portal_url,
    portal_fuente: portal_url ? "ticket" : "no_encontrado",
    texto: texto.trim(),
    notas: "Leído gratis en tu celular: revisa que los datos estén bien y corrígelos si hace falta.",
  };
}
