// Shared Supabase client + auth helpers for all support-ticket functions.
// Uses the service_role key — this file must NEVER run in the browser,
// only inside Netlify Functions (server-side). Same pattern as the CMS's
// _supabase.js.
const { createClient } = require('@supabase/supabase-js');

let client = null;

function getSupabase() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  client = createClient(url, serviceKey, {
    auth: { persistSession: false }
  });
  return client;
}

// Simple constant-time-ish comparison for the admin password. Matches the
// pattern used by the CMS's admin panel (single shared ADMIN_PASSWORD).
function checkAdminPassword(candidate) {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) return false;
  if (typeof candidate !== 'string') return false;
  if (candidate.length !== real.length) return false;
  let diff = 0;
  for (let i = 0; i < real.length; i++) {
    diff |= candidate.charCodeAt(i) ^ real.charCodeAt(i);
  }
  return diff === 0;
}

// Verifies the Supabase Auth JWT a logged-in client sends in the
// Authorization header ("Bearer <token>") and returns the Supabase user
// object ({ id, email, ... }) if valid, or null if missing/invalid/expired.
// This is how each function knows WHICH client is calling, without ever
// trusting a client_id the browser could simply lie about in the request
// body — the id always comes from the verified token, never from input.
async function getUserFromRequest(event) {
  const authHeader = event.headers && (event.headers.authorization || event.headers.Authorization);
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data || !data.user) return null;
  return data.user;
}

module.exports = { getSupabase, checkAdminPassword, getUserFromRequest };
