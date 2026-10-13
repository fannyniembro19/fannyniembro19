# Menú digital · Nina Míngues Postres en Lata

Menú con fotos, carrito y pedido directo por WhatsApp.

## Qué hace

- Muestra todos los productos con foto, descripción, precio y etiquetas (¡Más vendido!, ¡Nuevo!).
- El cliente agrega latas al carrito (mínimo 4 por sabor; los extras desde 1).
- Con **15 latas o más** aplica solo el **precio de eventos** y muestra cuánto ahorra.
- Pide **nombre, celular, recoger o domicilio, dirección, fecha y forma de pago**.
- La fecha respeta la anticipación (2 días, o 5 para eventos). Los domingos solo se aceptan pedidos de eventos.
- El cliente puede indicar el tipo de evento (boda, bautizo, XV años, cumpleaños...).
- Sección **Postres para tu evento** con botón para cotizar por WhatsApp.
- Baby Shower y Revelación de género muestran la foto azul y la rosa.
- Calcula el **anticipo del 50%**. El envío se cotiza por WhatsApp.
- Al terminar abre WhatsApp con el pedido ya escrito.
- Muestra si está **abierto o cerrado** según el horario de Colima.

## 1. Publicarlo gratis (GitHub Pages)

1. Une (merge) la rama `claude/digital-menu-products-lceuwx` a `main`.
2. En GitHub entra a **Settings → Pages**.
3. En *Source* elige **Deploy from a branch**, rama **main** y carpeta **/docs**. Guarda.
4. En 1 o 2 minutos tu menú queda en:
   **https://fannyniembro19.github.io/fannyniembro19/**

## 2. Conectarlo a Instagram

- **Link en la bio:** Instagram → Editar perfil → *Enlaces* → Agregar enlace externo → pega el link del menú.
- **Historias:** usa el sticker **Enlace** con el link del menú y déjala en tus *Destacadas* como "Menú".
- **Botón de pedido:** en una cuenta profesional, Editar perfil → *Botones de acción* → *Pedir comida* / *Reservar* → link del menú.

## 3. Conectarlo a WhatsApp Business

- **Perfil:** WhatsApp Business → Herramientas para la empresa → Perfil de empresa → *Sitio web* → pega el link.
- **Mensaje de bienvenida:** Herramientas → Mensaje de bienvenida, por ejemplo:
  > ¡Hola! Gracias por escribir a Nina Míngues 💕 Mira nuestro menú y arma tu pedido aquí: https://fannyniembro19.github.io/fannyniembro19/
- **Mensaje de ausencia:** igual, con el link, para cuando estés fuera de horario.
- **Respuesta rápida:** crea `/menu` con el link para mandarlo con un toque.
- **Estados:** comparte el link en tus estados. Se ve con foto gracias a la vista previa.

## 4. Cambiar precios, productos o fotos

Todo está en **`docs/datos.js`**. Ahí puedes:

- Cambiar un **precio**: edita el número en `precio:` o `precioEvento:`.
- Quitar o poner una **etiqueta**: `etiqueta: "Nuevo"` o `etiqueta: "Más vendido"`.
- Marcar algo como **agotado**: agrega `agotado: true,`.
- **Agregar un producto**: copia un bloque `{ ... }` completo y cambia sus datos.
- Cambiar el **horario**, el **WhatsApp** o el **Instagram**: están al inicio del archivo.

**Fotos por opción:** usa `fotosOpcion: { Azul: "img/...", Rosa: "img/..." }`.

**Tipos de evento:** edítalos en `tiposDeEvento`, al inicio del archivo.

**Fotos:** súbelas a `docs/img/productos/` (formato .jpg, idealmente verticales 4:5 y de unos 800 px de ancho) y escribe su ruta en `foto:`. Los productos sin foto muestran el logo.

Desde la página de GitHub puedes editar `datos.js` (ícono del lápiz) y subir fotos (*Add file → Upload files*) sin instalar nada.
