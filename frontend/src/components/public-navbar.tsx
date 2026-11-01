"use client";

import Link from "next/link";
import { useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";

const navigationItems = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Features", href: "/features" },
  { label: "Modules", href: "/modules" },
  { label: "Contact Us", href: "/contact" }
];

const navigationLinkClasses =
  "rounded-full px-1 py-1 text-base font-medium text-slate-600 outline-none transition hover:text-cyan-600 focus-visible:text-cyan-600 focus-visible:ring-4 focus-visible:ring-cyan-500/20 dark:text-slate-300 dark:hover:text-cyan-300 dark:focus-visible:text-cyan-300 lg:text-lg";

export function PublicNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 py-4">
          <Link
            href="/"
            className="inline-flex rounded-sm outline-none transition focus-visible:ring-4 focus-visible:ring-cyan-500/20"
          >
            <img
              alt="Klinthru"
              className="h-10 w-auto"
              src="/klinthru-logo.png"
            />
          </Link>

          <nav aria-label="Public navigation" className="hidden items-center gap-6 md:flex">
            {navigationItems.map((item) => (
              <Link key={item.href} className={navigationLinkClasses} href={item.href}>
                {item.label}
              </Link>
            ))}
            <Link className={navigationLinkClasses} href="/login">
              Login
            </Link>
            <Link
              className="rounded-full bg-slateblue-600 px-4 py-2 text-base font-semibold text-white shadow-sm outline-none transition hover:bg-slateblue-600 focus-visible:ring-4 focus-visible:ring-slateblue-100 lg:text-lg"
              href="/signup"
            >
              Sign Up
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              aria-controls="public-mobile-navigation"
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 md:hidden"
              onClick={() => setIsMenuOpen((current) => !current)}
              type="button"
            >
              {isMenuOpen ? (
                <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              ) : (
                <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {isMenuOpen ? (
          <nav
            aria-label="Mobile public navigation"
            className="grid gap-1 border-t border-slate-200 py-3 dark:border-slate-800 md:hidden"
            id="public-mobile-navigation"
          >
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 outline-none transition hover:bg-slate-50 hover:text-cyan-600 focus-visible:ring-4 focus-visible:ring-cyan-500/20 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-cyan-300"
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 outline-none transition hover:bg-slate-50 hover:text-cyan-600 focus-visible:ring-4 focus-visible:ring-cyan-500/20 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-cyan-300"
              href="/login"
              onClick={() => setIsMenuOpen(false)}
            >
              Login
            </Link>
            <Link
              className="rounded-xl bg-slateblue-600 px-3 py-2.5 text-sm font-semibold text-white outline-none transition hover:bg-slateblue-600 focus-visible:ring-4 focus-visible:ring-slateblue-100"
              href="/signup"
              onClick={() => setIsMenuOpen(false)}
            >
              Sign Up
            </Link>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
