"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { ORDER_STATUS_LABELS, SERVICE_TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export default function ClientOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/client/orders").then(r => r.json()).then(setOrders).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-3 border-[#f6b31c] border-t-transparent rounded-full" /></div>;

  return (
    <>
      <div className="mb-6"><h1 className="text-2xl font-bold text-slate-900">Trabajos Realizados</h1></div>
      {orders.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><ClipboardList size={40} className="mx-auto mb-3 opacity-50" /><p>Sin trabajos registrados</p></div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
              <th className="text-left px-4 py-2.5 font-medium text-xs">Folio</th>
              <th className="text-left px-4 py-2.5 font-medium text-xs">Vehículo</th>
              <th className="text-left px-4 py-2.5 font-medium text-xs hidden md:table-cell">Servicio</th>
              <th className="text-left px-4 py-2.5 font-medium text-xs">Estado</th>
              <th className="text-left px-4 py-2.5 font-medium text-xs">Fecha</th>
            </tr></thead>
            <tbody>
              {orders.map((o: any) => (
                <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2.5"><Link href={`/client/orders/${o.id}`} className="text-[#b8860b] font-medium hover:underline">{o.folio}</Link></td>
                  <td className="px-4 py-2.5 text-slate-600">{o.vehicle?.brand} {o.vehicle?.model} {o.vehicle?.plates ? `(${o.vehicle.plates})` : ""}</td>
                  <td className="px-4 py-2.5 text-slate-500 hidden md:table-cell">{o.serviceTypes?.map((t: string) => SERVICE_TYPE_LABELS[t] || t).join(", ") || "—"}</td>
                  <td className="px-4 py-2.5"><span className="bg-green-50 text-green-700 text-xs font-medium px-2.5 py-0.5 rounded-full border border-green-200">{ORDER_STATUS_LABELS[o.status]}</span></td>
                  <td className="px-4 py-2.5 text-slate-400 text-xs">{formatDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
