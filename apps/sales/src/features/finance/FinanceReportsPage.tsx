import { useState } from "react";
import { formatDate, isoDate } from "@mkuyu/core";
import { useFinanceReport, useFinanceReports } from "@mkuyu/sales";
import { Button, Card, CardHeader, ErrorState, Field, FilterBar, Input, PageHeader, Spinner } from "../../components/ui";

function yearStart() {
  const now = new Date();
  return isoDate(new Date(now.getFullYear(), 0, 1));
}

export function FinanceReportsPage() {
  const reports = useFinanceReports();
  const [code, setCode] = useState("profit_loss");
  const [dateFrom, setDateFrom] = useState(yearStart());
  const [dateTo, setDateTo] = useState(isoDate());
  const report = useFinanceReport(code, { date_from: dateFrom, date_to: dateTo });

  return (
    <div>
      <PageHeader
        title="Financial reports"
        description="Profit and loss, balance sheet, tax, trial balance, ledgers and aging — read straight from the Odoo accounting engine."
      />

      <FilterBar>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Report">
            <select
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              {(reports.data ?? []).map((definition) => <option key={definition.code} value={definition.code}>{definition.name}</option>)}
            </select>
          </Field>
          <Field label="From"><Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></Field>
          <Field label="To"><Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></Field>
          <Button variant="secondary" onClick={() => report.refetch()}>Refresh</Button>
        </div>
      </FilterBar>

      {report.isError && <ErrorState message={report.error?.message || "Could not load this report."} onRetry={() => report.refetch()} />}
      {report.isLoading ? <Spinner label="Running report…" /> : report.data && (
        <Card>
          <CardHeader
            title={report.data.name}
            subtitle={`${report.data.company} · ${formatDate(dateFrom)} – ${formatDate(dateTo)}`}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Line</th>
                  {(report.data.headers[0] ?? []).map((header, index) => (
                    <th key={index} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.data.lines.map((line) => (
                  <tr key={line.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5">
                      <span style={{ paddingLeft: `${Math.max(line.level, 0) * 14}px` }} className={line.level <= 1 ? "font-semibold text-slate-900" : "text-slate-700"}>
                        {line.name}
                      </span>
                    </td>
                    {line.columns.map((column, index) => (
                      <td key={index} className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-slate-700">{column.display}</td>
                    ))}
                  </tr>
                ))}
                {report.data.lines.length === 0 && (
                  <tr><td colSpan={Math.max(1, (report.data.headers[0] ?? []).length + 1)} className="px-4 py-10 text-center text-sm text-slate-400">No lines for this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
