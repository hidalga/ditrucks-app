"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Card, PageHeader } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/constants";

export default function NewUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true); setError("");
    const fd = new FormData(e.currentTarget);
    const data = {
      name: fd.get("name"),
      email: fd.get("email"),
      password: fd.get("password"),
      role: fd.get("role"),
      active: true,
    };
    try {
      const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) { const err = await res.json(); setError(err.error); return; }
      router.push("/users");
    } catch { setError("Error de conexión"); }
    finally { setLoading(false); }
  };

  return (
    <>
      <PageHeader title="Nuevo Usuario" breadcrumbs={[{label:"Usuarios",href:"/users"},{label:"Nuevo"}]} />
      <Card className="max-w-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="name" label="Nombre *" placeholder="Nombre completo" required />
          <Input name="email" label="Correo *" type="email" placeholder="correo@ditrucks.com" required />
          <Input name="password" label="Contraseña *" type="password" placeholder="Mínimo 6 caracteres" required />
          <Select name="role" label="Rol" options={Object.entries(ROLE_LABELS).filter(([v]) => v !== "fleet_customer_future").map(([v,l])=>({value:v,label:l}))} />
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"><p className="text-sm text-red-400">{error}</p></div>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading}>Crear Usuario</Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>Cancelar</Button>
          </div>
        </form>
      </Card>
    </>
  );
}
