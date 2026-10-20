import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tasa } from './api';
import { ETIQUETA_TASA, fmtFechaHora, fmtMonto } from './compartir';
import { acentos, colors, fuentes, paletas, tinte } from './theme';

type Props = {
  /** Moneda de la pantalla en la que está el usuario: solo esa se comparte. */
  id: Tasa['id'];
  valor: number | null;
  /** Fecha (dd/mm/aaaa) de la tasa, solo si no es la más reciente. */
  fechaTasa: string | null;
  /** Variación respecto al día anterior. */
  delta: number | null;
  pct: number | null;
  ahora: Date;
  conversion: string | null;
};

/** Tarjeta con la tasa actual: es la vista que se convierte en imagen al compartir. */
export const TarjetaResumen = forwardRef<View, Props>(function TarjetaResumen(
  { id, valor, fechaTasa, delta, pct, ahora, conversion },
  ref,
) {
  const acento = acentos[id];
  const colorDelta = delta === null ? colors.muted : delta > 0 ? colors.up : delta < 0 ? colors.down : colors.muted;

  return (
    // collapsable={false}: evita que Android elimine la vista y no se pueda capturar.
    <View ref={ref} collapsable={false} style={s.marco}>
      <LinearGradient
        colors={[paletas[id].tarjetaA, paletas[id].tarjetaB]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.tarjeta, { borderColor: paletas[id].marco }]}
      >
        <View style={[s.filete, { backgroundColor: acento }]} />
        <View style={s.cabecera}>
          <Text style={s.marca}>Tasas Venezuela</Text>
          <Text style={s.fecha}>{fmtFechaHora(ahora)}</Text>
        </View>

        <View style={s.etiquetaFila}>
          <View style={[s.punto, { backgroundColor: acento }]} />
          <Text style={s.etiqueta}>{ETIQUETA_TASA[id]}</Text>
          {fechaTasa && <Text style={s.etiquetaFecha}>· {fechaTasa}</Text>}
        </View>

        <Text style={s.valor} numberOfLines={1} adjustsFontSizeToFit>
          <Text style={s.unidad}>Bs. </Text>
          {valor ? fmtMonto(valor) : '—'}
        </Text>

        {delta !== null && pct !== null && (
          <View style={[s.deltaChip, { backgroundColor: tinte(colorDelta, '26') }]}>
            <Text style={[s.deltaTxt, { color: colorDelta }]}>
              {delta > 0 ? '▲' : delta < 0 ? '▼' : '•'} {delta > 0 ? '+' : ''}
              {fmtMonto(delta)} Bs · {pct > 0 ? '+' : ''}
              {fmtMonto(pct)} % vs. día anterior
            </Text>
          </View>
        )}

        {conversion && (
          <View style={s.conversion}>
            <Text style={s.conversionTxt}>{conversion}</Text>
          </View>
        )}
        <Text style={s.pie}>Datos referenciales</Text>
      </LinearGradient>
    </View>
  );
});

const s = StyleSheet.create({
  marco: { backgroundColor: colors.bg, padding: 16 },
  tarjeta: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 22,
    gap: 14,
    overflow: 'hidden',
  },
  filete: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 },
  marca: { color: colors.text, fontFamily: fuentes.cifraBold, fontSize: 22 },
  fecha: { color: colors.muted, fontFamily: fuentes.ui, fontSize: 11 },
  etiquetaFila: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  punto: { width: 9, height: 9, borderRadius: 5 },
  etiqueta: { color: colors.text, fontFamily: fuentes.uiSemi, fontSize: 15 },
  etiquetaFecha: { color: colors.muted, fontFamily: fuentes.ui, fontSize: 13 },
  valor: { color: colors.text, fontFamily: fuentes.cifra, fontSize: 56, lineHeight: 64 },
  unidad: { color: colors.faint, fontFamily: fuentes.ui, fontSize: 20 },
  deltaChip: { alignSelf: 'flex-start', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11 },
  deltaTxt: { fontFamily: fuentes.uiSemi, fontSize: 12 },
  conversion: { backgroundColor: colors.cardAlt, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12 },
  conversionTxt: { color: colors.gold, fontFamily: fuentes.uiSemi, fontSize: 13, textAlign: 'center' },
  pie: { color: colors.faint, fontFamily: fuentes.ui, fontSize: 10, textAlign: 'center' },
});
