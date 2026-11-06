"use client";

import { ReactNode, useEffect, useState } from "react";

import { usePathname, useRouter } from "next/navigation";

import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/components/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";

const PUBLIC_ROUTES = new Set([
  "/",
  "/about",
  "/features",
  "/modules",
  "/contact",
  "/privacy",
  "/terms",
  "/cookies",
  "/disclaimer",
  "/login",
  "/signup",
  "/subscription"
]);

const LOCAL_SUPER_ADMIN_PREVIEW_ROUTE = "/super-admin/demo";
const LOCAL_SUPER_ADMIN_LOGIN_ROUTE = "/super-admin/login";
const LOCAL_SUPER_ADMIN_MANAGEMENT_ROUTE = "/super-admin/manage";
const SUPER_ADMIN_MANAGEMENT_ROUTE = "/super-admin";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { authError, isAuthenticated, isReady } = useAuth();
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const isLoginRoute = pathname === "/login";
  const isSuperAdminLoginRoute = pathname === LOCAL_SUPER_ADMIN_LOGIN_ROUTE;
  const isSignupRoute = pathname === "/signup";
  const isLocalSuperAdminPreview = process.env.NODE_ENV === "development" && pathname === LOCAL_SUPER_ADMIN_PREVIEW_ROUTE;
  const isLocalSuperAdminMockManagement = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_SUPER_ADMIN_API_MODE === "mock" && pathname === LOCAL_SUPER_ADMIN_MANAGEMENT_ROUTE;
  const isPublicRoute = PUBLIC_ROUTES.has(pathname) || isLocalSuperAdminPreview || isSuperAdminLoginRoute;
  const isSuperAdminManagementRoute = pathname === SUPER_ADMIN_MANAGEMENT_ROUTE || pathname === LOCAL_SUPER_ADMIN_MANAGEMENT_ROUTE;
  const isDashboardRoute = pathname === "/dashboard";

  useEffect(() => {
    const savedState = window.localStorage.getItem("klinthru-sidebar-collapsed");
    if (savedState === "true") {
      setIsSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isAuthenticated && !authError && !isPublicRoute && !isSuperAdminManagementRoute) {
      router.replace(pathname === SUPER_ADMIN_MANAGEMENT_ROUTE || pathname === LOCAL_SUPER_ADMIN_MANAGEMENT_ROUTE ? LOCAL_SUPER_ADMIN_LOGIN_ROUTE : "/login");
      return;
    }

    if (isAuthenticated && (isLoginRoute || isSignupRoute)) {
      router.replace("/dashboard");
    }
  }, [authError, isAuthenticated, isLoginRoute, isPublicRoute, isReady, isSignupRoute, isSuperAdminManagementRoute, router]);

  if (pathname === SUPER_ADMIN_MANAGEMENT_ROUTE || pathname === LOCAL_SUPER_ADMIN_MANAGEMENT_ROUTE) {
    return <div className="min-h-screen">{children}</div>;
  }

  if (isPublicRoute) {
    const publicBackground = isLoginRoute || isSignupRoute || isSuperAdminLoginRoute
      ? "bg-slate-100 bg-grid bg-[size:32px_32px]"
      : "bg-slate-50";
    const isProtectedPreview = isLocalSuperAdminPreview || isSuperAdminLoginRoute;

    return <div className={`min-h-screen ${publicBackground} ${isProtectedPreview ? "" : "public-site"}`}>{children}</div>;
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
    <div className={`min-h-screen bg-slate-100 bg-grid bg-[size:32px_32px] lg:h-screen lg:overflow-hidden ${isDashboardRoute ? "pipeguard-dashboard-shell" : ""}`}>
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapsed={() => {
          setIsSidebarCollapsed((current) => {
            const next = !current;
            window.localStorage.setItem("klinthru-sidebar-collapsed", String(next));
            return next;
          });
        }}
      />
      <main className={`relative transition-[padding] duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-72"}`}>
        <div className="fixed right-20 top-4 z-50 flex items-center gap-2 lg:absolute lg:right-8 lg:top-6 xl:right-10">
          <ThemeToggle />

          <div className="relative">
            <button
              aria-expanded={notificationPanelOpen}
              aria-haspopup="dialog"
              aria-label="Notifications"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slateblue-100"
              onClick={() => setNotificationPanelOpen((open) => !open)}
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
            </button>

            {notificationPanelOpen ? (
              <div aria-label="Notification status" className="absolute right-0 mt-3 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-panel" role="dialog">
                <p className="text-sm font-semibold text-slate-900">Notifications</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">Notification service not configured.</p>
              </div>
            ) : null}
          </div>
        </div>
        <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 px-4 pb-6 pt-20 sm:px-6 lg:h-screen lg:overflow-y-auto lg:px-8 lg:pb-8 lg:pt-8 xl:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}
