"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Select, Textarea, Card, PageHeader } from "@/components/ui";
import { USAGE_TYPE_LABELS } from "@/lib/constants";

export default function NewDiagnosticPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const vehicleId = searchParams.get("vehicleId") || "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const getBool = (name: string) => fd.get(name) === "on" || fd.get(name) === "true";
    const getNum = (name: string) => { const v = fd.get(name); return v ? Number(v) : null; };

    const data = {
      serviceOrderId: fd.get("serviceOrderId"),
      vehicleId: fd.get("vehicleId"),
      scannerTool: fd.get("scannerTool") || null,
      usageType: fd.get("usageType") || "mixto",
      dtcActive: fd.get("dtcActive") || null,
      dtcPending: fd.get("dtcPending") || null,
      dtcHistory: fd.get("dtcHistory") || null,
      generalSymptoms: fd.get("generalSymptoms") || null,
      operatingConditions: fd.get("operatingConditions") || null,
      maintenanceHistoryNotes: fd.get("maintenanceHistoryNotes") || null,

      dpfPresent: getBool("dpfPresent"),
      dpfDtcActive: getBool("dpfDtcActive"),
      sootLoadPercent: getNum("sootLoadPercent"),
      ashLoadPercent: getNum("ashLoadPercent"),
      differentialPressureIdle: getNum("differentialPressureIdle"),
      differentialPressureHighRpm: getNum("differentialPressureHighRpm"),
      lastRegenerationDistance: getNum("lastRegenerationDistance"),
      failedRegenerationsCount: getNum("failedRegenerationsCount"),
      dpfNotes: fd.get("dpfNotes") || null,

      scrPresent: getBool("scrPresent"),
      scrDtcActive: getBool("scrDtcActive"),
      scrDerateActive: getBool("scrDerateActive"),
      defLevel: getNum("defLevel"),
      defQuality: getNum("defQuality"),
      defPumpPressure: getNum("defPumpPressure"),
      noxUpstream: getNum("noxUpstream"),
      noxDownstream: getNum("noxDownstream"),
      scrEfficiency: getNum("scrEfficiency"),
      defInjectorStatus: fd.get("defInjectorStatus") || null,
      scrNotes: fd.get("scrNotes") || null,

      egrPresent: getBool("egrPresent"),
      egrDtcActive: getBool("egrDtcActive"),
      egrCommandedPosition: getNum("egrCommandedPosition"),
      egrActualPosition: getNum("egrActualPosition"),
      egrDeviation: getNum("egrDeviation"),
      egrFlowNotes: fd.get("egrFlowNotes") || null,
      egrNotes: fd.get("egrNotes") || null,

      recommendation: fd.get("recommendation") || null,
      nextCheckDate: fd.get("nextCheckDate") || null,
      commercialOpportunityStatus: fd.get("commercialOpportunityStatus") || "sin_oportunidad",
    };

    try {
      const res = await fetch("/api/diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Error al crear diagnóstico");
        return;
      }
      const diag = await res.json();
      router.push(`/diagnostics/${diag.id}`);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const Toggle = ({ name, label }: { name: string; label: string }) => (
    <label className="flex items-center gap-2 p-2.5 bg-brand-surface2 rounded-lg cursor-pointer hover:bg-brand-border/50 transition-colors">
      <input type="checkbox" name={name} className="accent-amber-500" />
      <span className="text-sm">{label}</span>
    </label>
  );

  return (
    <>
      <PageHeader title="Nuevo Diagnóstico Post-Tratamiento" breadcrumbs={[{label:"Diagnósticos",href:"/diagnostics"},{label:"Nuevo"}]} />

      <Card className="max-w-3xl p-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* General */}
          <input type="hidden" name="serviceOrderId" value={orderId} />
          <input type="hidden" name="vehicleId" value={vehicleId} />

          <div>
            <h3 className="text-sm font-semibold text-brand-accent mb-3 uppercase tracking-wider">Información General</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input name="scannerTool" label="Herramienta de escáner" placeholder="Jaltest, Launch, Autel..." />
                <Select name="usageType" label="Tipo de uso" options={Object.entries(USAGE_TYPE_LABELS).map(([v,l])=>({value:v,label:l}))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Textarea name="dtcActive" label="DTC Activos" placeholder="P2002, P0401..." />
                <Textarea name="dtcPending" label="DTC Pendientes" placeholder="" />
                <Textarea name="dtcHistory" label="DTC Historial" placeholder="" />
              </div>
              <Textarea name="generalSymptoms" label="Síntomas generales" placeholder="Humo negro, modo limp, etc." />
              <Textarea name="maintenanceHistoryNotes" label="Historial de mantenimiento" placeholder="" />
            </div>
          </div>

          {/* DPF */}
          <div>
            <h3 className="text-sm font-semibold text-brand-accent mb-3 uppercase tracking-wider">DPF (Filtro de Partículas)</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Toggle name="dpfPresent" label="DPF presente en la unidad" />
                <Toggle name="dpfDtcActive" label="DTC activo en DPF" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Input name="sootLoadPercent" label="Hollín (%)" type="number" placeholder="0-100" />
                <Input name="ashLoadPercent" label="Ceniza (%)" type="number" placeholder="0-100" />
                <Input name="differentialPressureIdle" label="Presión Dif. Ralentí" type="number" step="0.1" placeholder="kPa" />
                <Input name="differentialPressureHighRpm" label="Presión Dif. RPM Alto" type="number" step="0.1" placeholder="kPa" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input name="lastRegenerationDistance" label="Última regen. (km)" type="number" placeholder="" />
                <Input name="failedRegenerationsCount" label="Regens. fallidas" type="number" placeholder="0" />
              </div>
              <Textarea name="dpfNotes" label="Notas DPF" placeholder="Observaciones sobre el DPF" />
            </div>
          </div>

          {/* SCR */}
          <div>
            <h3 className="text-sm font-semibold text-brand-accent mb-3 uppercase tracking-wider">SCR / AdBlue / DEF</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Toggle name="scrPresent" label="SCR presente" />
                <Toggle name="scrDtcActive" label="DTC activo SCR" />
                <Toggle name="scrDerateActive" label="Derate activo" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Input name="defLevel" label="Nivel DEF (%)" type="number" placeholder="" />
                <Input name="defQuality" label="Calidad DEF (%)" type="number" placeholder="" />
                <Input name="defPumpPressure" label="Presión bomba DEF" type="number" step="0.1" placeholder="bar" />
                <Input name="scrEfficiency" label="Eficiencia SCR (%)" type="number" placeholder="" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input name="noxUpstream" label="NOx Upstream" type="number" placeholder="ppm" />
                <Input name="noxDownstream" label="NOx Downstream" type="number" placeholder="ppm" />
              </div>
              <Input name="defInjectorStatus" label="Estado inyector DEF" placeholder="OK, falla, obstruido..." />
              <Textarea name="scrNotes" label="Notas SCR" placeholder="Observaciones del sistema SCR" />
            </div>
          </div>

          {/* EGR */}
          <div>
            <h3 className="text-sm font-semibold text-brand-accent mb-3 uppercase tracking-wider">EGR (Recirculación de Gases)</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Toggle name="egrPresent" label="EGR presente" />
                <Toggle name="egrDtcActive" label="DTC activo EGR" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input name="egrCommandedPosition" label="Posición comandada (%)" type="number" step="0.1" placeholder="" />
                <Input name="egrActualPosition" label="Posición actual (%)" type="number" step="0.1" placeholder="" />
                <Input name="egrDeviation" label="Desviación (%)" type="number" step="0.1" placeholder="" />
              </div>
              <Input name="egrFlowNotes" label="Notas de flujo EGR" placeholder="Insuficiente, restringido, normal..." />
              <Textarea name="egrNotes" label="Notas EGR" placeholder="Carbonización, obstrucciones, etc." />
            </div>
          </div>

          {/* Recommendation */}
          <div>
            <h3 className="text-sm font-semibold text-brand-accent mb-3 uppercase tracking-wider">Resultado y Recomendación</h3>
            <div className="space-y-4">
              <Textarea name="recommendation" label="Recomendación técnica" placeholder="Descripción de la recomendación..." />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input name="nextCheckDate" label="Próxima revisión" type="date" />
                <Select name="commercialOpportunityStatus" label="Oportunidad comercial" options={[
                  {value:"sin_oportunidad",label:"Sin oportunidad"},
                  {value:"seguimiento",label:"Seguimiento"},
                  {value:"cotizar",label:"Cotizar"},
                  {value:"agendar",label:"Agendar"},
                  {value:"vendido",label:"Vendido"},
                  {value:"perdido",label:"Perdido"},
                ]} />
              </div>
            </div>
          </div>

          <p className="text-xs text-brand-text-dim bg-brand-surface2 rounded-lg p-3">
            ⚡ El score de salud se calculará automáticamente basado en los datos capturados.
          </p>

          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"><p className="text-sm text-red-400">{error}</p></div>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading}>Crear Diagnóstico y Calcular Score</Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>Cancelar</Button>
          </div>
        </form>
      </Card>
    </>
  );
}
