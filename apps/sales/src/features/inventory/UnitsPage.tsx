import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@mkuyu/core";
import { useBuildings, useSites, useUnits } from "@mkuyu/sales";
import type { Unit } from "@mkuyu/api";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import { Button, Card, ErrorState, Field, FilterBar, Money, PageHeader, Pagination, SearchInput, Select, Spinner, StatusBadge } from "../../components/ui";

const STATUSES = [
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
  { value: "handed_over", label: "Handed over" },
];

const TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "shop", label: "Shop" },
  { value: "office", label: "Office" },
  { value: "plot", label: "Plot" },
];

export function UnitsPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [siteId, setSiteId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [status, setStatus] = useState("");
  const [unitType, setUnitType] = useState("");
  const [page, setPage] = useState(1);

  const sites = useSites();
  const buildings = useBuildings(siteId || undefined, Boolean(siteId));
  const units = useUnits({
    search: appliedSearch || undefined,
    site_id: siteId || undefined,
    building_id: buildingId || undefined,
    status: status || undefined,
    unit_type: unitType || undefined,
    page,
    limit: 25,
    sort: "unit_code",
  });

  function resetPage() {
    setPage(1);
  }

  const columns: Column<Unit>[] = [
    {
      header: "Unit",
      primary: true,
      render: (unit) => (
        <>
          <div className="font-medium text-slate-900">{unit.name}</div>
          <div className="font-mono text-[11px] text-slate-400">{unit.unit_code}</div>
        </>
      ),
    },
    {
      header: "Location",
      render: (unit) => (
        <div>
          <div>{unit.site?.name || "—"}</div>
          <div className="text-xs text-slate-400">{unit.building?.name || "No building"}</div>
        </div>
      ),
    },
    { header: "Type", render: (unit) => unit.unit_type.label },
    { header: "Floor", align: "right", render: (unit) => unit.floor || "—" },
    { header: "List price", align: "right", render: (unit) => <Money value={unit.list_price} /> },
    { header: "Status", render: (unit) => <StatusBadge status={unit.status.code} label={unit.status.label} /> },
    { header: "Buyer", render: (unit) => unit.buyer?.name || <span className="text-slate-400">—</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Units"
        description="Every sellable unit of the active company, with its live reservation and sale state."
        actions={can("manage_units") ? <Button onClick={() => navigate("/inventory/units/new")}>New unit</Button> : undefined}
      />

      <FilterBar>
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setAppliedSearch(search.trim());
          }}
        >
          <div className="sm:col-span-2">
            <Field label="Search">
              <SearchInput value={search} onChange={setSearch} placeholder="Unit code, name, site or buyer" />
            </Field>
          </div>
          <Field label="Site">
            <Select value={siteId} onChange={(event) => { setSiteId(event.target.value); setBuildingId(""); resetPage(); }}>
              <option value="">All sites</option>
              {sites.data?.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
            </Select>
          </Field>
          <Field label="Building">
            <Select value={buildingId} disabled={!siteId} onChange={(event) => { setBuildingId(event.target.value); resetPage(); }}>
              <option value="">All buildings</option>
              {buildings.data?.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(event) => { setStatus(event.target.value); resetPage(); }}>
              <option value="">All statuses</option>
              {STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
          </Field>
          <Field label="Type">
            <Select value={unitType} onChange={(event) => { setUnitType(event.target.value); resetPage(); }}>
              <option value="">All types</option>
              {TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
          </Field>
          <div className="sm:col-span-2 lg:col-span-6">
            <Button type="submit" variant="secondary">Apply filters</Button>
          </div>
        </form>
      </FilterBar>

      {units.isError && <ErrorState message={units.error?.message || "Could not load units."} onRetry={() => units.refetch()} />}

      {units.isLoading ? (
        <Spinner />
      ) : (
        <Card>
          <ResponsiveTable
            columns={columns}
            rows={units.data?.data ?? []}
            rowKey={(unit) => String(unit.id)}
            onRowClick={(unit) => navigate(`/inventory/units/${unit.id}`)}
            emptyText="No units match these filters."
          />
          <Pagination meta={units.data?.meta} onPage={setPage} />
        </Card>
      )}
    </div>
  );
}
