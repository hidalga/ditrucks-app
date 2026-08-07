"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList, FileCheck, HardDrive, AlertTriangle,
  CheckCircle, Clock, Wrench, BarChart3, Timer, TrendingUp,
} from "lucide-react";
import { StatCard, Badge, Card, Loading, PageHeader } from "@/components/ui";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, RISK_LEVEL_COLORS, RISK_LEVEL_LABELS, RISK_LEVEL_DOT, OPPORTUNITY_LABELS, OPPORTUNITY_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

interface DashboardData {
  stats: {
    openOrders: number;
    borrador: number;
    recepcion: number;
    leyendoEcu: number;
    enAnalisis: number;
    archivoListo: number;
    prueba: number;
    cerrada: number;
    riesgoAlto: number;
    riesgoCritico: number;
    closedThisMonth: number;
    avgCycleDays: number | null;
  };
  pipeline: Record<string, number>;
  stalledOrders: Array<{
    id: string;
    folio: string;
    status: string;
    daysStalled: number;
    vehicle: { brand: string; model: string; plates?: string } | null;
    company: { name: string } | null;
    customer: { name: string } | null;
    technician: { name: string } | null;
  }>;
  recentOrders: Array<{
    id: string;
    folio: string;
    status: string;
    createdAt: string;
    vehicle: { brand: string; model: string; plates?: string; year?: number } | null;
    company: { name: string } | null;
    customer: { name: string } | null;
    technician: { name: string } | null;
    diagnostics: Array<{ riskLevel: string; generalHealthScore: number }>;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return <Loading />;

  const { stats } = data;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Resumen general de operaciones"
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatCard
          label="Abiertas"
          value={stats.openOrders}
          icon={<ClipboardList size={18} />}
          accent="text-brand-accent"
        />
        <StatCard
          label="Recepción"
          value={stats.recepcion}
          icon={<Clock size={18} />}
        />
        <StatCard
          label="Leyendo ECU"
          value={stats.leyendoEcu}
          icon={<HardDrive size={18} />}
        />
        <StatCard
          label="En Análisis"
          value={stats.enAnalisis}
          icon={<Wrench size={18} />}
        />
        <StatCard
          label="Listo p/ Instalar"
          value={stats.archivoListo}
          icon={<FileCheck size={18} />}
          accent="text-lime-400"
        />
        <StatCard
          label="Prueba Post."
          value={stats.prueba}
          icon={<BarChart3 size={18} />}
        />
        <StatCard
          label="Cerradas"
          value={stats.cerrada}
          icon={<CheckCircle size={18} />}
          accent="text-green-400"
        />
        <StatCard
          label="Riesgo Alto"
          value={stats.riesgoAlto}
          icon={<AlertTriangle size={18} />}
          accent="text-orange-400"
        />
        <StatCard
          label="Riesgo Crítico"
          value={stats.riesgoCritico}
          icon={<AlertTriangle size={18} />}
          accent="text-red-400"
        />
        <StatCard
          label="Cerradas (mes)"
          value={stats.closedThisMonth}
          icon={<TrendingUp size={18} />}
          accent="text-green-400"
        />
        <StatCard
          label="Ciclo promedio"
          value={stats.avgCycleDays !== null ? `${stats.avgCycleDays} d` : "—"}
          icon={<Timer size={18} />}
          subtitle="Recepción → entrega (90 días)"
        />
      </div>

      {/* Stalled orders + commercial pipeline */}
      {(data.stalledOrders.length > 0 || Object.values(data.pipeline).some((n) => n > 0)) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {data.stalledOrders.length > 0 && (
            <Card className="overflow-hidden lg:col-span-2 border-orange-500/30">
              <div className="px-4 py-3 border-b border-brand-border flex items-center gap-2">
                <AlertTriangle size={15} className="text-orange-400" />
                <h2 className="font-semibold text-sm">Órdenes sin movimiento (+3 días)</h2>
              </div>
              <div className="divide-y divide-brand-border/50">
                {data.stalledOrders.map((o) => (
                  <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-brand-surface2/50 transition-colors">
                    <div className="min-w-0">
                      <span className="text-brand-accent font-medium text-sm">{o.folio}</span>
                      <span className="text-brand-text-muted text-sm ml-2">
                        {o.vehicle ? `${o.vehicle.brand} ${o.vehicle.model}` : "—"}
                        {o.company?.name || o.customer?.name ? ` · ${o.company?.name || o.customer?.name}` : ""}
                      </span>
                      {o.technician?.name && <span className="text-brand-text-dim text-xs ml-2">({o.technician.name})</span>}
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <Badge className={ORDER_STATUS_COLORS[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge>
                      <span className="text-orange-400 text-xs font-semibold whitespace-nowrap">{o.daysStalled} d</span>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {Object.values(data.pipeline).some((n) => n > 0) && (
            <Card className="p-4">
              <h2 className="font-semibold text-sm mb-3">Pipeline Comercial</h2>
              <div className="space-y-2">
                {(["cotizar", "agendar", "seguimiento"] as const).map((k) => (
                  <Link key={k} href="/diagnostics" className="flex items-center justify-between p-2 rounded-lg hover:bg-brand-surface2/50 transition-colors">
                    <Badge className={OPPORTUNITY_COLORS[k]}>{OPPORTUNITY_LABELS[k]}</Badge>
                    <span className="text-lg font-bold">{data.pipeline[k] || 0}</span>
                  </Link>
                ))}
              </div>
              <p className="text-[11px] text-brand-text-dim mt-3">
                Diagnósticos con oportunidad activa. Da seguimiento desde el detalle de cada diagnóstico.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Recent orders table */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-brand-border flex items-center justify-between">
          <h2 className="font-semibold text-sm">Últimas Órdenes</h2>
          <Link href="/orders" className="text-xs text-brand-accent hover:underline">
            Ver todas →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border text-brand-text-muted">
                <th className="text-left px-4 py-2.5 font-medium text-xs">Folio</th>
                <th className="text-left px-4 py-2.5 font-medium text-xs">Cliente / Empresa</th>
                <th className="text-left px-4 py-2.5 font-medium text-xs">Vehículo</th>
                <th className="text-left px-4 py-2.5 font-medium text-xs">Estado</th>
                <th className="text-left px-4 py-2.5 font-medium text-xs">Técnico</th>
                <th className="text-left px-4 py-2.5 font-medium text-xs">Fecha</th>
                <th className="text-left px-4 py-2.5 font-medium text-xs">Riesgo</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((order) => {
                const diag = order.diagnostics?.[0];
                return (
                  <tr
                    key={order.id}
                    className="border-b border-brand-border/50 hover:bg-brand-surface2/50 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/orders/${order.id}`}
                        className="text-brand-accent font-medium hover:underline"
                      >
                        {order.folio}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-brand-text-muted">
                      {order.company?.name || order.customer?.name || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {order.vehicle
                        ? `${order.vehicle.brand} ${order.vehicle.model} ${order.vehicle.year || ""}`
                        : "—"}
                      {order.vehicle?.plates && (
                        <span className="ml-1.5 text-brand-text-dim text-xs">
                          ({order.vehicle.plates})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge className={ORDER_STATUS_COLORS[order.status]}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-brand-text-muted">
                      {order.technician?.name || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-brand-text-dim text-xs">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      {diag ? (
                        <Badge className={RISK_LEVEL_COLORS[diag.riskLevel]} dot={RISK_LEVEL_DOT[diag.riskLevel]}>
                          {diag.generalHealthScore} — {RISK_LEVEL_LABELS[diag.riskLevel]}
                        </Badge>
                      ) : (
                        <span className="text-brand-text-dim text-xs">Sin dx</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {data.recentOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-brand-text-dim">
                    No hay órdenes registradas aún
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
