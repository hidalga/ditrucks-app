"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { Button, Card, PageHeader, Loading, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  position: string | null;
  createdAt: string;
  company: { id: string; name: string } | null;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    fetch(`/api/customers?${params}`)
      .then((r) => r.json())
      .then(setCustomers)
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <>
      <PageHeader
        title="Clientes / Contactos"
        description="Personas de contacto asociadas a empresas"
        actions={
          <Link href="/customers/new">
            <Button size="sm"><Plus size={16} /> Nuevo Cliente</Button>
          </Link>
        }
      />

      <Card className="mb-4 p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-dim" />
          <input type="text" placeholder="Buscar por nombre, correo o teléfono..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-brand-surface2 border border-brand-border rounded-lg pl-9 pr-4 py-2 text-sm text-brand-text placeholder:text-brand-text-dim focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
          />
        </div>
      </Card>

      {loading ? <Loading /> : customers.length === 0 ? (
        <EmptyState icon={<Users size={40} />} title="Sin clientes registrados"
          action={<Link href="/customers/new"><Button size="sm"><Plus size={16} /> Nuevo Cliente</Button></Link>}
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border text-brand-text-muted">
                <th className="text-left px-4 py-2.5 font-medium text-xs">Nombre</th>
                <th className="text-left px-4 py-2.5 font-medium text-xs">Empresa</th>
                <th className="text-left px-4 py-2.5 font-medium text-xs hidden md:table-cell">Teléfono</th>
                <th className="text-left px-4 py-2.5 font-medium text-xs hidden md:table-cell">Correo</th>
                <th className="text-left px-4 py-2.5 font-medium text-xs">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-brand-border/50 hover:bg-brand-surface2/50">
                  <td className="px-4 py-2.5">
                    <Link href={`/customers/${c.id}`} className="text-brand-accent font-medium hover:underline">{c.name}</Link>
                  </td>
                  <td className="px-4 py-2.5 text-brand-text-muted">
                    {c.company ? <Link href={`/companies/${c.company.id}`} className="hover:underline">{c.company.name}</Link> : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-brand-text-dim hidden md:table-cell">{c.phone || "—"}</td>
                  <td className="px-4 py-2.5 text-brand-text-dim hidden md:table-cell">{c.email || "—"}</td>
                  <td className="px-4 py-2.5 text-brand-text-dim text-xs">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
