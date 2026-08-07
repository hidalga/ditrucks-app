"use client";

import { useMemo, useState, useEffect, useRef, type ReactNode } from "react";
import { Calculator, FileDown, Plus, Truck, Wrench, TrendingDown, ChevronDown, ChevronUp, Package, Droplet, Clock } from "lucide-react";
import { Card, Badge, Button, Input, Select, PageHeader, Loading, Tabs, ConfirmModal, EmptyState } from "@/components/ui";
import { QuoterVehicleSearch, SystemBadges } from "@/components/quoter-vehicle-search";
import { detectSystems, QUOTER_SYSTEMS } from "@/lib/quoter-systems";
import { calculateQuote, DEFAULT_HORIZON_MONTHS, DEFAULT_DOWNTIME_HOURS, DEFAULT_DOWNTIME_RATE, DEFAULT_UREA_VAN_LITERS, DEFAULT_UREA_TRUCK_LITERS, DEFAULT_UREA_PRICE } from "@/services/quoter-engine";
import { track } from "@/lib/analytics";

interface QuoterApplication {
  id: string;
  category: string;
  brand: string;
  model: string;
  displayLabel: string;
  pricing: Record<string, { prev: number; corr: number }>;
}

interface QuoterPartRow {
  id: string;
  system: string;
  label: string;
  vanPrice: number;
  truckPrice: number;
  essential: boolean;
  qtyPerUnit: number;
  note?: string | null;
}

const SYSTEMS = [...QUOTER_SYSTEMS];
const pesos = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const pesos0 = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

async function fetchJson(url: string) {
  const r = await fetch(url);
  if (!r.ok) return [];
  return r.json();
}

export default function QuoterPage() {
  const [tab, setTab] = useState("cotizar");
  const [applications, setApplications] = useState<QuoterApplication[]>([]);
  const [parts, setParts] = useState<QuoterPartRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshAll = () => {
    setLoading(true);
    Promise.all([fetchJson("/api/quoter/applications"), fetchJson("/api/quoter/parts")])
      .then(([apps, prts]) => { setApplications(apps); setParts(prts); })
      .finally(() => setLoading(false));
  };

  // Carga inicial (evento de montaje, sin setState directo dentro de effect).
  useMountEffect(refreshAll);

  return (
    <>
      <PageHeader
        title="Cotizador"
        description="Demuestra el ahorro del servicio preventivo frente al costo correctivo para cerrar la venta."
      />

      <Tabs
        tabs={[
          { id: "cotizar", label: "Cotizar", icon: <Calculator size={15} /> },
          { id: "catalogo", label: `Catálogo${applications.length ? ` (${applications.length})` : ""}`, icon: <Truck size={15} /> },
          { id: "piezas", label: "Piezas", icon: <Wrench size={15} /> },
        ]}
        activeTab={tab}
        onChange={setTab}
      />

      <div className="mt-4">
        {loading ? (
          <Loading />
        ) : tab === "cotizar" ? (
          <QuoteBuilder applications={applications} parts={parts} />
        ) : tab === "catalogo" ? (
          <CatalogManager applications={applications} onChange={refreshAll} />
        ) : (
          <PartsManager parts={parts} onChange={refreshAll} />
        )}
      </div>
    </>
  );
}

// Ejecuta una función una sola vez al montar sin disparar el lint de setState-in-effect.
function useMountEffect(fn: () => void) {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    fn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ─── QUOTE BUILDER ──────────────────────────────────────

function QuoteBuilder({ applications, parts }: { applications: QuoterApplication[]; parts: QuoterPartRow[] }) {
  const [applicationId, setApplicationId] = useState("");
  const [mode, setMode] = useState(1);
  const [vans, setVans] = useState(0);
  const [trucks, setTrucks] = useState(1);
  const [selectedSystems, setSelectedSystems] = useState<Set<string>>(new Set(["DPF", "SCR"]));
  // Sólo guarda overrides del usuario; el resto se deriva de essential/qtyPerUnit y la flota.
  const [partsState, setPartsState] = useState<Record<string, { selected?: boolean; units?: number }>>({});
  const [showParts, setShowParts] = useState(false);
  const [horizonMonths, setHorizonMonths] = useState(DEFAULT_HORIZON_MONTHS);

  const [ureaIncluded, setUreaIncluded] = useState(true);
  const [ureaVan, setUreaVan] = useState(DEFAULT_UREA_VAN_LITERS);
  const [ureaTruck, setUreaTruck] = useState(DEFAULT_UREA_TRUCK_LITERS);
  const [ureaPrice, setUreaPrice] = useState(DEFAULT_UREA_PRICE);

  const [downtimeIncluded, setDowntimeIncluded] = useState(true);
  const [downtimeHours, setDowntimeHours] = useState(DEFAULT_DOWNTIME_HOURS);
  const [downtimeRate, setDowntimeRate] = useState(DEFAULT_DOWNTIME_RATE);

  const [pdfLoading, setPdfLoading] = useState(false);

  const application = applications.find((a) => a.id === applicationId);
  const activeType: "van" | "truck" = vans > 0 && trucks === 0 ? "van" : "truck";
  const totalUnits = vans + trucks;
  const visibleParts = parts.filter((p) => selectedSystems.has(p.system));

  // Estado efectivo de una pieza (sin effect de init):
  //  · selected → override del usuario, o `essential` de la pieza.
  //  · units → override del usuario, o (seleccionada ? flota × piezas-por-unidad : 0).
  const partState = (p: QuoterPartRow) => {
    const ov = partsState[p.id] ?? {};
    const selected = ov.selected ?? p.essential;
    const units = ov.units ?? (selected ? totalUnits * (p.qtyPerUnit || 1) : 0);
    return { selected, units };
  };

  // Al elegir vehículo, preseleccionamos los sistemas que su descriptor menciona.
  const selectVehicle = (id: string) => {
    setApplicationId(id);
    const app = applications.find((a) => a.id === id);
    if (app) {
      const detected = detectSystems(app.displayLabel).filter((s) => s !== "DITUNING");
      setSelectedSystems(new Set(detected.length ? detected : ["DPF", "SCR"]));
      track("quoter_vehicle_selected", { brand: app.brand, category: app.category });
    }
  };

  const result = useMemo(() => {
    if (!application) return null;
    return calculateQuote({
      pricing: application.pricing,
      mode,
      vans,
      trucks,
      selectedSystems: [...selectedSystems],
      parts: parts.map((p) => ({
        system: p.system,
        label: p.label,
        vanPrice: p.vanPrice,
        truckPrice: p.truckPrice,
        selected: partState(p).selected,
        units: partState(p).units,
      })),
      horizonMonths,
      ureaIncluded,
      ureaVanLitersPerMonth: ureaVan,
      ureaTruckLitersPerMonth: ureaTruck,
      ureaPricePerLiter: ureaPrice,
      downtimeIncluded,
      downtimeHours,
      downtimeRatePerHour: downtimeRate,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application, mode, vans, trucks, selectedSystems, parts, partsState, horizonMonths, ureaIncluded, ureaVan, ureaTruck, ureaPrice, downtimeIncluded, downtimeHours, downtimeRate]);

  const savingsPct = result?.savingsPct ?? 0;

  const toggleSystem = (sys: string) => {
    setSelectedSystems((prev) => {
      const next = new Set(prev);
      if (next.has(sys)) next.delete(sys); else next.add(sys);
      return next;
    });
  };

  const exportPdf = async () => {
    if (!application || !result) return;
    setPdfLoading(true);
    try {
      const res = await fetch("/api/quoter/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          mode,
          vans,
          trucks,
          selectedSystems: [...selectedSystems],
          parts: parts.map((p) => ({ partId: p.id, selected: partState(p).selected, units: partState(p).units })),
          horizonMonths,
          ureaIncluded,
          ureaVanLitersPerMonth: ureaVan,
          ureaTruckLitersPerMonth: ureaTruck,
          ureaPricePerLiter: ureaPrice,
          downtimeIncluded,
          downtimeHours,
          downtimeRatePerHour: downtimeRate,
        }),
      });
      if (!res.ok) { alert("Error al generar el PDF"); return; }
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), "_blank");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-start">
      {/* ── Columna de captura ── */}
      <div className="xl:col-span-3 space-y-4">
        {/* Paso 1: Vehículo */}
        <Card className="p-4">
          <StepTitle n={1} title="Vehículo / aplicación" hint="Busca el motor o modelo del cliente" />
          <QuoterVehicleSearch applications={applications} value={applicationId} onChange={selectVehicle} />
        </Card>

        {/* Paso 2: Flota */}
        <Card className="p-4">
          <StepTitle n={2} title="Tamaño de flota y servicio" hint="Unidades a intervenir y nivel de desactivación" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Input label="Camionetas" type="number" min={0} value={vans} onChange={(e) => setVans(Math.max(0, Number(e.target.value) || 0))} />
            <Input label="Camiones" type="number" min={0} value={trucks} onChange={(e) => setTrucks(Math.max(0, Number(e.target.value) || 0))} />
            <Select
              label="Desactivaciones"
              value={String(mode)}
              onChange={(e) => setMode(Number(e.target.value))}
              options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: `${n} sistema${n === 1 ? "" : "s"}` }))}
            />
          </div>
          <div className="mt-3">
            <p className="text-xs font-medium text-brand-text-muted uppercase tracking-wide mb-1.5">Sistemas del correctivo</p>
            <div className="flex flex-wrap gap-2">
              {SYSTEMS.map((sys) => {
                const on = selectedSystems.has(sys);
                return (
                  <button
                    key={sys}
                    onClick={() => toggleSystem(sys)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${on ? "bg-brand-accent/15 text-brand-accent border-brand-accent/40" : "bg-brand-surface2 text-brand-text-dim border-brand-border hover:border-brand-border-hover"}`}
                  >
                    {sys}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-brand-text-dim mt-1.5">
              Definen qué piezas y consumibles entran al escenario correctivo. Se preseleccionan según el vehículo.
            </p>
          </div>
        </Card>

        {/* Paso 3: Costos del correctivo (colapsable) */}
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <StepTitle n={3} title="Costos evitables del correctivo" hint="Lo que el cliente gasta si no previene" />
            <div className="shrink-0 w-40">
              <Select
                label="Proyección"
                value={String(horizonMonths)}
                onChange={(e) => setHorizonMonths(Number(e.target.value))}
                options={[12, 24, 36, 48].map((m) => ({ value: String(m), label: `${m} meses (${m / 12} año${m === 12 ? "" : "s"})` }))}
              />
            </div>
          </div>

          <div className="space-y-3">
            <ToggleRow
              icon={<Droplet size={15} />}
              label="Consumo de DEF/AdBlue"
              checked={ureaIncluded}
              onCheck={setUreaIncluded}
              summary={result ? `${result.ureaMonthlyLiters.toLocaleString("es-MX")} L/mes · ${pesos0.format(result.ureaCost)} a ${horizonMonths} m` : undefined}
            >
              <div className="grid grid-cols-3 gap-2 pt-1">
                <Input label="L/mes camioneta" type="number" min={0} value={ureaVan} onChange={(e) => setUreaVan(Number(e.target.value) || 0)} />
                <Input label="L/mes camión" type="number" min={0} value={ureaTruck} onChange={(e) => setUreaTruck(Number(e.target.value) || 0)} />
                <Input label="Precio $/L" type="number" min={0} value={ureaPrice} onChange={(e) => setUreaPrice(Number(e.target.value) || 0)} />
              </div>
            </ToggleRow>

            <ToggleRow
              icon={<Clock size={15} />}
              label="Inoperatividad (paro de unidad)"
              checked={downtimeIncluded}
              onCheck={setDowntimeIncluded}
              summary={result ? `${pesos0.format(result.downtimeCost)} · ${totalUnits} unidad(es)` : undefined}
            >
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Input label="Horas/unidad" type="number" min={0} value={downtimeHours} onChange={(e) => setDowntimeHours(Number(e.target.value) || 0)} />
                <Input label="Tarifa $/hora" type="number" min={0} value={downtimeRate} onChange={(e) => setDowntimeRate(Number(e.target.value) || 0)} />
              </div>
            </ToggleRow>

            {/* Piezas */}
            <div className="rounded-lg border border-brand-border">
              <button onClick={() => setShowParts((v) => !v)} className="w-full flex items-center justify-between px-3 py-2.5 text-sm">
                <span className="flex items-center gap-2 font-medium"><Package size={15} className="text-brand-text-muted" /> Piezas de reemplazo</span>
                <span className="flex items-center gap-2 text-xs text-brand-text-dim">
                  {result ? pesos0.format(result.partsSum) : ""}
                  {showParts ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </span>
              </button>
              {showParts && (
                <div className="px-3 pb-3">
                  <p className="text-[11px] text-brand-text-dim mb-2">
                    Precio estimado por pieza para <strong>{activeType === "van" ? "camioneta" : "camión"}</strong>. Las <span className="text-brand-accent">esenciales</span> vienen preseleccionadas con una por unidad ({totalUnits}). Ajusta lo que aplique.
                  </p>
                  {visibleParts.length === 0 ? (
                    <p className="text-xs text-brand-text-dim py-2">Selecciona sistemas en el paso 2 para ver sus piezas.</p>
                  ) : (
                    <div className="space-y-1">
                      {visibleParts.map((p) => {
                        const st = partState(p);
                        const unit = activeType === "van" ? p.vanPrice : p.truckPrice;
                        return (
                          <div key={p.id} className="flex items-center gap-2 py-1 border-b border-brand-border/40 last:border-0">
                            <input type="checkbox" checked={st.selected} onChange={(e) => setPartsState((s) => ({ ...s, [p.id]: { selected: e.target.checked, units: e.target.checked ? (s[p.id]?.units ?? totalUnits * (p.qtyPerUnit || 1)) : 0 } }))} className="accent-brand-accent" />
                            <Badge className="bg-brand-surface2 text-brand-text-dim shrink-0">{p.system}</Badge>
                            <span className="text-sm flex-1 min-w-0 truncate" title={p.note || undefined}>
                              {p.label}
                              {p.essential && <span className="ml-1.5 text-[10px] text-brand-accent">●</span>}
                            </span>
                            <span className="text-xs text-brand-text-dim w-24 text-right shrink-0">{pesos0.format(unit)}</span>
                            <input type="number" min={0} value={st.units} onChange={(e) => setPartsState((s) => ({ ...s, [p.id]: { selected: st.selected, units: Number(e.target.value) || 0 } }))} className="w-16 bg-brand-surface border border-brand-border rounded px-2 py-1 text-sm shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Columna de resultado (sticky) ── */}
      <div className="xl:col-span-2 xl:sticky xl:top-4 space-y-4">
        {!application ? (
          <Card>
            <EmptyState
              icon={<Calculator size={40} />}
              title="Elige un vehículo para empezar"
              description="Selecciona la aplicación del cliente y el comparativo de ahorro aparecerá aquí en tiempo real."
            />
          </Card>
        ) : result ? (
          <>
            <Card className="p-5 border-brand-accent/30">
              <p className="text-xs text-brand-text-muted uppercase tracking-wider">Ahorro con preventivo</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-3xl font-bold text-green-400">{pesos0.format(result.savings)}</span>
                {savingsPct > 0 && <Badge className="bg-green-500/15 text-green-400 border-green-500/30 mb-1"><TrendingDown size={12} /> {savingsPct}% menos</Badge>}
              </div>
              <p className="text-[11px] text-brand-text-dim mt-1">
                {totalUnits} unidad(es){application ? ` · ${application.brand}` : ""} · proyección a {horizonMonths} meses.
              </p>

              <div className="mt-4 space-y-3">
                <CompareBar label="Costo correctivo" value={result.totalCorr} max={Math.max(result.totalCorr, result.totalPrev, 1)} color="bg-red-500" strong={pesos.format(result.totalCorr)} />
                <CompareBar label="Servicio preventivo" value={result.totalPrev} max={Math.max(result.totalCorr, result.totalPrev, 1)} color="bg-brand-accent" strong={pesos.format(result.totalPrev)} />
              </div>

              <Button onClick={exportPdf} loading={pdfLoading} className="w-full mt-4">
                <FileDown size={15} /> Exportar cotización PDF
              </Button>
            </Card>

            <Card className="p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-text-muted mb-2">Desglose del correctivo</h3>
              <BreakdownRow label={`Servicio reactivo (${totalUnits}× ${pesos0.format(result.corrUnitPrice)})`} value={result.corrUnitPrice * result.totalUnits} />
              <BreakdownRow label="Piezas de reemplazo" value={result.partsSum} />
              <BreakdownRow label={`DEF/AdBlue (${horizonMonths} meses)`} value={result.ureaCost} />
              <BreakdownRow label="Inoperatividad" value={result.downtimeCost} />
              <div className="flex justify-between pt-2 mt-1 border-t border-brand-border text-sm font-semibold">
                <span>Total correctivo</span>
                <span className="text-red-400">{pesos.format(result.totalCorr)}</span>
              </div>
              <div className="flex justify-between pt-2 mt-2 border-t border-brand-border text-sm">
                <span className="text-brand-text-muted">Servicio preventivo ({totalUnits}× {pesos0.format(result.prevUnitPrice)})</span>
                <span className="font-semibold text-brand-accent">{pesos.format(result.totalPrev)}</span>
              </div>
              {application && (
                <div className="mt-3 pt-3 border-t border-brand-border">
                  <SystemBadges text={application.displayLabel} />
                </div>
              )}
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}

function StepTitle({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-accent/15 text-brand-accent text-xs font-bold shrink-0">{n}</span>
      <div>
        <h2 className="text-sm font-semibold leading-tight">{title}</h2>
        {hint && <p className="text-[11px] text-brand-text-dim leading-tight">{hint}</p>}
      </div>
    </div>
  );
}

function ToggleRow({ icon, label, checked, onCheck, summary, children }: { icon: ReactNode; label: string; checked: boolean; onCheck: (v: boolean) => void; summary?: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-brand-border px-3 py-2.5">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input type="checkbox" checked={checked} onChange={(e) => onCheck(e.target.checked)} className="accent-brand-accent" />
          <span className="text-brand-text-muted">{icon}</span>
          {label}
        </label>
        {summary && <span className="text-xs text-brand-text-dim">{summary}</span>}
      </div>
      {checked && children}
    </div>
  );
}

function CompareBar({ label, value, max, color, strong }: { label: string; value: number; max: number; color: string; strong: string }) {
  const pct = Math.max(3, (value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-brand-text-muted">{label}</span>
        <strong>{strong}</strong>
      </div>
      <div className="h-3 bg-brand-surface2 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between py-1 text-xs">
      <span className="text-brand-text-dim">{label}</span>
      <span className={value > 0 ? "text-brand-text" : "text-brand-text-dim"}>{pesos0.format(value)}</span>
    </div>
  );
}

// ─── CATALOG MANAGER ────────────────────────────────────

function CatalogManager({ applications, onChange }: { applications: QuoterApplication[]; onChange: () => void }) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<QuoterApplication | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QuoterApplication | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = applications.filter((a) => {
    if (!search) return true;
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    const h = a.displayLabel.toLowerCase();
    return words.every((w) => h.includes(w));
  });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/quoter/applications/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      onChange();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input placeholder="Buscar marca, motor, año, sistema..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <Button size="sm" onClick={() => setEditing("new")}><Plus size={14} /> Agregar aplicación</Button>
      </div>

      {editing && <ApplicationForm application={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChange(); }} />}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-brand-surface z-10">
              <tr className="border-b border-brand-border text-brand-text-muted text-xs">
                <th className="text-left px-3 py-2">Marca / aplicación</th>
                <th className="text-left px-3 py-2">Sistemas</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">Prev. / Corr. (1)</th>
                <th className="text-left px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((a) => (
                <tr key={a.id} className="border-b border-brand-border/50 hover:bg-brand-surface2/50">
                  <td className="px-3 py-2">
                    <div className="font-medium">{a.brand} <span className="text-[10px] uppercase text-brand-text-dim">· {a.category}</span></div>
                    <div className="text-xs text-brand-text-dim line-clamp-1 max-w-md">{a.model}</div>
                  </td>
                  <td className="px-3 py-2"><SystemBadges text={a.displayLabel} size="xs" /></td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    {a.pricing["1"] ? `${pesos0.format(a.pricing["1"].prev)} / ${pesos0.format(a.pricing["1"].corr)}` : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(a)} className="text-brand-accent hover:underline text-xs">Editar</button>
                      <button onClick={() => setDeleteTarget(a)} className="text-red-400 hover:underline text-xs">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 200 && <p className="text-xs text-brand-text-dim p-3">Mostrando 200 de {filtered.length} resultados. Refina la búsqueda.</p>}
      </Card>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Eliminar aplicación"
        message={`¿Eliminar "${deleteTarget?.brand} — ${deleteTarget?.model}" del catálogo?`}
        confirmText="Eliminar"
        danger
        loading={deleting}
      />
    </div>
  );
}

function ApplicationForm({ application, onClose, onSaved }: { application: QuoterApplication | null; onClose: () => void; onSaved: () => void }) {
  const [category, setCategory] = useState(application?.category || "");
  const [brand, setBrand] = useState(application?.brand || "");
  const [model, setModel] = useState(application?.model || "");
  const [pricing, setPricing] = useState<Record<string, { prev: number; corr: number }>>(
    application?.pricing || { "1": { prev: 0, corr: 0 }, "2": { prev: 0, corr: 0 }, "3": { prev: 0, corr: 0 }, "4": { prev: 0, corr: 0 } }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setModeVal = (m: string, field: "prev" | "corr", value: number) => {
    setPricing((p) => ({ ...p, [m]: { ...(p[m] || { prev: 0, corr: 0 }), [field]: value } }));
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const url = application ? `/api/quoter/applications/${application.id}` : "/api/quoter/applications";
      const method = application ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, brand, model, pricing }) });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Error al guardar"); return; }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 border-brand-accent/40">
      <h3 className="text-sm font-semibold mb-3">{application ? "Editar aplicación" : "Nueva aplicación"}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input label="Categoría" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Tractocamiones, Furgoneta-Vagoneta Ligeros..." />
        <Input label="Marca" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="KENWORTH, FORD..." />
        <Input label="Modelo / Descripción" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Motor, años, potencia, método..." />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3">
        {["1", "2", "3", "4"].map((m) => (
          <div key={m} className="bg-brand-surface2 rounded-lg p-2">
            <p className="text-xs text-brand-text-dim mb-1">{m} desactivación{m === "1" ? "" : "es"}</p>
            <Input label="Preventivo" type="number" min={0} value={pricing[m]?.prev ?? 0} onChange={(e) => setModeVal(m, "prev", Number(e.target.value) || 0)} />
            <div className="mt-1">
              <Input label="Correctivo" type="number" min={0} value={pricing[m]?.corr ?? 0} onChange={(e) => setModeVal(m, "corr", Number(e.target.value) || 0)} />
            </div>
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      <div className="flex gap-2 mt-3">
        <Button size="sm" onClick={save} loading={saving} disabled={!category || !brand || !model}>Guardar</Button>
        <Button size="sm" variant="secondary" onClick={onClose}>Cancelar</Button>
      </div>
    </Card>
  );
}

// ─── PARTS MANAGER ──────────────────────────────────────

function PartsManager({ parts, onChange }: { parts: QuoterPartRow[]; onChange: () => void }) {
  const [editing, setEditing] = useState<QuoterPartRow | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QuoterPartRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/quoter/parts/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      onChange();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setEditing("new")}><Plus size={14} /> Agregar pieza</Button>
      </div>

      {editing && <PartForm part={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChange(); }} />}

      <p className="text-xs text-brand-text-dim">
        Precios <strong>estimados</strong> de mercado MX, editables. Las <span className="text-brand-accent">esenciales (●)</span> se preseleccionan al cotizar.
      </p>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border text-brand-text-muted text-xs">
              <th className="text-left px-3 py-2">Sistema</th>
              <th className="text-left px-3 py-2">Pieza</th>
              <th className="text-left px-3 py-2">Camioneta</th>
              <th className="text-left px-3 py-2">Camión</th>
              <th className="text-center px-3 py-2">Esencial</th>
              <th className="text-center px-3 py-2">×/unidad</th>
              <th className="text-left px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => (
              <tr key={p.id} className="border-b border-brand-border/50 align-top">
                <td className="px-3 py-2"><Badge className="bg-brand-surface2 text-brand-text-dim">{p.system}</Badge></td>
                <td className="px-3 py-2">
                  <div>{p.label}</div>
                  {p.note && <div className="text-[11px] text-brand-text-dim max-w-xs">{p.note}</div>}
                </td>
                <td className="px-3 py-2">{pesos.format(p.vanPrice)}</td>
                <td className="px-3 py-2">{pesos.format(p.truckPrice)}</td>
                <td className="px-3 py-2 text-center">{p.essential ? <span className="text-brand-accent">●</span> : <span className="text-brand-text-dim">—</span>}</td>
                <td className="px-3 py-2 text-center text-brand-text-dim">{p.qtyPerUnit}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(p)} className="text-brand-accent hover:underline text-xs">Editar</button>
                    <button onClick={() => setDeleteTarget(p)} className="text-red-400 hover:underline text-xs">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Eliminar pieza"
        message={`¿Eliminar "${deleteTarget?.label}" del catálogo de piezas?`}
        confirmText="Eliminar"
        danger
        loading={deleting}
      />
    </div>
  );
}

function PartForm({ part, onClose, onSaved }: { part: QuoterPartRow | null; onClose: () => void; onSaved: () => void }) {
  const [system, setSystem] = useState(part?.system || "DPF");
  const [label, setLabel] = useState(part?.label || "");
  const [vanPrice, setVanPrice] = useState(part?.vanPrice ?? 0);
  const [truckPrice, setTruckPrice] = useState(part?.truckPrice ?? 0);
  const [essential, setEssential] = useState(part?.essential ?? true);
  const [qtyPerUnit, setQtyPerUnit] = useState(part?.qtyPerUnit ?? 1);
  const [note, setNote] = useState(part?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const url = part ? `/api/quoter/parts/${part.id}` : "/api/quoter/parts";
      const method = part ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system, label, vanPrice, truckPrice, essential, qtyPerUnit, note: note || null }) });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Error al guardar"); return; }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 border-brand-accent/40">
      <h3 className="text-sm font-semibold mb-3">{part ? "Editar pieza" : "Nueva pieza"}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Select label="Sistema" value={system} onChange={(e) => setSystem(e.target.value)} options={SYSTEMS.map((s) => ({ value: s, label: s }))} />
        <Input label="Nombre" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Filtro DPF, Válvula EGR..." />
        <Input label="Precio Camioneta" type="number" min={0} value={vanPrice} onChange={(e) => setVanPrice(Number(e.target.value) || 0)} />
        <Input label="Precio Camión" type="number" min={0} value={truckPrice} onChange={(e) => setTruckPrice(Number(e.target.value) || 0)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3">
        <Input label="Piezas por unidad" type="number" min={1} value={qtyPerUnit} onChange={(e) => setQtyPerUnit(Math.max(1, Number(e.target.value) || 1))} />
        <div className="sm:col-span-2">
          <Input label="Nota / aclaración" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. OEM puede ser mayor, falla frecuente..." />
        </div>
        <label className="flex items-center gap-2 text-sm text-brand-text-muted self-end pb-2">
          <input type="checkbox" checked={essential} onChange={(e) => setEssential(e.target.checked)} className="accent-brand-accent" />
          Esencial (preseleccionar)
        </label>
      </div>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      <div className="flex gap-2 mt-3">
        <Button size="sm" onClick={save} loading={saving} disabled={!label}>Guardar</Button>
        <Button size="sm" variant="secondary" onClick={onClose}>Cancelar</Button>
      </div>
    </Card>
  );
}
