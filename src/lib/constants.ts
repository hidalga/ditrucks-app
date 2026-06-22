export const COMPANY_INFO = {
  legalName: "Motronic Solutions",
  tradeName: "Ditrucks",
  tagline: "Diesel Truck Solutions",
  address: "Av. Cubilete 772-PB, Zapopan, Jalisco, México",
  phone: "+52 33 1660 0110",
  email: "ventas@ditrucks.com.mx",
  website: "www.ditrucks.com.mx",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  borrador: "Borrador",
  recepcion: "Recepción",
  recepcion_completada: "Recepción Completada",
  firma_pendiente: "Firma Pendiente",
  firma_enviada: "Enlace Enviado",
  firmada: "Firmada",
  diagnostico_inicial: "Diagnóstico Inicial",
  leyendo_ecu: "Leyendo ECU",
  archivo_original_subido: "Archivo Original Subido",
  en_analisis: "En Análisis / Calibración",
  archivo_modificado_listo: "Archivo Modificado Listo",
  instalando_archivo: "Instalando Archivo",
  prueba_posterior: "Prueba Posterior",
  completada_tecnica: "Completada Técnicamente",
  certificado_generado: "Certificado Generado",
  entregada: "Entregada",
  cerrada: "Cerrada",
  cancelada: "Cancelada",
};

export const ORDER_STATUS_SHORT: Record<string, string> = {
  borrador: "Borrador",
  recepcion: "Recepción",
  recepcion_completada: "Recepción OK",
  firma_pendiente: "Firma",
  firma_enviada: "Firma Env.",
  firmada: "Firmada",
  diagnostico_inicial: "Dx Inicial",
  leyendo_ecu: "Lectura ECU",
  archivo_original_subido: "Arch. Orig.",
  en_analisis: "Análisis",
  archivo_modificado_listo: "Arch. Listo",
  instalando_archivo: "Instalación",
  prueba_posterior: "Prueba",
  completada_tecnica: "Completa",
  certificado_generado: "Certificado",
  entregada: "Entregada",
  cerrada: "Cerrada",
  cancelada: "Cancelada",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  borrador: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  recepcion: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  recepcion_completada: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  firma_pendiente: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  firma_enviada: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  firmada: "bg-purple-500/20 text-purple-200 border-purple-400/30",
  diagnostico_inicial: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  leyendo_ecu: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  archivo_original_subido: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  en_analisis: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  archivo_modificado_listo: "bg-lime-500/20 text-lime-400 border-lime-500/30",
  instalando_archivo: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  prueba_posterior: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  completada_tecnica: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  certificado_generado: "bg-green-500/20 text-green-300 border-green-500/30",
  entregada: "bg-green-500/20 text-green-400 border-green-500/30",
  cerrada: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelada: "bg-red-500/20 text-red-400 border-red-500/30",
};

export const SIGNATURE_STATUS_LABELS: Record<string, string> = {
  none: "Sin firma",
  pending: "Pendiente",
  sent: "Enlace enviado",
  viewed: "Enlace visto",
  signed: "Firmada",
};

export const SIGNATURE_STATUS_COLORS: Record<string, string> = {
  none: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  sent: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  viewed: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  signed: "bg-green-500/20 text-green-400 border-green-500/30",
};

export const CERTIFICATE_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  generated: "Generado",
  published: "Publicado",
  revoked: "Revocado",
};

export const CERTIFICATE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  generated: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  published: "bg-green-500/20 text-green-400 border-green-500/30",
  revoked: "bg-red-500/20 text-red-400 border-red-500/30",
};

export const RISK_LEVEL_LABELS: Record<string, string> = {
  excelente: "Excelente",
  bueno: "Bueno",
  medio: "Medio",
  alto: "Alto",
  critico: "Crítico",
};

export const RISK_LEVEL_COLORS: Record<string, string> = {
  excelente: "bg-green-500/20 text-green-400 border-green-500/30",
  bueno: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  medio: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  alto: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  critico: "bg-red-500/20 text-red-400 border-red-500/30",
};

export const RISK_LEVEL_DOT: Record<string, string> = {
  excelente: "bg-green-400",
  bueno: "bg-blue-400",
  medio: "bg-amber-400",
  alto: "bg-orange-400",
  critico: "bg-red-400",
};

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  diagnostico: "Diagnóstico",
  dpf: "DPF",
  egr: "EGR",
  scr_adblue: "SCR / AdBlue / UREA / DEF",
  dtc: "DTC",
  stage1_potencia: "Stage 1 / Potencia",
  limite_velocidad: "Límite de Velocidad",
  revision_archivo: "Revisión de Archivo",
  otro: "Otro",
};

export const COMPANY_TYPE_LABELS: Record<string, string> = {
  flotilla: "Flotilla",
  taller: "Taller",
  transporte: "Transporte",
  agricola: "Agrícola",
  construccion: "Construcción",
  particular: "Particular",
  otro: "Otro",
};

export const UNIT_TYPE_LABELS: Record<string, string> = {
  tractocamion: "Tractocamión",
  pickup: "Pickup",
  van: "Van",
  maquinaria: "Maquinaria",
  agricola: "Agrícola",
  construccion: "Construcción",
  autobus: "Autobús",
  otro: "Otro",
};

export const FUEL_TYPE_LABELS: Record<string, string> = {
  diesel: "Diésel",
  gasolina: "Gasolina",
  gas_natural: "Gas Natural",
  hibrido: "Híbrido",
  otro: "Otro",
};

export const ECU_TOOL_LABELS: Record<string, string> = {
  kess: "Kess",
  trasdata: "Trasdata",
  autotuner: "Autotuner",
  flex: "Flex",
  dfox: "DFOX",
  cmd: "CMD",
  bitbox: "BitBox",
  otro: "Otro",
};

export const READ_METHOD_LABELS: Record<string, string> = {
  obd: "OBD",
  bench: "Bench",
  boot: "Boot",
  service_mode: "Service Mode",
  other: "Otro",
};

export const FILE_TYPE_LABELS: Record<string, string> = {
  original: "Original",
  modified: "Modificado",
  backup: "Backup",
  log: "Log",
  other: "Otro",
};

export const EVIDENCE_CATEGORY_LABELS: Record<string, string> = {
  recepcion: "Recepción",
  dano_fisico: "Daño Físico",
  tablero_testigos: "Tablero / Testigos",
  escaner: "Escáner",
  herramienta_conectada: "Herramienta Conectada",
  lectura_ecu: "Lectura ECU",
  escritura_ecu: "Escritura ECU",
  prueba_final: "Prueba Final",
  marketing: "Marketing",
  otro: "Otro",
};

export const USAGE_TYPE_LABELS: Record<string, string> = {
  ciudad: "Ciudad",
  carretera: "Carretera",
  mixto: "Mixto",
  ralenti_alto: "Ralentí Alto",
  carga_pesada: "Carga Pesada",
  agricola: "Agrícola",
  construccion: "Construcción",
  reparto_urbano: "Reparto Urbano",
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  technician: "Técnico",
  calibrator: "Calibrador / Analista",
  sales: "Comercial",
  customer: "Cliente",
  fleet_admin: "Admin Flotilla",
  fleet_customer_future: "Cliente Flotilla",
};

export const CHECKSUM_STATUS_LABELS: Record<string, string> = {
  unknown: "Desconocido",
  pending: "Pendiente",
  ok: "OK",
  failed: "Fallido",
  corrected: "Corregido",
};

// Client-facing roles
export const CLIENT_ROLES = ["customer", "fleet_admin"];
export const INTERNAL_ROLES = ["admin", "technician", "calibrator", "sales"];
