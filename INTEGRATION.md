# ResPy Admin ↔ API Integration

Base URL: `https://res-py-apis-2aa637410d3d.herokuapp.com/api/v1`  
Configured via `VITE_API_URL` in `.env`.

Envelope: `{ success, message, data, meta? }`  
Auth tokens stored in `localStorage`: `respy_access_token`, `respy_refresh_token`, `respy_org_id`, `respy_user`.

Client helpers: `src/lib/api/client.ts` (request + unwrap), `src/lib/api/resources.ts` (domain fetchers).

## Auth

| Action | Endpoint |
|--------|----------|
| Login | `POST /auth/login` |
| Me | `GET /auth/me` |
| Refresh | `POST /auth/refresh` |
| Logout | `POST /auth/logout` |

## Wired pages

| Page | Endpoint(s) |
|------|-------------|
| Dashboard | `GET /admin/dashboard` (KPIs, `trends.*`, `topSuppliers`, `topRestaurants`, `recentActivity`), `GET /rfqs`, `GET /ai/fraud-signals` |
| Activity | `GET /admin/activity` → fallback `GET /admin/audit-logs` |
| Restaurants | `GET /organizations?type=restaurant` → fallback `GET /admin/users` |
| Suppliers | `GET /organizations?type=supplier` → fallback `GET /admin/users` |
| KYC | `GET /kyc/applications` |
| RFQs | `GET /rfqs` |
| Quotations | `GET /quotations` |
| Purchase orders | `GET /purchase-orders` |
| Deliveries | `GET /deliveries` |
| Invoices | `GET /invoices` |
| Commissions | `GET /admin/commissions`; settle `PATCH /admin/commissions/:id` |
| Catalog | `GET /catalog/products` |
| Categories | `GET /catalog/categories` |
| Roles | `GET /admin/roles` |
| Audit logs | `GET /admin/audit-logs` |
| Support | `GET /support` |
| Communications | `GET /chat/conversations` → fallback `/support` → `/notifications` |
| Notifications | `GET /notifications` |
| CMS | `GET /cms` |
| Subscriptions | `GET /subscriptions` |
| Files | `GET /files` (empty until list API available) |
| Marketing | `GET /marketing` |
| Reports | `GET /reports/procurement`, `/reports/catalog`, `/reports/finance` |
| Fraud | `GET /ai/fraud-signals` |
| AI Center | `GET /ai/recommendations`, `/ai/demand-forecast`, `/ai/price-prediction` |
| Payments | `GET /payments/wallet/transactions` → fallback `/payments/wallet` |
| API keys | `GET /admin/api-keys`; create `POST /admin/api-keys` (plaintext once); revoke `DELETE /admin/api-keys/:id` |
| Settings | `GET /admin/settings`, `GET /admin/feature-flags` |

## Notes

- No mock data modules remain (`mock-data.ts` / `mock-data-extra.ts` removed).
- KPIs are computed from fetched rows or dashboard aggregates — never hardcoded currency/counts.
- Charts render **"No data"** when trend arrays are missing; values are never invented.
- Dashboard maps `restaurants` / `suppliers` from enriched dashboard fields (not `organizations` / `users`).
- API key plaintext is shown only in the create toast; table rows use `keyPrefix` / id only.

Demo login hint: `sarah@primeplate.io` / `ChangeMeNow!123`
