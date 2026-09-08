// GET /.netlify/functions/ticket-thread?id=<ticket_id>
//
// Returns one ticket plus its full message thread. Access is granted to:
//   - Admin (x-admin-password header), for any ticket.
//   - The client who owns it (Authorization: Bearer <jwt>), their own only.
const { getSupabase, checkAdminPassword, getUserFromRequest } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const ticketId = (event.queryStringParameters || {}).id;
  if (!ticketId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing id' }) };
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

  if (!isAdmin) {
    const user = await getUserFromRequest(event);
    if (!user || user.id !== ticket.client_id) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Not allowed' }) };
    }
  }

  const { data: messages, error: msgErr } = await supabase
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (msgErr) {
    return { statusCode: 500, body: JSON.stringify({ error: msgErr.message }) };
  }

  // Attachments live in a private Storage bucket, so each message that has
  // one gets a fresh short-lived signed URL here rather than a permanent
  // public link. If signing fails for some reason, the message still shows
  // up fine — it just won't have a download link.
  const messagesWithAttachments = await Promise.all((messages || []).map(async (m) => {
    if (!m.attachment_path) return m;
    const { data: signed, error: signErr } = await supabase.storage
      .from('ticket-attachments')
      .createSignedUrl(m.attachment_path, 3600);
    if (signErr || !signed) return m;
    return Object.assign({}, m, { attachment_url: signed.signedUrl });
  }));

  return { statusCode: 200, body: JSON.stringify({ ticket, messages: messagesWithAttachments }) };
};
