# MEWAY V7.31.19 — access updates with zero D1 reads on ordinary launches

1. In Cloudflare dashboard open Workers & Pages → KV → Create namespace. Name it `meway-access-signals`.
2. Open your MEWAY Worker → Settings → Bindings → Add → KV namespace. Set **Variable name** `ACCESS_SIGNALS`, choose `meway-access-signals`.
3. Deploy this version of the project. If Wrangler is used, add a `kv_namespaces` binding with the real namespace ID from Cloudflare to wrangler.jsonc before deploying. Never invent a namespace ID.
4. Admin grants access → D1 write + KV write. Student reopening app → one authenticated Worker request and one KV read, zero D1 reads on access-signal path. A grant can take up to about 60 seconds (or longer with caches) to propagate to other Cloudflare regions.
5. If KV is missing, access-signal endpoint responds 503 and admin grant reports an error. Set up KV BEFORE using this release.

**Limits:** This design does not mean zero Cloudflare requests on ordinary launches. Every successful cached launch checks KV. A new student or expired Discord token may still require normal bootstrap D1 reads. Server-side authorization must continue checking current access where required.
