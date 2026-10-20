// Lectura GRATIS del ticket, dentro del celular (sin clave ni internet de pago).
// Tesseract.js reconoce el texto; luego buscamos los datos con reglas.

const TESSERACT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.esm.min.js";

// Nombres que aparecen en tickets de cadenas comunes (los más específicos primero).
const MARCAS = [
  "OXXO GAS", "OXXO", "BODEGA AURRERA", "WALMART", "WAL-MART", "SAM'S CLUB", "SAMS CLUB", "COSTCO",
  "WAL MART", "SORIANA", "CHEDRAUI", "LA COMER", "CITY MARKET", "FRESKO", "HEB", "H-E-B", "SMART", "ALSUPER", "CASA LEY",
  "HOME DEPOT", "OFFICE DEPOT", "OFFICEMAX", "LIVERPOOL", "SUBURBIA", "COPPEL", "SEARS", "SANBORNS", "ELEKTRA",
  "FARMACIAS GUADALAJARA", "FARMACIA GUADALAJARA", "FARMACIAS DEL AHORRO", "FARMACIA DEL AHORRO",
  "FARMACIAS BENAVIDES", "FARMACIAS SIMILARES", "FARMACIAS SAN PABLO",
  "7-ELEVEN", "7 ELEVEN", "CIRCLE K", "TIENDAS EXTRA", "KIOSKO",
  "PEMEX", "G500", "MOBIL", "SHELL", "HIDROSINA", "TOTAL ENERGIES",
  "STARBUCKS", "MCDONALD", "BURGER KING", "DOMINO", "LITTLE CAESARS", "VIPS", "TOKS", "SANBORNS CAFE",
  "CINEPOLIS", "CINEMEX", "TELCEL", "TELMEX", "AT&T", "CFE", "AUTOZONE", "TRUPER", "DEL SOL", "WOOLWORTH",
];

const WALMART = "https://facturacion.walmartmexico.com.mx/";

// Lee el ticket completo: una pasada en gris y, si faltan datos clave, otra en blanco y negro.
// `imagen` es una dirección de imagen (blob: o data:), de preferencia la foto en tamaño original.
export async function leerTicketGratis(imagen, alAvanzar) {
  const { default: Tesseract } = await import(TESSERACT_URL);
  let worker, pasada = 0;
  const pasadas = [{}, { modo: "byn", k: 0.88 }];
  // Si algo falla dentro del lector (p. ej. sin internet al bajar el idioma), no dejamos la app esperando.
  let alFallar;
  const fallo = new Promise((_, mal) => {
    alFallar = () => mal(new Error("No pude preparar el lector. Revisa tu internet e intenta otra vez."));
    setTimeout(alFallar, 240000);
  });
  const trabajo = (async () => {
    worker = await Tesseract.createWorker("spa", 1, {
      logger: (m) => {
        if (m.status === "recognizing text" && alAvanzar) alAvanzar(pasada, Math.round(m.progress * 100));
      },
      errorHandler: () => alFallar(),
    });
    let datos = null, textos = [];
    for (; pasada < pasadas.length; pasada++) {
      const { data } = await worker.recognize(await realzar(imagen, pasadas[pasada]));
      const texto = data.text || "";
      textos.push(texto);
      datos = datos ? juntar(datos, datosDelTexto(texto)) : datosDelTexto(texto);
      if (datos.fecha && datos.total && (datos.folio || datos.campos_extra.length)) break;
    }
    datos.texto = textos.map((t) => t.trim()).join("\n\n— segunda lectura —\n\n");
    return datos;
  })();
  try {
    return await Promise.race([trabajo, fallo]);
  } finally {
    if (worker) worker.terminate().catch(() => {});
  }
}

// Completa lo que falte en `a` con lo que encontró `b`.
function juntar(a, b) {
  for (const k of ["proveedor", "emisor_razon_social", "emisor_rfc", "fecha", "total", "folio", "tienda"]) if (!a[k] && b[k]) a[k] = b[k];
  if (a.portal_fuente !== "ticket" && b.portal_fuente === "ticket") { a.portal_url = b.portal_url; a.portal_fuente = "ticket"; }
  if (!a.portal_url && b.portal_url) { a.portal_url = b.portal_url; a.portal_fuente = b.portal_fuente; }
  for (const c of b.campos_extra) if (!a.campos_extra.some((x) => x.etiqueta === c.etiqueta)) a.campos_extra.push(c);
  return a;
}

// Preparamos la foto para el lector:
// 1) recortamos solo el papel (lo más claro de la foto) para ignorar la mesa o el mantel,
// 2) lo agrandamos si quedó chico y 3) lo pasamos a blanco y negro según la luz de cada zona.
export async function realzar(imagen, op = {}) {
  try {
    const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = imagen; });
    const W = img.width, H = img.height;
    const c0 = document.createElement("canvas"); c0.width = W; c0.height = H;
    const x0 = c0.getContext("2d"); x0.drawImage(img, 0, 0);
    const g = grises(x0.getImageData(0, 0, W, H).data);

    // 1) Recorte del papel.
    const umbral = otsu(g);
    const caja = cajaDelPapel(g, W, H, umbral);

    // 2) Ancho de trabajo: ~1400 px de papel.
    const escala = Math.min(3, Math.max(1, (op.ancho || 1400) / caja.w));
    const cw = Math.round(caja.w * escala), ch = Math.round(caja.h * escala);
    const c = document.createElement("canvas"); c.width = cw; c.height = ch;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(c0, caja.x, caja.y, caja.w, caja.h, 0, 0, cw, ch);
    const px = ctx.getImageData(0, 0, cw, ch);
    // En pruebas con tickets reales, gris con contraste leyó mejor que blanco y negro puro.
    if (op.modo === "byn") binarizar(px.data, cw, ch, umbral, op.k || 0.88); else estirar(px.data);
    ctx.putImageData(px, 0, 0);
    return c.toDataURL("image/png");
  } catch (e) {
    return imagen;
  }
}

function estirar(d) {
  const g = grises(d);
  const h = new Uint32Array(256);
  for (const v of g) h[v]++;
  const corte = (frac) => { let a = 0; for (let v = 0; v < 256; v++) { a += h[v]; if (a >= g.length * frac) return v; } return 255; };
  const bajo = corte(0.02), alto = corte(0.98), rango = Math.max(1, alto - bajo);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, ((g[j] - bajo) * 255) / rango));
}

function grises(d) {
  const g = new Uint8Array(d.length / 4);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) g[j] = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
  return g;
}

function otsu(g) {
  const h = new Float64Array(256);
  for (const v of g) h[v]++;
  let suma = 0; for (let v = 0; v < 256; v++) suma += v * h[v];
  let sB = 0, wB = 0, mejor = 0, t = 128;
  for (let v = 0; v < 256; v++) {
    wB += h[v]; if (!wB) continue;
    const wF = g.length - wB; if (!wF) break;
    sB += v * h[v];
    const mB = sB / wB, mF = (suma - sB) / wF, entre = wB * wF * (mB - mF) ** 2;
    if (entre > mejor) { mejor = entre; t = v; }
  }
  return t;
}

// Columnas y renglones donde la mayoría de los píxeles es papel (claro).
function cajaDelPapel(g, W, H, umbral) {
  const tramo = (n, esPapel) => {
    let mejorIni = 0, mejorLen = 0, ini = -1;
    for (let i = 0; i <= n; i++) {
      if (i < n && esPapel(i)) { if (ini < 0) ini = i; }
      else if (ini >= 0) { if (i - ini > mejorLen) { mejorLen = i - ini; mejorIni = ini; } ini = -1; }
    }
    return [mejorIni, mejorLen];
  };
  const paso = Math.max(1, Math.round(Math.max(W, H) / 800));
  const fracCol = (x, y0, y1) => { let b = 0, n = 0; for (let y = y0; y < y1; y += paso) { n++; if (g[y * W + x] > umbral) b++; } return b / n; };
  const fracRen = (y, x0, x1) => { let b = 0, n = 0; for (let x = x0; x < x1; x += paso) { n++; if (g[y * W + x] > umbral) b++; } return b / n; };
  let [x, w] = tramo(W, (i) => fracCol(i, 0, H) > 0.35);
  if (w < W * 0.15) return { x: 0, y: 0, w: W, h: H };
  let [y, h] = tramo(H, (i) => fracRen(i, x, x + w) > 0.5);
  if (h < H * 0.15) { y = 0; h = H; }
  // Segunda pasada de columnas ya solo en los renglones del papel.
  const [x2, w2] = tramo(W, (i) => fracCol(i, y, y + h) > 0.6);
  if (w2 > W * 0.15) { x = x2; w = w2; }
  const m = Math.round(Math.min(W, H) * 0.01);
  x = Math.max(0, x - m); y = Math.max(0, y - m);
  w = Math.min(W - x, w + 2 * m); h = Math.min(H - y, h + 2 * m);
  return { x, y, w, h };
}

// Umbral local (Bradley): cada píxel se compara con el promedio de su zona.
function binarizar(d, W, H, umbralPapel, k) {
  const g = grises(d);
  const integ = new Float64Array((W + 1) * (H + 1));
  for (let y = 1; y <= H; y++) {
    let fila = 0;
    for (let x = 1; x <= W; x++) {
      fila += g[(y - 1) * W + (x - 1)];
      integ[y * (W + 1) + x] = integ[(y - 1) * (W + 1) + x] + fila;
    }
  }
  const r = Math.max(8, Math.round(W / 40));
  for (let y = 0; y < H; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(H, y + r);
    for (let x = 0; x < W; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(W, x + r);
      const area = (x1 - x0) * (y1 - y0);
      const sum = integ[y1 * (W + 1) + x1] - integ[y0 * (W + 1) + x1] - integ[y1 * (W + 1) + x0] + integ[y0 * (W + 1) + x0];
      const media = sum / area;
      // Fuera del papel (zona oscura en promedio) dejamos blanco para no inventar letras.
      const v = media < umbralPapel ? 255 : (g[y * W + x] < media * k ? 0 : 255);
      const i = (y * W + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
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

  // Si no hubo renglón TOTAL legible: IMPORTE (pago con tarjeta) o SUBTOTAL.
  for (const etiqueta of [/\bIMPORTE\b/, /\bSUB ?-?TOTAL\b/]) {
    if (total) break;
    const l = LT.find((x) => etiqueta.test(x));
    if (l) total = importe(l.slice(l.search(etiqueta)));
  }

  const valorTras = (re) => { const x = T.match(re); return x ? x[1] : ""; };
  // Los valores siempre llevan al menos un número (así no tomamos palabras como «ATENDIMOS»).
  const COD = "((?=[A-Z0-9-]*\\d)[A-Z0-9][A-Z0-9-]*)";
  const folio = valorTras(new RegExp("\\b(?:FOLIO|F0LIO|TICKET|TIKET|TKT|TRANSACCION|TRANSAC|TRANS|TRX|NO\\.? ?(?:DE )?(?:VENTA|TICKET|OPERACION)|OPERACION|NOTA|ORDEN|CONSECUTIVO)\\b\\.?\\s*(?:NO\\.?|NUM\\.?|#)?\\s*[:#]?\\s*" + COD));
  const tienda = valorTras(new RegExp("\\b(?:TIENDA|SUCURSAL|SUC|ESTACION|EST|TDA|UNIDAD|ESTABLECIMIENTO)\\b\\.?\\s*(?:NO\\.?|NUM\\.?|#)?\\s*[:#]?\\s*" + COD));

  // Códigos especiales que piden algunos portales.
  const campos_extra = [];
  const reExtra = /\b(TR|TC|TE|TDA|CAJA|WEB ?ID|ID WEB|REFERENCIA|REF|CODIGO DE FACTURACION|CODIGO FACTURACION|ID DE FACTURACION|ID FACTURACION|AUTORIZACION|AUT)\b\.?\s*[:#]?\s*((?=[A-Z0-9-]*\d)[A-Z0-9][A-Z0-9-]*)/g;
  for (const x of T.matchAll(reExtra)) {
    if (!campos_extra.some((c) => c.etiqueta === x[1])) campos_extra.push({ etiqueta: x[1], valor: x[2] });
  }

  // Códigos con «#» (Walmart, Bodega Aurrera, Sam's): el lector suele leer «#» como H, N, M o Y,
  // y confunde letras con números (O→0, S→5...).
  const aNumero = (v) => v.replace(/[ODQ]/g, "0").replace(/[IL|]/g, "1").replace(/Z/g, "2").replace(/S/g, "5").replace(/G/g, "6").replace(/B/g, "8").replace(/Y/g, "9");
  const gato = "\\s*[#HNMY?]?\\s*";
  const codigos = [
    ["TC", new RegExp("\\b[T1I][CG]" + gato + "(\\d{15,26})")],
    ["TR", new RegExp("\\bT[RK]" + gato + "([0-9ODQSILY]{4,6})\\b")],
    ["TDA", new RegExp("\\b[T1I]?[D0O]?A[#HNMY]\\s*([0-9ODQSIL]{3,5})\\b")],
    ["TE", new RegExp("\\bT[EF][#HNMY]\\s*([0-9ODQSIL]{2,4})\\b")],
  ];
  for (const [etiqueta, re] of codigos) {
    const x = T.match(re);
    if (!x) continue;
    const valor = aNumero(x[1]);
    const ya = campos_extra.find((c) => c.etiqueta === etiqueta);
    if (ya) ya.valor = valor; else campos_extra.push({ etiqueta, valor });
  }
  // TC de Walmart: número largo solo en su renglón aunque no se lea la etiqueta.
  if (!campos_extra.some((c) => c.etiqueta === "TC")) {
    const largo = LT.map((l) => l.replace(/[^0-9A-Z]/g, "")).map((l) => (l.match(/\d{18,26}/) || [])[0]).find(Boolean);
    if (largo && /WALMART|WAL MART|AURRERA|SAM'?S/.test(T)) campos_extra.push({ etiqueta: "TC", valor: largo });
  }
  const tdaWalmart = campos_extra.find((c) => c.etiqueta === "TDA");

  // Página de facturación impresa en el ticket (preferimos la que esté cerca de «factur»).
  const reUrl = /((?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|mx|net|org|com\.mx)(?:\/[^\s]*)?)/i;
  let portal_url = "";
  for (let i = 0; i < lineas.length; i++) {
    // El lector a veces separa la dirección: «Www .oxxo .com/ facturacion»
    const u = lineas[i].replace(/\s*([./])\s*/g, "$1").match(reUrl);
    if (!u) continue;
    // Solo direcciones de facturación (no la de encuestas o promociones).
    const cerca = [LT[i - 1], LT[i], LT[i + 1]].join(" ");
    if (/FACTUR/.test(cerca) || /factur/i.test(u[1])) { portal_url = u[1]; break; }
  }
  portal_url = portal_url.toLowerCase();
  if (portal_url && !/^https?:\/\//.test(portal_url)) portal_url = "https://" + portal_url.replace(/^\/+/, "");

  // Proveedor: una marca conocida o el primer renglón con nombre.
  const esPalabra = (mk) => new RegExp("(^|[^A-Z])" + mk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^A-Z])").test(T);
  let proveedor = MARCAS.find(esPalabra) || "";
  const NOMBRES = { "WAL-MART": "Walmart", "WAL MART": "Walmart", "SAMS CLUB": "Sam's Club", "SAM'S CLUB": "Sam's Club", "H-E-B": "HEB", "7 ELEVEN": "7-Eleven", "7-ELEVEN": "7-Eleven" };
  if (NOMBRES[proveedor]) proveedor = NOMBRES[proveedor];
  // Siglas se quedan en mayúsculas; los nombres van como «Bodega Aurrera».
  if (proveedor && proveedor === proveedor.toUpperCase() && !/^(OXXO|HEB|CFE|AT&T|G500|OXXO GAS)$/.test(proveedor)) {
    proveedor = proveedor.toLowerCase().replace(/(^|[\s-])(\S)/g, (a) => a.toUpperCase());
  }
  if (!proveedor) proveedor = lineas.find((l) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/.test(l) && !/RFC|FECHA|TICKET|\d{6}/i.test(l)) || "";
  const razon = lineas.find((l) => /\b(S\.?\s?A\.?|S\.? ?DE R\.?L\.?|S\.?A\.?P\.?I\.?)\b/i.test(l)) || "";

  // Portales oficiales que conocemos (si el ticket no trae uno de facturación).
  const PORTALES = { "Walmart": WALMART, "Wal-mart": WALMART, "Bodega Aurrera": WALMART, "Sam's Club": WALMART, "Sams Club": WALMART };
  const portalConocido = PORTALES[proveedor];
  let fuente = portal_url ? "ticket" : "no_encontrado";
  if (portalConocido && !portal_url) { portal_url = portalConocido; fuente = "catalogo"; }

  return {
    proveedor: proveedor.slice(0, 60),
    emisor_razon_social: razon,
    emisor_rfc: rfc,
    fecha, total, folio, tienda: tienda || (tdaWalmart ? tdaWalmart.valor : ""), campos_extra,
    portal_url,
    portal_fuente: fuente,
    texto: texto.trim(),
    notas: "Leído gratis en tu celular: revisa que los datos estén bien y corrígelos si hace falta.",
  };
}
