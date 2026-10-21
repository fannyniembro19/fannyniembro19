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

const WALMART = "https://facturacion-clientes.walmart.com/ticket";

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
    let datos = null, primera = null;
    const textos = [];
    // Si el papel está acostado probamos girándolo a un lado y, si no se entiende, al otro.
    const { acostado } = await realzar(imagen, { soloOrientacion: true });
    let giro = 0;
    if (acostado) {
      const conf = async (g) => (await worker.recognize(await realzar(imagen, { giro: g }))).data.confidence;
      const c90 = await conf(90);
      giro = c90 >= 50 || c90 >= (await conf(270)) ? 90 : 270;
    }
    pasadas.forEach((p) => { p.giro = giro; });
    for (; pasada < pasadas.length; pasada++) {
      const prep = await realzar(imagen, pasadas[pasada]);
      const { data } = await worker.recognize(prep, {}, { text: true, blocks: true });
      if (!primera) primera = { prep, data };
      const texto = data.text || "";
      textos.push(texto);
      datos = datos ? juntar(datos, datosDelTexto(texto)) : datosDelTexto(texto);
      if (completo(datos)) break;
    }
    // Walmart: volvemos a leer, agrandados y solo con números, el renglón del TC y el de arriba (TR).
    if (esWalmart(datos)) {
      pasada = 2;
      try {
        const r = await leerCodigosWalmart(worker, primera.prep, renglones(primera.data), { TC: extra(datos, "TC"), TR: extra(datos, "TR") });
        if (r.TC) ponerExtra(datos, "TC", r.TC);
        if (r.TR) ponerExtra(datos, "TR", r.TR);
        datos.recortes = { TC: r.imgTC, TR: r.imgTR };
        if (r.texto) textos.push(r.texto);
      } catch (e) { console.warn("Lectura fina de Walmart falló", e); }
    }
    datos.texto = textos.map((t) => t.trim()).join("\n\n— otra lectura —\n\n");
    return datos;
  })();
  try {
    return await Promise.race([trabajo, fallo]);
  } finally {
    if (worker) worker.terminate().catch(() => {});
  }
}

const esWalmart = (d) => /^(Walmart|Bodega Aurrera|Sam's Club)$/.test(d.proveedor) || d.portal_url === WALMART;
const extra = (d, et) => (d.campos_extra.find((c) => c.etiqueta === et) || {}).valor || "";
function ponerExtra(d, et, valor) {
  const ya = d.campos_extra.find((c) => c.etiqueta === et);
  if (ya) ya.valor = valor; else d.campos_extra.unshift({ etiqueta: et, valor });
  d.campos_extra.sort((a, b) => (["TC", "TR"].indexOf(a.etiqueta) + 1 || 9) - (["TC", "TR"].indexOf(b.etiqueta) + 1 || 9));
}
function completo(d) {
  if (esWalmart(d)) return Boolean(d.total && extra(d, "TC") && extra(d, "TR"));
  return Boolean(d.fecha && d.total && (d.folio || d.campos_extra.length));
}

function renglones(data) {
  const ls = [];
  for (const b of data.blocks || []) for (const p of b.paragraphs || []) for (const l of p.lines || []) ls.push(l);
  return ls.sort((a, b) => a.bbox.y0 - b.bbox.y0);
}

async function leerCodigosWalmart(worker, prepUrl, ls, general = {}) {
  const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = prepUrl; });
  const digitos = (l) => (l.text.replace(/\s/g, "").match(/\d+/g) || []).reduce((m, x) => Math.max(m, x.length), 0);
  // El TC es el renglón con el número más largo (15 o más dígitos seguidos); el TR va justo arriba.
  let iTC = -1;
  ls.forEach((l, i) => { if (digitos(l) >= 15 && (iTC < 0 || digitos(l) > digitos(ls[iTC]))) iTC = i; });
  if (iTC < 0) return {};
  const iTR = iTC - 1;

  // Franja un poco más alta que el renglón: los tickets casi siempre salen algo inclinados.
  const banda = (bbox, holgura, esc = 1) => {
    const alto = Math.max(8, bbox.y1 - bbox.y0), pad = Math.round(alto * holgura);
    const y0 = Math.max(0, bbox.y0 - pad), y1 = Math.min(img.height, bbox.y1 + pad);
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * esc); c.height = Math.round((y1 - y0) * esc);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, y0, img.width, y1 - y0, 0, 0, c.width, c.height);
    return c;
  };
  const leer = async (bbox, lista, psm, holgura, altoMeta = 70) => {
    const alto = Math.max(8, bbox.y1 - bbox.y0);
    await worker.setParameters({ tessedit_char_whitelist: lista, tessedit_pageseg_mode: psm });
    const { data } = await worker.recognize(banda(bbox, holgura, Math.max(1, Math.min(5, altoMeta / alto))));
    return (data.text || "").trim();
  };
  // Pedacito de la foto para que la persona compare con lo leído.
  const recorte = (bbox) => {
    const c = banda(bbox, 0.6, Math.min(1, 900 / img.width));
    const url = c.toDataURL("image/jpeg", 0.8);
    c.width = c.height = 0;
    return url;
  };
  // Cada lectura suele fallar en un dígito distinto: votamos posición por posición.
  // Si una posición empata, decide la lectura que más coincide con las demás.
  // `largoUsual`: cuántos dígitos trae normalmente (TC 21, TR 5); si alguna lectura lo tiene, se usa ese.
  const votar = (vals, largoUsual) => {
    vals = vals.filter(Boolean);
    if (vals.length < 2) return vals[0] || "";
    const largos = new Map();
    vals.forEach((v) => largos.set(v.length, (largos.get(v.length) || 0) + 1));
    const L = largos.has(largoUsual) ? largoUsual : [...largos].sort((a, b) => b[1] - a[1])[0][0];
    const iguales = vals.filter((v) => v.length === L);
    if (iguales.length < 2) return iguales[0];
    const acuerdo = (v) => iguales.reduce((n, w) => n + [...v].filter((ch, i) => ch === w[i]).length, 0);
    const guia = iguales.reduce((a, b) => (acuerdo(b) > acuerdo(a) ? b : a));
    let res = "";
    for (let i = 0; i < L; i++) {
      const cuenta = {};
      iguales.forEach((v) => { cuenta[v[i]] = (cuenta[v[i]] || 0) + 1; });
      const max = Math.max(...Object.values(cuenta));
      const ganadores = Object.keys(cuenta).filter((k) => cuenta[k] === max);
      res += ganadores.length === 1 ? ganadores[0] : guia[i];
    }
    return res;
  };
  const tcDe = (t) => {
    const largo = (t.replace(/\s/g, "").match(/\d{15,30}/g) || []).sort((a, b) => b.length - a.length)[0] || "";
    // «TC#» a veces se lee como números pegados al inicio (4, 64, 164…): el TC de Walmart trae 21 dígitos.
    return largo.length > 21 ? largo.slice(-21) : largo;
  };
  const trDe = (t) => {
    for (const linea of t.split("\n")) {
      const m = linea.replace(/\s+/g, " ").match(/T?R\s*[#EHN]?\s*([0-9OD]{4,6})\s*$/) || linea.replace(/\s+/g, " ").match(/TR\s*[#EHN]?\s*([0-9OD]{4,6})\b/);
      if (m) return m[1].replace(/[OD]/g, "0");
    }
    return "";
  };

  const r = { textos: [] };
  try {
    const bTC = ls[iTC].bbox;
    const tc1 = await leer(bTC, "TC#0123456789 ", "7", 0.4);
    const tc2 = await leer(bTC, "0123456789", "7", 0.7);
    const tc3 = await leer(bTC, "0123456789", "7", 0.5, 110);
    r.textos.push(tc1, tc2, tc3);
    r.TC = votar([tcDe(general.TC || ""), tcDe(tc1), tcDe(tc2), tcDe(tc3)], 21);
    r.imgTC = recorte(bTC);
    if (iTR >= 0) {
      const bTR = ls[iTR].bbox;
      const tr1 = await leer(bTR, "TRDAOPE#0123456789 ", "6", 0.9);
      const tr2 = await leer(bTR, "TRDAOPE#0123456789 ", "7", 0.5);
      const tr3 = await leer(bTR, "TRDAOPE#0123456789 ", "6", 0.9, 110);
      r.textos.unshift(tr1, tr2, tr3);
      r.TR = votar([trDe(tr1), trDe(tr3), trDe(tr2), general.TR], 5);
      r.imgTR = recorte(bTR);
    }
  } finally {
    await worker.setParameters({ tessedit_char_whitelist: "", tessedit_pageseg_mode: "3" });
  }
  r.texto = r.textos.join("\n");
  return r;
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

    // Ticket acostado (foto tomada de lado): hay que girarlo para leerlo.
    const giro = op.giro ?? 0;
    if (op.soloOrientacion) { c0.width = c0.height = 0; return { acostado: caja.w > caja.h * 1.15 }; }
    const anchoPapel = giro % 180 ? caja.h : caja.w;

    // 2) Ancho de trabajo: ~1400 px de papel.
    const escala = Math.min(3, Math.max(1, (op.ancho || 1400) / anchoPapel));
    const dw = Math.round(caja.w * escala), dh = Math.round(caja.h * escala);
    const [cw, ch] = giro % 180 ? [dh, dw] : [dw, dh];
    const c = document.createElement("canvas"); c.width = cw; c.height = ch;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.translate(cw / 2, ch / 2);
    ctx.rotate((giro * Math.PI) / 180);
    ctx.drawImage(c0, caja.x, caja.y, caja.w, caja.h, -dw / 2, -dh / 2, dw, dh);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const px = ctx.getImageData(0, 0, cw, ch);
    // En pruebas con tickets reales, gris con contraste leyó mejor que blanco y negro puro.
    if (op.modo === "byn") binarizar(px.data, cw, ch, umbral, op.k || 0.88); else estirar(px.data);
    ctx.putImageData(px, 0, 0);
    c0.width = c0.height = 0; // libera la memoria de la foto grande
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

// Columnas y renglones donde predomina el papel (claro). Funciona con el ticket parado o acostado.
function cajaDelPapel(g, W, H, umbral) {
  const tramo = (fr, thr) => {
    let mejorIni = 0, mejorLen = 0, ini = -1;
    for (let i = 0; i <= fr.length; i++) {
      if (i < fr.length && fr[i] > thr) { if (ini < 0) ini = i; }
      else if (ini >= 0) { if (i - ini > mejorLen) { mejorLen = i - ini; mejorIni = ini; } ini = -1; }
    }
    return [mejorIni, mejorLen];
  };
  const paso = Math.max(1, Math.round(Math.max(W, H) / 800));
  const cols = (y0, y1) => { const f = new Float32Array(W); for (let x = 0; x < W; x++) { let b = 0, n = 0; for (let y = y0; y < y1; y += paso) { n++; if (g[y * W + x] > umbral) b++; } f[x] = b / n; } return f; };
  const rens = (x0, x1) => { const f = new Float32Array(H); for (let y = 0; y < H; y++) { let b = 0, n = 0; for (let x = x0; x < x1; x += paso) { n++; if (g[y * W + x] > umbral) b++; } f[y] = b / n; } return f; };
  const max = (f) => f.reduce((m, v) => Math.max(m, v), 0);

  const c1 = cols(0, H);
  let [x, w] = tramo(c1, Math.max(0.15, max(c1) * 0.5));
  if (w < W * 0.1) return { x: 0, y: 0, w: W, h: H };
  const r1 = rens(x, x + w);
  let [y, h] = tramo(r1, Math.max(0.3, max(r1) * 0.6));
  if (h < H * 0.1) { y = 0; h = H; }
  const c2 = cols(y, y + h);
  const [x2, w2] = tramo(c2, Math.max(0.3, max(c2) * 0.6));
  if (w2 > W * 0.1) { x = x2; w = w2; }
  const m = Math.round(Math.min(W, H) * 0.01);
  x = Math.max(0, x - m); y = Math.max(0, y - m);
  w = Math.min(W - x, w + 2 * m); h = Math.min(H - y, h + 2 * m);
  return { x, y, w, h };
}

// Umbral local (Bradley): cada píxel se compara con el promedio de su zona.
function binarizar(d, W, H, umbralPapel, k) {
  const g = grises(d);
  const integ = new Uint32Array((W + 1) * (H + 1));
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

  // Si SUBTOTAL e IMPORTE coinciden y TOTAL no, el TOTAL se leyó mal (p. ej. «$195» como «3195»).
  const enRenglon = (re) => { const l = LT.find((x) => re.test(x)); return l ? importe(l.slice(l.search(re))) : ""; };
  const sub = enRenglon(/\bSUB ?-?TOTAL\b/), pago = enRenglon(/\bIMPORTE\b/);
  if (sub && sub === pago && total !== sub) total = sub;

  const valorTras = (re) => { const x = T.match(re); return x ? x[1] : ""; };
  // Los valores siempre llevan al menos un número (así no tomamos palabras como «ATENDIMOS»).
  const COD = "((?=[A-Z0-9-]*\\d)[A-Z0-9][A-Z0-9-]*)";
  const folio = valorTras(new RegExp("\\b(?:FOLIO|F0LIO|TICKET|TIKET|TKT|TRANSACCION|TRANSAC|TRANS|TRX|NO\\.? ?(?:DE )?(?:VENTA|TICKET|OPERACION)|OPERACION|NOTA|ORDEN|CONSECUTIVO)\\b\\.?\\s*(?:NO\\.?|NUM\\.?|#)?\\s*[:#]?\\s*" + COD));
  const tienda = valorTras(new RegExp("\\b(?:TIENDA|SUCURSAL|SUC|ESTACION|EST|TDA|UNIDAD|ESTABLECIMIENTO)\\b\\.?\\s*(?:NO\\.?|NUM\\.?|#)?\\s*[:#]?\\s*" + COD));

  // Códigos especiales que piden algunos portales.
  const campos_extra = [];
  const reExtra = /\b(TR|TC|TE|TDA|CAJA|WEB ?ID|ID WEB|REFERENCIA|REF|CODIGO DE FACTURACION|CODIGO FACTURACION|ID DE FACTURACION|ID FACTURACION)\b\.?\s*[:#]?\s*((?=[A-Z0-9-]*\d)[A-Z0-9][A-Z0-9-]*)/g;
  for (const x of T.matchAll(reExtra)) {
    if (!campos_extra.some((c) => c.etiqueta === x[1])) campos_extra.push({ etiqueta: x[1], valor: x[2] });
  }

  // Códigos con «#» (Walmart, Bodega Aurrera, Sam's): el lector suele leer «#» como H, N, M o Y,
  // y confunde letras con números (O→0, S→5...).
  const aNumero = (v) => v.replace(/[ODQ]/g, "0").replace(/[IL|]/g, "1").replace(/Z/g, "2").replace(/S/g, "5").replace(/G/g, "6").replace(/B/g, "8").replace(/[YJ]/g, "9");
  const gato = "\\s*[#HNMY?]?\\s*";
  const codigos = [
    ["TC", new RegExp("\\b[T1I][CG](\\s*[#HNMY?]?\\s*)(\\d{15,26})")],
    ["TR", new RegExp("\\b[T1I][RK]" + gato + "([0-9ODQSILYJ]{4,6})\\b")],
    ["TDA", new RegExp("\\b[T1I]?[D0O]?A[#HNMY]\\s*([0-9ODQSIL]{3,5})\\b")],
    ["TE", new RegExp("\\bT[EF][#HNMY]\\s*([0-9ODQSIL]{2,4})\\b")],
  ];
  for (const [etiqueta, re] of codigos) {
    const x = T.match(re);
    if (!x) continue;
    let valor = aNumero(x[x.length - 1]);
    // El «#» de «TC#» a veces se lee como un 4 pegado al número: «TC4214…» en vez de «TC#214…».
    if (etiqueta === "TC" && !/[#HNMY?]/.test(x[1]) && valor.length >= 22 && valor[0] === "4") valor = valor.slice(1);
    const ya = campos_extra.find((c) => c.etiqueta === etiqueta);
    if (ya) ya.valor = valor; else campos_extra.push({ etiqueta, valor });
  }
  // TC de Walmart: número largo solo en su renglón aunque no se lea la etiqueta.
  if (!campos_extra.some((c) => c.etiqueta === "TC")) {
    const largo = LT.map((l) => l.replace(/[^0-9A-Z]/g, "")).map((l) => (l.match(/\d{18,26}/) || [])[0]).find(Boolean);
    if (largo && /WALMART|WAL MART|AURRERA|SAM'?S/.test(T)) campos_extra.push({ etiqueta: "TC", valor: largo });
  }
  // TR de Walmart: es el último código del renglón «TDA#… OP#… TE#… TR#…».
  if (!campos_extra.some((c) => c.etiqueta === "TR") && /WALMART|WAL MART|AURRERA|SAM'?S/.test(T)) {
    const renglon = LT.find((l) => [/\b[O0]P\W?[#HNMY]?/, /\bT[EF]\W?[#HNMY]/, /D?A[#HNMY]\s*\d/, /OP.?\d{3}/].filter((r) => r.test(l)).length >= 2);
    const ult = renglon && renglon.trim().split(/\s+/).pop();
    const m = ult && ult.match(/([0-9ODQSILYJ]{5})$/);
    if (m) campos_extra.push({ etiqueta: "TR", valor: aNumero(m[1]) });
  }
  // Primero los que pide Walmart.
  const orden = ["TC", "TR"];
  campos_extra.sort((a, b) => (orden.indexOf(a.etiqueta) + 1 || 9) - (orden.indexOf(b.etiqueta) + 1 || 9));
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
