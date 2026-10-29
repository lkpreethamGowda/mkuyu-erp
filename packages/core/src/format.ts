import type { Money } from "@mkuyu/api";

const currencyFormatters = new Map<string, Intl.NumberFormat>();

function formatterFor(currency: string): Intl.NumberFormat {
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      });
    } catch {
      formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
    }
    currencyFormatters.set(currency, formatter);
  }
  return formatter;
}

export function formatMoney(money?: Money | null): string {
  if (!money || money.amount === undefined || money.amount === null) return "—";
  const value = Number(money.amount);
  if (Number.isNaN(value)) return `${money.amount} ${money.currency}`;
  return formatterFor(money.currency || "TZS").format(value);
}

export function formatMoneyList(values?: Money[] | null): string {
  if (!values?.length) return "—";
  return values.map(formatMoney).join(" · ");
}

export function formatAmount(amount?: string | number | null, currency = "TZS"): string {
  if (amount === undefined || amount === null || amount === "") return "—";
  return formatMoney({ amount: String(amount), currency });
}

export function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

/** Local calendar date as YYYY-MM-DD (avoids the UTC day shift of toISOString). */
export function isoDate(value: Date = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPercent(value?: number | null): string {
  if (value === undefined || value === null) return "—";
  return `${Math.round(value * 100)}%`;
}

/** Draft invoices and credit notes have no number yet. */
export function documentName(document?: { name?: string | null; state?: { code?: string } } | null): string {
  if (document?.name) return document.name;
  return document?.state?.code === "draft" ? "Draft" : "—";
}

export function titleCase(value?: string | null): string {
  if (!value) return "—";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

export function statusTone(status?: string | null): StatusTone {
  switch ((status || "").toLowerCase()) {
    case "paid":
    case "posted":
    case "invoiced":
    case "sale":
    case "done":
    case "confirmed":
    case "handed_over":
    case "handed over":
    case "available":
    case "active":
      return "success";
    case "cancel":
    case "cancelled":
    case "rejected":
      return "danger";
    case "draft":
    case "sent":
    case "pending":
    case "not_paid":
    case "partial":
    case "reserved":
      return "warning";
    case "sold":
    case "to invoice":
      return "info";
    default:
      return "neutral";
  }
}

export function initials(name?: string | null): string {
  return (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return fallback;
}
