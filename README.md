# CODE GenZ Family

React/Vite application using Supabase Auth, PostgreSQL RLS and server-side account administration.

```sh
npm ci
npm test
npm run lint
npm run dev
```

Copy `.env.example` to a local environment file. Only Supabase URL and publishable key belong in browser configuration; never expose a service-role key.

The migration is staged, not a completed production cutover. See [deployment, source-data migration, verification and outstanding blockers](docs/SUPABASE_CUTOVER.md). The existing production website must remain live until the source records are imported and verified and the privileged endpoints are approved and deployed.

AI uses the existing server routes and supports a direct Gemini key or Vercel AI Gateway OIDC. AI Gateway account verification remains a separate provider requirement.
