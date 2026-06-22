"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Truck, ClipboardList, Stethoscope, HardDrive, Calculator } from "lucide-react";
import { Card, Badge, Button, PageHeader, Loading, StatCard } from "@/components/ui";
import { UNIT_TYPE_LABELS, FUEL_TYPE_LABELS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, RISK_LEVEL_LABELS, RISK_LEVEL_COLORS, RISK_LEVEL_DOT } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { QuoterApplicationPicker, type QuoterApplicationOption } from "@/components/quoter-application-picker";

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<QuoterApplicationOption[]>([]);
  const [pickerValue, setPickerValue] = useState("");
  const [savingApp, setSavingApp] = useState(false);

  const canManageQuoter = user?.role === "admin" || user?.role === "sales";

  useEffect(() => {
    fetch(`/api/vehicles/${id}`).then(r => r.json()).then((v) => {
      setVehicle(v);
      setPickerValue(v.quoterApplicationId || "");
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!canManageQuoter) return;
    fetch("/api/quoter/applications").then(r => r.ok ? r.json() : []).then(setApplications).catch(() => {});
  }, [canManageQuoter]);

  const saveQuoterApplication = async () => {
    if (!vehicle) return;
    setSavingApp(true);
    try {
      await fetch(`/api/vehicles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...vehicle, quoterApplicationId: pickerValue || null }),
      });
      const fresh = await fetch(`/api/vehicles/${id}`).then((r) => r.json());
      setVehicle(fresh);
      setPickerValue(fresh.quoterApplicationId || "");
    } finally {
      setSavingApp(false);
    }
  };

  if (loading) return <Loading />;
  if (!vehicle) return <p className="text-red-400">Vehículo no encontrado</p>;

  return (
    <>
      <PageHeader
        title={`${vehicle.brand} ${vehicle.model} ${vehicle.year || ""}`}
        description={[vehicle.plates, vehicle.vin, vehicle.economicNumber ? `#${vehicle.economicNumber}` : null].filter(Boolean).join(" • ")}
        breadcrumbs={[{label:"Vehículos",href:"/vehicles"},{label:`${vehicle.brand} ${vehicle.model}`}]}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Órdenes" value={vehicle.serviceOrders?.length || 0} icon={<ClipboardList size={18} />} />
        <StatCard label="Diagnósticos" value={vehicle.diagnostics?.length || 0} icon={<Stethoscope size={18} />} />
        <StatCard label="Archivos ECU" value={vehicle.ecuFiles?.length || 0} icon={<HardDrive size={18} />} />
        {vehicle.mileage && <StatCard label="Kilometraje" value={`${vehicle.mileage.toLocaleString()} km`} icon={<Truck size={18} />} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 text-brand-text-muted uppercase tracking-wider">Información</h3>
          <dl className="space-y-2 text-sm">
            {[
              ["Empresa", vehicle.company?.name],
              ["Tipo", UNIT_TYPE_LABELS[vehicle.unitType]],
              ["Combustible", FUEL_TYPE_LABELS[vehicle.fuelType]],
              ["Motor", vehicle.engine],
              ["Horómetro", vehicle.hourMeter ? `${vehicle.hourMeter} hrs` : null],
              ["ECU", vehicle.knownEcu],
              ["Notas", vehicle.notes],
            ].map(([label, value]) => value ? (
              <div key={label as string} className="flex gap-3">
                <dt className="text-brand-text-dim w-28 flex-shrink-0">{label}</dt>
                <dd>{value}</dd>
              </div>
            ) : null)}
          </dl>
        </Card>

        {/* Diagnostics history */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 text-brand-text-muted uppercase tracking-wider">Historial de Diagnósticos</h3>
          {vehicle.diagnostics?.length === 0 ? (
            <p className="text-sm text-brand-text-dim py-4 text-center">Sin diagnósticos</p>
          ) : (
            <div className="space-y-2">
              {vehicle.diagnostics?.map((d: any) => (
                <Link key={d.id} href={`/diagnostics/${d.id}`} className="block p-3 bg-brand-surface2 rounded-lg hover:bg-brand-border/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{formatDate(d.diagnosticDate)}</span>
                    <Badge className={RISK_LEVEL_COLORS[d.riskLevel]} dot={RISK_LEVEL_DOT[d.riskLevel]}>
                      {d.generalHealthScore}/100 — {RISK_LEVEL_LABELS[d.riskLevel]}
                    </Badge>
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-brand-text-dim">
                    {d.dpfScore != null && <span>DPF: {d.dpfScore}</span>}
                    {d.scrScore != null && <span>SCR: {d.scrScore}</span>}
                    {d.egrScore != null && <span>EGR: {d.egrScore}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {canManageQuoter && (
        <Card className="p-4 mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Calculator size={16} className="text-brand-text-dim" />
            <h3 className="font-semibold text-sm text-brand-text-muted uppercase tracking-wider">Aplicación de Cotizador</h3>
          </div>
          <p className="text-xs text-brand-text-dim mb-3">
            Vincula este vehículo a su aplicación en el catálogo del cotizador para pre-llenar la cotización en el portal del cliente.
          </p>
          {vehicle.quoterApplication && (
            <div className="bg-brand-surface2 rounded-lg px-3 py-2 mb-3 text-sm">
              Actual: <span className="font-medium">{vehicle.quoterApplication.brand} — {vehicle.quoterApplication.model}</span>
            </div>
          )}
          <QuoterApplicationPicker applications={applications} value={pickerValue} onChange={setPickerValue} />
          <div className="mt-3">
            <Button size="sm" onClick={saveQuoterApplication} loading={savingApp}>Guardar vínculo</Button>
          </div>
        </Card>
      )}

      {/* Orders history */}
      {vehicle.serviceOrders?.length > 0 && (
        <Card className="mt-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-brand-border">
            <h3 className="font-semibold text-sm">Historial de Órdenes</h3>
          </div>
          <div className="divide-y divide-brand-border/50">
            {vehicle.serviceOrders.map((o: any) => (
              <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-brand-surface2/50 transition-colors">
                <div>
                  <span className="font-medium text-brand-accent text-sm">{o.folio}</span>
                  <span className="text-brand-text-dim text-xs ml-2">{formatDate(o.createdAt)}</span>
                  {o.technician && <span className="text-brand-text-dim text-xs ml-2">— {o.technician.name}</span>}
                </div>
                <Badge className={ORDER_STATUS_COLORS[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
