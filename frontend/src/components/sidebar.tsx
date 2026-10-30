"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

import { useAuth } from "@/components/auth-provider";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/asset-master", label: "Pipeline / Asset Master", icon: AssetMasterIcon },
  { href: "/external-corrosion-assessment", label: "External Corrosion Assessment", icon: ReportIcon },
  { href: "/internal-corrosion-assessment", label: "Internal Corrosion Assessment", icon: ReportIcon },
  { href: "/risk-assessment", label: "Risk Assessment", icon: RiskIcon },
  { href: "/ili-analysis", label: "ILI Analysis", icon: InspectionIcon },
  { href: "/defect-manager", label: "Defect Manager", icon: DefectIcon },
  { href: "/ai-predictions", label: "AI Predictions", icon: AiIcon },
  { href: "/integration-hub", label: "Integration Hub", icon: IntegrationIcon },
  { href: "/ecda-assessment", label: "ECDA Assessment", icon: RiskIcon },
  { href: "/cp-monitoring", label: "CP Monitoring", icon: CpIcon },
  { href: "/cp-engineering-gap-analysis", label: "CP Engineering & Design", icon: CpIcon },
  { href: "/document-upload", label: "Document Management", icon: UploadIcon },
  { href: "/scada", label: "SCADA", icon: ScadaIcon },
  { href: "/sensors", label: "Sensors", icon: SensorIcon },
  { href: "/report", label: "Reports & Analytics", icon: ReportIcon }
];

const navItemByHref = new Map(navItems.map((item) => [item.href, item]));
const dashboardItem = navItemByHref.get("/dashboard")!;

const navGroups = [
  {
    title: "Asset & Data Foundation",
    items: [
      navItemByHref.get("/asset-master")!,
      navItemByHref.get("/document-upload")!,
      navItemByHref.get("/integration-hub")!
    ]
  },
  {
    title: "Monitoring & Operations",
    items: [
      navItemByHref.get("/sensors")!,
      navItemByHref.get("/scada")!
    ]
  },
  {
    title: "Integrity Assessment",
    items: [
      navItemByHref.get("/external-corrosion-assessment")!,
      navItemByHref.get("/internal-corrosion-assessment")!,
      navItemByHref.get("/ecda-assessment")!,
      navItemByHref.get("/ili-analysis")!
    ]
  },
  {
    title: "Integrity Management",
    items: [
      navItemByHref.get("/defect-manager")!,
      navItemByHref.get("/risk-assessment")!,
      navItemByHref.get("/ai-predictions")!
    ]
  },
  {
    title: "Reporting & Output",
    items: [
      navItemByHref.get("/report")!
    ]
  }
];

const settingsItem = { href: "/settings", label: "Settings", icon: SettingsIcon };

const cathodicProtectionItems = [
  navItemByHref.get("/cp-monitoring")!,
  navItemByHref.get("/cp-engineering-gap-analysis")!
];

type SidebarProps = {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
};

export function Sidebar({ isCollapsed, onToggleCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navGroups.map((group) => [group.title, true]))
  );
  const [isCathodicProtectionOpen, setIsCathodicProtectionOpen] = useState(true);
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
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-200 bg-white/95 px-5 py-6 shadow-panel transition-[width,transform,padding] duration-300 lg:translate-x-0 ${isCollapsed ? "lg:w-20 lg:px-3" : "lg:w-72 lg:px-5"} ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="sidebar-scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
          <div className="mb-7">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <img
                  alt="Klinthru"
                  className={`h-12 w-auto transition-opacity ${isCollapsed ? "lg:hidden" : ""}`}
                  src="/klinthru-logo.png"
                />
                <img
                  alt="Klinthru"
                  className={`hidden h-8 w-auto ${isCollapsed ? "lg:block" : ""}`}
                  src="/klinthru-logo.png"
                />
              </div>
              <button
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slateblue-100 lg:flex"
                onClick={onToggleCollapsed}
                type="button"
              >
                <CollapseIcon collapsed={isCollapsed} />
              </button>
            </div>
            <p className={`mt-1 pl-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400 ${isCollapsed ? "lg:hidden" : ""}`}>Pipeline integrity platform</p>
          </div>

          <nav className="space-y-1" aria-label="Primary navigation">
            <SidebarNavLink item={dashboardItem} isActive={pathname === dashboardItem.href} isCollapsed={isCollapsed} onNavigate={() => setOpen(false)} />

            {navGroups.map((group) => {
              const isGroupOpen = openGroups[group.title] ?? true;
              const hasActiveItem = group.items.some((item) => pathname === item.href);

              return (
                <div className="pt-3" key={group.title}>
                  <button
                    aria-expanded={isGroupOpen}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 transition hover:text-slateblue-700 focus:outline-none focus:ring-4 focus:ring-slateblue-100 ${isCollapsed ? "lg:justify-center lg:px-0" : "justify-between"}`}
                    onClick={() => setOpenGroups((current) => ({ ...current, [group.title]: !isGroupOpen }))}
                    title={isCollapsed ? group.title : undefined}
                    type="button"
                  >
                    <span className={`${isCollapsed ? "lg:sr-only" : ""}`}>{group.title}</span>
                    <span className={`shrink-0 text-slate-400 transition ${hasActiveItem ? "text-slateblue-700" : ""} ${isGroupOpen ? "rotate-90" : ""} ${isCollapsed ? "lg:rotate-0" : ""}`}>
                      <ChevronIcon />
                    </span>
                  </button>

                  <div className={`mt-1 space-y-0.5 ${isGroupOpen || isCollapsed ? "" : "hidden"}`}>
                    {group.items.map((item) => (
                      <SidebarNavLink
                        item={item}
                        isActive={pathname === item.href}
                        isCollapsed={isCollapsed}
                        key={item.href}
                        onNavigate={() => setOpen(false)}
                      />
                    ))}
                    {group.title === "Monitoring & Operations" ? (
                      <CathodicProtectionSubmenu
                        isCollapsed={isCollapsed}
                        isOpen={isCathodicProtectionOpen}
                        onNavigate={() => setOpen(false)}
                        onToggle={() => setIsCathodicProtectionOpen((current) => !current)}
                        pathname={pathname}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}

            <div className="pt-2">
              <p className={`px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 ${isCollapsed ? "lg:sr-only" : ""}`}>Settings &amp; Administration</p>
              <SidebarNavLink item={settingsItem} isActive={pathname === settingsItem.href} isCollapsed={isCollapsed} onNavigate={() => setOpen(false)} />
            </div>
          </nav>

          <div className={`mt-10 rounded-3xl bg-slate-900 p-5 text-sm text-slate-200 ${isCollapsed ? "lg:hidden" : ""}`}>
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
            className={`pipeguard-sidebar-logout-button group relative flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500 bg-transparent px-4 py-3 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 ${isCollapsed ? "lg:px-0" : ""}`}
            onClick={() => {
              void handleLogout();
            }}
            type="button"
          >
            <svg aria-hidden="true" className="h-4 w-4 text-current" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            <span className={`${isCollapsed ? "lg:sr-only" : ""}`}>Logout</span>
            {isCollapsed ? <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border pipeguard-surface px-2 py-1 text-xs font-semibold text-slate-700 opacity-0 shadow-panel transition group-hover:opacity-100 lg:block">Logout</span> : null}
          </button>
        </div>
      </aside>
    </>
  );
}

type SidebarNavItem = (typeof navItems)[number];

function CathodicProtectionSubmenu({
  isCollapsed,
  isOpen,
  onNavigate,
  onToggle,
  pathname
}: {
  isCollapsed: boolean;
  isOpen: boolean;
  onNavigate: () => void;
  onToggle: () => void;
  pathname: string;
}) {
  const hasActiveItem = cathodicProtectionItems.some((item) => pathname === item.href);

  return (
    <div className="pt-1">
      <button
        aria-expanded={isOpen}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-semibold transition ${isCollapsed ? "lg:justify-center lg:px-0" : "justify-between"} ${hasActiveItem ? "bg-slateblue-50 text-slateblue-700" : "bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slateblue-700"}`}
        onClick={onToggle}
        title={isCollapsed ? "Cathodic Protection" : undefined}
        type="button"
      >
        <span className="flex min-w-0 items-center gap-3">
          <CpIcon />
          <span className={`${isCollapsed ? "lg:sr-only" : ""}`}>Cathodic Protection</span>
        </span>
        <span className={`shrink-0 text-slate-400 transition ${isOpen ? "rotate-90" : ""} ${isCollapsed ? "lg:rotate-0" : ""}`}>
          <ChevronIcon />
        </span>
      </button>

      <div className={`mt-1 space-y-0.5 border-l border-slate-200 pl-2 ${isOpen || isCollapsed ? "" : "hidden"}`}>
        {cathodicProtectionItems.map((item) => (
          <SidebarNavLink
            isActive={pathname === item.href}
            isCollapsed={isCollapsed}
            item={item}
            key={item.href}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

function SidebarNavLink({
  item,
  isActive,
  isCollapsed,
  onNavigate
}: {
  item: SidebarNavItem;
  isActive: boolean;
  isCollapsed: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      title={isCollapsed ? item.label : undefined}
      className={`group relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition ${isCollapsed ? "lg:justify-center lg:px-0" : ""} ${
        isActive
          ? "bg-slateblue-600 text-white shadow-sm"
          : "bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slateblue-700"
      }`}
      onClick={onNavigate}
    >
      <item.icon />
      <span className={`${isCollapsed ? "lg:sr-only" : ""}`}>{item.label}</span>
      {isCollapsed ? <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border pipeguard-surface px-2 py-1 text-xs font-semibold text-slate-700 opacity-0 shadow-panel transition group-hover:opacity-100 lg:block">{item.label}</span> : null}
    </Link>
  );
}


function SidebarIcon({ children }: { children: ReactNode }) {
  return <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-current" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">{children}</svg>;
}

function DashboardIcon() { return <SidebarIcon><path d="M4 5h6v6H4z" /><path d="M14 5h6v6h-6z" /><path d="M4 15h6v4H4z" /><path d="M14 15h6v4h-6z" /></SidebarIcon>; }
function AssetMasterIcon() { return <SidebarIcon><path d="M4 19V7l8-4 8 4v12" /><path d="M4 9h16" /><path d="M8 13h8" /><path d="M8 17h8" /></SidebarIcon>; }
function ReportIcon() { return <SidebarIcon><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v5h5" /><path d="M9 13h6" /><path d="M9 17h4" /></SidebarIcon>; }
function RiskIcon() { return <SidebarIcon><path d="M12 3l9 16H3z" /><path d="M12 9v4" /><path d="M12 17h.01" /></SidebarIcon>; }
function InspectionIcon() { return <SidebarIcon><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2" /><path d="M12 4v3" /><path d="M12 17v3" /></SidebarIcon>; }
function DefectIcon() { return <SidebarIcon><circle cx="11" cy="11" r="7" /><path d="M16 16l4 4" /><path d="M8 11h6" /></SidebarIcon>; }
function AiIcon() { return <SidebarIcon><path d="M12 3a7 7 0 1 0 7 7" /><path d="M19 3v5h-5" /><path d="M8 14l2-4 3 3 3-6" /></SidebarIcon>; }
export function IntegrationIcon() { return <SidebarIcon><path d="M8 7h8" /><path d="M8 17h8" /><circle cx="5" cy="7" r="2" /><circle cx="19" cy="7" r="2" /><circle cx="5" cy="17" r="2" /><circle cx="19" cy="17" r="2" /></SidebarIcon>; }
function CpIcon() { return <SidebarIcon><path d="M13 2L5 14h6l-1 8 9-13h-6z" /></SidebarIcon>; }
function UploadIcon() { return <SidebarIcon><path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M5 20h14" /></SidebarIcon>; }
function ScadaIcon() { return <SidebarIcon><path d="M3 12h4l2-6 4 12 2-6h6" /></SidebarIcon>; }
function SensorIcon() { return <SidebarIcon><circle cx="12" cy="12" r="3" /><path d="M12 2v3" /><path d="M12 19v3" /><path d="M2 12h3" /><path d="M19 12h3" /><path d="M4.9 4.9l2.1 2.1" /><path d="M17 17l2.1 2.1" /></SidebarIcon>; }
function SettingsIcon() { return <SidebarIcon><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-2.6v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6v-2.6h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L9 6.6l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V5h2.6v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v2.6h-.1a1.7 1.7 0 0 0-1.5 1Z" /></SidebarIcon>; }
function CollapseIcon({ collapsed }: { collapsed: boolean }) { return <SidebarIcon>{collapsed ? <path d="M9 6l6 6-6 6" /> : <path d="M15 6l-6 6 6 6" />}</SidebarIcon>; }
function ChevronIcon() { return <SidebarIcon><path d="M9 6l6 6-6 6" /></SidebarIcon>; }
