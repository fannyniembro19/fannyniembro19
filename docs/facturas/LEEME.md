# Mis Facturas

App para facturar tus gastos: tomas foto al ticket, Claude detecta el proveedor y
busca su página de facturación, y un marcador llena el formulario con tus datos.

Dirección: **https://fannyniembro19.github.io/fannyniembro19/facturas/**

## Cómo se usa

1. **Mis datos** (una sola vez): RFC, razón social, código postal, régimen, uso de CFDI,
   y email de facturas. La clave de Claude es opcional.
2. Guarda el marcador **Llenar factura** (instrucciones en la misma pantalla).
3. **Ticket** → toma la foto → **Leer ticket**.
4. **Copiar datos y abrir página** → en la página del proveedor toca el marcador.
5. Revisa, resuelve el captcha y toca **Generar**. Marca el ticket como *facturado*.

En el celular, abre la dirección y elige *Agregar a pantalla de inicio* para usarla como app.

## Qué hace y qué no (todavía)

- Lee proveedor, folio, tienda, fecha, total y códigos especiales del ticket (TR, Web ID, etc.).
- Encuentra la página de facturación (impresa en el ticket o buscándola) y la recuerda
  para la próxima vez. Si la corriges a mano, también la recuerda.
- El marcador llena los campos que reconoce y los marca en rosa; no envía nada solo.
- **No** resuelve captchas ni da clic en «Generar»: ese paso lo haces tú (son 2 segundos
  y así no se factura nada por error).
- Todo (tus datos, la key y el historial) se guarda **solo en tu celular**.

## Costo

**Gratis.** Sin clave, el ticket se lee dentro de tu celular (la primera vez baja el lector,
unos segundos). Revisa y corrige los datos antes de facturar.

Opcional: con una clave de Claude (console.anthropic.com, de pago) la lectura es más precisa
y busca sola la página de facturación: aproximadamente 1 a 3 pesos por ticket.

## Archivos

- `index.html`, `estilos.css`, `app.js` — la app.
- `lector.js` — lectura gratis del ticket en el celular.
- `llenar.js` — el código del marcador que llena los formularios.
- `manifest.json`, `icono.svg` — para instalarla como app.
