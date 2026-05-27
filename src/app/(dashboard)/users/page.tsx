"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, UserCog } from "lucide-react";
import { Button, Card, Badge, PageHeader, Loading } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users").then(r => r.json()).then(setUsers).finally(() => setLoading(false));
  }, []);

  if (currentUser?.role !== "admin") {
    return <Card className="p-8 text-center"><p className="text-brand-text-dim">No tienes permisos para esta sección</p></Card>;
  }

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Administración de usuarios del sistema"
        actions={<Link href="/users/new"><Button size="sm"><Plus size={16} /> Nuevo Usuario</Button></Link>}
      />

      {loading ? <Loading /> : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border text-brand-text-muted">
                <th className="text-left px-4 py-2.5 font-medium text-xs">Nombre</th>
                <th className="text-left px-4 py-2.5 font-medium text-xs">Correo</th>
                <th className="text-left px-4 py-2.5 font-medium text-xs">Rol</th>
                <th className="text-left px-4 py-2.5 font-medium text-xs">Estado</th>
                <th className="text-left px-4 py-2.5 font-medium text-xs">Creado</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id} className="border-b border-brand-border/50 hover:bg-brand-surface2/50">
                  <td className="px-4 py-2.5 font-medium">{u.name}</td>
                  <td className="px-4 py-2.5 text-brand-text-muted">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <Badge className="bg-brand-surface2 text-brand-text-muted border-brand-border">{ROLE_LABELS[u.role]}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge className={u.active ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
                      {u.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-brand-text-dim text-xs">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
