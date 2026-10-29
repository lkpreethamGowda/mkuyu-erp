import { useState } from "react";
import { formatDate } from "@mkuyu/core";
import { salesApi } from "@mkuyu/api";
import { usePayments } from "@mkuyu/sales";
import { useToast } from "../../components/Toast";
import type { Payment } from "@mkuyu/api";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import { Button, Card, ErrorState, Field, FilterBar, Money, PageHeader, Pagination, SearchInput, Spinner, StatusBadge } from "../../components/ui";

export function PaymentsPage() {
  const { push } = useToast();
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const payments = usePayments({ search: applied || undefined, page, limit: 25 });

  const columns: Column<Payment>[] = [
    {
      header: "Payment",
      primary: true,
      render: (payment) => (
        <>
          <div className="font-medium text-slate-900">{payment.partner?.name || "—"}</div>
          <div className="text-[11px] text-slate-400">{payment.name}{payment.reference ? ` · ${payment.reference}` : ""}</div>
        </>
      ),
    },
    { header: "Date", render: (payment) => formatDate(payment.date) },
    { header: "Method", render: (payment) => payment.method || "—" },
    { header: "Amount", align: "right", render: (payment) => <Money value={payment.amount} /> },
    { header: "State", render: (payment) => <StatusBadge status={payment.state.code} label={payment.state.label} /> },
    {
      header: "",
      align: "right",
      render: (payment) => (
        <Button
          variant="secondary"
          onClick={async (event) => {
            event.stopPropagation();
            try {
              await salesApi.downloadCdlReceipt(payment.id, payment.name);
            } catch (error) {
              push((error as Error).message, "error");
            }
          }}
        >
          Receipt
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Payments" description="Customer payments recorded in Odoo. Read-only." />
      <FilterBar>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => { event.preventDefault(); setPage(1); setApplied(search.trim()); }}
        >
          <div className="flex-1 sm:max-w-md">
            <Field label="Search"><SearchInput value={search} onChange={setSearch} placeholder="Payment, buyer or reference" /></Field>
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>
      </FilterBar>

      {payments.isError && <ErrorState message={payments.error?.message || "Could not load payments."} onRetry={() => payments.refetch()} />}
      {payments.isLoading ? (
        <Spinner />
      ) : (
        <Card>
          <ResponsiveTable
            columns={columns}
            rows={payments.data?.data ?? []}
            rowKey={(payment) => String(payment.id)}
            emptyText="No payments recorded."
          />
          <Pagination meta={payments.data?.meta} onPage={setPage} />
        </Card>
      )}
    </div>
  );
}
