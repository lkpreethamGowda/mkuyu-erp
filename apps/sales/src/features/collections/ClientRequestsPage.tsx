import { useState } from "react";
import { formatDate, useAuth } from "@mkuyu/core";
import { useClientRequestAction, useClientRequests } from "@mkuyu/sales";
import type { ClientRequest } from "@mkuyu/api";
import { useToast } from "../../components/Toast";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import { Button, Card, ErrorState, PageHeader, Pagination, Spinner, StatusBadge, Tabs } from "../../components/ui";

export function ClientRequestsPage() {
  const { can } = useAuth();
  const { push } = useToast();
  const [state, setState] = useState("pending");
  const [page, setPage] = useState(1);
  const requests = useClientRequests({ state, page, limit: 25 });
  const action = useClientRequestAction();
  const canReview = can("review_client_requests");

  async function run(request: ClientRequest, name: string) {
    try {
      await action.mutateAsync({ requestId: request.id, action: name });
      push(`Request ${request.id} updated.`, "success");
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  const columns: Column<ClientRequest>[] = [
    {
      header: "Client",
      primary: true,
      render: (request) => (
        <>
          <div className="font-medium">{request.client_name}</div>
          <div className="text-[11px] text-slate-400">{request.unit_code || "No unit"} · {request.client_code || "No client code"}</div>
        </>
      ),
    },
    { header: "Type", render: (request) => request.request_type.replace(/_/g, " ") },
    { header: "Description", render: (request) => request.description || "—" },
    { header: "Created", render: (request) => formatDate(request.created) },
    { header: "State", render: (request) => <StatusBadge status={request.state} /> },
    {
      header: "",
      align: "right",
      render: (request) => canReview && state === "pending" ? (
        <div className="flex flex-wrap justify-end gap-1">
          <Button variant="secondary" onClick={(event) => { event.stopPropagation(); run(request, "confirm"); }} disabled={action.isPending}>Confirm</Button>
          <Button variant="ghost" onClick={(event) => { event.stopPropagation(); run(request, "reject"); }} disabled={action.isPending}>Reject</Button>
        </div>
      ) : canReview && state === "confirmed" ? (
        <Button variant="secondary" onClick={(event) => { event.stopPropagation(); run(request, "post"); }} disabled={action.isPending}>Mark posted</Button>
      ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Client requests"
        description="Questions and change requests submitted by clients from the mobile app."
      />
      <Tabs
        tabs={[
          { value: "pending", label: "Waiting" },
          { value: "confirmed", label: "Confirmed" },
          { value: "rejected", label: "Rejected" },
        ]}
        value={state}
        onChange={(value) => { setState(value); setPage(1); }}
      />

      {requests.isError && <ErrorState message={requests.error?.message || "Could not load client requests."} onRetry={() => requests.refetch()} />}
      {requests.isLoading ? (
        <Spinner />
      ) : (
        <Card>
          <ResponsiveTable
            columns={columns}
            rows={requests.data?.data ?? []}
            rowKey={(request) => String(request.id)}
            emptyText="No client requests in this view."
          />
          <Pagination meta={requests.data?.meta} onPage={setPage} />
        </Card>
      )}
    </div>
  );
}
