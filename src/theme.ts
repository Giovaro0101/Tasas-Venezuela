/**
 * Estética: banca privada moderna. Azul marino profundo, un único dorado sobrio
 * como acento de marca, cifras en serif y una interfaz limpia en sans-serif.
 */
export const colors = {
  bg: '#0A1424', // marino profundo
  card: '#111E33', // superficies
  cardAlt: '#16263F', // superficies elevadas / campos
  line: '#1F3050', // filetes
  text: '#EAF0F8',
  muted: '#8FA3C0',
  faint: '#5E7394',
  gold: '#D6B25E', // acento de marca
  onGold: '#0A1424', // texto sobre dorado
  up: '#F2766B', // sube (el bolívar pierde valor)
  down: '#45B87A', // baja: esmeralda
};

/** Color propio de cada moneda, usado en detalles pequeños para distinguirlas. */
export const acentos = {
  usd: '#3FAE6A', // verde esmeralda
  eur: '#6EA8FF', // azul
  usdt: '#A78BFA', // violeta
} as const;

/** Mezcla dos colores #RRGGBB; t = 0 es `a`, t = 1 es `b`. */
const mezcla = (a: string, b: string, t: number) => {
  const canal = (c: string, i: number) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
  const hex = (i: number) =>
    Math.round(canal(a, i) + (canal(b, i) - canal(a, i)) * t)
      .toString(16)
      .padStart(2, '0');
  return `#${hex(0)}${hex(1)}${hex(2)}`;
};

/** Fondo de la pantalla según la moneda: el marino base con un leve tinte de su color. */
export const fondos = {
  usd: mezcla(colors.bg, acentos.usd, 0.1),
  eur: mezcla(colors.bg, acentos.eur, 0.1),
  usdt: mezcla(colors.bg, acentos.usdt, 0.1),
} as const;

export const simbolos = { usd: '$', eur: '€', usdt: '₮' } as const;

/** Añade transparencia a un color #RRGGBB (alfa en hex, p. ej. '26' ≈ 15 %). */
export const tinte = (color: string, alfa: string) => color + alfa;

export const fuentes = {
  cifra: 'Newsreader_600SemiBold', // números grandes
  cifraBold: 'Newsreader_700Bold',
  ui: 'Inter_500Medium',
  uiSemi: 'Inter_600SemiBold',
  uiBold: 'Inter_700Bold',
} as const;
