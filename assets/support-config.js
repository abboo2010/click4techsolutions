// Client-side Supabase config for the support portal (login/signup pages).
//
// These two values are SAFE to be public — the anon key is meant to be
// embedded in browser code. It can only do what the RLS policies in
// support-schema.sql allow (a logged-in client can only ever see/insert
// their own tickets and messages) — it can never read other clients' data
// or bypass the rules, unlike the service_role key used inside the Netlify
// Functions, which must never appear in any file that reaches the browser.
//
// Fill these in from Supabase -> Project Settings -> API:
//   - Project URL         -> window.C4T_SUPABASE_URL
//   - anon / public key   -> window.C4T_SUPABASE_ANON_KEY   (NOT service_role)
window.C4T_SUPABASE_URL = 'https://xxxxxxxxxxxx.supabase.co';
window.C4T_SUPABASE_ANON_KEY = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
