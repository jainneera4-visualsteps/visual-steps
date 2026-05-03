import { createClient } from '@supabase/supabase-js';

// Initialize Supabase using your verified environment variables
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Add CORS headers manually since we aren't using the 'cors' package
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request for CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Simple routing based on the URL path
  const url = req.url;

  try {
    if (url.includes('/api/health')) {
      return res.status(200).json({ status: 'Server is awake!' });
    }

    if (url.includes('/api/kids')) {
      const { data, error } = await supabase.from('kids').select('*');
      if (error) throw error;
      return res.status(200).json(data);
    }

    // Default response if no route matches
    res.status(404).json({ error: 'Route not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
