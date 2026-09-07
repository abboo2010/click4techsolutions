// POST /.netlify/functions/ticket-reply
// Body: { ticket_id, message }
//
// Auth: admin (x-admin-password) OR the client who owns the ticket
// (Authorization: Bearer <jwt>).
//
// Adds a message to the thread, bumps the ticket's updated_at, applies a
// couple of small automatic status transitions, and emails the other side.
const { getSupabase, checkAdminPassword, getUserFromRequest } = require('./_supabase');
const { notifyClientReply, notifyAdminReply } = require('./_email');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const ticketId = body.ticket_id;
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 5000) : '';
  if (!ticketId || !message) {
    return { statusCode: 400, body: JSON.stringify({ error: 'ticket_id and message are required' }) };
  }

  const supabase = getSupabase();

  const { data: ticket, error: ticketErr } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', ticketId)
    .maybeSingle();

  if (ticketErr) {
    return { statusCode: 500, body: JSON.stringify({ error: ticketErr.message }) };
  }
  if (!ticket) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Ticket not found' }) };
  }

  const adminHeader = event.headers && (event.headers['x-admin-password'] || event.headers['X-Admin-Password']);
  const isAdmin = adminHeader && checkAdminPassword(adminHeader);

  let senderType, senderName, user;
  if (isAdmin) {
    senderType = 'admin';
    senderName = 'Click4Tech Support';
  } else {
    user = await getUserFromRequest(event);
    if (!user || user.id !== ticket.client_id) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Not allowed' }) };
    }
    if (ticket.status === 'closed') {
      return { statusCode: 400, body: JSON.stringify({ error: 'This ticket is closed. Please open a new ticket.' }) };
    }
    senderType = 'client';
    senderName = ticket.client_name || user.email;
  }

  const { error: msgErr } = await supabase
    .from('ticket_messages')
    .insert({ ticket_id: ticketId, sender_type: senderType, sender_name: senderName, body: message });

  if (msgErr) {
    return { statusCode: 500, body: JSON.stringify({ error: msgErr.message }) };
  }

  // Automatic status nudges: an admin reply moves a fresh ticket into
  // "in progress"; a client reply on a resolved ticket reopens it.
  let newStatus = ticket.status;
  if (isAdmin && ticket.status === 'open') newStatus = 'in_progress';
  if (!isAdmin && ticket.status === 'resolved') newStatus = 'open';

  const { error: updErr } = await supabase
    .from('tickets')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', ticketId);

  if (updErr) {
    return { statusCode: 500, body: JSON.stringify({ error: updErr.message }) };
  }

  try {
    if (isAdmin) {
      await notifyClientReply(ticket);
    } else {
      await notifyAdminReply(ticket);
    }
  } catch (e) {
    console.error('[ticket-reply] notification failed', e);
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true, status: newStatus }) };
};
