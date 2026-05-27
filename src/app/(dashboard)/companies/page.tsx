"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Building2 } from "lucide-react";
import { Button, Card, Badge, Input, PageHeader, Loading, EmptyState } from "@/components/ui";
import { COMPANY_TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

interface Company {
  id: string;
  name: string;
  companyType: string;
  phone: string | null;
  email: string | null;
  rfc: string | null;
  createdAt: string;
  _count: { vehicles: number; serviceOrders: number; customers: number };
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchCompanies = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    fetch(`/api/companies?${params}`)
      .then((r) => r.json())
      .then(setCompanies)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCompanies();
  }, [search]);

  return (
    <>
      <PageHeader
        title="Empresas"
        description="Gestión de empresas y flotillas"
        actions={
          <Link href="/companies/new">
            <Button size="sm"><Plus size={16} /> Nueva Empresa</Button>
          </Link>
        }
      />

      <Card className="mb-4 p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-dim" />
          <input
            type="text"
            placeholder="Buscar por nombre, RFC o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-brand-surface2 border border-brand-border rounded-lg pl-9 pr-4 py-2 text-sm text-brand-text placeholder:text-brand-text-dim focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
          />
        </div>
      </Card>

      {loading ? (
        <Loading />
      ) : companies.length === 0 ? (
        <EmptyState
          icon={<Building2 size={40} />}
          title="Sin empresas registradas"
          description="Agrega tu primera empresa o flotilla"
          action={
            <Link href="/companies/new">
              <Button size="sm"><Plus size={16} /> Nueva Empresa</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3">
          {companies.map((c) => (
            <Link key={c.id} href={`/companies/${c.id}`}>
              <Card hover className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 bg-brand-surface2 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} className="text-brand-text-muted" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium truncate">{c.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-brand-text-dim mt-0.5">
                      <Badge className="bg-brand-surface2 text-brand-text-muted border-brand-border text-[10px]">
                        {COMPANY_TYPE_LABELS[c.companyType] || c.companyType}
                      </Badge>
                      {c.rfc && <span>{c.rfc}</span>}
                      {c.phone && <span>{c.phone}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-xs text-brand-text-dim flex-shrink-0">
                  <div className="text-center">
                    <div className="font-semibold text-brand-text text-sm">{c._count.vehicles}</div>
                    <div>Vehículos</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-brand-text text-sm">{c._count.serviceOrders}</div>
                    <div>Órdenes</div>
                  </div>
                  <div className="hidden sm:block">{formatDate(c.createdAt)}</div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
