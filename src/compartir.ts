import { RefObject } from 'react';
import { Share as RNShare, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { Tasa } from './api';

// react-native-share es nativo: no existe en Expo Go, solo en el development build.
let ShareNativo: typeof import('react-native-share').default | null = null;
try {
  ShareNativo = require('react-native-share').default;
} catch {
  ShareNativo = null;
}

const pad = (n: number) => String(n).padStart(2, '0');

export const fmtMonto = (n: number) =>
  n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtFechaHora = (d: Date) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

/**
 * Enlace de la app en Play Store. Mientras no esté publicada, la página no existe;
 * al publicarla con el mismo nombre de paquete (app.json → android.package) funciona sin cambios.
 */
export const ENLACE_APP = 'https://play.google.com/store/apps/details?id=com.tasasvenezuela.app';

export const ETIQUETA_TASA: Record<Tasa['id'], string> = {
  usd: 'Dólar BCV',
  eur: 'Euro BCV',
  usdt: 'USDT (Binance P2P)',
};

/**
 * Texto para compartir: solo la tasa de la pantalla en la que está el usuario.
 * `fechaTasa` (dd/mm/aaaa) solo se indica si no es la tasa más reciente.
 */
export function armarTexto(
  id: Tasa['id'],
  valor: number | null,
  fechaTasa: string | null,
  ahora: Date,
  conversion: string | null,
): string {
  const etiqueta = fechaTasa ? `${ETIQUETA_TASA[id]} del ${fechaTasa}` : ETIQUETA_TASA[id];
  const lineas = [`${etiqueta}: ${valor ? `${fmtMonto(valor)} Bs.` : '—'}`, `Fecha: ${fmtFechaHora(ahora)}`];
  if (conversion) lineas.push(`Conversión: ${conversion}`);
  lineas.push('Consulta más en Tasas Venezuela.', `Descarga la app: ${ENLACE_APP}`);
  return lineas.join('\n\n');
}

/** Captura la vista como PNG y abre el menú nativo con la imagen y el texto. */
export async function compartirTarjeta(vista: RefObject<View | null>, texto: string): Promise<void> {
  if (!ShareNativo) {
    // Sin módulo nativo (Expo Go): al menos comparte el texto.
    await RNShare.share({ message: texto });
    return;
  }
  const uri = await captureRef(vista, { format: 'png', quality: 1, result: 'tmpfile' });
  await ShareNativo.open({
    title: 'Tasas Venezuela',
    message: texto,
    url: uri,
    type: 'image/png',
    failOnCancel: false,
  });
}
