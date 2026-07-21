"use client";

import { ReactNode, useEffect } from "react";

import { usePathname, useRouter } from "next/navigation";

import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/components/auth-provider";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { authError, isAuthenticated, isReady } = useAuth();
  const isLoginRoute = pathname === "/login";
  const isPublicRoute = pathname === "/" || pathname === "/terms" || isLoginRoute;

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isAuthenticated && !authError && !isPublicRoute) {
      router.replace("/login");
      return;
    }

    if (isAuthenticated && isLoginRoute) {
      router.replace("/dashboard");
    }
  }, [authError, isAuthenticated, isLoginRoute, isPublicRoute, isReady, router]);

  if (isPublicRoute) {
    const publicBackground = isLoginRoute
      ? "bg-slate-100 bg-grid bg-[size:32px_32px]"
      : "bg-slate-50";

    return <div className={`min-h-screen ${publicBackground}`}>{children}</div>;
  }

  if (authError && !isLoginRoute) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 bg-grid bg-[size:32px_32px] px-6">
        <div className="max-w-md rounded-3xl border border-red-200 bg-white px-8 py-6 text-center shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-red-600">
            Backend offline
          </p>
          <p className="mt-3 text-sm text-slate-600">{authError}</p>
        </div>
      </div>
    );
  }

  if (!isReady || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 bg-grid bg-[size:32px_32px] px-6">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 text-center shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slateblue-600">
            Klinthru
          </p>
          <p className="mt-3 text-sm text-slate-500">Checking your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 bg-grid bg-[size:32px_32px] lg:h-screen lg:overflow-hidden">
      <Sidebar />
      <main className="lg:pl-72">
        <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 px-4 pb-6 pt-20 sm:px-6 lg:h-screen lg:overflow-y-auto lg:px-8 lg:pb-8 lg:pt-8 xl:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}
