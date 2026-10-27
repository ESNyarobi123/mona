// Canonical session/profile endpoint.
//
// Why not just use /api/auth? It used to be 301'd to /api/auth/ by nginx while
// Next.js 308'd /api/auth/ back to /api/auth. Browsers cached that permanent
// redirect, so `fetch("/api/auth")` failed forever with "Failed to fetch" and
// every guard signed the user out. This path was never redirected, so it stays
// valid even in browsers holding the poisoned cache entry.
export { GET, PATCH } from "../route";
