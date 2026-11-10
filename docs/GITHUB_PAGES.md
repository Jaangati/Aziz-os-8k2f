# GitHub Pages deployment

The frontend is static and runs on GitHub Pages. Supabase Auth, Postgres and Edge Functions provide the backend. No request from this build requires ChatGPT or its hosting. The separate temporary Sites deployment is retained until owner acceptance testing is complete.

Run npm ci, npm run typecheck, npm test and npm run build:pages. The Pages builder updates root index.html, pages-assets and .nojekyll. Commit those generated files with source changes; the existing GitHub Pages main/root publishing setup serves them. Do not put credentials or personal records in this public source repository.

Apply supabase/pages-auth.sql after earlier migrations. JWT requests must match the verified owner's auth.users identity and exactly the supabase:<user-id> record subject. Old bridge access remains solely for compatibility with the temporary server deployment; no bridge key is sent to Pages. Edge Functions verify users through Supabase Auth even though the platform's legacy JWT gate is disabled to support current signing keys.

Deploy atlas-pages-api from supabase/pages-api/index.ts plus contracts.ts, and atlas-pages-vault from supabase/pages-api/vault.ts. Both enforce owner verification themselves. Service credentials remain in Supabase's function environment. The public client contains only the project URL and publishable key.

Set the Supabase Auth Site URL and allowed confirmation/recovery redirect to https://jaangati.github.io/Aziz-os-8k2f/ before using email confirmation or recovery. Existing verified accounts can sign in without a new registration. Browser sessions use the Supabase SDK's persisted session and automatic token refresh; browser storage must be protected from XSS. A GitHub project path shares the jaangati.github.io origin with other Pages projects; restrict auth storage keys, avoid untrusted sibling apps and prefer a dedicated domain later for stronger browser isolation.

AI remains disconnected. Records, existing user subjects and the separate Atlas database are retained. GitHub repository privacy is separate from app data privacy; a hidden URL is never an access control.
