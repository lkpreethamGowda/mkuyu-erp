import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { documentName, formatDate, isoDate, useAuth } from "@mkuyu/core";
import { useCreateJournalEntry, useJournalEntries, useJournalEntryMeta } from "@mkuyu/sales";
import type { InvoiceSummary } from "@mkuyu/api";
import { useToast } from "../../components/Toast";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import {
  Button,
  Card,
  ErrorState,
  Field,
  FilterBar,
  Input,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Spinner,
  StatusBadge,
} from "../../components/ui";

interface EntryLineForm {
  name: string;
  account_id: string;
  debit: string;
  credit: string;
}

const EMPTY_LINE: EntryLineForm = { name: "", account_id: "", debit: "", credit: "" };

export function JournalEntriesPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { push } = useToast();
  const meta = useJournalEntryMeta(can("manage_journal"));
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [state, setState] = useState("");
  const [page, setPage] = useState(1);
  const entries = useJournalEntries({ search: applied || undefined, state: state || undefined, page, limit: 25 });
  const createEntry = useCreateJournalEntry();
  const [open, setOpen] = useState(false);
  const [journalId, setJournalId] = useState("");
  const [entryDate, setEntryDate] = useState(isoDate());
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<EntryLineForm[]>([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);

  useEffect(() => {
    if (!open || !meta.data) return;
    setJournalId((current) => current || String(meta.data?.journals.find((journal) => journal.type === "general")?.id || meta.data?.journals[0]?.id || ""));
    setLines((current) => current.map((line) => line.account_id ? line : { ...line, account_id: String(meta.data?.accounts[0]?.id || "") }));
  }, [open, meta.data]);

  const totals = useMemo(() => lines.reduce((sum, line) => ({
    debit: sum.debit + (Number(line.debit) || 0),
    credit: sum.credit + (Number(line.credit) || 0),
  }), { debit: 0, credit: 0 }), [lines]);
  const balanced = Math.abs(totals.debit - totals.credit) < 0.005;

  function updateLine(index: number, patch: Partial<EntryLineForm>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  }

  async function save() {
    const payloadLines = lines
      .filter((line) => line.account_id && (Number(line.debit) || Number(line.credit)))
      .map((line) => ({
        name: line.name.trim() || "Journal entry",
        account_id: Number(line.account_id),
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
      }));
    if (payloadLines.length < 2) {
      push("Add at least two lines with an account and an amount.", "error");
      return;
    }
    if (!balanced) {
      push("Debits and credits must balance.", "error");
      return;
    }
    try {
      const entry = await createEntry.mutateAsync({
        journal_id: journalId ? Number(journalId) : undefined,
        date: entryDate,
        reference: reference.trim(),
        lines: payloadLines,
      });
      push(`Entry ${entry.name} created.`, "success");
      setOpen(false);
      setReference("");
      setLines([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
      navigate(`/finance/journals/${entry.id}`);
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  const columns: Column<InvoiceSummary>[] = [
    {
      header: "Entry",
      primary: true,
      render: (entry) => (
        <>
          <div className="font-medium text-slate-900">{documentName(entry)}</div>
          <div className="text-[11px] text-slate-400">{entry.origin || "Manual journal entry"}</div>
        </>
      ),
    },
    { header: "Date", render: (entry) => formatDate(entry.invoice_date) },
    { header: "State", render: (entry) => <StatusBadge status={entry.state.code} label={entry.state.label} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Journal entries"
        description="General ledger entries: create a balanced entry, post it, or cancel a draft."
        actions={can("manage_journal") ? <Button onClick={() => setOpen(true)}>New entry</Button> : undefined}
      />
      <FilterBar>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => { event.preventDefault(); setPage(1); setApplied(search.trim()); }}
        >
          <div className="flex-1 sm:max-w-md">
            <Field label="Search"><SearchInput value={search} onChange={setSearch} placeholder="Entry number or reference" /></Field>
          </div>
          <Field label="State">
            <Select value={state} onChange={(event) => { setState(event.target.value); setPage(1); }}>
              <option value="">All entries</option>
              <option value="draft">Draft</option>
              <option value="posted">Posted</option>
              <option value="cancel">Cancelled</option>
            </Select>
          </Field>
          <Button type="submit" variant="secondary">Search</Button>
        </form>
      </FilterBar>

      {entries.isError && <ErrorState message={entries.error?.message || "Could not load journal entries."} onRetry={() => entries.refetch()} />}
      {entries.isLoading ? (
        <Spinner />
      ) : (
        <Card>
          <ResponsiveTable
            columns={columns}
            rows={entries.data?.data ?? []}
            rowKey={(entry) => String(entry.id)}
            onRowClick={(entry) => navigate(`/finance/journals/${entry.id}`)}
            emptyText="No journal entry matches this view."
          />
          <Pagination meta={entries.data?.meta} onPage={setPage} />
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New journal entry"
        description="Saved as a draft. Debits and credits must balance before it can be posted."
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={createEntry.isPending}>Cancel</Button>
            <Button onClick={save} disabled={createEntry.isPending || !balanced}>{createEntry.isPending ? "Saving…" : "Save draft"}</Button>
          </>
        }
      >
        {meta.isLoading ? <Spinner /> : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Journal">
                <Select value={journalId} onChange={(event) => setJournalId(event.target.value)}>
                  {(meta.data?.journals ?? []).filter((journal) => journal.type === "general" || journal.id === Number(journalId)).map((journal) => (
                    <option key={journal.id} value={journal.id}>{journal.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Date"><Input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} /></Field>
              <Field label="Reference"><Input value={reference} onChange={(event) => setReference(event.target.value)} /></Field>
            </div>
            <div className="rounded-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lines</p>
                <Button variant="ghost" onClick={() => setLines((current) => [...current, { ...EMPTY_LINE }])}>Add line</Button>
              </div>
              <div className="space-y-2 p-3">
                {lines.map((line, index) => (
                  <div key={index} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-12">
                    <div className="sm:col-span-4"><Field label="Account">
                      <Select value={line.account_id} onChange={(event) => updateLine(index, { account_id: event.target.value })}>
                        <option value="">Choose account</option>
                        {(meta.data?.accounts ?? []).map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}
                      </Select>
                    </Field></div>
                    <div className="sm:col-span-4"><Field label="Label"><Input value={line.name} onChange={(event) => updateLine(index, { name: event.target.value })} /></Field></div>
                    <div className="sm:col-span-2"><Field label="Debit"><Input type="number" min={0} step="0.01" value={line.debit} onChange={(event) => updateLine(index, { debit: event.target.value, credit: event.target.value ? "" : line.credit })} /></Field></div>
                    <div className="sm:col-span-2"><Field label="Credit"><Input type="number" min={0} step="0.01" value={line.credit} onChange={(event) => updateLine(index, { credit: event.target.value, debit: event.target.value ? "" : line.debit })} /></Field></div>
                    <div className="flex justify-end sm:col-span-12">
                      {lines.length > 2 && <Button variant="ghost" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>Remove</Button>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap justify-end gap-6 border-t border-slate-100 px-4 py-3 text-sm">
                <span>Debit <b className="tabular-nums">{totals.debit.toFixed(2)}</b></span>
                <span>Credit <b className="tabular-nums">{totals.credit.toFixed(2)}</b></span>
                <span className={balanced ? "text-emerald-600" : "text-rose-600"}>{balanced ? "Balanced" : "Not balanced"}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
