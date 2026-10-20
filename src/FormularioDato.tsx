import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  BANCOS,
  DatoBancario,
  datoVacio,
  etiquetaTipo,
  soloDigitos,
  TipoDocumento,
  TipoDato,
  validarDato,
} from './datosBancarios';
import { colors, dorado, fuentes, tinte } from './theme';

type Props = {
  visible: boolean;
  /** Dato que se edita; null para uno nuevo. */
  inicial: DatoBancario | null;
  onGuardar: (d: DatoBancario) => void;
  onEliminar: (id: string) => void;
  onCerrar: () => void;
};

const DOCUMENTOS: TipoDocumento[] = ['V', 'E', 'J', 'G', 'P'];
const TIPOS: TipoDato[] = ['pagomovil', 'transferencia'];

/** Hoja inferior para crear o editar los datos de pago móvil o de transferencia. */
export function FormularioDato({ visible, inicial, onGuardar, onEliminar, onCerrar }: Props) {
  const [d, setD] = useState<DatoBancario>(() => datoVacio());
  const [error, setError] = useState<string | null>(null);
  const [listaBancos, setListaBancos] = useState(false);
  const [bancoManual, setBancoManual] = useState(false);
  const [tecladoAlto, setTecladoAlto] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const ys = useRef<Record<string, number>>({});

  // Al abrir se carga el dato a editar, o uno vacío.
  useEffect(() => {
    if (!visible) return;
    const base = inicial ?? datoVacio();
    setD(base);
    setError(null);
    setListaBancos(false);
    setBancoManual(!!base.banco && !base.codigoBanco);
  }, [visible, inicial]);

  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', (e) => setTecladoAlto(e.endCoordinates.height));
    const b = Keyboard.addListener('keyboardDidHide', () => setTecladoAlto(0));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  const cambiar = (parcial: Partial<DatoBancario>) => {
    setD((x) => ({ ...x, ...parcial }));
    setError(null);
  };

  // Android no redimensiona la pantalla: se desplaza hasta el campo enfocado.
  const enfocar = (nombre: string) =>
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ y: Math.max(0, (ys.current[nombre] ?? 0) - 24), animated: true }),
    );

  const guardar = () => {
    const limpio: DatoBancario = {
      ...d,
      titular: d.titular.trim(),
      banco: d.banco.trim(),
      telefono: d.tipo === 'pagomovil' ? d.telefono : '',
      cuenta: d.tipo === 'transferencia' ? d.cuenta : '',
    };
    const err = validarDato(limpio);
    if (err) {
      setError(err);
      return;
    }
    Keyboard.dismiss();
    onGuardar(limpio);
  };

  const eliminar = () =>
    Alert.alert('Eliminar datos', '¿Quieres eliminar estos datos de pago?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => onEliminar(d.id) },
    ]);

  const campo = (nombre: string, etiqueta: string, contenido: ReactNode) => (
    <View key={nombre} onLayout={(e) => (ys.current[nombre] = e.nativeEvent.layout.y)} style={s.campo}>
      <Text style={s.etiqueta}>{etiqueta}</Text>
      {contenido}
    </View>
  );

  const chip = (texto: string, activo: boolean, alPulsar: () => void) => (
    <Pressable key={texto} onPress={alPulsar} style={[s.chip, activo && s.chipActivo]}>
      <Text style={[s.chipTxt, activo && s.chipTxtActivo]}>{texto}</Text>
    </Pressable>
  );

  const nombreBanco = d.banco ? (d.codigoBanco ? `${d.banco} (${d.codigoBanco})` : d.banco) : '';

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onCerrar}>
      <View style={s.fondo}>
        <Pressable style={s.zonaCierre} onPress={onCerrar} />
        <View style={s.hoja}>
          <View style={s.cabecera}>
            <Text style={s.titulo}>{inicial ? 'Editar datos de pago' : 'Nuevos datos de pago'}</Text>
            <Pressable onPress={onCerrar} hitSlop={10} style={s.cerrar}>
              <Text style={s.cerrarTxt}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, paddingBottom: 40 + tecladoAlto, gap: 16 }}
          >
            {/* Tipo */}
            <View style={s.fila}>
              {TIPOS.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => cambiar({ tipo: t })}
                  style={[s.tipo, d.tipo === t && s.tipoActivo]}
                >
                  <Text style={[s.tipoTxt, d.tipo === t && s.tipoTxtActivo]}>{etiquetaTipo(t)}</Text>
                </Pressable>
              ))}
            </View>

            {campo(
              'titular',
              'Nombre del titular',
              <TextInput
                style={s.input}
                value={d.titular}
                onChangeText={(t) => cambiar({ titular: t })}
                onFocus={() => enfocar('titular')}
                placeholder="Nombre y apellido"
                placeholderTextColor={colors.faint}
                autoCapitalize="words"
                selectionColor={colors.gold}
              />,
            )}

            {campo(
              'banco',
              'Banco',
              <>
                <Pressable
                  style={[s.input, s.selector]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setListaBancos((v) => !v);
                  }}
                >
                  <Text style={[s.selectorTxt, !nombreBanco && { color: colors.faint }]} numberOfLines={1}>
                    {bancoManual ? 'Otro banco' : nombreBanco || 'Elige un banco'}
                  </Text>
                  <Text style={s.selectorFlecha}>{listaBancos ? '▴' : '▾'}</Text>
                </Pressable>
                {listaBancos && (
                  <View style={s.lista}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 230 }} keyboardShouldPersistTaps="handled">
                      {BANCOS.map((b) => (
                        <Pressable
                          key={b.codigo}
                          style={s.listaFila}
                          onPress={() => {
                            cambiar({ banco: b.nombre, codigoBanco: b.codigo });
                            setBancoManual(false);
                            setListaBancos(false);
                          }}
                        >
                          <Text style={s.listaCodigo}>{b.codigo}</Text>
                          <Text style={s.listaNombre}>{b.nombre}</Text>
                        </Pressable>
                      ))}
                      <Pressable
                        style={s.listaFila}
                        onPress={() => {
                          cambiar({ banco: '', codigoBanco: '' });
                          setBancoManual(true);
                          setListaBancos(false);
                        }}
                      >
                        <Text style={s.listaCodigo}>···</Text>
                        <Text style={s.listaNombre}>Otro banco (escribir)</Text>
                      </Pressable>
                    </ScrollView>
                  </View>
                )}
                {bancoManual && (
                  <TextInput
                    style={[s.input, { marginTop: 8 }]}
                    value={d.banco}
                    onChangeText={(t) => cambiar({ banco: t, codigoBanco: '' })}
                    onFocus={() => enfocar('banco')}
                    placeholder="Nombre del banco"
                    placeholderTextColor={colors.faint}
                    autoCapitalize="words"
                    selectionColor={colors.gold}
                  />
                )}
              </>,
            )}

            {campo(
              'documento',
              'Cédula o RIF',
              <View style={s.fila}>
                <View style={s.chips}>
                  {DOCUMENTOS.map((t) => chip(t, d.documentoTipo === t, () => cambiar({ documentoTipo: t })))}
                </View>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  value={d.documento}
                  onChangeText={(t) => cambiar({ documento: soloDigitos(t) })}
                  onFocus={() => enfocar('documento')}
                  placeholder="12345678"
                  placeholderTextColor={colors.faint}
                  keyboardType="number-pad"
                  maxLength={10}
                  selectionColor={colors.gold}
                />
              </View>,
            )}

            {d.tipo === 'pagomovil' &&
              campo(
                'telefono',
                'Teléfono',
                <TextInput
                  style={s.input}
                  value={d.telefono}
                  onChangeText={(t) => cambiar({ telefono: soloDigitos(t) })}
                  onFocus={() => enfocar('telefono')}
                  placeholder="04121234567"
                  placeholderTextColor={colors.faint}
                  keyboardType="phone-pad"
                  maxLength={11}
                  selectionColor={colors.gold}
                />,
              )}

            {d.tipo === 'transferencia' && (
              <>
                {campo(
                  'cuenta',
                  `Número de cuenta (${d.cuenta.length}/20)`,
                  <TextInput
                    style={s.input}
                    value={d.cuenta}
                    onChangeText={(t) => cambiar({ cuenta: soloDigitos(t) })}
                    onFocus={() => enfocar('cuenta')}
                    placeholder="20 dígitos"
                    placeholderTextColor={colors.faint}
                    keyboardType="number-pad"
                    maxLength={20}
                    selectionColor={colors.gold}
                  />,
                )}
                {campo(
                  'tipoCuenta',
                  'Tipo de cuenta',
                  <View style={s.chips}>
                    {chip('Corriente', d.tipoCuenta === 'corriente', () => cambiar({ tipoCuenta: 'corriente' }))}
                    {chip('Ahorro', d.tipoCuenta === 'ahorro', () => cambiar({ tipoCuenta: 'ahorro' }))}
                  </View>,
                )}
              </>
            )}

            {error && <Text style={s.error}>{error}</Text>}

            <Pressable onPress={guardar}>
              <LinearGradient colors={dorado} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.guardar}>
                <Text style={s.guardarTxt}>Guardar</Text>
              </LinearGradient>
            </Pressable>

            {inicial && (
              <Pressable onPress={eliminar} style={s.eliminar}>
                <Text style={s.eliminarTxt}>Eliminar estos datos</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(3,7,14,0.72)' },
  zonaCierre: { flex: 1 },
  hoja: {
    height: '88%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6,
  },
  titulo: { color: colors.text, fontFamily: fuentes.cifraBold, fontSize: 22 },
  cerrar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  cerrarTxt: { color: colors.muted, fontSize: 14 },

  fila: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  tipo: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  tipoActivo: { borderColor: colors.gold, backgroundColor: tinte(colors.gold, '22') },
  tipoTxt: { color: colors.muted, fontFamily: fuentes.uiSemi, fontSize: 14 },
  tipoTxtActivo: { color: colors.gold },

  campo: { gap: 8 },
  etiqueta: { color: colors.muted, fontFamily: fuentes.uiSemi, fontSize: 12, letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: fuentes.ui,
    fontSize: 16,
  },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectorTxt: { color: colors.text, fontFamily: fuentes.ui, fontSize: 16, flex: 1 },
  selectorFlecha: { color: colors.gold, fontSize: 14 },
  lista: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1.5, borderColor: colors.line, overflow: 'hidden' },
  listaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  listaCodigo: { color: colors.gold, fontFamily: fuentes.uiSemi, fontSize: 13, width: 36 },
  listaNombre: { color: colors.text, fontFamily: fuentes.ui, fontSize: 15, flex: 1 },

  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  chipActivo: { borderColor: colors.gold, backgroundColor: tinte(colors.gold, '22') },
  chipTxt: { color: colors.muted, fontFamily: fuentes.uiSemi, fontSize: 14 },
  chipTxtActivo: { color: colors.gold },

  error: { color: colors.up, fontFamily: fuentes.uiSemi, fontSize: 13 },
  guardar: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', overflow: 'hidden' },
  guardarTxt: { color: colors.onGold, fontFamily: fuentes.uiBold, fontSize: 15 },
  eliminar: { alignItems: 'center', paddingVertical: 10 },
  eliminarTxt: { color: colors.up, fontFamily: fuentes.uiSemi, fontSize: 14 },
});
