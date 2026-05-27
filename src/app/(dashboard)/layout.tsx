"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Loading } from "@/components/ui";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-darker">
        <Loading />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-brand-darker">
      <Sidebar userName={user.name} userRole={user.role} />
      <main className="flex-1 overflow-auto">
        <div className="p-4 lg:p-6 max-w-[1400px] mx-auto pt-14 lg:pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
