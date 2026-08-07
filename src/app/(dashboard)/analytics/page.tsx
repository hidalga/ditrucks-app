"use client";

import { useEffect, useState } from "react";
import { BarChart3, ClipboardList, Timer, Stethoscope, Calculator, TrendingUp, MousePointerClick } from "lucide-react";
import { Card, StatCard, PageHeader, Loading, Badge } from "@/components/ui";
import { SERVICE_TYPE_LABELS, UNIT_TYPE_LABELS, RISK_LEVEL_LABELS, RISK_LEVEL_COLORS, RISK_LEVEL_DOT } from "@/lib/constants";

interface CountRow { label: string; count: number }

interface Summary {
  month: string;
  kpis: {
    ordersCreated: number;
    ordersClosed: number;
    avgCycleDays: number | null;
    diagnostics: number;
    avgHealthScore: number | null;
    quotesPdf: number;
    quotesInternal: number;
    quotesClient: number;
    quotedSavingsSum: number;
  };
  topVehicles: CountRow[];
  topServices: CountRow[];
  unitTypes: CountRow[];
  riskDistribution: CountRow[];
  topPenalties: CountRow[];
  topQuotedBrands: CountRow[];
  eventCounts: CountRow[];
  ordersTrend: { month: string; count: number }[];
}

const pesos0 = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

// Nombres legibles de los eventos capturados (documentados en docs/ROADMAP-MEJORAS.md)
const EVENT_LABELS: Record<string, string> = {
  quoter_pdf_export: "Cotización PDF exportada",
  quoter_vehicle_selected: "Vehículo elegido en cotizador",
  opportunity_status_changed: "Oportunidad comercial movida",
  client_cta_call_advisor: "Portal: clic «Agendar con mi asesor»",
  client_cta_view_quoter: "Portal: clic «Ver ahorro preventivo»",
  client_fleet_report_open: "Portal: abrió reporte de flota",
};

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function AnalyticsPage() {
  const [month, setMonth] = useState(currentMonth());
  // Guarda el mes junto con los datos: "cargando" = el mes pedido aún no llegó.
  const [result, setResult] = useState<{ month: string; data: Summary | null } | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/analytics/summary?month=${month}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active) setResult({ month, data: d }); })
      .catch(() => { if (active) setResult({ month, data: null }); });
    return () => { active = false; };
  }, [month]);

  const loading = result?.month !== month;
  const data = result?.data ?? null;

  return (
    <>
      <PageHeader
        title="Analítica"
        description="Rendimiento mensual del negocio: operación, diagnósticos, cotizador y uso del sistema"
        actions={
          <input
            type="month"
            value={month}
            max={currentMonth()}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            className="bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text"
          />
        }
      />

      {loading ? (
        <Loading />
      ) : !data ? (
        <p className="text-sm text-brand-text-dim">No se pudo cargar la información.</p>
      ) : (
        <div className="space-y-4">
          {/* KPIs del mes */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Órdenes creadas" value={data.kpis.ordersCreated} icon={<ClipboardList size={18} />} />
            <StatCard label="Órdenes cerradas" value={data.kpis.ordersClosed} icon={<TrendingUp size={18} />} accent="text-green-400" />
            <StatCard label="Ciclo promedio" value={data.kpis.avgCycleDays !== null ? `${data.kpis.avgCycleDays} d` : "—"} icon={<Timer size={18} />} />
            <StatCard label="Diagnósticos" value={data.kpis.diagnostics} icon={<Stethoscope size={18} />} subtitle={data.kpis.avgHealthScore !== null ? `Score prom.: ${data.kpis.avgHealthScore}` : undefined} />
            <StatCard label="Cotizaciones PDF" value={data.kpis.quotesPdf} icon={<Calculator size={18} />} accent="text-brand-accent" subtitle={`${data.kpis.quotesInternal} internas · ${data.kpis.quotesClient} portal`} />
            <StatCard label="Ahorro cotizado" value={data.kpis.quotedSavingsSum ? pesos0.format(data.kpis.quotedSavingsSum) : "—"} icon={<BarChart3 size={18} />} subtitle="Suma mostrada a clientes" />
          </div>

          {/* Tendencia 6 meses */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-3">Órdenes creadas — últimos 6 meses</h2>
            <div className="flex items-end gap-3 h-32">
              {data.ordersTrend.map((t) => {
                const max = Math.max(...data.ordersTrend.map((x) => x.count), 1);
                return (
                  <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-semibold">{t.count}</span>
                    <div
                      className={`w-full rounded-t ${t.month === data.month ? "bg-brand-accent" : "bg-brand-surface2 border border-brand-border"}`}
                      style={{ height: `${Math.max((t.count / max) * 100, 3)}%` }}
                    />
                    <span className="text-[10px] text-brand-text-dim">{t.month.slice(5)}/{t.month.slice(2, 4)}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RankCard title="Vehículos más trabajados" rows={data.topVehicles} empty="Sin órdenes este mes" />
            <RankCard title="Servicios más solicitados" rows={data.topServices.map((r) => ({ ...r, label: SERVICE_TYPE_LABELS[r.label] || r.label }))} empty="Sin órdenes este mes" />
            <RankCard title="Marcas más cotizadas (cotizador)" rows={data.topQuotedBrands} empty="Sin cotizaciones registradas este mes" />
            <RankCard title="Fallas más penalizadas en diagnóstico" rows={data.topPenalties} empty="Sin diagnósticos este mes" />
            <RankCard title="Tipos de unidad atendidos" rows={data.unitTypes.map((r) => ({ ...r, label: UNIT_TYPE_LABELS[r.label] || r.label }))} empty="Sin órdenes este mes" />

            {/* Distribución de riesgo */}
            <Card className="p-4">
              <h2 className="text-sm font-semibold mb-3">Distribución de riesgo (diagnósticos)</h2>
              {data.riskDistribution.length === 0 ? (
                <p className="text-xs text-brand-text-dim">Sin diagnósticos este mes</p>
              ) : (
                <div className="space-y-2">
                  {data.riskDistribution.map((r) => (
                    <div key={r.label} className="flex items-center justify-between">
                      <Badge className={RISK_LEVEL_COLORS[r.label]} dot={RISK_LEVEL_DOT[r.label]}>
                        {RISK_LEVEL_LABELS[r.label] || r.label}
                      </Badge>
                      <span className="text-sm font-bold">{r.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Uso del sistema (datos crudos de eventos) */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <MousePointerClick size={15} className="text-brand-text-muted" />
              <h2 className="text-sm font-semibold">Uso del sistema (eventos capturados)</h2>
            </div>
            {data.eventCounts.length === 0 ? (
              <p className="text-xs text-brand-text-dim">
                Aún no hay eventos este mes. Se registran automáticamente al usar el cotizador, mover oportunidades y con los botones clave del portal de clientes.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {data.eventCounts.map((e) => (
                  <div key={e.label} className="flex items-center justify-between bg-brand-surface2 rounded-lg px-3 py-2">
                    <span className="text-xs text-brand-text-muted">{EVENT_LABELS[e.label] || e.label}</span>
                    <span className="text-sm font-bold ml-2">{e.count}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-brand-text-dim mt-3">
              Datos crudos para decisiones: qué se usa, qué se cotiza y dónde hacen clic los clientes. La lista de eventos y cómo agregar nuevos está en <code>docs/ROADMAP-MEJORAS.md</code>.
            </p>
          </Card>
        </div>
      )}
    </>
  );
}

function RankCard({ title, rows, empty }: { title: string; rows: CountRow[]; empty: string }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-xs text-brand-text-dim">{empty}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.label}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-brand-text-muted truncate mr-2">{r.label}</span>
                <span className="font-semibold shrink-0">{r.count}</span>
              </div>
              <div className="h-1.5 bg-brand-surface2 rounded-full overflow-hidden">
                <div className="h-full bg-brand-accent/60 rounded-full" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
