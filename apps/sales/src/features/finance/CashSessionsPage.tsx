import { useState } from "react";
import { formatDate, formatDateTime, useAuth } from "@mkuyu/core";
import { useCashSessions, useCloseCashSession, useOpenCashSession } from "@mkuyu/sales";
import type { CashJournalRow, CashSession } from "@mkuyu/api";
import { useToast } from "../../components/Toast";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import {
  Badge,
  Button,
  Card,
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

export function CashSessionsPage() {
  const { can } = useAuth();
  const { push } = useToast();
  const sessions = useCashSessions({});
  const openSession = useOpenCashSession();
  const closeSession = useCloseCashSession();
  const [opening, setOpening] = useState<CashJournalRow | null>(null);
  const [openingBalance, setOpeningBalance] = useState("");
  const [openingNote, setOpeningNote] = useState("");
  const [closing, setClosing] = useState<CashSession | null>(null);
  const [counted, setCounted] = useState("");
  const [closingNote, setClosingNote] = useState("");

  function startOpening(journal: CashJournalRow) {
    setOpening(journal);
    setOpeningBalance(journal.suggested_opening.amount);
    setOpeningNote("");
  }

  async function runOpen() {
    if (!opening) return;
    try {
      await openSession.mutateAsync({
        journal_id: opening.journal.id,
        opening_balance: openingBalance,
        note: openingNote.trim(),
      });
      push("Cash session opened.", "success");
      setOpening(null);
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  function startClosing(session: CashSession) {
    setClosing(session);
    setCounted(session.expected_balance.amount);
    setClosingNote(session.note || "");
  }

  async function runClose() {
    if (!closing) return;
    try {
      await closeSession.mutateAsync({ id: closing.id, body: { counted_balance: counted, note: closingNote.trim() } });
      push("Cash session closed.", "success");
      setClosing(null);
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  const columns: Column<CashSession>[] = [
    {
      header: "Session",
      primary: true,
      render: (session) => (
        <>
          <div className="font-medium">{session.name}</div>
          <div className="text-[11px] text-slate-400">{session.journal.name} · {formatDate(session.date)}</div>
        </>
      ),
    },
    { header: "Opening", align: "right", render: (session) => <Money value={session.opening_balance} /> },
    { header: "Expected", align: "right", render: (session) => <Money value={session.expected_balance} /> },
    { header: "Counted", align: "right", render: (session) => session.counted_balance ? <Money value={session.counted_balance} /> : <span className="text-slate-400">—</span> },
    {
      header: "Difference",
      align: "right",
      render: (session) => session.difference
        ? <span className={Number(session.difference.amount) === 0 ? "text-emerald-600" : "text-rose-600"}><Money value={session.difference} /></span>
        : <span className="text-slate-400">—</span>,
    },
    { header: "State", render: (session) => <StatusBadge status={session.state} /> },
    { header: "Closed", render: (session) => session.closed_on ? `${formatDateTime(session.closed_on)} · ${session.closed_by?.name || ""}` : "—" },
    ...(can("manage_cash") ? [{
      header: "",
      align: "right" as const,
      render: (session: CashSession) => session.state === "open"
        ? <Button variant="secondary" onClick={(event) => { event.stopPropagation(); startClosing(session); }}>Close</Button>
        : null,
    }] : []),
  ];

  return (
    <div>
      <PageHeader
        title="Cash sessions"
        description="Open a cashier day, count the drawer at close, and record the difference against posted cash entries."
      />

      {sessions.isError && <ErrorState message={sessions.error?.message || "Could not load cash sessions."} onRetry={() => sessions.refetch()} />}
      {sessions.isLoading ? <Spinner /> : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(sessions.data?.journals ?? []).map((journal) => (
              <Card key={journal.journal.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{journal.journal.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{journal.currency}</p>
                  </div>
                  <Badge tone={journal.open_session ? "warning" : "success"}>{journal.open_session ? "Open" : "Closed"}</Badge>
                </div>
                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-slate-500">Current balance</span>
                  <span className="font-semibold"><Money value={journal.current_balance} /></span>
                </div>
                <div className="mt-1 flex justify-between text-sm">
                  <span className="text-slate-500">Today’s movement</span>
                  <span><Money value={journal.today_net} /></span>
                </div>
                {can("manage_cash") && (
                  <Button className="mt-4 w-full" variant="secondary" onClick={() => startOpening(journal)} disabled={journal.open_session}>
                    {journal.open_session ? "Session already open" : "Open session"}
                  </Button>
                )}
              </Card>
            ))}
            {(sessions.data?.journals ?? []).length === 0 && <p className="text-sm text-slate-500">No cash journal is configured for this company.</p>}
          </div>

          <Card>
            <ResponsiveTable
              columns={columns}
              rows={sessions.data?.sessions ?? []}
              rowKey={(session) => String(session.id)}
              emptyText="No cash session has been opened yet."
            />
          </Card>
        </>
      )}

      <Modal
        open={Boolean(opening)}
        onClose={() => setOpening(null)}
        title="Open cash session"
        description={opening ? `${opening.journal.name} · ${formatDate(sessions.data?.today)}` : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpening(null)} disabled={openSession.isPending}>Cancel</Button>
            <Button onClick={runOpen} disabled={openSession.isPending}>{openSession.isPending ? "Opening…" : "Open session"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Opening cash balance" required hint="Count the drawer before the first transaction.">
            <Input type="number" min={0} step="0.01" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} />
          </Field>
          <Field label="Note"><Textarea value={openingNote} onChange={(event) => setOpeningNote(event.target.value)} placeholder="Opening count, denominations, handover…" /></Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(closing)}
        onClose={() => setClosing(null)}
        title="Close cash session"
        description={closing ? `${closing.name} · expected ${closing.expected_balance.amount} ${closing.currency}` : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setClosing(null)} disabled={closeSession.isPending}>Cancel</Button>
            <Button onClick={runClose} disabled={closeSession.isPending}>{closeSession.isPending ? "Closing…" : "Close session"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Counted closing balance" required>
            <Input type="number" min={0} step="0.01" value={counted} onChange={(event) => setCounted(event.target.value)} />
          </Field>
          {closing && (
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Opening</span><span><Money value={closing.opening_balance} /></span></div>
              <div className="mt-1 flex justify-between"><span className="text-slate-500">Expected at close</span><span className="font-semibold"><Money value={closing.expected_balance} /></span></div>
              <div className="mt-1 flex justify-between"><span className="text-slate-500">Difference from count</span><span className={Number(counted || 0) - Number(closing.expected_balance.amount) === 0 ? "font-semibold text-emerald-600" : "font-semibold text-rose-600"}>{((Number(counted) || 0) - Number(closing.expected_balance.amount)).toFixed(2)} {closing.currency}</span></div>
            </div>
          )}
          <Field label="Note"><Textarea value={closingNote} onChange={(event) => setClosingNote(event.target.value)} placeholder="Explain any difference, attach the count sheet in Odoo if needed…" /></Field>
        </div>
      </Modal>
    </div>
  );
}
