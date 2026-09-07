// POST /.netlify/functions/ticket-create
// Auth: client Bearer JWT (Supabase Auth) — required.
// Body: { category, subject, message, client_name?, company_name? }
//
// Creates a new ticket + its first message (the client's initial
// description), then notifies the admin by email. The client_id/email on
// the ticket always come from the verified JWT, never from the request
// body, so a client can never create a ticket "as" someone else.
const { getSupabase, getUserFromRequest } = require('./_supabase');
const { notifyAdminNewTicket } = require('./_email');

const ALLOWED_CATEGORIES = ['email_creation', 'email_login', 'forgotten_password', 'website_hosting', 'general'];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const user = await getUserFromRequest(event);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not logged in' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const category = ALLOWED_CATEGORIES.includes(body.category) ? body.category : 'general';
  const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 200) : '';
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 5000) : '';
  const clientName = typeof body.client_name === 'string' ? body.client_name.trim().slice(0, 120) : null;
  const companyName = typeof body.company_name === 'string' ? body.company_name.trim().slice(0, 160) : null;

  if (!subject || !message) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Subject and message are required' }) };
  }

  const supabase = getSupabase();

  const { data: ticket, error: ticketErr } = await supabase
    .from('tickets')
    .insert({
      client_id: user.id,
      client_email: user.email,
      client_name: clientName,
      company_name: companyName,
      category,
      subject,
      status: 'open'
    })
    .select()
    .single();

  if (ticketErr) {
    return { statusCode: 500, body: JSON.stringify({ error: ticketErr.message }) };
  }

  const { error: msgErr } = await supabase
    .from('ticket_messages')
    .insert({
      ticket_id: ticket.id,
      sender_type: 'client',
      sender_name: clientName || user.email,
      body: message
    });

  if (msgErr) {
    return { statusCode: 500, body: JSON.stringify({ error: msgErr.message }) };
  }

  // Fire-and-continue: don't fail ticket creation if the notification email
  // has a problem (unset API key, Resend hiccup, etc).
  try {
    await notifyAdminNewTicket(ticket);
  } catch (e) {
    console.error('[ticket-create] notifyAdminNewTicket failed', e);
  }

  return { statusCode: 201, body: JSON.stringify({ ticket }) };
};
