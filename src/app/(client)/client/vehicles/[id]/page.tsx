"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CalendarCheck, Phone } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { SERVICE_TYPE_LABELS, RISK_LEVEL_LABELS } from "@/lib/constants";

const scoreColor = (s: number | null) => {
  if (s === null) return "text-slate-400";
  if (s >= 85) return "text-green-600"; if (s >= 70) return "text-blue-600";
  if (s >= 50) return "text-amber-600"; if (s >= 30) return "text-orange-600";
  return "text-red-600";
};

const riskColors: Record<string, string> = {
  excelente: "bg-green-50 text-green-700 border-green-200",
  bueno: "bg-blue-50 text-blue-700 border-blue-200",
  medio: "bg-amber-50 text-amber-700 border-amber-200",
  alto: "bg-orange-50 text-orange-700 border-orange-200",
  critico: "bg-red-50 text-red-700 border-red-200",
};

export default function ClientVehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const [v, setV] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`/api/client/vehicles/${id}`).then(r => r.json()).then(setV).finally(() => setLoading(false)); }, [id]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-3 border-[#f6b31c] border-t-transparent rounded-full" /></div>;
  if (!v) return <p className="text-red-500 text-center py-8">Vehículo no encontrado</p>;

  const lastDiag = v.diagnostics?.[0];
  const rc = lastDiag ? riskColors[lastDiag.riskLevel] || "" : "";
  const isAtRisk = lastDiag && (lastDiag.riskLevel === "alto" || lastDiag.riskLevel === "critico");

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <Link href="/client/vehicles" className="text-xs text-[#b8860b] hover:underline mb-2 inline-block">← Vehículos</Link>
        <h1 className="text-2xl font-bold text-slate-900">{v.brand} {v.model} {v.year || ""}</h1>
        <p className="text-sm text-slate-500">{[v.plates, v.vin, v.economicNumber ? `#${v.economicNumber}` : null].filter(Boolean).join(" • ")}</p>
      </div>

      {/* Health overview */}
      {lastDiag && (
        <div className={`border rounded-xl p-5 mb-6 ${rc}`}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 opacity-80">Estado de Salud</h3>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-center">
              <span className={`text-3xl font-bold ${scoreColor(lastDiag.generalHealthScore)}`}>{lastDiag.generalHealthScore}</span>
              <p className="text-xs opacity-70 mt-0.5">General</p>
            </div>
            {lastDiag.dpfPresent && lastDiag.dpfScore != null && <ScoreBlock label="DPF" score={lastDiag.dpfScore} />}
            {lastDiag.scrPresent && lastDiag.scrScore != null && <ScoreBlock label="SCR" score={lastDiag.scrScore} />}
            {lastDiag.egrPresent && lastDiag.egrScore != null && <ScoreBlock label="EGR" score={lastDiag.egrScore} />}
            <div className="ml-auto text-right">
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${rc}`}>{RISK_LEVEL_LABELS[lastDiag.riskLevel]}</span>
              <p className="text-xs opacity-60 mt-1">{formatDate(lastDiag.diagnosticDate)}</p>
              {lastDiag.nextCheckDate && <p className="text-xs opacity-80 mt-0.5">Próxima revisión: {formatDate(lastDiag.nextCheckDate)}</p>}
            </div>
          </div>
          {(lastDiag.visibleRecommendation || lastDiag.recommendation) && (
            <p className="mt-3 text-sm opacity-90 bg-white/50 p-3 rounded-lg">{lastDiag.visibleRecommendation || lastDiag.recommendation}</p>
          )}
        </div>
      )}

      {/* Action CTA for at-risk vehicles */}
      {isAtRisk && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800 text-sm">Esta unidad requiere atención</p>
            <p className="text-xs text-red-600 mt-0.5">Recomendamos agendar una revisión preventiva para evitar paros en ruta y daños mayores.</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Orders history */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100"><h3 className="font-semibold text-sm text-slate-900">Historial de Trabajos</h3></div>
          {v.serviceOrders.length === 0 ? <p className="p-6 text-center text-sm text-slate-400">Sin trabajos registrados</p> : (
            <div className="divide-y divide-slate-100">
              {v.serviceOrders.map((o: any) => (
                <Link key={o.id} href={`/client/orders/${o.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div>
                    <span className="font-medium text-sm text-[#b8860b]">{o.folio}</span>
                    <span className="text-xs text-slate-500 ml-2">{formatDate(o.createdAt)}</span>
                    {o.serviceTypes?.length > 0 && <p className="text-xs text-slate-400 mt-0.5">{o.serviceTypes.map((t: string) => SERVICE_TYPE_LABELS[t] || t).join(", ")}</p>}
                  </div>
                  {o.workSummary && <span className="text-xs text-slate-400 max-w-[180px] truncate hidden sm:block">{o.workSummary}</span>}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Certificates */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100"><h3 className="font-semibold text-sm text-slate-900">Certificados</h3></div>
          {v.certificates.length === 0 ? <p className="p-6 text-center text-sm text-slate-400">Sin certificados</p> : (
            <div className="divide-y divide-slate-100">
              {v.certificates.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <span className="font-medium text-sm text-slate-900">{c.certificateNumber}</span>
                    <span className="text-xs text-slate-500 ml-2">{formatDate(c.issuedAt)}</span>
                  </div>
                  {c.publicToken && <a href={`/verify/${c.publicToken}`} target="_blank" className="text-xs text-[#b8860b] hover:underline">Ver certificado →</a>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ScoreBlock({ label, score }: { label: string; score: number }) {
  const scoreColor = (s: number) => { if (s >= 85) return "text-green-600"; if (s >= 70) return "text-blue-600"; if (s >= 50) return "text-amber-600"; if (s >= 30) return "text-orange-600"; return "text-red-600"; };
  return (
    <div className="text-center">
      <span className={`text-xl font-bold ${scoreColor(score)}`}>{score}</span>
      <p className="text-xs opacity-70 mt-0.5">{label}</p>
    </div>
  );
}
