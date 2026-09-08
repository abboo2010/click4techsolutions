// Public GET endpoint — returns every published piece of site content in one
// combined response. No password needed; this is what the live homepage
// calls on every page load. Only published rows are ever included.
const { getSupabase } = require('./_supabase');

const LIST_TABLES = [
  'marquee_items',
  'clients',
  'services',
  'why_cards',
  'work_items',
  'pricing_factors',
  'faqs'
];

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const supabase = getSupabase();

    const [heroRes, contactRes, ...listResults] = await Promise.all([
      supabase.from('hero_banner').select('*').eq('id', 1).maybeSingle(),
      supabase.from('contact_info').select('*').eq('id', 1).maybeSingle(),
      ...LIST_TABLES.map((table) =>
        supabase.from(table).select('*').eq('is_published', true).order('sort_order', { ascending: true })
      )
    ]);

    if (heroRes.error) throw heroRes.error;
    if (contactRes.error) throw contactRes.error;
    for (const r of listResults) {
      if (r.error) throw r.error;
    }

    const payload = {
      hero: heroRes.data || null,
      contact_info: contactRes.data || null
    };
    LIST_TABLES.forEach((table, i) => {
      payload[table] = listResults[i].data || [];
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        // Short public cache — content updates go live within a minute or two,
        // but repeat visitors within that window get a fast cached response.
        'Cache-Control': 'public, max-age=60'
      },
      body: JSON.stringify(payload)
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to load content' }) };
  }
};
