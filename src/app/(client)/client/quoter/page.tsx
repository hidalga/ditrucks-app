"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, FileDown, ChevronDown, ChevronUp } from "lucide-react";
import { calculateQuote, DEFAULT_DOWNTIME_HOURS, DEFAULT_DOWNTIME_RATE, DEFAULT_UREA_VAN_LITERS, DEFAULT_UREA_TRUCK_LITERS, DEFAULT_UREA_PRICE } from "@/services/quoter-engine";

interface ClientVehicle {
  id: string;
  brand: string;
  model: string;
  unitType: string;
  quoterApplicationId: string;
  quoterApplication: { id: string; brand: string; model: string; pricing: Record<string, { prev: number; corr: number }> };
}

interface ClientPart {
  id: string;
  system: string;
  label: string;
  vanPrice: number;
  truckPrice: number;
}

const pesos = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const VAN_UNIT_TYPES = new Set(["pickup", "van"]);

export default function ClientQuoterPage() {
  const [data, setData] = useState<{ companyName: string; vehicles: ClientVehicle[]; parts: ClientPart[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/client/quoter")
      .then(async (r) => {
        if (!r.ok) { const d = await r.json(); setError(d.error || "No disponible"); return; }
        setData(await r.json());
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setLoading(false));
  }, []);

  const groups = useQuoteGroups(data?.vehicles || []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-3 border-[#f6b31c] border-t-transparent rounded-full" /></div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700">{error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Calculator size={20} className="text-[#f6b31c]" /> Cotizador de Flota</h1>
        <p className="text-sm text-slate-500 mt-1">Comparativo de costo preventivo vs. correctivo para tu flota — {data.companyName}</p>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-500">Aún no hay vehículos vinculados al cotizador. Contacta a tu asesor Ditrucks para una cotización personalizada.</p>
        </div>
      ) : (
        groups.map((g) => <QuoteGroupCard key={g.applicationId} group={g} parts={data.parts} />)
      )}
    </div>
  );
}

interface QuoteGroup {
  applicationId: string;
  applicationLabel: string;
  pricing: Record<string, { prev: number; corr: number }>;
  vans: number;
  trucks: number;
  vehicleNames: string[];
}

function useQuoteGroups(vehicles: ClientVehicle[]): QuoteGroup[] {
  return useMemo(() => {
    const map = new Map<string, QuoteGroup>();
    for (const v of vehicles) {
      if (!v.quoterApplication) continue;
      const isVan = VAN_UNIT_TYPES.has(v.unitType);
      const existing = map.get(v.quoterApplicationId);
      if (existing) {
        if (isVan) existing.vans++; else existing.trucks++;
        existing.vehicleNames.push(`${v.brand} ${v.model}`);
      } else {
        map.set(v.quoterApplicationId, {
          applicationId: v.quoterApplicationId,
          applicationLabel: `${v.quoterApplication.brand} — ${v.quoterApplication.model}`,
          pricing: v.quoterApplication.pricing,
          vans: isVan ? 1 : 0,
          trucks: isVan ? 0 : 1,
          vehicleNames: [`${v.brand} ${v.model}`],
        });
      }
    }
    return [...map.values()];
  }, [vehicles]);
}

function QuoteGroupCard({ group, parts }: { group: QuoteGroup; parts: ClientPart[] }) {
  const [mode, setMode] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [ureaIncluded, setUreaIncluded] = useState(true);
  const [downtimeIncluded, setDowntimeIncluded] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  const result = useMemo(() => calculateQuote({
    pricing: group.pricing,
    mode,
    vans: group.vans,
    trucks: group.trucks,
    selectedSystems: ["DPF", "EGR", "SCR", "DOC", "DITUNING"],
    parts: parts.map((p) => ({ system: p.system, label: p.label, vanPrice: p.vanPrice, truckPrice: p.truckPrice, selected: false, units: 0 })),
    ureaIncluded,
    ureaVanLitersPerMonth: DEFAULT_UREA_VAN_LITERS,
    ureaTruckLitersPerMonth: DEFAULT_UREA_TRUCK_LITERS,
    ureaPricePerLiter: DEFAULT_UREA_PRICE,
    downtimeIncluded,
    downtimeHours: DEFAULT_DOWNTIME_HOURS,
    downtimeRatePerHour: DEFAULT_DOWNTIME_RATE,
  }), [group, mode, ureaIncluded, downtimeIncluded, parts]);

  const exportPdf = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch("/api/quoter/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: group.applicationId,
          mode,
          vans: group.vans,
          trucks: group.trucks,
          selectedSystems: ["DPF", "EGR", "SCR", "DOC", "DITUNING"],
          parts: [],
          ureaIncluded,
          downtimeIncluded,
        }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), "_blank");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">{group.applicationLabel}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{group.vehicleNames.length} unidad(es): {group.vehicleNames.join(", ")}</p>
        </div>
        <select value={mode} onChange={(e) => setMode(Number(e.target.value))} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
          {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} desactivación{n === 1 ? "" : "es"}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-center">
          <p className="text-xs text-red-600">Correctivo</p>
          <p className="text-lg font-bold text-red-700">{pesos.format(result.totalCorr)}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500">Preventivo</p>
          <p className="text-lg font-bold text-slate-800">{pesos.format(result.totalPrev)}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
          <p className="text-xs text-green-600">Ahorro</p>
          <p className="text-lg font-bold text-green-700">{pesos.format(result.savings)}</p>
        </div>
      </div>

      <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1 text-xs text-[#b8860b] mt-3 hover:underline">
        {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Ajustes avanzados
      </button>

      {showAdvanced && (
        <div className="flex gap-4 mt-2 text-sm text-slate-600">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={ureaIncluded} onChange={(e) => setUreaIncluded(e.target.checked)} className="accent-[#f6b31c]" /> Incluir urea</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={downtimeIncluded} onChange={(e) => setDowntimeIncluded(e.target.checked)} className="accent-[#f6b31c]" /> Incluir inoperatividad</label>
        </div>
      )}

      <button
        onClick={exportPdf}
        disabled={pdfLoading}
        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#f6b31c] text-white text-sm font-medium rounded-lg hover:bg-[#d99a0b] transition-colors disabled:opacity-50"
      >
        <FileDown size={14} /> {pdfLoading ? "Generando..." : "Descargar PDF"}
      </button>
    </div>
  );
}
