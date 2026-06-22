"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { RISK_LEVEL_LABELS, SERVICE_TYPE_LABELS } from "@/lib/constants";

export default function FleetReportPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/client/fleet-health").then(r => r.json()),
      fetch("/api/client/dashboard").then(r => r.json()),
    ]).then(([fleet, dash]) => {
      setData(fleet);
      // Try to get company name from recent orders
      const co = dash.recentOrders?.[0]?.company?.name || dash.recentOrders?.[0]?.customer?.name || "";
      setCompanyName(co);
    }).finally(() => setLoading(false));
  }, []);

  const handleDownload = () => window.open("/api/client/fleet-report/pdf", "_blank");

  if (loading) return <div className="flex justify-center items-center min-h-screen bg-white"><div className="animate-spin h-8 w-8 border-3 border-[#f6b31c] border-t-transparent rounded-full" /></div>;
  if (!data) return null;

  const { summary, fleet } = data;
  const today = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });

  const scoreColor = (s: number | null) => { if (s === null) return "#94a3b8"; if (s >= 85) return "#16a34a"; if (s >= 70) return "#2563eb"; if (s >= 50) return "#d97706"; if (s >= 30) return "#ea580c"; return "#dc2626"; };
  const urgencyLabel: Record<string, string> = { critical: "Crítico", urgent: "Urgente", schedule: "Agendar", monitor: "Monitorear", none: "Bien" };
  const urgencyBg: Record<string, string> = { critical: "#fef2f2", urgent: "#fff7ed", schedule: "#fffbeb", monitor: "#eff6ff", none: "#f0fdf4" };
  const urgencyText: Record<string, string> = { critical: "#b91c1c", urgent: "#c2410c", schedule: "#b45309", monitor: "#1d4ed8", none: "#15803d" };

  return (
    <div className="bg-white min-h-screen">
      {/* Print button (hidden in print) */}
      <div className="print:hidden sticky top-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between z-10">
        <a href="/client/dashboard" className="text-sm text-[#b8860b] hover:underline">← Regresar al portal</a>
        <button onClick={handleDownload} className="px-4 py-2 bg-[#f6b31c] text-white font-medium text-sm rounded-lg hover:bg-[#d99a0b] transition-colors cursor-pointer">
          Descargar PDF
        </button>
      </div>

      {/* Report content */}
      <div className="max-w-4xl mx-auto px-8 py-10 print:px-0 print:py-0 print:max-w-none">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-[#f6b31c]">
          <div>
            <img src="/logo-black.svg" alt="Ditrucks" className="h-10 mb-3" />
            <h1 className="text-2xl font-bold text-slate-900">Reporte Ejecutivo de Flota</h1>
            {companyName && <p className="text-lg text-slate-600 mt-1">{companyName}</p>}
            <p className="text-sm text-slate-400 mt-1">{today}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Diesel Truck Solutions</p>
            <p className="text-xs text-slate-400">www.ditrucks.com.mx</p>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Resumen General</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <SumBox label="Total" value={summary.total} color="#1e293b" />
            <SumBox label="Crítico" value={summary.critical} color="#dc2626" />
            <SumBox label="Urgente" value={summary.urgent} color="#ea580c" />
            <SumBox label="Agendar" value={summary.schedule} color="#d97706" />
            <SumBox label="Monitorear" value={summary.monitor} color="#2563eb" />
            <SumBox label="Bien" value={summary.good} color="#16a34a" />
          </div>
        </div>

        {/* Attention required */}
        {(summary.critical > 0 || summary.urgent > 0) && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="font-bold text-red-800">{summary.critical + summary.urgent} unidad(es) requieren atención inmediata</p>
            <p className="text-sm text-red-600 mt-1">Se recomienda agendar una revisión preventiva para evitar paros en ruta y daños que incrementan costos.</p>
          </div>
        )}

        {/* Fleet table */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Estado por Unidad</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-3 py-2 font-semibold text-xs text-slate-600 border-b border-slate-200">Unidad</th>
                <th className="text-left px-3 py-2 font-semibold text-xs text-slate-600 border-b border-slate-200">Identificación</th>
                <th className="text-center px-3 py-2 font-semibold text-xs text-slate-600 border-b border-slate-200">Score</th>
                <th className="text-center px-3 py-2 font-semibold text-xs text-slate-600 border-b border-slate-200">DPF</th>
                <th className="text-center px-3 py-2 font-semibold text-xs text-slate-600 border-b border-slate-200">SCR</th>
                <th className="text-center px-3 py-2 font-semibold text-xs text-slate-600 border-b border-slate-200">EGR</th>
                <th className="text-center px-3 py-2 font-semibold text-xs text-slate-600 border-b border-slate-200">Estado</th>
                <th className="text-left px-3 py-2 font-semibold text-xs text-slate-600 border-b border-slate-200">Último Servicio</th>
              </tr>
            </thead>
            <tbody>
              {fleet.map((v: any) => {
                const urg = v.projection?.overallUrgency || "none";
                return (
                  <tr key={v.id} className="border-b border-slate-100" style={{ backgroundColor: urgencyBg[urg] + "80" }}>
                    <td className="px-3 py-2 font-medium text-slate-900">{v.brand} {v.model} {v.year || ""}</td>
                    <td className="px-3 py-2 text-slate-500 text-xs">{v.plates || (v.economicNumber ? "#" + v.economicNumber : null) || (v.vin ? v.vin.slice(-6) : "—")}</td>
                    <td className="px-3 py-2 text-center font-bold" style={{ color: scoreColor(v.score) }}>{v.score ?? "—"}</td>
                    <td className="px-3 py-2 text-center font-medium" style={{ color: scoreColor(v.dpfScore) }}>{v.dpfScore ?? "—"}</td>
                    <td className="px-3 py-2 text-center font-medium" style={{ color: scoreColor(v.scrScore) }}>{v.scrScore ?? "—"}</td>
                    <td className="px-3 py-2 text-center font-medium" style={{ color: scoreColor(v.egrScore) }}>{v.egrScore ?? "—"}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: urgencyBg[urg], color: urgencyText[urg] }}>{urgencyLabel[urg]}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-xs">{v.lastOrderDate ? formatDate(v.lastOrderDate) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Units needing attention - detail */}
        {fleet.filter((v: any) => v.projection && v.projection.overallUrgency !== "none").length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Unidades que Requieren Atención</h2>
            <div className="space-y-3">
              {fleet.filter((v: any) => v.projection && v.projection.overallUrgency !== "none").map((v: any) => (
                <div key={v.id} className="border border-slate-200 rounded-lg p-3" style={{ borderLeftWidth: 4, borderLeftColor: urgencyText[v.projection.overallUrgency] }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-semibold text-slate-900">{v.brand} {v.model} {v.year || ""}</span>
                      <span className="text-xs text-slate-400 ml-2">{v.plates || `#${v.economicNumber}`}</span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: urgencyBg[v.projection.overallUrgency], color: urgencyText[v.projection.overallUrgency] }}>{urgencyLabel[v.projection.overallUrgency]}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{v.projection.summary}</p>
                  {v.recommendation && <p className="text-xs text-slate-500 mt-1">{v.recommendation}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-200 flex items-center justify-between">
          <div>
            <img src="/logo-black.svg" alt="Ditrucks" className="h-5 opacity-40" />
            <p className="text-xs text-slate-400 mt-1">Diesel Truck Solutions — www.ditrucks.com.mx</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Reporte generado automáticamente</p>
            <p className="text-xs text-[#b8860b] font-medium mt-0.5">www.ditrucks.com.mx</p>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:px-0 { padding-left: 0; padding-right: 0; }
          .print\\:py-0 { padding-top: 0; padding-bottom: 0; }
          .print\\:max-w-none { max-width: none; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
}

function SumBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="border border-slate-200 rounded-lg p-3 text-center">
      <span className="text-2xl font-bold" style={{ color }}>{value}</span>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
