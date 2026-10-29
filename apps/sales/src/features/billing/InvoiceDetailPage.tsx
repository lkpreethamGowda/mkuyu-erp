import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { documentName, formatDate, useAuth } from "@mkuyu/core";
import { useCreateCreditNote, useInvoice, usePostInvoice, useRegisterPayment } from "@mkuyu/sales";
import { salesApi } from "@mkuyu/api";
import type { InvoiceLine } from "@mkuyu/api";
import { useToast } from "../../components/Toast";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import {
  BackButton,
  Button,
  Card,
  CardHeader,
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
  Textarea,
} from "../../components/ui";

export function InvoiceDetailPage() {
  const { invoiceId = "" } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const { push } = useToast();
  const invoiceQuery = useInvoice(invoiceId);
  const createCreditNote = useCreateCreditNote();
  const postInvoice = usePostInvoice();
  const registerPayment = useRegisterPayment();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentReference, setPaymentReference] = useState("");

  if (invoiceQuery.isLoading) return <Spinner label="Loading invoice…" />;
  if (invoiceQuery.isError || !invoiceQuery.data) {
    return <ErrorState message={invoiceQuery.error?.message || "Invoice not found."} onRetry={() => invoiceQuery.refetch()} />;
  }

  const invoice = invoiceQuery.data;
  const canCredit = can("create_credit_notes") && invoice.type === "out_invoice" && invoice.state.code === "posted";
  const canPost = can("post_invoices") && invoice.type !== "out_refund" && invoice.state.code === "draft";
  const canPay = can("register_payments") && invoice.type === "out_invoice" && invoice.state.code === "posted"
    && Number(invoice.amount_residual.amount) > 0;

  async function create() {
    try {
      const creditNote = await createCreditNote.mutateAsync({ invoiceId: invoice.id, reason, date });
      push(`Credit note ${creditNote.name || "draft"} created as a draft.`, "success");
      setOpen(false);
      navigate(`/credit-notes/${creditNote.id}`);
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  async function post() {
    try {
      await postInvoice.mutateAsync(invoice.id);
      push(`Invoice ${invoice.name || ""} posted.`.trim(), "success");
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  async function downloadPdf() {
    try {
      await salesApi.downloadCdlInvoice(invoice.id, documentName(invoice));
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  async function pay() {
    try {
      await registerPayment.mutateAsync({
        invoiceId: invoice.id,
        body: {
          amount: paymentAmount || invoice.amount_residual.amount,
          date: paymentDate,
          reference: paymentReference || undefined,
        },
      });
      push("Payment registered and reconciled.", "success");
      setPaymentOpen(false);
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  const columns: Column<InvoiceLine>[] = [
    { header: "Item", primary: true, render: (line) => (<><div className="font-medium">{line.name}</div><div className="text-[11px] text-slate-400">{line.product?.name}</div></>) },
    { header: "Qty", align: "right", render: (line) => line.quantity },
    { header: "Unit price", align: "right", render: (line) => <Money value={line.price_unit} /> },
    { header: "Discount", align: "right", render: (line) => `${line.discount || 0}%` },
    { header: "Subtotal", align: "right", render: (line) => <Money value={line.subtotal} /> },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={documentName(invoice)}
        title={invoice.partner?.name || "Invoice"}
        description={`${invoice.type === "out_refund" ? "Credit note" : "Customer invoice"} · ${formatDate(invoice.invoice_date)}`}
        actions={
          <>
            <BackButton label="Back to invoices" />
            {invoice.type === "out_invoice" && <Button variant="secondary" onClick={downloadPdf}>Download PDF</Button>}
            {canPost && <Button onClick={post} disabled={postInvoice.isPending}>{postInvoice.isPending ? "Posting…" : "Post invoice"}</Button>}
            {canPay && <Button variant="secondary" onClick={() => { setPaymentAmount(invoice.amount_residual.amount); setPaymentOpen(true); }}>Register payment</Button>}
            {canCredit && <Button variant="secondary" onClick={() => setOpen(true)}>Create credit note</Button>}
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <StatusBadge status={invoice.state.code} label={invoice.state.label} />
        <StatusBadge status={invoice.payment_state.code} label={invoice.payment_state.label} />
        <span className="text-base font-semibold text-slate-900"><Money value={invoice.amount_total} /></span>
        {invoice.origin && <span className="text-sm text-slate-500">· {invoice.origin}</span>}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Lines" subtitle="Before tax" />
          <ResponsiveTable columns={columns} rows={invoice.lines} rowKey={(line) => String(line.id)} emptyText="No lines." />
          <div className="border-t border-slate-100 px-5 py-4">
            <dl className="ml-auto max-w-xs space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Total</dt><dd className="font-semibold"><Money value={invoice.amount_total} /></dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Outstanding</dt><dd className="font-semibold"><Money value={invoice.amount_residual} /></dd></div>
            </dl>
          </div>
        </Card>

        <Card>
          <CardHeader title="Document" />
          <DetailList>
            <DetailRow label="Number" value={<span className="font-mono">{invoice.name}</span>} />
            <DetailRow label="Invoice date" value={formatDate(invoice.invoice_date)} />
            <DetailRow label="Due date" value={formatDate(invoice.due_date)} />
            <DetailRow label="State" value={<StatusBadge status={invoice.state.code} label={invoice.state.label} />} />
            <DetailRow label="Payment" value={<StatusBadge status={invoice.payment_state.code} label={invoice.payment_state.label} />} />
            <DetailRow label="Origin" value={invoice.origin || "—"} />
            {invoice.reversed_entry && (
              <DetailRow label="Reverses" value={<Link className="text-brand-700 hover:underline" to={`/invoices/${invoice.reversed_entry.id}`}>{invoice.reversed_entry.name}</Link>} />
            )}
          </DetailList>
        </Card>
      </div>

      <Modal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="Register a payment"
        description={`${invoice.name || "Invoice"} · outstanding ${invoice.amount_residual.amount} ${invoice.amount_residual.currency}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaymentOpen(false)} disabled={registerPayment.isPending}>Cancel</Button>
            <Button onClick={pay} disabled={registerPayment.isPending}>{registerPayment.isPending ? "Registering…" : "Register payment"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={`Amount (${invoice.amount_residual.currency})`}>
            <Input type="number" min={0.01} step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} />
          </Field>
          <Field label="Payment date">
            <Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
          </Field>
          <Field label="Reference">
            <Input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Optional bank/mobile reference" />
          </Field>
        </div>
      </Modal>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create a credit note"
        description={`Full reversal of ${invoice.name}. It will be a draft that needs Sales Director and Finance Head approval.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={createCreditNote.isPending}>Cancel</Button>
            <Button onClick={create} disabled={createCreditNote.isPending}>{createCreditNote.isPending ? "Creating…" : "Create credit note"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Reason">
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why is this invoice being credited?" />
          </Field>
          <Field label="Credit note date">
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
