# LeadSignal AI

Next.js 16 / React 19 application for evidence-backed discovery, research, draft-first outreach, and CRM. No seed data, mock API responses, or fabricated business records are included.

## Run

Use Node 22.13+ (Node 24 recommended).

```sh
npm install
cp .env.example .env.local
npm run dev
```

`npm run build` builds production; `npm start` serves it. `npm test` checks scoring, deduplication and source quote matching.

## Required setup

1. Create a Supabase project. Run `supabase/migrations/001_initial.sql` once in its SQL editor. The migration creates tables, tenant RLS policies, atomic send reservations, request limiting and job claims; it does not insert business data.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel and locally. Only the public Supabase key belongs in a NEXT_PUBLIC variable.
3. Generate a 32-byte encryption key with `openssl rand -hex 32`; save as `CREDENTIAL_ENCRYPTION_KEY`. Do not rotate without re-encrypting existing user settings.
4. Set `OUTBOUND_ALLOWED_HOSTS` to comma-separated exact hostnames of your AI and MCP endpoints. HTTPS only; redirects and private addresses are rejected. Deploy behind an egress policy in environments requiring DNS-rebinding protection.
5. Sign up in the app. Confirm the email if Supabase confirmation is enabled, then sign in.
6. In Settings, save an OpenAI-compatible API base URL ending in `/v1`, model and key. Gemini Web2API-compatible providers are supported. The app appends `/chat/completions`.
7. Save a Composio API key OR a Streamable HTTP MCP URL. Credential fields are encrypted with AES-256-GCM before database storage, never returned decrypted to the browser, and never logged.
8. Composio account connections must be associated with the app's Supabase user UUID displayed in Settings. A ChatGPT Composio connection is not automatically a connection in this separately deployed app. Connect desired accounts in your Composio project using that external user ID.
9. Verify the connection in Integrations. Review discovered tool descriptions and JSON schemas. Approve only read-only search/research tools by exact slug in Settings. This allowlist is an explicit operator trust boundary: never approve sending/deletion tools for research.
10. Configure channel action bindings using the actual discovered tool schemas. No tool slug or provider payload is invented. Each binding identifies `tool`, `recipient_field`, `body_field`, optional `subject_field`, `message_id_path`, and optional `thread_id_path`. Nested response ID paths use dot notation. `gmail_replies` also needs `thread_field`, and its tool must be on the read allowlist. Unsupported or unmapped actions show manual outreach required.

## Workflow

Submit a natural-language search and filters. It creates a persistent database job. Lead Search → Run next job processes one job: discovery first, then one company per research job. Source output is parsed by the configured AI, but names, URLs and quotations must exist in the live source text before records are accepted. Signals earn points programmatically, once per signal type, only with a matched quote, a URL and confidence >= 0.8. Signal interpretation and confidence are AI-assisted, not human verification; inspect the evidence before outreach.

Leads deduplicate by normalized website domain, then place ID, social URL or normalized name and location. Database uniqueness protects concurrent inserts. Research saves contacts and social links only when present in the source output. Review lead detail, generate outreach, edit recipient/body, then explicitly send. There is no automatic mass-send path. CRM supports drag/drop and accessible stage selectors.

Gmail replies are read from persisted provider thread IDs and classified from actual reply text. Sending stops after a recorded reply. Atomic SQL reservations enforce tenant daily limits, minimum delays and recipient deduplication. Uncertain external outcomes are marked `unknown` and blocked from retries; reconcile in the provider before changing state. The daily cap uses UTC. No email is sent during build or tests.

## Background operation

An optional daily Vercel cron processes one oldest queued job. Configure both `CRON_SECRET` (a long random value) and `SUPABASE_SERVICE_ROLE_KEY` server-side. The cron route checks a Bearer secret and only the service role can claim another user's job. Vercel Hobby cron is deliberately daily, not minute-by-minute. Manual processing is available without service-role credentials. Stale running jobs are marked failed on the next claim instead of replayed silently.

## Current boundaries

This is a configurable MVP implementation, not a claim of verified production integration. Live Supabase, AI, Composio sending and reply tests require the owner's credentials. Supported tools and permissions determine source coverage. Search creates a discovery job per selected source. Each invokes one approved matching tool; it does not guarantee 20–100 candidates or exhaustive provider pagination. Unsupported sources fail visibly. Filters are supplied to the live tool planner; unverified age/employee attributes remain unknown. Research is one live tool call per candidate, not an exhaustive autonomous crawler. Tool arguments are generated from the discovered schema and validated by the provider.

The initial lists load at most 500 rows per collection; dashboard counts are separately computed with exact database counts. Campaigns queue searches, persist attribution and display real metrics; sending remains manual. The daily cron runs research jobs, not autonomous reply synchronization or campaign sending. Gmail reply sync reads at most 10 sent threads per invocation. AI evidence confidence is not independent source verification. No launch date, founder, follower count or ad activity is invented when absent.

## Deployment

Deploy as Next.js on Vercel with `npm install` / `npm run build`. Apply the Supabase migration before configuring the app. A deployment without environment variables intentionally shows setup and empty states. Vercel, Supabase, Composio and the chosen AI provider have independent quotas and terms; free deployment does not imply unlimited free third-party API usage.

## Validation

Production build and TypeScript check; seven deterministic domain tests. No live message sends are used as tests. Actual connected-account flows must be validated after owner setup. Browser verification status is recorded in the delivery message if unavailable.
