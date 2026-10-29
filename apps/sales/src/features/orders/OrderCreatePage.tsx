import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { formatMoney, useAuth } from "@mkuyu/core";
import {
  useBuyer,
  useBuyers,
  useCreateOrder,
  useOrder,
  useUnit,
  useUnits,
  useUpdateOrder,
} from "@mkuyu/sales";
import { useToast } from "../../components/Toast";
import {
  BackButton,
  Button,
  Card,
  CardHeader,
  DetailList,
  DetailRow,
  Field,
  Input,
  Money,
  PageHeader,
  SearchInput,
  Select,
  Spinner,
  StatusBadge,
  Textarea,
} from "../../components/ui";

type PaymentType = "full" | "down_payment";

export function OrderCreatePage() {
  const { orderId } = useParams();
  const editing = Boolean(orderId);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { push } = useToast();
  useAuth();

  const existing = useOrder(orderId);
  const [buyerId, setBuyerId] = useState(searchParams.get("partner_id") || "");
  const [unitId, setUnitId] = useState(searchParams.get("unit_id") || "");
  const [buyerSearch, setBuyerSearch] = useState("");
  const [unitSearch, setUnitSearch] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType>("full");
  const [unitPrice, setUnitPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [notes, setNotes] = useState("");
  const [clientRef, setClientRef] = useState("");
  const [error, setError] = useState("");
  const prefilled = useRef(false);

  const buyers = useBuyers({ search: buyerSearch || undefined, page: 1, limit: 50 });
  const units = useUnits({ search: unitSearch || undefined, page: 1, limit: 100, sort: "unit_code" });
  const selectedBuyer = useBuyer(buyerId || undefined);
  const selectedUnit = useUnit(unitId || undefined);
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const busy = createOrder.isPending || updateOrder.isPending;

  useEffect(() => {
    if (prefilled.current || !editing || !existing.data) return;
    const order = existing.data;
    prefilled.current = true;
    setBuyerId(String(order.partner?.id ?? ""));
    setUnitId(String(order.unit?.id ?? ""));
    const type: PaymentType = order.payment_type === "down_payment" ? "down_payment" : "full";
    setPaymentType(type);
    const line = order.lines[0];
    if (type === "full") setUnitPrice(line ? line.price_unit.amount : order.unit?.list_price.amount || "");
    else setDownPayment(line ? line.price_unit.amount : "");
    setDiscount(line ? String(line.discount || "") : "");
    setNotes(order.notes || "");
    setClientRef(order.client_order_ref || "");
  }, [editing, existing.data]);

  useEffect(() => {
    if (!selectedUnit.data || editing) return;
    setUnitPrice(selectedUnit.data.list_price.amount);
  }, [selectedUnit.data, editing]);

  const listPrice = Number(selectedUnit.data?.list_price.amount || 0);
  const price = Number(unitPrice || 0);
  const down = Number(downPayment || 0);
  const discountValue = Number(discount || 0);
  const currency = selectedUnit.data?.list_price.currency || "TZS";
  const lineTotal = paymentType === "full" ? price : down;
  const total = lineTotal * (1 - discountValue / 100);
  const priceBelowList = paymentType === "full" && listPrice > 0 && price < listPrice;
  const needsApproval = discountValue > 8 || priceBelowList;
  const canSave = Boolean(buyerId && unitId) && (paymentType === "full" ? price > 0 : down > 0);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const body = {
      partner_id: Number(buyerId),
      unit_id: Number(unitId),
      payment_type: paymentType,
      unit_price: paymentType === "full" ? price : null,
      discount: discountValue,
      down_payment: paymentType === "down_payment" ? down : null,
      notes,
      client_order_ref: clientRef,
    };
    try {
      if (editing && orderId) {
        const updated = await updateOrder.mutateAsync({ id: Number(orderId), body });
        push("Quotation updated.", "success");
        navigate(`/orders/${updated.id}`);
      } else {
        const created = await createOrder.mutateAsync(body);
        push("Quotation created. Review it and confirm when ready.", "success");
        navigate(`/orders/${created.id}`);
      }
    } catch (caught) {
      const message = (caught as Error).message;
      setError(message);
      push(message, "error");
    }
  }

  if (editing && existing.isLoading) return <Spinner label="Loading quotation…" />;

  return (
    <div>
      <PageHeader
        title={editing ? "Edit quotation" : "New quotation"}
        description="Choose the buyer and unit, then agree the price. Odoo applies the approval rules."
        actions={<BackButton label="Back to orders" />}
      />

      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="1 · Buyer" subtitle="Pick an existing contact or create one first" />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Find a buyer">
                <SearchInput value={buyerSearch} onChange={setBuyerSearch} placeholder="Name, phone, customer ID…" />
              </Field>
              <Field label="Buyer" required>
                <Select value={buyerId} onChange={(event) => setBuyerId(event.target.value)}>
                  <option value="">Choose a buyer</option>
                  {selectedBuyer.data && !buyers.data?.data.some((buyer) => buyer.id === selectedBuyer.data?.id) && (
                    <option value={selectedBuyer.data.id}>{selectedBuyer.data.name}</option>
                  )}
                  {buyers.data?.data.map((buyer) => (
                    <option key={buyer.id} value={buyer.id}>{buyer.name}{buyer.phone ? ` · ${buyer.phone}` : ""}</option>
                  ))}
                </Select>
              </Field>
              {selectedBuyer.data && (
                <div className="sm:col-span-2 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                  <p className="font-medium text-slate-800">{selectedBuyer.data.name}</p>
                  <p className="text-xs text-slate-500">{selectedBuyer.data.phone || "No phone"} · {selectedBuyer.data.email || "No email"} · {selectedBuyer.data.customer_id || "No customer ID"}</p>
                </div>
              )}
              <div className="sm:col-span-2">
                <Button type="button" variant="ghost" onClick={() => navigate("/buyers/new")}>+ Create a new buyer</Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="2 · Unit" subtitle="The unit being quoted" />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Find a unit">
                <SearchInput value={unitSearch} onChange={setUnitSearch} placeholder="Unit code, name, site or buyer" />
              </Field>
              <Field label="Unit" required>
                <Select value={unitId} onChange={(event) => setUnitId(event.target.value)}>
                  <option value="">Choose a unit</option>
                  {selectedUnit.data && !units.data?.data.some((unit) => unit.id === selectedUnit.data?.id) && (
                    <option value={selectedUnit.data.id}>{selectedUnit.data.unit_code} · {selectedUnit.data.name}</option>
                  )}
                  {units.data?.data.map((unit) => (
                    <option key={unit.id} value={unit.id}>{unit.unit_code} · {unit.name} · {unit.status.label}</option>
                  ))}
                </Select>
              </Field>
              {selectedUnit.data && (
                <div className="sm:col-span-2 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-800">{selectedUnit.data.name}</p>
                      <p className="font-mono text-xs text-slate-500">{selectedUnit.data.unit_code}</p>
                      <p className="mt-1 text-xs text-slate-500">{selectedUnit.data.site?.name || "No site"} · {selectedUnit.data.building?.name || "No building"} · Floor {selectedUnit.data.floor || "—"}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={selectedUnit.data.status.code} label={selectedUnit.data.status.label} />
                      <p className="mt-1 text-sm font-semibold text-slate-900"><Money value={selectedUnit.data.list_price} /></p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="3 · Payment and price" subtitle="A deposit order can get an installment plan after confirmation" />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Payment type</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => setPaymentType("full")} className={`rounded-xl border px-4 py-3 text-left transition-colors ${paymentType === "full" ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50"}`}>
                    <p className="text-sm font-semibold text-slate-900">Full payment</p>
                    <p className="mt-0.5 text-xs text-slate-500">The buyer pays the whole unit price.</p>
                  </button>
                  <button type="button" onClick={() => setPaymentType("down_payment")} className={`rounded-xl border px-4 py-3 text-left transition-colors ${paymentType === "down_payment" ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50"}`}>
                    <p className="text-sm font-semibold text-slate-900">Down payment</p>
                    <p className="mt-0.5 text-xs text-slate-500">Confirm the deposit, then create installments.</p>
                  </button>
                </div>
              </div>

              {paymentType === "full" ? (
                <Field label={`Unit price (${currency})`} hint="Defaults to the unit list price">
                  <Input type="number" min={0} step="0.01" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} />
                </Field>
              ) : (
                <Field label={`Down payment (${currency})`} hint="Becomes the down-payment order total">
                  <Input type="number" min={0} step="0.01" value={downPayment} onChange={(event) => setDownPayment(event.target.value)} />
                </Field>
              )}
              <Field label="Discount (%)" hint="Above 8% needs Sales Director and Finance Head approval">
                <Input type="number" min={0} max={100} step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} />
              </Field>
              <Field label="Customer reference">
                <Input value={clientRef} onChange={(event) => setClientRef(event.target.value)} placeholder="Optional" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Notes">
                  <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Terms or internal notes…" />
                </Field>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="lg:sticky lg:top-6">
            <CardHeader title="Summary" subtitle="Before tax" />
            <DetailList>
              <DetailRow label="Buyer" value={selectedBuyer.data?.name || "Not selected"} />
              <DetailRow label="Unit" value={selectedUnit.data?.unit_code || "Not selected"} />
              <DetailRow label="Payment" value={paymentType === "full" ? "Full payment" : "Down payment"} />
              <DetailRow label={paymentType === "full" ? "Price" : "Down payment"} value={formatMoney({ amount: String(lineTotal || 0), currency })} />
              <DetailRow label="Discount" value={`${discountValue || 0}%`} />
              <DetailRow label="Total before tax" value={<span className="text-base font-semibold">{formatMoney({ amount: String(total || 0), currency })}</span>} />
            </DetailList>
            <div className="px-5 pb-5">
              {needsApproval && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-5 text-amber-800">
                  This price needs <strong>Sales Director</strong> and <strong>Finance Head</strong> approval before it can be confirmed.
                  {priceBelowList && <span className="mt-1 block">The price is below the unit list price.</span>}
                </div>
              )}
              {error && <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              <Button type="submit" className="w-full" disabled={!canSave || busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create quotation"}</Button>
              <Button type="button" variant="secondary" className="mt-2 w-full" onClick={() => navigate(-1)}>Cancel</Button>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
