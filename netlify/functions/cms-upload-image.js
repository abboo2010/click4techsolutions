// Password-gated image upload. The browser (cms.html) resizes/compresses
// the image to a reasonable size before calling this, then this function
// just uploads the given base64 data to the public "click4tech-media"
// Supabase Storage bucket and returns its public URL.
const crypto = require('crypto');
const { getSupabase, checkAdminPassword } = require('./_supabase');

const ALLOWED_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/gif': 'gif'
};

const MAX_BYTES = 5 * 1024 * 1024; // 5MB, matches the earlier CMS builds' limit

function json(statusCode, data) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const providedPassword = event.headers['x-admin-password'] || event.headers['X-Admin-Password'];
  if (!checkAdminPassword(providedPassword)) {
    return json(401, { error: 'Wrong or missing admin password' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { error: 'Invalid JSON body' });
  }

  const { dataUrl, folder } = body;
  if (!dataUrl || typeof dataUrl !== 'string') {
    return json(400, { error: 'Missing dataUrl' });
  }

  const match = dataUrl.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
  if (!match) {
    return json(400, { error: 'dataUrl must be a base64 data: URL' });
  }
  const mime = match[1];
  const ext = ALLOWED_MIME[mime];
  if (!ext) {
    return json(400, { error: 'Only PNG, JPEG, WEBP, SVG or GIF images are allowed' });
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_BYTES) {
    return json(400, { error: 'Image is too large (5MB max)' });
  }

  const safeFolder = (folder && /^[a-z0-9_-]+$/i.test(folder)) ? folder : 'uploads';
  const filename = `${safeFolder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;

  try {
    const supabase = getSupabase();
    const { error: uploadError } = await supabase.storage
      .from('click4tech-media')
      .upload(filename, buffer, { contentType: mime, upsert: false });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from('click4tech-media').getPublicUrl(filename);
    return json(200, { url: publicUrlData.publicUrl, path: filename });
  } catch (err) {
    console.error(err);
    return json(500, { error: 'Upload failed', detail: String((err && err.message) || err) });
  }
};
