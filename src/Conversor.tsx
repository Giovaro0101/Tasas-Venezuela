import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from './theme';

type Campo = 'unidad' | 'bs';

const aTexto = (n: number) => n.toFixed(2).replace('.', ',');

type Props = {
  /** Símbolo de la moneda: $, €, ₮ */
  simbolo: string;
  /** Código de la moneda para el texto compartido: USD, EUR, USDT */
  codigo: string;
  /** Color propio de la moneda. */
  acento: string;
  /** Bs por unidad en la fecha elegida (null si no hay dato). */
  tasa: number | null;
  /** Fecha (dd/mm/aaaa) de la tasa si no es la más reciente; se añade al texto. */
  fechaTasa: string | null;
  /** Avisa de la conversión actual en texto, p. ej. "20 USD = 17.602,40 VES". */
  onConversion: (texto: string | null) => void;
};

const fmtCant = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Dos campos enlazados: al editar uno, el otro se calcula con la tasa. */
export function Conversor({ simbolo, codigo, acento, tasa, fechaTasa, onConversion }: Props) {
  const [campo, setCampo] = useState<Campo>('unidad');
  const [texto, setTexto] = useState('1');
  const [copiado, setCopiado] = useState<Campo | null>(null);

  const monto = parseFloat(texto.replace(',', '.'));
  const valido = Number.isFinite(monto) && tasa !== null;
  const calculado = (de: Campo) =>
    !valido ? '' : aTexto(de === 'bs' ? monto * (tasa as number) : monto / (tasa as number));

  const resumen = (() => {
    if (!valido) return null;
    const bs = campo === 'unidad' ? monto * (tasa as number) : monto;
    const unidad = campo === 'unidad' ? monto : monto / (tasa as number);
    const base = `${fmtCant(unidad)} ${codigo} = ${fmtCant(bs)} VES`;
    return fechaTasa ? `${base} (tasa del ${fechaTasa})` : base;
  })();
  useEffect(() => {
    onConversion(resumen);
  }, [resumen, onConversion]);

  // El campo activo muestra lo que se escribe; el otro, el cálculo.
  const valorDe = (c: Campo) => (c === campo ? texto : calculado(c === 'bs' ? 'bs' : 'unidad'));

  const copiar = async (c: Campo) => {
    const v = valorDe(c);
    if (!v) return;
    await Clipboard.setStringAsync(v);
    setCopiado(c);
    setTimeout(() => setCopiado((x) => (x === c ? null : x)), 1200);
  };

  const fila = (c: Campo, etiqueta: string) => (
    <View style={s.fila}>
      <Text style={[s.etiqueta, c === 'unidad' && { color: acento }]}>{etiqueta}</Text>
      <TextInput
        style={s.input}
        value={valorDe(c)}
        onChangeText={(t) => {
          setCampo(c);
          setTexto(t);
        }}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={colors.faint}
        selectTextOnFocus
      />
      <Pressable onPress={() => copiar(c)} hitSlop={8} style={s.copiar}>
        <Text style={[s.copiarTxt, copiado === c && { color: acento }]}>
          {copiado === c ? 'Copiado' : 'Copiar'}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View style={[s.card, { borderLeftColor: acento }]}>
      {fila('unidad', simbolo)}
      <View style={s.linea} />
      {fila('bs', 'Bs')}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 6, borderLeftWidth: 4 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  etiqueta: { color: colors.muted, fontSize: 18, fontWeight: '700', width: 34 },
  input: { flex: 1, color: colors.text, fontSize: 28, fontWeight: '600', padding: 0 },
  copiar: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.chip },
  copiarTxt: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  linea: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
});
