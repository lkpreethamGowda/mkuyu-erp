import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDate, useAuth } from "@mkuyu/core";
import { useOrders } from "@mkuyu/sales";
import type { OrderSummary } from "@mkuyu/api";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import { Badge, Button, Card, ErrorState, Field, FilterBar, Money, PageHeader, Pagination, SearchInput, Spinner, StatusBadge, Tabs } from "../../components/ui";

const TABS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "sale", label: "Confirmed" },
  { value: "cancel", label: "Cancelled" },
];

function approvalLabel(order: OrderSummary) {
  if (!order.approval_required) return null;
  if (!order.approval_director) return <Badge tone="warning">Needs Director</Badge>;
  if (!order.approval_finance) return <Badge tone="info">Needs Finance (Odoo)</Badge>;
  return <Badge tone="success">Approved</Badge>;
}

export function OrdersPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [tab, setTab] = useState("");
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const orders = useOrders({ state: tab || undefined, search: applied || undefined, page, limit: 25, sort: "newest" });

  const columns: Column<OrderSummary>[] = [
    {
      header: "Order",
      primary: true,
      render: (order) => (
        <>
          <div className="font-medium text-slate-900">{order.partner?.name || "—"}</div>
          <div className="text-[11px] text-slate-400">{order.name} · {order.unit?.unit_code || "No unit"}</div>
        </>
      ),
    },
    { header: "State", render: (order) => <StatusBadge status={order.state.code} label={order.state.label} /> },
    { header: "Approval", render: (order) => approvalLabel(order) || <span className="text-slate-400">—</span> },
    { header: "Payment", render: (order) => order.payment_type === "down_payment" ? "Down payment" : order.payment_type === "installments" ? "Installments" : "Full payment" },
    { header: "Total", align: "right", render: (order) => <Money value={order.amount_total} /> },
    { header: "Date", render: (order) => formatDate(order.date_order) },
    { header: "Salesperson", render: (order) => order.salesperson?.name || "—" },
  ];

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Quotations and confirmed sales, with the approvals that still block them."
        actions={can("create_orders") ? <Button onClick={() => navigate("/orders/new")}>New quotation</Button> : undefined}
      />

      <Tabs tabs={TABS} value={tab} onChange={(value) => { setTab(value); setPage(1); }} />

      <FilterBar>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => { event.preventDefault(); setPage(1); setApplied(search.trim()); }}
        >
          <div className="flex-1 sm:max-w-md">
            <Field label="Search">
              <SearchInput value={search} onChange={setSearch} placeholder="Order, buyer or unit code" />
            </Field>
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>
      </FilterBar>

      {orders.isError && <ErrorState message={orders.error?.message || "Could not load orders."} onRetry={() => orders.refetch()} />}
      {orders.isLoading ? (
        <Spinner />
      ) : (
        <Card>
          <ResponsiveTable
            columns={columns}
            rows={orders.data?.data ?? []}
            rowKey={(order) => String(order.id)}
            onRowClick={(order) => navigate(`/orders/${order.id}`)}
            emptyText="No orders in this view."
          />
          <Pagination meta={orders.data?.meta} onPage={setPage} />
        </Card>
      )}
    </div>
  );
}
