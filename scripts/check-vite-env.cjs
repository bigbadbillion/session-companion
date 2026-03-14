/**
 * Vite only inlines VITE_* at `vite build` time. On Vercel, fail if missing so
 * logs explain broken same-origin WebSocket. Local dev skips (proxy to :8000).
 */
const onVercel = process.env.VERCEL === "1";
const v = (process.env.VITE_BACKEND_URL || "").trim();
if (onVercel && !v) {
  console.error(
    "\n[prebuild] VITE_BACKEND_URL is missing on Vercel.\n" +
      "  Dashboard → Env Vars → add for Production. Redeploy.\n" +
      "  If prelude.echovault.me is NOT built on this Vercel project (e.g. Lovable/EchoVault),\n" +
      "  set VITE_BACKEND_URL in THAT product’s env — Vercel vars never reach other builders.\n"
  );
  process.exit(1);
}
if (onVercel) console.log("[prebuild] VITE_BACKEND_URL ok (" + v.length + " chars)");
