import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { documentName, formatDate, formatDateTime, formatMoney, useAuth } from "@mkuyu/core";
import {
  useApproveOrder,
  useApproveOrderFinance,
  useCancelOrder,
  useConfirmOrder,
  useCreateInstallments,
  useCreateOrderInvoice,
  useInstallmentPreview,
  useOrder,
} from "@mkuyu/sales";
import type { InvoiceSummary, OrderLine } from "@mkuyu/api";
import { useToast } from "../../components/Toast";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import {
  Badge,
  BackButton,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DetailList,
  DetailRow,
  ErrorState,
  Field,
  Input,
  Modal,
  Money,
  PageHeader,
  Spinner,
  StatusBadge,
} from "../../components/ui";

function nextMonth(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
}

export function OrderDetailPage() {
  const { orderId = "" } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const { push } = useToast();
  const orderQuery = useOrder(orderId);
  const confirmOrder = useConfirmOrder();
  const cancelOrder = useCancelOrder();
  const approveOrder = useApproveOrder();
  const approveOrderFinance = useApproveOrderFinance();
  const createInvoice = useCreateOrderInvoice();
  const createInstallments = useCreateInstallments();
  const [pendingAction, setPendingAction] = useState<"confirm" | "cancel" | null>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [totalPrice, setTotalPrice] = useState("");
  const [installmentCount, setInstallmentCount] = useState("12");
  const [firstDate, setFirstDate] = useState(nextMonth());

  const order = orderQuery.data;
  const preview = useInstallmentPreview(
    order?.id,
    { total_price: totalPrice || undefined, installment_count: Number(installmentCount) || 1, first_date: firstDate },
    installOpen && Boolean(order),
  );

  useEffect(() => {
    if (installOpen && order?.unit) {
      setTotalPrice(order.unit.list_price.amount);
    }
  }, [installOpen, order?.id]);

  if (orderQuery.isLoading) return <Spinner label="Loading order…" />;
  if (orderQuery.isError || !order) {
    return <ErrorState message={orderQuery.error?.message || "Order not found."} onRetry={() => orderQuery.refetch()} />;
  }

  const editable = ["draft", "sent"].includes(order.state.code);
  const missingDirector = order.approval_required && !order.approval_director;
  const missingFinance = order.approval_required && !order.approval_finance;
  const canConfirm = editable && can("confirm_orders") && !missingDirector && !missingFinance;
  const canInstall = order.state.code === "sale" && order.payment_type === "down_payment" && !order.installments && can("create_installments");
  const canInvoice = order.state.code === "sale" && !order.subscription && can("create_invoices") && order.invoices.length === 0;
  const busy = confirmOrder.isPending || cancelOrder.isPending || approveOrder.isPending
    || approveOrderFinance.isPending || createInvoice.isPending;

  async function runAction() {
    try {
      if (pendingAction === "confirm") {
        await confirmOrder.mutateAsync(order!.id);
        push("Order confirmed. The unit is now sold.", "success");
      } else if (pendingAction === "cancel") {
        await cancelOrder.mutateAsync(order!.id);
        push("Order cancelled.", "success");
      }
      setPendingAction(null);
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  async function approve() {
    try {
      await approveOrder.mutateAsync(order!.id);
      push("Approved as Sales Director. Finance approval is next.", "success");
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  async function approveFinance() {
    try {
      await approveOrderFinance.mutateAsync(order!.id);
      push("Approved as Finance Head. The sales team can confirm the order.", "success");
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  async function invoiceOrder() {
    try {
      const result = await createInvoice.mutateAsync(order!.id);
      const first = result.invoices[0];
      push(first ? `Invoice ${first.name || "draft"} created.` : "Invoice created.", "success");
      if (first) navigate(`/invoices/${first.id}`);
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  async function install() {
    try {
      const result = await createInstallments.mutateAsync({
        orderId: order!.id,
        body: { total_price: totalPrice, installment_count: Number(installmentCount), first_date: firstDate },
      });
      push(result.subscription ? `Installments created on ${result.subscription.name}.` : "Installments created.", "success");
      setInstallOpen(false);
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  const lineColumns: Column<OrderLine>[] = [
    { header: "Item", primary: true, render: (line) => (<><div className="font-medium">{line.name}</div><div className="text-[11px] text-slate-400">{line.product?.name}</div></>) },
    { header: "Qty", align: "right", render: (line) => line.quantity },
    { header: "Unit price", align: "right", render: (line) => <Money value={line.price_unit} /> },
    { header: "Discount", align: "right", render: (line) => `${line.discount || 0}%` },
    { header: "Subtotal", align: "right", render: (line) => <Money value={line.subtotal} /> },
  ];

  const invoiceColumns: Column<InvoiceSummary>[] = [
    { header: "Document", primary: true, render: (invoice) => (<><div className="font-medium">{documentName(invoice)}</div><div className="text-[11px] text-slate-400">{formatDate(invoice.invoice_date)}</div></>) },
    { header: "State", render: (invoice) => <StatusBadge status={invoice.state.code} label={invoice.state.label} /> },
    { header: "Payment", render: (invoice) => <StatusBadge status={invoice.payment_state.code} label={invoice.payment_state.label} /> },
    { header: "Total", align: "right", render: (invoice) => <Money value={invoice.amount_total} /> },
    { header: "Balance", align: "right", render: (invoice) => <Money value={invoice.amount_residual} /> },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={`${order.name} · ${formatDate(order.date_order)}`}
        title={order.partner?.name || "Order"}
        description={order.unit ? `${order.unit.unit_code} · ${order.unit.name}` : "No unit linked"}
        actions={
          <>
            <BackButton label="Back to orders" />
            {editable && can("edit_orders") && <Button variant="secondary" onClick={() => navigate(`/orders/${order.id}/edit`)}>Edit</Button>}
            {editable && can("confirm_orders") && (
              <Button onClick={() => setPendingAction("confirm")} disabled={!canConfirm || busy} title={!canConfirm ? "Approvals are missing" : undefined}>Confirm</Button>
            )}
            {missingDirector && can("approve_discounts") && (
              <Button onClick={approve} disabled={busy}>{approveOrder.isPending ? "Approving…" : "Approve as Director"}</Button>
            )}
            {missingFinance && can("approve_finance") && (
              <Button onClick={approveFinance} disabled={busy}>{approveOrderFinance.isPending ? "Approving…" : "Approve as Finance"}</Button>
            )}
            {canInvoice && (
              <Button variant="secondary" onClick={invoiceOrder} disabled={busy}>{createInvoice.isPending ? "Creating…" : "Create invoice"}</Button>
            )}
            {canInstall && <Button variant="secondary" onClick={() => setInstallOpen(true)}>Create installments</Button>}
            {["draft", "sent", "sale"].includes(order.state.code) && can("edit_orders") && (
              <Button variant="ghost" onClick={() => setPendingAction("cancel")}>Cancel</Button>
            )}
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <StatusBadge status={order.state.code} label={order.state.label} />
        <span className="text-sm text-slate-500">·</span>
        <span className="text-sm text-slate-600">{order.payment_type === "down_payment" ? "Down payment" : order.payment_type === "installments" ? "Installments" : "Full payment"}</span>
        <span className="text-sm text-slate-500">·</span>
        <span className="text-base font-semibold text-slate-900"><Money value={order.amount_total} /></span>
      </div>

      {order.approval_required && (
        <Card className={`mb-5 p-4 ${missingDirector || missingFinance ? "border-amber-200 bg-amber-50/60 ring-amber-200" : "border-emerald-200 bg-emerald-50/60 ring-emerald-200"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Approvals for this price</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <Badge tone={order.approval_director ? "success" : "warning"}>
                  Sales Director: {order.approval_director ? `approved by ${order.approval_director.name}` : "waiting"}
                </Badge>
                <Badge tone={order.approval_finance ? "success" : "info"}>
                  Finance Head: {order.approval_finance ? `approved by ${order.approval_finance.name}` : "waiting"}
                </Badge>
              </div>
              {missingFinance && (
                <p className="mt-2 text-xs text-slate-600">
                  {can("approve_finance") ? "You can approve this order here." : "The Finance Head can approve this order in the ERP."}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Order lines" subtitle="Prices before tax" />
          <ResponsiveTable columns={lineColumns} rows={order.lines} rowKey={(line) => String(line.id)} emptyText="No lines." />
          <div className="border-t border-slate-100 px-5 py-4">
            <dl className="ml-auto max-w-xs space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Untaxed</dt><dd className="font-medium"><Money value={order.amount_untaxed} /></dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Tax</dt><dd className="font-medium"><Money value={order.amount_tax} /></dd></div>
              <div className="flex justify-between border-t border-slate-100 pt-2"><dt className="font-semibold text-slate-800">Total</dt><dd className="text-base font-semibold"><Money value={order.amount_total} /></dd></div>
            </dl>
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Buyer" />
            <DetailList>
              <DetailRow label="Name" value={order.partner ? <Link className="text-brand-700 hover:underline" to={`/buyers/${order.partner.id}`}>{order.partner.name}</Link> : "—"} />
              <DetailRow label="Phone" value={order.partner?.phone || "—"} />
              <DetailRow label="Customer ID" value={order.partner?.customer_id || "—"} />
            </DetailList>
          </Card>
          <Card>
            <CardHeader title="Unit" />
            <DetailList>
              <DetailRow label="Code" value={order.unit ? <Link className="font-mono text-brand-700 hover:underline" to={`/inventory/units/${order.unit.id}`}>{order.unit.unit_code}</Link> : "—"} />
              <DetailRow label="Name" value={order.unit?.name || "—"} />
              <DetailRow label="Site" value={order.unit?.site?.name || "—"} />
              <DetailRow label="Building" value={order.unit?.building?.name || "—"} />
              <DetailRow label="Status" value={order.unit ? <StatusBadge status={order.unit.status.code} label={order.unit.status.label} /> : "—"} />
            </DetailList>
          </Card>
          <Card>
            <CardHeader title="Details" />
            <DetailList>
              <DetailRow label="Salesperson" value={order.salesperson?.name || "—"} />
              <DetailRow label="Created" value={formatDateTime(order.date_order)} />
              <DetailRow label="Customer ref." value={order.client_order_ref || "—"} />
              <DetailRow label="Invoice status" value={<StatusBadge status={order.invoice_status.code} label={order.invoice_status.label} />} />
            </DetailList>
          </Card>
        </div>
      </div>

      {order.notes && (
        <Card className="mt-5">
          <CardHeader title="Notes" />
          <p className="whitespace-pre-wrap px-5 py-4 text-sm text-slate-700">{order.notes}</p>
        </Card>
      )}

      {order.installments && (
        <Card className="mt-5">
          <CardHeader title="Installment plan" subtitle="Created as a subscription in Odoo" actions={<Link className="text-sm font-medium text-brand-700 hover:underline" to={`/orders/${order.installments.id}`}>Open {order.installments.name}</Link>} />
          <DetailList>
            <DetailRow label="State" value={<StatusBadge status={order.installments.state.code} label={order.installments.state.label} />} />
            <DetailRow label="Installments" value={order.installments.count ?? "—"} />
            <DetailRow label="First date" value={formatDate(order.installments.first_date)} />
            <DetailRow label="Last date" value={formatDate(order.installments.end_date)} />
            <DetailRow label="Amount each" value={<Money value={order.installments.amount} />} />
          </DetailList>
        </Card>
      )}

      <Card className="mt-5">
        <CardHeader title="Invoices" subtitle="Customer invoices and credit notes linked to this order" />
        <ResponsiveTable
          columns={invoiceColumns}
          rows={order.invoices}
          rowKey={(invoice) => String(invoice.id)}
          onRowClick={(invoice) => navigate(invoice.type === "out_refund" ? `/credit-notes/${invoice.id}` : `/invoices/${invoice.id}`)}
          emptyText="No invoice has been raised for this order yet."
        />
      </Card>

      <ConfirmDialog
        open={pendingAction === "confirm"}
        title="Confirm this order?"
        description={`${order.name} will be confirmed and the unit marked as sold. This cannot be undone from here.`}
        confirmLabel="Confirm order"
        busy={busy}
        onConfirm={runAction}
        onClose={() => setPendingAction(null)}
      />
      <ConfirmDialog
        open={pendingAction === "cancel"}
        title="Cancel this order?"
        description="The unit is released if this order had marked it as sold."
        confirmLabel="Cancel order"
        tone="danger"
        busy={busy}
        onConfirm={runAction}
        onClose={() => setPendingAction(null)}
      />

      <Modal
        open={installOpen}
        onClose={() => setInstallOpen(false)}
        title="Create installments"
        description={`${order.name} · down payment ${formatMoney(order.amount_untaxed)}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setInstallOpen(false)} disabled={createInstallments.isPending}>Cancel</Button>
            <Button onClick={install} disabled={createInstallments.isPending || !preview.data}>{createInstallments.isPending ? "Creating…" : "Create installments"}</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Total unit price (${order.currency})`} hint="Defaults to the unit list price">
            <Input type="number" min={0} step="0.01" value={totalPrice} onChange={(event) => setTotalPrice(event.target.value)} />
          </Field>
          <Field label="Number of installments" hint="1 to 36">
            <Input type="number" min={1} max={36} value={installmentCount} onChange={(event) => setInstallmentCount(event.target.value)} />
          </Field>
          <Field label="First installment date">
            <Input type="date" value={firstDate} onChange={(event) => setFirstDate(event.target.value)} />
          </Field>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
          {preview.isLoading && <p className="text-slate-500">Calculating…</p>}
          {preview.isError && <p className="text-rose-600">{preview.error?.message}</p>}
          {preview.data && (
            <dl className="space-y-2">
              <div className="flex justify-between"><dt className="text-slate-500">Down payment</dt><dd><Money value={preview.data.down_payment} /></dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Balance</dt><dd><Money value={preview.data.balance} /></dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Each installment</dt><dd className="font-semibold"><Money value={preview.data.installment_amount} /></dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Last date</dt><dd>{formatDate(preview.data.end_date)}</dd></div>
              {preview.data.rounding_difference.amount !== "0.00" && (
                <div className="flex justify-between"><dt className="text-slate-500">Rounding difference</dt><dd><Money value={preview.data.rounding_difference} /></dd></div>
              )}
            </dl>
          )}
        </div>
      </Modal>
    </div>
  );
}
