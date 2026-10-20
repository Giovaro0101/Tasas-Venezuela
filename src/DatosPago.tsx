import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DatoBancario, resumenDato } from './datosBancarios';
import { colors, fuentes, Paleta, tinte } from './theme';

type Props = {
  datos: DatoBancario[];
  /** Ids de los datos que se incluirán al compartir. */
  seleccion: string[];
  paleta: Paleta;
  onAlternar: (id: string) => void;
  onAgregar: () => void;
  onEditar: (d: DatoBancario) => void;
  onCompartirSolo: () => void;
};

/** Lista de datos de pago guardados: se marcan los que se quieren incluir al compartir. */
export function DatosPago({ datos, seleccion, paleta, onAlternar, onAgregar, onEditar, onCompartirSolo }: Props) {
  const n = seleccion.length;

  return (
    <LinearGradient
      colors={[paleta.tarjetaA, paleta.tarjetaB]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.caja, { borderColor: paleta.marco }]}
    >
      <View style={s.cabecera}>
        <Text style={s.titulo}>Datos de pago</Text>
        <Pressable onPress={onAgregar} hitSlop={8} style={s.agregar}>
          <Text style={s.agregarTxt}>＋ Agregar</Text>
        </Pressable>
      </View>

      {datos.length === 0 ? (
        <Text style={s.vacio}>
          Guarda tus datos de pago móvil o de transferencia para enviarlos junto con la tasa, o por separado.
        </Text>
      ) : (
        <>
          <Text style={s.ayuda}>Toca para marcar los que se enviarán al compartir.</Text>
          <View style={s.lista}>
            {datos.map((d) => {
              const marcado = seleccion.includes(d.id);
              return (
                <Pressable
                  key={d.id}
                  onPress={() => onAlternar(d.id)}
                  style={[s.fila, marcado && { borderColor: colors.gold, backgroundColor: tinte(colors.gold, '14') }]}
                >
                  <View style={[s.check, marcado && s.checkActivo]}>
                    {marcado && <Text style={s.checkTxt}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.titular} numberOfLines={1}>
                      {d.titular}
                    </Text>
                    <Text style={s.resumen} numberOfLines={1}>
                      {resumenDato(d)}
                    </Text>
                  </View>
                  <Pressable onPress={() => onEditar(d)} hitSlop={10}>
                    <Text style={s.editar}>Editar</Text>
                  </Pressable>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={onCompartirSolo}
            disabled={n === 0}
            style={[s.solo, n === 0 && { opacity: 0.4 }]}
          >
            <Text style={s.soloTxt}>
              {n === 0 ? 'Marca uno para compartir solo los datos' : `Compartir solo los datos (${n})  ↗`}
            </Text>
          </Pressable>
        </>
      )}
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  caja: { borderRadius: 16, borderWidth: 1.5, padding: 18, gap: 12, overflow: 'hidden' },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titulo: { color: colors.muted, fontFamily: fuentes.uiSemi, fontSize: 12, letterSpacing: 0.8 },
  agregar: { borderWidth: 1, borderColor: colors.gold, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 },
  agregarTxt: { color: colors.gold, fontFamily: fuentes.uiSemi, fontSize: 12 },
  vacio: { color: colors.muted, fontFamily: fuentes.ui, fontSize: 13, lineHeight: 19 },
  ayuda: { color: colors.faint, fontFamily: fuentes.ui, fontSize: 12, marginTop: -4 },
  lista: { gap: 8 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.faint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkActivo: { backgroundColor: colors.gold, borderColor: colors.gold },
  checkTxt: { color: colors.onGold, fontFamily: fuentes.uiBold, fontSize: 13, lineHeight: 16 },
  titular: { color: colors.text, fontFamily: fuentes.uiSemi, fontSize: 15 },
  resumen: { color: colors.muted, fontFamily: fuentes.ui, fontSize: 12, marginTop: 1 },
  editar: { color: colors.gold, fontFamily: fuentes.uiSemi, fontSize: 12 },
  solo: { borderWidth: 1.5, borderColor: colors.gold, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  soloTxt: { color: colors.gold, fontFamily: fuentes.uiSemi, fontSize: 13 },
});
