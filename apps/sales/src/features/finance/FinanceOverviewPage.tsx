import { useNavigate } from "react-router-dom";
import { formatDate, useAuth } from "@mkuyu/core";
import { useFinanceOverview } from "@mkuyu/sales";
import { Button, Card, CardHeader, DetailList, DetailRow, ErrorState, Money, PageHeader, Spinner, Stat } from "../../components/ui";

export function FinanceOverviewPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const overview = useFinanceOverview();

  if (overview.isLoading) return <Spinner label="Loading finance overview…" />;
  if (overview.isError || !overview.data) {
    return <ErrorState message={overview.error?.message || "Could not load the finance overview."} onRetry={() => overview.refetch()} />;
  }

  const data = overview.data;
  const overdueReceivable = data.receivable_overdue.some((money) => Number(money.amount) > 0);
  const overduePayable = data.payable_overdue.some((money) => Number(money.amount) > 0);

  return (
    <div>
      <PageHeader
        eyebrow="Finance"
        title="Finance overview"
        description={`${data.company?.name || "Company"} · receivables, payables, cash, reconciliation and period close.`}
        actions={
          <>
            {can("view_finance_reports") && <Button variant="secondary" onClick={() => navigate("/finance/reports")}>Reports</Button>}
            {can("manage_finance") && <Button onClick={() => navigate("/finance/bills")}>Vendor bills</Button>}
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Receivable" value={<Money value={data.receivable} />} />
        <Stat label="Overdue receivable" value={<Money value={data.receivable_overdue} />} tone={overdueReceivable ? "danger" : "neutral"} />
        <Stat label="Payable" value={<Money value={data.payable} />} />
        <Stat label="Overdue payable" value={<Money value={data.payable_overdue} />} tone={overduePayable ? "danger" : "neutral"} />
        <Stat label="Cash & bank" value={<Money value={data.cash_and_bank} />} tone="info" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Work to clear" subtitle="Items that stop a clean month-end" />
          <DetailList>
            <DetailRow label="Draft vendor bills" value={data.draft_bills} />
            <DetailRow label="Draft journal entries" value={data.draft_entries} />
            <DetailRow label="Unreconciled bank lines" value={data.unreconciled_bank_lines} />
            <DetailRow label="Open cash sessions" value={data.open_cash_sessions} />
            <DetailRow label="Cash journals" value={data.cash_journals} />
          </DetailList>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4">
            <Button variant="secondary" onClick={() => navigate("/finance/bills")}>Bills</Button>
            <Button variant="secondary" onClick={() => navigate("/finance/bank")}>Bank reconciliation</Button>
            {can("view_cash") && <Button variant="secondary" onClick={() => navigate("/finance/cash")}>Cash sessions</Button>}
            <Button variant="secondary" onClick={() => navigate("/finance/journals")}>Journal entries</Button>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Period close"
            subtitle="Current lock dates"
            actions={can("close_period") ? <Button variant="ghost" onClick={() => navigate("/finance/config?tab=close")}>Manage</Button> : undefined}
          />
          <DetailList>
            <DetailRow label="Fiscal year" value={formatDate(data.lock_dates.fiscalyear_lock_date)} />
            <DetailRow label="Tax" value={formatDate(data.lock_dates.tax_lock_date)} />
            <DetailRow label="Sales" value={formatDate(data.lock_dates.sale_lock_date)} />
            <DetailRow label="Purchases" value={formatDate(data.lock_dates.purchase_lock_date)} />
          </DetailList>
        </Card>
      </div>
    </div>
  );
}
