"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/auth-provider";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/external-corrosion-assessment", label: "Ext. Corrosion Report" },
  { href: "/internal-corrosion-assessment", label: "Int. Corrosion Report" },
  { href: "/cp-dashboard", label: "CP Dashboard" },
  { href: "/sensors", label: "Sensors" },
  { href: "/report", label: "Report" }
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { logout, user } = useAuth();

  async function handleLogout() {
    setOpen(false);
    try {
      await logout();
    } finally {
      router.replace("/login");
    }
  }

  return (
    <>
      <button
        className="fixed right-4 top-4 z-40 rounded-full bg-slateblue-600 px-4 py-2 text-sm font-semibold text-white shadow-panel lg:hidden"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        Menu
      </button>

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-200 bg-white/95 px-6 py-8 shadow-panel transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slateblue-600">
              Pipeline Integrity
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              Klinthru
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Phase 1 corrosion screening dashboard with placeholder assessment logic and authenticated access.
            </p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-slateblue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slateblue-50 hover:text-slateblue-700"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-10 rounded-3xl bg-slate-900 p-5 text-sm text-slate-200">
            <p className="font-semibold text-white">{user?.name}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">{user?.role}</p>
            <p className="mt-3 leading-6 text-slate-300">
              Signed in as {user?.email}. Assessment and report pages require an active login.
            </p>
          </div>
        </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-5">
          <button
            className="w-full rounded-2xl border border-red-200 bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-100"
            onClick={() => {
              void handleLogout();
            }}
            type="button"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
