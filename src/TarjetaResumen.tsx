import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tasa } from './api';
import { fmtFechaHora, fmtMonto } from './compartir';
import { acentos, colors } from './theme';

type Props = {
  tasas: Tasa[];
  ahora: Date;
  conversion: string | null;
};

const ETIQUETAS: Record<Tasa['id'], string> = { usd: 'Dólar BCV', eur: 'Euro BCV', usdt: 'USDT' };

/** Tarjeta con las tasas actuales: es la vista que se convierte en imagen al compartir. */
export const TarjetaResumen = forwardRef<View, Props>(function TarjetaResumen({ tasas, ahora, conversion }, ref) {
  return (
    // collapsable={false}: evita que Android elimine la vista y no se pueda capturar.
    <View ref={ref} collapsable={false} style={s.marco}>
      <View style={s.tarjeta}>
        <View style={s.cabecera}>
          <Text style={s.marca}>Tasas Venezuela</Text>
          <Text style={s.fecha}>{fmtFechaHora(ahora)}</Text>
        </View>
        {tasas.map((t) => (
          <View key={t.id} style={s.fila}>
            <View style={s.etiquetaFila}>
              <View style={[s.punto, { backgroundColor: acentos[t.id] }]} />
              <Text style={s.etiqueta}>{ETIQUETAS[t.id]}</Text>
            </View>
            <Text style={s.valor}>{t.valor ? `${fmtMonto(t.valor)} Bs.` : '—'}</Text>
          </View>
        ))}
        {conversion && (
          <View style={s.conversion}>
            <Text style={s.conversionTxt}>{conversion}</Text>
          </View>
        )}
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  marco: { backgroundColor: colors.bg, padding: 16 },
  tarjeta: { backgroundColor: colors.card, borderRadius: 20, padding: 20, gap: 14 },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  marca: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  fecha: { color: colors.muted, fontSize: 12 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  etiquetaFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  punto: { width: 10, height: 10, borderRadius: 5 },
  etiqueta: { color: colors.muted, fontSize: 16, fontWeight: '600' },
  valor: { color: colors.text, fontSize: 26, fontWeight: '700' },
  conversion: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 14 },
  conversionTxt: { color: colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
