import { useNavigate } from "react-router-dom";
import { formatDate, formatMoneyList, useAuth } from "@mkuyu/core";
import { useDashboard } from "@mkuyu/sales";
import type { OrderSummary } from "@mkuyu/api";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import { Badge, Button, Card, CardHeader, ErrorState, Money, PageHeader, Spinner, Stat, StatusBadge } from "../../components/ui";
import { roleLabel } from "../../lib/roles";

export function DashboardPage() {
  const { session, can } = useAuth();
  const navigate = useNavigate();
  const dashboard = useDashboard();

  if (dashboard.isLoading) return <Spinner label="Loading the workspace…" />;
  if (dashboard.isError || !dashboard.data) {
    return <ErrorState message={dashboard.error?.message || "Could not load the dashboard."} onRetry={() => dashboard.refetch()} />;
  }

  const raw = dashboard.data;
  // Keep the workspace usable while an older API deployment is still being upgraded.
  const data = {
    ...raw,
    inventory: raw.inventory ?? {
      total: 0, available: 0, reserved: 0, sold: 0, handed_over: 0, value_available_by_currency: [],
    },
    orders: raw.orders ?? {
      draft: 0, sent: 0, confirmed: 0, cancelled: 0, this_month_count: 0, this_month_value_by_currency: [],
    },
    approvals: raw.approvals ?? { orders: 0, credit_notes: 0 },
    pending_finance: raw.pending_finance ?? { orders: 0, credit_notes: 0 },
    awaiting_finance: raw.awaiting_finance ?? { orders: 0, credit_notes: 0 },
    finance: raw.finance ?? {
      draft_invoices: 0, draft_value_by_currency: [], overdue_invoices: 0,
      overdue_value_by_currency: [], payments_this_month: 0, payments_value_by_currency: [],
    },
    my_orders: raw.my_orders ?? { count: 0, value_by_currency: [] },
    recent_orders: raw.recent_orders ?? [],
    units_by_site: raw.units_by_site ?? [],
  };
  const company = session?.companies.find((item) => item.id === session.activeCompanyId)?.name || "Company";
  const directorPending = data.approvals.orders + data.approvals.credit_notes;
  const financePending = data.pending_finance.orders + data.pending_finance.credit_notes;

  const orderColumns: Column<OrderSummary>[] = [
    {
      header: "Order",
      primary: true,
      render: (order) => (
        <>
          <div className="font-medium">{order.partner?.name || "—"}</div>
          <div className="text-xs font-normal text-slate-400">{order.name} · {order.unit?.unit_code}</div>
        </>
      ),
    },
    { header: "State", render: (order) => <StatusBadge status={order.state.code} label={order.state.label} /> },
    { header: "Total", align: "right", render: (order) => <Money value={order.amount_total} /> },
    { header: "Date", render: (order) => formatDate(order.date_order) },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={`${company} · ${roleLabel(session?.role)}`}
        title={`Good to see you, ${session?.name?.split(" ")[0] || "there"}`}
        description="A live view of sales, inventory, finance and collections from Odoo."
        actions={
          <>
            {can("create_orders") && <Button onClick={() => navigate("/orders/new")}>New quotation</Button>}
            {can("create_invoices") && <Button variant="secondary" onClick={() => navigate("/invoices")}>Invoices</Button>}
            {can("register_payments") && <Button variant="secondary" onClick={() => navigate("/payments")}>Payments</Button>}
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {can("view_units") && (
          <>
            <Stat label="Available units" value={data.inventory.available} tone="success" hint={`${data.inventory.total} total units`} />
            <Stat label="Reserved" value={data.inventory.reserved} tone="warning" hint={`${data.inventory.sold} sold · ${data.inventory.handed_over} handed over`} />
          </>
        )}
        {can("view_orders") && (
          <Stat label="Confirmed this month" value={data.orders.this_month_count} tone="info" hint={formatMoneyList(data.orders.this_month_value_by_currency)} />
        )}
        {can("view_finance_dashboard") && (
          <>
            <Stat label="Draft invoices" value={data.finance.draft_invoices} tone="warning" hint={formatMoneyList(data.finance.draft_value_by_currency)} />
            <Stat label="Overdue invoices" value={data.finance.overdue_invoices} tone={data.finance.overdue_invoices ? "danger" : "neutral"} hint={formatMoneyList(data.finance.overdue_value_by_currency)} />
            <Stat label="Payments this month" value={data.finance.payments_this_month} tone="success" hint={formatMoneyList(data.finance.payments_value_by_currency)} />
          </>
        )}
        {can("approve_discounts") && (
          <Stat label="Director approvals" value={directorPending} tone={directorPending ? "danger" : "neutral"} hint={`${data.awaiting_finance.orders + data.awaiting_finance.credit_notes} awaiting finance in Odoo`} />
        )}
        {can("approve_finance") && (
          <Stat label="Finance approvals" value={financePending} tone={financePending ? "danger" : "neutral"} hint="Orders and credit notes waiting for you" />
        )}
        {!can("view_units") && !can("view_orders") && !can("view_finance_dashboard") && !can("approve_discounts") && !can("approve_finance") && (
          <Stat label={roleLabel(session?.role)} value="Workspace" hint="Use the navigation for your role" />
        )}
      </div>

      {directorPending > 0 && can("approve_discounts") && (
        <Card className="mb-5 border border-amber-200 bg-amber-50/60 p-4 ring-amber-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">Approvals need the Sales Director</p>
              <p className="mt-0.5 text-xs text-amber-800">
                {data.approvals.orders} order{data.approvals.orders === 1 ? "" : "s"} · {data.approvals.credit_notes} credit note{data.approvals.credit_notes === 1 ? "" : "s"} waiting.
              </p>
            </div>
            <Button variant="secondary" onClick={() => navigate("/approvals")}>Open approvals</Button>
          </div>
        </Card>
      )}

      {financePending > 0 && can("approve_finance") && (
        <Card className="mb-5 border border-sky-200 bg-sky-50/60 p-4 ring-sky-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-sky-900">Approvals need the Finance Head</p>
              <p className="mt-0.5 text-xs text-sky-800">
                {data.pending_finance.orders} order{data.pending_finance.orders === 1 ? "" : "s"} · {data.pending_finance.credit_notes} credit note{data.pending_finance.credit_notes === 1 ? "" : "s"} waiting.
              </p>
            </div>
            <Button variant="secondary" onClick={() => navigate("/approvals")}>Open approvals</Button>
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {can("view_orders") ? (
          <Card className="lg:col-span-2">
            <CardHeader
              title="Recent orders"
              subtitle="Latest quotations and confirmed sales"
              actions={<Button variant="ghost" onClick={() => navigate("/orders")}>View all</Button>}
            />
            <ResponsiveTable
              columns={orderColumns}
              rows={data.recent_orders}
              rowKey={(order) => String(order.id)}
              onRowClick={(order) => navigate(`/orders/${order.id}`)}
              emptyText="No orders yet."
            />
          </Card>
        ) : (
          <Card className="lg:col-span-2">
            <CardHeader title="Your work" subtitle="Shortcuts for your role" />
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              {can("view_invoices") && <Button variant="secondary" onClick={() => navigate("/invoices")}>Open invoices</Button>}
              {can("view_payments") && <Button variant="secondary" onClick={() => navigate("/payments")}>Open payments</Button>}
              {can("view_units") && <Button variant="secondary" onClick={() => navigate("/inventory/units")}>Open units</Button>}
              {can("view_collections") && <Button variant="secondary" onClick={() => navigate("/collections/overdue")}>Open overdue list</Button>}
              {can("view_payment_proofs") && <Button variant="secondary" onClick={() => navigate("/collections/payment-proofs")}>Open payment proofs</Button>}
              {can("view_buyers") && <Button variant="secondary" onClick={() => navigate("/buyers")}>Open buyers</Button>}
            </div>
          </Card>
        )}

        {can("view_units") ? (
          <Card>
            <CardHeader title="Inventory by site" subtitle="Availability across the active company" />
            <div className="divide-y divide-slate-100">
              {data.units_by_site.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-400">No sites yet.</p>}
              {data.units_by_site.map((row) => (
                <div key={row.site.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{row.site.name}</p>
                      <p className="font-mono text-[11px] text-slate-400">{row.site.code}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{row.available}<span className="text-xs font-normal text-slate-400"> / {row.total}</span></span>
                  </div>
                  <div className="mt-2 flex gap-2 text-[11px]">
                    <Badge tone="success">{row.available} available</Badge>
                    <Badge tone="warning">{row.reserved} reserved</Badge>
                    <Badge tone="info">{row.sold} sold</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card>
            <CardHeader title="Finance" subtitle="Invoices and payments waiting in Odoo" />
            <div className="space-y-3 p-5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Draft invoices</span><span className="font-semibold">{data.finance.draft_invoices}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Overdue invoices</span><span className="font-semibold text-rose-600">{data.finance.overdue_invoices}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Payments this month</span><span className="font-semibold">{data.finance.payments_this_month}</span></div>
              <Button variant="secondary" className="w-full" onClick={() => navigate("/invoices")}>Open invoices</Button>
            </div>
          </Card>
        )}
      </div>

      {(can("view_units") || can("view_orders")) && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {can("view_units") && (
            <Card className="p-4">
              <p className="text-xs font-semibold text-slate-500">Value available</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{formatMoneyList(data.inventory.value_available_by_currency)}</p>
              <p className="mt-1 text-xs text-slate-500">List price of available units, by currency.</p>
            </Card>
          )}
          {can("view_orders") && (
            <>
              <Card className="p-4">
                <p className="text-xs font-semibold text-slate-500">My pipeline</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{data.my_orders.count} orders</p>
                <p className="mt-1 text-xs text-slate-500">{formatMoneyList(data.my_orders.value_by_currency)} confirmed.</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-semibold text-slate-500">Pipeline</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{data.orders.draft + data.orders.sent} open</p>
                <p className="mt-1 text-xs text-slate-500">{data.orders.confirmed} confirmed · {data.orders.cancelled} cancelled.</p>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
