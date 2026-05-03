import express from 'express';
import cors from 'cors';
// import serverless from 'serverless-http';
import http from 'http';
import { Server } from 'socket.io';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import multer from 'multer';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Dual compatibility for ESM and CJS
const currentDirname = process.cwd();

const app = express();
export default app;

app.use(cors());

// Request logging
app.use((req, res, next) => {
  if (req.url.startsWith('/api/')) {
    console.log(`[API_REQ] ${new Date().toISOString()} ${req.method} ${req.url}`);
  }
  
  // Vercel prefix fix: If we are in Vercel and the URL is missing /api prefix but is handled by this function
  if (process.env.VERCEL && !req.url.startsWith('/api/') && !req.url.includes('.')) {
    const originalUrl = req.url;
    req.url = '/api' + (originalUrl.startsWith('/') ? originalUrl : '/' + originalUrl);
    console.log(`[VERCEL_PATCH] Prefixed URL: ${originalUrl} -> ${req.url}`);
  }
  next();
});

const server = http.createServer(app);
let io: Server | null = null;

if (!process.env.VERCEL) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"]
    }
  });

  app.set('io', io);

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    
    socket.on('join_kid_room', (kidId) => {
      socket.join(`kid_${kidId}`);
      console.log(`Socket ${socket.id} joined room kid_${kidId}`);
    });

    socket.on('leave_kid_room', (kidId) => {
      socket.leave(`kid_${kidId}`);
      console.log(`Socket ${socket.id} left room kid_${kidId}`);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
} else {
  // Mock io for Vercel to prevent crashes if something tries to use it
  app.set('io', {
    emit: () => {},
    to: () => ({ emit: () => {} }),
    in: () => ({ emit: () => {} })
  });
}

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';

// Supabase setup
let supabaseUrl = (process.env.SUPABASE_URL || '').trim();
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = 'https://' + supabaseUrl;
}
const supabaseKey = (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '').trim();

console.log('[STARTUP] Backend Supabase URL:', supabaseUrl);
console.log('[STARTUP] Backend Supabase Key:', supabaseKey ? '***' : 'undefined');
console.log('[STARTUP] JWT_SECRET:', JWT_SECRET ? '***' : 'undefined');

if (!supabaseUrl || !supabaseKey) {
  console.error('[STARTUP] Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_ANON_KEY.');
}

// Helper to get authenticated Supabase client
const getSupabaseClient = (token: string) => {
  return createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
};

// Helper to get public Supabase client
const getPublicSupabaseClient = () => {
  return createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
};

// Helper to get admin Supabase client (bypasses RLS)
const getAdminSupabaseClient = () => {
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;
  return createClient(supabaseUrl || 'https://placeholder.supabase.co', adminKey || 'placeholder', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
};

// Helper to get the appropriate Supabase client based on user role
const getSupabaseForUser = (req: any) => {
  if (req.user && req.user.role === 'kid') {
    return getAdminSupabaseClient();
  }
  return getSupabaseClient(req.token);
};

// Ensure uploads directory exists
const rootDir = currentDirname.endsWith('dist') ? path.dirname(currentDirname) : currentDirname;
const uploadDir = path.join(rootDir, 'uploads');

if (!fs.existsSync(uploadDir)) {
  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  } catch (err) {
    console.warn(`Could not create upload directory at ${uploadDir}:`, err);
  }
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), env: process.env.NODE_ENV || 'development' });
});

app.get('/api/test-no-auth', (req, res) => {
  res.json({ message: 'API is working without auth', timestamp: new Date().toISOString() });
});
app.use((req, res, next) => {
  console.log('Request URL:', req.url);
  next();
});

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

app.get('/api/backend-health', async (req, res) => {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const geminiKey = process.env.GEMINI_API_KEY || '';
  
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!url && !url.includes('placeholder'),
      supabaseUrlPrefix: url ? url.substring(0, 15) : 'none',
      hasSupabaseKey: !!key && !key.includes('placeholder'),
      keyLength: key ? key.length : 0,
      hasGeminiKey: !!geminiKey && !geminiKey.includes('placeholder'),
      nodeEnv: process.env.NODE_ENV
    }
  };
  
  res.json(health);
});

// Auth Middleware
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.cookies.token;

  if (!token || token === 'undefined' || token === 'null') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. Check if it's a kid token (JWT signed by our server)
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded && decoded.role === 'kid') {
        req.user = { id: decoded.userId, role: 'kid', kidId: decoded.kidId };
        req.token = token;
        return next();
      }
    } catch (e: any) {
      // Not a valid kid token, proceed to check Supabase token
    }

    // 2. Check Supabase token
    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
      console.error('authenticateToken: Supabase credentials missing (check SUPABASE_URL / SUPABASE_KEY)');
      return res.status(500).json({ 
        error: 'Supabase Connection Error', 
        details: 'Server is missing Supabase credentials. Ensure SUPABASE_URL and SUPABASE_KEY are set in environment.' 
      });
    }

    // Create a fresh client for this request
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error(`[AUTH] Supabase verification failed:`, error?.message || 'No user', 'Status:', error?.status);
      
      // Detailed mismatch check
      let projectIdFromToken = 'unknown';
      try {
        const decoded = jwt.decode(token) as any;
        const tokenIssuer = decoded?.iss || 'unknown';
        if (tokenIssuer && tokenIssuer.includes('.supabase.co')) {
            projectIdFromToken = tokenIssuer.split('//')[1]?.split('.')[0];
        }
      } catch (e) {}
      
      const backendProjectId = supabaseUrl.split('//')[1]?.split('.')[0];
      const isProjectMismatch = projectIdFromToken !== 'unknown' && projectIdFromToken !== backendProjectId;

      if (isProjectMismatch) {
        return res.status(401).json({ 
          error: 'Supabase Project Mismatch', 
          details: `Your project mismatch detected. Token: ${projectIdFromToken}, Backend: ${backendProjectId}. Ensure VITE_SUPABASE_URL and SUPABASE_URL match the same project.`,
          code: 401
        });
      }

      return res.status(401).json({ 
        error: 'Invalid Session', 
        details: error?.message || 'The session has expired or is invalid.',
        code: error?.status || 401
      });
    }

    // Set user with more info
    req.user = { 
        id: user.id, 
        email: user.email, 
        role: 'parent',
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]
    };
    req.token = token;
    next();
  } catch (err: any) {
    console.error('authenticateToken: Unexpected error:', err.message, err.stack);
    res.status(500).json({ error: 'Authentication processing error', details: err.message });
  }
};

// Helper Functions
const getTransporter = async () => {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.ethereal.email';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  // If no credentials are provided, try to create a test account for development
  if (!smtpUser) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('Skipping email: No SMTP_USER provided in production environment.');
      return null;
    }
    console.log('No SMTP_USER provided. Creating Ethereal test account...');
    const testAccount = await nodemailer.createTestAccount();
    (transporter.options as any).host = 'smtp.ethereal.email';
    (transporter.options as any).port = 587;
    (transporter.options as any).secure = false;
    (transporter.options as any).auth = {
      user: testAccount.user,
      pass: testAccount.pass,
    };
    console.log('Using Ethereal test account for emails:', testAccount.user);
  }

  return transporter;
};

const sendWelcomeEmail = async (email: string, name: string) => {
  console.log(`Attempting to send welcome email to: ${email} (${name})`);
  try {
    const transporter = await getTransporter();
    if (!transporter) return;

    const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER || '"Visual Steps" <noreply@visualsteps.com>';
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    
    const info = await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: 'Welcome to Visual Steps! Your Journey Begins Here',
      text: `Hello ${name || 'User'},\n\nWelcome to Visual Steps! We are thrilled to have you join our community.\n\nVisual Steps is a comprehensive platform dedicated to helping parents and children with autism stay engaged with meaningful activities all day long. We help you motivate your kids for learning while having fun at the same time.\n\nWith your new account, you can now:\n- Create customizable quizzes to keep learning fun and engaging\n- Build customizable social stories for a smooth daily routine\n- Generate customizable worksheets for meaningful offline time\n- Send messages and emojis to motivate your child throughout the day\n- Monitor daily growth with automated progress reports\n\nAccess your dashboard here: ${appUrl}/login\nYour registered email: ${email}\n\nWe are here to support you every step of the way. If you have any questions, simply reply to this email.\n\nBest regards,\nThe Visual Steps Team`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 12px; color: #333; line-height: 1.6;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Welcome to Visual Steps!</h1>
            <p style="color: #64748b; font-size: 16px; margin-top: 8px;">Meaningful engagement and daily motivation.</p>
          </div>
          
          <p>Hello <strong>${name || 'User'}</strong>,</p>
          
          <p>We are thrilled to have you join our community! <strong>Visual Steps</strong> is a comprehensive platform dedicated to helping parents and children with autism stay engaged with meaningful activities all day long. We help you motivate your kids for learning while having fun at the same time.</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="margin-top: 0; color: #1e293b; font-size: 16px;">What you can do now:</h3>
            <ul style="margin-bottom: 0; padding-left: 20px; color: #475569;">
              <li>Create customizable quizzes to keep learning fun and engaging</li>
              <li>Build customizable social stories for a smooth daily routine</li>
              <li>Generate customizable worksheets for meaningful offline time</li>
              <li>Send messages and emojis to motivate your child throughout the day</li>
              <li>Monitor daily growth with automated progress reports</li>
            </ul>
          </div>
          
          <p><strong>Account Details:</strong></p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Login URL:</td>
              <td style="padding: 8px 0;"><a href="${appUrl}/login" style="color: #2563eb; text-decoration: none; font-weight: bold;">${appUrl}/login</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Registered Email:</td>
              <td style="padding: 8px 0; font-weight: bold;">${email}</td>
            </tr>
          </table>
          
          <p>We are here to support you every step of the way. If you have any questions or need assistance, please don't hesitate to reach out.</p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f0f0f0; text-align: center;">
            <p style="margin: 0; font-weight: bold; color: #1e293b;">The Visual Steps Team</p>
            <p style="margin: 5px 0 0; font-size: 12px; color: #94a3b8;">Empowering children through visual learning.</p>
          </div>
        </div>
      `,
    });

    console.log('Welcome email sent successfully. Message ID:', info.messageId);
    if (info.messageId && info.messageId.includes('ethereal')) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
  } catch (error: any) {
    console.error('Error sending welcome email:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.command) console.error('Error command:', error.command);
  }
};

const sendPasswordChangeEmail = async (email: string, name: string) => {
  console.log(`Attempting to send password change confirmation to: ${email}`);
  try {
    const transporter = await getTransporter();
    if (!transporter) return;

    const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER || '"Visual Steps" <noreply@visualsteps.com>';
    
    const info = await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: 'Security Alert: Your Visual Steps Password Was Changed',
      text: `Hello ${name || 'User'},\n\nThis is a confirmation that the password for your Visual Steps account (${email}) has been successfully changed.\n\nIf you did not perform this action, please contact our support team immediately or reset your password using your security question.\n\nBest regards,\nThe Visual Steps Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #d9534f;">Security Alert: Password Changed</h2>
          <p>Hello ${name || 'User'},</p>
          <p>This is a confirmation that the password for your Visual Steps account (<strong>${email}</strong>) has been successfully changed.</p>
          <p style="background-color: #fcf8e3; padding: 15px; border: 1px solid #faebcc; border-radius: 4px; color: #8a6d3b;">
            <strong>Important:</strong> If you did not perform this action, please contact our support team immediately or reset your password using your security question.
          </p>
          <br/>
          <p>Best regards,</p>
          <p><strong>The Visual Steps Team</strong></p>
        </div>
      `,
    });

    console.log('Password change confirmation email sent successfully. Message ID:', info.messageId);
    if (info.messageId && info.messageId.includes('ethereal')) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
  } catch (error: any) {
    console.error('Error sending password change email:', error.message);
  }
};

const moveOverdueActivities = async (supabase: any, kidId: string, kid: any, today: string, currentTime: number) => {
  let isPastEndTime = false;
  if (kid.end_time) {
    const [endHour, endMinute] = kid.end_time.split(':').map(Number);
    const endTime = endHour * 60 + endMinute;
    if (currentTime >= endTime) {
      isPastEndTime = true;
    }
  }

  console.log('moveOverdueActivities: kidId:', kidId, 'today:', today, 'currentTime:', currentTime, 'isPastEndTime:', isPastEndTime);

  if (!supabase) {
    console.error('moveOverdueActivities: supabase is undefined');
    return;
  }

  // Find pending activities that are overdue
  // If past end_time, activities due today or earlier are overdue.
  // If not past end_time, only activities due before today are overdue.
  let query = supabase
    .from('activities')
    .select('id, due_date')
    .eq('kid_id', kidId)
    .eq('status', 'pending');

  if (isPastEndTime) {
    query = query.lte('due_date', today);
  } else {
    query = query.lt('due_date', today);
  }

  const { data: overdueActivities, error: overdueError } = await query;
  
  if (overdueError) {
    // Check if it's an HTML error (Cloudflare/Supabase infrastructure)
    const errorMsg = overdueError.message || '';
    if (errorMsg.includes('<!DOCTYPE html>') || errorMsg.includes('<html') || (typeof overdueError === 'string' && overdueError.includes('<html'))) {
      console.warn(`moveOverdueActivities: Supabase/Cloudflare connection issue (5xx error) for kid ${kidId}. Skipping this check.`);
      return;
    }
    console.error('moveOverdueActivities: Error fetching overdue activities:', overdueError);
    // Don't throw for transient infrastructure errors
    return;
  }

  console.log('moveOverdueActivities: overdueActivities:', overdueActivities);

  if (overdueActivities && overdueActivities.length > 0) {
    // Calculate target date
    // If past end_time, move to tomorrow
    // If not past end_time, move to today
    let targetDateStr = today;
    if (isPastEndTime) {
      const baseDate = new Date(today + 'T12:00:00');
      const tomorrow = new Date(baseDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      targetDateStr = tomorrow.toISOString().split('T')[0];
    }

    console.log(`moveOverdueActivities: Moving ${overdueActivities.length} activities for kid ${kidId} to ${targetDateStr}.`);
    const { error: moveError } = await supabase
      .from('activities')
      .update({ due_date: targetDateStr })
      .in('id', overdueActivities.map((a: any) => a.id));

    if (moveError) {
      // Check if it's an HTML error
      const errorMsg = moveError.message || '';
      if (errorMsg.includes('<!DOCTYPE html>') || errorMsg.includes('<html') || (typeof moveError === 'string' && moveError.includes('<html'))) {
        console.warn(`moveOverdueActivities: Supabase/Cloudflare connection issue (5xx error) during move for kid ${kidId}.`);
        return;
      }
      console.error('moveOverdueActivities: Error updating activities:', moveError);
      return;
    }
  }
};

// API Routes

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Upload File Endpoint
app.post('/api/upload', authenticateToken, (req: any, res) => {
  console.log('Received upload request');
  
  upload.single('image')(req, res, (err: any) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    console.log('File processed by multer');
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log('File uploaded:', req.file.filename);
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  });
});

// Create Profile
app.post('/api/auth/create-profile', async (req: any, res) => {
  const { id, email, name, password, secretQuestion, secretAnswer } = req.body;
  console.log('create-profile: request body:', { id, email, name, hasPassword: !!password, secretQuestion, hasAnswer: !!secretAnswer });
  
  if (!id || !email || !secretQuestion || !secretAnswer) {
    console.log('create-profile: missing fields');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const hashedAnswer = await bcrypt.hash(secretAnswer.toLowerCase().trim(), 10);
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    // Use admin client to bypass RLS during profile creation
    // This is necessary because the user might not have a session yet (e.g. if email confirmation is required)
    // The database foreign key constraint on auth.users(id) ensures only valid users can have profiles.
    const supabaseAdmin = getAdminSupabaseClient();
    const { error } = await supabaseAdmin
      .from('users')
      .insert([
        { 
          id, 
          email, 
          name, 
          password_hash: hashedPassword,
          secret_question: secretQuestion, 
          secret_answer_hash: hashedAnswer 
        }
      ]);

    if (error) {
      console.error('Supabase profile creation error:', error);
      if (error.code === '23505') { // Postgres unique constraint violation
        return res.status(409).json({ error: 'Profile already exists' });
      }
      return res.status(500).json({ 
        error: 'Database error during profile creation', 
        details: error.message,
        code: error.code
      });
    }
    
    console.log('Profile created successfully for id:', id);
    
    // Send welcome email asynchronously
    sendWelcomeEmail(email, name).catch(err => console.error('Failed to send welcome email:', err));

    res.status(201).json({ message: 'Profile created' });
  } catch (error: any) {
    console.error('Unexpected profile creation error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Resend Welcome Email
app.post('/api/auth/resend-welcome-email', authenticateToken, async (req: any, res) => {
  const { email, name } = req.user;
  
  if (!email) {
    return res.status(400).json({ error: 'User email not found' });
  }

  try {
    console.log('Resending welcome email to:', email);
    await sendWelcomeEmail(email, name);
    res.json({ message: 'Welcome email resent successfully' });
  } catch (error: any) {
    console.error('Resend welcome email error:', error);
    res.status(500).json({ error: 'Failed to resend welcome email', details: error.message });
  }
});

// Kid Management Routes

// Get Secret Question for Password Reset
app.post('/api/auth/get-secret-question', async (req, res) => {
  const supabase = getAdminSupabaseClient();
  const { email } = req.body;
  const { data: user, error } = await supabase
    .from('users')
    .select('secret_question')
    .eq('email', email)
    .single();
  
  if (error || !user) return res.status(404).json({ error: 'User not found' });
  res.json({ secretQuestion: user.secret_question });
});

// Verify Secret Answer and Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
  const supabase = getAdminSupabaseClient();
  const { email, secretAnswer, newPassword } = req.body;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found' });

    const isAnswerValid = await bcrypt.compare(secretAnswer.toLowerCase().trim(), user.secret_answer_hash);
    if (!isAnswerValid) return res.status(401).json({ error: 'Incorrect answer to secret question' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // Send password change confirmation email
    sendPasswordChangeEmail(email, user.name).catch(err => console.error('Failed to send password change email:', err));

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Profile
app.put('/api/user/profile', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { name, email, newPassword, secretQuestion, secretAnswer } = req.body;
  const userId = req.user.id;

  try {
    const updates: any = {};

    if (name) updates.name = name;
    if (email) updates.email = email;

    if (newPassword) {
      updates.password_hash = await bcrypt.hash(newPassword, 10);
    }

    if (secretQuestion) {
      updates.secret_question = secretQuestion;
    }

    if (secretAnswer) {
      updates.secret_answer_hash = await bcrypt.hash(secretAnswer.toLowerCase().trim(), 10);
    }

    if (Object.keys(updates).length === 0) return res.json({ message: 'No changes made' });

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;

    // If password was changed, send confirmation email
    if (newPassword) {
      sendPasswordChangeEmail(email || req.user.email, name || req.user.name).catch(err => console.error('Failed to send password change email:', err));
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify Password
app.post('/api/auth/verify-password', authenticateToken, async (req: any, res) => {
  const { password } = req.body;
  const email = req.user.email;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const supabase = getPublicSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  res.status(200).json({ message: 'Password verified' });
});

// Chat History Routes
app.get('/api/kids/:id/chat-history', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const supabase = getSupabaseForUser(req);
  
  try {
    const start = Date.now();
    console.log(`[GET chat-history] Start - Kid ID: ${id}, User ID: ${userId}`);
    
    // First verify parent has access to this kid
    const { data: kid, error: kidError } = await supabase
      .from('kids')
      .select('id, user_id')
      .eq('id', id)
      .single();
      
    if (kidError || !kid) {
      console.error('[GET chat-history] Kid not found or access denied:', kidError, `Duration: ${Date.now() - start}ms`);
      return res.status(404).json({ error: 'Kid not found' });
    }

    console.log(`[GET chat-history] Kid found. Owner ID: ${kid.user_id}, Duration: ${Date.now() - start}ms`);
    
    // Check if the user is the parent of this kid
    if (kid.user_id !== userId && req.user.role !== 'kid') {
      console.error(`[GET chat-history] Forbidden access attempt. User ${userId} is not owner ${kid.user_id}, Duration: ${Date.now() - start}ms`);
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Use admin client to bypass RLS for chat_history
    const adminSupabase = getAdminSupabaseClient();
    console.log(`[GET chat-history] Fetching from chat_history for kid_id: ${id}, Duration: ${Date.now() - start}ms`);
    
    let { data: history, error } = await adminSupabase
      .from('chat_history')
      .select('*')
      .eq('kid_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[GET chat-history] First fetch attempt failed:', error.message, 'Code:', error.code, `Duration: ${Date.now() - start}ms`);
      
      const isColumnError = error.code === '42703' || 
                           (error.message && error.message.includes("column") && error.message.includes("not found"));

      if (isColumnError) {
        // Try fallback column name kidId
        console.log('[GET chat-history] Retrying with fallback column name kidId...');
        const { data: retryData, error: retryError } = await adminSupabase
          .from('chat_history')
          .select('*')
          .eq('kidId', id)
          .order('created_at', { ascending: true });
          
        if (retryError) {
          console.warn('[GET chat-history] Retry with kidId failed, trying without order...');
          const { data: finalData, error: finalError } = await adminSupabase
            .from('chat_history')
            .select('*')
            .eq('kidId', id);
            
          if (finalError) {
            console.error('[GET chat-history] Final fetch attempt failed:', finalError);
            throw finalError;
          }
          history = finalData;
        } else {
          history = retryData;
        }
      } else {
        console.warn('[GET chat-history] Fetch failed with error, trying without order...');
        const { data: retryData, error: retryError } = await adminSupabase
          .from('chat_history')
          .select('*')
          .eq('kid_id', id);
          
        if (retryError) {
          console.error('[GET chat-history] Database error fetching history:', error);
          throw error;
        }
        history = retryData;
      }
    }
    
    console.log(`[GET chat-history] Successfully fetched ${history?.length || 0} messages`);
    if (history && history.length > 0) {
      console.log('[GET chat-history] Sample message:', JSON.stringify(history[0]));
    }
    
    res.json({ history: history || [] });
  } catch (error: any) {
    console.error('[GET chat-history] Unexpected error:', error?.message || error);
    res.status(500).json({ error: 'Internal server error', details: error?.message });
  }
});

app.post('/api/kids/:id/chat-history', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { role, message } = req.body;
  const userId = req.user.id;
  
  try {
    console.log(`[POST chat-history] Kid ID: ${id}, Role: ${role}, Message length: ${message?.length}`);
    
    const messageData: any = {
      id: uuidv4(),
      kid_id: id,
      role,
      message,
      created_at: new Date().toISOString()
    };
    
    const adminSupabase = getAdminSupabaseClient();
    
    console.log('[POST chat-history] Attempting insert into chat_history:', JSON.stringify(messageData));
    
    let { data: chatMessage, error } = await adminSupabase
      .from('chat_history')
      .insert([messageData])
      .select()
      .single();

    if (error) {
      console.warn('[POST chat-history] First insert attempt failed:', error.message, 'Code:', error.code);
      
      const isColumnError = error.code === '42703' || 
                           (error.message && error.message.includes("column") && error.message.includes("not found"));

      if (isColumnError) {
        // Column mismatch - try fallback with different kid_id column name
        console.log('[POST chat-history] Retrying with fallback column names...');
        
        // Try kidId instead of kid_id
        const { kid_id: _kidId, ...fallbackData } = messageData;
        (fallbackData as any).kidId = id;
        
        const { data: retryData, error: retryError } = await adminSupabase
          .from('chat_history')
          .insert([fallbackData])
          .select()
          .single();
          
        if (retryError) {
          console.warn('[POST chat-history] Second insert attempt failed:', retryError.message);
          
          if (retryError.code === '42703') {
            // Still column mismatch - try 'text' instead of 'message'
            console.log('[POST chat-history] Retrying with fallback column name "text"...');
            const { message: _msg, ...textFallbackData } = fallbackData;
            (textFallbackData as any).text = message;
            
            const { data: textData, error: textError } = await adminSupabase
              .from('chat_history')
              .insert([textFallbackData])
              .select()
              .single();
              
            if (textError) {
              console.error('[POST chat-history] Text fallback failed:', textError);
              throw textError;
            }
            chatMessage = textData;
          } else {
            throw retryError;
          }
        } else {
          chatMessage = retryData;
        }
      } else {
        throw error;
      }
    }
    
    console.log('[POST chat-history] Successfully saved message:', chatMessage?.id);
    
    const io = req.app.get('io');
    if (io) io.to(`kid_${id}`).emit('data_updated', { kidId: id });

    res.status(201).json({ chatMessage });
  } catch (error: any) {
    console.error('[POST chat-history] Unexpected error:', error?.message || error);
    res.status(500).json({ error: 'Internal server error', details: error?.message });
  }
});

app.post('/api/quiz-results', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { quizId, kidId, responses, score, totalQuestions } = req.body;
  console.log('[POST /api/quiz-results] Request body:', req.body);

  if (!quizId || !kidId || score === undefined || !responses || totalQuestions === undefined) {
    console.error('[POST /api/quiz-results] Missing required fields:', { quizId, kidId, responses, score, totalQuestions });
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { data, error } = await supabase
    .from('quiz_results')
    .insert([{ 
        quiz_id: quizId, 
        kid_id: kidId, 
        responses, 
        score, 
        total_questions: totalQuestions,
        questions: req.body.questions,
        completed_at: new Date().toISOString()
    }]);

  if (error) {
    console.error('[POST /api/quiz-results] Supabase error:', JSON.stringify(error, null, 2));
    return res.status(500).json({ error: error.message, details: error });
  }
  res.status(201).json(data);
});

app.get('/api/kids/:kidId/quiz-results', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { kidId } = req.params;
  const userId = req.user.id;

  try {
    // Verify kid ownership
    const { data: kid, error: kidError } = await supabase
      .from('kids')
      .select('user_id')
      .eq('id', kidId)
      .single();
    
    if (kidError || !kid || kid.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const { data, error } = await supabase
      .from('quiz_results')
      .select('*, quizzes(title)')
      .eq('kid_id', kidId)
      .order('completed_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ results: data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Chatbot Management Routes
app.get('/api/chatbots/:kidId', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { kidId } = req.params;
  const userId = req.user.id;

  try {
    // Verify kid ownership
    const { data: kid, error: kidError } = await supabase
      .from('kids')
      .select('user_id')
      .eq('id', kidId)
      .single();
    
    if (kidError || !kid || kid.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const adminSupabase = getAdminSupabaseClient();
    const { data: chatbot, error } = await adminSupabase
      .from('chatbots')
      .select('*')
      .eq('kid_id', kidId)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') return res.status(500).json({ error: 'Internal server error', details: error.message });

    res.json({ chatbot: chatbot || {} });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/chatbots/:kidId', authenticateToken, async (req: any, res) => {
  const supabase = getAdminSupabaseClient(); // Use admin client to bypass RLS
  const { kidId } = req.params;
  const userId = req.user.id;
  const { name, gender, personality, tone, speakingSpeed, maxSentences, languageComplexity } = req.body;

  try {
    // Verify kid ownership
    const { data: kid, error: kidError } = await supabase
      .from('kids')
      .select('user_id')
      .eq('id', kidId)
      .single();
    
    if (kidError || !kid || kid.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const chatbotData = { 
      name, 
      gender, 
      personality, 
      tone,
      speaking_speed: speakingSpeed,
      max_sentences: maxSentences,
      language_complexity: languageComplexity
    };

    // Check if chatbot exists
    const { data: existingChatbots, error: checkError } = await supabase
      .from('chatbots')
      .select('id')
      .eq('kid_id', kidId);

    console.log('Existing chatbots:', existingChatbots);

    if (existingChatbots && existingChatbots.length > 0) {
      // Update
      const { error } = await supabase
        .from('chatbots')
        .update(chatbotData)
        .eq('kid_id', kidId);
      
      if (error) {
        console.error('Chatbot update error:', error);
        throw error;
      }
    } else {
      // Create
      const { error } = await supabase
        .from('chatbots')
        .insert([{ kid_id: kidId, ...chatbotData }]);
      
      if (error) {
        console.error('Chatbot insert error:', error);
        throw error;
      }
    }

    const io = req.app.get('io');
    if (io) io.to(`kid_${kidId}`).emit('data_updated', { kidId });

    res.json({ message: 'Chatbot settings updated successfully' });
  } catch (error: any) {
    console.error('Chatbot PUT error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.delete('/api/chatbots/:kidId', authenticateToken, async (req: any, res) => {
  const supabase = getAdminSupabaseClient();
  const { kidId } = req.params;
  const userId = req.user.id;

  try {
    // Verify kid ownership
    const { data: kid, error: kidError } = await supabase
      .from('kids')
      .select('user_id')
      .eq('id', kidId)
      .single();
    
    if (kidError || !kid || kid.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const { error } = await supabase
      .from('chatbots')
      .delete()
      .eq('kid_id', kidId);
    
    if (error) {
      console.error('Chatbot delete error:', error);
      throw error;
    }

    const io = req.app.get('io');
    if (io) io.to(`kid_${kidId}`).emit('data_updated', { kidId });

    res.json({ message: 'Chatbot deleted successfully' });
  } catch (error: any) {
    console.error('Chatbot DELETE error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Kid Management Routes
app.post('/api/kids', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { 
    name, 
    dob, 
    grade_level: gradeLevel, 
    hobbies, 
    interests, 
    strengths, 
    weaknesses, 
    sensory_issues: sensoryIssues, 
    behavioral_issues: behavioralIssues, 
    notes, 
    avatar, 
    start_time: startTime, 
    end_time: endTime, 
    max_incomplete_limit: maxIncompleteLimit, 
    reward_type: rewardType, 
    reward_quantity: rewardQuantity, 
    rules, 
    theme, 
    can_print: canPrint, 
    timezone, 
    kid_code: kidCode,
    therapies
  } = req.body;
  const userId = req.user.id;

  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const id = uuidv4();
    const maxLimit = maxIncompleteLimit && !isNaN(parseInt(maxIncompleteLimit, 10)) ? parseInt(maxIncompleteLimit, 10) : null;
    const rewardQty = rewardQuantity && !isNaN(parseInt(rewardQuantity, 10)) ? parseInt(rewardQuantity, 10) : 1;
    const start_time = startTime && startTime !== '' ? startTime : null;
    const end_time = endTime && endTime !== '' ? endTime : null;
    
    const dataToInsert: any = {
      id,
      user_id: userId,
      name,
      dob,
      grade_level: gradeLevel,
      hobbies,
      interests,
      strengths,
      weaknesses,
      sensory_issues: sensoryIssues,
      behavioral_issues: behavioralIssues,
      notes,
      can_print: canPrint,
      avatar,
      start_time: start_time,
      end_time: end_time,
      max_incomplete_limit: maxLimit,
      reward_type: rewardType || 'Penny',
      reward_quantity: rewardQty,
      rules,
      theme: theme || 'sky',
      kid_code: kidCode,
      reward_balance: 0,
      therapies,
      timezone
    };

    console.log('API: Inserting kid:', JSON.stringify(dataToInsert));
    const { error } = await supabase
      .from('kids')
      .insert([dataToInsert]);

    if (error) {
      console.error('API: Supabase kid insert error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      if (error.code === '42703' || error.code === 'PGRST204') {
        // Fallback: try kidcode instead of kid_code, and remove potentially missing columns
        const { 
          timezone: _tz, 
          start_time: _st, 
          end_time: _et, 
          kid_code: _kc, 
          reward_balance: _rb,
          therapies: _th,
          can_print: _cp,
          max_incomplete_limit: _mil,
          reward_type: _rt,
          reward_quantity: _rq,
          sensory_issues: _si,
          behavioral_issues: _bi,
          grade_level: _gl,
          ...fallbackData 
        } = dataToInsert;
        
        const dataWithOldCode: any = { ...fallbackData };
        if (_kc !== undefined) dataWithOldCode.kidcode = _kc;
        if (_gl !== undefined) dataWithOldCode.gradelevel = _gl; // Another common variation
        
        console.log('API: Attempting fallback insert with data:', JSON.stringify(dataWithOldCode));
        const { error: retryError } = await supabase.from('kids').insert([dataWithOldCode]);
        
        if (retryError && (retryError.code === '42703' || retryError.code === 'PGRST204')) {
          // If it still fails, try a VERY minimal insert
          console.log('API: Fallback insert failed, attempting final minimal insert');
          const minimalData = {
            id,
            user_id: userId,
            name,
            avatar: avatar || null
          };
          console.log('API: Final minimal insert data:', JSON.stringify(minimalData));
          const { error: finalError } = await supabase.from('kids').insert([minimalData]);
          
          if (finalError && (finalError.code === '42703' || finalError.code === 'PGRST204')) {
             // Last ditch effort: maybe it's parent_id instead of user_id
             console.log('API: Minimal insert failed, trying parent_id fallback');
             const lastDitchData = {
               id,
               parent_id: userId,
               name,
               avatar: avatar || null
             };
             const { error: lastDitchError } = await supabase.from('kids').insert([lastDitchData]);
             if (lastDitchError) throw lastDitchError;
          } else if (finalError) {
            throw finalError;
          }
        } else if (retryError) {
          throw retryError;
        }
      } else {
        throw error;
      }
    }

    // Removed automatic chatbot creation. Parents will create it via Chatbot Management app.

    const io = req.app.get('io');
    if (io) io.to(`kid_${id}`).emit('data_updated', { kidId: id });

    res.status(201).json({ message: 'Kid added successfully', kid: { id, name } });
  } catch (error: any) {
    console.error('Create kid error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'No message',
      details: error.details || 'No details',
      hint: error.hint || 'No hint',
      code: error.code || 'No code',
      debug: 'v2'
    });
  }
});


// Debug endpoint to check quizzes table schema
app.get('/api/debug/quizzes-schema', async (req, res) => {
  try {
    const supabase = getAdminSupabaseClient();
    const { data, error } = await supabase.from('quizzes').select('*').limit(1);
    if (error) {
      return res.status(500).json({ error: error.message, details: error.details, code: error.code });
    }
    const columns = data && data.length > 0 ? Object.keys(data[0]) : 'No data to infer columns';
    res.json({ columns, sample: data?.[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Temp endpoint to check columns
app.get('/api/check-columns', async (req, res) => {
  const supabase = createClient(supabaseUrl || '', supabaseKey || '');
  const { data, error } = await supabase.from('messages').select('*').limit(1);
  res.json({ data, error });
});

// Get Kids by Parent Email
app.post('/api/kids/by-parent-email', async (req, res) => {
  const { email } = req.body;
  console.log('Fetching kids for parent email:', email);
  if (!email) return res.status(400).json({ error: 'Parent email is required' });

  try {
    const supabase = getAdminSupabaseClient();
    // Find user by email (case-insensitive)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .ilike('email', email)
      .single();

    if (userError || !user) {
      console.log('Parent user not found for email:', email, 'Error:', userError);
      return res.status(404).json({ error: 'Parent not found' });
    }

    console.log('Found parent user:', user.id);

    // Find kids for this user
    const { data: kids, error: kidsError } = await supabase
      .from('kids')
      .select('id, name')
      .eq('user_id', user.id);

    if (kidsError) {
      console.error('Error fetching kids from DB:', kidsError);
      throw kidsError;
    }

    console.log('Found kids:', kids?.length || 0);
    res.json({ kids: kids || [] });
  } catch (error: any) {
    console.error('Error fetching kids by parent email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Kids
app.post('/api/kids/verify-code', async (req, res) => {
  const { kidCode, kidId } = req.body;
  
  if (!kidCode) {
    return res.status(400).json({ error: 'Kid code is required' });
  }

  try {
    const supabase = getAdminSupabaseClient();
    
    let query = supabase
      .from('kids')
      .select('id, name, user_id');
    
    if (kidId) {
      query = query.eq('id', kidId);
    }

    // Try kid_code first
    let { data, error } = await supabase
      .from('kids')
      .select('*')
      .eq(kidId ? 'id' : 'id', kidId || '0') // Dummy condition if no kidId
      .eq('kid_code', kidCode)
      .maybeSingle();

    // If kid_code fails, try kidcode
    if (error || !data) {
      const { data: dataAlt, error: errorAlt } = await supabase
        .from('kids')
        .select('*')
        .eq(kidId ? 'id' : 'id', kidId || '0')
        .eq('kidcode', kidCode)
        .maybeSingle();
      
      if (errorAlt || !dataAlt) {
        return res.status(401).json({ error: 'Invalid Kid Code' });
      }
      data = dataAlt;
    }

    const userIdValue = data.user_id || data.parent_id;
    const token = jwt.sign(
      { role: 'kid', kidId: data.id, userId: userIdValue },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ kidId: data.id, name: data.name, token });
  } catch (error: any) {
    console.error('Error verifying kid code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const extractParentMessage = (kid: any) => {
  try {
    if (kid && kid.notes && typeof kid.notes === 'string') {
      // Find all occurrences of [Message]: (.*)
      // This will match both direct messages and messages inside [PendingReward]
      const matches = [...kid.notes.matchAll(/\[Message\]: (.*)/g)];
      if (matches.length > 0) {
        // Use the absolute last message found in the notes
        kid.parent_message = matches[matches.length - 1][1].trim();
      }
    }
  } catch (err) {
    console.error('Error in extractParentMessage:', err);
  }
  return kid;
};

const aggregateRewardMessages = (currentNotes: string, newRewardAmount: number, newBehaviorName: string, rewardTypeRaw: string) => {
  const now = Date.now();
  const AGGREGATION_THRESHOLD = 60 * 1000; // 1 minute
  
  let pendingBehaviors: any[] = [];
  const lines = currentNotes ? currentNotes.split('\n') : [];
  
  // Find the last [PendingReward] line to see if we can aggregate with it
  let lastPendingIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].startsWith('[PendingReward]: ')) {
      lastPendingIdx = i;
      break;
    }
  }

  let shouldAggregate = false;
  if (lastPendingIdx !== -1) {
    try {
      const line = lines[lastPendingIdx];
      const content = line.replace('[PendingReward]: ', '');
      const msgIndex = content.indexOf(' [Message]: ');
      const jsonPart = msgIndex !== -1 ? content.substring(0, msgIndex) : content;
      const parsed = JSON.parse(jsonPart);
      
      const timestamp = parsed.timestamp || 0;
      if (now - timestamp < AGGREGATION_THRESHOLD) {
        shouldAggregate = true;
        if (parsed.behaviors && Array.isArray(parsed.behaviors)) {
            pendingBehaviors.push(...parsed.behaviors);
        } else if (parsed.name || parsed.definition_name) {
            pendingBehaviors.push({ amount: parsed.amount, name: parsed.name || parsed.definition_name });
        }
        // Remove the line we're aggregating with
        lines.splice(lastPendingIdx, 1);
      }
    } catch (e) {
      // Failed to parse, treat as non-aggregatable
    }
  }

  // Add the new behavior
  pendingBehaviors.push({ amount: newRewardAmount, name: newBehaviorName });

  // Group by name to sum amounts for the same behavior
  const aggregatedMap = new Map<string, number>();
  pendingBehaviors.forEach(b => {
      aggregatedMap.set(b.name, (aggregatedMap.get(b.name) || 0) + b.amount);
  });
  
  const finalBehaviors = Array.from(aggregatedMap.entries()).map(([name, amount]) => ({ name, amount }));
  const totalAmount = finalBehaviors.reduce((sum, b) => sum + b.amount, 0);
  const behaviorNames = finalBehaviors.map(b => b.name);
  
  let behaviorListStr = '';
  if (behaviorNames.length === 1) {
    behaviorListStr = behaviorNames[0];
  } else if (behaviorNames.length === 2) {
    behaviorListStr = `${behaviorNames[0]} and ${behaviorNames[1]}`;
  } else if (behaviorNames.length > 2) {
    const last = behaviorNames.pop();
    behaviorListStr = `${behaviorNames.join(', ')} and ${last}`;
  }

  const rewardType = totalAmount === 1 
    ? (rewardTypeRaw.toLowerCase().endsWith('s') ? rewardTypeRaw.slice(0, -1) : rewardTypeRaw)
    : (rewardTypeRaw.toLowerCase().endsWith('s') ? rewardTypeRaw : rewardTypeRaw + 's');

  const goalMessage = `You have earned ${totalAmount} ${rewardType} for being ${behaviorListStr}.`;
  
  const aggregatedPayload = {
    amount: totalAmount,
    behaviors: finalBehaviors,
    already_added: true,
    timestamp: now
  };

  const pendingLine = `[PendingReward]: ${JSON.stringify(aggregatedPayload)} [Message]: ${goalMessage}`;
  
  let resultNotes = lines.join('\n').trim();
  if (resultNotes) resultNotes += '\n\n';
  resultNotes += pendingLine;
  
  return resultNotes;
};

// Get Kids
app.get('/api/kids', authenticateToken, async (req: any, res) => {
  const userId = req.user?.id;
  console.log(`[API_REQ] GET /api/kids - User: ${userId}`);
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = getSupabaseForUser(req);
    const { data: kids, error } = await supabase
      .from('kids')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching kids:', error);
      return res.status(500).json({ 
        error: 'Supabase Query Error', 
        message: error.message,
        details: error
      });
    }
    
    console.log(`Fetched ${kids?.length || 0} kids for user ${userId}`);
    
    // Fetch chatbot names for these kids
    const adminSupabase = getAdminSupabaseClient();
    const kidIds = (kids || []).map(k => k.id);
    let chatbotMap: Record<string, string> = {};
    
    if (kidIds.length > 0) {
      const { data: chatbots, error: chatbotError } = await adminSupabase
        .from('chatbots')
        .select('kid_id, name')
        .in('kid_id', kidIds);
      
      if (!chatbotError && chatbots) {
        chatbotMap = chatbots.reduce((acc: any, cb: any) => {
          acc[cb.kid_id] = cb.name;
          return acc;
        }, {});
      }
    }

    const processedKids = (kids || []).map(k => {
      const kid = extractParentMessage(k);
      if (!kid.chatbot_name && chatbotMap[kid.id]) {
        kid.chatbot_name = chatbotMap[kid.id];
      }
      return kid;
    });
    res.json({ kids: processedKids });
  } catch (error) {
    console.error('Unexpected error fetching kids:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Single Kid
app.get('/api/kids/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  console.log(`[${new Date().toISOString()}] GET /api/kids/${id} - Request by ${req.user.id}`);
  
  try {
    const supabase = getSupabaseForUser(req);
    const { data: kid, error } = await supabase
      .from('kids')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching kid ${id}:`, error);
      return res.status(error.code === 'PGRST116' ? 404 : 500).json({ 
        error: error.code === 'PGRST116' ? 'Kid not found' : 'Database error',
        details: error.message 
      });
    }
    
    if (!kid) return res.status(404).json({ error: 'Kid not found' });
    
    if (kid.user_id !== req.user.id && req.user.role !== 'kid') {
      console.warn(`Access denied for kid ${id} to user ${req.user.id}`);
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Fetch chatbot settings if available
    try {
      const { data: chatbot } = await supabase
        .from('chatbots')
        .select('*')
        .eq('kid_id', id)
        .single();

      if (chatbot && chatbot.name) {
        kid.chatbot_name = chatbot.name;
      }
    } catch (cbErr) {
      // Chatbot is optional, don't crash if it fails
      console.warn('Chatbot settings fetch failed:', cbErr);
    }

    const processedKid = extractParentMessage({ ...kid });
    res.json({ kid: processedKid });
  } catch (error: any) {
    console.error(`Unexpected error in GET /api/kids/${id}:`, error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Update Kid
app.put('/api/kids/:id', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;
  const userId = req.user.id;
  const { 
    name, 
    dob, 
    grade_level: gradeLevel, 
    hobbies, 
    interests, 
    strengths, 
    weaknesses, 
    sensory_issues: sensoryIssues, 
    behavioral_issues: behavioralIssues, 
    notes, 
    avatar, 
    start_time: startTime, 
    end_time: endTime, 
    max_incomplete_limit: maxIncompleteLimit, 
    reward_type: rewardType, 
    reward_quantity: rewardQuantity, 
    reward_balance: rewardBalance, 
    rules, 
    theme, 
    can_print: canPrint, 
    timezone, 
    kid_code: kidCode,
    parent_message: parentMessage,
    therapies
  } = req.body;

  try {
    // Verify ownership
    const { data: kid, error: checkError } = await supabase
      .from('kids')
      .select('user_id, notes, reward_balance, name, reward_type')
      .eq('id', id)
      .single();

    if (checkError || !kid || kid.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (dob !== undefined) updates.dob = dob;
    if (gradeLevel !== undefined) updates.grade_level = gradeLevel;
    if (hobbies !== undefined) updates.hobbies = hobbies;
    if (interests !== undefined) updates.interests = interests;
    if (strengths !== undefined) updates.strengths = strengths;
    if (weaknesses !== undefined) updates.weaknesses = weaknesses;
    if (sensoryIssues !== undefined) updates.sensory_issues = sensoryIssues;
    if (behavioralIssues !== undefined) updates.behavioral_issues = behavioralIssues;
    if (therapies !== undefined) updates.therapies = therapies;
    if (notes !== undefined) updates.notes = notes;
    if (canPrint !== undefined) updates.can_print = canPrint;
    if (avatar !== undefined) updates.avatar = avatar;
    if (startTime !== undefined) updates.start_time = startTime !== '' ? startTime : null;
    if (endTime !== undefined) updates.end_time = endTime !== '' ? endTime : null;
    if (rewardType !== undefined) updates.reward_type = rewardType;
    if (rewardQuantity !== undefined) {
      const parsedQty = parseInt(rewardQuantity, 10);
      updates.reward_quantity = !isNaN(parsedQty) ? parsedQty : 1;
    }
    if (rewardBalance !== undefined) {
      const parsedBal = parseInt(rewardBalance, 10);
      const oldBalance = kid.reward_balance || 0;
      updates.reward_balance = !isNaN(parsedBal) ? parsedBal : 0;
      
      // If balance increased, log as a manual reward in history
      if (updates.reward_balance > oldBalance) {
        const amountEarned = updates.reward_balance - oldBalance;
        const currentRewardType = rewardType || kid.reward_type || 'point';
        const currentKidName = name || kid.name || 'Kid';
        
        // Ensure reward type is lowercase for the sentence if needed, or keep as is.
        // The prompt says [reward type]s. We'll append 's' if not present.
        let rewardDisplay = currentRewardType;
        if (!rewardDisplay.toLowerCase().endsWith('s')) {
          rewardDisplay += 's';
        }

        await supabase.from('activity_history').insert({
          kid_id: id,
          activity_type: 'Parent Bonus',
          category: 'Reward',
          description: `Parent gave the ${rewardDisplay} to ${currentKidName}.`,
          reward_qty: amountEarned,
          completed_at: new Date().toISOString()
        });
      }
    }
    if (maxIncompleteLimit !== undefined) {
      const parsedLimit = parseInt(maxIncompleteLimit, 10);
      updates.max_incomplete_limit = !isNaN(parsedLimit) ? parsedLimit : null;
    }
    if (rules !== undefined) updates.rules = rules;
    if (theme !== undefined) updates.theme = theme;
    if (timezone !== undefined) updates.timezone = timezone;
    if (kidCode !== undefined) updates.kid_code = kidCode;
    if (parentMessage !== undefined) {
      // Since parent_message column doesn't exist, we append it to notes
      updates.notes = (kid.notes ? kid.notes + '\n\n' : '') + '[Message]: ' + parentMessage;
    }
    // timezone is removed as it does not exist in the database schema

    console.log('API: Updating kid id:', id, 'updates:', updates);
    const { error } = await supabase
      .from('kids')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('API: Supabase kid update error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      if (error.code === '42703' || error.code === 'PGRST204') {
        console.log('API: Attempting fallback for column error');
        // Fallback: try kidcode instead of kid_code, and remove potentially missing columns
        const { 
          timezone: _tz, 
          start_time: _st, 
          end_time: _et, 
          kid_code: _kc, 
          therapies: _th,
          reward_balance: _rb,
          can_print: _cp,
          max_incomplete_limit: _mil,
          reward_type: _rt,
          reward_quantity: _rq,
          sensory_issues: _si,
          behavioral_issues: _bi,
          grade_level: _gl,
          ...fallbackUpdates 
        } = updates;
        
        const updatesWithOldCode: any = { ...fallbackUpdates };
        if (_kc !== undefined) updatesWithOldCode.kidcode = _kc;
        if (_gl !== undefined) updatesWithOldCode.gradelevel = _gl;

        console.log('API: Attempting fallback update with data:', JSON.stringify(updatesWithOldCode));
        const { error: retryError } = await supabase
          .from('kids')
          .update(updatesWithOldCode)
          .eq('id', id);

        if (retryError && (retryError.code === '42703' || retryError.code === 'PGRST204')) {
          // If kidcode also fails, remove it and try one last time
          console.log('API: Fallback update failed, attempting final minimal update');
          const { error: finalError } = await supabase
            .from('kids')
            .update(fallbackUpdates)
            .eq('id', id);
          
          if (finalError && (finalError.code === '42703' || finalError.code === 'PGRST204')) {
            // Try very minimal update
            const minimalUpdates: any = { name: updates.name || undefined, avatar: updates.avatar || undefined };
            // Remove undefined values
            Object.keys(minimalUpdates).forEach(key => minimalUpdates[key] === undefined && delete minimalUpdates[key]);
            
            if (Object.keys(minimalUpdates).length > 0) {
              console.log('API: Attempting very minimal update:', JSON.stringify(minimalUpdates));
              const { error: veryMinimalError } = await supabase.from('kids').update(minimalUpdates).eq('id', id);
              
              if (veryMinimalError && (veryMinimalError.code === '42703' || veryMinimalError.code === 'PGRST204')) {
                // One last try: maybe it's parent_id instead of user_id (though unlikely for update)
                // But we don't update user_id usually.
                console.log('API: Very minimal update failed, throwing error');
                throw veryMinimalError;
              } else if (veryMinimalError) {
                throw veryMinimalError;
              }
            }
          } else if (finalError) {
            throw finalError;
          }
        } else if (retryError) {
          console.error('API: Supabase kid update fallback error:', retryError);
          throw retryError;
        }
      } else {
        throw error;
      }
    }

    const io = req.app.get('io');
    if (io) io.to(`kid_${id}`).emit('data_updated', { kidId: id });

    res.json({ message: 'Kid updated successfully' });
  } catch (error: any) {
    console.error('Update kid error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'No message',
      details: error.details || 'No details',
      hint: error.hint || 'No hint',
      code: error.code || 'No code',
      debug: 'v2-put'
    });
  }
});

// Delete Kid
app.delete('/api/kids/:id', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const { data: kid, error: checkError } = await supabase
      .from('kids')
      .select('user_id')
      .eq('id', id)
      .single();

    if (checkError || !kid || kid.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const { error } = await supabase
      .from('kids')
      .delete()
      .eq('id', id);

    if (error) throw error;

    const io = req.app.get('io');
    if (io) io.to(`kid_${id}`).emit('data_updated', { kidId: id });

    res.json({ message: 'Kid deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Behaviors API
app.get('/api/kids/:kidId/behavior-definitions', authenticateToken, async (req: any, res) => {
  const adminSupabase = getAdminSupabaseClient();
  const supabase = getSupabaseForUser(req);
  const { kidId } = req.params;

  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(kidId)) {
    return res.status(400).json({ error: 'Invalid kid ID' });
  }

  try {
    // Verify ownership first using user's RLS
    const { data: kidCheck, error: checkError } = await supabase
      .from('kids')
      .select('id')
      .eq('id', kidId)
      .maybeSingle();

    if (checkError || !kidCheck) {
      return res.status(403).json({ error: 'Unauthorized or kid not found' });
    }

    const { data: definitions, error } = await adminSupabase
      .from('behavior_definitions')
      .select('*')
      .eq('kid_id', kidId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[GET behavior-definitions] Supabase Error:', error);
      throw error;
    }
    res.json({ definitions: definitions || [] });
  } catch (error: any) {
    console.error('[GET behavior-definitions] Error:', error);
    res.status(500).json({ error: 'Failed to fetch behavior definitions', details: error.message });
  }
});

app.post('/api/kids/:kidId/behavior-definitions', authenticateToken, async (req: any, res) => {
  const adminSupabase = getAdminSupabaseClient();
  const supabase = getSupabaseForUser(req);
  const { kidId } = req.params;
  const { name, description, occurrence, icon, priority, goal_rewards, target_time, goal, is_active } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Missing required field: name' });
  }

  try {
    const { data: kidCheck, error: checkError } = await supabase
      .from('kids')
      .select('id')
      .eq('id', kidId)
      .maybeSingle();

    if (checkError || !kidCheck) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const payload: any = { 
      kid_id: kidId, 
      name, 
      description,
      priority: priority || 'Medium',
      goal_rewards: parseInt(goal_rewards) || 1,
      target_time: target_time || '00:00:00',
      target_seconds: parseInt(req.body.target_seconds) || 0,
      goal: goal !== undefined ? parseInt(goal) : 0,
      is_active: is_active !== undefined ? is_active : true
    };

    const { data: definition, error } = await adminSupabase
      .from('behavior_definitions')
      .insert([payload])
      .select()
      .maybeSingle();

    if (error) {
      console.error('[POST behavior-definitions] Supabase Error:', JSON.stringify(error, null, 2));
      throw error;
    }

    // Insert initial tracking record into behavior_tracker table
    if (definition) {
      const initialBehaviorTracker: any = {
        kid_id: kidId,
        definition_id: definition.id,
        points: 0,
        remarks: ''
      };

      const { error: trackerError } = await adminSupabase
        .from('behavior_tracker')
        .insert([initialBehaviorTracker]);

      if (trackerError) {
        console.warn('[POST behavior-definitions] Failed to insert initial tracker (ignoring):', trackerError.message || trackerError);
      }
    }

    res.status(201).json({ definition });
  } catch (error: any) {
    console.error('[POST behavior-definitions] Catch Error:', error?.message || error);
    res.status(500).json({ error: 'Failed to create behavior definition', details: error?.message || 'Unknown error' });
  }
});

app.get('/api/behavior-definitions/:id', authenticateToken, async (req: any, res) => {
  const adminSupabase = getAdminSupabaseClient();
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;

  try {
    const { data: definition, error } = await adminSupabase
      .from('behavior_definitions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !definition) {
      return res.status(404).json({ error: 'Behavior definition not found' });
    }

    // Check ownership
    const { data: kidCheck, error: checkError } = await supabase
      .from('kids')
      .select('id')
      .eq('id', definition.kid_id)
      .maybeSingle();

    if (checkError || !kidCheck) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({ definition });
  } catch (error: any) {
    console.error('[GET behavior-definition] Error:', error);
    res.status(500).json({ error: 'Failed to fetch behavior definition', details: error.message });
  }
});

app.put('/api/behavior-definitions/:id', authenticateToken, async (req: any, res) => {
  const adminSupabase = getAdminSupabaseClient();
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;
  const { name, description, occurrence, icon, priority, goal_rewards, target_time, goal, is_active } = req.body;

  try {
    // Verify ownership of the definition first
    const { data: def, error: fetchError } = await adminSupabase
      .from('behavior_definitions')
      .select('kid_id')
      .eq('id', id)
      .single();

    if (fetchError || !def) {
      return res.status(404).json({ error: 'Behavior definition not found' });
    }

    const { data: kidCheck, error: checkError } = await supabase
      .from('kids')
      .select('id')
      .eq('id', def.kid_id)
      .maybeSingle();

    if (checkError || !kidCheck) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const payload: any = { 
      name, 
      description,
      priority: priority || 'Medium',
      goal_rewards: parseInt(goal_rewards) || 1,
      target_time: target_time || '00:00:00',
      target_seconds: parseInt(req.body.target_seconds) || 0,
      goal: goal !== undefined ? parseInt(goal) : 0,
      is_active: is_active !== undefined ? is_active : true
    };

    const { data: updatedDef, error } = await adminSupabase
      .from('behavior_definitions')
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[PUT behavior-definitions] Supabase Error:', JSON.stringify(error, null, 2));
      throw error;
    }
    res.json({ definition: updatedDef });
  } catch (error: any) {
    console.error('[PUT behavior-definitions] Catch Error:', error?.message || error);
    res.status(500).json({ error: 'Failed to update behavior definition', details: error?.message || 'Unknown error' });
  }
});

app.delete('/api/behavior-definitions/:id', authenticateToken, async (req: any, res) => {
  const adminSupabase = getAdminSupabaseClient();
  const { id } = req.params;
  const userId = (req as any).user.id;

  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid behavior definition ID format' });
  }

  try {
    // 1. Get the definition to find which kid it belongs to
    const { data: definition, error: getError } = await adminSupabase
      .from('behavior_definitions')
      .select('id, kid_id')
      .eq('id', id)
      .maybeSingle();

    if (getError) {
      console.error('[DELETE behavior-definitions] Fetch Error:', getError);
      return res.status(500).json({ error: 'Database error while fetching definition info', details: getError.message });
    }

    if (!definition) {
      console.warn(`[DELETE behavior-definitions] Definition not found: ${id}`);
      return res.status(404).json({ error: 'Behavior definition not found' });
    }

    // Security Check: Verify user owns the kid this definition belongs to
    // We use the user's supabase client to check if they can access this kid
    const supabaseForUser = getSupabaseForUser(req);
    const { data: kidCheck, error: checkError } = await supabaseForUser
      .from('kids')
      .select('id')
      .eq('id', definition.kid_id)
      .maybeSingle();

    if (checkError || !kidCheck) {
      console.warn(`[DELETE behavior-definitions] Authorization failed for user ${userId} on kid ${definition.kid_id}`);
      return res.status(403).json({ error: 'Unauthorized: You do not have permission to delete definitions from this kid profile' });
    }

    // Explicit Deletion Protocol
    console.log(`[DELETE behavior-definitions] Starting explicit cleanup for ID: ${id}`);
    
    // 1. Delete from behavior_tracker explicitly
    const { error: tErr } = await adminSupabase
      .from('behavior_tracker')
      .delete()
      .eq('definition_id', id);
    if (tErr) console.warn('[DELETE behavior-definitions] Tracker delete warning:', tErr.message);

    // 2. Clean up behavior_logs
    const { error: lErr } = await adminSupabase
      .from('behavior_logs')
      .update({ definition_id: null })
      .eq('definition_id', id);
    if (lErr) console.warn('[DELETE behavior-definitions] Logs update warning:', lErr.message);

    // 4. Finally delete the definition itself
    const { error: finalDeleteErr } = await adminSupabase
      .from('behavior_definitions')
      .delete()
      .eq('id', id);

    if (finalDeleteErr) {
      console.error('[DELETE behavior-definitions] Final Delete Error:', finalDeleteErr);
      return res.status(500).json({ error: 'Database rejected the final deletion', details: finalDeleteErr.message });
    }

    console.log(`[DELETE behavior-definitions] Successfully deleted ID ${id}`);

    // Real-time update for the kid
    const io = req.app.get('io');
    if (io) {
        io.to(`kid_${definition.kid_id}`).emit('data_updated', { kidId: definition.kid_id });
        io.to(`kid_${definition.kid_id}`).emit('behavior_definition_deleted', { id });
    }

    res.json({ message: 'Behavior definition deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE behavior-definitions] Catch Error:', error);
    res.status(500).json({ error: 'An unexpected error occurred during deletion', details: error.message });
  }
});

app.get('/api/kids/:kidId/behaviors', authenticateToken, async (req: any, res) => {
  const adminSupabase = getAdminSupabaseClient();
  const supabase = getSupabaseForUser(req);
  const { kidId } = req.params;

  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(kidId)) {
    return res.status(400).json({ error: 'Invalid kid ID' });
  }

  try {
    // Verify ownership first using user's RLS
    const { data: kidCheck, error: checkError } = await supabase
      .from('kids')
      .select('id')
      .eq('id', kidId)
      .maybeSingle();

    if (checkError || !kidCheck) {
      return res.status(403).json({ error: 'Unauthorized or kid not found' });
    }

    // Fetch behaviors using admin client to avoid join/RLS issues
    const { data: behaviors, error: behaviorsError } = await adminSupabase
      .from('behavior_logs')
      .select('*')
      .eq('kid_id', kidId)
      .order('date', { ascending: false });

    if (behaviorsError) {
      console.error('[GET behaviors] Supabase Error:', JSON.stringify(behaviorsError, null, 2));
      throw behaviorsError;
    }

    // Fetch definitions separately to avoid missing relationship (PGRST200) issue
    const { data: definitions, error: defsError } = await adminSupabase
      .from('behavior_definitions')
      .select('*')
      .eq('kid_id', kidId);

    if (defsError) {
      console.error('[GET behaviors] Supabase Error (definitions):', defsError);
      // We can still return behaviors even if definitions fail
    }

    // Merge manually
    const enrichedBehaviors = (behaviors || []).map(b => ({
      ...b,
      token_change: b.rewards_earned || 0, // Alias for frontend
      behavior_definitions: (definitions || []).find(d => d.id === b.definition_id) || null
    }));

    res.json({ behaviors: enrichedBehaviors });
  } catch (error: any) {
    console.error('[GET behaviors] Catch Error:', error);
    res.status(500).json({ error: 'Failed to fetch behaviors', details: error.message });
  }
});

const recordBehaviorLog = async (adminSupabase: any, kidId: string, definition_id: string, points: number, rewards: number, description: string, date?: string, remarks?: string) => {
  // Include points/notes in description since columns like 'points' or 'remarks' might be missing in behaviors
  let finalDescription = description || 'Behavior reported';
  if (points > 0) {
    finalDescription = `${finalDescription} (+${points} points)`;
  }
  if (remarks) {
    finalDescription = `${finalDescription} (Note: ${remarks})`;
  }

  let finalDate = date;
  if (!finalDate) {
    try {
      const { data: kid } = await adminSupabase.from('kids').select('timezone').eq('id', kidId).single();
      const tz = kid?.timezone || 'UTC';
      finalDate = new Intl.DateTimeFormat('en-CA', { 
        timeZone: tz, 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).format(new Date());
    } catch (e) {
      finalDate = new Date().toISOString().split('T')[0];
    }
  }

  const logEntry: any = {
    kid_id: kidId,
    definition_id: definition_id || null,
    type: 'desired',
    description: finalDescription,
    date: finalDate,
    rewards_earned: rewards,
    points: points
  };
  
  console.log('[recordBehaviorLog] Attempting insert into behavior_logs:', JSON.stringify(logEntry));
  
  try {
    const { data, error } = await adminSupabase.from('behavior_logs').insert([logEntry]).select();
    if (error) {
      console.error('[recordBehaviorLog] behavior_logs Error:', JSON.stringify(error, null, 2));
      throw error;
    }
    return data;
  } catch (err) {
    console.error('[recordBehaviorLog] Fatal Error:', err);
    throw err;
  }
};

// Update behavior tracker and handle goals
const updateTrackerAndCheckGoal = async (adminSupabase: any, io: any, kidId: string, definition_id: string, incrementalPoints: number, remarks: string, providedDate?: string) => {
    // 0. Fetch definition for logic
    const { data: bDef, error: defError } = await adminSupabase
        .from('behavior_definitions')
        .select('goal, goal_rewards, name')
        .eq('id', definition_id)
        .maybeSingle();
    if (defError) throw defError;

    // 1. Try to find if record exists
    const { data: existing, error: findError } = await adminSupabase
      .from('behavior_tracker')
      .select('id, points')
      .eq('kid_id', kidId)
      .eq('definition_id', definition_id)
      .maybeSingle();
      
    if (findError) throw findError;
    
    const oldPoints = existing?.points || 0;
    const newPoints = oldPoints + incrementalPoints;
    
    // Check if goal just reached
    const goalThreshold = (bDef?.goal || 1);
    const goalReached = newPoints >= goalThreshold;

    let updatedData;
    if (existing) {
        // 2. Update
        const { data: ud, error: updateError } = await adminSupabase
            .from('behavior_tracker')
            .update({
                points: goalReached ? 0 : newPoints,
                remarks: remarks || '',
                last_checked_time: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select()
            .maybeSingle();
        if (updateError) throw updateError;
        updatedData = ud;
    } else {
        // 3. Insert
        const { data: id, error: insertError } = await adminSupabase
            .from('behavior_tracker')
            .insert({
                kid_id: kidId,
                definition_id,
                points: goalReached ? 0 : newPoints,
                remarks: remarks || '',
                last_checked_time: new Date().toISOString()
            })
            .select()
            .maybeSingle();
        if (insertError) throw insertError;
        updatedData = id;
    }

    // Always log the behavior increment
    if (incrementalPoints > 0) {
        await recordBehaviorLog(adminSupabase, kidId, definition_id, incrementalPoints, 0, `Log for ${bDef?.name || 'Behavior'}`, providedDate, remarks);
    }

    // Handle goal reached
    if (goalReached) {
        const { data: kid, error: kidErr } = await adminSupabase
            .from('kids')
            .select('notes, reward_type')
            .eq('id', kidId)
            .single();

        if (!kidErr && kid) {
            let currentNotes = kid.notes || '';
            
            // Increment balance
            if (bDef?.goal_rewards) {
                await adminSupabase.rpc('increment_reward_balance', {
                    kid_id_param: kidId,
                    amount: bDef.goal_rewards
                });

                // Log to behaviors for progress report
                await recordBehaviorLog(
                    adminSupabase, 
                    kidId, 
                    definition_id, 
                    0, 
                    bDef.goal_rewards, 
                    `Goal reached: ${bDef?.name || 'Behavior Goal'}`,
                    providedDate,
                    remarks
                );

                // Goal reached message
                currentNotes = aggregateRewardMessages(
                    currentNotes,
                    bDef.goal_rewards,
                    bDef.name,
                    kid.reward_type || 'stars'
                );
                
                await adminSupabase.from('kids').update({ notes: currentNotes }).eq('id', kidId);
            }
        }
    } 

    // Real-time update
    if (io) {
        io.to(`kid_${kidId}`).emit('data_updated', { kidId });
    }

    return updatedData;
};

app.post('/api/kids/:kidId/behaviors', authenticateToken, async (req: any, res) => {
  const adminSupabase = getAdminSupabaseClient();
  const supabase = getSupabaseForUser(req);
  const { kidId } = req.params;
  const { type, description, definition_id, token_change, rewards_earned, date, hour, completed, remarks, occurrence } = req.body;
  const finalRewards = rewards_earned || token_change || 0;

  try {
    // Verify ownership first
    const { data: kidCheck, error: checkError } = await supabase
      .from('kids')
      .select('id')
      .eq('id', kidId)
      .maybeSingle();

    if (checkError || !kidCheck) {
      return res.status(403).json({ error: 'Unauthorized or kid not found' });
    }

    if (definition_id) {
        // Use the new helper if we have a definition
        const updatedTracker = await updateTrackerAndCheckGoal(
            adminSupabase, 
            req.app.get('io'), 
            kidId, 
            definition_id, 
            1, // Standard increment
            remarks || '',
            date
        );
        return res.status(201).json({ tracker: updatedTracker });
    } else {
        // Fallback for manual behaviors without definitions
        await recordBehaviorLog(
            adminSupabase, 
            kidId, 
            null as any, 
            1, 
            finalRewards, 
            description || 'Manual Behavior', 
            date, 
            remarks
        );
        
        if (finalRewards) {
            await adminSupabase.rpc('increment_reward_balance', {
                kid_id_param: kidId,
                amount: finalRewards
            });
        }
        
        const io = req.app.get('io');
        if (io) io.to(`kid_${kidId}`).emit('data_updated', { kidId, type: 'behavior_logged' });
        return res.status(201).json({ message: 'Behavior logged' });
    }
  } catch (error: any) {
    console.error('[POST behaviors] Error:', error);
    res.status(500).json({ error: 'Failed to log behavior', details: error.message });
  }
});

app.delete('/api/behaviors/:id', authenticateToken, async (req: any, res) => {
  const adminSupabase = getAdminSupabaseClient();
  const { id } = req.params;

  try {
    const { data: log, error: fetchError } = await adminSupabase
      .from('behavior_logs')
      .select('kid_id, rewards_earned')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !log) {
      return res.status(404).json({ error: 'Log not found' });
    }

    const { error: delError } = await adminSupabase
      .from('behavior_logs')
      .delete()
      .eq('id', id);

    if (delError) throw delError;

    // Revert balance if needed
    if (log.rewards_earned) {
        await adminSupabase.rpc('increment_reward_balance', {
            kid_id_param: log.kid_id,
            amount: -log.rewards_earned
        });
    }

    res.json({ message: 'Deleted' });
  } catch (error: any) {
    console.error('[DELETE behavior] Error:', error);
    res.status(500).json({ error: 'Failed to delete behavior', details: error.message });
  }
});

app.get('/api/kids/:kidId/behavior-tracker', authenticateToken, async (req: any, res) => {
  const adminSupabase = getAdminSupabaseClient();
  const supabase = getSupabaseForUser(req);
  const { kidId } = req.params;

  try {
    const { data: tracker, error: trackerError } = await adminSupabase
      .from('behavior_tracker')
      .select('*')
      .eq('kid_id', kidId);

    if (trackerError) {
        console.warn('[GET behavior-tracker] Supabase Error:', trackerError.message);
        return res.json({ tracker: [] }); // Graceful fallback
    }

    res.json({ tracker: tracker || [] });
  } catch (error: any) {
    console.warn('[GET behavior-tracker] Fallback used for missing table');
    res.json({ tracker: [] });
  }
});

app.get('/api/kids/:kidId/behavior-logs', authenticateToken, async (req: any, res) => {
  const adminSupabase = getAdminSupabaseClient();
  const { kidId } = req.params;

  try {
    // Fetch from behavior_logs table (primary)
    const { data: logs, error: logsError } = await adminSupabase
      .from('behavior_logs')
      .select('*, behavior_definitions(name, priority, target_time, description)')
      .eq('kid_id', kidId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (logsError) {
        console.error('[GET behavior-logs] Supabase Error:', JSON.stringify(logsError, null, 2));
    }

    const combinedLogs = (logs || []).map(l => ({
        ...l,
        token_change: l.rewards_earned || 0, // Alias for frontend
        rewards_earned: l.rewards_earned || 0
    }));

    let trackerData = [];
    try {
        const { data: td, error: trackerError } = await adminSupabase
          .from('behavior_tracker')
          .select('definition_id, remarks, points')
          .eq('kid_id', kidId);
        
        if (trackerError) {
             console.warn('[GET behavior-logs] Tracker fetch warning (might not exist):', trackerError.message);
        } else {
            trackerData = td || [];
        }
    } catch (e) {
        console.warn('[GET behavior-logs] behavior_tracker table missing or inaccessible');
    }

    console.log(`[GET behavior-logs] Found ${combinedLogs.length} logs and ${trackerData.length} tracker entries for kid ${kidId}`);
    res.json({ logs: combinedLogs, tracker: trackerData });
  } catch (error: any) {
    console.error('[GET behavior-logs] Catch Error:', error);
    res.status(500).json({ error: 'Failed to fetch behavior logs', details: error.message });
  }
});

app.post('/api/kids/:kidId/behavior-tracker', authenticateToken, async (req: any, res) => {
  const adminSupabase = getAdminSupabaseClient();
  const { kidId } = req.params;
  const { definition_id, points, remarks, date } = req.body;

  try {
    // Try to find if record exists to calculate increment
    const { data: existing } = await adminSupabase
      .from('behavior_tracker')
      .select('points')
      .eq('kid_id', kidId)
      .eq('definition_id', definition_id)
      .maybeSingle();

    const oldPoints = existing?.points || 0;
    const targetPoints = parseInt(points) || 0;
    const increment = Math.max(0, targetPoints - oldPoints);

    const updatedData = await updateTrackerAndCheckGoal(
        adminSupabase,
        req.app.get('io'),
        kidId,
        definition_id,
        increment,
        remarks || '',
        date
    );

    return res.status(200).json({ tracker: updatedData });
  } catch (error: any) {
    console.error('[POST behavior-tracker] Error:', error);
    res.status(500).json({ error: 'Failed to update behavior tracker', details: error.message });
  }
});


// Get all activity templates for a user
app.get('/api/activity-templates', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const userId = req.user.id;
  try {
    const { data: templates, error } = await supabase
      .from('activity_templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') { // undefined_table
        return res.json({ templates: [] });
      }
      throw error;
    }

    // Fetch steps for templates
    let allSteps: any[] = [];
    if (templates && templates.length > 0) {
      const { data: steps, error: stepsError } = await supabase
        .from('activity_template_steps')
        .select('*')
        .in('template_id', templates.map((t: any) => t.id))
        .order('step_number', { ascending: true });
      
      if (!stepsError) {
        allSteps = steps || [];
      }
    }

    const templatesWithSteps = templates.map((t: any) => ({
      ...t,
      steps: allSteps.filter(s => s.template_id === t.id)
    }));

    res.json({ templates: templatesWithSteps });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create an activity template
app.post('/api/activity-templates', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { activityType, category, description, link, imageUrl, steps } = req.body;
  const userId = req.user.id;

  try {
    const id = uuidv4();
    const { data: template, error: templateError } = await supabase
      .from('activity_templates')
      .insert([
        {
          id,
          user_id: userId,
          activity_type: activityType,
          category,
          description,
          link,
          image_url: imageUrl
        }
      ])
      .select()
      .single();

    if (templateError) throw templateError;

    if (steps && Array.isArray(steps) && steps.length > 0) {
      const stepsToInsert = steps.map((step: any, index: number) => ({
        template_id: id,
        step_number: index + 1,
        description: step.description,
        image_url: step.image_url || step.imageUrl
      }));

      const { error: stepsError } = await supabase
        .from('activity_template_steps')
        .insert(stepsToInsert);

      if (stepsError) throw stepsError;
    }

    res.status(201).json({ id, message: 'Activity template created' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an activity template
app.put('/api/activity-templates/:id', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;
  const { activityType, category, description, link, imageUrl, steps } = req.body;
  const userId = req.user.id;

  try {
    const { error: templateError } = await supabase
      .from('activity_templates')
      .update({
        activity_type: activityType,
        category,
        description,
        link,
        image_url: imageUrl
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (templateError) throw templateError;

    // Update steps: delete existing and insert new
    await supabase.from('activity_template_steps').delete().eq('template_id', id);

    if (steps && Array.isArray(steps) && steps.length > 0) {
      const stepsToInsert = steps.map((step: any, index: number) => ({
        template_id: id,
        step_number: index + 1,
        description: step.description,
        image_url: step.image_url || step.imageUrl
      }));

      const { error: stepsError } = await supabase
        .from('activity_template_steps')
        .insert(stepsToInsert);

      if (stepsError) throw stepsError;
    }

    res.json({ message: 'Activity template updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an activity template
app.delete('/api/activity-templates/:id', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const { data: template, error: checkError } = await supabase
      .from('activity_templates')
      .select('user_id')
      .eq('id', id)
      .single();

    if (checkError || !template || template.user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { error } = await supabase
      .from('activity_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Activity template deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign template to a kid
app.post('/api/activity-templates/:id/assign', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;
  const { kidId, dueDate } = req.body;
  const userId = req.user.id;

  try {
    // Verify template ownership
    const { data: template, error: templateError } = await supabase
      .from('activity_templates')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (templateError || !template) return res.status(404).json({ error: 'Template not found' });

    // Verify kid ownership
    const { data: kid, error: kidError } = await supabase
      .from('kids')
      .select('user_id')
      .eq('id', kidId)
      .single();

    if (kidError || !kid || kid.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    // Fetch template steps
    const { data: steps, error: stepsError } = await supabase
      .from('activity_template_steps')
      .select('*')
      .eq('template_id', id)
      .order('step_number', { ascending: true });

    // Create activity
    const activityId = uuidv4();
    const { error: activityError } = await supabase
      .from('activities')
      .insert([
        {
          id: activityId,
          kid_id: kidId,
          activity_type: template.activity_type,
          category: template.category,
          repeat_frequency: template.repeat_frequency,
          time_of_day: template.time_of_day,
          description: template.description,
          link: template.link,
          image_url: template.image_url,
          status: 'pending',
          due_date: dueDate
        }
      ]);

    if (activityError) throw activityError;

    // Create activity steps
    if (steps && steps.length > 0) {
      const stepsToInsert = steps.map(s => ({
        activity_id: activityId,
        step_number: s.step_number,
        description: s.description,
        image_url: s.image_url
      }));

      const { error: stepsInsertError } = await supabase
        .from('activity_steps')
        .insert(stepsToInsert);
      
      if (stepsInsertError) throw stepsInsertError;
    }

    const io = req.app.get('io');
    if (io) io.to(`kid_${kidId}`).emit('data_updated', { kidId });

    res.json({ message: 'Activity assigned successfully', activityId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Activities API ---

// Get Activities for a Kid
app.get('/api/kids/:kidId/activities', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { kidId } = req.params;
  console.log('API: Fetching activities for kidId:', kidId);
  const { mode, localDate, localTime } = req.query;
  const userId = req.user.id;

  try {
    // Verify kid belongs to user
    console.log('API: Querying kid table for id:', kidId);
    const { data: kid, error: kidError } = await supabase
      .from('kids')
      .select('user_id, max_incomplete_limit, end_time, timezone')
      .eq('id', kidId)
      .single();

    if (kidError) {
      console.error('API: Supabase kid query error:', {
        message: kidError.message,
        details: kidError.details,
        hint: kidError.hint,
        code: kidError.code
      });
      return res.status(404).json({ error: 'Kid not found', details: kidError.message });
    }
    if (!kid) {
      console.error('API: Kid not found for id:', kidId);
      return res.status(404).json({ error: 'Kid not found' });
    }
    if (kid.user_id !== userId) {
      console.error('API: Forbidden: kid.user_id', kid.user_id, '!= userId', userId);
      return res.status(403).json({ error: 'Forbidden' });
    }

    // --- Auto-assign overdue activities logic ---
    const kidTimezone = (kid as any).timezone || 'UTC';
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: kidTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    
    const today = (localDate as string) || `${year}-${month}-${day}`;
    const currentTime = localTime ? parseInt(localTime as string, 10) : (hour * 60 + minute);
    
    console.log('API: Auto-assign logic, mode:', mode, 'today:', today, 'currentTime:', currentTime);
    if (mode === 'kid' || mode === 'parent') {
      console.log('API: Calling moveOverdueActivities for kid:', kidId);
      await moveOverdueActivities(supabase, kidId, kid, today, currentTime);
    }
    // --- End Auto-assign logic ---

    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .eq('kid_id', kidId);
      // .order('created_at', { ascending: false }); // Removed order to see all

    if (activitiesError) throw activitiesError;

    console.log(`API: Found ${activities?.length || 0} activities for kid ${kidId}`);
    
    let filteredActivities = activities || [];

    // Apply max incomplete limit if set
    if (mode === 'kid' && kid.max_incomplete_limit && kid.max_incomplete_limit > 0) {
      const incompleteActivities = filteredActivities.filter((a: any) => a.status === 'pending');
      const completedActivities = filteredActivities.filter((a: any) => a.status === 'completed');
      
      incompleteActivities.sort((a: any, b: any) => {
        if (a.due_date !== b.due_date) {
           return (a.due_date || '').localeCompare(b.due_date || '');
        }
        return b.created_at.localeCompare(a.created_at);
      });

      const limitedIncomplete = incompleteActivities.slice(0, kid.max_incomplete_limit);
      filteredActivities = [...limitedIncomplete, ...completedActivities];
    }

    // Fetch steps for each activity
    let allSteps: any[] = [];
    if (filteredActivities.length > 0) {
      const { data, error: stepsError } = await supabase
        .from('activity_steps')
        .select('*')
        .in('activity_id', filteredActivities.map((a: any) => a.id))
        .order('step_number', { ascending: true });

      if (stepsError) throw stepsError;
      allSteps = data || [];
    }

    const activitiesWithSteps = filteredActivities.map((activity: any) => {
      const steps = allSteps?.filter(s => s.activity_id === activity.id) || [];
      return { ...activity, steps };
    });

    res.json({ activities: activitiesWithSteps });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get activity history for a specific kid
app.get('/api/kids/:kidId/activity-history', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { kidId } = req.params;
  const userId = req.user.id;

  try {
    // Verify kid belongs to user
    const { data: kid, error: kidError } = await supabase
      .from('kids')
      .select('user_id')
      .eq('id', kidId)
      .single();

    if (kidError || !kid) return res.status(404).json({ error: 'Kid not found' });
    if (kid.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const { data: history, error: historyError } = await supabase
      .from('activity_history')
      .select('*, activity_history_steps(*)')
      .eq('kid_id', kidId)
      .order('completed_at', { ascending: false });

    if (historyError) {
      if (historyError.code === '42P01') { // undefined_table
        return res.json({ history: [] });
      }
      throw historyError;
    }

    res.json({ history: history || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Unique Activity Types (for suggestions)
app.get('/api/activity-types', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const userId = req.user.id;
  try {
    const { data, error } = await supabase
      .from('activities')
      .select('activity_type, kids!inner(user_id)')
      .eq('kids.user_id', userId);

    if (error) throw error;

    const types = Array.from(new Set(data.map((row: any) => row.activity_type))).sort();
    res.json({ types });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Unique Activity Categories (for suggestions)
app.get('/api/activity-categories', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const userId = req.user.id;
  try {
    const { data, error } = await supabase
      .from('activities')
      .select('category, kids!inner(user_id)')
      .eq('kids.user_id', userId)
      .not('category', 'is', null)
      .neq('category', '');

    if (error) throw error;

    const categories = Array.from(new Set(data.map((row: any) => row.category))).sort();
    res.json({ categories });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create Activity
app.post('/api/activities', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { kidId, activityType, category, repeatFrequency, repeatsTill, timeOfDay, description, link, imageUrl, status, dueDate, steps, repeat_interval, repeat_unit } = req.body;
  const userId = req.user.id;

  try {
    // Verify kid belongs to user
    const { data: kid, error: kidError } = await supabase
      .from('kids')
      .select('user_id')
      .eq('id', kidId)
      .single();

    if (kidError || !kid) return res.status(404).json({ error: 'Kid not found' });
    if (kid.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const id = uuidv4();
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .insert([
        {
          id,
          kid_id: kidId,
          activity_type: activityType,
          category,
          repeat_frequency: repeatFrequency,
          repeats_till: repeatsTill,
          time_of_day: timeOfDay,
          description,
          link,
          image_url: imageUrl,
          status: status || 'pending',
          due_date: dueDate,
          repeat_interval: repeat_interval || null,
          repeat_unit: repeat_unit || null
        }
      ])
      .select()
      .single();

    if (activityError) throw activityError;

    const activityId = activity.id;

    if (steps && Array.isArray(steps) && steps.length > 0) {
      const stepsToInsert = steps.map((step: any, index: number) => ({
        activity_id: activityId,
        step_number: index + 1,
        description: step.description,
        image_url: step.image_url || step.imageUrl
      }));

      const { error: stepsError } = await supabase
        .from('activity_steps')
        .insert(stepsToInsert);

      if (stepsError) throw stepsError;
    }

    const io = req.app.get('io');
    if (io) io.to(`kid_${kidId}`).emit('data_updated', { kidId });

    res.status(201).json({ id: activityId, message: 'Activity created' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Activity
app.post('/api/kids/:kidId/messages', authenticateToken, async (req: any, res) => {
    const adminSupabase = getAdminSupabaseClient();
    const { kidId } = req.params;
    const { message } = req.body;
    try {
        const { data: kid, error: kidErr } = await adminSupabase
            .from('kids')
            .select('notes')
            .eq('id', kidId)
            .single();
        if (kidErr || !kid) throw kidErr || new Error('Kid not found');

        const updatedNotes = (kid.notes ? kid.notes + '\n\n' : '') + '[Message]: ' + message;
        await adminSupabase.from('kids').update({ notes: updatedNotes }).eq('id', kidId);

        if (io) {
            io.to(`kid_${kidId}`).emit('data_updated', { kidId });
        }
        res.status(200).json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/kids/:kidId/confirm-reward', authenticateToken, async (req: any, res) => {
    const adminSupabase = getAdminSupabaseClient();
    const { kidId } = req.params;
    try {
        const { data: kid, error: kidErr } = await adminSupabase
            .from('kids')
            .select('notes, reward_balance')
            .eq('id', kidId)
            .single();
        if (kidErr || !kid) throw kidErr || new Error('Kid not found');

        // Parse notes to find all pending rewards
        const noteLines = kid.notes ? kid.notes.split('\n') : [];
        let totalPendingAmount = 0;
        let alreadyAdded = false;
        
        const newNotes = noteLines.filter(line => {
            if (line.startsWith('[PendingReward]: ')) {
                try {
                    const content = line.replace('[PendingReward]: ', '');
                    const msgIndex = content.indexOf(' [Message]: ');
                    const jsonPart = msgIndex !== -1 ? content.substring(0, msgIndex) : content;
                    const parsed = JSON.parse(jsonPart);
                    totalPendingAmount += parsed.amount || 0;
                    if (parsed.already_added) alreadyAdded = true;
                } catch (e) {
                    console.error('Error parsing pending reward in confirm-reward:', e);
                }
                return false; // remove
            }
            return true; // keep
        }).join('\n');

        if (totalPendingAmount === 0) throw new Error('No pending rewards found');
        
        // Use totalPendingAmount for balance update logic
        // We only increment if NOT already added (though usually goal rewards are already added)
        if (!alreadyAdded) {
            await adminSupabase.rpc('increment_reward_balance', {
                kid_id_param: kidId,
                amount: totalPendingAmount
            });
        }
        
        // Update notes (removes the pending reward notification)
        await adminSupabase.from('kids').update({
            notes: newNotes
        }).eq('id', kidId);
        
        res.status(200).json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/activities/:id', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;
  const { activityType, category, repeatFrequency, repeatsTill, timeOfDay, description, link, imageUrl, status, dueDate, steps, repeat_interval, repeat_unit } = req.body;
  const userId = req.user.id;

  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    if (!isUUID) {
      console.log(`Backend: Invalid UUID for activity edit: ${id}`);
      return res.status(400).json({ error: 'Invalid activity ID format' });
    }

    // Verify activity belongs to a kid owned by user
    let { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('*, kids!inner(user_id, reward_quantity)')
      .eq('id', id)
      .eq('kids.user_id', userId)
      .single();

    let isHistory = false;

    if (activityError || !activity) {
      // Try activity_history table
      const { data: historyActivity, error: historyError } = await supabase
        .from('activity_history')
        .select('*, kids!inner(user_id, reward_quantity)')
        .eq('id', id)
        .eq('kids.user_id', userId)
        .single();
      
      if (historyError || !historyActivity) {
        console.error('Activity not found or forbidden in both tables:', { activityError, historyError });
        return res.status(404).json({ error: 'Activity not found or forbidden' });
      }
      activity = { ...historyActivity, status: 'completed' as any };
      isHistory = true;
    }

    if (isHistory) {
      // Update activity_history
      const { error: historyUpdateError } = await supabase
        .from('activity_history')
        .update({
          activity_type: activityType,
          category,
          time_of_day: timeOfDay,
          description,
          link,
          image_url: imageUrl,
          due_date: dueDate
        })
        .eq('id', id);
      
      if (historyUpdateError) throw historyUpdateError;

      // If status changed back to pending, move back to activities
      if (status === 'pending') {
        const newId = uuidv4();
        const { error: moveBackError } = await supabase
          .from('activities')
          .insert({
            id: newId,
            kid_id: activity.kid_id,
            activity_type: activityType,
            category,
            time_of_day: timeOfDay,
            description,
            link,
            image_url: imageUrl,
            status: 'pending',
            due_date: dueDate,
            repeat_frequency: repeatFrequency || 'Never',
            repeats_till: repeatsTill,
            repeat_interval: repeat_interval || null,
            repeat_unit: repeat_unit || null
          });
        
        if (!moveBackError) {
          await supabase.from('activity_history').delete().eq('id', id);
        }
      }
      
      const io = req.app.get('io');
      if (io) io.to(`kid_${activity.kid_id}`).emit('data_updated', { kidId: activity.kid_id });

      return res.json({ message: 'Activity history updated' });
    }

    const { error: updateError } = await supabase
      .from('activities')
      .update({
        activity_type: activityType,
        category,
        repeat_frequency: repeatFrequency,
        repeats_till: repeatsTill,
        time_of_day: timeOfDay,
        description,
        link,
        image_url: imageUrl,
        status,
        due_date: dueDate,
        repeat_interval: repeat_interval || null,
        repeat_unit: repeat_unit || null
      })
      .eq('id', id);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    // If status changed to completed, increment kid's reward balance
    if (status === 'completed' && activity.status !== 'completed') {
      const kidsData = activity.kids as any;
      const rewardQty = (Array.isArray(kidsData) ? kidsData[0]?.reward_quantity : kidsData?.reward_quantity) || 0;
      
      console.log(`Incrementing reward balance for kid ${activity.kid_id} by ${rewardQty}`);
      
      let balanceUpdated = false;
      const { error: rewardError } = await supabase.rpc('increment_reward_balance', { 
        kid_id_param: activity.kid_id, 
        amount: rewardQty 
      });
      
      // If RPC fails (e.g. not created yet), fallback to manual update
      if (!rewardError) {
        balanceUpdated = true;
      } else {
        console.warn('RPC increment_reward_balance failed, falling back to manual update:', rewardError);
        const { data: kidData, error: kidFetchError } = await supabase.from('kids').select('reward_balance').eq('id', activity.kid_id).single();
        if (!kidFetchError) {
          const newBalance = (kidData?.reward_balance || 0) + rewardQty;
          const { error: updateKidError } = await supabase.from('kids').update({ reward_balance: newBalance }).eq('id', activity.kid_id);
          if (!updateKidError) {
              balanceUpdated = true;
          }
        }
      }
      
      // We no longer log 'Activity Completed' to activity_history here as per user request

      // Repeat logic
      const repeatFrequency = activity.repeat_frequency;
      const repeatsTill = activity.repeats_till;
      console.log(`Repeat logic: frequency=${repeatFrequency}, till=${repeatsTill}, due=${activity.due_date}`);
      
      // Use the activity's due_date as the base for the next one
      const dueDate = new Date(activity.due_date + 'T12:00:00');

      if (repeatFrequency && repeatFrequency !== 'Never') {
        const nextDueDate = new Date(dueDate);
        
        if (repeatFrequency === 'Daily') {
          nextDueDate.setDate(nextDueDate.getDate() + 1);
        } else if (repeatFrequency === 'Weekly') {
          nextDueDate.setDate(nextDueDate.getDate() + 7);
        } else if (repeatFrequency === 'Bi-Weekly') {
          nextDueDate.setDate(nextDueDate.getDate() + 14);
        } else if (repeatFrequency === 'Monthly') {
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        } else if (repeatFrequency === 'Yearly') {
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
        } else if (repeatFrequency.startsWith('Every ') || (activity.repeat_interval && activity.repeat_unit)) {
          const interval = activity.repeat_interval || parseInt(repeatFrequency.split(' ')[1]);
          const unit = activity.repeat_unit || repeatFrequency.split(' ')[2];
          if (unit.startsWith('day')) nextDueDate.setDate(nextDueDate.getDate() + interval);
          else if (unit.startsWith('week')) nextDueDate.setDate(nextDueDate.getDate() + interval * 7);
          else if (unit.startsWith('month')) nextDueDate.setMonth(nextDueDate.getMonth() + interval);
          else if (unit.startsWith('year')) nextDueDate.setFullYear(nextDueDate.getFullYear() + interval);
        } else if (repeatFrequency === 'Weekdays') {
          // Move to next day, then keep moving if it's a weekend
          do {
            nextDueDate.setDate(nextDueDate.getDate() + 1);
          } while (nextDueDate.getDay() === 0 || nextDueDate.getDay() === 6);
        } else if (repeatFrequency === 'Weekends') {
          // Move to next day, then keep moving if it's a weekday
          do {
            nextDueDate.setDate(nextDueDate.getDate() + 1);
          } while (nextDueDate.getDay() !== 0 && nextDueDate.getDay() !== 6);
        }
        
        const nextDueDateStr = nextDueDate.toISOString().split('T')[0];
        console.log(`Next due date calculated: ${nextDueDateStr}, Repeats till: ${repeatsTill || 'Indefinitely'}`);
        
        // Only create if it's within the repeatsTill date (if provided)
        if (!repeatsTill || nextDueDate <= new Date(repeatsTill + 'T23:59:59')) {
          console.log(`Creating next activity for ${activity.kid_id} on ${nextDueDateStr}`);
          const activityToInsert = {
            id: uuidv4(),
            kid_id: activity.kid_id,
            activity_type: activity.activity_type,
            category: activity.category,
            repeat_frequency: repeatFrequency,
            repeats_till: repeatsTill,
            time_of_day: activity.time_of_day,
            description: activity.description,
            link: activity.link,
            image_url: activity.image_url,
            status: 'pending',
            due_date: nextDueDateStr,
            repeat_interval: activity.repeat_interval || null,
            repeat_unit: activity.repeat_unit || null
          };
          console.log('Activity to insert:', JSON.stringify(activityToInsert, null, 2));
          try {
            const { data: newActivity, error: insertError } = await supabase
              .from('activities')
              .insert([activityToInsert])
              .select()
              .single();

            if (insertError) {
              console.error('Error creating next activity (DB error):', insertError);
            } else if (newActivity) {
              console.log('Next activity created successfully:', newActivity.id);
              
              // Clone steps
              const { data: originalSteps } = await supabase
                .from('activity_steps')
                .select('description, image_url, step_number')
                .eq('activity_id', id)
                .order('step_number', { ascending: true });
              
              if (originalSteps && originalSteps.length > 0) {
                const stepsToInsert = originalSteps.map(step => ({
                  activity_id: newActivity.id,
                  step_number: step.step_number,
                  description: step.description,
                  image_url: step.image_url
                }));
                
                const { error: stepsError } = await supabase
                  .from('activity_steps')
                  .insert(stepsToInsert);
                
                if (stepsError) {
                  console.error('Error cloning steps for next activity:', stepsError);
                } else {
                  console.log(`Cloned ${originalSteps.length} steps for next activity`);
                }
              }
            }
          } catch (networkError) {
            console.error('Error creating next activity (Network error):', networkError);
          }
        } else {
          console.log('Next due date is after repeats till date');
        }
      } else {
        console.log('Repeat logic not triggered: missing frequency or repeatsTill');
      }

      // Move to history table
      console.log('Attempting to insert into activity_history for activity:', activity.id);

      // Fetch steps to include in history
      const { data: stepsData } = await supabase
        .from('activity_steps')
        .select('description, image_url')
        .eq('activity_id', id);

      const { data: historyRecord, error: historyError } = await supabase
        .from('activity_history')
        .insert({
          kid_id: activity.kid_id,
          activity_type: activityType,
          category: category,
          time_of_day: timeOfDay,
          description: description,
          link: link,
          image_url: imageUrl,
          due_date: dueDate,
          completed_at: new Date().toISOString(),
          reward_qty: rewardQty
        })
        .select('*')
        .single();
      
      if (historyError) {
        console.error('Failed to insert into activity_history:', historyError);
        if (historyError.code !== '42P01') { // If it's not undefined_table, throw
          throw historyError;
        }
        // If table doesn't exist, we just let it stay in activities table as completed
      } else {
        console.log('Successfully inserted into activity_history');
        
        // Insert steps into activity_history_steps
        console.log('historyRecord:', historyRecord);
        console.log('historyRecord type:', typeof historyRecord);
        if (historyRecord && stepsData && stepsData.length > 0) {
          const historyStepsToInsert = stepsData.map((step: any, index: number) => ({
            history_id: historyRecord.id,
            step_number: index + 1,
            description: step.description,
            image_url: step.image_url,
            user_id: userId,
            kid_id: activity.kid_id
          }));
          
          const { error: stepsInsertError } = await supabase
            .from('activity_history_steps')
            .insert(historyStepsToInsert);
            
          if (stepsInsertError) {
            console.error('Failed to insert into activity_history_steps (object):', stepsInsertError);
            console.error('Failed to insert into activity_history_steps (type):', typeof stepsInsertError);
            console.error('Failed to insert into activity_history_steps (JSON):', JSON.stringify(stepsInsertError));
          } else {
            console.log('Successfully inserted steps into activity_history_steps');
          }
        } else if (stepsData && stepsData.length > 0 && (!historyRecord || !historyRecord.id)) {
          console.error('historyRecord is null or missing id, cannot insert steps. historyRecord:', historyRecord);
        }
      }
    }

    // Update steps: Delete existing and re-insert if steps are provided
    if (steps && Array.isArray(steps)) {
      const { error: deleteStepsError } = await supabase
        .from('activity_steps')
        .delete()
        .eq('activity_id', id);

      if (deleteStepsError) throw deleteStepsError;

      if (steps.length > 0) {
        const stepsToInsert = steps.map((step: any, index: number) => ({
          activity_id: id,
          step_number: index + 1,
          description: step.description,
          image_url: step.image_url || step.imageUrl
        }));

        const { error: stepsInsertError } = await supabase
          .from('activity_steps')
          .insert(stepsToInsert);

        if (stepsInsertError) throw stepsInsertError;
      }
    }

    const io = req.app.get('io');
    if (io) io.to(`kid_${activity.kid_id}`).emit('data_updated', { kidId: activity.kid_id });

    res.json({ message: 'Activity updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete Activity
app.delete('/api/activities/:id', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;
  const userId = req.user.id;
  
  if (!id) {
    return res.status(400).json({ error: 'Invalid activity ID' });
  }

  try {
    console.log(`Backend: Deleting activity ${id} for user ${userId}`);
    
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let activity = null;
    let isHistory = false;

    if (isUUID) {
      // Try activities table first (UUID)
      const { data: act, error: checkError } = await supabase
        .from('activities')
        .select('id, kid_id')
        .eq('id', id)
        .single();
      
      if (act) {
        activity = act;
      }
    }

    if (!activity) {
      // Try activity_history table
      const { data: historyActivity, error: historyError } = await supabase
        .from('activity_history')
        .select('id, kid_id')
        .eq('id', id)
        .single();
      
      if (historyError || !historyActivity) {
        console.log(`Backend: Activity ${id} not found in activities or activity_history`);
        return res.status(404).json({ error: 'Activity not found' });
      }
      activity = historyActivity;
      isHistory = true;
    }

    const { data: kid, error: kidError } = await supabase
      .from('kids')
      .select('user_id')
      .eq('id', activity.kid_id)
      .single();

    if (kidError || !kid || kid.user_id !== userId) {
      console.log(`Backend: Kid ${activity.kid_id} not found or forbidden:`, kidError, kid);
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!isHistory) {
      console.log(`Backend: Deleting steps for activity ${id}`);
      // Delete steps first (though foreign key should handle it)
      await supabase.from('activity_steps').delete().eq('activity_id', id);
    } else {
      console.log(`Backend: Deleting steps for history record ${id}`);
      // Delete history steps
      await supabase.from('activity_history_steps').delete().eq('history_id', id);
    }

    console.log(`Backend: Deleting activity ${id}`);
    // Delete from appropriate table
    const table = isHistory ? 'activity_history' : 'activities';
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error(`Backend: Delete error:`, deleteError);
      throw deleteError;
    }

    console.log(`Backend: Activity ${id} deleted successfully`);
    
    const io = req.app.get('io');
    if (io) io.to(`kid_${activity.kid_id}`).emit('data_updated', { kidId: activity.kid_id });

    res.json({ message: 'Activity deleted successfully' });
  } catch (error: any) {
    console.error('Delete activity error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});


// --- Social Stories API ---

// Get all social stories for a user
app.get('/api/social-stories', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const userId = req.user.id;
  try {
    const { data: stories, error } = await supabase
      .from('social_stories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ stories });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single social story
// Get a single social story - Publicly accessible via link
app.get('/api/social-stories/:id', async (req: any, res) => {
  const { id } = req.params;
  const adminSupabase = getAdminSupabaseClient();
  
  try {
    const { data: story, error } = await adminSupabase
      .from('social_stories')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !story) return res.status(404).json({ error: 'Story not found' });
    res.json({ story });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a social story
app.post('/api/social-stories', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { title, content, kidId } = req.body;
  const userId = req.user.id;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

  try {
    const id = uuidv4();
    const { error } = await supabase
      .from('social_stories')
      .insert([
        {
          id,
          user_id: userId,
          kid_id: kidId || null,
          title,
          content: typeof content === 'string' ? content : JSON.stringify(content)
        }
      ]);

    if (error) throw error;
    
    if (kidId) {
      const io = req.app.get('io');
      if (io) io.to(`kid_${kidId}`).emit('data_updated', { kidId });
    }

    res.status(201).json({ message: 'Story created successfully', storyId: id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a social story
app.put('/api/social-stories/:id', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;
  const { title, content, kidId } = req.body;
  const userId = req.user.id;

  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

  try {
    // Check ownership
    const { data: story, error: checkError } = await supabase
      .from('social_stories')
      .select('user_id')
      .eq('id', id)
      .single();

    if (checkError || !story || story.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const { error } = await supabase
      .from('social_stories')
      .update({
        title,
        content: typeof content === 'string' ? content : JSON.stringify(content),
        kid_id: kidId || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    
    if (kidId) {
      const io = req.app.get('io');
      if (io) io.to(`kid_${kidId}`).emit('data_updated', { kidId });
    }

    res.json({ message: 'Story updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a social story
app.delete('/api/social-stories/:id', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const { data: story, error: checkError } = await supabase
      .from('social_stories')
      .select('user_id, kid_id')
      .eq('id', id)
      .single();

    if (checkError || !story || story.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const { error } = await supabase
      .from('social_stories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    if (story.kid_id) {
      const io = req.app.get('io');
      if (io) io.to(`kid_${story.kid_id}`).emit('data_updated', { kidId: story.kid_id });
    }

    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Redemption API ---

// Get reward items for a kid
app.get('/api/kids/:kidId/reward-items', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { kidId } = req.params;
  try {
    const { data: items, error } = await supabase
      .from('reward_items')
      .select('*')
      .eq('kid_id', kidId)
      .order('cost', { ascending: true });

    if (error) throw error;
    res.json({ items });
  } catch (error) {
    console.error('Get reward items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add reward item (Parent only)
app.post('/api/kids/:kidId/reward-items', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { kidId } = req.params;
  const { name, cost, imageUrl, location } = req.body;
  const userId = req.user.id;

  if (!name || !cost) return res.status(400).json({ error: 'Name and cost are required' });

  try {
    // Verify kid belongs to user
    const { data: kid, error: kidError } = await supabase
      .from('kids')
      .select('user_id')
      .eq('id', kidId)
      .single();

    if (kidError || !kid || kid.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const id = uuidv4();
    const { error } = await supabase
      .from('reward_items')
      .insert([
        {
          id,
          kid_id: kidId,
          name,
          cost,
          image_url: imageUrl || null,
          location: location || null
        }
      ]);

    if (error) throw error;
    
    const io = req.app.get('io');
    if (io) io.to(`kid_${kidId}`).emit('data_updated', { kidId });

    res.status(201).json({ id, message: 'Reward item added' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update reward item (Parent only)
app.put('/api/reward-items/:id', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;
  const { name, cost, imageUrl, location } = req.body;
  const userId = req.user.id;

  if (!name || !cost) return res.status(400).json({ error: 'Name and cost are required' });

  try {
    // Verify item belongs to a kid owned by user
    const { data: item, error: checkError } = await supabase
      .from('reward_items')
      .select('id, kid_id, kids!inner(user_id)')
      .eq('id', id)
      .eq('kids.user_id', userId)
      .single();

    if (checkError || !item) return res.status(404).json({ error: 'Item not found or forbidden' });

    const { error } = await supabase
      .from('reward_items')
      .update({
        name,
        cost,
        image_url: imageUrl || null,
        location: location || null
      })
      .eq('id', id);

    if (error) throw error;
    
    const io = req.app.get('io');
    if (io) io.to(`kid_${item.kid_id}`).emit('data_updated', { kidId: item.kid_id });

    res.json({ message: 'Reward item updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete reward item (Parent only)
app.delete('/api/reward-items/:id', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Verify item belongs to a kid owned by user
    const { data: item, error: checkError } = await supabase
      .from('reward_items')
      .select('id, kid_id, kids!inner(user_id)')
      .eq('id', id)
      .eq('kids.user_id', userId)
      .single();

    if (checkError || !item) return res.status(404).json({ error: 'Item not found or forbidden' });

    const { error } = await supabase
      .from('reward_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    const io = req.app.get('io');
    if (io) io.to(`kid_${item.kid_id}`).emit('data_updated', { kidId: item.kid_id });

    res.json({ message: 'Reward item deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Available rewards
app.post('/api/kids/:id/buy', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;
  const { quantity, itemName } = req.body;

  if (!quantity || quantity <= 0) return res.status(400).json({ error: 'Invalid quantity' });

  try {
    const { data: kid, error: kidError } = await supabase
      .from('kids')
      .select('reward_balance')
      .eq('id', id)
      .single();

    if (kidError || !kid) return res.status(404).json({ error: 'Kid not found' });

    if (kid.reward_balance < quantity) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const { error: updateError } = await supabase
      .from('kids')
      .update({ reward_balance: kid.reward_balance - quantity })
      .eq('id', id);

    if (updateError) throw updateError;

    // Log purchase
    if (itemName) {
      const { error: purchaseError } = await supabase
        .from('reward_purchases')
        .insert({
          kid_id: id,
          item_name: itemName,
          cost: quantity,
          purchased_at: new Date().toISOString()
        });
      
      if (purchaseError) {
        if (purchaseError.code === '42P01') {
          console.warn('reward_purchases table not found. Skipping logging.');
        } else {
          console.error('Failed to log purchase:', purchaseError);
        }
      }
    }

    const io = req.app.get('io');
    if (io) io.to(`kid_${id}`).emit('data_updated', { kidId: id });

    res.json({ message: 'Rewards bought successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get purchases for a kid
app.get('/api/kids/:kidId/purchases', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { kidId } = req.params;
  const userId = req.user.id;

  try {
    // Verify kid belongs to user
    const { data: kid, error: kidError } = await supabase
      .from('kids')
      .select('user_id')
      .eq('id', kidId)
      .single();

    if (kidError || !kid) return res.status(404).json({ error: 'Kid not found' });
    if (kid.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const { data: purchases, error } = await supabase
      .from('reward_purchases')
      .select('*')
      .eq('kid_id', kidId)
      .order('purchased_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return res.json({ 
          purchases: [], 
          warning: 'reward_purchases table not found. Please run the SQL setup script.',
          tableMissing: true 
        });
      }
      throw error;
    }

    res.json({ purchases });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- AI Generation API ---
app.post('/api/generate', authenticateToken, async (req: any, res) => {
  const { 
    model: model_body, 
    modelName: model_name_body, 
    contents, 
    config, 
    prompt, 
    systemInstruction, 
    responseMimeType, 
    responseSchema 
  } = req.body;
  
  const modelName = model_body || model_name_body || 'gemini-flash-latest';
  
  try {
    let apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
    
    if (!apiKey || apiKey === 'undefined' || apiKey === 'null') {
      return res.status(500).json({ error: 'AI API key not configured correctly' });
    }

    // Default to a model that is known to work with this key
    let finalModelName = modelName || 'gemini-flash-latest';
    
    // Normalize model names
    const modelLower = finalModelName.toLowerCase();
    if (modelLower.includes('flash') && !modelLower.includes('image')) {
      finalModelName = 'gemini-flash-latest';
    } else if (modelLower.includes('pro')) {
      finalModelName = 'gemini-3.1-pro-preview';
    } else if (modelLower.includes('image')) {
      finalModelName = 'gemini-2.5-flash-image';
    }

    console.log(`[AI Generation] Using model: ${finalModelName} (v1beta manual fetch)`);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${finalModelName}:generateContent?key=${apiKey}`;
    
    const requestBody: any = {
      contents: Array.isArray(contents) ? contents : [{ role: 'user', parts: [{ text: contents || prompt }] }],
      generationConfig: {
        ...(config || {}),
        responseMimeType: responseMimeType || config?.responseMimeType,
        responseSchema: responseSchema || config?.responseSchema,
      }
    };

    if (systemInstruction) {
      requestBody.system_instruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const aiApiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data: any = await aiApiRes.json();

    if (!aiApiRes.ok) {
      console.error('[AI Generation] API Error:', JSON.stringify(data, null, 2));
      const errorMessage = data.error?.message || 'Gemini API error';
      return res.status(aiApiRes.status).json({
        error: errorMessage,
        details: data.error,
        message: errorMessage
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    res.json({
      text,
      response: {
        candidates: data.candidates?.map((c: any) => ({
          content: {
            parts: c.content?.parts,
            role: c.content?.role
          },
          finishReason: c.finishReason
        }))
      }
    });

  } catch (error: any) {
    console.error('[AI Generation] Exception:', error);
    
    // Extract a readable error message
    let errorMessage = 'AI generation failed';
    if (typeof error.message === 'string') {
      errorMessage = error.message;
    } else if (error.message && typeof error.message.message === 'string') {
      errorMessage = error.message.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    if (errorMessage.includes('API key not valid')) {
      errorMessage = 'Invalid AI API key. Please check your configuration.';
    }

    console.error('[AI Generation] Final Error Message:', errorMessage);

    res.status(error.status || 500).json({ 
      error: errorMessage,
      details: error.stack
    });
  }
});

// --- Worksheets API ---

// Get all worksheets for a user
app.get('/api/worksheets', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const userId = req.user.id;
  try {
    const { data: worksheets, error } = await supabase
      .from('worksheets')
      .select('id, title, topic, subject, target_age, grade_level, worksheet_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ worksheets });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single worksheet
app.get('/api/worksheets/:id', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const { data: worksheet, error } = await supabase
      .from('worksheets')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !worksheet) return res.status(404).json({ error: 'Worksheet not found' });
    if (worksheet.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });
    res.json({ worksheet });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a worksheet
app.post('/api/worksheets', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { title, topic, subject, targetAge, gradeLevel, worksheetType, content } = req.body;
  const userId = req.user.id;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

  try {
    const id = uuidv4();
    const { error } = await supabase
      .from('worksheets')
      .insert([
        {
          id,
          user_id: userId,
          title,
          topic,
          subject,
          target_age: targetAge,
          grade_level: gradeLevel,
          worksheet_type: worksheetType,
          content: typeof content === 'string' ? content : JSON.stringify(content)
        }
      ]);

    if (error) throw error;
    res.status(201).json({ message: 'Worksheet saved successfully', worksheetId: id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a worksheet
app.put('/api/worksheets/:id', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;
  const { title, topic, subject, targetAge, gradeLevel, worksheetType, content } = req.body;
  const userId = req.user.id;

  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

  try {
    const { error } = await supabase
      .from('worksheets')
      .update({
        title,
        topic,
        subject,
        target_age: targetAge,
        grade_level: gradeLevel,
        worksheet_type: worksheetType,
        content: typeof content === 'string' ? content : JSON.stringify(content)
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ message: 'Worksheet updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a worksheet
app.delete('/api/worksheets/:id', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const { data: worksheet, error: checkError } = await supabase
      .from('worksheets')
      .select('user_id')
      .eq('id', id)
      .single();

    if (checkError || !worksheet || worksheet.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const { error } = await supabase
      .from('worksheets')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Worksheet deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Quizzes API ---

// Get all quizzes for a user
app.get('/api/quizzes', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const userId = req.user.id;
  try {
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('id, title, topic, difficulty, grade_level, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ quizzes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all quizzes for a specific kid
app.get('/api/kids/:kidId/quizzes', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { kidId } = req.params;
  try {
    // Note: kid_id column might be missing in some environments
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('id, title, topic, difficulty, grade_level, created_at')
      .eq('user_id', req.user.id) // Fallback to user_id if kid_id is missing or just to be safe
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ quizzes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single quiz
app.get('/api/quizzes/:id', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;
  try {
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json({ quiz });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a quiz
app.post('/api/quizzes', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { kidId, title, topic, difficulty, gradeLevel, content } = req.body;
  const userId = req.user.id;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

  try {
    const id = uuidv4();
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    
    const { error } = await supabase
      .from('quizzes')
      .insert([
        {
          id,
          user_id: userId,
          title,
          topic,
          difficulty,
          grade_level: gradeLevel,
          content: contentStr
        }
      ]);

    if (error) throw error;
    
    if (kidId) {
      const io = req.app.get('io');
      if (io) io.to(`kid_${kidId}`).emit('data_updated', { kidId });
    }

    res.status(201).json({ message: 'Quiz saved successfully', quizId: id });
  } catch (error: any) {
    console.error('Quiz save error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Update a quiz
app.put('/api/quizzes/:id', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;
  const { title, topic, difficulty, gradeLevel, content } = req.body;
  const userId = req.user.id;

  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

  try {
    // Check ownership
    const { data: quiz, error: checkError } = await supabase
      .from('quizzes')
      .select('user_id')
      .eq('id', id)
      .single();

    if (checkError || !quiz || quiz.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);

    const { error } = await supabase
      .from('quizzes')
      .update({
        title,
        topic,
        difficulty,
        grade_level: gradeLevel,
        content: contentStr
      })
      .eq('id', id);

    if (error) throw error;
    
    res.json({ message: 'Quiz updated successfully' });
  } catch (error: any) {
    console.error('Quiz update error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Delete a quiz
app.delete('/api/quizzes/:id', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const { data: quiz, error: checkError } = await supabase
      .from('quizzes')
      .select('user_id')
      .eq('id', id)
      .single();

    if (checkError || !quiz || quiz.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Global Error Handler:', err);
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message || 'Unknown error',
      path: req.path
    });
  }
  next(err);
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  console.log(`[API_404] ${req.method} ${req.originalUrl} - No route matched`);
  res.status(404).json({ error: 'API route not found', path: req.originalUrl });
});

// Vite integration
async function startServer() {
  const envMode = process.env.NODE_ENV || 'development';
  console.log(`[${new Date().toISOString()}] Starting server in ${envMode} mode...`);
  console.log(`[${new Date().toISOString()}] NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`[${new Date().toISOString()}] currentDirname: ${currentDirname}`);
  
  if (envMode !== 'production') {
    console.log(`[${new Date().toISOString()}] Initializing Vite middleware...`);
    try {
      const viteModule = 'vite';
      const { createServer: createViteServer } = await import(viteModule);
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      
      // Explicitly serve index.html for SPA routes in development
      app.use('*', async (req, res, next) => {
        const url = req.originalUrl;
        
        // Skip API routes and static files
        if (url.startsWith('/api/') || (url.includes('.') && !url.endsWith('.html'))) {
          return next();
        }

        try {
          let template = fs.readFileSync(path.resolve(currentDirname, 'index.html'), 'utf-8');
          console.log(`[${new Date().toISOString()}] Read index.html, length: ${template.length}`);
          template = await vite.transformIndexHtml(url, template);
          console.log(`[${new Date().toISOString()}] Transformed index.html, length: ${template.length}`);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } catch (e: any) {
          vite.ssrFixStacktrace(e);
          console.error(`[${new Date().toISOString()}] Vite transform error:`, e.message);
          next(e);
        }
      });
      
      console.log(`[${new Date().toISOString()}] Vite middleware initialized.`);
    } catch (e: any) {
      console.error(`[${new Date().toISOString()}] Failed to initialize Vite middleware:`, e.message);
    }
  } else if (!process.env.VERCEL) {
    // In production (non-Vercel), serve static files from dist
    const distPath = currentDirname.endsWith('dist') ? currentDirname : path.join(currentDirname, 'dist');
    console.log(`[${new Date().toISOString()}] Production mode: serving static files from ${distPath}`);
    
    if (fs.existsSync(distPath)) {
      console.log(`[${new Date().toISOString()}] Dist directory exists at ${distPath}`);
      const files = fs.readdirSync(distPath);
      console.log(`[${new Date().toISOString()}] Files in dist: ${files.join(', ')}`);
      
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        console.log(`[${new Date().toISOString()}] Serving index.html for ${req.url}`);
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn(`[${new Date().toISOString()}] Dist directory NOT found at ${distPath}. Static file serving will fail.`);
    }
  }

  // Background task to process overdue activities every 5 minutes
  if (!process.env.VERCEL) {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    setInterval(async () => {
      console.log('Background Task: Checking for overdue activities...');
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) return;

      const supabase = getAdminSupabaseClient();
      try {
        const { data: kids, error: kidsError } = await supabase.from('kids').select('*');
        if (kidsError) {
          // Gracefully handle Supabase infrastructure errors
          const errorMsg = kidsError.message || '';
          if (errorMsg.includes('<!DOCTYPE html>') || errorMsg.includes('<html')) {
            console.warn('Background Task: Skipping overdue check due to Supabase/Cloudflare connection timeout (5xx).');
            return;
          }
          throw kidsError;
        }
        
        console.log(`Background Task: Checking ${kids?.length || 0} kids.`);

        for (const kid of kids || []) {
          try {
            const timezone = kid.timezone || 'UTC';
            const now = new Date();
            
            let localYear, localMonth, localDay, localHour, localMinute;
            
            try {
              const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });
              
              const parts = formatter.formatToParts(now);
              const getPart = (type: string) => parts.find(p => p.type === type)?.value;
              localYear = getPart('year');
              localMonth = getPart('month');
              localDay = getPart('day');
              localHour = parseInt(getPart('hour') || '0', 10);
              localMinute = parseInt(getPart('minute') || '0', 10);
            } catch (e) {
              const utcFormatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'UTC',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });
              const parts = utcFormatter.formatToParts(now);
              const getPart = (type: string) => parts.find(p => p.type === type)?.value;
              localYear = getPart('year');
              localMonth = getPart('month');
              localDay = getPart('day');
              localHour = parseInt(getPart('hour') || '0', 10);
              localMinute = parseInt(getPart('minute') || '0', 10);
            }
            
            const localDateStr = `${localYear}-${localMonth}-${localDay}`;
            const localTimeInMinutes = localHour * 60 + localMinute;

            await moveOverdueActivities(supabase, kid.id, kid, localDateStr, localTimeInMinutes);
          } catch (kidError: any) {
            console.error(`Background Task: Error processing kid ${kid.id}:`, kidError.message || kidError);
          }
        }
      } catch (error: any) {
        const errorMsg = error.message || '';
        if (errorMsg.includes('<!DOCTYPE html>') || errorMsg.includes('<html')) {
          console.warn('Background Task: Supabase/Cloudflare connection timeout (5xx).');
        } else {
          console.error('Error in background task:', error.message || error);
          if (error.details) console.error('Details:', error.details);
          if (error.code) console.error('Code:', error.code);
        }
      }
    }, 300000); // 5 minutes
  }
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

  // Catch-all for unhandled requests
  app.use((req, res, next) => {
    if (req.url.startsWith('/api/')) {
      console.log(`[${new Date().toISOString()}] Unhandled API request: ${req.method} ${req.url}`);
    }
    next();
  });

  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Global error handler:', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ error: 'Internal server error', details: err.message });
  });

  if (!process.env.VERCEL) {
    startServer().catch(err => {
      console.error('Failed to start server:', err);
    });
  }
