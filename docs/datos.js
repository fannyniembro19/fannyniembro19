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
 *    opciones    → lista de opciones a elegir, ej. ["Azul", "Rosa"] (opcional)
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
  anticipo: 50,               // % de anticipo para apartar

  formasDePago: ["Transferencia", "Efectivo"],

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
    "Domingo · descansamos",
  ],

  notas: [
    "Precio por lata · porción individual (9 cm de alto, 250 ml)",
    "Pedido mínimo: 4 latas del mismo sabor",
    "Pedidos con 2 días de anticipación (eventos: 5 días)",
    "Precio especial en pedidos de 15 latas o más",
    "50% de anticipo para apartar tu pedido",
    "El costo de envío depende de tu dirección",
    "Elaborado de forma artesanal con ingredientes de calidad",
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
        precio: 70, precioEvento: 65,
        foto: "img/productos/vainilla-dulce-de-leche.jpg",
      },
      {
        id: "chocolate-tradicional",
        nombre: "Chocolate Tradicional",
        descripcion: "Bizcocho de chocolate con dulce de leche.",
        precio: 70, precioEvento: 65,
        foto: "img/productos/chocolate-tradicional.jpg",
        etiqueta: "Más vendido",
      },
      {
        id: "espresso-dulce",
        nombre: "Espresso & Dulce de Leche",
        descripcion: "Bizcocho de café intenso con dulce de leche.",
        precio: 70, precioEvento: 65,
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
        precio: 80, precioEvento: 75,
        foto: "img/productos/doble-chocolate.jpg",
        etiqueta: "Nuevo",
      },
      {
        id: "chocolate-oreo",
        nombre: "Chocolate & Oreo",
        descripcion: "Bizcocho de chocolate con crema de chocolate y galleta Oreo.",
        precio: 80,
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
      },
      {
        id: "pay-nina-dulce",
        nombre: "Pay Nina & Dulce",
        descripcion: "Pay de queso relleno de dulce de leche y crema.",
        precio: 95, precioEvento: 90,
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
        foto: "img/productos/caja-regalo.jpg",
        opciones: ["Vainilla", "Chocolate"],
        minimo: 1, latas: 4,
      },
      {
        id: "revelacion",
        nombre: "Revelación de Género",
        descripcion: "Bizcocho con relleno sorpresa.",
        precio: 80, precioEvento: 75,
        opciones: ["Azul", "Rosa"],
      },
      {
        id: "baby-shower",
        nombre: "Baby Shower",
        descripcion: "Bizcocho con relleno de color.",
        precio: 80, precioEvento: 75,
        opciones: ["Azul", "Rosa"],
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
        minimo: 1, latas: 0,
      },
      {
        id: "caja-extra",
        nombre: "Caja de regalo",
        descripcion: "Caja de regalo para tus latas.",
        precio: 30,
        minimo: 1, latas: 0,
      },
    ],
  },
];
