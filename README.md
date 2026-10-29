# CODE GenZ Family

React/Vite application using Supabase Auth, PostgreSQL RLS and server-side account administration.

```sh
npm ci
npm test
npm run lint
npm run dev
```

Copy `.env.example` to a local environment file. Only Supabase URL and publishable key belong in browser configuration; never expose a service-role key.

The Supabase integration is live at https://codegenzfam.vercel.app. Existing accounts have been imported into Supabase Auth. Administrators are exempt from email confirmation; other accounts require administrator approval, and new registrations remain pending until approved. First-login password changes are disabled in the current fix; an explicit administrator password reset still requires a password change. See [deployment, migration, verification and remaining data work](docs/SUPABASE_CUTOVER.md).

AI uses the existing server routes and supports a direct Gemini key or Vercel AI Gateway OIDC. AI Gateway account verification remains a separate provider requirement.
