// Email notifications via Resend (https://resend.com) — a transactional
// email API with a free tier (100 emails/day, 3,000/month at time of
// writing). Server-side only: RESEND_API_KEY must never reach the browser.
//
// This is written to fail SAFE: if RESEND_API_KEY (or RESEND_FROM_EMAIL)
// isn't set yet, sendEmail() just logs a warning and does nothing, instead
// of throwing. That means the ticket system fully works (tickets save,
// replies save) even before email notifications are configured — matching
// the same "never let a missing optional piece break the core feature"
// pattern used by the CMS (content fetch fallback, etc).

const CATEGORY_LABELS = {
  email_creation: 'Email creation',
  email_login: 'Email login problem',
  forgotten_password: 'Forgotten password',
  website_hosting: 'Website / hosting issue',
  general: 'General / other'
};

function categoryLabel(category) {
  return CATEGORY_LABELS[category] || category;
}

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.warn('[email] Skipped sending (RESEND_API_KEY or RESEND_FROM_EMAIL not set):', subject, '->', to);
    return { skipped: true };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from, to, subject, html })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[email] Resend API error', res.status, text);
      return { skipped: false, ok: false };
    }
    return { skipped: false, ok: true };
  } catch (err) {
    console.error('[email] Failed to send:', err);
    return { skipped: false, ok: false, error: String(err) };
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function wrap(bodyHtml) {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;">
      <div style="background:#132A4E;padding:18px 24px;border-radius:10px 10px 0 0;">
        <span style="color:#F07D1E;font-weight:700;font-size:18px;">Click4Tech Solutions</span>
        <span style="color:#fff;font-size:14px;"> — Support</span>
      </div>
      <div style="background:#FAF3E6;padding:24px;border-radius:0 0 10px 10px;color:#132A4E;font-size:14px;line-height:1.6;">
        ${bodyHtml}
      </div>
    </div>`;
}

// Notify the admin when a client opens a new ticket.
async function notifyAdminNewTicket(ticket) {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || 'info@click4techsolutions.com';
  const portalUrl = process.env.SITE_URL ? `${process.env.SITE_URL}/support-admin.html` : '/support-admin.html';
  await sendEmail({
    to: adminEmail,
    subject: `New support ticket: ${ticket.subject}`,
    html: wrap(`
      <p><strong>New ticket from ${escapeHtml(ticket.client_name || ticket.client_email)}</strong>${ticket.company_name ? ` (${escapeHtml(ticket.company_name)})` : ''}</p>
      <p><strong>Category:</strong> ${escapeHtml(categoryLabel(ticket.category))}<br/>
      <strong>Subject:</strong> ${escapeHtml(ticket.subject)}</p>
      <p><a href="${portalUrl}" style="color:#F07D1E;">Open the admin dashboard to reply &rarr;</a></p>
    `)
  });
}

// Notify the client when admin replies to their ticket.
async function notifyClientReply(ticket) {
  const portalUrl = process.env.SITE_URL ? `${process.env.SITE_URL}/support-portal.html` : '/support-portal.html';
  await sendEmail({
    to: ticket.client_email,
    subject: `Update on your support ticket: ${ticket.subject}`,
    html: wrap(`
      <p>Hi ${escapeHtml(ticket.client_name || '')},</p>
      <p>Click4Tech Solutions support has replied to your ticket <strong>"${escapeHtml(ticket.subject)}"</strong>.</p>
      <p><a href="${portalUrl}" style="color:#F07D1E;">Log in to view the reply &rarr;</a></p>
    `)
  });
}

// Notify the admin when a client replies to an existing ticket.
async function notifyAdminReply(ticket) {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || 'info@click4techsolutions.com';
  const portalUrl = process.env.SITE_URL ? `${process.env.SITE_URL}/support-admin.html` : '/support-admin.html';
  await sendEmail({
    to: adminEmail,
    subject: `Client replied: ${ticket.subject}`,
    html: wrap(`
      <p><strong>${escapeHtml(ticket.client_name || ticket.client_email)}</strong> replied to ticket <strong>"${escapeHtml(ticket.subject)}"</strong>.</p>
      <p><a href="${portalUrl}" style="color:#F07D1E;">Open the admin dashboard to reply &rarr;</a></p>
    `)
  });
}

module.exports = { sendEmail, notifyAdminNewTicket, notifyClientReply, notifyAdminReply, categoryLabel };
