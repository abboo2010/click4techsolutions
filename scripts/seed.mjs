// One-time setup script: uploads the site's real images to Supabase Storage
// and populates every CMS table with the site's actual current content, so
// the CMS starts out matching what's already live — not empty.
//
// Usage (from the project root, after running cms-schema.sql in Supabase):
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxxx node scripts/seed.mjs
//
// Or create a .env file in the project root with those two lines and just run:
//   node scripts/seed.mjs
//
// Safe to re-run: it resets every table back to this original seed content
// (so don't re-run it after you've made your own edits in the CMS, unless
// you want to wipe those edits back to the starting point).

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// --- tiny .env loader (no dependency needed) ---
function loadDotEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Set them as environment variables, or put them in a .env file in the project root.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const content = JSON.parse(readFileSync(path.join(ROOT, 'content', 'site-content.json'), 'utf8'));

const MIME_BY_EXT = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml', gif: 'image/gif' };

async function ensureBucket() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  if (!buckets.some((b) => b.name === 'click4tech-media')) {
    const { error: createErr } = await supabase.storage.createBucket('click4tech-media', { public: true });
    if (createErr) throw createErr;
    console.log('Created storage bucket click4tech-media');
  }
}

async function uploadImage(localFile, storagePath) {
  const ext = path.extname(localFile).slice(1).toLowerCase();
  const mime = MIME_BY_EXT[ext] || 'application/octet-stream';
  const buffer = readFileSync(localFile);
  const { error } = await supabase.storage
    .from('click4tech-media')
    .upload(storagePath, buffer, { contentType: mime, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('click4tech-media').getPublicUrl(storagePath);
  return data.publicUrl;
}

async function main() {
  console.log('Checking storage bucket...');
  await ensureBucket();

  console.log('Uploading images...');
  const imagesDir = path.join(ROOT, 'content', 'images');
  const footerLogoUrl = await uploadImage(path.join(imagesDir, 'footer-logo.png'), 'site/footer-logo.png');

  const clientLogoUrls = {};
  for (const c of content.clients) {
    const localFile = path.join(imagesDir, 'clients', c.logo_file);
    const url = await uploadImage(localFile, `clients/${c.logo_file}`);
    clientLogoUrls[c.logo_file] = url;
    console.log(`  uploaded ${c.logo_file}`);
  }

  console.log('Writing hero banner...');
  {
    const { error } = await supabase.from('hero_banner').upsert({ id: 1, ...content.hero, updated_at: new Date().toISOString() });
    if (error) throw error;
  }

  console.log('Writing contact info...');
  {
    // footer_text stays as-is; the footer logo image itself lives at
    // footerLogoUrl below if you want to reference it in a future edit.
    const { error } = await supabase.from('contact_info').upsert({ id: 1, ...content.contact_info, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
  console.log(`  (footer logo uploaded to: ${footerLogoUrl})`);

  console.log('Seeding clients...');
  {
    await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const rows = content.clients.map((c) => ({
      sort_order: c.sort_order,
      name: c.name,
      logo_url: clientLogoUrls[c.logo_file],
      is_published: true
    }));
    const { error } = await supabase.from('clients').insert(rows);
    if (error) throw error;
  }

  console.log('Seeding services...');
  {
    await supabase.from('services').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const rows = content.services.map((s) => ({
      sort_order: s.sort_order,
      group_name: s.group_name,
      icon_key: s.icon_key,
      title: s.title,
      kicker: s.kicker,
      description: s.description,
      is_published: true
    }));
    const { error } = await supabase.from('services').insert(rows);
    if (error) throw error;
  }

  console.log('Seeding why_cards...');
  {
    await supabase.from('why_cards').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const rows = content.why_cards.map((w) => ({
      sort_order: w.sort_order,
      icon_key: w.icon_key,
      title: w.title,
      description: w.description,
      is_published: true
    }));
    const { error } = await supabase.from('why_cards').insert(rows);
    if (error) throw error;
  }

  console.log('Seeding work_items...');
  {
    await supabase.from('work_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const rows = content.work_items.map((w) => ({
      sort_order: w.sort_order,
      title: w.title,
      status: w.status,
      description: w.description,
      bullets: w.bullets,
      domain: w.domain,
      is_published: true
    }));
    const { error } = await supabase.from('work_items').insert(rows);
    if (error) throw error;
  }

  console.log('Seeding pricing_factors...');
  {
    await supabase.from('pricing_factors').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const rows = content.pricing_factors.map((p) => ({
      sort_order: p.sort_order,
      title: p.title,
      description: p.description,
      is_published: true
    }));
    const { error } = await supabase.from('pricing_factors').insert(rows);
    if (error) throw error;
  }

  console.log('Seeding faqs...');
  {
    await supabase.from('faqs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const rows = content.faqs.map((f) => ({
      sort_order: f.sort_order,
      question: f.question,
      answer: f.answer,
      is_published: true
    }));
    const { error } = await supabase.from('faqs').insert(rows);
    if (error) throw error;
  }

  console.log('\nDone. All tables seeded with the site\'s real content and images uploaded.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
