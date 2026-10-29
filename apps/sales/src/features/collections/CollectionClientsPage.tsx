import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatMoney } from "@mkuyu/core";
import { useClients } from "@mkuyu/sales";
import type { ClientSummary } from "@mkuyu/api";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import { Button, Card, ErrorState, Field, FilterBar, PageHeader, Pagination, SearchInput, Spinner } from "../../components/ui";

export function CollectionClientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const clients = useClients({ search: applied || undefined, page, limit: 25 });

  const columns: Column<ClientSummary>[] = [
    {
      header: "Client",
      primary: true,
      render: (client) => (
        <>
          <div className="font-medium text-slate-900">{client.name}</div>
          <div className="text-[11px] text-slate-400">{client.client_code || "No client code"}</div>
        </>
      ),
    },
    { header: "Phone", render: (client) => client.phone || "—" },
    { header: "Units", align: "right", render: (client) => client.unit_count },
    { header: "Balance", align: "right", render: (client) => formatMoney(client.balance) },
    {
      header: "Overdue",
      align: "right",
      render: (client) => Number(client.overdue_amount?.amount || 0) > 0
        ? <span className="font-semibold text-rose-600">{formatMoney(client.overdue_amount)}</span>
        : <span className="text-slate-400">—</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Customer files, payment plans, balances and statements."
        actions={<Button variant="secondary" onClick={() => navigate("/collections/dashboard")}>Collection dashboard</Button>}
      />
      <FilterBar>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => { event.preventDefault(); setPage(1); setApplied(search.trim()); }}
        >
          <div className="flex-1 sm:max-w-md">
            <Field label="Search">
              <SearchInput value={search} onChange={setSearch} placeholder="Name, phone, client code or unit code" />
            </Field>
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>
      </FilterBar>

      {clients.isError && <ErrorState message={clients.error?.message || "Could not load clients."} onRetry={() => clients.refetch()} />}
      {clients.isLoading ? (
        <Spinner />
      ) : (
        <Card>
          <ResponsiveTable
            columns={columns}
            rows={clients.data?.data ?? []}
            rowKey={(client) => String(client.id)}
            onRowClick={(client) => navigate(`/collections/clients/${client.id}`)}
            emptyText="No clients match this search."
          />
          <Pagination meta={clients.data?.meta} onPage={setPage} />
        </Card>
      )}
    </div>
  );
}
