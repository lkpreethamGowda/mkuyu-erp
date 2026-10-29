import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatDate, useAuth } from "@mkuyu/core";
import {
  useArchiveUnit,
  useBuyers,
  useCancelReservation,
  useHandoverUnit,
  useReserveUnit,
  useUnit,
} from "@mkuyu/sales";
import type { Buyer } from "@mkuyu/api";
import { useToast } from "../../components/Toast";
import {
  BackButton,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DetailList,
  DetailRow,
  ErrorState,
  Field,
  Modal,
  Money,
  PageHeader,
  SearchInput,
  Spinner,
  StatusBadge,
} from "../../components/ui";

type PendingAction = "cancel" | "handover" | "archive" | null;

export function UnitDetailPage() {
  const { unitId = "" } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const { push } = useToast();
  const unitQuery = useUnit(unitId);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [buyerSearch, setBuyerSearch] = useState("");
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const buyers = useBuyers({ search: buyerSearch || undefined, page: 1, limit: 20 }, reserveOpen);
  const reserve = useReserveUnit();
  const cancel = useCancelReservation();
  const handover = useHandoverUnit();
  const archive = useArchiveUnit();

  if (unitQuery.isLoading) return <Spinner label="Loading unit…" />;
  if (unitQuery.isError || !unitQuery.data) {
    return <ErrorState message={unitQuery.error?.message || "Unit not found."} onRetry={() => unitQuery.refetch()} />;
  }

  const unit = unitQuery.data;
  const busy = reserve.isPending || cancel.isPending || handover.isPending || archive.isPending;

  async function reserveUnit() {
    if (!selectedBuyer) return;
    try {
      const result = await reserve.mutateAsync({ unitId: unit.id, buyerId: selectedBuyer.id });
      push(result.invoice ? `Unit reserved. Deposit invoice ${result.invoice.name}.` : "Unit reserved.", "success");
      setReserveOpen(false);
      setSelectedBuyer(null);
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  async function runPendingAction() {
    try {
      if (pendingAction === "cancel") {
        await cancel.mutateAsync(unit.id);
        push("Reservation cancelled.", "success");
      } else if (pendingAction === "handover") {
        await handover.mutateAsync(unit.id);
        push("Unit handed over.", "success");
      } else if (pendingAction === "archive") {
        await archive.mutateAsync(unit.id);
        push("Unit archived.", "success");
        navigate("/inventory/units", { replace: true });
      }
      setPendingAction(null);
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={unit.unit_code}
        title={unit.name}
        description={`${unit.unit_type.label}${unit.site ? ` · ${unit.site.name}` : ""}${unit.building ? ` · ${unit.building.name}` : ""}`}
        actions={
          <>
            <BackButton label="Back to units" />
            {can("create_orders") && unit.status.code !== "handed_over" && (
              <Button onClick={() => navigate(`/orders/new?unit_id=${unit.id}`)}>New quotation</Button>
            )}
            {can("manage_units") && <Button variant="secondary" onClick={() => navigate(`/inventory/units/${unit.id}/edit`)}>Edit</Button>}
            {can("archive_units") && <Button variant="ghost" onClick={() => setPendingAction("archive")}>Archive</Button>}
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <StatusBadge status={unit.status.code} label={unit.status.label} />
        <span className="text-sm text-slate-500">Floor {unit.floor || "—"}</span>
        <span className="text-sm text-slate-500">·</span>
        <span className="text-sm font-semibold text-slate-800"><Money value={unit.list_price} /></span>
        {unit.sale_order && (
          <Link to={`/orders/${unit.sale_order.id}`} className="text-sm font-medium text-brand-700 hover:underline">
            {unit.sale_order.name}
          </Link>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Unit details"
            subtitle="Master data and pricing"
            actions={
              <div className="flex gap-2">
                {unit.status.code === "available" && can("reserve_units") && (
                  <Button onClick={() => setReserveOpen(true)} disabled={unit.reservation_deposit.amount === "0.00"}>Reserve</Button>
                )}
                {unit.status.code === "reserved" && can("reserve_units") && (
                  <Button variant="secondary" onClick={() => setPendingAction("cancel")}>Cancel reservation</Button>
                )}
                {unit.status.code === "sold" && can("handover_units") && (
                  <Button onClick={() => setPendingAction("handover")}>Hand over</Button>
                )}
              </div>
            }
          />
          <DetailList>
            <DetailRow label="Unit code" value={<span className="font-mono">{unit.unit_code}</span>} />
            <DetailRow label="Type" value={unit.unit_type.label} />
            <DetailRow label="Floor" value={unit.floor || "—"} />
            <DetailRow label="Size" value={unit.size_sqm ? `${unit.size_sqm} sqm` : "—"} />
            <DetailRow label="Site" value={unit.site?.name || "—"} />
            <DetailRow label="Building" value={unit.building?.name || "—"} />
            <DetailRow label="Rate per sqm" value={<Money value={unit.rate_per_sqm} />} />
            <DetailRow label="Fixed price" value={<Money value={unit.fixed_price} />} />
            <DetailRow label="List price" value={<span className="font-semibold"><Money value={unit.list_price} /></span>} />
            <DetailRow label="Reservation deposit" value={<Money value={unit.reservation_deposit} />} />
            <DetailRow label="Notes" value={unit.notes || "—"} />
          </DetailList>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Buyer & sale" subtitle="Who holds or bought this unit" />
            <DetailList>
              <DetailRow
                label="Buyer"
                value={unit.buyer ? <Link className="text-brand-700 hover:underline" to={`/buyers/${unit.buyer.id}`}>{unit.buyer.name}</Link> : "Not reserved"}
              />
              <DetailRow label="Phone" value={unit.buyer?.phone || "—"} />
              <DetailRow
                label="Sale order"
                value={unit.sale_order ? <Link className="text-brand-700 hover:underline" to={`/orders/${unit.sale_order.id}`}>{unit.sale_order.name}</Link> : "—"}
              />
              <DetailRow label="Reservation date" value={formatDate(unit.reservation_date)} />
              <DetailRow label="Sold date" value={formatDate(unit.sold_date)} />
              <DetailRow label="Handover date" value={formatDate(unit.handover_date)} />
            </DetailList>
          </Card>

          {unit.reservation_invoice && (
            <Card>
              <CardHeader title="Reservation deposit" subtitle="Raised by Odoo when the unit was reserved" />
              <DetailList>
                <DetailRow label="Invoice" value={<span className="font-mono">{unit.reservation_invoice.name}</span>} />
                <DetailRow label="Amount" value={<Money value={unit.reservation_invoice.amount_total} />} />
                <DetailRow label="State" value={<StatusBadge status={unit.reservation_invoice.state.code} label={unit.reservation_invoice.state.label} />} />
                <DetailRow label="Payment" value={<StatusBadge status={unit.reservation_invoice.payment_state.code} label={unit.reservation_invoice.payment_state.label} />} />
              </DetailList>
            </Card>
          )}

          {can("view_invoices") && (
            <Card className="p-4">
              <p className="text-xs font-semibold text-slate-500">Related documents</p>
              <p className="mt-1 text-sm text-slate-600">Invoices for this unit appear on the order and the buyer file.</p>
              {unit.buyer && <Button variant="secondary" className="mt-3 w-full" onClick={() => navigate(`/buyers/${unit.buyer?.id}`)}>Open buyer file</Button>}
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={reserveOpen}
        onClose={() => { setReserveOpen(false); setSelectedBuyer(null); }}
        title="Reserve this unit"
        description={`${unit.name} · deposit ${unit.reservation_deposit.amount} ${unit.reservation_deposit.currency}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setReserveOpen(false); setSelectedBuyer(null); }} disabled={reserve.isPending}>Cancel</Button>
            <Button onClick={reserveUnit} disabled={!selectedBuyer || reserve.isPending}>{reserve.isPending ? "Reserving…" : "Reserve unit"}</Button>
          </>
        }
      >
        {unit.reservation_deposit.amount === "0.00" && (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
            This unit has no reservation deposit. Edit the unit and set one before reserving.
          </p>
        )}
        <Field label="Find the buyer">
          <SearchInput value={buyerSearch} onChange={setBuyerSearch} placeholder="Name, phone, customer ID…" />
        </Field>
        <div className="mt-3 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl ring-1 ring-slate-200">
          {buyers.isLoading && <p className="px-4 py-6 text-center text-sm text-slate-400">Loading buyers…</p>}
          {!buyers.isLoading && (buyers.data?.data.length ?? 0) === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">No buyer matches.</p>}
          {buyers.data?.data.map((buyer) => (
            <button
              key={buyer.id}
              type="button"
              onClick={() => setSelectedBuyer(buyer)}
              className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${selectedBuyer?.id === buyer.id ? "bg-brand-50" : "hover:bg-slate-50"}`}
            >
              <div>
                <div className="text-sm font-medium text-slate-900">{buyer.name}</div>
                <div className="text-xs text-slate-500">{buyer.phone || buyer.email || "No contact details"}</div>
              </div>
              <span className={`h-3.5 w-3.5 rounded-full border ${selectedBuyer?.id === buyer.id ? "border-brand-600 bg-brand-600" : "border-slate-300"}`} />
            </button>
          ))}
        </div>
        <Link to="/buyers/new" className="mt-3 inline-block text-xs font-medium text-brand-700 hover:underline">Create a new buyer instead</Link>
      </Modal>

      <ConfirmDialog
        open={pendingAction === "cancel"}
        title="Cancel the reservation?"
        description={`${unit.name} will become available again. A posted deposit invoice must be fully credited first.`}
        confirmLabel="Cancel reservation"
        tone="danger"
        busy={busy}
        onConfirm={runPendingAction}
        onClose={() => setPendingAction(null)}
      />
      <ConfirmDialog
        open={pendingAction === "handover"}
        title="Hand the unit over?"
        description={`${unit.name} will be marked as handed over to ${unit.buyer?.name || "the buyer"}.`}
        confirmLabel="Hand over"
        busy={busy}
        onConfirm={runPendingAction}
        onClose={() => setPendingAction(null)}
      />
      <ConfirmDialog
        open={pendingAction === "archive"}
        title="Archive this unit?"
        description="The unit disappears from the active lists but stays in Odoo for history."
        confirmLabel="Archive unit"
        tone="danger"
        busy={busy}
        onConfirm={runPendingAction}
        onClose={() => setPendingAction(null)}
      />
    </div>
  );
}
