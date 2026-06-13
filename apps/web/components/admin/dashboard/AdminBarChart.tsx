type Item = {
  label: string;
  value: number;
  tone?: "restaurant" | "grocery" | "accent" | "default";
};

export function AdminBarChart({ items, title }: { items: Item[]; title: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="admin-barchart">
      <h3 className="admin-barchart__title">{title}</h3>
      <ul className="admin-barchart__list">
        {items.map((item) => (
          <li key={item.label} className="admin-barchart__row">
            <div className="admin-barchart__meta">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
            <div className="admin-barchart__track">
              <span
                className={`admin-barchart__fill admin-barchart__fill--${item.tone ?? "default"}`}
                style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
