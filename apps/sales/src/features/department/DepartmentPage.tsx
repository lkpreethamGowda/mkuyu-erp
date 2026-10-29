import { useState } from "react";
import { documentName, formatDate, useAuth } from "@mkuyu/core";
import {
  useApproveDepartmentBill,
  useDepartmentBills,
  useDepartmentSummary,
  useRejectDepartmentBill,
} from "@mkuyu/sales";
import type { DepartmentBill } from "@mkuyu/api";
import { useToast } from "../../components/Toast";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import {
  Button,
  Card,
  ErrorState,
  Field,
  Modal,
  Money,
  PageHeader,
  Pagination,
  Spinner,
  StatusBadge,
  Tabs,
  Textarea,
} from "../../components/ui";

export function DepartmentPage() {
  const { can } = useAuth();
  const { push } = useToast();
  const [tab, setTab] = useState("pending");
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<DepartmentBill | null>(null);
  const [reason, setReason] = useState("");
  const summary = useDepartmentSummary();
  const bills = useDepartmentBills({ approval: tab === "all" ? undefined : tab, page, limit: 25 });
  const approve = useApproveDepartmentBill();
  const reject = useRejectDepartmentBill();
  const canApprove = can("approve_department");

  async function runApprove(bill: DepartmentBill) {
    try {
      await approve.mutateAsync(bill.id);
      push(`Bill ${documentName(bill)} approved.`, "success");
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  async function runReject() {
    if (!rejecting || !reason.trim()) return;
    try {
      await reject.mutateAsync({ id: rejecting.id, reason: reason.trim() });
      push(`Bill ${documentName(rejecting)} rejected.`, "success");
      setRejecting(null);
      setReason("");
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  const columns: Column<DepartmentBill>[] = [
    {
      header: "Bill",
      primary: true,
      render: (bill) => (
        <>
          <div className="font-medium">{bill.partner?.name || "—"}</div>
          <div className="font-mono text-[11px] text-slate-400">{documentName(bill)}</div>
        </>
      ),
    },
    { header: "Department", render: (bill) => bill.department?.name || "Unassigned" },
    { header: "Date", render: (bill) => formatDate(bill.invoice_date) },
    { header: "Total", align: "right", render: (bill) => <Money value={bill.amount_total} /> },
    { header: "Vendor state", render: (bill) => <StatusBadge status={bill.state.code} label={bill.state.label} /> },
    {
      header: "Department approval",
      render: (bill) => (
        <div>
          <StatusBadge status={bill.department_state} />
          {bill.department_rejection && <div className="mt-1 max-w-48 text-[11px] text-rose-600">{bill.department_rejection}</div>}
        </div>
      ),
    },
    ...(canApprove ? [{
      header: "",
      align: "right" as const,
      render: (bill: DepartmentBill) => bill.department_state === "pending" ? (
        <div className="flex flex-wrap justify-end gap-1">
          <Button variant="secondary" onClick={(event) => { event.stopPropagation(); runApprove(bill); }} disabled={approve.isPending}>Approve</Button>
          <Button variant="ghost" onClick={(event) => { event.stopPropagation(); setRejecting(bill); setReason(""); }}>Reject</Button>
        </div>
      ) : null,
    }] : []),
  ];

  return (
    <div>
      <PageHeader
        title="Department approvals"
        description={summary.data?.department ? `${summary.data.department.name} · vendor bills and expenses` : "No department assigned. Ask IT to link your user to a department before approving."}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4"><p className="text-xs font-semibold text-slate-500">Pending</p><p className="mt-2 text-lg font-semibold text-amber-600">{summary.data?.pending ?? "—"}</p></Card>
        <Card className="p-4"><p className="text-xs font-semibold text-slate-500">Approved</p><p className="mt-2 text-lg font-semibold text-emerald-600">{summary.data?.approved ?? "—"}</p></Card>
        <Card className="p-4"><p className="text-xs font-semibold text-slate-500">Rejected</p><p className="mt-2 text-lg font-semibold text-rose-600">{summary.data?.rejected ?? "—"}</p></Card>
        <Card className="p-4"><p className="text-xs font-semibold text-slate-500">Total bills</p><p className="mt-2 text-lg font-semibold">{summary.data?.bills ?? "—"}</p></Card>
      </div>

      <Tabs
        tabs={[
          { value: "pending", label: "Pending", count: summary.data?.pending },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" },
          { value: "all", label: "All" },
        ]}
        value={tab}
        onChange={(value) => { setTab(value); setPage(1); }}
      />

      {bills.isError && <ErrorState message={bills.error?.message || "Could not load department bills."} onRetry={() => bills.refetch()} />}
      {bills.isLoading ? (
        <Spinner />
      ) : (
        <Card>
          <ResponsiveTable columns={columns} rows={bills.data?.data ?? []} rowKey={(bill) => String(bill.id)} emptyText="No vendor bills in this view." />
          <Pagination meta={bills.data?.meta} onPage={setPage} />
        </Card>
      )}

      <Modal
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        title="Reject vendor bill"
        description={rejecting ? `${documentName(rejecting)} · ${rejecting.partner?.name || ""}` : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejecting(null)} disabled={reject.isPending}>Cancel</Button>
            <Button variant="danger" onClick={runReject} disabled={reject.isPending || !reason.trim()}>{reject.isPending ? "Rejecting…" : "Reject bill"}</Button>
          </>
        }
      >
        <Field label="Reason" required>
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why is this bill rejected?" />
        </Field>
      </Modal>
    </div>
  );
}
