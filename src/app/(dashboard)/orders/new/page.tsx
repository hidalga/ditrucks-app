"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, X } from "lucide-react";
import { Button, Input, Select, Textarea, Card, PageHeader } from "@/components/ui";
import { SERVICE_TYPE_LABELS, EVIDENCE_CATEGORY_LABELS } from "@/lib/constants";

interface PendingPhoto {
  file: File;
  category: string;
  preview: string;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [companies, setCompanies] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const items = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({ file: f, category: "identificacion_unidad", preview: URL.createObjectURL(f) }));
    setPhotos((p) => [...p, ...items]);
  };

  const removePhoto = (idx: number) => {
    setPhotos((p) => {
      URL.revokeObjectURL(p[idx].preview);
      return p.filter((_, i) => i !== idx);
    });
  };

  useEffect(() => {
    fetch("/api/companies").then(r => r.json()).then(setCompanies);
    fetch("/api/users").then(r => r.json()).then(setUsers);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCompany) params.set("companyId", selectedCompany);
    fetch(`/api/vehicles?${params}`).then(r => r.json()).then(setVehicles);
  }, [selectedCompany]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true); setError("");
    const fd = new FormData(e.currentTarget);

    const serviceTypes = Array.from(fd.getAll("serviceTypes")) as string[];

    const data = {
      companyId: fd.get("companyId") || null,
      vehicleId: fd.get("vehicleId"),
      technicianId: fd.get("technicianId") || null,
      serviceTypes,
      mileageAtReception: fd.get("mileageAtReception") ? Number(fd.get("mileageAtReception")) : null,
      engineHoursAtReception: fd.get("engineHoursAtReception") ? Number(fd.get("engineHoursAtReception")) : null,
      fuelLevel: fd.get("fuelLevel") || null,
      activeWarningLights: fd.get("activeWarningLights") || null,
      activeFaults: fd.get("activeFaults") || null,
      customerReportedFaults: fd.get("customerReportedFaults") || null,
      physicalDamageNotes: fd.get("physicalDamageNotes") || null,
      generalObservations: fd.get("generalObservations") || null,
      requestedServiceType: fd.get("requestedServiceType") || null,
    };

    try {
      const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) { const err = await res.json(); setError(err.error || "Error al crear orden"); return; }
      const order = await res.json();
      // Upload photos as evidence of the new order (reuses the evidence pipeline)
      for (const photo of photos) {
        const pfd = new FormData();
        pfd.append("file", photo.file);
        pfd.append("category", photo.category);
        await fetch(`/api/orders/${order.id}/evidence`, { method: "POST", body: pfd }).catch(() => {});
      }
      router.push(`/orders/${order.id}`);
    } catch { setError("Error de conexión"); }
    finally { setLoading(false); }
  };

  const techOptions = users.filter((u: any) => ["admin","technician"].includes(u.role)).map((u: any) => ({value:u.id,label:u.name}));

  return (
    <>
      <PageHeader title="Nueva Orden de Servicio" breadcrumbs={[{label:"Órdenes",href:"/orders"},{label:"Nueva"}]} />
      <Card className="max-w-3xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section: Vehículo */}
          <div>
            <h3 className="text-sm font-semibold text-brand-accent mb-3 uppercase tracking-wider">Vehículo y Asignación</h3>
            <div className="space-y-4">
              <Select name="companyId" label="Empresa" options={companies.map((c:any)=>({value:c.id,label:c.name}))} placeholder="— Seleccionar empresa —" onChange={(e) => setSelectedCompany((e.target as HTMLSelectElement).value)} />
              <Select name="vehicleId" label="Vehículo *" options={vehicles.map((v:any)=>({value:v.id,label:`${v.brand} ${v.model} ${v.year||""} ${v.plates ? `(${v.plates})` : ""}`}))} placeholder="— Seleccionar vehículo —" required />
              <Select name="technicianId" label="Técnico asignado" options={techOptions} placeholder="— Asignar técnico —" />
            </div>
          </div>

          {/* Section: Tipo de servicio */}
          <div>
            <h3 className="text-sm font-semibold text-brand-accent mb-3 uppercase tracking-wider">Tipo de Servicio</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 p-2 bg-brand-surface2 rounded-lg cursor-pointer hover:bg-brand-border/50 transition-colors">
                  <input type="checkbox" name="serviceTypes" value={value} className="accent-amber-500" />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section: Recepción */}
          <div>
            <h3 className="text-sm font-semibold text-brand-accent mb-3 uppercase tracking-wider">Recepción del Vehículo</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input name="mileageAtReception" label="Kilometraje" type="number" placeholder="0" />
                <Input name="engineHoursAtReception" label="Horómetro" type="number" placeholder="0" />
                <Select name="fuelLevel" label="Nivel combustible" options={[{value:"vacio",label:"Vacío"},{value:"1/4",label:"1/4"},{value:"1/2",label:"1/2"},{value:"3/4",label:"3/4"},{value:"lleno",label:"Lleno"}]} placeholder="—" />
              </div>
              <Textarea name="activeWarningLights" label="Testigos activos en tablero" placeholder="Check engine, DPF, AdBlue, etc." />
              <Textarea name="activeFaults" label="Códigos de falla activos" placeholder="P0401, P2002, etc." />
              <Textarea name="customerReportedFaults" label="Fallas reportadas por el cliente" placeholder="Lo que el cliente reporta" />
              <Textarea name="physicalDamageNotes" label="Daños físicos visibles" placeholder="Golpes, fugas, cables rotos..." />
              <Textarea name="generalObservations" label="Observaciones generales" placeholder="Observaciones del técnico" />
              <Input name="requestedServiceType" label="Trabajo solicitado" placeholder="Descripción del servicio solicitado" />
            </div>
          </div>

          {/* Section: Fotos */}
          <div>
            <h3 className="text-sm font-semibold text-brand-accent mb-1 uppercase tracking-wider">Fotos de la Unidad</h3>
            <p className="text-xs text-brand-text-dim mb-3">
              Identificación (VIN, placas, no. económico), tablero con testigos, DTC del escáner, golpes o detalles de la unidad. Se guardan como evidencia de la orden.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Button type="button" variant="secondary" size="sm" onClick={() => cameraInputRef.current?.click()}>
                <Camera size={14} /> Tomar foto
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload size={14} /> Subir fotos
              </Button>
            </div>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />

            {photos.length > 0 && (
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 mt-4">
                {photos.map((photo, idx) => (
                  <div key={photo.preview} className="bg-brand-surface2 border border-brand-border rounded-lg overflow-hidden">
                    <div className="relative aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removePhoto(idx)}
                        className="absolute top-1.5 right-1.5 p-1 bg-black/60 rounded-full text-white hover:bg-red-500/80 transition-colors cursor-pointer">
                        <X size={12} />
                      </button>
                    </div>
                    <div className="p-2">
                      <select
                        value={photo.category}
                        onChange={(e) => setPhotos((p) => p.map((it, i) => i === idx ? { ...it, category: e.target.value } : it))}
                        className="w-full bg-brand-surface border border-brand-border rounded-md px-2 py-1 text-xs text-brand-text outline-none"
                      >
                        {Object.entries(EVIDENCE_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"><p className="text-sm text-red-400">{error}</p></div>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading}>Crear Orden</Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>Cancelar</Button>
          </div>
        </form>
      </Card>
    </>
  );
}
