import { useState } from "react";
import { formatMoney, formatPercent } from "@mkuyu/core";
import { useCollectionsDashboard } from "@mkuyu/sales";
import type { CollectionDashboardRow, Money } from "@mkuyu/api";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import { Card, CardHeader, ErrorState, Field, FilterBar, Input, Money as MoneyView, PageHeader, Spinner, Stat } from "../../components/ui";

function monthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const from = `${month}-01`;
  const to = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
  return { from, to };
}

function totals(rows: CollectionDashboardRow[], key: "due" | "collected" | "overdue"): Money[] {
  const grouped = new Map<string, number>();
  rows.forEach((row) => grouped.set(row[key].currency, (grouped.get(row[key].currency) || 0) + Number(row[key].amount || 0)));
  return [...grouped].map(([currency, amount]) => ({ amount: amount.toFixed(2), currency }));
}

export function CollectionDashboardPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const { from, to } = monthRange(month);
  const dashboard = useCollectionsDashboard({ date_from: from, date_to: to });

  if (dashboard.isLoading) return <Spinner label="Loading collection dashboard…" />;
  if (dashboard.isError) {
    return <ErrorState message={dashboard.error?.message || "Could not load the collection dashboard."} onRetry={() => dashboard.refetch()} />;
  }

  const rows = dashboard.data ?? [];
  const due = totals(rows, "due");
  const collected = totals(rows, "collected");
  const overdue = totals(rows, "overdue");

  const columns: Column<CollectionDashboardRow>[] = [
    {
      header: "Unit",
      primary: true,
      render: (row) => (
        <>
          <div className="font-medium">{row.unit_name}</div>
          <div className="font-mono text-[11px] text-slate-400">{row.unit_code}</div>
        </>
      ),
    },
    { header: "Due", align: "right", render: (row) => <MoneyView value={row.due} /> },
    { header: "Collected", align: "right", render: (row) => <span className="text-emerald-600"><MoneyView value={row.collected} /></span> },
    { header: "Overdue", align: "right", render: (row) => <span className="text-rose-600"><MoneyView value={row.overdue} /></span> },
    { header: "Rate", align: "right", render: (row) => formatPercent(row.collection_rate) },
  ];

  return (
    <div>
      <PageHeader
        title="Collection dashboard"
        description="Due, collected and overdue by unit for the selected period."
      />
      <FilterBar>
        <Field label="Reporting month">
          <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="max-w-xs" />
        </Field>
      </FilterBar>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Due" value={due.map(formatMoney).join(" · ") || "—"} />
        <Stat label="Collected" value={collected.map(formatMoney).join(" · ") || "—"} tone="success" />
        <Stat label="Overdue" value={overdue.map(formatMoney).join(" · ") || "—"} tone={overdue.some((money) => Number(money.amount) > 0) ? "danger" : "neutral"} />
      </div>

      <Card>
        <CardHeader title="By unit" subtitle={`${rows.length} unit${rows.length === 1 ? "" : "s"} with activity in ${month}`} />
        <ResponsiveTable columns={columns} rows={rows} rowKey={(row) => String(row.unit_id)} emptyText="No collection activity this month." />
      </Card>
    </div>
  );
}
