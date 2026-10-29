import { useState } from "react";
import { useAuth } from "@mkuyu/core";
import {
  useCatalogPlans,
  useCatalogProducts,
  useCatalogTaxes,
  useCreateCatalogPlan,
  useCreateCatalogProduct,
  useUpdateCatalogPlan,
  useUpdateCatalogProduct,
} from "@mkuyu/sales";
import type { CatalogProduct, SubscriptionPlan } from "@mkuyu/api";
import { useToast } from "../../components/Toast";
import { ResponsiveTable, type Column } from "../../components/ResponsiveTable";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  Field,
  Input,
  Modal,
  Money,
  PageHeader,
  SearchInput,
  Select,
  Spinner,
  Tabs,
  Textarea,
} from "../../components/ui";

interface ProductForm {
  name: string;
  default_code: string;
  type: string;
  list_price: string;
  recurring_invoice: boolean;
  sale_ok: boolean;
  description: string;
  tax_ids: number[];
}

const EMPTY_PRODUCT: ProductForm = {
  name: "", default_code: "", type: "service", list_price: "0", recurring_invoice: false,
  sale_ok: true, description: "", tax_ids: [],
};

function planLabel(plan: SubscriptionPlan) {
  return `${plan.name} · every ${plan.billing_period_value} ${plan.billing_period_unit}`;
}

export function CatalogPage() {
  const { can } = useAuth();
  const { push } = useToast();
  const [tab, setTab] = useState("products");
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const products = useCatalogProducts({ search: applied || undefined, limit: 200 }, tab === "products");
  const taxes = useCatalogTaxes(tab === "products" || tab === "taxes");
  const plans = useCatalogPlans(tab === "plans");
  const createProduct = useCreateCatalogProduct();
  const updateProduct = useUpdateCatalogProduct();
  const createPlan = useCreateCatalogPlan();
  const updatePlan = useUpdateCatalogPlan();
  const [productOpen, setProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(EMPTY_PRODUCT);
  const [planOpen, setPlanOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planForm, setPlanForm] = useState({ name: "", billing_period_value: "1", billing_period_unit: "month" });
  const canManageProducts = can("manage_catalog_products");
  const canManagePlans = can("manage_catalog_plans");

  function startProduct(product?: CatalogProduct) {
    setEditingProduct(product ?? null);
    setProductForm(product ? {
      name: product.name,
      default_code: product.default_code,
      type: product.type?.code || "service",
      list_price: product.list_price.amount,
      recurring_invoice: product.recurring_invoice,
      sale_ok: product.sale_ok,
      description: product.description,
      tax_ids: product.tax_ids ?? [],
    } : EMPTY_PRODUCT);
    setProductOpen(true);
  }

  async function saveProduct() {
    if (!productForm.name.trim()) {
      push("Product name is required.", "error");
      return;
    }
    const body = {
      name: productForm.name.trim(),
      default_code: productForm.default_code.trim(),
      type: productForm.type,
      list_price: Number(productForm.list_price || 0),
      recurring_invoice: productForm.recurring_invoice,
      sale_ok: productForm.sale_ok,
      description_sale: productForm.description,
      taxes_id: productForm.tax_ids,
    };
    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, body });
        push("Product updated.", "success");
      } else {
        await createProduct.mutateAsync(body);
        push("Product created.", "success");
      }
      setProductOpen(false);
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  function startPlan(plan?: SubscriptionPlan) {
    setEditingPlan(plan ?? null);
    setPlanForm(plan ? {
      name: plan.name,
      billing_period_value: String(plan.billing_period_value),
      billing_period_unit: plan.billing_period_unit,
    } : { name: "", billing_period_value: "1", billing_period_unit: "month" });
    setPlanOpen(true);
  }

  async function savePlan() {
    const body = {
      name: planForm.name.trim(),
      billing_period_value: Number(planForm.billing_period_value || 1),
      billing_period_unit: planForm.billing_period_unit,
    };
    if (!body.name) {
      push("Plan name is required.", "error");
      return;
    }
    try {
      if (editingPlan) {
        await updatePlan.mutateAsync({ id: editingPlan.id, body });
        push("Plan updated.", "success");
      } else {
        await createPlan.mutateAsync(body);
        push("Plan created.", "success");
      }
      setPlanOpen(false);
    } catch (error) {
      push((error as Error).message, "error");
    }
  }

  const productColumns: Column<CatalogProduct>[] = [
    {
      header: "Product",
      primary: true,
      render: (product) => (
        <>
          <div className="font-medium">{product.name}</div>
          <div className="font-mono text-[11px] text-slate-400">{product.default_code || "No code"}</div>
        </>
      ),
    },
    { header: "Type", render: (product) => product.type?.label || "—" },
    { header: "Price", align: "right", render: (product) => <Money value={product.list_price} /> },
    {
      header: "Flags",
      render: (product) => (
        <div className="flex flex-wrap gap-1">
          {product.recurring_invoice && <Badge tone="info">Recurring</Badge>}
          {product.sale_ok && <Badge tone="success">Sales</Badge>}
        </div>
      ),
    },
    ...(canManageProducts ? [{
      header: "",
      align: "right" as const,
      render: (product: CatalogProduct) => <Button variant="ghost" onClick={() => startProduct(product)}>Edit</Button>,
    }] : []),
  ];

  const planColumns: Column<SubscriptionPlan>[] = [
    { header: "Plan", primary: true, render: (plan) => <span className="font-medium">{plan.name}</span> },
    { header: "Billing period", render: (plan) => `Every ${plan.billing_period_value} ${plan.billing_period_unit}` },
    { header: "Active", render: (plan) => <Badge tone={plan.active ? "success" : "neutral"}>{plan.active ? "Active" : "Archived"}</Badge> },
    ...(canManagePlans ? [{
      header: "",
      align: "right" as const,
      render: (plan: SubscriptionPlan) => <Button variant="ghost" onClick={() => startPlan(plan)}>Edit</Button>,
    }] : []),
  ];

  const taxColumns: Column<{ id: number; name: string; amount: number; amount_type: string; price_include: boolean }>[] = [
    { header: "Tax", primary: true, render: (tax) => tax.name },
    { header: "Rate", align: "right", render: (tax) => `${tax.amount}%` },
    { header: "Type", render: (tax) => tax.amount_type },
    { header: "Included", render: (tax) => tax.price_include ? "Yes" : "No" },
  ];

  return (
    <div>
      <PageHeader
        title="Catalog"
        description="Products, taxes and subscription plans used by sales and installments."
        actions={canManageProducts && tab === "products" ? <Button onClick={() => startProduct()}>New product</Button> : canManagePlans && tab === "plans" ? <Button onClick={() => startPlan()}>New plan</Button> : undefined}
      />
      <Tabs
        tabs={[{ value: "products", label: "Products" }, { value: "plans", label: "Plans" }, { value: "taxes", label: "Taxes" }]}
        value={tab}
        onChange={setTab}
      />

      {tab === "products" && (
        <>
          <Card className="mb-4 p-4">
            <Field label="Search"><SearchInput value={search} onChange={setSearch} placeholder="Name or code" className="max-w-md" /></Field>
            <div className="mt-2"><Button variant="secondary" onClick={() => setApplied(search.trim())}>Search</Button></div>
          </Card>
          {products.isError && <ErrorState message={products.error?.message || "Could not load products."} />}
          {products.isLoading ? <Spinner /> : (
            <Card>
              <ResponsiveTable columns={productColumns} rows={products.data?.data ?? []} rowKey={(product) => String(product.id)} emptyText="No products." />
            </Card>
          )}
        </>
      )}

      {tab === "plans" && (
        plans.isLoading ? <Spinner /> : (
          <Card>
            <CardHeader title="Subscription plans" subtitle="The monthly plan is used by the installment wizard" />
            <ResponsiveTable columns={planColumns} rows={plans.data ?? []} rowKey={(plan) => String(plan.id)} emptyText="No plans." />
          </Card>
        )
      )}

      {tab === "taxes" && (
        taxes.isLoading ? <Spinner /> : (
          <Card>
            <CardHeader title="Sale taxes" subtitle="Configured in Odoo Accounting" />
            <ResponsiveTable columns={taxColumns} rows={taxes.data ?? []} rowKey={(tax) => String(tax.id)} emptyText="No sale taxes." />
          </Card>
        )
      )}

      <Modal
        open={productOpen}
        onClose={() => setProductOpen(false)}
        title={editingProduct ? "Edit product" : "New product"}
        wide
        footer={<><Button variant="secondary" onClick={() => setProductOpen(false)}>Cancel</Button><Button onClick={saveProduct} disabled={createProduct.isPending || updateProduct.isPending}>Save</Button></>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Name" required><Input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></Field></div>
          <Field label="Default code"><Input value={productForm.default_code} onChange={(event) => setProductForm({ ...productForm, default_code: event.target.value })} /></Field>
          <Field label="Type">
            <Select value={productForm.type} onChange={(event) => setProductForm({ ...productForm, type: event.target.value })}>
              <option value="service">Service</option>
              <option value="consu">Consumable</option>
              <option value="product">Storable</option>
            </Select>
          </Field>
          <Field label="Sales price"><Input type="number" min={0} step="0.01" value={productForm.list_price} onChange={(event) => setProductForm({ ...productForm, list_price: event.target.value })} /></Field>
          <div className="space-y-2 pt-6">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={productForm.sale_ok} onChange={(event) => setProductForm({ ...productForm, sale_ok: event.target.checked })} /> Sales OK</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={productForm.recurring_invoice} onChange={(event) => setProductForm({ ...productForm, recurring_invoice: event.target.checked })} /> Recurring</label>
          </div>
          <div className="sm:col-span-2">
            <Field label="Sale taxes">
              <div className="flex flex-wrap gap-3">
                {(taxes.data ?? []).map((tax) => (
                  <label key={tax.id} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={productForm.tax_ids.includes(tax.id)}
                      onChange={(event) => setProductForm({
                        ...productForm,
                        tax_ids: event.target.checked
                          ? [...productForm.tax_ids, tax.id]
                          : productForm.tax_ids.filter((id) => id !== tax.id),
                      })}
                    />
                    {tax.name} ({tax.amount}%)
                  </label>
                ))}
              </div>
            </Field>
          </div>
          <div className="sm:col-span-2"><Field label="Description"><Textarea value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} /></Field></div>
        </div>
      </Modal>

      <Modal
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        title={editingPlan ? "Edit plan" : "New plan"}
        footer={<><Button variant="secondary" onClick={() => setPlanOpen(false)}>Cancel</Button><Button onClick={savePlan} disabled={createPlan.isPending || updatePlan.isPending}>Save</Button></>}
      >
        <div className="space-y-4">
          <Field label="Plan name" required><Input value={planForm.name} onChange={(event) => setPlanForm({ ...planForm, name: event.target.value })} /></Field>
          <Field label="Every"><Input type="number" min={1} value={planForm.billing_period_value} onChange={(event) => setPlanForm({ ...planForm, billing_period_value: event.target.value })} /></Field>
          <Field label="Period">
            <Select value={planForm.billing_period_unit} onChange={(event) => setPlanForm({ ...planForm, billing_period_unit: event.target.value })}>
              <option value="month">Month</option>
              <option value="year">Year</option>
              <option value="week">Week</option>
              <option value="day">Day</option>
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
