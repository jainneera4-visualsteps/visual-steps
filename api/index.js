import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';

const app = express();

app.use(cors());
app.use(express.json());

// Minimal route with NO Supabase dependency for testing
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'Success', 
    message: 'The server is officially awake and running on Vercel!' 
  });
});

// Add your kids route back ONLY after the health check works
app.get('/api/kids', (req, res) => {
  res.json({ message: "Ready to connect to Supabase" });
});

export default serverless(app);
