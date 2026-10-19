import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tasa } from './api';
import { fmtFechaHora, fmtMonto } from './compartir';
import { acentos, colors, fuentes } from './theme';

type Props = {
  tasas: Tasa[];
  ahora: Date;
  conversion: string | null;
};

const ETIQUETAS: Record<Tasa['id'], string> = { usd: 'Dólar BCV', eur: 'Euro BCV', usdt: 'USDT · Binance P2P' };

/** Tarjeta con las tasas actuales: es la vista que se convierte en imagen al compartir. */
export const TarjetaResumen = forwardRef<View, Props>(function TarjetaResumen({ tasas, ahora, conversion }, ref) {
  return (
    // collapsable={false}: evita que Android elimine la vista y no se pueda capturar.
    <View ref={ref} collapsable={false} style={s.marco}>
      <View style={s.tarjeta}>
        <View style={s.filete} />
        <View style={s.cabecera}>
          <Text style={s.marca}>Tasas Venezuela</Text>
          <Text style={s.fecha}>{fmtFechaHora(ahora)}</Text>
        </View>
        {tasas.map((t, i) => (
          <View key={t.id} style={[s.fila, i > 0 && s.filaBorde]}>
            <View style={s.etiquetaFila}>
              <View style={[s.punto, { backgroundColor: acentos[t.id] }]} />
              <Text style={s.etiqueta}>{ETIQUETAS[t.id]}</Text>
            </View>
            <Text style={s.valor}>
              <Text style={s.unidad}>Bs. </Text>
              {t.valor ? fmtMonto(t.valor) : '—'}
            </Text>
          </View>
        ))}
        {conversion && (
          <View style={s.conversion}>
            <Text style={s.conversionTxt}>{conversion}</Text>
          </View>
        )}
        <Text style={s.pie}>Datos referenciales</Text>
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  marco: { backgroundColor: colors.bg, padding: 16 },
  tarjeta: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 20, gap: 14, overflow: 'hidden' },
  filete: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: colors.gold },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 },
  marca: { color: colors.text, fontFamily: fuentes.cifraBold, fontSize: 22 },
  fecha: { color: colors.muted, fontFamily: fuentes.ui, fontSize: 11 },
  fila: { gap: 2 },
  filaBorde: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 14 },
  etiquetaFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  punto: { width: 8, height: 8, borderRadius: 4 },
  etiqueta: { color: colors.muted, fontFamily: fuentes.uiSemi, fontSize: 12 },
  valor: { color: colors.text, fontFamily: fuentes.cifra, fontSize: 34 },
  unidad: { color: colors.faint, fontFamily: fuentes.ui, fontSize: 16 },
  conversion: { backgroundColor: colors.cardAlt, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12 },
  conversionTxt: { color: colors.gold, fontFamily: fuentes.uiSemi, fontSize: 13, textAlign: 'center' },
  pie: { color: colors.faint, fontFamily: fuentes.ui, fontSize: 10, textAlign: 'center' },
});
