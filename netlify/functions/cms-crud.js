// Password-gated generic CRUD for every CMS-managed table.
// The admin dashboard (cms.html) is the only thing that calls this.
//
// Auth: every request must carry header  x-admin-password: <ADMIN_PASSWORD>
// A dedicated `action=login` GET request exists purely so the dashboard can
// check a password without doing anything else.
//
// Table config below is the whitelist of columns each table allows the
// dashboard to write — nothing outside this list can ever be set, no matter
// what the request body contains. `table` is always one of these fixed
// keys (never raw user input) before it's used in a Supabase query.
const { getSupabase, checkAdminPassword } = require('./_supabase');

const SINGLETON_TABLES = {
  hero_banner: [
    'eyebrow', 'headline_before', 'headline_highlight', 'headline_after', 'lede',
    'cta_primary_text', 'cta_secondary_text',
    'stat1_value', 'stat1_suffix', 'stat1_label',
    'stat2_value', 'stat2_suffix', 'stat2_label',
    'stat3_value', 'stat3_suffix', 'stat3_label'
  ],
  contact_info: ['phone_display', 'phone_href', 'email', 'address', 'whatsapp_link', 'footer_text']
};

const LIST_TABLES = {
  marquee_items: ['text', 'is_published'],
  clients: ['name', 'logo_url', 'is_published'],
  services: ['group_name', 'icon_key', 'title', 'kicker', 'description', 'is_published'],
  why_cards: ['icon_key', 'title', 'description', 'is_published'],
  work_items: ['title', 'status', 'description', 'bullets', 'domain', 'is_published'],
  pricing_factors: ['title', 'description', 'is_published'],
  faqs: ['question', 'answer', 'is_published']
};

function pickFields(body, allowedFields) {
  const out = {};
  for (const f of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, f)) out[f] = body[f];
  }
  return out;
}

function json(statusCode, data) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
}

exports.handler = async function (event) {
  const params = event.queryStringParameters || {};
  const action = params.action;
  const table = params.table;

  const providedPassword = event.headers['x-admin-password'] || event.headers['X-Admin-Password'];

  // Login check: no table needed, just validate the password.
  if (action === 'login') {
    return checkAdminPassword(providedPassword) ? json(200, { ok: true }) : json(401, { ok: false, error: 'Wrong password' });
  }

  if (!checkAdminPassword(providedPassword)) {
    return json(401, { error: 'Wrong or missing admin password' });
  }

  const isSingleton = Object.prototype.hasOwnProperty.call(SINGLETON_TABLES, table);
  const isList = Object.prototype.hasOwnProperty.call(LIST_TABLES, table);
  if (!isSingleton && !isList) {
    return json(400, { error: 'Unknown table' });
  }

  const supabase = getSupabase();
  let body = {};
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      return json(400, { error: 'Invalid JSON body' });
    }
  }

  try {
    // --- Singleton tables (hero_banner, contact_info): GET + PUT only ---
    if (isSingleton) {
      if (event.httpMethod === 'GET') {
        const { data, error } = await supabase.from(table).select('*').eq('id', 1).maybeSingle();
        if (error) throw error;
        return json(200, data || {});
      }
      if (event.httpMethod === 'PUT') {
        const fields = pickFields(body, SINGLETON_TABLES[table]);
        fields.updated_at = new Date().toISOString();
        const { data, error } = await supabase.from(table).update(fields).eq('id', 1).select().maybeSingle();
        if (error) throw error;
        return json(200, data);
      }
      return json(405, { error: 'Method not allowed for singleton table' });
    }

    // --- List tables: GET (all, admin view), POST (create), PUT (update),
    //     DELETE (remove), and action=reorder (POST with an id order array) ---
    const allowedFields = LIST_TABLES[table];

    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase.from(table).select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      return json(200, data || []);
    }

    if (event.httpMethod === 'POST' && action === 'reorder') {
      const order = Array.isArray(body.order) ? body.order : [];
      for (let i = 0; i < order.length; i++) {
        const { error } = await supabase.from(table).update({ sort_order: i }).eq('id', order[i]);
        if (error) throw error;
      }
      return json(200, { ok: true });
    }

    if (event.httpMethod === 'POST') {
      const fields = pickFields(body, allowedFields);
      const { data: maxRows, error: maxErr } = await supabase
        .from(table)
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1);
      if (maxErr) throw maxErr;
      const nextSort = maxRows && maxRows.length ? maxRows[0].sort_order + 1 : 0;
      const { data, error } = await supabase
        .from(table)
        .insert({ ...fields, sort_order: nextSort })
        .select()
        .single();
      if (error) throw error;
      return json(200, data);
    }

    if (event.httpMethod === 'PUT') {
      const id = params.id;
      if (!id) return json(400, { error: 'Missing id' });
      const fields = pickFields(body, allowedFields);
      fields.updated_at = new Date().toISOString();
      const { data, error } = await supabase.from(table).update(fields).eq('id', id).select().maybeSingle();
      if (error) throw error;
      if (!data) return json(404, { error: 'Not found' });
      return json(200, data);
    }

    if (event.httpMethod === 'DELETE') {
      const id = params.id;
      if (!id) return json(400, { error: 'Missing id' });
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return json(500, { error: 'Server error', detail: String((err && err.message) || err) });
  }
};
