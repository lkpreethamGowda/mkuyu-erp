import { useState } from "react";
import { formatDate, formatMoney, useAuth } from "@mkuyu/core";
import { usePaymentProofAction, usePaymentProofs } from "@mkuyu/sales";
import type { PaymentProof } from "@mkuyu/api";
import { useToast } from "../../components/Toast";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import {
  Button,
  Card,
  ErrorState,
  Field,
  Modal,
  PageHeader,
  Pagination,
  Spinner,
  StatusBadge,
  Tabs,
  Textarea,
} from "../../components/ui";

export function PaymentProofsPage() {
  const { can } = useAuth();
  const { push } = useToast();
  const [state, setState] = useState("pending");
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<PaymentProof | null>(null);
  const [reason, setReason] = useState("");
  const proofs = usePaymentProofs({ state, page, limit: 25 });
  const action = usePaymentProofAction();
  const canReview = can("review_payment_proofs");

  async function run(proof: PaymentProof, name: string, extra?: string) {
    try {
      await action.mutateAsync({ proofId: proof.id, action: name, reason: extra });
      push(`Payment proof ${proof.id} updated.`, "success");
      setRejecting(null);
      setReason("");
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  const columns: Column<PaymentProof>[] = [
    {
      header: "Client",
      primary: true,
      render: (proof) => (
        <>
          <div className="font-medium">{proof.client_name}</div>
          <div className="text-[11px] text-slate-400">{proof.unit_code || "No unit"} · {proof.client_code || "No client code"}</div>
        </>
      ),
    },
    { header: "Amount", align: "right", render: (proof) => formatMoney(proof.amount) },
    { header: "Paid on", render: (proof) => formatDate(proof.paid_on || null) },
    { header: "Reference", render: (proof) => proof.reference || "—" },
    { header: "Method", render: (proof) => proof.payment_method || "—" },
    { header: "State", render: (proof) => <StatusBadge status={proof.state} /> },
    {
      header: "",
      align: "right",
      render: (proof) => canReview && state === "pending" ? (
        <div className="flex flex-wrap justify-end gap-1">
          {proof.workflow_state === "new" && (
            <Button variant="secondary" onClick={(event) => { event.stopPropagation(); run(proof, "review"); }} disabled={action.isPending}>Start review</Button>
          )}
          {proof.workflow_state === "under_review" && (
            <Button variant="secondary" onClick={(event) => { event.stopPropagation(); run(proof, "await_bank"); }} disabled={action.isPending}>Awaiting bank</Button>
          )}
          {proof.workflow_state === "awaiting_bank" && (
            <Button variant="secondary" onClick={(event) => { event.stopPropagation(); run(proof, "reconcile"); }} disabled={action.isPending}>Mark reconciled</Button>
          )}
          <Button variant="ghost" onClick={(event) => { event.stopPropagation(); setRejecting(proof); setReason(""); }}>Reject</Button>
        </div>
      ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Payment proofs"
        description="Proofs uploaded by clients. Finance reviews them, matches the invoice and reconciles the payment in Odoo."
      />

      <Tabs
        tabs={[
          { value: "pending", label: "To review" },
          { value: "confirmed", label: "Confirmed" },
          { value: "rejected", label: "Rejected" },
        ]}
        value={state}
        onChange={(value) => { setState(value); setPage(1); }}
      />

      {proofs.isError && <ErrorState message={proofs.error?.message || "Could not load payment proofs."} onRetry={() => proofs.refetch()} />}
      {proofs.isLoading ? (
        <Spinner />
      ) : (
        <Card>
          <ResponsiveTable
            columns={columns}
            rows={proofs.data?.data ?? []}
            rowKey={(proof) => String(proof.id)}
            emptyText="No payment proofs in this view."
          />
          <Pagination meta={proofs.data?.meta} onPage={setPage} />
        </Card>
      )}

      <Modal
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        title="Reject payment proof"
        description={rejecting ? `${rejecting.client_name} · ${formatMoney(rejecting.amount)}` : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejecting(null)} disabled={action.isPending}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => rejecting && run(rejecting, "reject", reason)}
              disabled={action.isPending || !reason.trim()}
            >
              {action.isPending ? "Rejecting…" : "Reject proof"}
            </Button>
          </>
        }
      >
        <Field label="Rejection reason" required>
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Tell the client why this proof cannot be accepted." />
        </Field>
      </Modal>
    </div>
  );
}
