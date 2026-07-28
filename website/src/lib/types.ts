export interface Store {
  id: string;
  name: string;
  slug: string;
  url: string;
  type: string;
  physicalStore: boolean;
  city: string;
  affiliate: { kind: string; params: Record<string, string> } | null;
  verified?: boolean; // insignia editorial "tienda verificada"
}

export interface NotebookModel {
  id: string;
  brand: string;
  brandSlug: string;
  name: string;
  slug: string;
  partNumber: string;
  cpu: string;
  cpuFamily: string;
  ramGb: number;
  ramType: string;
  storageGb: number;
  storageType: string;
  screenSizeIn: number;
  screenResolution: string;
  screenPanel: string;
  screenRefreshHz: number;
  gpu: string;
  gpuType: "integrada" | "dedicada";
  os: string;
  weightKg: number;
  batteryWh: number;
  releaseYear: number;
  useCases: string[];
  imageUrl?: string;
}

export interface Listing {
  id: string;
  storeId: string;
  modelId: string;
  url: string;
  titleRaw: string;
  priceList: number;
  priceCash: number;
  installments: { count: number; amount: number } | null;
  inStock: boolean;
  condition: "new" | "refurb" | "outlet";
  lastSeenAt: string;
}

export interface PricePoint {
  date: string;
  bestPrice: number;
}

export interface InstallmentOffer {
  count: number;
  amount: number;
  interestFree: boolean; // total en cuotas ≈ precio contado
  storeName: string;
}

export interface ModelWithOffers extends NotebookModel {
  listings: (Listing & { store: Store })[];
  bestPrice: number;
  bestListing: (Listing & { store: Store }) | null;
  avg90: number | null;
  minHistoric: number | null;
  dropPct: number; // % debajo del promedio 90d (0 si no aplica)
  isRealDeal: boolean;
  bestInstallment: InstallmentOffer | null; // mejor financiación entre las tiendas
  maxInstallments: number; // mayor cantidad de cuotas ofrecida
  hasInterestFree: boolean; // alguna tienda ofrece cuotas sin interés
}
