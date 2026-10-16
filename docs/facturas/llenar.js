/* Marcador «Llenar factura».
   Se ejecuta DENTRO de la página de facturación del proveedor:
   lee los datos que copió la app (portapapeles) y llena los campos que reconoce.
   No envía nada a ningún lado; tú revisas y tocas «Generar». */
(async () => {
  const MARCA = "__factura";

  const leer = (txt) => { try { const d = JSON.parse(txt); return d && d[MARCA] ? d : null; } catch (e) { return null; } };
  let d = null;
  try { d = leer(await navigator.clipboard.readText()); } catch (e) { /* sin permiso */ }
  if (!d) d = leer(prompt("Pega aquí los datos que copiaste en «Mis Facturas»:") || "");
  if (!d) { alert("No encontré los datos. En la app toca «Copiar datos y abrir página» y vuelve a intentar."); return; }

  const norm = (s) => (s || "").toString().toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();

  const fechaPara = (el) => {
    const f = d.fecha || "";
    const m = f.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return f;
    return el.type === "date" ? f : `${m[3]}/${m[2]}/${m[1]}`;
  };

  // Reglas en orden: la primera que coincide gana.
  const reglas = [
    { si: (t, el) => el.type === "email" || /\b(correo|e ?mail)\b/.test(t), valor: () => d.email },
    { si: (t) => /\brfc\b/.test(t) && !/emisor/.test(t), valor: () => d.rfc },
    { si: (t) => /codigo postal|\bc ?p\b|cod postal|domicilio fiscal/.test(t), valor: () => d.cp },
    { si: (t) => /regimen/.test(t), valor: () => d.regimen },
    { si: (t) => /\buso\b/.test(t), valor: () => d.usoCfdi },
    { si: (t) => /razon social|denominacion|\bnombre\b/.test(t) && !/usuario|tienda|sucursal|comercio|estacion/.test(t), valor: () => d.razonSocial },
    { si: (t) => /\b(total|importe|monto)\b/.test(t), valor: () => d.total },
    { si: (t) => /\bfecha\b/.test(t), valor: (el) => fechaPara(el) },
  ];
  // Campos propios de este ticket (TR, TC, caja, web id, ...). Van antes que folio/tienda genéricos.
  for (const x of d.extras || []) {
    const e = norm(x.etiqueta);
    if (!e || !x.valor) continue;
    const re = new RegExp("\\b" + e.replace(/ /g, "\\s*") + "\\b");
    reglas.push({ si: (t) => re.test(t), valor: () => x.valor });
  }
  reglas.push(
    { si: (t) => /\b(tienda|sucursal|estacion|establecimiento)\b/.test(t), valor: () => d.tienda },
    { si: (t) => /folio|ticket|transaccion|referencia|web ?id|codigo de facturacion|operacion|venta/.test(t), valor: () => d.folio },
  );

  const textoDe = (el) => {
    const doc = el.ownerDocument;
    const partes = [el.name, el.id, el.placeholder, el.getAttribute("aria-label"), el.title];
    if (el.id) { const l = doc.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) partes.push(l.textContent); }
    const lab = el.closest("label"); if (lab) partes.push(lab.textContent);
    const by = el.getAttribute("aria-labelledby");
    if (by) by.split(/\s+/).forEach((i) => { const n = doc.getElementById(i); if (n) partes.push(n.textContent); });
    // Texto cercano: el contenedor inmediato si es corto.
    let p = el.parentElement;
    for (let i = 0; i < 2 && p; i++, p = p.parentElement) {
      const t = (p.innerText || "").trim();
      if (t && t.length < 80) { partes.push(t); break; }
    }
    return norm(partes.filter(Boolean).join(" "));
  };

  const poner = (el, v) => {
    const w = el.ownerDocument.defaultView;
    const proto = el instanceof w.HTMLSelectElement ? w.HTMLSelectElement.prototype
      : el instanceof w.HTMLTextAreaElement ? w.HTMLTextAreaElement.prototype
      : w.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
    ["input", "change", "blur"].forEach((n) => el.dispatchEvent(new Event(n, { bubbles: true })));
    el.style.outline = "3px solid #EBC3CD";
    el.style.backgroundColor = "#FCF0F3";
  };

  const elegirOpcion = (sel, v) => {
    const nv = norm(v);
    const op = [...sel.options].find((o) => norm(o.value) === nv)
      || [...sel.options].find((o) => norm(o.text).split(" ").includes(nv))
      || [...sel.options].find((o) => nv.length > 3 && norm(o.text).includes(nv));
    return op ? op.value : null;
  };

  const docs = [document];
  document.querySelectorAll("iframe").forEach((f) => { try { if (f.contentDocument) docs.push(f.contentDocument); } catch (e) { /* otro dominio */ } });

  let llenos = 0;
  for (const doc of docs) {
    for (const el of doc.querySelectorAll("input, select, textarea")) {
      if (el.disabled || el.readOnly) continue;
      if (/^(hidden|password|checkbox|radio|file|submit|button|image|reset)$/.test(el.type)) continue;
      if (!el.offsetParent && el.type !== "date") continue; // invisible
      const t = textoDe(el);
      if (!t) continue;
      const r = reglas.find((x) => x.si(t, el));
      if (!r) continue;
      let v = r.valor(el);
      if (!v) continue;
      if (el.tagName === "SELECT") {
        v = elegirOpcion(el, v);
        if (v == null || el.value === v) continue;
      } else if (el.value && el.value.trim()) {
        continue; // no pisar lo que ya está escrito
      }
      poner(el, String(v));
      llenos++;
    }
  }

  const aviso = document.createElement("div");
  aviso.textContent = llenos
    ? `Llené ${llenos} campo(s) ✨ Revisa, resuelve el captcha y toca Generar.`
    : "No reconocí campos en esta pantalla. Si hay un paso previo, avanza y vuelve a tocar el marcador.";
  aviso.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;" +
    "background:#1F2A44;color:#fff;padding:12px 18px;border-radius:999px;font:500 15px system-ui,sans-serif;" +
    "box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:90vw;text-align:center";
  document.body.appendChild(aviso);
  setTimeout(() => aviso.remove(), 6000);
})();
