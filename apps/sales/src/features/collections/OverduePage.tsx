import { useState } from "react";
import { formatDate, formatMoney, useAuth } from "@mkuyu/core";
import { useCreateFollowup, useFollowups, useOverdue } from "@mkuyu/sales";
import type { OverdueRow } from "@mkuyu/api";
import { useToast } from "../../components/Toast";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import {
  Button,
  Card,
  ErrorState,
  Field,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Spinner,
  StatusBadge,
  Textarea,
} from "../../components/ui";

export function OverduePage() {
  const { can } = useAuth();
  const { push } = useToast();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<OverdueRow | null>(null);
  const [channel, setChannel] = useState("call");
  const [note, setNote] = useState("");
  const [promiseAmount, setPromiseAmount] = useState("");
  const [promiseDate, setPromiseDate] = useState("");
  const [nextDate, setNextDate] = useState("");
  const overdue = useOverdue({ page, limit: 25, sort: "-days_overdue" });
  const followups = useFollowups(selected?.client_id, selected?.unit_id);
  const createFollowup = useCreateFollowup();

  const columns: Column<OverdueRow>[] = [
    {
      header: "Client",
      primary: true,
      render: (row) => (
        <>
          <div className="font-medium">{row.name}</div>
          <div className="text-[11px] text-slate-400">{row.unit_code} · {row.unit_name}</div>
        </>
      ),
    },
    { header: "Property", render: (row) => [row.site_name, row.building_name, row.unit_name].filter(Boolean).join(" › ") || "—" },
    { header: "Overdue", align: "right", render: (row) => <span className="font-semibold text-rose-600">{formatMoney(row.overdue_amount)}</span> },
    { header: "Days", align: "right", render: (row) => row.days_overdue },
    { header: "Oldest due", render: (row) => formatDate(row.oldest_overdue_date) },
    { header: "Next follow-up", render: (row) => row.next_followup_date ? formatDate(row.next_followup_date) : row.last_followup_date ? `Last ${formatDate(row.last_followup_date)}` : "—" },
    {
      header: "",
      align: "right",
      render: (row) => can("write_followups") ? (
        <Button
          variant="secondary"
          onClick={(event) => {
            event.stopPropagation();
            setSelected(row);
            setChannel("call");
            setNote("");
            setPromiseAmount("");
            setPromiseDate("");
            setNextDate("");
          }}
        >
          Log follow-up
        </Button>
      ) : null,
    },
  ];

  async function saveFollowup() {
    if (!selected) return;
    if (!note.trim()) {
      push("Write what was discussed.", "error");
      return;
    }
    try {
      await createFollowup.mutateAsync({
        clientId: selected.client_id,
        body: {
          unit_id: selected.unit_id,
          channel,
          note: note.trim(),
          promise_amount: promiseAmount ? Number(promiseAmount) : null,
          promise_to_pay_date: promiseDate || null,
          next_followup_date: nextDate || null,
        },
      });
      push("Follow-up saved.", "success");
      setSelected(null);
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Overdue"
        description="Clients with overdue installments. Log a call, visit or promise to pay."
      />

      {overdue.isError && <ErrorState message={overdue.error?.message || "Could not load the overdue list."} onRetry={() => overdue.refetch()} />}
      {overdue.isLoading ? (
        <Spinner />
      ) : (
        <Card>
          <ResponsiveTable
            columns={columns}
            rows={overdue.data?.data ?? []}
            rowKey={(row) => `${row.client_id}-${row.unit_id}`}
            emptyText="No overdue properties."
          />
          <Pagination meta={overdue.data?.meta} onPage={setPage} />
        </Card>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Log a follow-up"
        description={selected ? `${selected.name} · ${selected.unit_code} · overdue ${formatMoney(selected.overdue_amount)}` : ""}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)} disabled={createFollowup.isPending}>Cancel</Button>
            <Button onClick={saveFollowup} disabled={createFollowup.isPending}>{createFollowup.isPending ? "Saving…" : "Save follow-up"}</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Channel">
            <Select value={channel} onChange={(event) => setChannel(event.target.value)}>
              <option value="call">Call</option>
              <option value="visit">Visit</option>
              <option value="message">Message</option>
            </Select>
          </Field>
          <Field label="Next follow-up date">
            <Input type="date" value={nextDate} onChange={(event) => setNextDate(event.target.value)} />
          </Field>
          <Field label="Promise amount">
            <Input type="number" min={0} step="0.01" value={promiseAmount} onChange={(event) => setPromiseAmount(event.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Promise date">
            <Input type="date" value={promiseDate} onChange={(event) => setPromiseDate(event.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Result / note" required>
              <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="What was said or agreed…" />
            </Field>
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Recent follow-ups</p>
          {followups.isLoading && <p className="text-sm text-slate-400">Loading…</p>}
          {!followups.isLoading && (followups.data?.length ?? 0) === 0 && <p className="text-sm text-slate-400">No follow-up recorded for this unit.</p>}
          <div className="space-y-2">
            {followups.data?.slice(0, 4).map((followup) => (
              <div key={followup.id} className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-700">{followup.channel} · {formatDate(followup.date)}</span>
                  <span className="text-xs text-slate-400">{followup.user}</span>
                </div>
                <p className="mt-1 text-slate-600">{followup.note}</p>
                {followup.promise_amount && (
                  <p className="mt-1 text-xs text-amber-700">Promise {formatMoney(followup.promise_amount)} {followup.promise_to_pay_date ? `by ${formatDate(followup.promise_to_pay_date)}` : ""}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
