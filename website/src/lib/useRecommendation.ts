import type { NotebookModel } from "./types";

// Recomendación de uso derivada de las specs (CPU / GPU / RAM).
// Es una heurística, no un dato curado: escala también a modelos scrapeados
// donde `useCases` puede no venir cargado.

export interface UseRecommendation {
  key: "workstation" | "gaming-creador" | "productividad" | "oficina-estudio";
  headline: string;
  summary: string;
  goodFor: string[];
  notIdeal: string[];
  tiers: { label: string; value: string }[];
  icon: string;
}

// --- Puntajes 0..~5 a partir de las specs -----------------------------------

function cpuScore(model: NotebookModel): number {
  const cpu = model.cpu.toLowerCase();
  const fam = model.cpuFamily.toLowerCase();

  if (fam.includes("apple")) return 4; // Apple Silicon: muy eficiente y potente

  let base =
    fam.includes("i3") ? 1 :
    fam.includes("i5") || fam.includes("ryzen5") || fam.includes("core 5") ? 2 :
    fam.includes("i7") || fam.includes("ryzen7") ? 3 :
    fam.includes("i9") || fam.includes("ultra9") || fam.includes("ryzen9") ? 4 :
    2;

  // El sufijo pesa tanto como la familia: HX/H = alto rendimiento, U = bajo consumo
  if (/\bhx\b|hx\d/.test(cpu)) base += 1;
  else if (/\d+h\b|\bh\b|hs\b/.test(cpu)) base += 0.5;
  else if (/\d+u\b|\bu\b/.test(cpu)) base -= 0.5;

  return base;
}

function gpuScore(model: NotebookModel): number {
  if (model.gpuType !== "dedicada") return 0;
  const g = model.gpu.toLowerCase();
  if (/(5090|5080|4090|4080)/.test(g)) return 3; // gama alta
  if (/(5070|4070|3080|3070)/.test(g)) return 2.5;
  if (/(5060|4060|3060|5050|4050|3050)/.test(g)) return 2; // gama media
  return 1.5; // otra dedicada
}

function ramScore(gb: number): number {
  if (gb >= 32) return 3;
  if (gb >= 16) return 2;
  if (gb >= 8) return 1;
  return 0;
}

// --- Etiquetas legibles ------------------------------------------------------

function cpuTier(model: NotebookModel): string {
  if (model.cpuFamily.toLowerCase().includes("apple")) return "Alta (Apple Silicon)";
  const s = cpuScore(model);
  if (s >= 4.5) return "Muy alta";
  if (s >= 3.5) return "Alta";
  if (s >= 2.5) return "Media-alta";
  if (s >= 2) return "Media";
  return "Básica";
}

function gpuTier(model: NotebookModel): string {
  const s = gpuScore(model);
  if (s >= 2.5) return "Dedicada gama alta";
  if (s >= 2) return "Dedicada gama media";
  if (s >= 1) return "Dedicada";
  return "Integrada";
}

// --- Recomendación -----------------------------------------------------------

export function recommendUse(model: NotebookModel): UseRecommendation {
  const cpu = cpuScore(model);
  const gpu = gpuScore(model);
  const ram = ramScore(model.ramGb);
  const isApple = model.cpuFamily.toLowerCase().includes("apple");

  const tiers = [
    { label: "Procesador", value: cpuTier(model) },
    { label: "Placa de video", value: gpuTier(model) },
    { label: "Memoria RAM", value: `${model.ramGb} GB` },
  ];

  // Aviso si la RAM puede quedar corta para el uso sugerido
  const ramWarning =
    model.ramGb <= 8
      ? " Con 8 GB de RAM rinde bien para eso; si planeás mucha multitarea, buscá una versión de 16 GB."
      : "";

  // Gama alta con GPU dedicada potente + CPU de muchos núcleos → workstation
  if (gpu >= 2.5 && cpu >= 4) {
    return {
      key: "workstation",
      icon: "🎮",
      headline: "Pensada para gaming exigente y arquitectura / 3D",
      summary: `Combina una placa de video dedicada de gama alta (${model.gpu}) con un procesador de alto rendimiento (${model.cpu}). Eso la vuelve capaz de mover juegos AAA en calidad alta y de acelerar tareas profesionales pesadas como renderizado 3D, CAD y edición de video.`,
      goodFor: [
        "Juegos AAA en alta / ultra",
        "Modelado y renderizado 3D",
        "AutoCAD, Revit, SolidWorks",
        "Edición de video 4K",
        "Machine learning liviano",
      ],
      notIdeal: [
        "Llevarla a todos lados: suele ser pesada y con menos autonomía de batería",
      ],
      tiers,
    };
  }

  // GPU dedicada (media/entrada) → gaming + creación
  if (gpu >= 1.5) {
    return {
      key: "gaming-creador",
      icon: "🎮",
      headline: "Buena para gaming y trabajo creativo",
      summary: `Tiene una placa de video dedicada (${model.gpu}) que la diferencia de una notebook común: corre juegos actuales en buena calidad y acelera edición de foto/video y diseño 3D. El procesador ${model.cpu} acompaña esas tareas.${ramWarning}`,
      goodFor: [
        "Juegos en calidad media / alta",
        "Edición de foto y video",
        "Diseño gráfico y 3D",
        "Streaming",
      ],
      notIdeal: [],
      tiers,
    };
  }

  // GPU integrada pero CPU sólida (o Apple) + RAM decente → productividad / creación liviana
  if (isApple || (cpu >= 2.5 && ram >= 2)) {
    return {
      key: "productividad",
      icon: isApple ? "🍎" : "💻",
      headline: "Ideal para productividad y programación",
      summary: `Con su procesador ${model.cpu} y ${model.ramGb} GB de RAM se mueve cómoda con multitarea, entornos de desarrollo y ofimática avanzada. La placa de video es integrada, así que no está pensada para gaming pesado, pero rinde de sobra para el trabajo diario y la creación liviana.${
        isApple ? " Al ser Apple Silicon, suma muy buena autonomía de batería y portabilidad." : ""
      }${ramWarning}`,
      goodFor: [
        "Programación y desarrollo",
        "Ofimática avanzada y multitarea",
        "Diseño y edición liviana",
        "Muchas pestañas y apps a la vez",
      ],
      notIdeal: ["Juegos actuales exigentes o render 3D pesado"],
      tiers,
    };
  }

  // Resto → oficina / estudio / uso diario
  return {
    key: "oficina-estudio",
    icon: "💼",
    headline: "Perfecta para oficina, estudio y uso diario",
    summary: `Su procesador ${model.cpu} y ${model.ramGb} GB de RAM cubren muy bien las tareas de todos los días. La placa de video es integrada. Es una notebook pensada para rendir en lo cotidiano más que para gaming o trabajo profesional pesado.${ramWarning}`,
    goodFor: [
      "Navegación web y correo",
      "Documentos, planillas y presentaciones",
      "Clases, videollamadas y estudio",
      "Streaming de series y música",
    ],
    notIdeal: [
      "Juegos actuales exigentes",
      "Edición de video o diseño 3D pesado",
    ],
    tiers,
  };
}
