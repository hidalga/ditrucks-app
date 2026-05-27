"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Truck } from "lucide-react";
import { Button, Card, Badge, PageHeader, Loading, EmptyState } from "@/components/ui";
import { UNIT_TYPE_LABELS, FUEL_TYPE_LABELS } from "@/lib/constants";

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  plates: string | null;
  vin: string | null;
  economicNumber: string | null;
  unitType: string;
  fuelType: string;
  mileage: number | null;
  company: { id: string; name: string } | null;
  _count: { serviceOrders: number; diagnostics: number };
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    fetch(`/api/vehicles?${params}`)
      .then((r) => r.json())
      .then(setVehicles)
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <>
      <PageHeader
        title="Vehículos"
        description="Unidades registradas en el sistema"
        actions={<Link href="/vehicles/new"><Button size="sm"><Plus size={16} /> Nuevo Vehículo</Button></Link>}
      />

      <Card className="mb-4 p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-dim" />
          <input type="text" placeholder="Buscar por marca, modelo, VIN, placas..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-brand-surface2 border border-brand-border rounded-lg pl-9 pr-4 py-2 text-sm text-brand-text placeholder:text-brand-text-dim focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
          />
        </div>
      </Card>

      {loading ? <Loading /> : vehicles.length === 0 ? (
        <EmptyState icon={<Truck size={40} />} title="Sin vehículos registrados"
          action={<Link href="/vehicles/new"><Button size="sm"><Plus size={16} /> Nuevo Vehículo</Button></Link>}
        />
      ) : (
        <div className="grid gap-3">
          {vehicles.map((v) => (
            <Link key={v.id} href={`/vehicles/${v.id}`}>
              <Card hover className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 bg-brand-surface2 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Truck size={18} className="text-brand-text-muted" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium truncate">{v.brand} {v.model} {v.year || ""}</h3>
                    <div className="flex items-center gap-2 text-xs text-brand-text-dim mt-0.5 flex-wrap">
                      {v.plates && <span className="bg-brand-surface2 px-1.5 py-0.5 rounded">{v.plates}</span>}
                      {v.economicNumber && <span>#{v.economicNumber}</span>}
                      {v.vin && <span className="hidden sm:inline truncate max-w-[180px]">VIN: {v.vin}</span>}
                      <Badge className="bg-brand-surface2 text-brand-text-muted border-brand-border text-[10px]">
                        {UNIT_TYPE_LABELS[v.unitType]}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-5 text-xs text-brand-text-dim flex-shrink-0">
                  {v.company && <span className="hidden md:block">{v.company.name}</span>}
                  <div className="text-center">
                    <div className="font-semibold text-brand-text text-sm">{v._count.serviceOrders}</div>
                    <div>Órdenes</div>
                  </div>
                  {v.mileage && <span className="hidden lg:block">{v.mileage.toLocaleString()} km</span>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
