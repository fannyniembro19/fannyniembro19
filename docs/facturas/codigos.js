// Lee códigos de barras y QR de la foto del ticket (gratis, en el celular).
// Primero con el lector que trae Chrome en Android; si no hay, con ZXing.

const ZXING_URL = "https://cdn.jsdelivr.net/npm/zxing-wasm@2.2.4/dist/es/reader/index.js";

export async function leerCodigos(archivo) {
  const vistos = new Map();
  const agregar = (formato, texto) => { if (texto && !vistos.has(texto)) vistos.set(texto, { formato, texto }); };

  try {
    if ("BarcodeDetector" in window) {
      const formatos = await window.BarcodeDetector.getSupportedFormats();
      if (formatos.length) {
        const detector = new window.BarcodeDetector({ formats: formatos });
        const imagen = await createImageBitmap(archivo);
        for (const c of await detector.detect(imagen)) agregar(c.format, c.rawValue);
      }
    }
  } catch (e) { console.warn("BarcodeDetector falló", e); }

  if (!vistos.size) {
    try {
      const { readBarcodes } = await import(ZXING_URL);
      const r = await readBarcodes(archivo, { tryHarder: true, maxNumberOfSymbols: 4 });
      for (const c of r) if (c.isValid) agregar(c.format, c.text);
    } catch (e) { console.warn("ZXing falló", e); }
  }
  return [...vistos.values()];
}

// Usa lo que traen los códigos para completar o corregir los datos leídos del texto.
export function aplicarCodigos(datos, codigos) {
  if (!codigos.length) return datos;
  datos.codigos = codigos;
  datos.texto = (datos.texto || "") + "\n\n— códigos de barras / QR —\n" + codigos.map((c) => `${c.formato}: ${c.texto}`).join("\n");

  for (const { texto } of codigos) {
    const limpio = texto.trim();
    // Número largo (18 a 26 dígitos): en Walmart es el TC («Número de Ticket»). El código no se equivoca: manda.
    if (/^\d{18,26}$/.test(limpio) && /walmart|aurrera|sam/i.test(datos.proveedor + " " + datos.portal_url)) {
      const tc = datos.campos_extra.find((c) => c.etiqueta === "TC");
      if (tc) tc.valor = limpio; else datos.campos_extra.unshift({ etiqueta: "TC", valor: limpio });
    }
    // QR con dirección de internet: si es de facturación (o no teníamos otra), es la página para facturar.
    const url = limpio.match(/^https?:\/\/\S+/i);
    if (url && (/factur/i.test(url[0]) || !datos.portal_url)) {
      datos.portal_url = url[0];
      datos.portal_fuente = "qr";
    }
  }
  return datos;
}
