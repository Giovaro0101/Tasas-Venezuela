import {
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Newsreader_600SemiBold, Newsreader_700Bold } from '@expo-google-fonts/newsreader';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Appearance,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { cargarCache, cargarSeries, cargarTasas, conActual, Series, Tasa } from './src/api';
import { Anuncio } from './src/Anuncio';
import { armarTexto, compartirTarjeta } from './src/compartir';
import { Conversor } from './src/Conversor';
import { TarjetaResumen } from './src/TarjetaResumen';
import { acentos, colors, fondos, fuentes, simbolos, tinte } from './src/theme';

const ORDEN: Tasa['id'][] = ['usd', 'eur', 'usdt'];

// La app es oscura: así el calendario y el teclado del sistema combinan con ella.
Appearance.setColorScheme('dark');

const CODIGOS: Record<Tasa['id'], string> = { usd: 'USD', eur: 'EUR', usdt: 'USDT' };

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
  const [ahora, setAhora] = useState(() => new Date());
  const [compartiendo, setCompartiendo] = useState(false);
  const tarjetaRef = useRef<View>(null);

  // El fondo pasa suavemente de un tinte al otro al cambiar de moneda.
  const fondoAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fondoAnim, { toValue: ORDEN.indexOf(sel), duration: 350, useNativeDriver: false }).start();
  }, [sel, fondoAnim]);
  const fondo = fondoAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [fondos.usd, fondos.eur, fondos.usdt],
  });

  const compartir = async () => {
    if (!tasas || compartiendo) return;
    setCompartiendo(true);
    try {
      const ahoraExacto = new Date();
      setAhora(ahoraExacto); // que la imagen y el texto lleven la misma hora
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      await compartirTarjeta(tarjetaRef, armarTexto(tasas, ahoraExacto, conversion));
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
  const tasa = tasas?.find((t) => t.id === sel);
  const serie = useMemo(() => conActual(series?.[sel] ?? [], tasa), [series, sel, tasa]);
  const idx = serie.length ? (pos === null ? serie.length - 1 : Math.min(pos, serie.length - 1)) : -1;
  const actual = idx >= 0 ? serie[idx] : null;
  const previo = idx > 0 ? serie[idx - 1] : null;
  const esUltimo = idx === serie.length - 1;

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
    <Animated.View style={[s.root, { backgroundColor: fondo }]}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={s.content}
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
          <Pressable onPress={() => refrescar(tasas)} disabled={cargando} hitSlop={8} style={[s.botonRedondo, cargando && { opacity: 0.5 }]}>
            <Text style={s.botonRedondoTxt}>↻</Text>
          </Pressable>
        </View>
        <View style={s.filete} />

        {/* Selector */}
        <View style={s.selector}>
          {tasas?.map((t) => {
            const activa = sel === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => {
                  setSel(t.id);
                  setPos(null);
                }}
                style={[s.tab, { borderBottomColor: activa ? acentos[t.id] : 'transparent' }]}
              >
                <View style={[s.tabInsignia, { backgroundColor: tinte(acentos[t.id], activa ? '33' : '1A') }]}>
                  <Text style={[s.tabSimbolo, { color: acentos[t.id] }]}>{simbolos[t.id]}</Text>
                </View>
                <Text style={[s.tabTxt, { color: activa ? colors.text : colors.muted }]}>{CODIGOS[t.id]}</Text>
              </Pressable>
            );
          })}
        </View>

        {!tasas && <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} />}

        {tasa && (
          <>
            {/* Cotización */}
            <View style={s.tarjeta}>
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
            </View>

            {/* Fecha */}
            <View style={s.fecha}>
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
            </View>
            {!esUltimo && (
              <Pressable onPress={() => setPos(null)} style={s.hoy}>
                <Text style={s.hoyTxt}>Volver al último registro</Text>
              </Pressable>
            )}

            <Conversor
              key={sel}
              simbolo={simbolos[sel]}
              acento={acento}
              codigo={CODIGOS[sel]}
              tasa={actual?.valor ?? null}
              fechaTasa={!esUltimo && actual ? aDDMMAAAA(actual.fecha) : null}
              onConversion={setConversion}
            />

            <Pressable onPress={compartir} disabled={compartiendo} style={[s.compartir, compartiendo && { opacity: 0.6 }]}>
              <Text style={s.compartirTxt}>{compartiendo ? 'Preparando…' : 'Compartir  ↗'}</Text>
            </Pressable>

            <Text style={s.pie}>Datos referenciales del BCV y de Binance P2P. Esta app no es oficial.</Text>
          </>
        )}
      </ScrollView>
      {/* La tarjeta que se convierte en imagen al compartir: montada pero fuera de la pantalla. */}
      <View style={s.fueraDePantalla} pointerEvents="none">
        <TarjetaResumen ref={tarjetaRef} tasas={tasas ?? []} ahora={ahora} conversion={conversion} />
      </View>
      <Anuncio visible={!!tasas} />
    </Animated.View>
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
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    borderBottomWidth: 2,
    marginBottom: -1,
  },
  tabInsignia: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabSimbolo: { fontFamily: fuentes.uiBold, fontSize: 12 },
  tabTxt: { fontFamily: fuentes.uiSemi, fontSize: 14, letterSpacing: 0.5 },

  tarjeta: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
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
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  flecha: { width: 52, alignItems: 'center', justifyContent: 'center' },
  flechaTxt: { color: colors.gold, fontFamily: fuentes.ui, fontSize: 26, lineHeight: 30 },
  fechaBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  fechaTxt: { color: colors.text, fontFamily: fuentes.uiSemi, fontSize: 14, flexShrink: 1 },
  fechaIcono: { color: colors.gold, fontSize: 12 },
  hoy: { alignSelf: 'center', marginTop: -6 },
  hoyTxt: { color: colors.gold, fontFamily: fuentes.uiSemi, fontSize: 12.5 },

  compartir: { backgroundColor: colors.gold, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  compartirTxt: { color: colors.onGold, fontFamily: fuentes.uiBold, fontSize: 15, letterSpacing: 0.3 },
  pie: { color: colors.faint, fontFamily: fuentes.ui, fontSize: 11, textAlign: 'center', paddingHorizontal: 12 },
  fueraDePantalla: { position: 'absolute', left: -2000, top: 0, width: 360 },
});
