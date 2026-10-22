import AsyncStorage from '@react-native-async-storage/async-storage';

export type TipoDato = 'pagomovil' | 'transferencia';
export type TipoDocumento = 'V' | 'E' | 'J' | 'G' | 'P';
export type TipoCuenta = 'corriente' | 'ahorro';

export type DatoBancario = {
  id: string;
  tipo: TipoDato;
  titular: string;
  /** Nombre del banco (puede ser uno escrito a mano). */
  banco: string;
  /** Código de 4 dígitos; vacío si el banco se escribió a mano. */
  codigoBanco: string;
  documentoTipo: TipoDocumento;
  documento: string;
  /** Solo pago móvil: 11 dígitos, p. ej. 04121234567. */
  telefono: string;
  /** Solo transferencia: 20 dígitos. */
  cuenta: string;
  tipoCuenta: TipoCuenta;
};

/** Bancos habituales con su código de 4 dígitos. Si falta alguno, se puede escribir a mano. */
export const BANCOS: { codigo: string; nombre: string }[] = [
  { codigo: '0102', nombre: 'Banco de Venezuela' },
  { codigo: '0104', nombre: 'Venezolano de Crédito' },
  { codigo: '0105', nombre: 'Mercantil' },
  { codigo: '0108', nombre: 'Provincial' },
  { codigo: '0114', nombre: 'Bancaribe' },
  { codigo: '0115', nombre: 'Exterior' },
  { codigo: '0128', nombre: 'Banco Caroní' },
  { codigo: '0134', nombre: 'Banesco' },
  { codigo: '0137', nombre: 'Sofitasa' },
  { codigo: '0138', nombre: 'Banco Plaza' },
  { codigo: '0151', nombre: 'BFC Banco Fondo Común' },
  { codigo: '0156', nombre: '100% Banco' },
  { codigo: '0163', nombre: 'Banco del Tesoro' },
  { codigo: '0166', nombre: 'Banco Agrícola de Venezuela' },
  { codigo: '0168', nombre: 'Bancrecer' },
  { codigo: '0169', nombre: 'Mi Banco' },
  { codigo: '0171', nombre: 'Banco Activo' },
  { codigo: '0172', nombre: 'Bancamiga' },
  { codigo: '0174', nombre: 'Banplus' },
  { codigo: '0175', nombre: 'Bicentenario' },
  { codigo: '0177', nombre: 'Banfanb' },
  { codigo: '0191', nombre: 'BNC Banco Nacional de Crédito' },
];

const KEY_DATOS = 'datos-bancarios-v1';
const KEY_SELECCION = 'datos-seleccion-v1';

export const nuevoId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const datoVacio = (tipo: TipoDato = 'pagomovil'): DatoBancario => ({
  id: nuevoId(),
  tipo,
  titular: '',
  banco: '',
  codigoBanco: '',
  documentoTipo: 'V',
  documento: '',
  telefono: '',
  cuenta: '',
  tipoCuenta: 'corriente',
});

export const soloDigitos = (s: string) => s.replace(/\D/g, '');

export async function cargarDatosBancarios(): Promise<{ datos: DatoBancario[]; seleccion: string[] }> {
  try {
    const [d, s] = await Promise.all([AsyncStorage.getItem(KEY_DATOS), AsyncStorage.getItem(KEY_SELECCION)]);
    const datos: DatoBancario[] = d ? JSON.parse(d) : [];
    const seleccion: string[] = (s ? JSON.parse(s) : []).filter((id: string) => datos.some((x) => x.id === id));
    return { datos, seleccion };
  } catch {
    return { datos: [], seleccion: [] };
  }
}

export async function guardarDatosBancarios(datos: DatoBancario[], seleccion: string[]): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(KEY_DATOS, JSON.stringify(datos)),
      AsyncStorage.setItem(KEY_SELECCION, JSON.stringify(seleccion)),
    ]);
  } catch {
    // Sin espacio o sin acceso al almacenamiento: los datos siguen en pantalla durante la sesión.
  }
}

export const etiquetaTipo = (t: TipoDato) => (t === 'pagomovil' ? 'Pago móvil' : 'Transferencia');

const etiquetaDocumento = (t: TipoDocumento) =>
  t === 'V' || t === 'E' ? 'Cédula' : t === 'P' ? 'Pasaporte' : 'RIF';

/** 04121234567 → 0412-1234567 */
export const formatearTelefono = (t: string) => (t.length === 11 ? `${t.slice(0, 4)}-${t.slice(4)}` : t);

const bancoConCodigo = (d: DatoBancario) => (d.codigoBanco ? `${d.banco} (${d.codigoBanco})` : d.banco);

/** Línea corta para la lista: "Pago móvil · Banesco · 0412-1234567". */
export function resumenDato(d: DatoBancario): string {
  const clave =
    d.tipo === 'pagomovil' ? formatearTelefono(d.telefono) : d.cuenta ? `…${d.cuenta.slice(-4)}` : '';
  return [etiquetaTipo(d.tipo), d.banco, clave].filter(Boolean).join(' · ');
}

/** Monto para pegar en la app de un banco: coma decimal y sin puntos de miles (17602,40). */
export const montoParaCopiar = (n: number) => n.toFixed(2).replace('.', ',');

/**
 * Texto listo para compartir. Cada valor va en su propia línea y sin separadores
 * (teléfono sin guiones, monto sin puntos de miles) para que sea fácil copiarlo y pegarlo.
 * `montoBs` se añade solo si se comparte junto con una conversión.
 */
export function textoDato(d: DatoBancario, montoBs: number | null = null): string {
  const doc = `${etiquetaDocumento(d.documentoTipo)}: ${d.documentoTipo}-${d.documento}`;
  const monto = montoBs !== null && montoBs > 0 ? [`Monto (Bs): ${montoParaCopiar(montoBs)}`] : [];
  if (d.tipo === 'pagomovil') {
    return [
      'PAGO MÓVIL',
      `Banco: ${bancoConCodigo(d)}`,
      `Teléfono: ${d.telefono}`,
      doc,
      ...monto,
      `Titular: ${d.titular}`,
    ].join('\n');
  }
  return [
    'TRANSFERENCIA',
    `Banco: ${bancoConCodigo(d)}`,
    `Cuenta: ${d.cuenta}`,
    `Tipo de cuenta: ${d.tipoCuenta === 'corriente' ? 'Corriente' : 'Ahorro'}`,
    doc,
    ...monto,
    `Titular: ${d.titular}`,
  ].join('\n');
}

/** Devuelve el mensaje de error, o null si los datos son válidos. */
export function validarDato(d: DatoBancario): string | null {
  if (d.titular.trim().length < 3) return 'Escribe el nombre del titular.';
  if (!d.banco.trim()) return 'Elige o escribe el banco.';
  if (d.documento.length < 5) return 'Escribe la cédula o el RIF (solo números).';
  if (d.tipo === 'pagomovil') {
    if (!/^04\d{9}$/.test(d.telefono)) return 'El teléfono debe tener 11 dígitos y empezar por 04.';
  } else if (d.cuenta.length !== 20) {
    return `El número de cuenta debe tener 20 dígitos (tiene ${d.cuenta.length}).`;
  }
  return null;
}
