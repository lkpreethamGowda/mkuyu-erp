import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { documentName, formatDate } from "@mkuyu/core";
import { useCreditNotes } from "@mkuyu/sales";
import type { InvoiceSummary } from "@mkuyu/api";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import { Badge, Button, Card, ErrorState, Field, FilterBar, Money, PageHeader, Pagination, SearchInput, Spinner, StatusBadge } from "../../components/ui";

function approvalBadge(note: InvoiceSummary) {
  if (!note.approval_required) return <span className="text-slate-400">—</span>;
  if (!note.approval_director) return <Badge tone="warning">Needs Director</Badge>;
  if (!note.approval_finance) return <Badge tone="info">Needs Finance</Badge>;
  return <Badge tone="success">Approved</Badge>;
}

export function CreditNotesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const notes = useCreditNotes({ search: applied || undefined, page, limit: 25 });

  const columns: Column<InvoiceSummary>[] = [
    {
      header: "Credit note",
      primary: true,
      render: (note) => (
        <>
          <div className="font-medium text-slate-900">{note.partner?.name || "—"}</div>
          <div className="font-mono text-[11px] text-slate-400">{documentName(note)}{note.origin ? ` · ${note.origin}` : ""}</div>
        </>
      ),
    },
    { header: "Date", render: (note) => formatDate(note.invoice_date) },
    { header: "Total", align: "right", render: (note) => <Money value={note.amount_total} /> },
    { header: "State", render: (note) => <StatusBadge status={note.state.code} label={note.state.label} /> },
    { header: "Approval", render: (note) => approvalBadge(note) },
  ];

  return (
    <div>
      <PageHeader
        title="Credit notes"
        description="Created by the Sales Manager, approved by the Sales Director, posted by Finance in Odoo."
      />
      <FilterBar>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => { event.preventDefault(); setPage(1); setApplied(search.trim()); }}
        >
          <div className="flex-1 sm:max-w-md">
            <Field label="Search"><SearchInput value={search} onChange={setSearch} placeholder="Credit note, buyer or invoice" /></Field>
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>
      </FilterBar>

      {notes.isError && <ErrorState message={notes.error?.message || "Could not load credit notes."} onRetry={() => notes.refetch()} />}
      {notes.isLoading ? (
        <Spinner />
      ) : (
        <Card>
          <ResponsiveTable
            columns={columns}
            rows={notes.data?.data ?? []}
            rowKey={(note) => String(note.id)}
            onRowClick={(note) => navigate(`/credit-notes/${note.id}`)}
            emptyText="No credit notes yet."
          />
          <Pagination meta={notes.data?.meta} onPage={setPage} />
        </Card>
      )}
    </div>
  );
}
