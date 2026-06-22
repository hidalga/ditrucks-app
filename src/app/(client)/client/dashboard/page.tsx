"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Truck, AlertTriangle, Clock, CalendarCheck, Shield, ChevronRight, Phone } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { SERVICE_TYPE_LABELS } from "@/lib/constants";

export default function ClientDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/client/fleet-health").then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading || !data) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin h-8 w-8 border-3 border-[#f6b31c] border-t-transparent rounded-full" />
    </div>
  );

  const { summary, fleet } = data;
  const urgencyColors: Record<string, { bg: string; text: string; dot: string; border: string; label: string }> = {
    critical: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", border: "border-red-200", label: "Crítico" },
    urgent: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500", border: "border-orange-200", label: "Urgente" },
    schedule: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", border: "border-amber-200", label: "Agendar" },
    monitor: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", border: "border-blue-200", label: "Monitorear" },
    none: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500", border: "border-green-200", label: "Bien" },
  };

  const scoreColor = (s: number | null) => {
    if (s === null) return "text-slate-400";
    if (s >= 85) return "text-green-600";
    if (s >= 70) return "text-blue-600";
    if (s >= 50) return "text-amber-600";
    if (s >= 30) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Estado de Flota</h1>
          <p className="text-sm text-slate-500 mt-1">Panorama general de tus unidades y sistemas post-tratamiento</p>
        </div>
        <a href="/client/fleet-report" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          Reporte PDF
        </a>
      </div>

      {/* Summary counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <SummaryCard count={summary.total} label="Unidades" icon={<Truck size={18} />} bg="bg-slate-50" text="text-slate-700" border="border-slate-200" />
        <SummaryCard count={summary.critical} label="Crítico" icon={<AlertTriangle size={18} />} bg="bg-red-50" text="text-red-700" border="border-red-200" />
        <SummaryCard count={summary.urgent} label="Urgente" icon={<AlertTriangle size={18} />} bg="bg-orange-50" text="text-orange-700" border="border-orange-200" />
        <SummaryCard count={summary.schedule} label="Agendar" icon={<CalendarCheck size={18} />} bg="bg-amber-50" text="text-amber-700" border="border-amber-200" />
        <SummaryCard count={summary.monitor} label="Monitorear" icon={<Clock size={18} />} bg="bg-blue-50" text="text-blue-700" border="border-blue-200" />
        <SummaryCard count={summary.good} label="Bien" icon={<Shield size={18} />} bg="bg-green-50" text="text-green-700" border="border-green-200" />
      </div>

      {/* Attention required banner */}
      {(summary.critical > 0 || summary.urgent > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800">{summary.critical + summary.urgent} unidad(es) requieren atención</p>
            <p className="text-sm text-red-600 mt-0.5">Se recomienda agendar una revisión preventiva para evitar paros en ruta y daños mayores.</p>
          </div>
        </div>
      )}

      {/* Fleet semaphore */}
      <div className="space-y-3">
        {fleet.map((v: any) => {
          const urg = v.projection?.overallUrgency || (v.score === null ? "none" : "none");
          const colors = urgencyColors[urg] || urgencyColors.none;

          return (
            <Link key={v.id} href={`/client/vehicles/${v.id}`} className="block">
              <div className={`bg-white border ${colors.border} rounded-xl p-4 hover:shadow-md transition-shadow`}>
                <div className="flex items-center justify-between gap-4">
                  {/* Left: vehicle info */}
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Semaphore dot */}
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${colors.dot}`} />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900">{v.brand} {v.model} {v.year || ""}</h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>{colors.label}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-slate-500 mt-0.5">
                        {v.plates && <span>{v.plates}</span>}
                        {v.economicNumber && <span>#{v.economicNumber}</span>}
                        {v.lastOrderDate && <span>Último servicio: {formatDate(v.lastOrderDate)}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Right: scores */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {v.score !== null ? (
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <span className={`text-xl font-bold ${scoreColor(v.score)}`}>{v.score}</span>
                          <p className="text-[10px] text-slate-400 uppercase">General</p>
                        </div>
                        {v.dpfScore !== null && (
                          <div className="text-center hidden sm:block">
                            <span className={`text-sm font-bold ${scoreColor(v.dpfScore)}`}>{v.dpfScore}</span>
                            <p className="text-[10px] text-slate-400">DPF</p>
                          </div>
                        )}
                        {v.scrScore !== null && (
                          <div className="text-center hidden sm:block">
                            <span className={`text-sm font-bold ${scoreColor(v.scrScore)}`}>{v.scrScore}</span>
                            <p className="text-[10px] text-slate-400">SCR</p>
                          </div>
                        )}
                        {v.egrScore !== null && (
                          <div className="text-center hidden sm:block">
                            <span className={`text-sm font-bold ${scoreColor(v.egrScore)}`}>{v.egrScore}</span>
                            <p className="text-[10px] text-slate-400">EGR</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Sin diagnóstico</span>
                    )}
                    <ChevronRight size={16} className="text-slate-300" />
                  </div>
                </div>

                {/* Projection recommendation */}
                {v.projection?.summary && urg !== "none" && (
                  <div className={`mt-3 px-3 py-2 rounded-lg text-xs ${colors.bg} ${colors.text}`}>
                    {v.projection.summary}
                    {v.projection.nextActionDate && (
                      <span className="font-semibold ml-1">
                        Acción recomendada: {new Date(v.projection.nextActionDate) <= new Date() ? "inmediata" : `antes del ${formatDate(v.projection.nextActionDate)}`}.
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          );
        })}

        {fleet.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Truck size={40} className="mx-auto mb-3 opacity-50" />
            <p>Sin unidades registradas</p>
          </div>
        )}
      </div>

    </>
  );
}

function SummaryCard({ count, label, icon, bg, text, border }: { count: number; label: string; icon: React.ReactNode; bg: string; text: string; border: string }) {
  return (
    <div className={`${bg} border ${border} rounded-xl p-3.5`}>
      <div className="flex items-center justify-between">
        <span className={`${text} opacity-70`}>{icon}</span>
        <span className={`text-2xl font-bold ${text}`}>{count}</span>
      </div>
      <p className={`text-xs font-medium ${text} opacity-80 mt-1`}>{label}</p>
    </div>
  );
}
