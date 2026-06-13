# apps/admin

Optional standalone Admin panel.

For the MVP, admin pages live inside `apps/web` under the `(admin)` route group.
Split them out into this separate Next.js app only when the admin needs its own
deployment, domain, or auth boundary.
