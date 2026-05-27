"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Building2, Truck, ClipboardList, Users } from "lucide-react";
import { Card, Badge, PageHeader, Loading, StatCard } from "@/components/ui";
import { COMPANY_TYPE_LABELS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/companies/${id}`)
      .then((r) => r.json())
      .then(setCompany)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading />;
  if (!company) return <p className="text-red-400">Empresa no encontrada</p>;

  return (
    <>
      <PageHeader
        title={company.name}
        description={`${COMPANY_TYPE_LABELS[company.companyType] || company.companyType} ${company.rfc ? `• ${company.rfc}` : ""}`}
        breadcrumbs={[{ label: "Empresas", href: "/companies" }, { label: company.name }]}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Clientes" value={company.customers?.length || 0} icon={<Users size={18} />} />
        <StatCard label="Vehículos" value={company.vehicles?.length || 0} icon={<Truck size={18} />} />
        <StatCard label="Órdenes" value={company.serviceOrders?.length || 0} icon={<ClipboardList size={18} />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Info */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 text-brand-text-muted uppercase tracking-wider">Información</h3>
          <dl className="space-y-2 text-sm">
            {[
              ["Razón Social", company.legalName],
              ["RFC", company.rfc],
              ["Teléfono", company.phone],
              ["Correo", company.email],
              ["Dirección", company.address],
              ["Contacto", company.primaryContact],
              ["Notas", company.notes],
            ].map(([label, value]) =>
              value ? (
                <div key={label as string} className="flex gap-3">
                  <dt className="text-brand-text-dim w-28 flex-shrink-0">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ) : null
            )}
          </dl>
        </Card>

        {/* Vehicles */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-brand-text-muted uppercase tracking-wider">Vehículos</h3>
            <Link href={`/vehicles/new?companyId=${id}`} className="text-xs text-brand-accent hover:underline">
              + Agregar
            </Link>
          </div>
          {company.vehicles?.length === 0 ? (
            <p className="text-sm text-brand-text-dim py-4 text-center">Sin vehículos registrados</p>
          ) : (
            <div className="space-y-2">
              {company.vehicles?.map((v: any) => (
                <Link key={v.id} href={`/vehicles/${v.id}`} className="block p-2.5 bg-brand-surface2 rounded-lg hover:bg-brand-border/50 transition-colors">
                  <div className="font-medium text-sm">{v.brand} {v.model} {v.year || ""}</div>
                  <div className="text-xs text-brand-text-dim mt-0.5">
                    {[v.plates, v.vin, v.economicNumber].filter(Boolean).join(" • ")}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Orders */}
      {company.serviceOrders?.length > 0 && (
        <Card className="mt-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-brand-border">
            <h3 className="font-semibold text-sm">Órdenes Recientes</h3>
          </div>
          <div className="divide-y divide-brand-border/50">
            {company.serviceOrders.map((o: any) => (
              <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-brand-surface2/50 transition-colors">
                <div>
                  <span className="font-medium text-brand-accent text-sm">{o.folio}</span>
                  <span className="text-brand-text-dim text-xs ml-2">{formatDate(o.createdAt)}</span>
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
