import { useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

/**
 * Único anuncio de la app: un banner discreto fijo al pie.
 * - Se pide consentimiento (UMP) antes de inicializar el SDK; si falla, se reintenta.
 * - Mientras carga está montado pero invisible y fuera del flujo (no ocupa espacio);
 *   si falla, se vuelve a pedir con una espera creciente.
 * - Se oculta mientras se usa el teclado.
 * - En Expo Go el módulo nativo no existe: no se muestra nada.
 */

// Reemplazar por el ID real del bloque de anuncios de AdMob antes de publicar.
const BANNER_ID_PRODUCCION = '';

// Esperas entre reintentos (ms): se queda en la última si siguen los fallos.
const ESPERAS = [4000, 8000, 15000, 30000, 60000];

type Ads = typeof import('react-native-google-mobile-ads');

let ads: Ads | null = null;
try {
  ads = require('react-native-google-mobile-ads');
} catch {
  ads = null;
}

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function Anuncio({ visible }: { visible: boolean }) {
  const [listo, setListo] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [teclado, setTeclado] = useState(false);
  const [intento, setIntento] = useState(0); // cambia la `key` del banner para volver a pedirlo
  const fallos = useRef(0);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Consentimiento + inicialización, con reintentos si algo falla.
  useEffect(() => {
    if (!ads) return;
    let activo = true;
    (async () => {
      for (let i = 0; activo; i++) {
        try {
          const { canRequestAds } = await ads!.AdsConsent.gatherConsent();
          if (!canRequestAds) return; // el usuario no consintió: no se muestran anuncios
          await ads!.default().initialize();
          if (activo) setListo(true);
          return;
        } catch (e) {
          if (__DEV__) console.warn('[Anuncio] consentimiento/inicialización falló:', e);
          await esperar(ESPERAS[Math.min(i, ESPERAS.length - 1)]);
        }
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', () => setTeclado(true));
    const b = Keyboard.addListener('keyboardDidHide', () => setTeclado(false));
    return () => {
      a.remove();
      b.remove();
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  const unitId = __DEV__ ? ads?.TestIds.BANNER : BANNER_ID_PRODUCCION;
  if (!ads || !listo || !visible || !unitId) return null;
  const { BannerAd, BannerAdSize } = ads;

  const alFallar = (error: unknown) => {
    if (__DEV__) console.warn('[Anuncio] no se pudo cargar el banner:', error);
    setCargado(false);
    const espera = ESPERAS[Math.min(fallos.current, ESPERAS.length - 1)];
    fallos.current += 1;
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setIntento((n) => n + 1), espera);
  };

  return (
    // Cargando: invisible y fuera del flujo, pero con su tamaño real para que el SDK lo pueda pedir.
    // Cargado: entra en el flujo, al pie de la pantalla. Con el teclado abierto se pliega.
    <View
      pointerEvents={cargado && !teclado ? 'auto' : 'none'}
      style={[s.caja, !cargado && s.cargando, cargado && teclado && s.plegado]}
    >
      <BannerAd
        key={intento}
        unitId={unitId}
        size={BannerAdSize.BANNER}
        onAdLoaded={() => {
          fallos.current = 0;
          setCargado(true);
        }}
        onAdFailedToLoad={alFallar}
      />
    </View>
  );
}

const s = StyleSheet.create({
  caja: { alignItems: 'center', paddingBottom: 6 },
  cargando: { position: 'absolute', left: 0, right: 0, bottom: 0, opacity: 0 },
  plegado: { height: 0, overflow: 'hidden', paddingBottom: 0 },
});
