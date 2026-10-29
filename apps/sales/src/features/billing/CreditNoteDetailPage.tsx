import { Link, useParams } from "react-router-dom";
import { documentName, formatDate, useAuth } from "@mkuyu/core";
import {
  useApproveCreditNote,
  useApproveCreditNoteFinance,
  useCreditNote,
  usePostCreditNote,
} from "@mkuyu/sales";
import type { InvoiceLine } from "@mkuyu/api";
import { useToast } from "../../components/Toast";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import {
  Badge,
  BackButton,
  Button,
  Card,
  CardHeader,
  DetailList,
  DetailRow,
  ErrorState,
  Money,
  PageHeader,
  Spinner,
  StatusBadge,
} from "../../components/ui";

export function CreditNoteDetailPage() {
  const { creditNoteId = "" } = useParams();
  const { can } = useAuth();
  const { push } = useToast();
  const noteQuery = useCreditNote(creditNoteId);
  const approveNote = useApproveCreditNote();
  const approveNoteFinance = useApproveCreditNoteFinance();
  const postNote = usePostCreditNote();

  if (noteQuery.isLoading) return <Spinner label="Loading credit note…" />;
  if (noteQuery.isError || !noteQuery.data) {
    return <ErrorState message={noteQuery.error?.message || "Credit note not found."} onRetry={() => noteQuery.refetch()} />;
  }

  const note = noteQuery.data;
  const canApprove = can("approve_credit_notes") && note.state.code === "draft" && note.approval_required && !note.approval_director;
  const canApproveFinance = can("approve_finance") && note.state.code === "draft" && note.approval_required && !note.approval_finance;
  const canPost = can("post_credit_notes") && note.state.code === "draft" && note.approval_director && note.approval_finance;

  async function approve() {
    try {
      await approveNote.mutateAsync(note.id);
      push("Approved as Sales Director. Finance approval and posting are next.", "success");
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  async function approveFinance() {
    try {
      await approveNoteFinance.mutateAsync(note.id);
      push("Approved as Finance Head. The credit note can now be posted.", "success");
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  async function post() {
    try {
      await postNote.mutateAsync(note.id);
      push("Credit note posted. A fully credited invoice releases the unit.", "success");
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  const columns: Column<InvoiceLine>[] = [
    { header: "Item", primary: true, render: (line) => (<><div className="font-medium">{line.name}</div><div className="text-[11px] text-slate-400">{line.product?.name}</div></>) },
    { header: "Qty", align: "right", render: (line) => line.quantity },
    { header: "Unit price", align: "right", render: (line) => <Money value={line.price_unit} /> },
    { header: "Subtotal", align: "right", render: (line) => <Money value={line.subtotal} /> },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={documentName(note)}
        title={note.partner?.name || "Credit note"}
        description={`Draft customer credit note · ${formatDate(note.invoice_date)}`}
        actions={
          <>
            <BackButton label="Back to credit notes" />
            {canApprove && <Button onClick={approve} disabled={approveNote.isPending}>{approveNote.isPending ? "Approving…" : "Approve as Director"}</Button>}
            {canApproveFinance && <Button onClick={approveFinance} disabled={approveNoteFinance.isPending}>{approveNoteFinance.isPending ? "Approving…" : "Approve as Finance"}</Button>}
            {canPost && <Button variant="secondary" onClick={post} disabled={postNote.isPending}>{postNote.isPending ? "Posting…" : "Post credit note"}</Button>}
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <StatusBadge status={note.state.code} label={note.state.label} />
        <span className="text-base font-semibold text-slate-900"><Money value={note.amount_total} /></span>
        {note.reversed_entry && (
          <Link to={`/invoices/${note.reversed_entry.id}`} className="text-sm font-medium text-brand-700 hover:underline">
            Reverses {note.reversed_entry.name}
          </Link>
        )}
      </div>

      {note.approval_required && (
        <Card className="mb-5 border-amber-200 bg-amber-50/60 p-4 ring-amber-200">
          <p className="text-sm font-semibold text-slate-900">Approvals</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Badge tone={note.approval_director ? "success" : "warning"}>
              Sales Director: {note.approval_director ? `approved by ${note.approval_director.name}` : "waiting"}
            </Badge>
            <Badge tone={note.approval_finance ? "success" : "info"}>
              Finance Head: {note.approval_finance ? `approved by ${note.approval_finance.name}` : "waiting"}
            </Badge>
          </div>
          {note.state.code === "draft" && (
            <p className="mt-2 text-xs text-slate-600">
              Director and Finance Head approve in this workspace. Finance can post it here afterwards; a fully credited sale releases the unit.
            </p>
          )}
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Lines" />
          <ResponsiveTable columns={columns} rows={note.lines} rowKey={(line) => String(line.id)} emptyText="No lines." />
        </Card>
        <Card>
          <CardHeader title="Document" />
          <DetailList>
            <DetailRow label="Number" value={<span className="font-mono">{documentName(note)}</span>} />
            <DetailRow label="Invoice date" value={formatDate(note.invoice_date)} />
            <DetailRow label="State" value={<StatusBadge status={note.state.code} label={note.state.label} />} />
            <DetailRow label="Total" value={<Money value={note.amount_total} />} />
            <DetailRow label="Outstanding" value={<Money value={note.amount_residual} />} />
            <DetailRow label="Origin" value={note.origin || "—"} />
          </DetailList>
        </Card>
      </div>
    </div>
  );
}
