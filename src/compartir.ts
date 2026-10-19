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

const valorDe = (tasas: Tasa[], id: Tasa['id']) => {
  const v = tasas.find((t) => t.id === id)?.valor;
  return v ? `${fmtMonto(v)} Bs.` : '—';
};

export function armarTexto(tasas: Tasa[], ahora: Date, conversion: string | null): string {
  const lineas = [
    `Dólar BCV: ${valorDe(tasas, 'usd')} | Euro: ${valorDe(tasas, 'eur')} | USDT: ${valorDe(tasas, 'usdt')}`,
    `Fecha: ${fmtFechaHora(ahora)}`,
  ];
  if (conversion) lineas.push(`Conversión: ${conversion}`);
  lineas.push('Consulta más en Tasas Venezuela.');
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
