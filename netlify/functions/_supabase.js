// Shared Supabase client helper for all CMS functions.
// Uses the service_role key — this file must NEVER run in the browser,
// only inside Netlify Functions (server-side).
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

// Simple constant-time-ish comparison for the admin password. Not perfect
// timing-safety, but this matches the existing pattern used across the
// other Click4Tech-built CMS admin panels (single shared ADMIN_PASSWORD).
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

module.exports = { getSupabase, checkAdminPassword };
