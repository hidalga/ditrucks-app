"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, ClipboardList, Filter } from "lucide-react";
import { Button, Card, Badge, PageHeader, Loading, EmptyState, Select } from "@/components/ui";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, RISK_LEVEL_LABELS, RISK_LEVEL_COLORS, RISK_LEVEL_DOT } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    fetch(`/api/orders?${params}`)
      .then(r => r.json())
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  const statusOptions = Object.entries(ORDER_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }));

  return (
    <>
      <PageHeader
        title="Órdenes de Servicio"
        description="Gestión de todas las órdenes de trabajo"
        actions={<Link href="/orders/new"><Button size="sm"><Plus size={16} /> Nueva Orden</Button></Link>}
      />

      <Card className="mb-4 p-3">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-dim" />
            <input type="text" placeholder="Buscar por folio, vehículo, empresa..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-brand-surface2 border border-brand-border rounded-lg pl-9 pr-4 py-2 text-sm text-brand-text placeholder:text-brand-text-dim focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-brand-surface2 border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent/40 min-w-[160px]">
            <option value="">Todos los estados</option>
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </Card>

      {loading ? <Loading /> : orders.length === 0 ? (
        <EmptyState icon={<ClipboardList size={40} />} title="Sin órdenes registradas"
          description="Crea tu primera orden de servicio"
          action={<Link href="/orders/new"><Button size="sm"><Plus size={16} /> Nueva Orden</Button></Link>}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border text-brand-text-muted">
                  <th className="text-left px-4 py-2.5 font-medium text-xs">Folio</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs">Cliente / Empresa</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs">Vehículo</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs">Estado</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs hidden md:table-cell">Técnico</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs hidden md:table-cell">Fecha</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs hidden lg:table-cell">Archivos</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o: any) => (
                  <tr key={o.id} className="border-b border-brand-border/50 hover:bg-brand-surface2/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <Link href={`/orders/${o.id}`} className="text-brand-accent font-medium hover:underline">{o.folio}</Link>
                    </td>
                    <td className="px-4 py-2.5 text-brand-text-muted">{o.company?.name || o.customer?.name || "—"}</td>
                    <td className="px-4 py-2.5">
                      {o.vehicle ? `${o.vehicle.brand} ${o.vehicle.model}` : "—"}
                      {o.vehicle?.plates && <span className="text-brand-text-dim text-xs ml-1">({o.vehicle.plates})</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge className={ORDER_STATUS_COLORS[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-brand-text-muted hidden md:table-cell">{o.technician?.name || "—"}</td>
                    <td className="px-4 py-2.5 text-brand-text-dim text-xs hidden md:table-cell">{formatDate(o.createdAt)}</td>
                    <td className="px-4 py-2.5 text-brand-text-dim text-xs hidden lg:table-cell">
                      {o._count?.ecuFiles || 0} ECU · {o._count?.evidence || 0} Foto
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
