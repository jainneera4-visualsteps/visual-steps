import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize inside the route to prevent global crash
const getSupabase = () => {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is awake!' });
});

app.get('/api/kids', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('kids').select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default serverless(app);
