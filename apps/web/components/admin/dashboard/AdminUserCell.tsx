import { userDisplayName, userInitials } from "../../../lib/admin-dashboard";

type Props = {
  name: string | null | undefined;
  phone?: string;
  sub?: string;
};

export function AdminUserCell({ name, phone, sub }: Props) {
  const display = userDisplayName(name, phone);
  return (
    <div className="admin-user-cell">
      <span className="admin-user-cell__avatar" aria-hidden>
        {userInitials(name, phone)}
      </span>
      <span className="admin-user-cell__text">
        <strong>{display}</strong>
        {sub ? <small>{sub}</small> : phone && name ? <small>{phone}</small> : null}
      </span>
    </div>
  );
}
