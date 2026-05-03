import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http'; // This is the key
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.get('/api/kids', async (req, res) => {
  try {
    const { data, error } = await supabase.from('kids').select('*');
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Wrap the express app with serverless-http
export const handler = serverless(app); 
export default app;
