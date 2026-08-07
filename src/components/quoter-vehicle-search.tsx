"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Search, X, Truck, ChevronDown } from "lucide-react";
import { detectSystems } from "@/lib/quoter-systems";

export interface QuoterVehicleOption {
  id: string;
  category: string;
  brand: string;
  model: string;
  displayLabel: string;
}

interface Props {
  applications: QuoterVehicleOption[];
  value: string;
  onChange: (id: string) => void;
}

const SYSTEM_COLORS: Record<string, string> = {
  DPF: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  EGR: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  SCR: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  DOC: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  DITUNING: "bg-brand-accent/15 text-brand-accent border-brand-accent/30",
};

export function SystemBadges({ text, size = "sm" }: { text: string; size?: "sm" | "xs" }) {
  const systems = detectSystems(text);
  if (systems.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {systems.map((s) => (
        <span
          key={s}
          className={`inline-flex items-center rounded border px-1.5 ${size === "xs" ? "text-[10px] py-0" : "text-[11px] py-0.5"} font-medium ${SYSTEM_COLORS[s] || "bg-brand-surface2 text-brand-text-dim border-brand-border"}`}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

/** Búsqueda multi-palabra: cada término debe aparecer en el texto. */
function matches(haystack: string, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const h = haystack.toLowerCase();
  return words.every((w) => h.includes(w));
}

export function QuoterVehicleSearch({ applications, value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const selected = applications.find((a) => a.id === value) || null;

  // Cerrar al hacer clic fuera.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return applications.slice(0, 60);
    return applications.filter((a) => matches(a.displayLabel, query)).slice(0, 60);
  }, [applications, query]);

  const totalMatches = useMemo(() => {
    if (!query.trim()) return applications.length;
    return applications.filter((a) => matches(a.displayLabel, query)).length;
  }, [applications, query]);

  const pick = (a: QuoterVehicleOption) => {
    onChange(a.id);
    setOpen(false);
    setQuery("");
  };

  const clear = () => {
    onChange("");
    setQuery("");
    setOpen(true);
  };

  // Vehículo ya seleccionado: mostrar tarjeta-resumen con opción de cambiar.
  if (selected && !open) {
    return (
      <div ref={boxRef} className="rounded-lg border border-brand-accent/40 bg-brand-surface2/40 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Truck size={15} className="text-brand-accent shrink-0" />
              <span className="font-semibold text-sm truncate">{selected.brand}</span>
              <span className="text-xs text-brand-text-dim">· {selected.category}</span>
            </div>
            <p className="text-xs text-brand-text-muted mt-1 break-words">{selected.model}</p>
            <div className="mt-2">
              <SystemBadges text={selected.displayLabel} />
            </div>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="text-xs text-brand-accent hover:underline whitespace-nowrap shrink-0"
          >
            Cambiar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-dim pointer-events-none" />
        <input
          autoFocus={open}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Busca por marca, motor, año, potencia… (ej. «kenworth x15» o «ford 6.7»)"
          className="w-full bg-brand-surface border border-brand-border rounded-lg pl-9 pr-9 py-2 text-sm text-brand-text placeholder:text-brand-text-dim focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent/50"
        />
        {query ? (
          <button onClick={clear} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-text-dim hover:text-brand-text">
            <X size={16} />
          </button>
        ) : (
          <ChevronDown size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-text-dim pointer-events-none" />
        )}
      </div>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full rounded-lg border border-brand-border bg-brand-surface shadow-2xl">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-brand-border/60">
            <span className="text-[11px] text-brand-text-dim">
              {totalMatches} aplicación{totalMatches === 1 ? "" : "es"}{query.trim() ? " coinciden" : " en catálogo"}
            </span>
            {totalMatches > results.length && (
              <span className="text-[11px] text-brand-text-dim">refina la búsqueda para ver más</span>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto py-1">
            {results.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-brand-text-dim">Sin coincidencias. Prueba otro término.</p>
            ) : (
              results.map((a) => (
                <button
                  key={a.id}
                  onClick={() => pick(a)}
                  className="w-full text-left px-3 py-2 hover:bg-brand-surface2 border-b border-brand-border/30 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{a.brand}</span>
                    <span className="text-[10px] uppercase tracking-wide text-brand-text-dim">{a.category}</span>
                  </div>
                  <p className="text-xs text-brand-text-muted mt-0.5 line-clamp-1">{a.model}</p>
                  <div className="mt-1"><SystemBadges text={a.displayLabel} size="xs" /></div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
