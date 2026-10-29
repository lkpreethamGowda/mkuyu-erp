import { useState } from "react";
import { useParams } from "react-router-dom";
import { documentName, formatDate, useAuth } from "@mkuyu/core";
import { useCancelJournalEntry, useJournalEntry, usePostJournalEntry } from "@mkuyu/sales";
import type { JournalEntryLine } from "@mkuyu/api";
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
  Money,
  PageHeader,
  Spinner,
  StatusBadge,
} from "../../components/ui";

export function JournalEntryDetailPage() {
  const { entryId = "" } = useParams();
  const { can } = useAuth();
  const { push } = useToast();
  const entry = useJournalEntry(entryId);
  const post = usePostJournalEntry();
  const cancel = useCancelJournalEntry();
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (entry.isLoading) return <Spinner label="Loading journal entry…" />;
  if (entry.isError || !entry.data) {
    return <ErrorState message={entry.error?.message || "Journal entry not found."} onRetry={() => entry.refetch()} />;
  }
  const data = entry.data;
  const isDraft = data.state.code === "draft";

  async function runPost() {
    try {
      await post.mutateAsync(data.id);
      push("Journal entry posted.", "success");
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  async function runCancel() {
    try {
      await cancel.mutateAsync(data.id);
      push("Journal entry cancelled.", "success");
      setConfirmCancel(false);
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  const columns: Column<JournalEntryLine>[] = [
    {
      header: "Line",
      primary: true,
      render: (line) => (
        <>
          <div className="font-medium">{line.account?.name || "—"}</div>
          <div className="text-[11px] text-slate-400">{line.name}</div>
        </>
      ),
    },
    { header: "Partner", render: (line) => line.partner?.name || "—" },
    { header: "Debit", align: "right", render: (line) => <Money value={line.debit} /> },
    { header: "Credit", align: "right", render: (line) => <Money value={line.credit} /> },
  ];

  const totals = data.lines.reduce((sum, line) => ({
    debit: sum.debit + Number(line.debit.amount),
    credit: sum.credit + Number(line.credit.amount),
  }), { debit: 0, credit: 0 });

  return (
    <div>
      <PageHeader
        eyebrow="Journal entry"
        title={documentName(data)}
        description={[formatDate(data.invoice_date), data.journal?.name, data.reference].filter(Boolean).join(" · ")}
        actions={
          <>
            <BackButton label="Back to entries" />
            {isDraft && can("manage_journal") && <Button onClick={runPost} disabled={post.isPending}>{post.isPending ? "Posting…" : "Post entry"}</Button>}
            {data.state.code === "posted" && can("manage_journal") && <Button variant="secondary" onClick={() => setConfirmCancel(true)}>Cancel entry</Button>}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Lines" subtitle={`${data.lines.length} journal items`} />
          <ResponsiveTable columns={columns} rows={data.lines} rowKey={(line) => String(line.id)} emptyText="No lines." />
          <div className="flex justify-end gap-8 border-t border-slate-100 px-5 py-4 text-sm">
            <div><span className="text-slate-500">Debit</span><div className="font-semibold tabular-nums">{totals.debit.toFixed(2)}</div></div>
            <div><span className="text-slate-500">Credit</span><div className="font-semibold tabular-nums">{totals.credit.toFixed(2)}</div></div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Details" />
          <DetailList>
            <DetailRow label="State" value={<StatusBadge status={data.state.code} label={data.state.label} />} />
            <DetailRow label="Journal" value={data.journal?.name} />
            <DetailRow label="Date" value={formatDate(data.invoice_date)} />
            <DetailRow label="Reference" value={data.reference || "—"} />
            <DetailRow label="Currency" value={data.currency} />
          </DetailList>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this journal entry?"
        description="The entry will be marked cancelled. This is usually only done for manual entries."
        confirmLabel="Cancel entry"
        tone="danger"
        busy={cancel.isPending}
        onConfirm={runCancel}
        onClose={() => setConfirmCancel(false)}
      />
    </div>
  );
}
