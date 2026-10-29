import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { documentName, formatDate, useAuth } from "@mkuyu/core";
import {
  useApprovals,
  useApproveCreditNote,
  useApproveCreditNoteFinance,
  useApproveOrder,
  useApproveOrderFinance,
} from "@mkuyu/sales";
import type { InvoiceSummary, OrderSummary } from "@mkuyu/api";
import { useToast } from "../../components/Toast";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import { Button, Card, CardHeader, ErrorState, Money, PageHeader, Spinner, StatusBadge, Tabs } from "../../components/ui";

export function ApprovalsPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { push } = useToast();
  const approvals = useApprovals(true);
  const approveOrder = useApproveOrder();
  const approveOrderFinance = useApproveOrderFinance();
  const approveNote = useApproveCreditNote();
  const approveNoteFinance = useApproveCreditNoteFinance();
  const [tab, setTab] = useState(can("approve_discounts") ? "orders" : "finance_orders");

  if (approvals.isLoading) return <Spinner label="Loading approvals…" />;
  if (approvals.isError || !approvals.data) {
    return <ErrorState message={approvals.error?.message || "Could not load approvals."} onRetry={() => approvals.refetch()} />;
  }

  const data = {
    ...approvals.data,
    finance: approvals.data.finance ?? { orders: [], credit_notes: [] },
    awaiting_finance: approvals.data.awaiting_finance ?? { orders: [], credit_notes: [] },
  };
  const tabs = [
    ...(can("approve_discounts") ? [
      { value: "orders", label: "Director · orders", count: data.orders.length },
      { value: "credit_notes", label: "Director · credit notes", count: data.credit_notes.length },
    ] : []),
    ...(can("approve_finance") ? [
      { value: "finance_orders", label: "Finance · orders", count: data.finance.orders.length },
      { value: "finance_credit_notes", label: "Finance · credit notes", count: data.finance.credit_notes.length },
    ] : []),
    { value: "awaiting_finance", label: "Awaiting finance", count: data.awaiting_finance.orders.length + data.awaiting_finance.credit_notes.length },
  ];

  async function runOrder(order: OrderSummary, finance = false) {
    try {
      if (finance) {
        await approveOrderFinance.mutateAsync(order.id);
        push(`Finance approved ${order.name}. Sales can now confirm it.`, "success");
      } else {
        await approveOrder.mutateAsync(order.id);
        push(`Approved ${order.name}. Finance approval is next.`, "success");
      }
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  async function runNote(note: InvoiceSummary, finance = false) {
    try {
      if (finance) {
        await approveNoteFinance.mutateAsync(note.id);
        push(`Finance approved ${documentName(note)}. Finance can now post it.`, "success");
      } else {
        await approveNote.mutateAsync(note.id);
        push(`Approved ${documentName(note)}. Finance approval is next.`, "success");
      }
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  const orderColumns = (finance: boolean): Column<OrderSummary>[] => [
    {
      header: "Order",
      primary: true,
      render: (order) => (
        <>
          <div className="font-medium">{order.partner?.name || "—"}</div>
          <div className="text-[11px] text-slate-400">{order.name} · {order.unit?.unit_code}</div>
        </>
      ),
    },
    { header: "Requested by", render: (order) => order.salesperson?.name || "—" },
    { header: "Date", render: (order) => formatDate(order.date_order) },
    { header: "Total", align: "right", render: (order) => <Money value={order.amount_total} /> },
    {
      header: "Approvals",
      render: (order) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge status={order.approval_director ? "approved" : "waiting"} label={order.approval_director ? "Director approved" : "Director waiting"} />
          <StatusBadge status={order.approval_finance ? "approved" : "waiting"} label={order.approval_finance ? "Finance approved" : "Finance waiting"} />
        </div>
      ),
    },
    {
      header: "",
      align: "right",
      render: (order) => (
        <Button
          onClick={(event) => { event.stopPropagation(); runOrder(order, finance); }}
          disabled={finance ? approveOrderFinance.isPending : approveOrder.isPending}
        >
          {finance ? "Approve as Finance" : "Approve as Director"}
        </Button>
      ),
    },
  ];

  const noteColumns = (finance: boolean): Column<InvoiceSummary>[] => [
    {
      header: "Credit note",
      primary: true,
      render: (note) => (
        <>
          <div className="font-medium">{note.partner?.name || "—"}</div>
          <div className="text-[11px] text-slate-400">{documentName(note)}{note.origin ? ` · ${note.origin}` : ""}</div>
        </>
      ),
    },
    { header: "Invoice date", render: (note) => formatDate(note.invoice_date) },
    { header: "Total", align: "right", render: (note) => <Money value={note.amount_total} /> },
    { header: "State", render: (note) => <StatusBadge status={note.state.code} label={note.state.label} /> },
    {
      header: "",
      align: "right",
      render: (note) => (
        <Button
          onClick={(event) => { event.stopPropagation(); runNote(note, finance); }}
          disabled={finance ? approveNoteFinance.isPending : approveNote.isPending}
        >
          {finance ? "Approve as Finance" : "Approve as Director"}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Approvals"
        description="Director and Finance Head approvals for discounts, below-list prices and customer credit notes."
      />

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {(tab === "orders" || tab === "finance_orders") && (
        <Card>
          <CardHeader
            title={tab === "orders" ? "Orders waiting for the Sales Director" : "Orders waiting for the Finance Head"}
            subtitle={tab === "orders" ? "Approve the price; Finance approves next" : "Approve the price; sales can then confirm"}
          />
          <ResponsiveTable
            columns={orderColumns(tab === "finance_orders")}
            rows={tab === "orders" ? data.orders : data.finance.orders}
            rowKey={(order) => String(order.id)}
            onRowClick={(order) => navigate(`/orders/${order.id}`)}
            emptyText="No order needs your approval."
          />
        </Card>
      )}

      {(tab === "credit_notes" || tab === "finance_credit_notes") && (
        <Card>
          <CardHeader
            title={tab === "credit_notes" ? "Credit notes waiting for the Sales Director" : "Credit notes waiting for the Finance Head"}
            subtitle={tab === "credit_notes" ? "Approve; Finance approves and posts next" : "Approve; Finance posts after this"}
          />
          <ResponsiveTable
            columns={noteColumns(tab === "finance_credit_notes")}
            rows={tab === "credit_notes" ? data.credit_notes : data.finance.credit_notes}
            rowKey={(note) => String(note.id)}
            onRowClick={(note) => navigate(`/credit-notes/${note.id}`)}
            emptyText="No credit note needs your approval."
          />
        </Card>
      )}

      {tab === "awaiting_finance" && (
        <div className="space-y-5">
          <Card>
            <CardHeader title="Orders awaiting Finance" subtitle="Finance approves these on the order" />
            <ResponsiveTable
              columns={orderColumns(true).filter((column) => column.header !== "")}
              rows={data.awaiting_finance.orders}
              rowKey={(order) => String(order.id)}
              onRowClick={(order) => navigate(`/orders/${order.id}`)}
              emptyText="No order is waiting for Finance."
            />
          </Card>
          <Card>
            <CardHeader title="Credit notes awaiting Finance" subtitle="Finance approves and posts them" />
            <ResponsiveTable
              columns={noteColumns(true).filter((column) => column.header !== "")}
              rows={data.awaiting_finance.credit_notes}
              rowKey={(note) => String(note.id)}
              onRowClick={(note) => navigate(`/credit-notes/${note.id}`)}
              emptyText="No credit note is waiting for Finance."
            />
          </Card>
        </div>
      )}
    </div>
  );
}
