import { useEffect, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { colors } from './theme';

/**
 * Único anuncio de la app: un banner discreto fijo al pie.
 * - Se pide consentimiento (UMP) antes de inicializar el SDK.
 * - No aparece hasta que cargue (si falla, no deja hueco) ni mientras se usa el teclado.
 * - En Expo Go el módulo nativo no existe: no se muestra nada.
 */

// Reemplazar por el ID real del bloque de anuncios de AdMob antes de publicar.
const BANNER_ID_PRODUCCION = '';

type Ads = typeof import('react-native-google-mobile-ads');

let ads: Ads | null = null;
try {
  ads = require('react-native-google-mobile-ads');
} catch {
  ads = null;
}

export function Anuncio({ visible }: { visible: boolean }) {
  const [listo, setListo] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [teclado, setTeclado] = useState(false);

  useEffect(() => {
    if (!ads) return;
    let activo = true;
    (async () => {
      try {
        const { canRequestAds } = await ads!.AdsConsent.gatherConsent();
        if (!canRequestAds) return;
        await ads!.default().initialize();
        if (activo) setListo(true);
      } catch {}
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
    };
  }, []);

  const unitId = __DEV__ ? ads?.TestIds.BANNER : BANNER_ID_PRODUCCION;
  if (!ads || !listo || !visible || !unitId) return null;
  const { BannerAd, BannerAdSize } = ads;

  return (
    // Se mantiene montado para que cargue, pero sin ocupar espacio hasta tener anuncio.
    <View style={[s.caja, (!cargado || teclado) && s.oculto]}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.BANNER}
        onAdLoaded={() => setCargado(true)}
        onAdFailedToLoad={() => setCargado(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  caja: { alignItems: 'center', backgroundColor: colors.bg, paddingBottom: 6 },
  oculto: { height: 0, overflow: 'hidden', paddingBottom: 0 },
});
