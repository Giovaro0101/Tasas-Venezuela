import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { cargarCache, cargarSeries, cargarTasas, conActual, Series, Tasa } from './src/api';
import { Anuncio } from './src/Anuncio';
import { armarTexto, compartirTarjeta } from './src/compartir';
import { Conversor } from './src/Conversor';
import { TarjetaResumen } from './src/TarjetaResumen';
import { acentos, colors, simbolos } from './src/theme';

const SIMBOLOS: Record<Tasa['id'], string> = { usd: '$', eur: '€', usdt: '₮' };
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

export default function App() {
  const [tasas, setTasas] = useState<Tasa[] | null>(null);
  const [series, setSeries] = useState<Series | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [sel, setSel] = useState<Tasa['id']>('usd');
  const [pos, setPos] = useState<number | null>(null); // null = último registro
  const [conversion, setConversion] = useState<string | null>(null);
  const [ahora, setAhora] = useState(() => new Date());
  const [compartiendo, setCompartiendo] = useState(false);
  const tarjetaRef = useRef<View>(null);

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

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={cargando && !!tasas} onRefresh={() => refrescar(tasas)} tintColor="#fff" />
        }
      >
        <View style={s.tabs}>
          {tasas?.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => {
                setSel(t.id);
                setPos(null);
              }}
              style={[s.tab, sel === t.id && { backgroundColor: acentos[t.id] + '26' }]}
            >
              <View style={[s.punto, { backgroundColor: acentos[t.id] }, sel !== t.id && { opacity: 0.45 }]} />
              <Text style={[s.tabTxt, sel === t.id && { color: acentos[t.id] }]}>{CODIGOS[t.id]}</Text>
            </Pressable>
          ))}
        </View>

        {!tasas && <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />}

        {tasa && (
          <>
            <View style={s.hero}>
              <View style={s.fuenteFila}>
                <View style={[s.insignia, { backgroundColor: acento + '26' }]}>
                  <Text style={[s.insigniaTxt, { color: acento }]}>{simbolos[sel]}</Text>
                </View>
                <Text style={[s.fuente, { flex: 1 }]}>{tasa.nombre} · {tasa.fuente}</Text>
                <Pressable
                  onPress={() => refrescar(tasas)}
                  disabled={cargando}
                  hitSlop={8}
                  style={[s.refrescar, cargando && { opacity: 0.6 }]}
                >
                  <Text style={[s.refrescarTxt, { color: acento }]}>{cargando ? 'Actualizando…' : '↻ Actualizar'}</Text>
                </Pressable>
              </View>
              <Text style={s.valor}>{actual ? `Bs. ${fmt(actual.valor)}` : '—'}</Text>
              {delta !== null && pct !== null && (
                <Text style={[s.delta, { color: delta > 0 ? colors.up : delta < 0 ? colors.down : colors.muted }]}>
                  {delta > 0 ? '▲' : delta < 0 ? '▼' : '•'} {delta > 0 ? '+' : ''}
                  {fmt(delta)} Bs ({pct > 0 ? '+' : ''}
                  {fmt(pct)}%) vs. día anterior
                </Text>
              )}
              {sel === 'usdt' && serie.length < 2 && (
                <Text style={s.nota}>El historial del USDT se va armando cada día que abras la app.</Text>
              )}
            </View>

            <View style={s.fecha}>
              <Pressable onPress={() => irA(idx - 1)} disabled={idx <= 0} hitSlop={10} style={s.flecha}>
                <Text style={[s.flechaTxt, idx <= 0 && { opacity: 0.25 }]}>‹</Text>
              </Pressable>
              <Pressable onPress={abrirCalendario} hitSlop={8} style={s.fechaBtn}>
                <Text style={s.fechaTxt}>{actual ? fmtDia(actual.fecha) : '—'}</Text>
                <Text style={[s.fechaIcono, { color: acento }]}>▾</Text>
              </Pressable>
              <Pressable onPress={() => irA(idx + 1)} disabled={esUltimo} hitSlop={10} style={s.flecha}>
                <Text style={[s.flechaTxt, esUltimo && { opacity: 0.25 }]}>›</Text>
              </Pressable>
            </View>
            {!esUltimo && (
              <Pressable onPress={() => setPos(null)} style={s.hoy}>
                <Text style={[s.hoyTxt, { color: acento }]}>Volver al último registro</Text>
              </Pressable>
            )}

            <Conversor
              key={sel}
              simbolo={SIMBOLOS[sel]}
              acento={acento}
              codigo={CODIGOS[sel]}
              tasa={actual?.valor ?? null}
              fechaTasa={!esUltimo && actual ? aDDMMAAAA(actual.fecha) : null}
              onConversion={setConversion}
            />

            <Pressable onPress={compartir} disabled={compartiendo} style={[s.compartir, compartiendo && { opacity: 0.6 }]}>
              <Text style={s.compartirTxt}>{compartiendo ? 'Preparando…' : 'Compartir'}</Text>
            </Pressable>
          </>
        )}

        {error && <Text style={s.error}>No se pudo actualizar todo. Desliza para reintentar.</Text>}
      </ScrollView>
      {/* La tarjeta que se convierte en imagen al compartir: montada pero fuera de la pantalla. */}
      <View style={s.fueraDePantalla} pointerEvents="none">
        <TarjetaResumen ref={tarjetaRef} tasas={tasas ?? []} ahora={ahora} conversion={conversion} />
      </View>
      <Anuncio visible={!!tasas} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 64, paddingBottom: 48, gap: 16 },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 16, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  punto: { width: 8, height: 8, borderRadius: 4 },
  tabTxt: { color: colors.muted, fontWeight: '600', fontSize: 14 },
  refrescar: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.chip },
  refrescarTxt: { fontSize: 13, fontWeight: '600' },
  fuenteFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  insignia: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  insigniaTxt: { fontSize: 18, fontWeight: '800' },
  hero: { paddingVertical: 14, gap: 6 },
  fuente: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  valor: { color: colors.text, fontSize: 48, fontWeight: '700', letterSpacing: -1 },
  delta: { fontSize: 14, fontWeight: '600' },
  nota: { color: colors.faint, fontSize: 12 },
  fecha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 8,
  },
  flecha: { paddingHorizontal: 18, paddingVertical: 12 },
  flechaTxt: { color: colors.text, fontSize: 28, lineHeight: 30 },
  fechaBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  fechaIcono: { fontSize: 14, fontWeight: '700' },
  fechaTxt: { color: colors.text, fontSize: 15, fontWeight: '600' },
  hoy: { alignSelf: 'center', marginTop: -6 },
  hoyTxt: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  error: { color: colors.up, textAlign: 'center' },
  fueraDePantalla: { position: 'absolute', left: -2000, top: 0, width: 360 },
  compartir: { backgroundColor: colors.accent, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  compartirTxt: { color: colors.bg, fontSize: 16, fontWeight: '700' },
});
