"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { LayoutDashboard, Truck, ClipboardList, Award, Calculator, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CLIENT_ROLES } from "@/lib/constants";
import { useState } from "react";

const baseNavItems = [
  { label: "Dashboard", href: "/client/dashboard", icon: <LayoutDashboard size={18} /> },
  { label: "Vehículos", href: "/client/vehicles", icon: <Truck size={18} /> },
  { label: "Trabajos", href: "/client/orders", icon: <ClipboardList size={18} /> },
  { label: "Certificados", href: "/client/certificates", icon: <Award size={18} /> },
];

function ClientShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNav, setMobileNav] = useState(false);

  const navItems = user?.quoterEnabled
    ? [...baseNavItems, { label: "Cotizador", href: "/client/quoter", icon: <Calculator size={18} /> }]
    : baseNavItems;

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && !CLIENT_ROLES.includes(user.role) && user.role !== "admin") router.push("/dashboard");
  }, [user, loading, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin h-8 w-8 border-3 border-[#f6b31c] border-t-transparent rounded-full" />
    </div>
  );
  if (!user) return null;

  const handleLogout = async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link href="/client/dashboard" className="flex items-center gap-3">
            <img src="/logo-black.svg" alt="Ditrucks" className="h-6" />
            <span className="text-xs font-semibold text-[#f6b31c] tracking-wider uppercase hidden sm:block">Portal</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}
                className={cn("flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-[#f6b31c]/10 text-[#b8860b]"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")}>
                {item.icon} {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:block">{user.name}</span>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer" title="Cerrar sesión">
              <LogOut size={18} />
            </button>
            <button onClick={() => setMobileNav(!mobileNav)} className="md:hidden p-2 text-slate-500 cursor-pointer">
              {mobileNav ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileNav && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 py-2 space-y-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMobileNav(false)}
                className={cn("flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-[#f6b31c]/10 text-[#b8860b]"
                    : "text-slate-600 hover:bg-slate-50")}>
                {item.icon} {item.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <img src="/logo-black.svg" alt="Ditrucks" className="h-4 opacity-40" />
          <span className="text-xs text-slate-400">Diesel Truck Solutions</span>
        </div>
      </footer>
    </div>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider><ClientShell>{children}</ClientShell></AuthProvider>;
}
