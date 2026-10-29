import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatDate, formatMoney, useAuth } from "@mkuyu/core";
import { salesApi } from "@mkuyu/api";
import { useClient, useClientPayments, usePlans, useSchedule } from "@mkuyu/sales";
import type { ClientProperty, ScheduleLine } from "@mkuyu/api";
import { useToast } from "../../components/Toast";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import {
  BackButton,
  Button,
  Card,
  CardHeader,
  DetailList,
  DetailRow,
  ErrorState,
  Money,
  PageHeader,
  Spinner,
  StatusBadge,
} from "../../components/ui";

export function CollectionClientPage() {
  const { clientId = "" } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const { push } = useToast();
  const client = useClient(clientId);
  const plans = usePlans(clientId);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
  const schedule = useSchedule(clientId, selectedPlan ?? undefined);
  const payments = useClientPayments(clientId, selectedUnit ?? undefined);

  if (client.isLoading) return <Spinner label="Loading client file…" />;
  if (client.isError || !client.data) {
    return <ErrorState message={client.error?.message || "Client not found."} onRetry={() => client.refetch()} />;
  }

  const data = client.data;
  const currency = data.balance?.currency || "TZS";

  async function statement(unitId: number) {
    try {
      await salesApi.downloadClientStatement(data.id, unitId);
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  const propertyColumns: Column<ClientProperty>[] = [
    {
      header: "Unit",
      primary: true,
      render: (property) => (
        <>
          <div className="font-medium">{property.unit_name}</div>
          <div className="font-mono text-[11px] text-slate-400">{property.unit_code}</div>
        </>
      ),
    },
    { header: "Type", render: (property) => property.unit_type || "—" },
    { header: "Location", render: (property) => [property.site?.name, property.building?.name].filter(Boolean).join(" › ") || "—" },
    { header: "Size", align: "right", render: (property) => property.size_sqm ? `${property.size_sqm} sqm` : "—" },
    { header: "Status", render: (property) => <StatusBadge status={property.status} /> },
    {
      header: "",
      align: "right",
      render: (property) => (
        <div className="flex justify-end gap-1">
          <Button variant="secondary" onClick={(event) => { event.stopPropagation(); statement(property.unit_id); }}>Statement</Button>
          <Button variant="ghost" onClick={(event) => { event.stopPropagation(); setSelectedUnit(property.unit_id); }}>Payments</Button>
        </div>
      ),
    },
  ];

  const scheduleColumns: Column<ScheduleLine>[] = [
    { header: "Payment", primary: true, render: (line) => <><div className="font-medium">{line.label}</div><div className="text-[11px] text-slate-400">Due {formatDate(line.due_date)}</div></> },
    { header: "Due", align: "right", render: (line) => <Money value={line.amount_due} /> },
    { header: "Paid", align: "right", render: (line) => <Money value={line.paid} /> },
    { header: "Balance", align: "right", render: (line) => <Money value={line.balance} /> },
    { header: "Status", render: (line) => <StatusBadge status={line.status} /> },
    { header: "Days", align: "right", render: (line) => line.days_overdue || "—" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={data.client_code || "Client"}
        title={data.name}
        description={[data.phone, data.email, data.national_id].filter(Boolean).join(" · ") || "No contact details"}
        actions={
          <>
            <BackButton label="Back to clients" />
            {can("create_orders") && <Button onClick={() => navigate(`/orders/new?partner_id=${data.id}`)}>New quotation</Button>}
            {can("view_orders") && <Button variant="secondary" onClick={() => navigate(`/buyers/${data.id}`)}>Buyer file</Button>}
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4"><p className="text-xs font-semibold text-slate-500">Balance</p><p className="mt-2 text-lg font-semibold">{formatMoney(data.balance)}</p></Card>
        <Card className="p-4"><p className="text-xs font-semibold text-slate-500">Overdue</p><p className="mt-2 text-lg font-semibold text-rose-600">{formatMoney(data.overdue_amount)}</p></Card>
        <Card className="p-4"><p className="text-xs font-semibold text-slate-500">Units</p><p className="mt-2 text-lg font-semibold">{data.unit_count}</p></Card>
        <Card className="p-4"><p className="text-xs font-semibold text-slate-500">Plans</p><p className="mt-2 text-lg font-semibold">{plans.data?.length ?? 0}</p></Card>
      </div>

      <Card className="mb-5">
        <CardHeader title="Properties" subtitle="Units owned by this client" />
        <ResponsiveTable
          columns={propertyColumns}
          rows={data.properties}
          rowKey={(property) => String(property.unit_id)}
          onRowClick={(property) => navigate(`/inventory/units/${property.unit_id}`)}
          emptyText="No unit linked to this client."
        />
      </Card>

      <Card className="mb-5">
        <CardHeader title="Payment plans" subtitle="Click a plan to see its schedule" />
        <div className="divide-y divide-slate-100">
          {(plans.data ?? []).length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-400">No payment plan linked.</p>}
          {(plans.data ?? []).map((plan) => (
            <button
              key={`${plan.unit_id}-${plan.plan_id}`}
              type="button"
              onClick={() => setSelectedPlan(plan.plan_id)}
              className={`flex w-full flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors ${selectedPlan === plan.plan_id ? "bg-brand-50" : "hover:bg-slate-50"}`}
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{plan.unit_code} · {plan.name || "Plan"}</p>
                <p className="text-xs text-slate-500">{plan.payment_type === "full" ? "Full payment" : "Down payment + installments"} · {plan.state || ""}</p>
              </div>
              <div className="flex flex-wrap gap-4 text-right text-xs">
                <div><p className="text-slate-400">Total</p><p className="font-semibold">{formatMoney(plan.total_payable)}</p></div>
                <div><p className="text-slate-400">Paid</p><p className="font-semibold text-emerald-600">{formatMoney(plan.amount_paid)}</p></div>
                <div><p className="text-slate-400">Balance</p><p className="font-semibold">{formatMoney(plan.residual)}</p></div>
                <div><p className="text-slate-400">Overdue</p><p className="font-semibold text-rose-600">{formatMoney(plan.overdue_amount)}</p></div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {selectedPlan && (
        <Card className="mb-5">
          <CardHeader
            title="Payment schedule"
            subtitle={schedule.data?.meta?.unit_code || ""}
            actions={<Button variant="ghost" onClick={() => setSelectedPlan(null)}>Close</Button>}
          />
          {schedule.isLoading ? <Spinner /> : (
            <ResponsiveTable
              columns={scheduleColumns}
              rows={schedule.data?.data ?? []}
              rowKey={(line) => String(line.sequence)}
              emptyText="No schedule lines."
            />
          )}
        </Card>
      )}

      <Card>
        <CardHeader
          title="Payments received"
          subtitle={selectedUnit ? `Filtered to unit ${selectedUnit}` : "All units"}
          actions={selectedUnit ? <Button variant="ghost" onClick={() => setSelectedUnit(null)}>Show all</Button> : undefined}
        />
        <div className="divide-y divide-slate-100">
          {(payments.data ?? []).length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-400">No payments recorded.</p>}
          {(payments.data ?? []).map((payment) => (
            <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{payment.receipt_number || `Payment ${payment.id}`}</p>
                <p className="text-xs text-slate-500">{formatDate(payment.date)} · {payment.method} · {payment.reference || "No reference"}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatMoney(payment.amount)}</p>
                <p className="text-xs text-slate-400">Unit {payment.unit_id}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
