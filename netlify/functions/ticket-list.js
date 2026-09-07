// GET /.netlify/functions/ticket-list
//
// Two modes, decided by which credential is presented:
//   - Admin: header `x-admin-password` matching ADMIN_PASSWORD -> returns
//     ALL tickets (optionally filtered by ?status= and/or ?category=).
//   - Client: header `Authorization: Bearer <jwt>` -> returns only that
//     client's own tickets.
//
// Every function that reads/writes ticket data uses the service_role
// client (so it can always reach the tables regardless of RLS), and
// enforces "which rows this caller may see" explicitly in code here —
// the Postgres RLS policies in support-schema.sql are a second, independent
// safety net in case ticket data is ever queried directly instead.
const { getSupabase, checkAdminPassword, getUserFromRequest } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const supabase = getSupabase();
  const qs = event.queryStringParameters || {};

  const adminHeader = event.headers && (event.headers['x-admin-password'] || event.headers['X-Admin-Password']);
  const isAdmin = adminHeader && checkAdminPassword(adminHeader);

  let query = supabase
    .from('tickets')
    .select('*')
    .order('updated_at', { ascending: false });

  if (isAdmin) {
    if (qs.status) query = query.eq('status', qs.status);
    if (qs.category) query = query.eq('category', qs.category);
  } else {
    const user = await getUserFromRequest(event);
    if (!user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Not logged in' }) };
    }
    query = query.eq('client_id', user.id);
    if (qs.status) query = query.eq('status', qs.status);
  }

  const { data, error } = await query;
  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ tickets: data }) };
};
