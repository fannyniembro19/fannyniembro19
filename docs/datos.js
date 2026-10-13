/*
 * ============================================================
 *  DATOS DEL MENÚ — Nina Míngues Postres en Lata
 *  Este es el ÚNICO archivo que necesitas editar para cambiar
 *  precios, productos, fotos, horarios o datos de contacto.
 * ============================================================
 *
 *  Cómo agregar un producto: copia un bloque { ... } completo,
 *  pégalo debajo, y cambia sus datos. No olvides la coma entre bloques.
 *
 *  Campos de cada producto:
 *    id          → nombre corto sin espacios ni acentos (debe ser único)
 *    nombre      → como aparece en el menú
 *    descripcion → texto corto debajo del nombre
 *    precio      → precio normal por lata (solo el número)
 *    precioEvento→ precio por lata en pedidos de 15 latas o más (opcional)
 *    foto        → ruta de la foto dentro de la carpeta img/productos
 *                  (si no hay foto, borra la línea y se muestra el logo)
 *    etiqueta    → "Más vendido" o "Nuevo" (opcional)
 *    peso        → peso aproximado en gramos con envase (opcional)
 *    opciones    → lista de opciones a elegir, ej. ["Azul", "Rosa"] (opcional)
 *    fotosOpcion → una foto por opción, ej. { Azul: "img/...", Rosa: "img/..." }
 *                  (opcional; la tarjeta muestra las fotos lado a lado)
 *    minimo      → cantidad mínima (4 latas del mismo sabor; 1 para extras)
 *    latas       → cuántas latas cuenta cada unidad para el descuento de
 *                  eventos (1 normalmente, 4 para la caja, 0 para extras)
 *    agotado     → pon true para ocultar temporalmente el botón de agregar
 */

window.NEGOCIO = {
  nombre: "Nina Míngues",
  subtitulo: "Postres en lata",
  eslogan: "Postres en lata que celebran grandes momentos",

  // WhatsApp: código de país (52 = México) + 10 dígitos, sin espacios ni signos.
  whatsapp: "523351447649",
  instagram: "ninaminguespostresenlata",
  ciudad: "Colima, México",

  moneda: "$",

  // Reglas de pedido
  minimoLatas: 4,             // por sabor
  latasParaEvento: 15,        // a partir de aquí aplica el precio de eventos
  diasAnticipacion: 2,        // pedidos normales
  diasAnticipacionEvento: 5,  // pedidos de eventos (15+ latas)
  domingoSoloEventos: true,   // domingo cerrado, pero sí se entregan eventos
  anticipo: 50,               // % de anticipo para apartar

  formasDePago: ["Transferencia", "Efectivo"],

  // Tipos de evento que aparecen en la sección de eventos y en el pedido
  tiposDeEvento: [
    "Boda", "Bautizo", "XV años", "Cumpleaños", "Baby shower",
    "Revelación de género", "Primera comunión", "Graduación", "Evento de empresa", "Otro",
  ],

  // Horario (0 = domingo, 1 = lunes ... 6 = sábado). null = cerrado.
  zonaHoraria: "America/Mexico_City",
  horario: {
    0: null,
    1: ["09:00", "20:00"],
    2: ["09:00", "20:00"],
    3: ["09:00", "20:00"],
    4: ["09:00", "20:00"],
    5: ["09:00", "20:00"],
    6: ["10:00", "19:00"],
  },
  horarioTexto: [
    "Lunes a viernes · 9:00 am – 8:00 pm",
    "Sábado · 10:00 am – 7:00 pm",
    "Domingo · cerrado (solo entregas de eventos)",
  ],

  notas: [
    "Cada lata es una porción generosa, mayor a una rebanada tradicional",
    "Precio por lata · 9 cm de alto y 250 ml (postres y bebidas)",
    "Pedido mínimo: 4 latas del mismo sabor",
    "Pedidos con 2 días de anticipación (eventos: 5 días, también en domingo)",
    "Precio especial en pedidos de 15 latas o más",
    "50% de anticipo para apartar tu pedido",
    "El costo de envío depende de tu dirección",
    "Elaborado de forma artesanal con ingredientes de calidad",
  ],

  // Mensaje que se abre al tocar "Cotizar mi evento"
  cotizacionEvento: [
    "Tipo de evento:",
    "Fecha del evento:",
    "Número de latas:",
    "Sabor de latas:",
    "¿Le gustaría sticker o diseño personalizado?:",
    "Lugar de entrega:",
  ],

  // Galería de eventos (fotos en img/eventos)
  galeriaEventos: [
    { foto: "img/eventos/boda-torre.jpg", texto: "Boda · torre de latas con etiqueta personalizada" },
    { foto: "img/eventos/boda-mesa.jpg", texto: "Boda · una lata en cada lugar" },
    { foto: "img/eventos/boda-lattes-hielera.jpg", texto: "Boda · lattes personalizados en hielera" },
    { foto: "img/eventos/mesa-postres.jpg", texto: "Mesa de postres" },
    { foto: "img/eventos/cumple-30.jpg", texto: "Cumpleaños 30" },
    { foto: "img/eventos/cumple-luciana.jpg", texto: "Cumpleaños infantil con sticker personalizado" },
    { foto: "img/eventos/cumple-infantil.jpg", texto: "Cumpleaños · Cake Party" },
    { foto: "img/eventos/boda-detalle.jpg", texto: "Recuerdo de boda" },
    { foto: "img/eventos/hielera-postres.jpg", texto: "Postres en hielera con mucho hielo" },
    { foto: "img/eventos/tina-bebidas-jardin.jpg", texto: "Bebidas heladas en tina" },
    { foto: "img/eventos/hielera-postres-2.jpg", texto: "Listos para llevar a tu evento" },
    { foto: "img/eventos/tina-bebidas.jpg", texto: "Barra de bebidas heladas" },
    { foto: "img/eventos/regalo-maestro.jpg", texto: "Regalo con tarjeta personalizada" },
  ],
};

window.CATEGORIAS = [
  {
    nombre: "Bizcochos",
    productos: [
      {
        id: "vainilla-dulce",
        nombre: "Vainilla & Dulce de Leche",
        descripcion: "Bizcocho de vainilla con dulce de leche.",
        precio: 70, precioEvento: 65, peso: 182,
        foto: "img/productos/vainilla-dulce-de-leche.jpg",
      },
      {
        id: "chocolate-tradicional",
        nombre: "Chocolate Tradicional",
        descripcion: "Bizcocho de chocolate con dulce de leche.",
        precio: 70, precioEvento: 65, peso: 182,
        foto: "img/productos/chocolate-tradicional.jpg",
        etiqueta: "Más vendido",
      },
      {
        id: "espresso-dulce",
        nombre: "Espresso & Dulce de Leche",
        descripcion: "Bizcocho de café intenso con dulce de leche.",
        precio: 70, precioEvento: 65, peso: 182,
        foto: "img/productos/espresso-dulce-de-leche.jpg",
      },
      {
        id: "ferrero-nutella",
        nombre: "Ferrero & Nutella",
        descripcion: "Bizcocho de chocolate con Nutella y Ferrero en trozos.",
        precio: 80, precioEvento: 75,
        foto: "img/productos/ferrero-nutella.jpg",
        etiqueta: "Nuevo",
      },
      {
        id: "doble-chocolate",
        nombre: "Doble Chocolate",
        descripcion: "Bizcocho de chocolate con ganache de chocolate.",
        precio: 80, precioEvento: 75, peso: 201,
        foto: "img/productos/doble-chocolate.jpg",
        etiqueta: "Nuevo",
      },
      {
        id: "chocolate-oreo",
        nombre: "Chocolate & Oreo",
        descripcion: "Bizcocho de chocolate con crema de chocolate y galleta Oreo.",
        precio: 80, precioEvento: 75,
        foto: "img/productos/chocolate-oreo.jpg",
        etiqueta: "Nuevo",
      },
      {
        id: "cake-party",
        nombre: "Cake Party",
        descripcion: "Bizcocho de vainilla con dulce de leche y sprinkles.",
        precio: 70, precioEvento: 65,
        foto: "img/productos/cake-party.jpg",
      },
    ],
  },
  {
    nombre: "Pay y Cremosos",
    productos: [
      {
        id: "pay-nina",
        nombre: "Pay Nina Míngues",
        descripcion: "Tradicional pay de queso y crema.",
        precio: 95, precioEvento: 90,
        foto: "img/productos/pay-nina.jpg",
      },
      {
        id: "pay-nina-dulce",
        nombre: "Pay Nina & Dulce",
        descripcion: "Pay de queso relleno de dulce de leche y crema.",
        precio: 95, precioEvento: 90, peso: 223,
        foto: "img/productos/pay-nina-dulce.jpg",
        etiqueta: "Más vendido",
      },
      {
        id: "pay-tortuga",
        nombre: "Pay Tortuga",
        descripcion: "Pay de queso con dulce de leche, nuez, chispas de chocolate y crema.",
        precio: 95, precioEvento: 90,
        foto: "img/productos/pay-tortuga.jpg",
        etiqueta: "Nuevo",
      },
      {
        id: "carlota-cafe",
        nombre: "Carlota de Café",
        descripcion: "Capas de galleta con una suave crema de café.",
        precio: 90, precioEvento: 85,
        foto: "img/productos/carlota-cafe.jpg",
      },
      {
        id: "carlota-limon",
        nombre: "Carlota de Limón",
        descripcion: "Capas de galleta con una suave crema de limón.",
        precio: 90, precioEvento: 85,
        foto: "img/productos/carlota-limon.jpg",
      },
    ],
  },
  {
    nombre: "Latas Especiales",
    productos: [
      {
        id: "caja-regalo-4",
        nombre: "Caja de Regalo",
        descripcion: "Caja de regalo con 4 latas.",
        precio: 300,
        foto: "img/productos/caja-regalo-mano.jpg",
        opciones: ["Vainilla", "Chocolate"],
        minimo: 1, latas: 4,
      },
      {
        id: "revelacion",
        nombre: "Revelación de Género",
        descripcion: "Bizcocho con relleno sorpresa: ¡descubre si es niño o niña al abrirla!",
        precio: 80, precioEvento: 75,
        opciones: ["Azul", "Rosa"],
        fotosOpcion: {
          Azul: "img/productos/revelacion-azul.jpg",
          Rosa: "img/productos/revelacion-rosa.jpg",
        },
      },
      {
        id: "baby-shower",
        nombre: "Baby Shower",
        descripcion: "Bizcocho con capas de color azul o rosa.",
        precio: 80, precioEvento: 75,
        opciones: ["Azul", "Rosa"],
        fotosOpcion: {
          Azul: "img/productos/baby-shower-azul.jpg",
          Rosa: "img/productos/baby-shower-rosa.jpg",
        },
      },
    ],
  },
  {
    nombre: "Bebidas Heladas",
    productos: [
      {
        id: "latte-sin-azucar",
        nombre: "Latte Helado Sin Azúcar",
        descripcion: "Café con leche bien frío, sin azúcar.",
        precio: 55, precioEvento: 50,
        foto: "img/productos/latte-sin-azucar.jpg",
        etiqueta: "Más vendido",
      },
      {
        id: "latte-moca",
        nombre: "Latte Moca Helado",
        descripcion: "Café con leche y chocolate, helado.",
        precio: 59, precioEvento: 54,
        foto: "img/productos/latte-moca.jpg",
      },
      {
        id: "te-negro",
        nombre: "Té Negro con Limón Helado",
        descripcion: "Té negro frío con un toque de limón.",
        precio: 45, precioEvento: 40,
        foto: "img/productos/te-negro-limon.jpg",
      },
      {
        id: "te-verde",
        nombre: "Té Verde con Limón Helado",
        descripcion: "Té verde frío con un toque de limón.",
        precio: 45, precioEvento: 40,
        foto: "img/productos/te-verde-limon.jpg",
      },
    ],
  },
  {
    nombre: "Extras",
    productos: [
      {
        id: "sticker",
        nombre: "Sticker personalizado",
        descripcion: "Sticker de 5 cm con tu diseño o mensaje. Cuéntanos qué quieres en las notas del pedido.",
        precio: 10,
        foto: "img/productos/sticker.jpg",
        minimo: 1, latas: 0,
      },
      {
        id: "caja-extra",
        nombre: "Caja de regalo",
        descripcion: "Caja kraft para 4 latas, lista para regalar.",
        precio: 30,
        foto: "img/productos/caja-kraft.jpg",
        minimo: 1, latas: 0,
      },
    ],
  },
];
