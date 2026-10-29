import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { documentName, formatDate } from "@mkuyu/core";
import { useInvoices } from "@mkuyu/sales";
import type { InvoiceSummary } from "@mkuyu/api";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import { Button, Card, ErrorState, Field, FilterBar, Money, PageHeader, Pagination, SearchInput, Select, Spinner, StatusBadge } from "../../components/ui";

export function InvoicesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [state, setState] = useState("");
  const [overdue, setOverdue] = useState(false);
  const [page, setPage] = useState(1);
  const invoices = useInvoices({
    search: applied || undefined,
    state: overdue ? undefined : state || undefined,
    overdue: overdue ? 1 : undefined,
    page,
    limit: 25,
  });

  const columns: Column<InvoiceSummary>[] = [
    {
      header: "Invoice",
      primary: true,
      render: (invoice) => (
        <>
          <div className="font-medium text-slate-900">{invoice.partner?.name || "—"}</div>
          <div className="font-mono text-[11px] text-slate-400">{documentName(invoice)}</div>
        </>
      ),
    },
    { header: "Date", render: (invoice) => formatDate(invoice.invoice_date) },
    { header: "Due", render: (invoice) => formatDate(invoice.due_date) },
    { header: "Total", align: "right", render: (invoice) => <Money value={invoice.amount_total} /> },
    { header: "Balance", align: "right", render: (invoice) => <Money value={invoice.amount_residual} /> },
    { header: "State", render: (invoice) => <StatusBadge status={invoice.state.code} label={invoice.state.label} /> },
    { header: "Payment", render: (invoice) => <StatusBadge status={invoice.payment_state.code} label={invoice.payment_state.label} /> },
  ];

  return (
    <div>
      <PageHeader title="Invoices" description="Read-only customer invoices, receipts and their payment state." />
      <FilterBar>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => { event.preventDefault(); setPage(1); setApplied(search.trim()); }}
        >
          <div className="flex-1 sm:max-w-md">
            <Field label="Search"><SearchInput value={search} onChange={setSearch} placeholder="Invoice number or buyer" /></Field>
          </div>
          <Field label="View">
            <Select
              value={overdue ? "overdue" : state}
              onChange={(event) => {
                const value = event.target.value;
                setOverdue(value === "overdue");
                setState(value === "overdue" ? "" : value);
                setPage(1);
              }}
            >
              <option value="">All invoices</option>
              <option value="draft">Draft</option>
              <option value="posted">Posted</option>
              <option value="overdue">Overdue only</option>
              <option value="cancel">Cancelled</option>
            </Select>
          </Field>
          <Button type="submit" variant="secondary">Search</Button>
        </form>
      </FilterBar>

      {invoices.isError && <ErrorState message={invoices.error?.message || "Could not load invoices."} onRetry={() => invoices.refetch()} />}
      {invoices.isLoading ? (
        <Spinner />
      ) : (
        <Card>
          <ResponsiveTable
            columns={columns}
            rows={invoices.data?.data ?? []}
            rowKey={(invoice) => String(invoice.id)}
            onRowClick={(invoice) => navigate(`/invoices/${invoice.id}`)}
            emptyText="No invoice matches this view."
          />
          <Pagination meta={invoices.data?.meta} onPage={setPage} />
        </Card>
      )}
    </div>
  );
}
