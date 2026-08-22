import type { ModelWithOffers } from "@/lib/types";

/**
 * Las guías por uso: la capa de prosa citable del sitio.
 *
 * ## Por qué existe
 *
 * Es el hueco que la auditoría del otro proyecto marcó como el de **mayor retorno en LLMO y
 * el más lento de tapar**: el sitio tiene los datos y no tiene la respuesta. Alguien le
 * pregunta a un asistente "¿qué notebook me conviene para diseño gráfico en Argentina?" y
 * lo que hay para citar es una grilla de 40 tarjetas. Una grilla no se cita: se resume, y
 * el resumen lo escribe el modelo con lo que ya sabía.
 *
 * Una página que **contesta en prosa**, con un criterio numérico explícito y una lista de
 * modelos que lo cumplen hoy, es lo único que cierra ese hueco. Y de paso es lo que una
 * persona necesita cuando no sabe qué buscar, que es la mayoría.
 *
 * ## La regla al escribir esto
 *
 * Cada afirmación tiene que ser **verificable contra el catálogo o falsable por un lector**.
 * "16 GB de RAM porque un navegador con veinte pestañas y Photoshop no entran en 8" se puede
 * discutir; "la mejor notebook para diseño" no significa nada y encima envejece mal.
 *
 * El criterio de cada guía es un predicado sobre las specs, **no** el campo `useCases` de la
 * base: ese viene curado a mano y está vacío en la mayoría de los modelos scrapeados, así
 * que una guía que dependiera de él mostraría tres equipos de cuarenta que califican.
 */

export type Guia = {
  slug: string;
  /** Lo que la persona escribiría en el buscador. Es el H1 y la base del title. */
  titulo: string;
  /** Para las tarjetas del índice de guías, donde hay lugar para una línea larga. */
  resumen: string;
  /**
   * Dos o tres palabras, para la grilla de la home.
   *
   * Existe separado de `resumen` porque en la home esas tarjetas van a dos columnas en un
   * viewport de 375px: cada una mide ~170px y el resumen largo se corta a la mitad. Es el
   * mismo problema que las cuatro grillas de contenido largo del otro proyecto, que había
   * que apilar en mobile — acá se resuelve con un texto más corto en vez de apilando,
   * porque cinco tarjetas apiladas son cinco pantallas.
   */
  corto: string;
  icono: string;
  /**
   * La respuesta, en prosa y arriba de todo.
   *
   * Es lo que un modelo cita textual, así que va autocontenida: se entiende sin haber leído
   * el resto de la página y sin ver la grilla.
   */
  respuesta: string;
  /** El criterio, dicho en números. Es lo que hace la respuesta verificable. */
  criterio: { spec: string; pide: string; porque: string }[];
  /** Errores caros de este uso concreto. Es la parte que no está en ninguna ficha. */
  evitar: string[];
  faq: { q: string; a: string }[];
  /** El filtro sobre el catálogo. Ver el docblock: predicado de specs, no `useCases`. */
  filtro: (m: ModelWithOffers) => boolean;
  /** El corte del listado de `/notebooks` que corresponde a esta guía. */
  filtroUrl: string;
};

/* ---------- ayudantes de specs ---------- */

const gpuGama = (m: ModelWithOffers): number => {
  if (m.gpuType !== "dedicada") return 0;
  const g = m.gpu.toLowerCase();
  if (/(5090|5080|4090|4080)/.test(g)) return 4;
  if (/(5070|4070|3080|3070)/.test(g)) return 3;
  if (/(5060|4060|3060)/.test(g)) return 2;
  if (/(5050|4050|3050)/.test(g)) return 1;
  return 1;
};

const cpuAlta = (m: ModelWithOffers): boolean =>
  /i7|i9|ryzen ?7|ryzen ?9|ultra ?7|ultra ?9|core ?7|core ?9|apple m[1-9]/i.test(
    `${m.cpu} ${m.cpuFamily}`,
  );

const cpuMedia = (m: ModelWithOffers): boolean =>
  cpuAlta(m) || /i5|ryzen ?5|ultra ?5|core ?5/i.test(`${m.cpu} ${m.cpuFamily}`);

export const GUIAS: Guia[] = [
  {
    slug: "estudiar",
    titulo: "Qué notebook conviene para estudiar",
    corto: "Liviana y con batería",
    resumen: "Liviana, con batería que aguante el día y suficiente para cursar sin frenarse.",
    icono: "📚",
    respuesta:
      "Para estudiar, la especificación que más se nota en el día a día no es el procesador: son los 16 GB de RAM " +
      "y que la notebook pese menos de 1,8 kg. Un equipo de 8 GB abre el navegador con veinte pestañas, el PDF de " +
      "la cátedra y una videollamada, y empieza a usar el disco como memoria — se siente como si la máquina fuera " +
      "vieja, y en realidad le falta RAM. Con un procesador de gama media (Intel Core i5 / Ryzen 5 de generación " +
      "reciente, o cualquier Apple Silicon), 16 GB y un SSD de 512 GB alcanza para toda la carrera. La placa de " +
      "video dedicada no aporta nada acá y suma peso, calor y precio: si no vas a renderizar ni jugar, es plata " +
      "que compra un problema. Pantalla de 14 pulgadas es el punto donde entra en la mochila y todavía se puede " +
      "trabajar cómodo.",
    criterio: [
      { spec: "Memoria RAM", pide: "16 GB", porque: "Es lo que separa 'anda bien' de 'se traba con el navegador abierto'. Con 8 GB el sistema empieza a usar el SSD como memoria y la máquina se siente vieja el primer año." },
      { spec: "Almacenamiento", pide: "512 GB SSD", porque: "256 GB se llena con el sistema, la suite de oficina y los apuntes de dos años. Y en muchos modelos el SSD va soldado." },
      { spec: "Peso", pide: "hasta 1,8 kg", porque: "Es la diferencia entre llevarla todos los días y dejarla en casa." },
      { spec: "Placa de video", pide: "integrada alcanza", porque: "Una dedicada suma peso, calor, ruido y precio para una tarea que no la usa." },
    ],
    evitar: [
      "Comprar 8 GB de RAM pensando en ampliarla después: en muchos modelos finos va soldada al motherboard y no se puede.",
      "Elegir por el tamaño de pantalla: una de 15,6\" es unos 400 gramos más que una de 14\", y esos 400 gramos se cargan todos los días.",
      "Pagar por una placa dedicada que sólo se va a usar para que arranque Windows.",
    ],
    faq: [
      { q: "¿Alcanza con 8 GB de RAM para estudiar?", a: "Para cursar arranca, pero se queda corta rápido: el navegador con varias pestañas, un PDF y una videollamada ya la llenan. Si el presupuesto obliga a elegir, conviene resignar procesador antes que memoria — el procesador se nota en tareas puntuales y la RAM se nota todo el tiempo." },
      { q: "¿Conviene una Mac para estudiar?", a: "Los Apple Silicon rinden mucho para su consumo y la batería dura un día entero de cursada. La contra son dos: el precio de entrada en Argentina y que algunos programas de facultades de ingeniería y arquitectura sólo corren en Windows. Antes de decidir, chequeá qué software pide tu carrera." },
      { q: "¿Cuánto sale hoy una notebook para estudiar?", a: "El rango cambia todas las semanas. En la lista de abajo está el precio más bajo de cada modelo entre todas las tiendas indexadas, actualizado a diario, con el historial de los últimos 90 días para saber si el precio de hoy es bueno o es el de siempre." },
    ],
    filtro: (m) => m.ramGb >= 16 && m.weightKg > 0 && m.weightKg <= 1.9 && cpuMedia(m),
    filtroUrl: "/notebooks?ram=16&peso=liviana",
  },
  {
    slug: "gaming",
    titulo: "Qué notebook conviene para jugar",
    corto: "GPU dedicada y 144 Hz",
    resumen: "La placa de video manda, pero la pantalla y la refrigeración deciden la experiencia real.",
    icono: "🎮",
    respuesta:
      "En gaming, la placa de video define casi todo: es el componente que no se puede compensar con nada. Para " +
      "jugar títulos actuales en 1080p con buena calidad, el piso razonable hoy es una RTX 4060 o 5060; una 4050 " +
      "o 3050 sirve para jugar en calidad media y para títulos competitivos, que piden más cuadros que detalle. " +
      "Lo que casi nadie mira y cambia la experiencia tanto como la placa son otras dos cosas: la pantalla y la " +
      "refrigeración. Una pantalla de 144 Hz o más es la diferencia entre que el movimiento se vea fluido o no, y " +
      "en un equipo delgado la misma placa rinde bastante menos porque se calienta y baja frecuencias. Sumale 16 " +
      "GB de RAM como mínimo — 8 GB ya limita en varios títulos de 2024 en adelante — y un SSD de 1 TB, porque un " +
      "solo título ocupa entre 80 y 150 GB.",
    criterio: [
      { spec: "Placa de video", pide: "RTX 4060 / 5060 o superior", porque: "Es el piso para 1080p en calidad alta sostenida. Una 4050 o 3050 juega bien en media y en títulos competitivos." },
      { spec: "Pantalla", pide: "144 Hz o más", porque: "Con 60 Hz la placa genera cuadros que la pantalla no muestra. Es la mejora más barata que existe y la que más se nota." },
      { spec: "Memoria RAM", pide: "16 GB (32 GB si además transmitís)", porque: "8 GB limita en varios títulos de 2024 en adelante, aun con una placa buena." },
      { spec: "Almacenamiento", pide: "1 TB SSD", porque: "Un título AAA ocupa entre 80 y 150 GB. Con 512 GB se instalan tres y se acabó." },
    ],
    evitar: [
      "Mirar sólo el número de la placa: la misma RTX 4060 rinde distinto en un equipo grueso con dos ventiladores que en uno delgado que la ahoga.",
      "Pagar por 240 Hz si la placa no llega a generar esos cuadros en los juegos que jugás.",
      "Asumir que una notebook gamer es transportable: la mayoría pesa entre 2,3 y 2,8 kg y el cargador suma casi un kilo.",
    ],
    faq: [
      { q: "¿Sirve una notebook gamer para trabajar?", a: "Sí, y de hecho es un buen equipo para edición de video o modelado 3D. Las contras son las de siempre: pesa, hace ruido bajo carga y la batería sin enchufe dura poco — dos o tres horas de uso liviano, mucho menos jugando." },
      { q: "¿Cuánta diferencia hay entre una RTX 4050 y una 4060?", a: "En 1080p es la diferencia entre bajar detalles en los títulos más exigentes y no tener que hacerlo. En juegos competitivos las dos van sobradas. Si jugás sobre todo competitivo, la 4050 con pantalla de 144 Hz es mejor compra que la 4060 con pantalla de 60." },
      { q: "¿Es mejor esperar a que baje de precio?", a: "En la ficha de cada modelo está el historial de 90 días, así que se puede ver si el precio de hoy está arriba o abajo de su propio promedio en vez de adivinar. También se puede dejar una alerta y recibir un mail cuando baje." },
    ],
    filtro: (m) => gpuGama(m) >= 1 && m.ramGb >= 16,
    filtroUrl: "/notebooks?gpu=dedicada&ram=16",
  },
  {
    slug: "diseno",
    titulo: "Qué notebook conviene para diseño y edición",
    corto: "Pantalla y memoria",
    resumen: "La pantalla es la herramienta de trabajo. Después, memoria y placa dedicada.",
    icono: "🎨",
    respuesta:
      "En diseño gráfico, edición de fotos y video, el orden de prioridades es distinto al de cualquier otro uso: " +
      "primero la pantalla, después la memoria, y recién tercero el procesador. La pantalla es la herramienta de " +
      "trabajo — si los colores no son fieles, el trabajo se ve distinto en cada dispositivo y hay que corregirlo " +
      "dos veces. Buscá panel IPS u OLED y, si el trabajo es para imprenta o para cliente, resolución por encima " +
      "de Full HD. En memoria, 16 GB es el piso y 32 GB deja de ser un lujo apenas entrás en video 4K o en " +
      "archivos con muchas capas. La placa dedicada acelera los filtros y el renderizado en la suite de Adobe y " +
      "en DaVinci, así que sí conviene, pero una de gama media alcanza: acá el cuello de botella suele ser la " +
      "RAM, no la GPU. Y el almacenamiento pide 1 TB, porque un proyecto de video son decenas de GB.",
    criterio: [
      { spec: "Pantalla", pide: "IPS u OLED, idealmente sobre Full HD", porque: "Es la herramienta de trabajo. En un panel TN los colores cambian con el ángulo y el trabajo se ve distinto en cada pantalla." },
      { spec: "Memoria RAM", pide: "16 GB mínimo, 32 GB para video", porque: "Es el cuello de botella real en la suite de Adobe, más que el procesador." },
      { spec: "Placa de video", pide: "dedicada de gama media", porque: "Acelera filtros, efectos y exportación en Adobe y DaVinci. De gama media alcanza: el límite suele estar en la memoria." },
      { spec: "Almacenamiento", pide: "1 TB SSD", porque: "Un proyecto de video son decenas de GB, y trabajar desde un disco externo es lento." },
    ],
    evitar: [
      "Elegir por resolución sin mirar el tipo de panel: un 4K TN es peor para color que un Full HD IPS.",
      "Quedarse en 16 GB si el trabajo es video 4K: se nota en cada previsualización, todo el día.",
      "Descartar las Mac por precio sin comparar: en edición, el rendimiento por watt de Apple Silicon y la calidad de pantalla suelen justificar la diferencia.",
    ],
    faq: [
      { q: "¿Mac o Windows para diseño?", a: "Las dos sirven. Apple Silicon rinde muy bien en edición de video y trae buena pantalla de fábrica, así que hay menos que chequear. Windows da más opciones por el mismo precio y es obligatorio si usás software que sólo corre ahí, como varios programas de CAD y 3D. La decisión práctica es el software que usás, no la marca." },
      { q: "¿Cuánta RAM necesito para editar video?", a: "16 GB para 1080p y 32 GB para 4K. Es la spec que más se nota en la previsualización, que es lo que hacés todo el día — más que el procesador y más que la placa." },
      { q: "¿Sirve una notebook gamer para diseño?", a: "Sí: tienen placa dedicada y buena refrigeración, que es justo lo que pide el renderizado. Lo que hay que mirar es la pantalla, porque muchas priorizan la frecuencia de refresco sobre la fidelidad de color." },
    ],
    filtro: (m) =>
      m.ramGb >= 16 &&
      (m.gpuType === "dedicada" || /apple/i.test(m.cpuFamily)) &&
      (/ips|oled/i.test(m.screenPanel) || /apple/i.test(m.cpuFamily)),
    filtroUrl: "/notebooks?ram=16&gpu=dedicada",
  },
  {
    slug: "programar",
    titulo: "Qué notebook conviene para programar",
    corto: "RAM y disco",
    resumen: "Memoria y disco antes que procesador. Contenedores y entornos comen RAM.",
    icono: "👩‍💻",
    respuesta:
      "Para programar, la spec que decide es la memoria RAM, y no está cerca: 16 GB es el piso y 32 GB es lo " +
      "razonable si trabajás con contenedores, máquinas virtuales o un IDE pesado con el proyecto entero indexado. " +
      "Un stack moderno —Docker con tres o cuatro servicios, el editor, el navegador con las herramientas de " +
      "desarrollo y una reunión— pasa los 16 GB sin esfuerzo, y cuando el sistema empieza a usar el disco como " +
      "memoria la máquina se vuelve inusable por minutos. Después viene el almacenamiento: 512 GB es el mínimo y " +
      "1 TB es cómodo, porque los entornos, las imágenes de contenedores y las dependencias ocupan mucho más de " +
      "lo que uno calcula. El procesador importa para compilar, así que si compilás seguido conviene uno de gama " +
      "alta; para desarrollo web e interpretado, uno de gama media va sobrado. La placa dedicada no hace falta " +
      "salvo que hagas juegos, gráficos o entrenes modelos localmente.",
    criterio: [
      { spec: "Memoria RAM", pide: "16 GB mínimo, 32 GB con contenedores", porque: "Es lo primero que se agota. Con Docker, el IDE y el navegador abiertos, 16 GB queda justo." },
      { spec: "Almacenamiento", pide: "512 GB, mejor 1 TB", porque: "Entornos, imágenes de contenedores y dependencias ocupan más de lo que uno calcula, y crecen solos." },
      { spec: "Procesador", pide: "gama media; alta si compilás", porque: "En desarrollo web e interpretado no es el límite. En compilación de proyectos grandes sí, y ahí la diferencia son minutos por build." },
      { spec: "Pantalla", pide: "14 pulgadas o más, buena resolución", porque: "Se mira ocho horas por día. La resolución define cuánto código entra sin scrollear." },
    ],
    evitar: [
      "Comprar por el procesador y quedarse en 16 GB: el cuello de botella va a ser la memoria, no los núcleos.",
      "Un SSD de 256 GB: entre el sistema, las herramientas y dos proyectos con dependencias ya está lleno.",
      "Asumir que necesitás placa dedicada. Salvo gráficos, juegos o modelos locales, no cambia nada y encarece.",
    ],
    faq: [
      { q: "¿16 o 32 GB de RAM para programar?", a: "16 GB alcanza para desarrollo web sin contenedores. Si usás Docker, máquinas virtuales, Android Studio o varios servicios a la vez, 32 GB deja de ser un lujo. Y conviene chequear si el modelo permite ampliar: en muchos equipos finos la memoria va soldada." },
      { q: "¿Conviene Linux o Windows?", a: "Es indistinto para la compra: cualquiera de los modelos de esta lista corre Linux. Lo que sí conviene chequear antes es el soporte de wifi y de gestión de energía del modelo puntual, que es donde suelen aparecer los problemas." },
      { q: "¿Sirve una Mac para programar?", a: "Muy bien, sobre todo para desarrollo web y móvil, y es obligatoria para compilar aplicaciones de iOS. La contra es que algunas herramientas específicas todavía asumen x86, aunque cada vez menos." },
    ],
    filtro: (m) => m.ramGb >= 16 && m.storageGb >= 512 && cpuMedia(m),
    filtroUrl: "/notebooks?ram=16&storage=512",
  },
  {
    slug: "oficina",
    titulo: "Qué notebook conviene para trabajo de oficina",
    corto: "Confiable y liviana",
    resumen: "Confiabilidad, teclado y batería. La potencia sobra hace años.",
    icono: "💼",
    respuesta:
      "Para trabajo de oficina —planillas, documentos, mail, videollamadas— cualquier procesador de gama media de " +
      "los últimos años va sobrado, y esa es justamente la trampa: como la potencia no es el límite, la plata " +
      "conviene ponerla en lo que se usa ocho horas por día y no figura en la comparación. Eso es el teclado, la " +
      "pantalla y la batería. 16 GB de RAM porque las herramientas de trabajo modernas viven en el navegador y " +
      "cada pestaña cuesta memoria; SSD de 512 GB; y peso por debajo de 1,8 kg si viajás entre oficina y casa. " +
      "Si la compra es para una empresa, mirá también la garantía y si hay service oficial en el país: en un " +
      "equipo de trabajo, dos semanas sin la máquina cuesta más que la diferencia de precio entre dos modelos.",
    criterio: [
      { spec: "Memoria RAM", pide: "16 GB", porque: "Las herramientas de trabajo viven en el navegador y cada pestaña cuesta memoria." },
      { spec: "Almacenamiento", pide: "512 GB SSD", porque: "El SSD es lo que hace que la máquina arranque en segundos. Nunca un disco mecánico." },
      { spec: "Peso", pide: "hasta 1,8 kg", porque: "Si se mueve entre oficina y casa, el peso es la spec que más se nota." },
      { spec: "Garantía y service", pide: "oficial en el país", porque: "En un equipo de trabajo, dos semanas sin la máquina cuesta más que la diferencia entre dos modelos." },
    ],
    evitar: [
      "Pagar por un procesador de gama alta que va a pasar el día en una planilla.",
      "Cualquier equipo con disco mecánico, por barato que esté: la diferencia al usarlo es enorme.",
      "Comprar sin mirar la garantía cuando es para trabajar. El precio más bajo de la lista no siempre es la mejor compra.",
    ],
    faq: [
      { q: "¿Cuál es la notebook más barata que sirve para oficina?", a: "El piso razonable es 16 GB de RAM y SSD de 512 GB con un procesador de gama media reciente. Abajo de eso lo que se ahorra al comprar se paga en tiempo perdido todos los días. En la lista de abajo están ordenadas por precio." },
      { q: "¿Conviene comprar en cuotas?", a: "Depende del total financiado, no de la cantidad de cuotas. En cada ficha figura el total en cuotas al lado del precio de contado y se marca cuáles son realmente sin interés: la misma cantidad de cuotas puede tener un recargo de 0% en una tienda y de 25% en otra." },
      { q: "¿Puedo comprar varias unidades para mi empresa?", a: "Se puede pedir presupuesto por volumen y las tiendas indexadas cotizan. Está en la sección de venta corporativa; sirve para empresas, escuelas y revendedores." },
    ],
    filtro: (m) => m.ramGb >= 16 && m.storageGb >= 512 && m.weightKg > 0 && m.weightKg <= 1.9,
    filtroUrl: "/notebooks?ram=16&storage=512&peso=liviana",
  },
];

export function guiaPorSlug(slug: string): Guia | undefined {
  return GUIAS.find((g) => g.slug === slug);
}
