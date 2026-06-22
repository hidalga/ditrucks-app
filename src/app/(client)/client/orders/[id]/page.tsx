"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SERVICE_TYPE_LABELS, RISK_LEVEL_LABELS, EVIDENCE_CATEGORY_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

const scoreColor = (s: number | null) => { if (s === null) return "text-slate-400"; if (s >= 85) return "text-green-600"; if (s >= 70) return "text-blue-600"; if (s >= 50) return "text-amber-600"; if (s >= 30) return "text-orange-600"; return "text-red-600"; };

export default function ClientOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`/api/client/orders/${id}`).then(r => r.json()).then(setOrder).finally(() => setLoading(false)); }, [id]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-3 border-[#f6b31c] border-t-transparent rounded-full" /></div>;
  if (!order) return <p className="text-red-500 text-center py-8">Orden no encontrada</p>;

  const v = order.vehicle;
  const diag = order.diagnostics?.[0];
  const Row = ({ label, value }: { label: string; value?: string | number | null }) => value ? <div className="flex gap-3 py-1.5"><span className="text-slate-500 text-sm w-36 flex-shrink-0">{label}</span><span className="text-sm text-slate-800">{value}</span></div> : null;

  return (
    <>
      <Link href="/client/orders" className="text-xs text-[#b8860b] hover:underline mb-2 inline-block">← Trabajos</Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{order.folio}</h1>
        <p className="text-sm text-slate-500">{v.brand} {v.model} {v.year || ""} {v.plates ? `(${v.plates})` : ""}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-[#b8860b] uppercase tracking-wider mb-2">Información del Trabajo</h3>
          <Row label="Técnico" value={order.technician?.name} />
          <Row label="Recepción" value={formatDate(order.receivedAt)} />
          <Row label="Entrega" value={formatDate(order.deliveredAt)} />
          <Row label="Kilometraje" value={order.mileageAtReception?.toLocaleString()} />
          <Row label="Servicio" value={order.requestedServiceType} />
          {order.workSummary && <div className="mt-2 bg-slate-50 rounded-lg p-3 text-sm text-slate-700">{order.workSummary}</div>}
          {order.serviceTypes?.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {order.serviceTypes.map((t: string) => <span key={t} className="bg-[#f6b31c]/10 text-[#b8860b] text-xs px-2 py-0.5 rounded-full">{SERVICE_TYPE_LABELS[t] || t}</span>)}
            </div>
          )}
        </div>
        {diag && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-[#b8860b] uppercase tracking-wider mb-2">Diagnóstico</h3>
            <div className="flex items-center gap-4 mb-3">
              <div className="text-center"><span className={`text-2xl font-bold ${scoreColor(diag.generalHealthScore)}`}>{diag.generalHealthScore}</span><p className="text-[10px] text-slate-400">General</p></div>
              {diag.dpfPresent && diag.dpfScore != null && <div className="text-center"><span className={`text-lg font-bold ${scoreColor(diag.dpfScore)}`}>{diag.dpfScore}</span><p className="text-[10px] text-slate-400">DPF</p></div>}
              {diag.scrPresent && diag.scrScore != null && <div className="text-center"><span className={`text-lg font-bold ${scoreColor(diag.scrScore)}`}>{diag.scrScore}</span><p className="text-[10px] text-slate-400">SCR</p></div>}
              {diag.egrPresent && diag.egrScore != null && <div className="text-center"><span className={`text-lg font-bold ${scoreColor(diag.egrScore)}`}>{diag.egrScore}</span><p className="text-[10px] text-slate-400">EGR</p></div>}
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${diag.riskLevel === "critico" ? "bg-red-50 text-red-700" : diag.riskLevel === "alto" ? "bg-orange-50 text-orange-700" : diag.riskLevel === "medio" ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>{RISK_LEVEL_LABELS[diag.riskLevel]}</span>
            {(diag.visibleRecommendation || diag.recommendation) && <p className="mt-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{diag.visibleRecommendation || diag.recommendation}</p>}
            {diag.nextCheckDate && <p className="text-xs text-[#b8860b] mt-2">Próxima revisión: {formatDate(diag.nextCheckDate)}</p>}
          </div>
        )}
      </div>
      {order.certificates?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl mt-4 p-4">
          <h3 className="text-xs font-semibold text-[#b8860b] uppercase tracking-wider mb-2">Certificados</h3>
          {order.certificates.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between py-2">
              <span className="font-medium text-sm text-slate-900">{c.certificateNumber}</span>
              {c.publicToken && <a href={`/verify/${c.publicToken}`} target="_blank" className="text-[#b8860b] text-xs hover:underline">Ver certificado →</a>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
