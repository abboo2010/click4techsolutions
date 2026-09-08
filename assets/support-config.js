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
window.C4T_SUPABASE_URL = 'https://vaafxtoazxfthapsoicv.supabase.co';
window.C4T_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYWZ4dG9henhmdGhhcHNvaWN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3ODAwODYsImV4cCI6MjEwNDM1NjA4Nn0.hBEcwW7wgePbCACTnz9kpXJ4J-YV0pVX81lzcVHNHGU';
