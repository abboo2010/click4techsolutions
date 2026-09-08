// POST /.netlify/functions/ticket-create
// Auth: client Bearer JWT (Supabase Auth) — required.
// Body: { category, priority?, subject, message, client_name?, company_name?,
//         attachment?: { name, type, data (base64) } }
//
// Creates a new ticket + its first message (the client's initial
// description), then notifies the admin by email. The client_id/email on
// the ticket always come from the verified JWT, never from the request
// body, so a client can never create a ticket "as" someone else.
//
// An optional attachment is uploaded to the private "ticket-attachments"
// Storage bucket and linked to the initial message; a failed upload does
// NOT fail the whole request — the ticket and its text still go through,
// just without the file.
const { getSupabase, getUserFromRequest } = require('./_supabase');
const { notifyAdminNewTicket } = require('./_email');

const ALLOWED_CATEGORIES = ['email_creation', 'email_login', 'forgotten_password', 'website_hosting', 'general'];
const ALLOWED_PRIORITIES = ['low', 'medium', 'high'];
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

function sanitizeFilename(name) {
  return String(name || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100) || 'attachment';
}

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
  const priority = ALLOWED_PRIORITIES.includes(body.priority) ? body.priority : 'medium';
  const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 200) : '';
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 5000) : '';
  const clientName = typeof body.client_name === 'string' ? body.client_name.trim().slice(0, 120) : null;
  const companyName = typeof body.company_name === 'string' ? body.company_name.trim().slice(0, 160) : null;

  if (!subject || !message) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Subject and message are required' }) };
  }

  // Validate the attachment (if any) up front, before creating any rows, so
  // a bad file is rejected cleanly with nothing half-created.
  let attachmentBuffer = null;
  let attachmentType = null;
  let attachmentName = null;
  if (body.attachment && typeof body.attachment === 'object') {
    const att = body.attachment;
    if (typeof att.data !== 'string' || !att.data) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Attachment data is missing' }) };
    }
    attachmentType = typeof att.type === 'string' ? att.type : 'application/octet-stream';
    if (!ALLOWED_ATTACHMENT_TYPES.includes(attachmentType)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'That file type is not allowed. Allowed: images, PDF, Word, or plain text.' }) };
    }
    attachmentName = sanitizeFilename(att.name);
    try {
      attachmentBuffer = Buffer.from(att.data, 'base64');
    } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Attachment data is not valid base64' }) };
    }
    if (!attachmentBuffer.length) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Attachment file is empty' }) };
    }
    if (attachmentBuffer.length > MAX_ATTACHMENT_BYTES) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Attachment is too large (max 5MB)' }) };
    }
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
      priority,
      subject,
      status: 'open'
    })
    .select()
    .single();

  if (ticketErr) {
    return { statusCode: 500, body: JSON.stringify({ error: ticketErr.message }) };
  }

  let attachmentPath = null;
  if (attachmentBuffer) {
    const path = `${ticket.id}/${Date.now()}-${attachmentName}`;
    const { error: uploadErr } = await supabase.storage
      .from('ticket-attachments')
      .upload(path, attachmentBuffer, { contentType: attachmentType, upsert: false });
    if (uploadErr) {
      // Don't fail ticket creation over the attachment — log it and continue
      // with just the text message, same "fire-and-continue" philosophy as
      // the notification email below.
      console.error('[ticket-create] attachment upload failed', uploadErr);
    } else {
      attachmentPath = path;
    }
  }

  const { error: msgErr } = await supabase
    .from('ticket_messages')
    .insert({
      ticket_id: ticket.id,
      sender_type: 'client',
      sender_name: clientName || user.email,
      body: message,
      attachment_path: attachmentPath,
      attachment_name: attachmentPath ? attachmentName : null
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
