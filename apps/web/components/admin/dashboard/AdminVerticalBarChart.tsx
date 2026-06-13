type Item = {
  label: string;
  value: number;
  tone?: "accent" | "restaurant" | "grocery" | "default";
};

type Props = {
  title: string;
  items: Item[];
};

export function AdminVerticalBarChart({ title, items }: Props) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <article className="admin-vchart">
      <div className="admin-vchart__head">
        <h3 className="admin-vchart__title">{title}</h3>
      </div>
      <div className="admin-vchart__bars">
        {items.map((item) => (
          <div key={item.label} className="admin-vchart__col">
            <div className="admin-vchart__bar-wrap">
              <div
                className={`admin-vchart__bar admin-vchart__bar--${item.tone ?? "default"}`}
                style={{ height: `${Math.max(8, (item.value / max) * 100)}%` }}
                title={`${item.label}: ${item.value}`}
              />
            </div>
            <span className="admin-vchart__label">{item.label}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
