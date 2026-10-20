import { LinearGradient } from 'expo-linear-gradient';
import { Animated, StyleSheet } from 'react-native';
import { Tasa } from './api';
import { paletas } from './theme';

const ORDEN: Tasa['id'][] = ['usd', 'eur', 'usdt'];

/**
 * Fondo en degradado vertical. Hay una capa por moneda y se mezclan con opacidad,
 * así el color cambia con una transición suave al cambiar de pestaña.
 * `indice` es un valor animado: 0 = USD, 1 = EUR, 2 = USDT.
 */
export function Fondo({ indice }: { indice: Animated.Value }) {
  return (
    <>
      {ORDEN.map((id, i) => (
        <Animated.View
          key={id}
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: indice.interpolate({
                inputRange: [i - 1, i, i + 1],
                outputRange: [0, 1, 0],
                extrapolate: 'clamp',
              }),
            },
          ]}
        >
          <LinearGradient
            colors={[paletas[id].fondoArriba, paletas[id].fondoAbajo]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ))}
    </>
  );
}
