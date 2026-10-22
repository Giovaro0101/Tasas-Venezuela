import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fuentes, Paleta, tinte } from './theme';

type Campo = 'unidad' | 'bs';

const aTexto = (n: number) => n.toFixed(2).replace('.', ',');

type Props = {
  /** Símbolo de la moneda: $, €, ₮ */
  simbolo: string;
  /** Código de la moneda para el texto compartido: USD, EUR, USDT */
  codigo: string;
  /** Color propio de la moneda. */
  acento: string;
  /** Colores derivados de la moneda: marco y degradado de la tarjeta. */
  paleta: Paleta;
  /** Bs por unidad en la fecha elegida (null si no hay dato). */
  tasa: number | null;
  /** Fecha (dd/mm/aaaa) de la tasa si no es la más reciente; se añade al texto. */
  fechaTasa: string | null;
  /** Avisa de la conversión actual: el texto ("20 USD = 17.602,40 VES") y el monto en Bs como número. */
  onConversion: (texto: string | null, montoBs: number | null) => void;
};

const fmtCant = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Dos campos enlazados: al editar uno, el otro se calcula con la tasa. */
export function Conversor({ simbolo, codigo, acento, paleta, tasa, fechaTasa, onConversion }: Props) {
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
  const montoBs = valido ? (campo === 'unidad' ? monto * (tasa as number) : monto) : null;
  useEffect(() => {
    onConversion(resumen, montoBs);
  }, [resumen, montoBs, onConversion]);

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
      <View style={[s.sello, c === 'unidad' ? { backgroundColor: tinte(acento, '26') } : { backgroundColor: paleta.campo }]}>
        <Text style={[s.selloTxt, { color: c === 'unidad' ? acento : colors.muted }]}>{etiqueta}</Text>
      </View>
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
        selectionColor={colors.gold}
        selectTextOnFocus
      />
      <Pressable onPress={() => copiar(c)} hitSlop={8} style={[s.copiar, copiado === c && { borderColor: colors.gold }]}>
        <Text style={[s.copiarTxt, copiado === c && { color: colors.gold }]}>{copiado === c ? 'Copiado' : 'Copiar'}</Text>
      </Pressable>
    </View>
  );

  // El botón aparece en cuanto se cambia el valor inicial (1 unidad de la moneda).
  const editado = !(campo === 'unidad' && texto === '1');
  const reiniciar = () => {
    Keyboard.dismiss();
    setCampo('unidad');
    setTexto('1');
  };

  return (
    <LinearGradient
      colors={[paleta.tarjetaA, paleta.tarjetaB]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.caja, { borderColor: paleta.marco }]}
    >
      <View style={s.cabecera}>
        <Text style={s.titulo}>Conversor</Text>
        {editado && (
          <Pressable onPress={reiniciar} hitSlop={8} style={s.reiniciar}>
            <Text style={s.reiniciarTxt}>↺ Reiniciar</Text>
          </Pressable>
        )}
      </View>
      {fila('unidad', simbolo)}
      {fila('bs', 'Bs')}
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  caja: { borderRadius: 16, borderWidth: 1.5, padding: 18, gap: 14, overflow: 'hidden' },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 28 },
  titulo: { color: colors.muted, fontFamily: fuentes.uiSemi, fontSize: 12, letterSpacing: 0.8 },
  reiniciar: {
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  reiniciarTxt: { color: colors.gold, fontFamily: fuentes.uiSemi, fontSize: 12 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sello: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  selloTxt: { fontFamily: fuentes.uiBold, fontSize: 16 },
  input: { flex: 1, color: colors.text, fontFamily: fuentes.cifra, fontSize: 30, padding: 0 },
  copiar: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 13 },
  copiarTxt: { color: colors.muted, fontFamily: fuentes.uiSemi, fontSize: 12 },
});
