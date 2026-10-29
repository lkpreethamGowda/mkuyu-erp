import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  BookOpen,
  Building2,
  Calculator,
  ClipboardCheck,
  Coins,
  FileText,
  Landmark,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings2,
  ShieldCheck,
  TriangleAlert,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";
import { useAuth } from "@mkuyu/core";
import type { SalesPermission } from "@mkuyu/api";
import { Button, Select, cn } from "../components/ui";
import { roleLabel } from "../lib/roles";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: SalesPermission;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  { label: "Workspace", items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "view_dashboard" }] },
  {
    label: "Inventory",
    items: [
      { to: "/inventory/units", label: "Units", icon: Warehouse, permission: "view_units" },
      { to: "/inventory/sites", label: "Sites", icon: Building2, permission: "view_units" },
      { to: "/inventory/buildings", label: "Buildings", icon: Building2, permission: "view_units" },
      { to: "/catalog", label: "Catalog", icon: Settings2, permission: "view_catalog" },
    ],
  },
  {
    label: "Sales",
    items: [
      { to: "/orders", label: "Orders", icon: FileText, permission: "view_orders" },
      { to: "/crm", label: "CRM", icon: Users, permission: "view_crm" },
      { to: "/approvals", label: "Approvals", icon: ClipboardCheck, permission: "view_approvals" },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/invoices", label: "Invoices", icon: ReceiptText, permission: "view_invoices" },
      { to: "/payments", label: "Payments", icon: Wallet, permission: "view_payments" },
      { to: "/credit-notes", label: "Credit notes", icon: ShieldCheck, permission: "view_invoices" },
    ],
  },
  {
    label: "Accounting",
    items: [
      { to: "/finance", label: "Overview", icon: Landmark, permission: "view_finance" },
      { to: "/finance/bills", label: "Vendor bills", icon: FileText, permission: "view_finance" },
      { to: "/finance/journals", label: "Journal entries", icon: BookOpen, permission: "view_finance" },
      { to: "/finance/bank", label: "Bank reconciliation", icon: Building2, permission: "view_finance" },
      { to: "/finance/cash", label: "Cash sessions", icon: Coins, permission: "view_cash" },
      { to: "/finance/reports", label: "Financial reports", icon: Calculator, permission: "view_finance_reports" },
      { to: "/finance/config", label: "Configuration", icon: Settings2, permission: "view_finance" },
    ],
  },
  {
    label: "Collections",
    items: [
      { to: "/collections/dashboard", label: "Dashboard", icon: BarChart3, permission: "view_collections" },
      { to: "/collections/clients", label: "Clients", icon: Users, permission: "view_collections" },
      { to: "/collections/overdue", label: "Overdue", icon: TriangleAlert, permission: "view_collections" },
      { to: "/collections/payment-proofs", label: "Payment proofs", icon: ReceiptText, permission: "view_payment_proofs" },
      { to: "/collections/requests", label: "Client requests", icon: Users, permission: "view_client_requests" },
    ],
  },
  { label: "Department", items: [{ to: "/department", label: "AP approvals", icon: ShieldCheck, permission: "view_department" }] },
  { label: "Contacts", items: [{ to: "/buyers", label: "Buyers", icon: Users, permission: "view_buyers" }] },
  { label: "Insights", items: [{ to: "/reports", label: "Reports", icon: BarChart3, permission: "view_reports" }] },
];

function filteredNav(can: (permission: SalesPermission) => boolean): NavGroup[] {
  return NAV
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.permission || can(item.permission)) }))
    .filter((group) => group.items.length > 0);
}

export function SalesLayout() {
  const { session, can, logout, setActiveCompany } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(true);

  const nav = filteredNav(can);
  const mobileCandidates = [
    { to: "/dashboard", label: "Home", icon: LayoutDashboard, permission: "view_dashboard" as const },
    { to: "/orders", label: "Orders", icon: FileText, permission: "view_orders" as const },
    { to: "/invoices", label: "Invoices", icon: ReceiptText, permission: "view_invoices" as const },
    { to: "/inventory/units", label: "Units", icon: Warehouse, permission: "view_units" as const },
    { to: "/collections/overdue", label: "Overdue", icon: TriangleAlert, permission: "view_collections" as const },
    { to: "/buyers", label: "Buyers", icon: Users, permission: "view_buyers" as const },
    { to: "/department", label: "Department", icon: ShieldCheck, permission: "view_department" as const },
    { to: "/reports", label: "Reports", icon: BarChart3, permission: "view_reports" as const },
  ];
  const mobileNav = mobileCandidates.filter((item) => can(item.permission)).slice(0, 4);

  async function handleLogout() {
    await logout();
    queryClient.clear();
    navigate("/login", { replace: true });
  }

  function switchCompany(companyId: number) {
    setActiveCompany(companyId);
    queryClient.clear();
  }

  return (
    <div className="min-h-screen bg-[#f4f6f5] text-slate-800">
      <div className="flex min-h-screen w-full">
        <aside
          onMouseEnter={() => setCollapsed(false)}
          onMouseLeave={() => setCollapsed(true)}
          onFocusCapture={() => setCollapsed(false)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setCollapsed(true);
          }}
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-200/80 bg-[#fbfcfb] transition-[width] duration-200 md:flex",
            collapsed ? "w-20" : "w-64 lg:w-72",
          )}
        >
          <div className={cn("flex h-20 items-center border-b border-slate-200/70", collapsed ? "justify-center px-3" : "gap-3 px-5")}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-sm">M</div>
              {!collapsed && (
                <div>
                  <div className="text-sm font-semibold leading-tight tracking-[-0.01em] text-slate-950">MKUYU</div>
                  <div className="mt-0.5 text-xs text-slate-500">ERP workspace</div>
                </div>
              )}
            </div>
          </div>

          <nav className={cn("flex-1 space-y-5 overflow-y-auto", collapsed ? "p-3" : "p-3.5")}>
            {!collapsed && session?.companies?.length ? (
              <div className="px-1">
                <label htmlFor="company-switch" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Company</label>
                <Select
                  id="company-switch"
                  value={session.activeCompanyId ?? ""}
                  onChange={(event) => switchCompany(Number(event.target.value))}
                  className="min-h-9 py-2 text-xs font-semibold"
                >
                  {session.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                </Select>
              </div>
            ) : null}

            {nav.map((group) => (
              <div key={group.label}>
                {!collapsed && <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{group.label}</p>}
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          "flex min-h-10 items-center rounded-xl py-2 text-sm font-medium transition-colors",
                          collapsed ? "justify-center px-2" : "gap-3 px-3.5",
                          isActive ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                        )
                      }
                    >
                      <item.icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className={cn("border-t border-slate-200/70", collapsed ? "p-3" : "p-4")}>
            {!collapsed && (
              <div className="px-1 pb-3">
                <div className="truncate text-sm font-semibold text-slate-900">{session?.name}</div>
                <div className="mt-0.5 text-xs text-slate-500">{roleLabel(session?.role)}</div>
              </div>
            )}
            <div className={cn("flex gap-2", collapsed && "flex-col")}>
              <NavLink
                to="/profile"
                title={collapsed ? "Profile" : undefined}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-9 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold ring-1 ring-inset ring-slate-300 transition-colors",
                    isActive ? "bg-slate-100 text-slate-900" : "bg-white text-slate-600 hover:bg-slate-50",
                  )
                }
              >
                <Settings2 className="h-4 w-4" aria-hidden="true" />
                {!collapsed && "Profile"}
              </NavLink>
              <Button variant="secondary" onClick={handleLogout} className={cn("flex-1", collapsed && "w-full")} title={collapsed ? "Sign out" : undefined} aria-label="Sign out">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {!collapsed && "Sign out"}
              </Button>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-md md:hidden">
            <div className="flex items-center justify-between gap-3">
              <button onClick={() => navigate("/dashboard")} className="flex min-w-0 items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">M</span>
                <span className="truncate text-sm font-semibold text-slate-950">ERP workspace</span>
              </button>
              <Button onClick={handleLogout} variant="ghost">Sign out</Button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Select
                aria-label="Company"
                value={session?.activeCompanyId ?? ""}
                onChange={(event) => switchCompany(Number(event.target.value))}
                className="min-h-9 py-1.5 text-xs font-semibold"
              >
                {session?.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
              </Select>
              <span className="shrink-0 text-xs text-slate-500">{roleLabel(session?.role)}</span>
            </div>
          </header>

          <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 sm:py-8 lg:px-10">
            <div className="mx-auto max-w-7xl">
              <Outlet />
            </div>
          </main>

          <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
            <div className="mx-auto flex max-w-lg items-center px-2 py-2">
              {mobileNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[10px] font-medium leading-none transition-colors",
                      isActive ? "bg-brand-50 text-brand-700" : "text-slate-500",
                    )
                  }
                >
                  <item.icon aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
