type Segment = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  title: string;
  segments: Segment[];
  centerLabel: string;
  centerValue: string | number;
  actionLabel?: string;
  actionHref?: string;
};

export function AdminDonutChart({
  title,
  segments,
  centerLabel,
  centerValue,
  actionLabel,
  actionHref,
}: Props) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  const stops = segments.map((seg) => {
    const pct = (seg.value / total) * 100;
    const start = offset;
    offset += pct;
    return `${seg.color} ${start}% ${offset}%`;
  });

  return (
    <article className="admin-donut">
      <div className="admin-donut__head">
        <h3 className="admin-donut__title">{title}</h3>
      </div>
      <div className="admin-donut__body">
        <div className="admin-donut__chart-wrap">
          <div
            className="admin-donut__ring"
            style={{ background: `conic-gradient(${stops.join(", ")})` }}
            role="img"
            aria-label={title}
          >
            <div className="admin-donut__center">
              <strong>{centerValue}</strong>
              <span>{centerLabel}</span>
            </div>
          </div>
        </div>
        <ul className="admin-donut__legend">
          {segments.map((seg) => (
            <li key={seg.label}>
              <span className="admin-donut__swatch" style={{ background: seg.color }} />
              <span>{seg.label}</span>
              <strong>{seg.value}</strong>
            </li>
          ))}
        </ul>
      </div>
      {actionLabel && actionHref ? (
        <a href={actionHref} className="admin-donut__action">
          {actionLabel}
        </a>
      ) : null}
    </article>
  );
}
