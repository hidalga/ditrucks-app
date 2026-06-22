import type { OrderStatus } from "@prisma/client";

export interface OrderProgress {
  percent: number;
  label: string;
  crmTag: string;
  nextAction: string;
}

const PROGRESS_MAP: Record<string, OrderProgress> = {
  borrador:              { percent: 5,   label: "Borrador",               crmTag: "draft",                nextAction: "Iniciar recepción" },
  recepcion:             { percent: 15,  label: "En Recepción",           crmTag: "reception_started",    nextAction: "Completar recepción" },
  recepcion_completada:  { percent: 20,  label: "Recepción Completada",   crmTag: "reception_completed",  nextAction: "Solicitar firma" },
  firma_pendiente:       { percent: 25,  label: "Firma Pendiente",        crmTag: "signature_pending",    nextAction: "Esperando firma del cliente" },
  firma_enviada:         { percent: 25,  label: "Enlace de Firma Enviado",crmTag: "signature_sent",       nextAction: "Esperando firma remota" },
  firmada:               { percent: 30,  label: "Firmada",                crmTag: "signed",               nextAction: "Iniciar diagnóstico" },
  diagnostico_inicial:   { percent: 35,  label: "Diagnóstico Inicial",    crmTag: "initial_diagnosis",    nextAction: "Leer ECU" },
  leyendo_ecu:           { percent: 40,  label: "Leyendo ECU",            crmTag: "ecu_reading",          nextAction: "Subir archivo original" },
  archivo_original_subido:{ percent: 50, label: "Archivo Original Subido",crmTag: "original_uploaded",    nextAction: "Analizar / calibrar" },
  en_analisis:           { percent: 60,  label: "En Análisis",            crmTag: "calibration_progress", nextAction: "Preparar archivo modificado" },
  archivo_modificado_listo:{ percent: 70,label: "Archivo Listo",          crmTag: "modified_ready",       nextAction: "Instalar archivo" },
  instalando_archivo:    { percent: 80,  label: "Instalando",             crmTag: "installing",           nextAction: "Realizar prueba posterior" },
  prueba_posterior:       { percent: 90, label: "Prueba Posterior",       crmTag: "post_test",            nextAction: "Completar trabajo técnico" },
  completada_tecnica:    { percent: 92,  label: "Completada Técnicamente",crmTag: "technical_completed",  nextAction: "Generar certificado" },
  certificado_generado:  { percent: 95,  label: "Certificado Generado",   crmTag: "certificate_generated",nextAction: "Entregar vehículo" },
  entregada:             { percent: 100, label: "Entregada",              crmTag: "delivered",            nextAction: "Cerrar orden" },
  cerrada:               { percent: 100, label: "Cerrada",                crmTag: "closed",               nextAction: "Completada" },
  cancelada:             { percent: 0,   label: "Cancelada",              crmTag: "cancelled",            nextAction: "—" },
};

export function getOrderProgress(status: OrderStatus | string): OrderProgress {
  return PROGRESS_MAP[status] || { percent: 0, label: status, crmTag: status, nextAction: "—" };
}

export function getProgressPercent(status: OrderStatus | string): number {
  return getOrderProgress(status).percent;
}

export function getCrmTag(status: OrderStatus | string): string {
  return getOrderProgress(status).crmTag;
}

// Status flow for the visual progress bar (excludes cancelled)
export const STATUS_FLOW: string[] = [
  "borrador",
  "recepcion",
  "recepcion_completada",
  "firma_pendiente",
  "firmada",
  "diagnostico_inicial",
  "leyendo_ecu",
  "archivo_original_subido",
  "en_analisis",
  "archivo_modificado_listo",
  "instalando_archivo",
  "prueba_posterior",
  "completada_tecnica",
  "certificado_generado",
  "entregada",
  "cerrada",
];

// Build CRM-safe payload (no sensitive data)
export function buildCrmPayload(order: {
  id: string;
  folio: string;
  status: string;
  externalCrmDealId?: string | null;
  progressPercent?: number;
  receptionSignatureStatus?: string;
  deliverySignatureStatus?: string;
}, eventType: string, extra?: Record<string, unknown>) {
  const progress = getOrderProgress(order.status);
  return {
    event_type: eventType,
    external_crm_deal_id: order.externalCrmDealId || null,
    service_order_id: order.id,
    folio: order.folio,
    current_status: order.status,
    progress_percentage: progress.percent,
    progress_label: progress.label,
    crm_tag: progress.crmTag,
    next_action: progress.nextAction,
    reception_signature_status: order.receptionSignatureStatus || "none",
    delivery_signature_status: order.deliverySignatureStatus || "none",
    updated_at: new Date().toISOString(),
    ...extra,
  };
}
