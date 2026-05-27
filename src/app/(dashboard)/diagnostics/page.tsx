"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { Card, Badge, PageHeader, Loading, EmptyState, ScoreGauge } from "@/components/ui";
import { RISK_LEVEL_LABELS, RISK_LEVEL_COLORS, RISK_LEVEL_DOT } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export default function DiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/diagnostics").then(r => r.json()).then(setDiagnostics).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader title="Diagnósticos Post-Tratamiento" description="Evaluación de salud DPF, SCR y EGR" />

      {loading ? <Loading /> : diagnostics.length === 0 ? (
        <EmptyState icon={<Stethoscope size={40} />} title="Sin diagnósticos registrados" description="Los diagnósticos se crean desde las órdenes de servicio" />
      ) : (
        <div className="grid gap-3">
          {diagnostics.map((d: any) => (
            <Link key={d.id} href={`/diagnostics/${d.id}`}>
              <Card hover className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <ScoreGauge score={d.generalHealthScore} label="" size="sm" />
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm">
                        {d.vehicle?.brand} {d.vehicle?.model} {d.vehicle?.year || ""}
                        {d.vehicle?.plates && <span className="text-brand-text-dim ml-1">({d.vehicle.plates})</span>}
                      </h3>
                      <p className="text-xs text-brand-text-dim mt-0.5">
                        {d.vehicle?.company?.name || "Sin empresa"} • {d.serviceOrder?.folio} • {formatDate(d.diagnosticDate)}
                      </p>
                      <div className="flex gap-3 mt-1 text-xs text-brand-text-dim">
                        {d.dpfScore != null && <span>DPF: {d.dpfScore}</span>}
                        {d.scrScore != null && <span>SCR: {d.scrScore}</span>}
                        {d.egrScore != null && <span>EGR: {d.egrScore}</span>}
                      </div>
                    </div>
                  </div>
                  <Badge className={RISK_LEVEL_COLORS[d.riskLevel]} dot={RISK_LEVEL_DOT[d.riskLevel]}>
                    {RISK_LEVEL_LABELS[d.riskLevel]}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
