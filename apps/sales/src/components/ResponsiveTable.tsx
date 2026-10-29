import type { ReactNode } from "react";

export interface Column<T> {
  header: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
  primary?: boolean;
  mobileHidden?: boolean;
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  emptyText?: ReactNode;
  density?: "comfortable" | "compact";
}

/** A real table on md+ and stacked cards on phones. */
export function ResponsiveTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyText = "No records found.",
  density = "comfortable",
}: ResponsiveTableProps<T>) {
  if (rows.length === 0) {
    return <div className="px-4 py-10 text-center text-sm text-slate-400">{emptyText}</div>;
  }

  const foundIndex = columns.findIndex((column) => column.primary);
  const primaryIndex = foundIndex >= 0 ? foundIndex : 0;
  const primary = columns[primaryIndex];
  const secondary = columns.filter((_, index) => index !== primaryIndex && !columns[index].mobileHidden);
  const headerSpacing = density === "compact" ? "px-4 py-2 text-[10px]" : "px-5 py-3 text-[11px]";
  const cellSpacing = density === "compact" ? "px-4 py-2" : "px-5 py-3.5";

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm tabular-nums">
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={`whitespace-nowrap border-b border-slate-200 bg-slate-50/70 ${headerSpacing} font-semibold uppercase tracking-[0.06em] text-slate-500 ${column.align === "right" ? "text-right" : "text-left"}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={rowKey(row, index)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onRowClick(row);
                  }
                } : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                className={onRowClick ? "cursor-pointer transition-colors hover:bg-brand-50/60" : ""}
              >
                {columns.map((column, columnIndex) => (
                  <td key={columnIndex} className={`border-b border-slate-100 ${cellSpacing} text-slate-700 ${column.align === "right" ? "text-right" : ""}`}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 md:hidden">
        {rows.map((row, index) => (
          <div
            key={rowKey(row, index)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            onKeyDown={onRowClick ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onRowClick(row);
              }
            } : undefined}
            role={onRowClick ? "button" : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            className={`px-4 py-4 ${onRowClick ? "cursor-pointer active:bg-brand-50/60" : ""}`}
          >
            <div className="font-medium text-slate-900">{primary.render(row)}</div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              {secondary.map((column, columnIndex) => (
                <div key={columnIndex} className="min-w-0">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{column.header}</dt>
                  <dd className="break-words text-sm text-slate-700">{column.render(row)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}
