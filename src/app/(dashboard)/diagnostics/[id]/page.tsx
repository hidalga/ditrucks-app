"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, Badge, PageHeader, Loading, ScoreGauge } from "@/components/ui";
import { RISK_LEVEL_LABELS, RISK_LEVEL_COLORS, RISK_LEVEL_DOT, USAGE_TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export default function DiagnosticDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [diag, setDiag] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/diagnostics/${id}`).then(r => r.json()).then(setDiag).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading />;
  if (!diag) return <p className="text-red-400">Diagnóstico no encontrado</p>;

  const penalties = diag.scorePenalties ? JSON.parse(diag.scorePenalties) : [];

  return (
    <>
      <PageHeader
        title={`Diagnóstico — ${diag.vehicle?.brand} ${diag.vehicle?.model}`}
        description={`Orden ${diag.serviceOrder?.folio} • ${formatDate(diag.diagnosticDate)}`}
        breadcrumbs={[{label:"Diagnósticos",href:"/diagnostics"},{label:`${diag.vehicle?.brand} ${diag.vehicle?.model}`}]}
      />

      {/* Scores */}
      <Card className="p-6 mb-4">
        <div className="flex items-center gap-8 flex-wrap justify-center mb-6">
          <ScoreGauge score={diag.generalHealthScore} label="General" />
          {diag.dpfScore != null && <ScoreGauge score={diag.dpfScore} label="DPF" />}
          {diag.scrScore != null && <ScoreGauge score={diag.scrScore} label="SCR" />}
          {diag.egrScore != null && <ScoreGauge score={diag.egrScore} label="EGR" />}
        </div>
        <div className="text-center">
          <Badge className={`${RISK_LEVEL_COLORS[diag.riskLevel]} text-sm px-4 py-1`} dot={RISK_LEVEL_DOT[diag.riskLevel]}>
            Nivel de riesgo: {RISK_LEVEL_LABELS[diag.riskLevel]}
          </Badge>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Penalties */}
        {penalties.length > 0 && (
          <Card className="p-4">
            <h3 className="text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-3">Detalle de Penalizaciones</h3>
            <div className="space-y-1.5">
              {penalties.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-brand-surface2 rounded-lg text-sm">
                  <span className="text-red-400 font-mono font-bold w-10 text-right">-{p.points}</span>
                  <Badge className="bg-brand-surface text-brand-text-muted border-brand-border text-[10px]">{p.system}</Badge>
                  <span className="text-brand-text-muted">{p.reason}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* General info */}
        <Card className="p-4">
          <h3 className="text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-3">Información General</h3>
          <dl className="space-y-2 text-sm">
            {[
              ["Técnico", diag.technician?.name],
              ["Escáner", diag.scannerTool],
              ["Tipo de uso", USAGE_TYPE_LABELS[diag.usageType]],
              ["DTC Activos", diag.dtcActive],
              ["DTC Pendientes", diag.dtcPending],
              ["DTC Historial", diag.dtcHistory],
              ["Síntomas", diag.generalSymptoms],
              ["Condiciones operación", diag.operatingConditions],
              ["Historial mto.", diag.maintenanceHistoryNotes],
              ["Próxima revisión", diag.nextCheckDate ? formatDate(diag.nextCheckDate) : null],
            ].map(([label, val]) => val ? (
              <div key={label as string} className="flex gap-3">
                <dt className="text-brand-text-dim w-36 flex-shrink-0">{label}</dt>
                <dd>{val}</dd>
              </div>
            ) : null)}
          </dl>
        </Card>

        {/* Recommendation */}
        {diag.recommendation && (
          <Card className="p-4 lg:col-span-2">
            <h3 className="text-xs font-semibold text-brand-accent uppercase tracking-wider mb-2">Recomendación Técnica</h3>
            <p className="text-sm bg-brand-accent/5 border border-brand-accent/20 rounded-lg p-4">{diag.recommendation}</p>
          </Card>
        )}
      </div>
    </>
  );
}
