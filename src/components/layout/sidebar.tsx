"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  Users,
  Truck,
  Stethoscope,
  HardDrive,
  Camera,
  FileText,
  UserCog,
  Calculator,
  Menu,
  X,
  LogOut,
  ChevronLeft,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
  { label: "Órdenes", href: "/orders", icon: <ClipboardList size={18} /> },
  { label: "Empresas", href: "/companies", icon: <Building2 size={18} /> },
  { label: "Clientes", href: "/customers", icon: <Users size={18} /> },
  { label: "Vehículos", href: "/vehicles", icon: <Truck size={18} /> },
  { label: "Diagnósticos", href: "/diagnostics", icon: <Stethoscope size={18} /> },
  { label: "Cotizador", href: "/quoter", icon: <Calculator size={18} />, roles: ["admin", "sales"] },
  { label: "Archivos ECU", href: "/orders", icon: <HardDrive size={18} /> },
  { label: "Evidencia", href: "/orders", icon: <Camera size={18} /> },
  { label: "Reportes", href: "/orders", icon: <FileText size={18} /> },
  { label: "Usuarios", href: "/users", icon: <UserCog size={18} />, roles: ["admin"] },
];

interface SidebarProps {
  userName: string;
  userRole: string;
}

export function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-brand-border flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          {collapsed ? (
            <div className="w-8 h-8 bg-brand-accent rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-brand-dark font-bold text-sm">DT</span>
            </div>
          ) : (
            <img src="/logo-white.svg" alt="Ditrucks" className="h-7" />
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex p-1 text-brand-text-dim hover:text-brand-text transition-colors cursor-pointer"
        >
          <ChevronLeft size={16} className={cn("transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {filteredItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-brand-accent/10 text-brand-accent"
                  : "text-brand-text-muted hover:text-brand-text hover:bg-brand-surface2"
              )}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-brand-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-surface2 rounded-full flex items-center justify-center text-brand-text-muted text-xs font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-brand-text-dim capitalize">{userRole}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="p-1.5 text-brand-text-dim hover:text-red-400 transition-colors cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-brand-surface border border-brand-border rounded-lg text-brand-text-muted cursor-pointer"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-brand-dark border-r border-brand-border transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 p-1.5 text-brand-text-dim hover:text-brand-text cursor-pointer"
        >
          <X size={18} />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen sticky top-0 bg-brand-dark border-r border-brand-border transition-all duration-300",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
