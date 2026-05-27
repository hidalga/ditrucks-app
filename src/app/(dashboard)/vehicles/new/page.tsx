"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Select, Textarea, Card, PageHeader } from "@/components/ui";
import { UNIT_TYPE_LABELS, FUEL_TYPE_LABELS } from "@/lib/constants";

export default function NewVehiclePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [companies, setCompanies] = useState<{id:string;name:string}[]>([]);

  useEffect(() => { fetch("/api/companies").then(r => r.json()).then(setCompanies); }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true); setError("");
    const fd = new FormData(e.currentTarget);
    const data = {
      brand: fd.get("brand"),
      model: fd.get("model"),
      year: fd.get("year") ? Number(fd.get("year")) : null,
      companyId: fd.get("companyId") || null,
      economicNumber: fd.get("economicNumber") || null,
      vin: fd.get("vin") || null,
      plates: fd.get("plates") || null,
      engine: fd.get("engine") || null,
      fuelType: fd.get("fuelType") || "diesel",
      mileage: fd.get("mileage") ? Number(fd.get("mileage")) : null,
      hourMeter: fd.get("hourMeter") ? Number(fd.get("hourMeter")) : null,
      unitType: fd.get("unitType") || "otro",
      knownEcu: fd.get("knownEcu") || null,
      notes: fd.get("notes") || null,
    };

    try {
      const res = await fetch("/api/vehicles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) { const err = await res.json(); setError(err.error); return; }
      const vehicle = await res.json();
      router.push(`/vehicles/${vehicle.id}`);
    } catch { setError("Error de conexión"); }
    finally { setLoading(false); }
  };

  return (
    <>
      <PageHeader title="Nuevo Vehículo" breadcrumbs={[{label:"Vehículos",href:"/vehicles"},{label:"Nuevo"}]} />
      <Card className="max-w-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select name="companyId" label="Empresa" options={companies.map(c=>({value:c.id,label:c.name}))} placeholder="— Sin empresa —" defaultValue={searchParams.get("companyId")||""} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input name="brand" label="Marca *" placeholder="Kenworth, Freightliner..." required />
            <Input name="model" label="Modelo *" placeholder="T680, Cascadia..." required />
            <Input name="year" label="Año" type="number" placeholder="2024" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input name="plates" label="Placas" placeholder="ABC-123" />
            <Input name="vin" label="VIN / No. Serie" placeholder="VIN" />
            <Input name="economicNumber" label="No. Económico" placeholder="001" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select name="unitType" label="Tipo de Unidad" options={Object.entries(UNIT_TYPE_LABELS).map(([v,l])=>({value:v,label:l}))} />
            <Select name="fuelType" label="Combustible" options={Object.entries(FUEL_TYPE_LABELS).map(([v,l])=>({value:v,label:l}))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input name="engine" label="Motor" placeholder="ISX15, DD15..." />
            <Input name="mileage" label="Kilometraje" type="number" placeholder="0" />
            <Input name="hourMeter" label="Horómetro" type="number" placeholder="0" />
          </div>
          <Input name="knownEcu" label="ECU Conocida" placeholder="CM2350, ACM..." />
          <Textarea name="notes" label="Notas" placeholder="Notas del vehículo" />
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"><p className="text-sm text-red-400">{error}</p></div>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading}>Crear Vehículo</Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>Cancelar</Button>
          </div>
        </form>
      </Card>
    </>
  );
}
