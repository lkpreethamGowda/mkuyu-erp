import { useEffect, useState } from "react";
import { formatDate, useAuth } from "@mkuyu/core";
import { useBankCandidates, useBankReconciliation, useBankReconciliationLines, useMatchBankLine } from "@mkuyu/sales";
import type { BankStatementLine } from "@mkuyu/api";
import { useToast } from "../../components/Toast";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  FilterBar,
  Modal,
  Money,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Spinner,
  StatusBadge,
} from "../../components/ui";

export function BankReconciliationPage() {
  const { can } = useAuth();
  const { push } = useToast();
  const summary = useBankReconciliation();
  const [journalId, setJournalId] = useState("");
  const [showReconciled, setShowReconciled] = useState(false);
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const lines = useBankReconciliationLines({
    journal_id: journalId || undefined,
    reconciled: showReconciled ? "1" : "0",
    search: applied || undefined,
    page,
    limit: 25,
  });
  const [selectedLine, setSelectedLine] = useState<BankStatementLine | null>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const candidates = useBankCandidates(selectedLine?.id, applied);
  const match = useMatchBankLine();

  useEffect(() => {
    setSelectedItems([]);
  }, [selectedLine?.id]);

  function openMatch(line: BankStatementLine) {
    setSelectedLine(line);
    setSelectedItems([]);
  }

  async function runMatch() {
    if (!selectedLine || !selectedItems.length) {
      push("Select at least one open item.", "error");
      return;
    }
    try {
      await match.mutateAsync({ lineId: selectedLine.id, moveLineIds: selectedItems });
      push("Bank line reconciled.", "success");
      setSelectedLine(null);
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  const columns: Column<BankStatementLine>[] = [
    {
      header: "Transaction",
      primary: true,
      render: (line) => (
        <>
          <div className="font-medium">{line.partner?.name || line.name}</div>
          <div className="font-mono text-[11px] text-slate-400">{line.name} · {line.journal.name}</div>
        </>
      ),
    },
    { header: "Date", render: (line) => formatDate(line.date) },
    { header: "Amount", align: "right", render: (line) => <span className={Number(line.amount.amount) < 0 ? "text-rose-600" : "text-emerald-600"}><Money value={line.amount} /></span> },
    { header: "Status", render: (line) => <Badge tone={line.reconciled ? "success" : "warning"}>{line.reconciled ? "Reconciled" : "To reconcile"}</Badge> },
    ...(!showReconciled && can("manage_finance") ? [{
      header: "",
      align: "right" as const,
      render: (line: BankStatementLine) => <Button variant="secondary" onClick={(event) => { event.stopPropagation(); openMatch(line); }}>Match</Button>,
    }] : []),
  ];

  return (
    <div>
      <PageHeader
        title="Bank reconciliation"
        description="Match bank and cash statement lines to open customer invoices and vendor bills."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(summary.data ?? []).slice(0, 8).map((row) => (
          <button
            key={`${row.journal.id}-${row.type}`}
            type="button"
            onClick={() => { setJournalId(String(row.journal.id)); setPage(1); }}
            className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-brand-300 ${journalId === String(row.journal.id) ? "border-brand-400 ring-2 ring-brand-100" : "border-slate-200"}`}
          >
            <p className="text-xs font-semibold text-slate-500">{row.journal.name}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{row.unreconciled} to match</p>
            <p className="mt-1 text-xs text-slate-500"><Money value={row.balance} /> · {row.type}</p>
          </button>
        ))}
        {(summary.data ?? []).length === 0 && <p className="text-sm text-slate-500">No bank or cash journal is configured.</p>}
      </div>

      <FilterBar>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => { event.preventDefault(); setPage(1); setApplied(search.trim()); }}
        >
          <Field label="Journal">
            <Select value={journalId} onChange={(event) => { setJournalId(event.target.value); setPage(1); }}>
              <option value="">All journals</option>
              {(summary.data ?? []).map((row) => <option key={`${row.journal.id}-${row.type}`} value={row.journal.id}>{row.journal.name}</option>)}
            </Select>
          </Field>
          <div className="flex-1 sm:max-w-md">
            <Field label="Search"><SearchInput value={search} onChange={setSearch} placeholder="Reference or partner" /></Field>
          </div>
          <Field label="View">
            <Select value={showReconciled ? "1" : "0"} onChange={(event) => { setShowReconciled(event.target.value === "1"); setPage(1); }}>
              <option value="0">Unreconciled</option>
              <option value="1">Reconciled</option>
            </Select>
          </Field>
          <Button type="submit" variant="secondary">Search</Button>
        </form>
      </FilterBar>

      {lines.isError && <ErrorState message={lines.error?.message || "Could not load bank transactions."} onRetry={() => lines.refetch()} />}
      {lines.isLoading ? (
        <Spinner />
      ) : (
        <Card>
          <ResponsiveTable
            columns={columns}
            rows={lines.data?.data ?? []}
            rowKey={(line) => String(line.id)}
            emptyText={showReconciled ? "No reconciled transactions." : "Everything is reconciled for this view."}
          />
          <Pagination meta={lines.data?.meta} onPage={setPage} />
        </Card>
      )}

      <Modal
        open={Boolean(selectedLine)}
        onClose={() => setSelectedLine(null)}
        title="Match bank transaction"
        description={selectedLine ? `${selectedLine.name} · ${formatDate(selectedLine.date)}` : ""}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedLine(null)} disabled={match.isPending}>Close</Button>
            <Button onClick={runMatch} disabled={match.isPending || !selectedItems.length}>{match.isPending ? "Matching…" : "Reconcile selected"}</Button>
          </>
        }
      >
        {selectedLine && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Statement amount</p>
                <p className="mt-1 text-lg font-semibold"><Money value={selectedLine.amount} /></p>
              </div>
              <StatusBadge status={selectedLine.state} />
            </div>

            {candidates.isLoading ? <Spinner label="Finding open items…" /> : (
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {(candidates.data ?? []).length === 0 && <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">No open invoice or bill matches this transaction.</p>}
                {(candidates.data ?? []).map((item) => (
                  <label key={item.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${selectedItems.includes(item.id) ? "border-brand-400 bg-brand-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={(event) => setSelectedItems((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{item.move.name}</p>
                      <p className="truncate text-xs text-slate-500">{item.partner?.name || "No partner"} · {formatDate(item.date)} · {item.move_type.replace("_", " ")}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums"><Money value={item.amount_residual} /></span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
