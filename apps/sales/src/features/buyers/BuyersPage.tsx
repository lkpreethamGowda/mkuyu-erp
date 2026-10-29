import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@mkuyu/core";
import { useBuyers } from "@mkuyu/sales";
import type { Buyer } from "@mkuyu/api";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import { Button, Card, ErrorState, Field, FilterBar, PageHeader, Pagination, SearchInput, Spinner } from "../../components/ui";

export function BuyersPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const buyers = useBuyers({ search: applied || undefined, page, limit: 25 });

  const columns: Column<Buyer>[] = [
    {
      header: "Buyer",
      primary: true,
      render: (buyer) => (
        <>
          <div className="font-medium text-slate-900">{buyer.name}</div>
          <div className="text-[11px] text-slate-400">{buyer.customer_id || "No customer ID"}</div>
        </>
      ),
    },
    { header: "Phone", render: (buyer) => buyer.phone || <span className="text-slate-400">—</span> },
    { header: "Email", render: (buyer) => buyer.email || <span className="text-slate-400">—</span> },
    { header: "National ID", render: (buyer) => buyer.national_id || <span className="text-slate-400">—</span> },
    { header: "Units", align: "right", render: (buyer) => buyer.unit_count },
    { header: "Orders", align: "right", render: (buyer) => buyer.order_count },
  ];

  return (
    <div>
      <PageHeader
        title="Buyers"
        description="Clients, their contact details and the units they own or reserved."
        actions={can("manage_buyers") ? <Button onClick={() => navigate("/buyers/new")}>New buyer</Button> : undefined}
      />

      <FilterBar>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => { event.preventDefault(); setPage(1); setApplied(search.trim()); }}
        >
          <div className="flex-1 sm:max-w-md">
            <Field label="Search">
              <SearchInput value={search} onChange={setSearch} placeholder="Name, phone, email, national ID or customer ID" />
            </Field>
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>
      </FilterBar>

      {buyers.isError && <ErrorState message={buyers.error?.message || "Could not load buyers."} onRetry={() => buyers.refetch()} />}
      {buyers.isLoading ? (
        <Spinner />
      ) : (
        <Card>
          <ResponsiveTable
            columns={columns}
            rows={buyers.data?.data ?? []}
            rowKey={(buyer) => String(buyer.id)}
            onRowClick={(buyer) => navigate(`/buyers/${buyer.id}`)}
            emptyText="No buyers match this search."
          />
          <Pagination meta={buyers.data?.meta} onPage={setPage} />
        </Card>
      )}
    </div>
  );
}
