import AsyncStorage from '@react-native-async-storage/async-storage';

export type Tasa = {
  id: 'usd' | 'eur' | 'usdt';
  nombre: string;
  fuente: string;
  valor: number | null;
  actualizado: string | null;
};

type DolarApiItem = { fuente: string; promedio: number | null; fechaActualizacion: string };

const CACHE_KEY = 'tasas-cache-v1';

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function bcv(moneda: 'dolares' | 'euros'): Promise<{ valor: number; actualizado: string }> {
  const data = await getJson<DolarApiItem[]>(`https://ve.dolarapi.com/v1/${moneda}`);
  const oficial = data.find((d) => d.fuente === 'oficial');
  if (!oficial?.promedio) throw new Error('Sin tasa oficial');
  return { valor: oficial.promedio, actualizado: oficial.fechaActualizacion };
}

// Mediana de los primeros anuncios de compra de USDT en Binance P2P (VES).
async function usdtBinance(): Promise<{ valor: number; actualizado: string }> {
  const body = {
    fiat: 'VES',
    asset: 'USDT',
    tradeType: 'BUY',
    page: 1,
    rows: 10,
    countries: [],
    payTypes: [],
    publisherType: null,
    proMerchantAds: false,
  };
  const json = await getJson<{ data: { adv: { price: string } }[] }>(
    'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  );
  const precios = json.data.map((d) => parseFloat(d.adv.price)).sort((a, b) => a - b);
  if (!precios.length) throw new Error('Sin anuncios');
  return { valor: precios[Math.floor(precios.length / 2)], actualizado: new Date().toISOString() };
}

const vacia = (): Tasa[] => [
  { id: 'usd', nombre: 'BCV USD', fuente: 'Dólar oficial', valor: null, actualizado: null },
  { id: 'eur', nombre: 'BCV EUR', fuente: 'Euro oficial', valor: null, actualizado: null },
  { id: 'usdt', nombre: 'USDT', fuente: 'Binance P2P', valor: null, actualizado: null },
];

export async function cargarCache(): Promise<Tasa[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Obtiene las tasas; cada una falla de forma independiente y conserva su último valor. */
export async function cargarTasas(previas: Tasa[] | null): Promise<{ tasas: Tasa[]; errores: number }> {
  const base = previas ?? vacia();
  const resultados = await Promise.allSettled([bcv('dolares'), bcv('euros'), usdtBinance()]);
  let errores = 0;
  const tasas = base.map((t, i) => {
    const r = resultados[i];
    if (r.status === 'fulfilled') return { ...t, ...r.value };
    errores++;
    return t;
  });
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(tasas));
    const usdt = tasas.find((t) => t.id === 'usdt')?.valor;
    if (usdt && resultados[2].status === 'fulfilled') {
      const snaps = await leerSnapshotsUsdt();
      snaps[hoy()] = usdt;
      await AsyncStorage.setItem(USDT_KEY, JSON.stringify(snaps));
    }
  } catch {}
  return { tasas, errores };
}

// ---- Historial -------------------------------------------------------------

export type Punto = { fecha: string; valor: number }; // fecha: YYYY-MM-DD
export type Series = Record<Tasa['id'], Punto[]>;

const USDT_KEY = 'usdt-snapshots-v1';
const SERIE_KEY = (id: string) => `serie-${id}-v1`;

const pad = (n: number) => String(n).padStart(2, '0');
export const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

async function leerSnapshotsUsdt(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(USDT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function serieBcv(id: 'usd' | 'eur'): Promise<Punto[]> {
  const ruta = id === 'usd' ? 'dolares' : 'euros';
  try {
    const data = await getJson<{ fecha: string; promedio: number | null }[]>(
      `https://ve.dolarapi.com/v1/historicos/${ruta}/oficial`,
    );
    const serie = data.filter((d) => d.promedio).map((d) => ({ fecha: d.fecha, valor: d.promedio as number }));
    await AsyncStorage.setItem(SERIE_KEY(id), JSON.stringify(serie));
    return serie;
  } catch {
    const raw = await AsyncStorage.getItem(SERIE_KEY(id)).catch(() => null);
    return raw ? JSON.parse(raw) : [];
  }
}

/** BCV: historial público desde 2023. USDT: registros diarios guardados en el teléfono. */
export async function cargarSeries(): Promise<Series> {
  const [usd, eur, snaps] = await Promise.all([serieBcv('usd'), serieBcv('eur'), leerSnapshotsUsdt()]);
  const usdt = Object.keys(snaps)
    .sort()
    .map((fecha) => ({ fecha, valor: snaps[fecha] }));
  return { usd, eur, usdt };
}

/** Añade (o reemplaza) el valor en vivo al final de la serie. */
export function conActual(serie: Punto[], t: Tasa | undefined): Punto[] {
  if (!t?.valor) return serie;
  const fecha = t.id === 'usdt' ? hoy() : (t.actualizado ?? '').slice(0, 10);
  if (!fecha) return serie;
  const ultimo = serie[serie.length - 1];
  if (!ultimo || ultimo.fecha < fecha) return [...serie, { fecha, valor: t.valor }];
  if (ultimo.fecha === fecha) return [...serie.slice(0, -1), { fecha, valor: t.valor }];
  return serie;
}
