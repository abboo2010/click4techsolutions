// POST /.netlify/functions/ticket-status
// Body: { ticket_id, status?, priority? } — at least one of status/priority.
// Auth: admin only (x-admin-password).
//
// Lets the admin dashboard change a ticket's status and/or priority
// directly, without necessarily posting a reply message.
const { getSupabase, checkAdminPassword } = require('./_supabase');

const ALLOWED_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const ALLOWED_PRIORITIES = ['low', 'medium', 'high'];

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
  const priority = body.priority;

  if (!ticketId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'ticket_id is required' }) };
  }
  if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid status' }) };
  }
  if (priority !== undefined && !ALLOWED_PRIORITIES.includes(priority)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid priority' }) };
  }
  if (status === undefined && priority === undefined) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Provide a status and/or priority to update' }) };
  }

  const update = { updated_at: new Date().toISOString() };
  if (status !== undefined) update.status = status;
  if (priority !== undefined) update.priority = priority;

  const supabase = getSupabase();
  const { error } = await supabase
    .from('tickets')
    .update(update)
    .eq('id', ticketId);

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
