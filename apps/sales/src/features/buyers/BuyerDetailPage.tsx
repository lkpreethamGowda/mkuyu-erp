import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatDate, useAuth } from "@mkuyu/core";
import { salesApi } from "@mkuyu/api";
import { useArchiveBuyer, useBuyer } from "@mkuyu/sales";
import type { OrderSummary, UnitRef } from "@mkuyu/api";
import { useToast } from "../../components/Toast";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import {
  BackButton,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DetailList,
  DetailRow,
  ErrorState,
  Money,
  PageHeader,
  Spinner,
  StatusBadge,
} from "../../components/ui";

export function BuyerDetailPage() {
  const { buyerId = "" } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const { push } = useToast();
  const buyerQuery = useBuyer(buyerId);
  const archiveBuyer = useArchiveBuyer();
  const [confirmArchive, setConfirmArchive] = useState(false);

  if (buyerQuery.isLoading) return <Spinner label="Loading buyer…" />;
  if (buyerQuery.isError || !buyerQuery.data) {
    return <ErrorState message={buyerQuery.error?.message || "Buyer not found."} onRetry={() => buyerQuery.refetch()} />;
  }

  const buyer = buyerQuery.data;

  async function downloadStatement() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      await salesApi.downloadCdlStatement(buyer.id, today);
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  async function archive() {
    try {
      await archiveBuyer.mutateAsync(buyer.id);
      push("Buyer archived.", "success");
      navigate("/buyers", { replace: true });
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  const unitColumns: Column<UnitRef>[] = [
    { header: "Unit", primary: true, render: (unit) => (<><div className="font-medium">{unit.name}</div><div className="font-mono text-[11px] text-slate-400">{unit.unit_code}</div></>) },
    { header: "Site", render: (unit) => unit.site?.name || "—" },
    { header: "Building", render: (unit) => unit.building?.name || "—" },
    { header: "List price", align: "right", render: (unit) => <Money value={unit.list_price} /> },
    { header: "Status", render: (unit) => <StatusBadge status={unit.status.code} label={unit.status.label} /> },
  ];

  const orderColumns: Column<OrderSummary>[] = [
    { header: "Order", primary: true, render: (order) => (<><div className="font-medium">{order.name}</div><div className="text-[11px] text-slate-400">{order.unit?.unit_code}</div></>) },
    { header: "State", render: (order) => <StatusBadge status={order.state.code} label={order.state.label} /> },
    { header: "Total", align: "right", render: (order) => <Money value={order.amount_total} /> },
    { header: "Date", render: (order) => formatDate(order.date_order) },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={buyer.customer_id || "Buyer"}
        title={buyer.name}
        description={[buyer.phone, buyer.email, buyer.city].filter(Boolean).join(" · ") || "No contact details"}
        actions={
          <>
            <BackButton label="Back to buyers" />
            <Button variant="secondary" onClick={downloadStatement}>Statement PDF</Button>
            {can("create_orders") && <Button onClick={() => navigate(`/orders/new?partner_id=${buyer.id}`)}>New quotation</Button>}
            {can("manage_buyers") && <Button variant="secondary" onClick={() => navigate(`/buyers/${buyer.id}/edit`)}>Edit</Button>}
            {can("archive_buyers") && <Button variant="ghost" onClick={() => setConfirmArchive(true)}>Archive</Button>}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Contact" subtitle="From the Odoo contact record" />
          <DetailList>
            <DetailRow label="Phone" value={buyer.phone || "—"} />
            <DetailRow label="Email" value={buyer.email || "—"} />
            <DetailRow label="National ID" value={buyer.national_id || "—"} />
            <DetailRow label="Customer ID" value={buyer.customer_id || "—"} />
            <DetailRow label="Address" value={[buyer.street, buyer.street2, buyer.city, buyer.zip].filter(Boolean).join(", ") || "—"} />
            <DetailRow label="VAT" value={buyer.vat || "—"} />
          </DetailList>
        </Card>

        <Card>
          <CardHeader title="Portfolio" subtitle="Units and orders linked to this buyer" />
          <DetailList>
            <DetailRow label="Units" value={buyer.unit_count} />
            <DetailRow label="Orders" value={buyer.order_count} />
            <DetailRow label="Notes" value={buyer.notes || "—"} />
          </DetailList>
        </Card>

        <Card>
          <CardHeader title="Next step" subtitle="Keep the file moving" />
          <div className="space-y-2 p-4">
            {can("create_orders") && <Button className="w-full" onClick={() => navigate(`/orders/new?partner_id=${buyer.id}`)}>Create a quotation</Button>}
            <Button variant="secondary" className="w-full" onClick={() => navigate("/orders", { state: { partnerId: buyer.id } })}>View all orders</Button>
            <Button variant="secondary" className="w-full" onClick={() => navigate(`/inventory/units`)}>Browse available units</Button>
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader title="Units owned" subtitle={`${buyer.units?.length ?? 0} linked unit(s)`} />
        <ResponsiveTable
          columns={unitColumns}
          rows={buyer.units ?? []}
          rowKey={(unit) => String(unit.id)}
          onRowClick={(unit) => navigate(`/inventory/units/${unit.id}`)}
          emptyText="This buyer has no unit yet."
        />
      </Card>

      <Card className="mt-5">
        <CardHeader title="Orders" subtitle="Most recent quotations and sales" />
        <ResponsiveTable
          columns={orderColumns}
          rows={buyer.orders ?? []}
          rowKey={(order) => String(order.id)}
          onRowClick={(order) => navigate(`/orders/${order.id}`)}
          emptyText="No order for this buyer yet."
        />
      </Card>

      <ConfirmDialog
        open={confirmArchive}
        title="Archive this buyer?"
        description="The contact stays in Odoo but disappears from the active buyer lists."
        confirmLabel="Archive buyer"
        tone="danger"
        busy={archiveBuyer.isPending}
        onConfirm={archive}
        onClose={() => setConfirmArchive(false)}
      />
    </div>
  );
}
