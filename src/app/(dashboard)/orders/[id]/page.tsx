"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText, Camera, HardDrive, Stethoscope, ClipboardList,
  Clock, History, ChevronRight, AlertTriangle, CheckCircle, PenLine, Award, Link2, Copy, ExternalLink,
} from "lucide-react";
import {
  Card, Badge, PageHeader, Loading, Tabs, Button, Input, Select, Textarea,
  ConfirmModal, ScoreGauge,
} from "@/components/ui";
import { SignaturePad } from "@/components/ui/signature-pad";
import {
  ORDER_STATUS_LABELS, ORDER_STATUS_SHORT, ORDER_STATUS_COLORS, SERVICE_TYPE_LABELS,
  ECU_TOOL_LABELS, READ_METHOD_LABELS, FILE_TYPE_LABELS,
  EVIDENCE_CATEGORY_LABELS, RISK_LEVEL_LABELS, RISK_LEVEL_COLORS, RISK_LEVEL_DOT,
  CHECKSUM_STATUS_LABELS, SIGNATURE_STATUS_LABELS, SIGNATURE_STATUS_COLORS,
  CERTIFICATE_STATUS_LABELS, CERTIFICATE_STATUS_COLORS,
} from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";

const ORDER_TABS = [
  { id: "summary", label: "Resumen", icon: <FileText size={15} /> },
  { id: "reception", label: "Recepción", icon: <ClipboardList size={15} /> },
  { id: "diagnostic", label: "Diagnóstico", icon: <Stethoscope size={15} /> },
  { id: "files", label: "Archivos ECU", icon: <HardDrive size={15} /> },
  { id: "evidence", label: "Evidencia", icon: <Camera size={15} /> },
  { id: "signature", label: "Firma", icon: <PenLine size={15} /> },
  { id: "certificate", label: "Certificado", icon: <Award size={15} /> },
  { id: "audit", label: "Historial", icon: <History size={15} /> },
];

const STATUS_FLOW = [
  "borrador", "recepcion", "recepcion_completada",
  "firma_pendiente", "firmada",
  "diagnostico_inicial", "leyendo_ecu", "archivo_original_subido",
  "en_analisis", "archivo_modificado_listo", "instalando_archivo",
  "prueba_posterior", "completada_tecnica", "certificado_generado",
  "entregada", "cerrada",
];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("summary");
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // ECU file form
  const [showFileForm, setShowFileForm] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);

  // Evidence form
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  // Signature
  const [showSignatureForm, setShowSignatureForm] = useState<"reception" | "delivery" | null>(null);
  const [signatureLoading, setSignatureLoading] = useState(false);
  const [remoteSign, setRemoteSign] = useState<Record<"reception" | "delivery", { url: string; loading: boolean; copied: boolean }>>({
    reception: { url: "", loading: false, copied: false },
    delivery: { url: "", loading: false, copied: false },
  });

  // V2: Certificates
  const [certificates, setCertificates] = useState<any[]>([]);
  const [certLoading, setCertLoading] = useState(false);
  const [certCopied, setCertCopied] = useState<string | null>(null);

  const fetchOrder = useCallback(() => {
    fetch(`/api/orders/${id}`).then(r => r.json()).then(setOrder).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  // V2: Fetch certificates when tab changes
  useEffect(() => {
    if (tab === "certificate" && id) {
      fetch(`/api/orders/${id}/certificate`).then(r => r.json()).then(setCertificates).catch(() => {});
    }
  }, [tab, id]);

  // Generate remote signature link for a given signature phase
  const generateRemoteLink = async (phase: "reception" | "delivery") => {
    setRemoteSign((s) => ({ ...s, [phase]: { ...s[phase], loading: true } }));
    try {
      const res = await fetch(`/api/orders/${id}/signature/remote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase }),
      });
      const data = await res.json();
      setRemoteSign((s) => ({
        ...s,
        [phase]: { url: data.signUrl || "", loading: false, copied: false },
      }));
    } catch {
      setRemoteSign((s) => ({ ...s, [phase]: { ...s[phase], loading: false } }));
    }
  };

  const copyRemoteLink = (phase: "reception" | "delivery") => {
    navigator.clipboard.writeText(remoteSign[phase].url);
    setRemoteSign((s) => ({ ...s, [phase]: { ...s[phase], copied: true } }));
    setTimeout(() => setRemoteSign((s) => ({ ...s, [phase]: { ...s[phase], copied: false } })), 2000);
  };

  const copyToClipboard = (text: string, setter: (v: any) => void, resetValue: any = false) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(resetValue), 2000);
  };

  // V2: Generate certificate
  const generateCertificate = async () => {
    setCertLoading(true);
    try {
      await fetch(`/api/orders/${id}/certificate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      // Refresh certs
      const res = await fetch(`/api/orders/${id}/certificate`);
      setCertificates(await res.json());
      fetchOrder();
    } catch { /* ignore */ }
    setCertLoading(false);
  };

  const changeStatus = async (newStatus: string) => {
    setStatusLoading(true);
    await fetch(`/api/orders/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setConfirmStatus(null);
    setStatusLoading(false);
    fetchOrder();
  };

  const handleFileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFileLoading(true);
    const fd = new FormData(e.currentTarget);
    const data = {
      fileName: fd.get("fileName"),
      fileType: fd.get("fileType"),
      storageType: fd.get("storageType"),
      megaFolderPath: fd.get("megaFolderPath") || null,
      storagePath: fd.get("storagePath") || null,
      ecuBrand: fd.get("ecuBrand") || null,
      ecuModel: fd.get("ecuModel") || null,
      hardwareId: fd.get("hardwareId") || null,
      softwareId: fd.get("softwareId") || null,
      toolUsed: fd.get("toolUsed") || null,
      readMethod: fd.get("readMethod") || null,
      checksumStatus: fd.get("checksumStatus") || "unknown",
      notes: fd.get("notes") || null,
    };
    await fetch(`/api/orders/${id}/files`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    setFileLoading(false);
    setShowFileForm(false);
    fetchOrder();
  };

  const handleEvidenceSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEvidenceLoading(true);
    const fd = new FormData(e.currentTarget);
    const data = {
      filePath: fd.get("filePath"),
      category: fd.get("category"),
      description: fd.get("description") || null,
      marketingUsable: fd.get("marketingUsable") === "on",
      customerVisible: fd.get("customerVisible") === "on",
    };
    await fetch(`/api/orders/${id}/evidence`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    setEvidenceLoading(false);
    setShowEvidenceForm(false);
    fetchOrder();
  };

  const handleSignatureSave = async (dataUrl: string, name: string) => {
    if (!showSignatureForm) return;
    setSignatureLoading(true);
    try {
      await fetch(`/api/orders/${id}/signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase: showSignatureForm,
          signatureData: dataUrl,
          signerName: name,
        }),
      });
      setShowSignatureForm(null);
      fetchOrder();
    } catch {
      alert("Error al guardar la firma");
    } finally {
      setSignatureLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (!order) return <p className="text-red-400">Orden no encontrada</p>;

  const currentIdx = STATUS_FLOW.indexOf(order.status);
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;
  const latestDiag = order.diagnostics?.[0];

  return (
    <>
      <PageHeader
        title={order.folio}
        description={`${order.vehicle?.brand} ${order.vehicle?.model} ${order.vehicle?.year || ""} ${order.vehicle?.plates ? `(${order.vehicle.plates})` : ""}`}
        breadcrumbs={[{ label: "Órdenes", href: "/orders" }, { label: order.folio }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={ORDER_STATUS_COLORS[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
            {nextStatus && order.status !== "cancelada" && (
              <Button size="sm" onClick={() => setConfirmStatus(nextStatus)}>
                Avanzar a: {ORDER_STATUS_LABELS[nextStatus]} <ChevronRight size={14} />
              </Button>
            )}
            {order.status !== "cerrada" && order.status !== "cancelada" && (
              <Button size="sm" variant="danger" onClick={() => setConfirmStatus("cancelada")}>
                Cancelar
              </Button>
            )}
          </div>
        }
      />

      {/* Status progress bar */}
      <Card className="p-3 mb-4 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-[600px]">
          {STATUS_FLOW.map((s, i) => {
            const isCurrent = s === order.status;
            const isPast = i < currentIdx;
            return (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex-1 h-1.5 rounded-full transition-colors ${isPast || isCurrent ? "bg-brand-accent" : "bg-brand-border"}`} />
                {i < STATUS_FLOW.length - 1 && <div className="w-0.5" />}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1 min-w-[600px]">
          {STATUS_FLOW.map((s, i) => (
            <span key={s} className={`text-[9px] text-center flex-1 ${i <= currentIdx ? "text-brand-accent" : "text-brand-text-dim"}`}>
              {ORDER_STATUS_SHORT[s]}
            </span>
          ))}
        </div>
      </Card>

      {/* Tabs */}
      <Tabs tabs={ORDER_TABS} activeTab={tab} onChange={setTab} />

      <div className="mt-4">
        {/* ── SUMMARY TAB ── */}
        {tab === "summary" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <h3 className="text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-3">Información General</h3>
              <dl className="space-y-2 text-sm">
                {[
                  ["Folio", order.folio],
                  ["Empresa", order.company?.name],
                  ["Cliente", order.customer?.name],
                  ["Vehículo", `${order.vehicle?.brand} ${order.vehicle?.model} ${order.vehicle?.year || ""}`],
                  ["Placas", order.vehicle?.plates],
                  ["VIN", order.vehicle?.vin],
                  ["Técnico", order.technician?.name],
                  ["Calibrador", order.assignedCalibrator?.name],
                  ["Creado por", order.createdBy?.name],
                  ["Fecha recepción", formatDateTime(order.receivedAt)],
                  ["Fecha entrega", formatDateTime(order.deliveredAt)],
                  ["Km recepción", order.mileageAtReception?.toLocaleString()],
                  ["Horómetro", order.engineHoursAtReception],
                  ["Combustible", order.fuelLevel],
                ].map(([label, val]) => val ? (
                  <div key={label as string} className="flex gap-3">
                    <dt className="text-brand-text-dim w-32 flex-shrink-0">{label}</dt>
                    <dd>{val}</dd>
                  </div>
                ) : null)}
              </dl>
              {order.serviceTypes?.length > 0 && (
                <div className="mt-3 flex gap-1.5 flex-wrap">
                  {order.serviceTypes.map((st: string) => (
                    <Badge key={st} className="bg-brand-accent/10 text-brand-accent border-brand-accent/20 text-[10px]">
                      {SERVICE_TYPE_LABELS[st] || st}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>

            {/* Diagnostic summary */}
            <Card className="p-4">
              <h3 className="text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-3">Diagnóstico</h3>
              {latestDiag ? (
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <ScoreGauge score={latestDiag.generalHealthScore} label="General" />
                    {latestDiag.dpfScore != null && <ScoreGauge score={latestDiag.dpfScore} label="DPF" size="sm" />}
                    {latestDiag.scrScore != null && <ScoreGauge score={latestDiag.scrScore} label="SCR" size="sm" />}
                    {latestDiag.egrScore != null && <ScoreGauge score={latestDiag.egrScore} label="EGR" size="sm" />}
                  </div>
                  <Badge className={RISK_LEVEL_COLORS[latestDiag.riskLevel]} dot={RISK_LEVEL_DOT[latestDiag.riskLevel]}>
                    {RISK_LEVEL_LABELS[latestDiag.riskLevel]}
                  </Badge>
                  {latestDiag.scorePenalties && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-medium text-brand-text-muted">Penalizaciones:</p>
                      {JSON.parse(latestDiag.scorePenalties).map((p: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="text-red-400 font-mono">-{p.points}</span>
                          <span className="text-brand-text-dim">{p.system}:</span>
                          <span>{p.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {latestDiag.recommendation && (
                    <p className="mt-3 text-sm text-brand-text-muted bg-brand-surface2 p-3 rounded-lg">{latestDiag.recommendation}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-brand-text-dim py-6 text-center">Sin diagnóstico registrado</p>
              )}
            </Card>

            {/* Files summary */}
            <Card className="p-4">
              <h3 className="text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-3">Archivos ECU ({order.ecuFiles?.length || 0})</h3>
              {order.ecuFiles?.length > 0 ? (
                <div className="space-y-2">
                  {order.ecuFiles.slice(0, 5).map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between p-2 bg-brand-surface2 rounded-lg text-sm">
                      <div className="flex items-center gap-2">
                        <HardDrive size={14} className={f.fileType === "original" ? "text-blue-400" : f.fileType === "modified" ? "text-green-400" : "text-brand-text-dim"} />
                        <span className="font-medium">{f.fileName}</span>
                        <Badge className={f.fileType === "original" ? "bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]" : "bg-green-500/20 text-green-400 border-green-500/30 text-[10px]"}>
                          {FILE_TYPE_LABELS[f.fileType]}
                        </Badge>
                      </div>
                      <span className="text-xs text-brand-text-dim">{f.uploadedBy?.name}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-brand-text-dim text-center py-4">Sin archivos</p>}
            </Card>

            {/* Evidence summary */}
            <Card className="p-4">
              <h3 className="text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-3">Evidencia ({order.evidence?.length || 0})</h3>
              {order.evidence?.length > 0 ? (
                <div className="space-y-2">
                  {order.evidence.slice(0, 5).map((e: any) => (
                    <div key={e.id} className="flex items-center justify-between p-2 bg-brand-surface2 rounded-lg text-sm">
                      <div className="flex items-center gap-2">
                        <Camera size={14} className="text-brand-text-dim" />
                        <span>{e.description || EVIDENCE_CATEGORY_LABELS[e.category]}</span>
                        {e.marketingUsable && <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">MKT</Badge>}
                      </div>
                      <span className="text-xs text-brand-text-dim">{e.uploadedBy?.name}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-brand-text-dim text-center py-4">Sin evidencia</p>}
            </Card>
          </div>
        )}

        {/* ── RECEPTION TAB ── */}
        {tab === "reception" && (
          <Card className="p-5 max-w-3xl">
            <h3 className="text-sm font-semibold text-brand-accent mb-4 uppercase tracking-wider">Datos de Recepción</h3>
            <dl className="space-y-3 text-sm">
              {[
                ["Kilometraje", order.mileageAtReception?.toLocaleString()],
                ["Horómetro", order.engineHoursAtReception],
                ["Nivel de combustible", order.fuelLevel],
                ["Testigos activos", order.activeWarningLights],
                ["Fallas activas", order.activeFaults],
                ["Fallas del cliente", order.customerReportedFaults],
                ["Daños físicos", order.physicalDamageNotes],
                ["Observaciones", order.generalObservations],
                ["Trabajo solicitado", order.requestedServiceType],
                ["Resumen del trabajo", order.workSummary],
                ["Notas internas", order.internalNotes],
              ].map(([label, val]) => val ? (
                <div key={label as string}>
                  <dt className="text-brand-text-dim text-xs uppercase tracking-wider mb-0.5">{label}</dt>
                  <dd className="bg-brand-surface2 p-3 rounded-lg whitespace-pre-wrap">{val}</dd>
                </div>
              ) : null)}
            </dl>
          </Card>
        )}

        {/* ── DIAGNOSTIC TAB ── */}
        {tab === "diagnostic" && (
          <div>
            {order.diagnostics?.length > 0 ? (
              order.diagnostics.map((d: any) => (
                <Card key={d.id} className="p-5 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-sm">Diagnóstico — {formatDate(d.diagnosticDate)}</h3>
                      <p className="text-xs text-brand-text-dim">Técnico: {d.technician?.name}</p>
                    </div>
                    <Badge className={RISK_LEVEL_COLORS[d.riskLevel]} dot={RISK_LEVEL_DOT[d.riskLevel]}>
                      {d.generalHealthScore}/100 — {RISK_LEVEL_LABELS[d.riskLevel]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-6 mb-4">
                    <ScoreGauge score={d.generalHealthScore} label="General" />
                    {d.dpfScore != null && <ScoreGauge score={d.dpfScore} label="DPF" size="sm" />}
                    {d.scrScore != null && <ScoreGauge score={d.scrScore} label="SCR" size="sm" />}
                    {d.egrScore != null && <ScoreGauge score={d.egrScore} label="EGR" size="sm" />}
                  </div>
                  {d.scorePenalties && (
                    <div className="bg-brand-surface2 rounded-lg p-3 mb-3">
                      <p className="text-xs font-medium text-brand-text-muted mb-2">Detalle de penalizaciones:</p>
                      {JSON.parse(d.scorePenalties).map((p: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                          <span className="text-red-400 font-mono w-8 text-right">-{p.points}</span>
                          <Badge className="bg-brand-surface text-brand-text-muted border-brand-border text-[10px]">{p.system}</Badge>
                          <span>{p.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {d.recommendation && (
                    <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-lg p-3">
                      <p className="text-xs font-medium text-brand-accent mb-1">Recomendación:</p>
                      <p className="text-sm">{d.recommendation}</p>
                    </div>
                  )}
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center">
                <Stethoscope size={32} className="mx-auto text-brand-text-dim mb-2" />
                <p className="text-sm text-brand-text-dim">Sin diagnósticos registrados</p>
                <Link href={`/diagnostics/new?orderId=${id}&vehicleId=${order.vehicleId}`}>
                  <Button size="sm" className="mt-3">Crear Diagnóstico</Button>
                </Link>
              </Card>
            )}
          </div>
        )}

        {/* ── FILES TAB ── */}
        {tab === "files" && (
          <div>
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={() => setShowFileForm(!showFileForm)}>
                <HardDrive size={14} /> Registrar Archivo ECU
              </Button>
            </div>

            {showFileForm && (
              <Card className="p-5 mb-4">
                <form onSubmit={handleFileSubmit} className="space-y-4">
                  <h3 className="text-sm font-semibold text-brand-accent uppercase tracking-wider">Registrar Archivo ECU</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input name="fileName" label="Nombre del archivo *" placeholder="archivo_original.bin" required />
                    <Select name="fileType" label="Tipo" options={Object.entries(FILE_TYPE_LABELS).map(([v,l])=>({value:v,label:l}))} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select name="storageType" label="Almacenamiento" options={[{value:"mega_path",label:"Ruta Mega Sync"},{value:"local",label:"Local"},{value:"s3_future",label:"S3 (futuro)"}]} />
                    <Input name="megaFolderPath" label="Ruta Mega" placeholder="/Mega/ECU/cliente/..." />
                  </div>
                  <Input name="storagePath" label="Ruta local / URL" placeholder="/ruta/al/archivo" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input name="ecuBrand" label="Marca ECU" placeholder="Bosch, Delphi..." />
                    <Input name="ecuModel" label="Modelo ECU" placeholder="EDC17, CM2350..." />
                    <Input name="hardwareId" label="Hardware ID" placeholder="" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input name="softwareId" label="Software ID" placeholder="" />
                    <Select name="toolUsed" label="Herramienta" options={Object.entries(ECU_TOOL_LABELS).map(([v,l])=>({value:v,label:l}))} placeholder="—" />
                    <Select name="readMethod" label="Método lectura" options={Object.entries(READ_METHOD_LABELS).map(([v,l])=>({value:v,label:l}))} placeholder="—" />
                  </div>
                  <Select name="checksumStatus" label="Checksum" options={Object.entries(CHECKSUM_STATUS_LABELS).map(([v,l])=>({value:v,label:l}))} />
                  <Textarea name="notes" label="Notas" placeholder="Notas del archivo" />
                  <div className="flex gap-3">
                    <Button type="submit" loading={fileLoading}>Guardar Archivo</Button>
                    <Button type="button" variant="secondary" onClick={() => setShowFileForm(false)}>Cancelar</Button>
                  </div>
                </form>
              </Card>
            )}

            {order.ecuFiles?.length > 0 ? (
              <div className="space-y-3">
                {order.ecuFiles.map((f: any) => (
                  <Card key={f.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <HardDrive size={16} className={f.fileType === "original" ? "text-blue-400" : f.fileType === "modified" ? "text-green-400" : "text-brand-text-dim"} />
                        <span className="font-medium">{f.fileName}</span>
                        <Badge className={f.fileType === "original" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-green-500/20 text-green-400 border-green-500/30"}>
                          {FILE_TYPE_LABELS[f.fileType]} v{f.versionNumber}
                        </Badge>
                      </div>
                      <span className="text-xs text-brand-text-dim">{formatDateTime(f.createdAt)}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-brand-text-dim">
                      {f.ecuBrand && <span>ECU: {f.ecuBrand} {f.ecuModel}</span>}
                      {f.toolUsed && <span>Tool: {ECU_TOOL_LABELS[f.toolUsed]}</span>}
                      {f.readMethod && <span>Método: {READ_METHOD_LABELS[f.readMethod]}</span>}
                      {f.checksumStatus && <span>Checksum: {CHECKSUM_STATUS_LABELS[f.checksumStatus]}</span>}
                      {f.hardwareId && <span>HW: {f.hardwareId}</span>}
                      {f.softwareId && <span>SW: {f.softwareId}</span>}
                      {f.megaFolderPath && <span className="col-span-2">Mega: {f.megaFolderPath}</span>}
                    </div>
                    <div className="text-xs text-brand-text-dim mt-1">Subido por: {f.uploadedBy?.name}</div>
                    {f.notes && <p className="text-xs text-brand-text-muted mt-1 bg-brand-surface2 p-2 rounded">{f.notes}</p>}
                  </Card>
                ))}
              </div>
            ) : !showFileForm && (
              <Card className="p-8 text-center">
                <HardDrive size={32} className="mx-auto text-brand-text-dim mb-2" />
                <p className="text-sm text-brand-text-dim">Sin archivos ECU registrados</p>
              </Card>
            )}
          </div>
        )}

        {/* ── EVIDENCE TAB ── */}
        {tab === "evidence" && (
          <div>
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={() => setShowEvidenceForm(!showEvidenceForm)}>
                <Camera size={14} /> Agregar Evidencia
              </Button>
            </div>

            {showEvidenceForm && (
              <Card className="p-5 mb-4">
                <form onSubmit={handleEvidenceSubmit} className="space-y-4">
                  <h3 className="text-sm font-semibold text-brand-accent uppercase tracking-wider">Nueva Evidencia</h3>
                  <Input name="filePath" label="Ruta / URL de la imagen *" placeholder="/ruta/imagen.jpg o URL" required />
                  <Select name="category" label="Categoría" options={Object.entries(EVIDENCE_CATEGORY_LABELS).map(([v,l])=>({value:v,label:l}))} />
                  <Textarea name="description" label="Descripción" placeholder="Descripción de la evidencia" />
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" name="marketingUsable" className="accent-amber-500" />
                      <span>Utilizable para marketing</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" name="customerVisible" className="accent-amber-500" />
                      <span>Visible para cliente</span>
                    </label>
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit" loading={evidenceLoading}>Guardar</Button>
                    <Button type="button" variant="secondary" onClick={() => setShowEvidenceForm(false)}>Cancelar</Button>
                  </div>
                </form>
              </Card>
            )}

            {order.evidence?.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {order.evidence.map((e: any) => (
                  <Card key={e.id} className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-brand-surface2 text-brand-text-muted border-brand-border text-[10px]">
                        {EVIDENCE_CATEGORY_LABELS[e.category]}
                      </Badge>
                      {e.marketingUsable && <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">MKT</Badge>}
                      {e.customerVisible && <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-[10px]">Cliente</Badge>}
                    </div>
                    <p className="text-sm truncate">{e.filePath}</p>
                    {e.description && <p className="text-xs text-brand-text-muted mt-1">{e.description}</p>}
                    <p className="text-xs text-brand-text-dim mt-1">{e.uploadedBy?.name} — {formatDateTime(e.createdAt)}</p>
                  </Card>
                ))}
              </div>
            ) : !showEvidenceForm && (
              <Card className="p-8 text-center">
                <Camera size={32} className="mx-auto text-brand-text-dim mb-2" />
                <p className="text-sm text-brand-text-dim">Sin evidencia registrada</p>
              </Card>
            )}
          </div>
        )}

        {/* ── SIGNATURE TAB ── */}
        {tab === "signature" && (
          <div className="max-w-2xl space-y-6">
            <SignatureSection
              phase="reception"
              title="Firma de Recepción"
              description="Autorización del servicio, confirmación de datos del vehículo y diagnóstico al ingreso. Protege legalmente la recepción."
              order={order}
              showSignatureForm={showSignatureForm}
              setShowSignatureForm={setShowSignatureForm}
              signatureLoading={signatureLoading}
              handleSignatureSave={handleSignatureSave}
              remoteSign={remoteSign}
              generateRemoteLink={generateRemoteLink}
              copyRemoteLink={copyRemoteLink}
            />
            <SignatureSection
              phase="delivery"
              title="Firma de Entrega"
              description="Conformidad del cliente con el trabajo realizado y la entrega del vehículo."
              order={order}
              showSignatureForm={showSignatureForm}
              setShowSignatureForm={setShowSignatureForm}
              signatureLoading={signatureLoading}
              handleSignatureSave={handleSignatureSave}
              remoteSign={remoteSign}
              generateRemoteLink={generateRemoteLink}
              copyRemoteLink={copyRemoteLink}
            />
          </div>
        )}

        {/* ── CERTIFICATE TAB ── */}
        {tab === "certificate" && (
          <div className="max-w-2xl space-y-4">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold">Certificados de Trabajo</h3>
                  <p className="text-xs text-brand-text-dim mt-0.5">Genera certificados para el cliente con QR verificable</p>
                </div>
                {["completada_tecnica","certificado_generado","entregada","cerrada"].includes(order.status) && (
                  <Button size="sm" onClick={generateCertificate} disabled={certLoading}>
                    <Award size={14} /> {certLoading ? "Generando..." : "Generar Certificado"}
                  </Button>
                )}
              </div>

              {certificates.length === 0 ? (
                <div className="bg-brand-surface2 rounded-lg p-8 text-center">
                  <Award size={28} className="mx-auto text-brand-text-dim mb-2" />
                  <p className="text-sm text-brand-text-dim">Sin certificados generados</p>
                  {!["completada_tecnica","certificado_generado","entregada","cerrada"].includes(order.status) && (
                    <p className="text-xs text-brand-text-muted mt-1">La orden debe estar en estado &quot;Completada Técnicamente&quot; o posterior para generar certificados.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {certificates.map((c: any) => {
                    const pubUrl = `${window.location.origin}/verify/${c.publicToken}`;
                    return (
                      <div key={c.id} className="bg-brand-surface2 rounded-xl p-4 border border-brand-border">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-semibold text-sm">{c.certificateNumber}</span>
                            <Badge className={CERTIFICATE_STATUS_COLORS[c.status] + " ml-2"}>{CERTIFICATE_STATUS_LABELS[c.status]}</Badge>
                          </div>
                          <span className="text-xs text-brand-text-dim">{formatDate(c.issuedAt)}</span>
                        </div>
                        {c.workSummary && <p className="text-xs text-brand-text-dim mb-2">{c.workSummary}</p>}
                        {c.systemsWorked?.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap mb-2">
                            {c.systemsWorked.map((s: string) => <span key={s} className="bg-brand-accent/10 text-brand-accent text-xs px-2 py-0.5 rounded-full">{s}</span>)}
                          </div>
                        )}
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(pubUrl); setCertCopied(c.id); setTimeout(() => setCertCopied(null), 2000); }}>
                            {certCopied === c.id ? <CheckCircle size={14} className="text-green-400" /> : <Copy size={14} />}
                            {certCopied === c.id ? "Copiado" : "Copiar enlace"}
                          </Button>
                          <a href={pubUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="secondary"><ExternalLink size={14} /> Verificar</Button>
                          </a>
                          <a href={`/api/certificates/${c.id}/pdf`} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="secondary"><FileText size={14} /> Descargar PDF</Button>
                          </a>
                        </div>
                        {c.generatedBy && <p className="text-xs text-brand-text-muted mt-2">Generado por {c.generatedBy.name}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── AUDIT TAB ── */}
        {tab === "audit" && (
          <Card className="p-4">
            <h3 className="text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-3">Historial de Cambios</h3>
            <div className="space-y-2 text-sm">
              <div className="flex gap-3 items-start p-2 bg-brand-surface2 rounded-lg">
                <Clock size={14} className="text-brand-text-dim mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">Orden creada</span>
                  <span className="text-brand-text-dim text-xs ml-2">{formatDateTime(order.createdAt)}</span>
                  {order.createdBy && <span className="text-brand-text-dim text-xs ml-1">por {order.createdBy.name}</span>}
                </div>
              </div>
              {order.receivedAt && (
                <div className="flex gap-3 items-start p-2 bg-brand-surface2 rounded-lg">
                  <Clock size={14} className="text-brand-text-dim mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Recepción registrada</span>
                    <span className="text-brand-text-dim text-xs ml-2">{formatDateTime(order.receivedAt)}</span>
                  </div>
                </div>
              )}
              {order.deliveredAt && (
                <div className="flex gap-3 items-start p-2 bg-brand-surface2 rounded-lg">
                  <CheckCircle size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Entrega registrada</span>
                    <span className="text-brand-text-dim text-xs ml-2">{formatDateTime(order.deliveredAt)}</span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Confirm modal */}
      <ConfirmModal
        open={!!confirmStatus}
        onClose={() => setConfirmStatus(null)}
        onConfirm={() => confirmStatus && changeStatus(confirmStatus)}
        title={confirmStatus === "cancelada" ? "Cancelar Orden" : "Cambiar Estado"}
        message={
          confirmStatus === "cancelada"
            ? "¿Estás seguro de cancelar esta orden? Esta acción no se puede deshacer fácilmente."
            : `¿Cambiar estado a "${ORDER_STATUS_LABELS[confirmStatus || ""]}"?`
        }
        confirmText={confirmStatus === "cancelada" ? "Cancelar Orden" : "Confirmar"}
        danger={confirmStatus === "cancelada"}
        loading={statusLoading}
      />
    </>
  );
}

type SignaturePhase = "reception" | "delivery";
type RemoteSignState = Record<SignaturePhase, { url: string; loading: boolean; copied: boolean }>;

function SignatureSection({
  phase, title, description, order, showSignatureForm, setShowSignatureForm,
  signatureLoading, handleSignatureSave, remoteSign, generateRemoteLink, copyRemoteLink,
}: {
  phase: SignaturePhase;
  title: string;
  description: string;
  order: any;
  showSignatureForm: SignaturePhase | null;
  setShowSignatureForm: (v: SignaturePhase | null) => void;
  signatureLoading: boolean;
  handleSignatureSave: (dataUrl: string, name: string) => void;
  remoteSign: RemoteSignState;
  generateRemoteLink: (phase: SignaturePhase) => void;
  copyRemoteLink: (phase: SignaturePhase) => void;
}) {
  const status = phase === "reception" ? order.receptionSignatureStatus : order.deliverySignatureStatus;
  const signatureData = phase === "reception" ? order.receptionSignatureData : order.deliverySignatureData;
  const signerName = phase === "reception" ? order.receptionSignerName : order.deliverySignerName;
  const signerRole = phase === "reception" ? order.receptionSignerRole : order.deliverySignerRole;
  const signedAt = phase === "reception" ? order.receptionSignedAt : order.deliverySignedAt;
  const ip = phase === "reception" ? order.receptionSignatureIp : order.deliverySignatureIp;
  const signatureType = phase === "reception" ? order.receptionSignatureType : order.deliverySignatureType;
  const signed = status === "signed";
  const rs = remoteSign[phase];

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-brand-text-dim mt-0.5">{description}</p>
        </div>
        <Badge className={SIGNATURE_STATUS_COLORS[status || "none"]}>
          {SIGNATURE_STATUS_LABELS[status || "none"]}
        </Badge>
      </div>

      {signed ? (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} className="text-green-400" />
            <span className="font-medium text-sm text-green-300">Firmada</span>
            {signatureType && <Badge className="bg-brand-surface2 text-brand-text-dim ml-2">{signatureType === "remote" ? "Remota" : "Presencial"}</Badge>}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-brand-text-dim">
            {signerName && <div><span className="text-brand-text-muted">Firmante:</span> {signerName}</div>}
            {signerRole && <div><span className="text-brand-text-muted">Cargo:</span> {signerRole}</div>}
            {signedAt && <div><span className="text-brand-text-muted">Fecha:</span> {formatDateTime(signedAt)}</div>}
            {ip && <div><span className="text-brand-text-muted">IP:</span> {ip}</div>}
          </div>
          {signatureData && (
            <div className="mt-3 bg-white rounded-lg p-2 inline-block">
              <img src={signatureData} alt="Firma" className="max-h-20" />
            </div>
          )}
        </div>
      ) : showSignatureForm === phase ? (
        <SignaturePad
          title={title}
          description={`${description} El firmante dibuja su firma en el recuadro.`}
          onSave={handleSignatureSave}
          onCancel={() => setShowSignatureForm(null)}
          loading={signatureLoading}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex gap-3 flex-wrap">
            <Button size="sm" onClick={() => generateRemoteLink(phase)} disabled={rs.loading}>
              <Link2 size={14} /> {rs.loading ? "Generando..." : "Generar Enlace Remoto"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowSignatureForm(phase)}>
              <PenLine size={14} /> Firma Presencial
            </Button>
          </div>

          {rs.url && (
            <div className="bg-brand-surface2 rounded-lg p-3">
              <p className="text-xs text-brand-text-muted mb-1.5">Enlace de firma (envía por WhatsApp, correo o CRM):</p>
              <div className="flex items-center gap-2">
                <input type="text" readOnly value={rs.url} className="flex-1 bg-brand-surface rounded px-2 py-1.5 text-xs text-brand-text-dim font-mono border border-brand-border" />
                <Button size="sm" variant="secondary" onClick={() => copyRemoteLink(phase)}>
                  {rs.copied ? <CheckCircle size={14} className="text-green-400" /> : <Copy size={14} />}
                  {rs.copied ? "Copiado" : "Copiar"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
