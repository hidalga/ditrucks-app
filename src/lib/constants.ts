export const ORDER_STATUS_LABELS: Record<string, string> = {
    borrador: "Borrador",
    recepcion: "Recepción",
    diagnostico_inicial: "Diagnóstico Inicial",
    leyendo_ecu: "Leyendo ECU",
    archivo_original_subido: "Archivo Original Subido",
    en_analisis: "En Análisis / Calibración",
    archivo_modificado_listo: "Archivo Modificado Listo",
    instalando_archivo: "Instalando Archivo",
    prueba_posterior: "Prueba Posterior",
    cerrada: "Cerrada",
    cancelada: "Cancelada",
};

export const ORDER_STATUS_SHORT: Record<string, string> = {
    borrador: "Borrador",
    recepcion: "Recepción",
    diagnostico_inicial: "Dx Inicial",
    leyendo_ecu: "Lectura ECU",
    archivo_original_subido: "Arch. Original",
    en_analisis: "Análisis",
    archivo_modificado_listo: "Arch. Listo",
    instalando_archivo: "Instalación",
    prueba_posterior: "Prueba",
    cerrada: "Cerrada",
    cancelada: "Cancelada",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
    borrador: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    recepcion: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    diagnostico_inicial: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    leyendo_ecu: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    archivo_original_subido: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    en_analisis: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    archivo_modificado_listo: "bg-lime-500/20 text-lime-400 border-lime-500/30",
    instalando_archivo: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    prueba_posterior: "bg-teal-500/20 text-teal-400 border-teal-500/30",
    cerrada: "bg-green-500/20 text-green-400 border-green-500/30",
    cancelada: "bg-red-500/20 text-red-400 border-red-500/30",
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
    fleet_customer_future: "Cliente Flotilla",
};

export const CHECKSUM_STATUS_LABELS: Record<string, string> = {
    unknown: "Desconocido",
    pending: "Pendiente",
    ok: "OK",
    failed: "Fallido",
    corrected: "Corregido",
};