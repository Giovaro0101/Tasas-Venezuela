import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DatoBancario, resumenDato } from './datosBancarios';
import { colors, dorado, fuentes, tinte } from './theme';

type Props = {
  visible: boolean;
  datos: DatoBancario[];
  /** Datos que aparecen marcados al abrir (los que estaban marcados en el menú). */
  preseleccion: string[];
  onCerrar: () => void;
  onSoloTasa: () => void;
  onConDatos: (ids: string[]) => void;
};

/** Hoja que aparece al pulsar Compartir: solo la tasa, o la tasa con datos de pago. */
export function OpcionesCompartir({ visible, datos, preseleccion, onCerrar, onSoloTasa, onConDatos }: Props) {
  const [marcados, setMarcados] = useState<string[]>([]);

  // Con un solo dato guardado queda marcado; si no, se parte de lo marcado en el menú.
  useEffect(() => {
    if (!visible) return;
    setMarcados(preseleccion.length > 0 ? preseleccion : datos.length === 1 ? [datos[0].id] : []);
  }, [visible, datos, preseleccion]);

  const alternar = (id: string) => setMarcados((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  const n = marcados.length;

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onCerrar}>
      <View style={s.fondo}>
        <Pressable style={s.zonaCierre} onPress={onCerrar} />
        <View style={s.hoja}>
          <View style={s.cabecera}>
            <Text style={s.titulo}>Compartir</Text>
            <Pressable onPress={onCerrar} hitSlop={10} style={s.cerrar}>
              <Text style={s.cerrarTxt}>✕</Text>
            </Pressable>
          </View>

          <Pressable onPress={onSoloTasa} style={s.opcion}>
            <View style={{ flex: 1 }}>
              <Text style={s.opcionTitulo}>Solo la tasa</Text>
              <Text style={s.opcionSub}>Imagen y texto con la tasa y la conversión</Text>
            </View>
            <Text style={s.opcionFlecha}>↗</Text>
          </Pressable>

          <Text style={s.seccion}>Tasa con datos de pago</Text>
          <ScrollView style={s.lista} contentContainerStyle={{ gap: 8 }} showsVerticalScrollIndicator={false}>
            {datos.map((d) => {
              const marcado = marcados.includes(d.id);
              return (
                <Pressable
                  key={d.id}
                  onPress={() => alternar(d.id)}
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
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable onPress={() => onConDatos(marcados)} disabled={n === 0} style={n === 0 && { opacity: 0.4 }}>
            <LinearGradient colors={dorado} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.boton}>
              <Text style={s.botonTxt}>
                {n === 0 ? 'Marca los datos que quieres añadir' : `Compartir con datos de pago (${n})  ↗`}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(3,7,14,0.72)' },
  zonaCierre: { flex: 1 },
  hoja: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    borderColor: colors.line,
    padding: 20,
    paddingBottom: 32,
    gap: 14,
    maxHeight: '85%',
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { color: colors.text, fontFamily: fuentes.cifraBold, fontSize: 24 },
  cerrar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  cerrarTxt: { color: colors.muted, fontSize: 14 },

  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  opcionTitulo: { color: colors.text, fontFamily: fuentes.uiSemi, fontSize: 16 },
  opcionSub: { color: colors.muted, fontFamily: fuentes.ui, fontSize: 12, marginTop: 2 },
  opcionFlecha: { color: colors.gold, fontSize: 20 },

  seccion: { color: colors.muted, fontFamily: fuentes.uiSemi, fontSize: 12, letterSpacing: 0.8, marginTop: 4 },
  lista: { flexGrow: 0, maxHeight: 260 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
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

  boton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', overflow: 'hidden' },
  botonTxt: { color: colors.onGold, fontFamily: fuentes.uiBold, fontSize: 15 },
});
