import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { documentName, formatDate, isoDate, useAuth } from "@mkuyu/core";
import {
  useCancelFinanceBill,
  useFinanceBill,
  useFinanceBillMeta,
  usePayFinanceBill,
  usePostFinanceBill,
} from "@mkuyu/sales";
import { useToast } from "../../components/Toast";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import {
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
  Select,
  Spinner,
  StatusBadge,
  Textarea,
} from "../../components/ui";
import type { FinanceBillLine } from "@mkuyu/api";

export function BillDetailPage() {
  const { billId = "" } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const { push } = useToast();
  const bill = useFinanceBill(billId);
  const meta = useFinanceBillMeta();
  const post = usePostFinanceBill();
  const cancel = useCancelFinanceBill();
  const pay = usePayFinanceBill();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(isoDate());
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentJournal, setPaymentJournal] = useState("");

  if (bill.isLoading) return <Spinner label="Loading vendor bill…" />;
  if (bill.isError || !bill.data) {
    return <ErrorState message={bill.error?.message || "Vendor bill not found."} onRetry={() => bill.refetch()} />;
  }

  const data = bill.data;
  const isDraft = data.state.code === "draft";
  const isPosted = data.state.code === "posted";
  const canPay = isPosted && Number(data.amount_residual.amount) > 0 && can("manage_finance");

  function openPayment() {
    setAmount(data.amount_residual.amount);
    setPaymentReference(data.reference || data.name);
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentJournal(String(meta.data?.payment_journals[0]?.id || ""));
    setPayOpen(true);
  }

  async function runPost() {
    try {
      await post.mutateAsync(data.id);
      push("Vendor bill posted.", "success");
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  async function runCancel() {
    try {
      await cancel.mutateAsync(data.id);
      push("Vendor bill cancelled.", "success");
      setConfirmCancel(false);
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  async function runPay() {
    try {
      await pay.mutateAsync({
        id: data.id,
        body: {
          amount,
          date: paymentDate,
          reference: paymentReference.trim(),
          journal_id: paymentJournal ? Number(paymentJournal) : undefined,
        },
      });
      push("Payment registered.", "success");
      setPayOpen(false);
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  const columns: Column<FinanceBillLine>[] = [
    {
      header: "Line",
      primary: true,
      render: (line) => (
        <>
          <div className="font-medium">{line.name}</div>
          <div className="text-[11px] text-slate-400">{line.account ? `${line.account.name}` : "No account"}</div>
        </>
      ),
    },
    { header: "Qty", align: "right", render: (line) => line.quantity },
    { header: "Unit price", align: "right", render: (line) => <Money value={line.price_unit} /> },
    { header: "Taxes", render: (line) => line.taxes.map((tax) => `${tax.name} ${tax.amount}%`).join(", ") || "—" },
    { header: "Subtotal", align: "right", render: (line) => <Money value={line.subtotal} /> },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={data.partner?.name || "Vendor bill"}
        title={documentName(data)}
        description={`${formatDate(data.invoice_date)} · due ${formatDate(data.due_date)} · ${data.reference || "no supplier reference"}`}
        actions={
          <>
            <BackButton label="Back to bills" />
            {isDraft && can("post_bills") && <Button onClick={runPost} disabled={post.isPending}>{post.isPending ? "Posting…" : "Post bill"}</Button>}
            {!isDraft && data.state.code !== "cancel" && can("post_bills") && <Button variant="secondary" onClick={() => setConfirmCancel(true)}>Cancel bill</Button>}
            {canPay && <Button onClick={openPayment}>Register payment</Button>}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Bill lines" subtitle={`${data.lines.length} line${data.lines.length === 1 ? "" : "s"}`} />
          <ResponsiveTable columns={columns} rows={data.lines} rowKey={(line) => String(line.id)} emptyText="This bill has no product lines." />
          <div className="flex justify-end gap-8 border-t border-slate-100 px-5 py-4 text-sm">
            <div><span className="text-slate-500">Total</span><div className="font-semibold"><Money value={data.amount_total} /></div></div>
            <div><span className="text-slate-500">Balance</span><div className="font-semibold"><Money value={data.amount_residual} /></div></div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Details" />
          <DetailList>
            <DetailRow label="Supplier" value={data.partner?.name} />
            <DetailRow label="State" value={<StatusBadge status={data.state.code} label={data.state.label} />} />
            <DetailRow label="Payment" value={<StatusBadge status={data.payment_state.code} label={data.payment_state.label} />} />
            <DetailRow label="Journal" value={data.journal?.name} />
            <DetailRow label="Reference" value={data.reference || "—"} />
            <DetailRow label="Bill date" value={formatDate(data.invoice_date)} />
            <DetailRow label="Due date" value={formatDate(data.due_date)} />
            <DetailRow label="Currency" value={data.currency} />
            {data.department && <DetailRow label="Department" value={data.department.name} />}
            {data.department_state && <DetailRow label="Department approval" value={<StatusBadge status={data.department_state} />} />}
          </DetailList>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this vendor bill?"
        description="The bill and its journal entry will be marked cancelled. This cannot be undone from the ERP."
        confirmLabel="Cancel bill"
        tone="danger"
        busy={cancel.isPending}
        onConfirm={runCancel}
        onClose={() => setConfirmCancel(false)}
      />

      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Register vendor payment"
        description={`Pay ${data.partner?.name || "supplier"} against ${documentName(data)}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayOpen(false)} disabled={pay.isPending}>Cancel</Button>
            <Button onClick={runPay} disabled={pay.isPending}>{pay.isPending ? "Paying…" : "Register payment"}</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount" required><Input type="number" min={0} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
          <Field label="Payment date"><Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></Field>
          <Field label="Pay from">
            <Select value={paymentJournal} onChange={(event) => setPaymentJournal(event.target.value)}>
              {(meta.data?.payment_journals ?? []).map((journal) => <option key={journal.id} value={journal.id}>{journal.name}</option>)}
            </Select>
          </Field>
          <div className="sm:col-span-2"><Field label="Reference"><Textarea value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} /></Field></div>
        </div>
      </Modal>
    </div>
  );
}
