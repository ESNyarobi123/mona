import { orderProgress } from "../../../lib/admin-dashboard";

export function AdminProgressBar({ status }: { status: string }) {
  const pct = orderProgress(status);
  return (
    <div className="admin-progress">
      <div className="admin-progress__track">
        <div className="admin-progress__fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="admin-progress__pct">{pct}%</span>
    </div>
  );
}
