"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, PageHeader, Loading } from "@/components/ui";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/customers/${id}`).then(r => r.json()).then(setCustomer).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading />;
  if (!customer) return <p className="text-red-400">Cliente no encontrado</p>;

  return (
    <>
      <PageHeader
        title={customer.name}
        description={customer.company?.name || "Sin empresa"}
        breadcrumbs={[{label:"Clientes",href:"/customers"},{label:customer.name}]}
      />
      <Card className="max-w-2xl p-5">
        <dl className="space-y-3 text-sm">
          {[["Empresa", customer.company?.name], ["Teléfono", customer.phone], ["Correo", customer.email], ["Puesto", customer.position], ["Notas", customer.notes]]
            .map(([label, value]) => value ? (
              <div key={label as string} className="flex gap-4">
                <dt className="text-brand-text-dim w-24 flex-shrink-0">{label}</dt>
                <dd>{value}</dd>
              </div>
            ) : null)}
        </dl>
      </Card>

      {customer.vehicles?.length > 0 && (
        <Card className="max-w-2xl mt-4 p-4">
          <h3 className="font-semibold text-sm mb-3 text-brand-text-muted uppercase tracking-wider">Vehículos</h3>
          <div className="space-y-2">
            {customer.vehicles.map((v: any) => (
              <Link key={v.id} href={`/vehicles/${v.id}`} className="block p-2.5 bg-brand-surface2 rounded-lg hover:bg-brand-border/50 transition-colors">
                <span className="font-medium text-sm">{v.brand} {v.model} {v.year || ""}</span>
                <span className="text-xs text-brand-text-dim ml-2">{v.plates || v.vin || ""}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
