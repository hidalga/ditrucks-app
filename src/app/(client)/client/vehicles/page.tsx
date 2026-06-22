"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Truck, ChevronRight } from "lucide-react";

const RISK_COLORS: Record<string, { bg: string; text: string }> = {
  excelente: { bg: "bg-green-50", text: "text-green-700" },
  bueno: { bg: "bg-blue-50", text: "text-blue-700" },
  medio: { bg: "bg-amber-50", text: "text-amber-700" },
  alto: { bg: "bg-orange-50", text: "text-orange-700" },
  critico: { bg: "bg-red-50", text: "text-red-700" },
};

const RISK_LABELS: Record<string, string> = {
  excelente: "Excelente", bueno: "Bueno", medio: "Medio", alto: "Alto", critico: "Crítico",
};

const scoreColor = (s: number | null) => {
  if (s === null) return "text-slate-400";
  if (s >= 85) return "text-green-600"; if (s >= 70) return "text-blue-600";
  if (s >= 50) return "text-amber-600"; if (s >= 30) return "text-orange-600";
  return "text-red-600";
};

export default function ClientVehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/client/vehicles").then(r => r.json()).then(setVehicles).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-3 border-[#f6b31c] border-t-transparent rounded-full" /></div>;

  return (
    <>
      <div className="mb-6"><h1 className="text-2xl font-bold text-slate-900">Vehículos</h1><p className="text-sm text-slate-500 mt-1">Tus unidades y su estado de salud</p></div>
      {vehicles.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><Truck size={40} className="mx-auto mb-3 opacity-50" /><p>Sin vehículos registrados</p></div>
      ) : (
        <div className="space-y-3">
          {vehicles.map((v: any) => {
            const diag = v.diagnostics?.[0];
            const risk = diag?.riskLevel;
            const rc = RISK_COLORS[risk] || { bg: "bg-slate-50", text: "text-slate-500" };
            return (
              <Link key={v.id} href={`/client/vehicles/${v.id}`} className="block">
                <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0"><Truck size={18} className="text-slate-500" /></div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{v.brand} {v.model} {v.year || ""}</h3>
                      <div className="flex gap-2 text-xs text-slate-500 mt-0.5">
                        {v.plates && <span>{v.plates}</span>}
                        {v.economicNumber && <span>#{v.economicNumber}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {diag ? (
                      <>
                        <div className="text-center"><span className={`text-lg font-bold ${scoreColor(diag.generalHealthScore)}`}>{diag.generalHealthScore}</span><p className="text-[10px] text-slate-400">Score</p></div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${rc.bg} ${rc.text}`}>{RISK_LABELS[risk]}</span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">Sin diagnóstico</span>
                    )}
                    <span className="text-xs text-slate-400">{v._count?.serviceOrders || 0} trabajos</span>
                    <ChevronRight size={16} className="text-slate-300" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
