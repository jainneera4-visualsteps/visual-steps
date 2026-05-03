import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Manual CORS for your React frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (pathname === '/api/health') {
      return res.status(200).json({ status: 'Native handler is live!' });
    }

    if (pathname === '/api/kids') {
      const { data, error } = await supabase.from('kids').select('*');
      if (error) throw error;
      return res.status(200).json(data);
    }

    res.status(404).json({ error: 'Not Found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
