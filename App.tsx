import {
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Newsreader_600SemiBold, Newsreader_700Bold } from '@expo-google-fonts/newsreader';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Appearance,
  BackHandler,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { cargarCache, cargarSeries, cargarTasas, conActual, Series, Tasa } from './src/api';
import { Anuncio } from './src/Anuncio';
import { armarTexto, compartirTarjeta, compartirTexto } from './src/compartir';
import { Conversor } from './src/Conversor';
import {
  cargarDatosBancarios,
  DatoBancario,
  guardarDatosBancarios,
  textoDato,
} from './src/datosBancarios';
import { DatosPago } from './src/DatosPago';
import { FormularioDato } from './src/FormularioDato';
import { OpcionesCompartir } from './src/OpcionesCompartir';
import { TarjetaResumen } from './src/TarjetaResumen';
import { Fondo } from './src/Fondo';
import { acentos, colors, dorado, fuentes, paletas, simbolos, tinte } from './src/theme';

const ORDEN: Tasa['id'][] = ['usd', 'eur', 'usdt'];

// La pantalla de carga con el logo se mantiene hasta que la app esté lista para mostrarse.
SplashScreen.preventAutoHideAsync().catch(() => {});

// La app es oscura: así el calendario y el teclado del sistema combinan con ella.
Appearance.setColorScheme('dark');

const CODIGOS: Record<Tasa['id'], string> = { usd: 'USD', eur: 'EUR', usdt: 'USDT' };

const ETIQUETAS_TAB: Record<Tasa['id'], string> = { usd: 'Dólar BCV', eur: 'Euro', usdt: 'USDT' };

const aDDMMAAAA = (fecha: string) => fecha.split('-').reverse().join('/');

const fmt = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDia = (fecha: string) => {
  const [y, m, d] = fecha.split('-').map(Number);
  const txt = new Date(y, m - 1, d).toLocaleDateString('es-VE', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
};

const hora = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export default function App() {
  const [fuentesListas, errorFuentes] = useFonts({
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Newsreader_600SemiBold,
    Newsreader_700Bold,
  });
  const [tasas, setTasas] = useState<Tasa[] | null>(null);
  const [series, setSeries] = useState<Series | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [actualizadoEn, setActualizadoEn] = useState<Date | null>(null);
  const [sel, setSel] = useState<Tasa['id']>('usd');
  const [pos, setPos] = useState<number | null>(null); // null = último registro
  const [conversion, setConversion] = useState<string | null>(null);
  const [montoBs, setMontoBs] = useState<number | null>(null);
  const alCambiarConversion = useCallback((texto: string | null, bs: number | null) => {
    setConversion(texto);
    setMontoBs(bs);
  }, []);
  const [ahora, setAhora] = useState(() => new Date());
  const [compartiendo, setCompartiendo] = useState(false);
  const tarjetaRef = useRef<View>(null);

  // Datos de pago (pago móvil / transferencia): se guardan solo en el teléfono.
  const [datos, setDatos] = useState<DatoBancario[]>([]);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [datosCargados, setDatosCargados] = useState(false);
  const [formulario, setFormulario] = useState<{ visible: boolean; inicial: DatoBancario | null }>({
    visible: false,
    inicial: null,
  });
  useEffect(() => {
    cargarDatosBancarios().then(({ datos: d, seleccion: s }) => {
      setDatos(d);
      setSeleccion(s);
      setDatosCargados(true);
    });
  }, []);
  useEffect(() => {
    // No se guarda antes de terminar de leer, para no borrar lo que ya había.
    if (datosCargados) guardarDatosBancarios(datos, seleccion);
  }, [datos, seleccion, datosCargados]);

  // Menú lateral con los datos de pago.
  const { width: anchoPantalla } = useWindowDimensions();
  const anchoPanel = Math.min(anchoPantalla * 0.9, 380);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;
  const abrirMenu = () => {
    Keyboard.dismiss();
    setMenuAbierto(true);
    Animated.timing(menuAnim, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };
  const cerrarMenu = () => {
    Animated.timing(menuAnim, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(
      () => setMenuAbierto(false),
    );
  };
  // El botón atrás de Android cierra el menú en lugar de salir de la app.
  useEffect(() => {
    if (!menuAbierto) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      cerrarMenu();
      return true;
    });
    return () => sub.remove();
  }, [menuAbierto]);

  const alternarDato = (id: string) =>
    setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const guardarDato = (d: DatoBancario) => {
    const existe = datos.some((x) => x.id === d.id);
    setDatos(existe ? datos.map((x) => (x.id === d.id ? d : x)) : [...datos, d]);
    // Un dato nuevo queda marcado para compartirse.
    if (!existe) setSeleccion((s) => [...s, d.id]);
    setFormulario({ visible: false, inicial: null });
  };
  const eliminarDato = (id: string) => {
    setDatos((x) => x.filter((d) => d.id !== id));
    setSeleccion((s) => s.filter((x) => x !== id));
    setFormulario({ visible: false, inicial: null });
  };
  // Al compartir solo los datos no hay conversión, así que no llevan monto.
  const textosMarcados = () => datos.filter((d) => seleccion.includes(d.id)).map((d) => textoDato(d));
  const compartirSoloDatos = async () => {
    const textos = textosMarcados();
    if (!textos.length) return;
    try {
      await compartirTexto(textos.join('\n\n'));
    } catch {
      // Cancelado por el usuario.
    }
  };

  // Se oculta la pantalla de carga cuando hay tipografías y datos (guardados o recién cargados).
  const pantallaLista = (fuentesListas || !!errorFuentes) && (tasas !== null || !cargando);
  useEffect(() => {
    if (pantallaLista) SplashScreen.hide();
  }, [pantallaLista]);
  // Por seguridad, nunca se deja la pantalla de carga más de 8 segundos.
  useEffect(() => {
    const t = setTimeout(() => SplashScreen.hide(), 8000);
    return () => clearTimeout(t);
  }, []);

  // Teclado: Android no redimensiona la pantalla, así que se deja espacio al final del contenido
  // y se desplaza hasta el conversor para que lo escrito quede visible encima del teclado.
  const scrollRef = useRef<ScrollView>(null);
  const [convY, setConvY] = useState<number | null>(null);
  const [bloqueY, setBloqueY] = useState(0); // el conversor está dentro del bloque animado
  const [tecladoAlto, setTecladoAlto] = useState(0);
  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', (e) => setTecladoAlto(e.endCoordinates.height));
    const b = Keyboard.addListener('keyboardDidHide', () => setTecladoAlto(0));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  useEffect(() => {
    if (tecladoAlto === 0 || convY === null) return;
    // Un fotograma después, para que el espacio extra ya esté aplicado.
    const id = requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(0, bloqueY + convY - 70), animated: true }));
    return () => cancelAnimationFrame(id);
  }, [tecladoAlto, convY, bloqueY]);

  // Transición al cambiar de moneda: el fondo, el indicador de la pestaña y los colores avanzan
  // de forma continua (fondoAnim: 0 = USD, 1 = EUR, 2 = USDT) mientras el contenido se desvanece,
  // cambia en ese momento y vuelve a aparecer con un leve desplazamiento.
  const fondoAnim = useRef(new Animated.Value(0)).current;
  const contenidoAnim = useRef(new Animated.Value(1)).current;
  const cambiando = useRef(false);
  const cambiarMoneda = (id: Tasa['id']) => {
    if (id === sel || cambiando.current) return;
    cambiando.current = true;
    Animated.timing(fondoAnim, {
      toValue: ORDEN.indexOf(id),
      duration: 200,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start();
    Animated.timing(contenidoAnim, { toValue: 0, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(
      () => {
        setSel(id);
        setPos(null);
        Animated.timing(contenidoAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          cambiando.current = false;
        });
      },
    );
  };
  const [anchoSelector, setAnchoSelector] = useState(0);
  const colorIndicador = fondoAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [acentos.usd, acentos.eur, acentos.usdt],
  });
  const xIndicador = fondoAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, anchoSelector / 3, (2 * anchoSelector) / 3],
  });

  // Hoja que pregunta si se quieren añadir datos de pago al compartir la tasa.
  const [opcionesVisibles, setOpcionesVisibles] = useState(false);
  // Sin datos guardados no hay nada que preguntar: se comparte la tasa directamente.
  const alPulsarCompartir = () => (datos.length === 0 ? compartir([]) : setOpcionesVisibles(true));
  const compartirDesdeHoja = (ids: string[]) => {
    setOpcionesVisibles(false);
    // Un instante para que la hoja termine de cerrarse antes de abrir el menú del sistema.
    setTimeout(() => compartir(ids), 260);
  };

  const compartir = async (ids: string[] = []) => {
    if (!tasas || compartiendo) return;
    setCompartiendo(true);
    try {
      const ahoraExacto = new Date();
      setAhora(ahoraExacto); // que la imagen y el texto lleven la misma hora
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      // Con la tasa se añade el monto de la conversión, listo para copiar.
      const textosDatos = datos.filter((d) => ids.includes(d.id)).map((d) => textoDato(d, montoBs));
      await compartirTarjeta(tarjetaRef, armarTexto(sel, actual?.valor ?? null, fechaTasa, ahoraExacto, conversion, textosDatos));
    } catch {
      // El usuario canceló o no hay app compatible: no hay nada que mostrar.
    } finally {
      setCompartiendo(false);
    }
  };

  const refrescar = useCallback(async (previas: Tasa[] | null) => {
    setCargando(true);
    const { tasas: nuevas, errores } = await cargarTasas(previas);
    setTasas(nuevas);
    setError(errores > 0);
    if (errores === 0) setActualizadoEn(new Date());
    setSeries(await cargarSeries());
    setCargando(false);
  }, []);

  useEffect(() => {
    (async () => {
      const cache = await cargarCache();
      if (cache) setTasas(cache);
      refrescar(cache);
    })();
  }, [refrescar]);

  const acento = acentos[sel];
  const paleta = paletas[sel];
  const tasa = tasas?.find((t) => t.id === sel);
  const serie = useMemo(() => conActual(series?.[sel] ?? [], tasa), [series, sel, tasa]);
  const idx = serie.length ? (pos === null ? serie.length - 1 : Math.min(pos, serie.length - 1)) : -1;
  const actual = idx >= 0 ? serie[idx] : null;
  const previo = idx > 0 ? serie[idx - 1] : null;
  const esUltimo = idx === serie.length - 1;

  // Fecha (dd/mm/aaaa) de la tasa mostrada, solo si no es la más reciente.
  const fechaTasa = !esUltimo && actual ? aDDMMAAAA(actual.fecha) : null;

  const delta = actual && previo ? actual.valor - previo.valor : null;
  const pct = delta !== null && previo ? (delta / previo.valor) * 100 : null;
  const colorDelta = delta === null ? colors.muted : delta > 0 ? colors.up : delta < 0 ? colors.down : colors.muted;

  const irA = (i: number) => setPos(i >= serie.length - 1 ? null : Math.max(0, i));

  const aFecha = (f: string) => {
    const [y, m, d] = f.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  // Abre el calendario nativo; si el día elegido no tiene registro (fin de semana, feriado),
  // se usa el registro anterior más cercano.
  const abrirCalendario = () => {
    if (Platform.OS !== 'android' || !actual) return;
    DateTimePickerAndroid.open({
      value: aFecha(actual.fecha),
      mode: 'date',
      minimumDate: aFecha(serie[0].fecha),
      maximumDate: aFecha(serie[serie.length - 1].fecha),
      onChange: (event, fecha) => {
        if (event.type !== 'set' || !fecha) return;
        const elegida = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
        let i = 0;
        for (let k = 0; k < serie.length; k++) if (serie[k].fecha <= elegida) i = k;
        irA(i);
      },
    });
  };

  // Hasta que carguen las fuentes se muestra solo el fondo, para no ver un parpadeo de tipografía.
  if (!fuentesListas && !errorFuentes) return <View style={s.root} />;

  const estado = cargando
    ? 'Actualizando…'
    : error
      ? 'Sin conexión · datos guardados'
      : actualizadoEn
        ? `Actualizado ${hora(actualizadoEn)}`
        : '';
  const colorEstado = cargando ? colors.gold : error ? colors.up : colors.down;

  return (
    <View style={s.root}>
      <Fondo indice={fondoAnim} />
      <StatusBar style="light" />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[s.content, { paddingBottom: 40 + tecladoAlto }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={cargando && !!tasas}
            onRefresh={() => refrescar(tasas)}
            colors={[colors.gold]}
            progressBackgroundColor={colors.card}
          />
        }
      >
        {/* Cabecera */}
        <View style={s.cabecera}>
          <View style={{ flex: 1 }}>
            <Text style={s.marca}>Tasas Venezuela</Text>
            <View style={s.estadoFila}>
              <View style={[s.estadoPunto, { backgroundColor: colorEstado }]} />
              <Text style={s.estado}>{estado}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => refrescar(tasas)}
            disabled={cargando}
            hitSlop={8}
            style={[s.botonRedondo, { borderColor: paleta.marco, backgroundColor: paleta.tarjetaA }, cargando && { opacity: 0.5 }]}
          >
            <Text style={s.botonRedondoTxt}>↻</Text>
          </Pressable>
          <Pressable
            onPress={abrirMenu}
            hitSlop={8}
            accessibilityLabel="Abrir menú"
            style={[s.botonRedondo, { borderColor: paleta.marco, backgroundColor: paleta.tarjetaA }]}
          >
            <View style={s.rayas}>
              <View style={s.raya} />
              <View style={s.raya} />
              <View style={s.raya} />
            </View>
          </Pressable>
        </View>
        <View style={s.filete} />

        {/* Selector */}
        <View
          style={[s.selector, { borderBottomColor: paleta.marco }]}
          onLayout={(e) => setAnchoSelector(e.nativeEvent.layout.width)}
        >
          {tasas?.map((t) => {
            const activa = sel === t.id;
            return (
              <Pressable key={t.id} onPress={() => cambiarMoneda(t.id)} style={s.tab}>
                <View style={[s.tabInsignia, { backgroundColor: tinte(acentos[t.id], activa ? '33' : '1A') }]}>
                  <Text style={[s.tabSimbolo, { color: acentos[t.id] }]}>{simbolos[t.id]}</Text>
                </View>
                <Text
                  style={[s.tabTxt, { color: activa ? colors.text : colors.muted }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {ETIQUETAS_TAB[t.id]}
                </Text>
              </Pressable>
            );
          })}
          {/* Indicador que se desliza de una pestaña a otra */}
          {tasas && anchoSelector > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                s.indicador,
                { width: anchoSelector / 3, backgroundColor: colorIndicador, transform: [{ translateX: xIndicador }] },
              ]}
            />
          )}
        </View>

        {!tasas && <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} />}

        {tasa && (
          <Animated.View
            onLayout={(e) => setBloqueY(e.nativeEvent.layout.y)}
            style={[
              s.bloque,
              {
                opacity: contenidoAnim,
                transform: [{ translateY: contenidoAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
              },
            ]}
          >
            {/* Cotización */}
            <LinearGradient
              colors={[paleta.tarjetaA, paleta.tarjetaB]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[s.tarjeta, { borderColor: paleta.marco }]}
            >
              <View style={[s.tarjetaFilete, { backgroundColor: acento }]} />
              <View style={s.tarjetaCabecera}>
                <View style={[s.insignia, { backgroundColor: tinte(acento, '26') }]}>
                  <Text style={[s.insigniaTxt, { color: acento }]}>{simbolos[sel]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.tarjetaTitulo}>{tasa.nombre}</Text>
                  <Text style={s.tarjetaSub}>{tasa.fuente}</Text>
                </View>
              </View>

              <View style={s.valorFila}>
                <Text style={s.bs}>Bs.</Text>
                <Text style={s.valor} numberOfLines={1} adjustsFontSizeToFit>
                  {actual ? fmt(actual.valor) : '—'}
                </Text>
              </View>

              {delta !== null && pct !== null && (
                <View style={s.deltaFila}>
                  <View style={[s.deltaChip, { backgroundColor: tinte(colorDelta, '26') }]}>
                    <Text style={[s.deltaTxt, { color: colorDelta }]}>
                      {delta > 0 ? '▲' : delta < 0 ? '▼' : '•'} {delta > 0 ? '+' : ''}
                      {fmt(delta)} Bs · {pct > 0 ? '+' : ''}
                      {fmt(pct)} %
                    </Text>
                  </View>
                  <Text style={s.deltaNota}>vs. día anterior</Text>
                </View>
              )}
              {sel === 'usdt' && serie.length < 2 && (
                <Text style={s.nota}>El historial del USDT se va armando cada día que abras la app.</Text>
              )}
            </LinearGradient>

            {/* Fecha */}
            <LinearGradient
              colors={[paleta.tarjetaA, paleta.tarjetaB]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[s.fecha, { borderColor: paleta.marco }]}
            >
              <Pressable onPress={() => irA(idx - 1)} disabled={idx <= 0} hitSlop={6} style={s.flecha}>
                <Text style={[s.flechaTxt, idx <= 0 && { opacity: 0.25 }]}>‹</Text>
              </Pressable>
              <Pressable onPress={abrirCalendario} hitSlop={4} style={s.fechaBtn}>
                <Text style={s.fechaTxt} numberOfLines={1} adjustsFontSizeToFit>
                  {actual ? fmtDia(actual.fecha) : '—'}
                </Text>
                <Text style={s.fechaIcono}>▾</Text>
              </Pressable>
              <Pressable onPress={() => irA(idx + 1)} disabled={esUltimo} hitSlop={6} style={s.flecha}>
                <Text style={[s.flechaTxt, esUltimo && { opacity: 0.25 }]}>›</Text>
              </Pressable>
            </LinearGradient>
            {!esUltimo && (
              <Pressable onPress={() => setPos(null)} style={s.hoy}>
                <Text style={s.hoyTxt}>Volver al último registro</Text>
              </Pressable>
            )}

            <View onLayout={(e) => setConvY(e.nativeEvent.layout.y)}>
              <Conversor
                key={sel}
                simbolo={simbolos[sel]}
                acento={acento}
                paleta={paleta}
                codigo={CODIGOS[sel]}
                tasa={actual?.valor ?? null}
                fechaTasa={fechaTasa}
                onConversion={alCambiarConversion}
              />
            </View>
          </Animated.View>
        )}

        {/* Estos bloques no dependen de la moneda: quedan fijos al cambiar de pestaña. */}
        {tasa && (
          <>
            <Pressable onPress={alPulsarCompartir} disabled={compartiendo} style={compartiendo && { opacity: 0.6 }}>
              <LinearGradient colors={dorado} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.compartir}>
                <Text style={s.compartirTxt}>{compartiendo ? 'Preparando…' : 'Compartir  ↗'}</Text>
              </LinearGradient>
            </Pressable>

            <Text style={s.pie}>Datos referenciales del BCV y de Binance P2P. Esta app no es oficial.</Text>
          </>
        )}
      </ScrollView>
      <OpcionesCompartir
        visible={opcionesVisibles}
        datos={datos}
        preseleccion={seleccion}
        onCerrar={() => setOpcionesVisibles(false)}
        onSoloTasa={() => compartirDesdeHoja([])}
        onConDatos={compartirDesdeHoja}
      />
      {/* Menú lateral: se desliza desde la derecha */}
      <View style={StyleSheet.absoluteFill} pointerEvents={menuAbierto ? 'auto' : 'none'}>
        <Animated.View style={[s.velo, { opacity: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={cerrarMenu} />
        </Animated.View>
        <Animated.View
          style={[
            s.panel,
            {
              width: anchoPanel,
              transform: [{ translateX: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [anchoPanel + 8, 0] }) }],
            },
          ]}
        >
          <View style={s.panelCabecera}>
            <Text style={s.panelTitulo}>Menú</Text>
            <Pressable onPress={cerrarMenu} hitSlop={10} style={s.panelCerrar}>
              <Text style={s.panelCerrarTxt}>✕</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={s.panelContenido} showsVerticalScrollIndicator={false}>
            <DatosPago
              datos={datos}
              seleccion={seleccion}
              paleta={paleta}
              onAlternar={alternarDato}
              onAgregar={() => setFormulario({ visible: true, inicial: null })}
              onEditar={(d) => setFormulario({ visible: true, inicial: d })}
              onCompartirSolo={compartirSoloDatos}
            />
          </ScrollView>
        </Animated.View>
      </View>
      <FormularioDato
        visible={formulario.visible}
        inicial={formulario.inicial}
        onGuardar={guardarDato}
        onEliminar={eliminarDato}
        onCerrar={() => setFormulario({ visible: false, inicial: null })}
      />
      {/* La tarjeta que se convierte en imagen al compartir: montada pero fuera de la pantalla. */}
      <View style={s.fueraDePantalla} pointerEvents="none">
        <TarjetaResumen
          ref={tarjetaRef}
          id={sel}
          valor={actual?.valor ?? null}
          fechaTasa={fechaTasa}
          delta={delta}
          pct={pct}
          ahora={ahora}
          conversion={conversion}
        />
      </View>
      <Anuncio visible={!!tasas} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40, gap: 16 },

  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  marca: { color: colors.text, fontFamily: fuentes.cifraBold, fontSize: 28 },
  estadoFila: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  estadoPunto: { width: 7, height: 7, borderRadius: 4 },
  estado: { color: colors.muted, fontFamily: fuentes.ui, fontSize: 12 },
  botonRedondo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rayas: { gap: 4.5 },
  raya: { width: 17, height: 2, borderRadius: 1, backgroundColor: colors.gold },
  velo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(3,7,14,0.66)' },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    borderLeftWidth: 1.5,
    borderLeftColor: colors.line,
    paddingTop: 52,
  },
  panelCabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14 },
  panelTitulo: { color: colors.text, fontFamily: fuentes.cifraBold, fontSize: 26 },
  panelCerrar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  panelCerrarTxt: { color: colors.muted, fontSize: 14 },
  panelContenido: { paddingHorizontal: 16, paddingBottom: 40, gap: 16 },
  botonRedondoTxt: { color: colors.gold, fontSize: 20, lineHeight: 24 },
  filete: { width: 36, height: 3, borderRadius: 2, backgroundColor: colors.gold, marginTop: -4 },

  selector: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line },
  tab: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  indicador: { position: 'absolute', left: 0, bottom: -1, height: 2.5, borderRadius: 2 },
  bloque: { gap: 16 },
  tabInsignia: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabSimbolo: { fontFamily: fuentes.uiBold, fontSize: 12 },
  tabTxt: { fontFamily: fuentes.uiSemi, fontSize: 14, flexShrink: 1 },

  tarjeta: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 20,
    gap: 14,
    overflow: 'hidden',
  },
  tarjetaFilete: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  tarjetaCabecera: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  insignia: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  insigniaTxt: { fontFamily: fuentes.cifraBold, fontSize: 20 },
  tarjetaTitulo: { color: colors.text, fontFamily: fuentes.uiSemi, fontSize: 16 },
  tarjetaSub: { color: colors.muted, fontFamily: fuentes.ui, fontSize: 12 },
  valorFila: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  bs: { color: colors.faint, fontFamily: fuentes.ui, fontSize: 20 },
  valor: { color: colors.text, fontFamily: fuentes.cifra, fontSize: 62, lineHeight: 70, flexShrink: 1 },
  deltaFila: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  deltaChip: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11 },
  deltaTxt: { fontFamily: fuentes.uiSemi, fontSize: 12.5 },
  deltaNota: { color: colors.faint, fontFamily: fuentes.ui, fontSize: 12 },
  nota: { color: colors.muted, fontFamily: fuentes.ui, fontSize: 12 },

  fecha: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  flecha: { width: 52, alignItems: 'center', justifyContent: 'center' },
  flechaTxt: { color: colors.gold, fontFamily: fuentes.ui, fontSize: 26, lineHeight: 30 },
  fechaBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  fechaTxt: { color: colors.text, fontFamily: fuentes.uiSemi, fontSize: 14, flexShrink: 1 },
  fechaIcono: { color: colors.gold, fontSize: 12 },
  hoy: { alignSelf: 'center', marginTop: -6 },
  hoyTxt: { color: colors.gold, fontFamily: fuentes.uiSemi, fontSize: 12.5 },

  compartir: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', overflow: 'hidden' },
  compartirTxt: { color: colors.onGold, fontFamily: fuentes.uiBold, fontSize: 15, letterSpacing: 0.3 },
  pie: { color: colors.faint, fontFamily: fuentes.ui, fontSize: 11, textAlign: 'center', paddingHorizontal: 12 },
  fueraDePantalla: { position: 'absolute', left: -2000, top: 0, width: 360 },
});
