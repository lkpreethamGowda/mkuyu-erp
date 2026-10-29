import { useMemo, useState } from "react";
import { formatDate, formatMoneyList } from "@mkuyu/core";
import { useInventoryReport, useSalesReport } from "@mkuyu/sales";
import type { InventoryReportRow, Money } from "@mkuyu/api";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import { Button, Card, CardHeader, ErrorState, Field, FilterBar, Input, PageHeader, Select, Spinner, Stat, Tabs } from "../../components/ui";

function firstOfMonth(): string {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function moneyText(values: Money[]): string {
  return values.map((value) => `${value.amount} ${value.currency}`).join(" | ");
}

function downloadCsv(filename: string, header: string[], rows: Array<Array<string | number>>) {
  const escape = (value: string | number) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const content = [header, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const [tab, setTab] = useState("inventory");
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo, setDateTo] = useState(today());
  const [groupBy, setGroupBy] = useState("site");

  const inventory = useInventoryReport(tab === "inventory");
  const sales = useSalesReport({ date_from: dateFrom, date_to: dateTo, group_by: groupBy }, tab === "sales");

  const inventoryTotals = useMemo(() => (inventory.data ?? []).reduce((totals, row) => ({
    total: totals.total + row.total,
    available: totals.available + row.available,
    reserved: totals.reserved + row.reserved,
    sold: totals.sold + row.sold,
    handed_over: totals.handed_over + row.handed_over,
  }), { total: 0, available: 0, reserved: 0, sold: 0, handed_over: 0 }), [inventory.data]);

  const inventoryColumns: Column<InventoryReportRow>[] = [
    {
      header: "Site",
      primary: true,
      render: (row) => (<><div className="font-medium">{row.site.name}</div><div className="font-mono text-[11px] text-slate-400">{row.site.code}</div></>),
    },
    { header: "Units", align: "right", render: (row) => row.total },
    { header: "Available", align: "right", render: (row) => row.available },
    { header: "Reserved", align: "right", render: (row) => row.reserved },
    { header: "Sold", align: "right", render: (row) => row.sold },
    { header: "Handed over", align: "right", render: (row) => row.handed_over },
    { header: "List value", align: "right", render: (row) => <span className="text-xs">{formatMoneyList(row.value_by_currency)}</span> },
  ];

  const salesColumns = [
    {
      header: groupBy === "agent" ? "Salesperson" : groupBy === "building" ? "Building" : "Site",
      primary: true,
      render: (row: { key: number; label: string; count: number; value_by_currency: Money[] }) => <span className="font-medium">{row.label}</span>,
    },
    { header: "Orders", align: "right" as const, render: (row: { count: number }) => row.count },
    { header: "Value", align: "right" as const, render: (row: { value_by_currency: Money[] }) => <span className="text-xs">{formatMoneyList(row.value_by_currency)}</span> },
  ];

  function exportInventory() {
    downloadCsv(
      "inventory-report.csv",
      ["Site", "Code", "Units", "Available", "Reserved", "Sold", "Handed over", "List value"],
      (inventory.data ?? []).map((row) => [row.site.name, row.site.code, row.total, row.available, row.reserved, row.sold, row.handed_over, moneyText(row.value_by_currency)]),
    );
  }

  function exportSales() {
    downloadCsv(
      `sales-report-${dateFrom}-${dateTo}.csv`,
      [groupBy, "Orders", "Value"],
      (sales.data?.rows ?? []).map((row) => [row.label, row.count, moneyText(row.value_by_currency)]),
    );
  }

  return (
    <div>
      <PageHeader title="Reports" description="Inventory and confirmed sales for the active company. Exports are generated in the browser." />
      <Tabs tabs={[{ value: "inventory", label: "Inventory" }, { value: "sales", label: "Sales" }]} value={tab} onChange={setTab} />

      {tab === "inventory" && (
        <>
          {inventory.isError && <ErrorState message={inventory.error?.message || "Could not load the inventory report."} onRetry={() => inventory.refetch()} />}
          {inventory.isLoading ? <Spinner /> : (
            <>
              <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="Units" value={inventoryTotals.total} />
                <Stat label="Available" value={inventoryTotals.available} tone="success" />
                <Stat label="Reserved" value={inventoryTotals.reserved} tone="warning" />
                <Stat label="Sold" value={inventoryTotals.sold} tone="info" />
              </div>
              <Card>
                <CardHeader title="Inventory by site" subtitle="Current status of every unit" actions={<Button variant="secondary" onClick={exportInventory}>Export CSV</Button>} />
                <ResponsiveTable columns={inventoryColumns} rows={inventory.data ?? []} rowKey={(row) => String(row.site.id)} emptyText="No inventory data." />
              </Card>
            </>
          )}
        </>
      )}

      {tab === "sales" && (
        <>
          <FilterBar>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="From"><Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></Field>
              <Field label="To"><Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></Field>
              <Field label="Group by">
                <Select value={groupBy} onChange={(event) => setGroupBy(event.target.value)}>
                  <option value="site">Site</option>
                  <option value="building">Building</option>
                  <option value="agent">Salesperson</option>
                </Select>
              </Field>
              <div className="flex items-end"><Button variant="secondary" onClick={() => sales.refetch()}>Refresh</Button></div>
            </div>
          </FilterBar>
          {sales.isError && <ErrorState message={sales.error?.message || "Could not load the sales report."} onRetry={() => sales.refetch()} />}
          {sales.isLoading ? <Spinner /> : (
            <>
              <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
                <Stat label="Confirmed orders" value={sales.data?.meta.count ?? 0} tone="info" hint={`${formatDate(dateFrom)} to ${formatDate(dateTo)}`} />
                <Stat label="Confirmed value" value={<span className="text-base">{formatMoneyList(sales.data?.meta.value_by_currency)}</span>} tone="success" />
                <Stat label="Grouping" value={groupBy === "agent" ? "Salesperson" : groupBy === "building" ? "Building" : "Site"} />
              </div>
              <Card>
                <CardHeader title="Sales report" subtitle="Confirmed non-subscription orders" actions={<Button variant="secondary" onClick={exportSales}>Export CSV</Button>} />
                <ResponsiveTable columns={salesColumns} rows={sales.data?.rows ?? []} rowKey={(row) => String(row.key)} emptyText="No confirmed sales in this period." />
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
