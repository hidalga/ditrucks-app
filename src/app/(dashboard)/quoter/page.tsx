"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, FileDown, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, Badge, Button, Input, Select, PageHeader, Loading, Tabs, ConfirmModal } from "@/components/ui";
import { QuoterApplicationPicker, type QuoterApplicationOption } from "@/components/quoter-application-picker";
import { calculateQuote, DEFAULT_DOWNTIME_HOURS, DEFAULT_DOWNTIME_RATE, DEFAULT_UREA_VAN_LITERS, DEFAULT_UREA_TRUCK_LITERS, DEFAULT_UREA_PRICE } from "@/services/quoter-engine";

interface QuoterApplication {
  id: string;
  category: string;
  brand: string;
  model: string;
  pricing: Record<string, { prev: number; corr: number }>;
}

interface QuoterPartRow {
  id: string;
  system: string;
  label: string;
  vanPrice: number;
  truckPrice: number;
}

const SYSTEMS = ["DPF", "EGR", "SCR", "DOC", "DITUNING"];
const pesos = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

export default function QuoterPage() {
  const [tab, setTab] = useState("cotizar");
  const [applications, setApplications] = useState<QuoterApplication[]>([]);
  const [parts, setParts] = useState<QuoterPartRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshAll = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/quoter/applications").then((r) => r.json()),
      fetch("/api/quoter/parts").then((r) => r.json()),
    ])
      .then(([apps, prts]) => { setApplications(apps); setParts(prts); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { refreshAll(); }, []);

  return (
    <>
      <PageHeader
        title="Cotizador"
        description="Comparativo de costo preventivo vs. correctivo para diagnóstico y reprogramación"
      />

      <Tabs
        tabs={[
          { id: "cotizar", label: "Cotizar", icon: <Calculator size={15} /> },
          { id: "catalogo", label: "Catálogo de Vehículos", icon: <Pencil size={15} /> },
          { id: "piezas", label: "Piezas", icon: <Pencil size={15} /> },
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

// ─── QUOTE BUILDER ──────────────────────────────────────

function QuoteBuilder({ applications, parts }: { applications: QuoterApplication[]; parts: QuoterPartRow[] }) {
  const [applicationId, setApplicationId] = useState("");
  const [mode, setMode] = useState(1);
  const [vans, setVans] = useState(0);
  const [trucks, setTrucks] = useState(0);
  const [selectedSystems, setSelectedSystems] = useState<Set<string>>(new Set(["DPF", "SCR"]));
  const [partsState, setPartsState] = useState<Record<string, { selected: boolean; units: number }>>({});

  const [ureaIncluded, setUreaIncluded] = useState(true);
  const [ureaVan, setUreaVan] = useState(DEFAULT_UREA_VAN_LITERS);
  const [ureaTruck, setUreaTruck] = useState(DEFAULT_UREA_TRUCK_LITERS);
  const [ureaPrice, setUreaPrice] = useState(DEFAULT_UREA_PRICE);

  const [downtimeIncluded, setDowntimeIncluded] = useState(true);
  const [downtimeHours, setDowntimeHours] = useState(DEFAULT_DOWNTIME_HOURS);
  const [downtimeRate, setDowntimeRate] = useState(DEFAULT_DOWNTIME_RATE);

  const [pdfLoading, setPdfLoading] = useState(false);

  // Initialize part selections (all checked, 0 units), matching original tool defaults
  useEffect(() => {
    const initial: Record<string, { selected: boolean; units: number }> = {};
    for (const p of parts) initial[p.id] = { selected: true, units: 0 };
    setPartsState(initial);
  }, [parts]);

  const application = applications.find((a) => a.id === applicationId);
  const activeType: "van" | "truck" = vans > 0 && trucks === 0 ? "van" : "truck";
  const visibleParts = parts.filter((p) => selectedSystems.has(p.system));

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
        selected: partsState[p.id]?.selected ?? false,
        units: partsState[p.id]?.units ?? 0,
      })),
      ureaIncluded,
      ureaVanLitersPerMonth: ureaVan,
      ureaTruckLitersPerMonth: ureaTruck,
      ureaPricePerLiter: ureaPrice,
      downtimeIncluded,
      downtimeHours,
      downtimeRatePerHour: downtimeRate,
    });
  }, [application, mode, vans, trucks, selectedSystems, parts, partsState, ureaIncluded, ureaVan, ureaTruck, ureaPrice, downtimeIncluded, downtimeHours, downtimeRate]);

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
          parts: parts.map((p) => ({ partId: p.id, selected: partsState[p.id]?.selected ?? false, units: partsState[p.id]?.units ?? 0 })),
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
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3">Aplicación</h2>
        <QuoterApplicationPicker applications={applications} value={applicationId} onChange={setApplicationId} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <Select
            label="Desactivaciones"
            value={String(mode)}
            onChange={(e) => setMode(Number(e.target.value))}
            options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: `${n} desactivación${n === 1 ? "" : "es"}` }))}
          />
          <Input label="Camionetas" type="number" min={0} value={vans} onChange={(e) => setVans(Number(e.target.value) || 0)} />
          <Input label="Camiones" type="number" min={0} value={trucks} onChange={(e) => setTrucks(Number(e.target.value) || 0)} />
        </div>
        <div className="flex gap-4 flex-wrap mt-3">
          {SYSTEMS.map((sys) => (
            <label key={sys} className="flex items-center gap-2 text-sm text-brand-text-muted">
              <input type="checkbox" checked={selectedSystems.has(sys)} onChange={() => toggleSystem(sys)} className="accent-brand-accent" />
              {sys}
            </label>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">Gasto de Urea (flota)</h2>
            <label className="flex items-center gap-1.5 text-xs text-brand-text-dim">
              <input type="checkbox" checked={ureaIncluded} onChange={(e) => setUreaIncluded(e.target.checked)} className="accent-brand-accent" />
              Incluir en correctivo
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input label="L/mes camioneta" type="number" min={0} value={ureaVan} onChange={(e) => setUreaVan(Number(e.target.value) || 0)} />
            <Input label="L/mes camión" type="number" min={0} value={ureaTruck} onChange={(e) => setUreaTruck(Number(e.target.value) || 0)} />
            <Input label="Precio $/L" type="number" min={0} value={ureaPrice} onChange={(e) => setUreaPrice(Number(e.target.value) || 0)} />
          </div>
          {result && <p className="text-xs text-brand-text-dim mt-2">Consumo: {result.ureaLiters.toLocaleString("es-MX")} L · Costo: {pesos.format(result.ureaCost)}</p>}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">Inoperatividad</h2>
            <label className="flex items-center gap-1.5 text-xs text-brand-text-dim">
              <input type="checkbox" checked={downtimeIncluded} onChange={(e) => setDowntimeIncluded(e.target.checked)} className="accent-brand-accent" />
              Incluir
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Horas/unidad" type="number" min={0} value={downtimeHours} onChange={(e) => setDowntimeHours(Number(e.target.value) || 0)} />
            <Input label="Tarifa $/hora" type="number" min={0} value={downtimeRate} onChange={(e) => setDowntimeRate(Number(e.target.value) || 0)} />
          </div>
          {result && <p className="text-xs text-brand-text-dim mt-2">Costo: {pesos.format(result.downtimeCost)} ({result.totalUnits} unidades)</p>}
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-2">Gasto Estimado (flota)</h2>
          {result ? (
            <div className="space-y-1 text-sm">
              <p>Correctivo total: <strong>{pesos.format(result.totalCorr)}</strong></p>
              <p>Preventivo total: <strong>{pesos.format(result.totalPrev)}</strong></p>
              <p className="text-xs text-brand-text-dim">Unitario correctivo: {result.corrUnitPrice ? pesos.format(result.corrUnitPrice) : "N/D"}</p>
              <p className="text-xs text-brand-text-dim">Unitario preventivo: {result.prevUnitPrice ? pesos.format(result.prevUnitPrice) : "N/D"}</p>
            </div>
          ) : (
            <p className="text-xs text-brand-text-dim">Selecciona una aplicación para ver el comparativo.</p>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Piezas incluidas por sistema</h2>
          <span className="text-xs text-brand-text-dim">Precio unitario ({activeType === "van" ? "Camioneta" : "Camión"})</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border text-brand-text-muted text-xs">
                <th className="text-left px-2 py-2">Sel</th>
                <th className="text-left px-2 py-2">Sistema</th>
                <th className="text-left px-2 py-2">Pieza</th>
                <th className="text-left px-2 py-2">Precio</th>
                <th className="text-left px-2 py-2">Unidades</th>
              </tr>
            </thead>
            <tbody>
              {visibleParts.map((p) => (
                <tr key={p.id} className="border-b border-brand-border/50">
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={partsState[p.id]?.selected ?? false}
                      onChange={(e) => setPartsState((s) => ({ ...s, [p.id]: { ...s[p.id], selected: e.target.checked } }))}
                      className="accent-brand-accent"
                    />
                  </td>
                  <td className="px-2 py-1.5">{p.system}</td>
                  <td className="px-2 py-1.5">{p.label}</td>
                  <td className="px-2 py-1.5">{pesos.format(activeType === "van" ? p.vanPrice : p.truckPrice)}</td>
                  <td className="px-2 py-1.5 w-28">
                    <input
                      type="number" min={0}
                      value={partsState[p.id]?.units ?? 0}
                      onChange={(e) => setPartsState((s) => ({ ...s, [p.id]: { ...s[p.id], units: Number(e.target.value) || 0 } }))}
                      className="w-full bg-brand-surface border border-brand-border rounded px-2 py-1 text-sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result && <p className="text-right text-sm font-semibold mt-2">Total piezas: {pesos.format(result.partsSum)}</p>}
      </Card>

      {result && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">Correctivo vs Preventivo</h2>
          <div className="space-y-3">
            <BarRow label="Correctivo" value={result.totalCorr} max={Math.max(result.totalCorr, result.totalPrev, 1)} color="bg-red-500" />
            <BarRow label="Preventivo" value={result.totalPrev} max={Math.max(result.totalCorr, result.totalPrev, 1)} color="bg-brand-accent" />
          </div>
          <p className="text-sm mt-3">Ahorro estimado con preventivo: <strong className="text-green-400">{pesos.format(result.savings)}</strong></p>
          <div className="mt-4">
            <Button onClick={exportPdf} loading={pdfLoading} disabled={!application}>
              <FileDown size={14} /> Exportar PDF
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.max(2, (value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <strong>{pesos.format(value)}</strong>
      </div>
      <div className="h-3.5 bg-brand-surface2 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
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
    const q = search.toLowerCase();
    return a.brand.toLowerCase().includes(q) || a.model.toLowerCase().includes(q) || a.category.toLowerCase().includes(q);
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
        <Input placeholder="Buscar por categoría, marca o modelo..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <Button size="sm" onClick={() => setEditing("new")}><Plus size={14} /> Agregar aplicación</Button>
      </div>

      {editing && <ApplicationForm application={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChange(); }} />}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-brand-surface">
              <tr className="border-b border-brand-border text-brand-text-muted text-xs">
                <th className="text-left px-3 py-2">Categoría</th>
                <th className="text-left px-3 py-2">Marca</th>
                <th className="text-left px-3 py-2">Modelo</th>
                <th className="text-left px-3 py-2">Precio (1 desact.)</th>
                <th className="text-left px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((a) => (
                <tr key={a.id} className="border-b border-brand-border/50 hover:bg-brand-surface2/50">
                  <td className="px-3 py-2 text-xs text-brand-text-dim">{a.category}</td>
                  <td className="px-3 py-2">{a.brand}</td>
                  <td className="px-3 py-2 text-xs">{a.model}</td>
                  <td className="px-3 py-2 text-xs">
                    {a.pricing["1"] ? `${pesos.format(a.pricing["1"].prev)} / ${pesos.format(a.pricing["1"].corr)}` : "—"}
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

  const setMode = (mode: string, field: "prev" | "corr", value: number) => {
    setPricing((p) => ({ ...p, [mode]: { ...(p[mode] || { prev: 0, corr: 0 }), [field]: value } }));
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
        {["1", "2", "3", "4"].map((mode) => (
          <div key={mode} className="bg-brand-surface2 rounded-lg p-2">
            <p className="text-xs text-brand-text-dim mb-1">{mode} desactivación{mode === "1" ? "" : "es"}</p>
            <Input label="Preventivo" type="number" min={0} value={pricing[mode]?.prev ?? 0} onChange={(e) => setMode(mode, "prev", Number(e.target.value) || 0)} />
            <div className="mt-1">
              <Input label="Correctivo" type="number" min={0} value={pricing[mode]?.corr ?? 0} onChange={(e) => setMode(mode, "corr", Number(e.target.value) || 0)} />
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

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border text-brand-text-muted text-xs">
              <th className="text-left px-3 py-2">Sistema</th>
              <th className="text-left px-3 py-2">Pieza</th>
              <th className="text-left px-3 py-2">Precio Camioneta</th>
              <th className="text-left px-3 py-2">Precio Camión</th>
              <th className="text-left px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => (
              <tr key={p.id} className="border-b border-brand-border/50">
                <td className="px-3 py-2"><Badge className="bg-brand-surface2 text-brand-text-dim">{p.system}</Badge></td>
                <td className="px-3 py-2">{p.label}</td>
                <td className="px-3 py-2">{pesos.format(p.vanPrice)}</td>
                <td className="px-3 py-2">{pesos.format(p.truckPrice)}</td>
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const url = part ? `/api/quoter/parts/${part.id}` : "/api/quoter/parts";
      const method = part ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system, label, vanPrice, truckPrice }) });
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
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      <div className="flex gap-2 mt-3">
        <Button size="sm" onClick={save} loading={saving} disabled={!label}>Guardar</Button>
        <Button size="sm" variant="secondary" onClick={onClose}>Cancelar</Button>
      </div>
    </Card>
  );
}
