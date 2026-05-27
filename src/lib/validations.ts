import { z } from "zod";

// ─── AUTH ──────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

// ─── COMPANY ──────────────────────────────────────────
export const companySchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  legalName: z.string().optional().nullable(),
  rfc: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  primaryContact: z.string().optional().nullable(),
  companyType: z.enum([
    "flotilla", "taller", "transporte", "agricola",
    "construccion", "particular", "otro",
  ]).default("particular"),
  notes: z.string().optional().nullable(),
});

// ─── CUSTOMER ──────────────────────────────────────────
export const customerSchema = z.object({
  companyId: z.string().optional().nullable(),
  name: z.string().min(1, "Nombre requerido"),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  position: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ─── VEHICLE ──────────────────────────────────────────
export const vehicleSchema = z.object({
  companyId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  economicNumber: z.string().optional().nullable(),
  vin: z.string().optional().nullable(),
  plates: z.string().optional().nullable(),
  brand: z.string().min(1, "Marca requerida"),
  model: z.string().min(1, "Modelo requerido"),
  year: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  engine: z.string().optional().nullable(),
  fuelType: z.enum(["diesel", "gasolina", "gas_natural", "hibrido", "otro"]).default("diesel"),
  mileage: z.coerce.number().int().min(0).optional().nullable(),
  hourMeter: z.coerce.number().int().min(0).optional().nullable(),
  unitType: z.enum([
    "tractocamion", "pickup", "van", "maquinaria",
    "agricola", "construccion", "autobus", "otro",
  ]).default("otro"),
  knownEcu: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ─── SERVICE ORDER ────────────────────────────────────
export const serviceOrderSchema = z.object({
  companyId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  vehicleId: z.string().min(1, "Vehículo requerido"),
  technicianId: z.string().optional().nullable(),
  assignedCalibratorId: z.string().optional().nullable(),
  serviceTypes: z.array(z.enum([
    "diagnostico", "dpf", "egr", "scr_adblue", "dtc",
    "stage1_potencia", "limite_velocidad", "revision_archivo", "otro",
  ])).default([]),
  mileageAtReception: z.coerce.number().int().min(0).optional().nullable(),
  engineHoursAtReception: z.coerce.number().int().min(0).optional().nullable(),
  fuelLevel: z.string().optional().nullable(),
  activeWarningLights: z.string().optional().nullable(),
  activeFaults: z.string().optional().nullable(),
  customerReportedFaults: z.string().optional().nullable(),
  physicalDamageNotes: z.string().optional().nullable(),
  generalObservations: z.string().optional().nullable(),
  requestedServiceType: z.string().optional().nullable(),
  workSummary: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  customerAuthorization: z.string().optional().nullable(),
});

export const orderStatusSchema = z.object({
  status: z.enum([
    "borrador", "recepcion", "diagnostico_inicial", "leyendo_ecu",
    "archivo_original_subido", "en_analisis", "archivo_modificado_listo",
    "instalando_archivo", "prueba_posterior", "cerrada", "cancelada",
  ]),
});

// ─── ECU FILE ─────────────────────────────────────────
export const ecuFileSchema = z.object({
  fileType: z.enum(["original", "modified", "backup", "log", "other"]).default("original"),
  fileName: z.string().min(1, "Nombre de archivo requerido"),
  fileExtension: z.string().optional().nullable(),
  fileSize: z.coerce.number().int().optional().nullable(),
  storageType: z.enum(["local", "mega_path", "s3_future"]).default("local"),
  storagePath: z.string().optional().nullable(),
  megaFolderPath: z.string().optional().nullable(),
  ecuBrand: z.string().optional().nullable(),
  ecuModel: z.string().optional().nullable(),
  ecuFamily: z.string().optional().nullable(),
  hardwareId: z.string().optional().nullable(),
  softwareId: z.string().optional().nullable(),
  calibrationId: z.string().optional().nullable(),
  toolUsed: z.enum(["kess", "trasdata", "autotuner", "flex", "dfox", "cmd", "bitbox", "otro"]).optional().nullable(),
  readMethod: z.enum(["obd", "bench", "boot", "service_mode", "other"]).optional().nullable(),
  checksumStatus: z.enum(["unknown", "pending", "ok", "failed", "corrected"]).default("unknown"),
  notes: z.string().optional().nullable(),
});

// ─── USER ─────────────────────────────────────────────
export const userSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres").optional(),
  role: z.enum(["admin", "technician", "calibrator", "sales", "fleet_customer_future"]).default("technician"),
  active: z.boolean().default(true),
});

// ─── DIAGNOSTIC ───────────────────────────────────────
export const diagnosticSchema = z.object({
  serviceOrderId: z.string().min(1),
  vehicleId: z.string().min(1),
  scannerTool: z.string().optional().nullable(),
  dtcActive: z.string().optional().nullable(),
  dtcPending: z.string().optional().nullable(),
  dtcHistory: z.string().optional().nullable(),
  freezeFrameNotes: z.string().optional().nullable(),
  generalSymptoms: z.string().optional().nullable(),
  operatingConditions: z.string().optional().nullable(),
  usageType: z.enum(["ciudad", "carretera", "mixto", "ralenti_alto", "carga_pesada", "agricola", "construccion", "reparto_urbano"]).default("mixto"),
  maintenanceHistoryNotes: z.string().optional().nullable(),

  dpfPresent: z.boolean().default(false),
  dpfDtcActive: z.boolean().default(false),
  sootLoadPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  ashLoadPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  differentialPressureIdle: z.coerce.number().optional().nullable(),
  differentialPressureHighRpm: z.coerce.number().optional().nullable(),
  lastRegenerationDistance: z.coerce.number().optional().nullable(),
  failedRegenerationsCount: z.coerce.number().int().min(0).optional().nullable(),
  regenerationFrequencyNotes: z.string().optional().nullable(),
  dpfTemperatureNotes: z.string().optional().nullable(),
  dpfNotes: z.string().optional().nullable(),

  scrPresent: z.boolean().default(false),
  scrDtcActive: z.boolean().default(false),
  defLevel: z.coerce.number().optional().nullable(),
  defQuality: z.coerce.number().optional().nullable(),
  defPumpPressure: z.coerce.number().optional().nullable(),
  noxUpstream: z.coerce.number().optional().nullable(),
  noxDownstream: z.coerce.number().optional().nullable(),
  scrEfficiency: z.coerce.number().optional().nullable(),
  defInjectorStatus: z.string().optional().nullable(),
  scrDerateActive: z.boolean().default(false),
  scrNotes: z.string().optional().nullable(),

  egrPresent: z.boolean().default(false),
  egrDtcActive: z.boolean().default(false),
  egrCommandedPosition: z.coerce.number().optional().nullable(),
  egrActualPosition: z.coerce.number().optional().nullable(),
  egrDeviation: z.coerce.number().optional().nullable(),
  egrFlowNotes: z.string().optional().nullable(),
  egrTemperatureNotes: z.string().optional().nullable(),
  egrNotes: z.string().optional().nullable(),

  recommendation: z.string().optional().nullable(),
  nextCheckDate: z.string().optional().nullable(),
  commercialOpportunityStatus: z.enum([
    "sin_oportunidad", "seguimiento", "cotizar", "agendar", "vendido", "perdido",
  ]).default("sin_oportunidad"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CompanyInput = z.infer<typeof companySchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type ServiceOrderInput = z.infer<typeof serviceOrderSchema>;
export type EcuFileInput = z.infer<typeof ecuFileSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type DiagnosticInput = z.infer<typeof diagnosticSchema>;
