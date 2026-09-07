// POST /.netlify/functions/ticket-status
// Body: { ticket_id, status }
// Auth: admin only (x-admin-password).
//
// Lets the admin dashboard change a ticket's status directly (e.g. mark
// resolved/closed, or reopen) without necessarily posting a reply message.
const { getSupabase, checkAdminPassword } = require('./_supabase');

const ALLOWED_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const adminHeader = event.headers && (event.headers['x-admin-password'] || event.headers['X-Admin-Password']);
  if (!adminHeader || !checkAdminPassword(adminHeader)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not authorized' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const ticketId = body.ticket_id;
  const status = body.status;
  if (!ticketId || !ALLOWED_STATUSES.includes(status)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'ticket_id and a valid status are required' }) };
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ticketId);

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
