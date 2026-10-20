/** Daily bar chart (same look as Book Knowledge). data: [{ date, count }]. Pure markup - works in server components. */
export function BarChart({ data = [], height = 160, label = "Counts per day" }) {
  const max = Math.max(1, ...data.map((d) => d.count || 0));
  return (
    <div className="flex items-end gap-[3px]" style={{ height }} role="img" aria-label={label}>
      {data.map((d) => (
        <div key={d.date} className="group relative flex-1">
          <div
            className="w-full rounded-t bg-gradient-to-t from-[#c4511f] to-[#de7a4d] transition group-hover:from-[#b0451a] group-hover:to-[#c4511f]"
            style={{ height: Math.max(3, ((d.count || 0) / max) * height) }}
            title={`${d.date}: ${d.count || 0}`}
          />
          <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
            {d.count || 0}
          </span>
        </div>
      ))}
    </div>
  );
}
