import express from 'express';
import serverless from 'serverless-http';
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

dotenv.config({ override: true });

// Dual compatibility for ESM and CJS
const currentDirname = process.cwd();

export const app = express();

export const handler = serverless(app);

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const server = http.createServer(app);
let io: Server | null = null;

const isVercel = !!process.env.VERCEL || !!process.env.VERCEL_URL || !!process.env.AWS_REGION || !!process.env.FUNCTION_TARGET;

if (!isVercel) {
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
}

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';

// Supabase setup
let supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = 'https://' + supabaseUrl;
}
const supabaseKey = (process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

console.log('[STARTUP] Backend Supabase URL:', supabaseUrl);
console.log('[STARTUP] Backend Supabase Key:', supabaseKey ? '***' : 'undefined');
console.log('[STARTUP] JWT_SECRET:', JWT_SECRET ? '***' : 'undefined');

if (!supabaseUrl || !supabaseKey) {
  console.error('[STARTUP] Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_KEY.');
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
const uploadDir = isVercel ? '/tmp/uploads' : path.join(rootDir, 'uploads');

if (!isVercel || !fs.existsSync(uploadDir)) {
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
app.use((req, res, next) => {
  console.log('Request URL:', req.url);
  next();
});

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

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
      console.error('authenticateToken: Supabase credentials missing or placeholders');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Create a fresh client for this request with the token in headers
    const supabase = createClient(supabaseUrl, supabaseKey, {
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
    
    // Verify the token with Supabase
    let user, error;
    try {
      // Use getUser() without arguments since we set the header in the client config
      const { data, error: authError } = await supabase.auth.getUser();
      user = data?.user;
      error = authError;
    } catch (e: any) {
      console.error('authenticateToken: Supabase request failed:', e.message);
      return res.status(500).json({ 
        error: 'Supabase Connection Error', 
        details: e.message || 'Failed to connect to Supabase.'
      });
    }

    if (error || !user) {
      console.error('authenticateToken: Supabase auth error:', error?.message || 'No user found', 'Status:', error?.status);
      
      // If it's a "session missing" error, it might be because the token is invalid or from another project
      if (error?.message === 'Auth session missing!' || error?.status === 400 || error?.status === 401) {
        let tokenIssuer = 'unknown';
        try {
          const decoded = jwt.decode(token) as any;
          tokenIssuer = decoded?.iss || 'unknown';
        } catch (e) {}
        
        return res.status(401).json({ 
          error: 'Invalid Session', 
          details: `The authentication session is invalid or has expired. Issuer: ${tokenIssuer}. Backend: ${supabaseUrl}`,
          code: error?.status || 401
        });
      }
      
      return res.status(403).json({ 
        error: 'Forbidden', 
        details: error?.message || 'Invalid session',
        code: error?.status || 403
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err: any) {
    console.error('authenticateToken: Unexpected error:', err.message);
    return res.status(500).json({ error: 'Internal Server Error' });
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
    console.error('moveOverdueActivities: Error fetching overdue activities:', overdueError);
    throw overdueError;
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
      console.error('moveOverdueActivities: Error updating activities:', moveError);
      throw moveError;
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
    console.log(`[GET chat-history] Kid ID: ${id}, User ID: ${userId}, Role: ${req.user.role}`);
    
    // First verify parent has access to this kid
    const { data: kid, error: kidError } = await supabase
      .from('kids')
      .select('id, user_id')
      .eq('id', id)
      .single();
      
    if (kidError || !kid) {
      console.error('[GET chat-history] Kid not found or access denied:', kidError);
      return res.status(404).json({ error: 'Kid not found' });
    }

    console.log(`[GET chat-history] Kid found. Owner ID: ${kid.user_id}`);
    
    // Check if the user is the parent of this kid
    if (kid.user_id !== userId && req.user.role !== 'kid') {
      console.error(`[GET chat-history] Forbidden access attempt. User ${userId} is not owner ${kid.user_id}`);
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Use admin client to bypass RLS for chat_history
    const adminSupabase = getAdminSupabaseClient();
    console.log(`[GET chat-history] Fetching from chat_history for kid_id: ${id}`);
    
    let { data: history, error } = await adminSupabase
      .from('chat_history')
      .select('*')
      .eq('kid_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[GET chat-history] First fetch attempt failed:', error.message, 'Code:', error.code);
      
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
  if (kid && kid.notes) {
    const matches = [...kid.notes.matchAll(/\[Message\]: (.*)/g)];
    if (matches.length > 0) {
      kid.parent_message = matches[matches.length - 1][1];
    }
  }
  return kid;
};

app.get('/api/kids', authenticateToken, async (req: any, res) => {
  const userId = req.user?.id;
  console.log('Fetching kids for userId:', userId);
  if (!userId) {
    console.error('No userId found in req.user');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const supabase = getSupabaseForUser(req);
  try {
    const { data: kids, error } = await supabase
      .from('kids')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching kids:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
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
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const { data: kid, error } = await supabase
      .from('kids')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !kid) return res.status(404).json({ error: 'Kid not found' });
    if (kid.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    // Fetch chatbot settings
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('*')
      .eq('kid_id', id)
      .single();

    const processedKid = { ...extractParentMessage(kid) };
    if (chatbot && chatbot.name) {
      processedKid.chatbot_name = chatbot.name;
    }

    res.json({ kid: processedKid });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
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
      .select('user_id, notes, reward_balance')
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
        await supabase.from('activity_history').insert({
          kid_id: id,
          activity_type: 'Parent Bonus',
          category: 'Reward',
          description: 'Manually added by parent',
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

// Behaviors
app.get('/api/kids/:kidId/behavior-definitions', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { kidId } = req.params;

  try {
    const { data: definitions, error } = await supabase
      .from('behavior_definitions')
      .select('*')
      .eq('kid_id', kidId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ definitions: definitions || [] });
  } catch (error: any) {
    console.error('[GET behavior-definitions] Error:', error);
    res.status(500).json({ error: 'Failed to fetch behavior definitions', details: error.message });
  }
});

app.post('/api/kids/:kidId/behavior-definitions', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { kidId } = req.params;
  const { name, type, token_reward, icon } = req.body;

  if (!name || !type || token_reward === undefined) {
    return res.status(400).json({ error: 'Missing required fields: name, type, token_reward' });
  }

  try {
    const { data: definition, error } = await supabase
      .from('behavior_definitions')
      .insert([{ kid_id: kidId, name, type, token_reward, icon: icon || null }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ definition });
  } catch (error: any) {
    console.error('[POST behavior-definitions] Error:', error);
    res.status(500).json({ error: 'Failed to create behavior definition', details: error.message });
  }
});

app.delete('/api/behavior-definitions/:id', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('behavior_definitions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(200).json({ message: 'Behavior definition deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE behavior-definitions] Error:', error);
    res.status(500).json({ error: 'Failed to delete behavior definition', details: error.message });
  }
});

app.get('/api/kids/:kidId/behaviors', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { kidId } = req.params;

  try {
    const { data: behaviors, error } = await supabase
      .from('behaviors')
      .select('*, behavior_definitions(*)')
      .eq('kid_id', kidId)
      .order('date', { ascending: false })
      .order('hour', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ behaviors: behaviors || [] });
  } catch (error: any) {
    console.error('[GET behaviors] Error:', error);
    res.status(500).json({ error: 'Failed to fetch behaviors', details: error.message });
  }
});

app.post('/api/kids/:kidId/behaviors', authenticateToken, async (req: any, res) => {
  const adminSupabase = getAdminSupabaseClient(); // Use admin client for balance update
  const supabase = getSupabaseForUser(req); // Use user client for inserting behavior log
  const { kidId } = req.params;
  const { type, description, definition_id, token_change, date, hour } = req.body;

  if (!type && !definition_id) {
    return res.status(400).json({ error: 'Missing required fields: type or definition_id' });
  }

  try {
    // 1. Log the behavior
    const behaviorLog: any = {
      kid_id: kidId,
      type: type || 'desired',
      description: description || '',
      date: date || new Date().toISOString().split('T')[0],
      hour: hour !== undefined ? hour : null,
      token_change: token_change || 0,
    };

    if (definition_id) {
      behaviorLog.definition_id = definition_id;
      // Fetch the token_reward from definition to ensure consistency
      const { data: definition, error: defError } = await supabase
        .from('behavior_definitions')
        .select('*')
        .eq('id', definition_id)
        .single();
      
      if (defError) {
        console.warn('[POST behaviors] Could not fetch definition for token_change:', defError);
      } else if (definition) {
        behaviorLog.token_change = definition.token_reward;
        behaviorLog.type = definition.type;
        if (!behaviorLog.description) behaviorLog.description = definition.name;
      }
    }

    const { data: loggedBehavior, error: logError } = await supabase
      .from('behaviors')
      .insert([behaviorLog])
      .select('*')
      .single();

    if (logError) throw logError;

    // 2. Update kid's reward balance using admin client RPC
    if (loggedBehavior.token_change !== 0) {
      const { error: balanceError } = await adminSupabase
        .rpc('increment_reward_balance', {
          kid_id_param: kidId,
          amount: loggedBehavior.token_change
        });

      if (balanceError) {
        console.error('[POST behaviors] Failed to update kid balance:', balanceError);
        // We don't rollback the log, but we warn the user
        // throw new Error('Failed to update kid balance');
      }
    }

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`kid_${kidId}`).emit('data_updated', { kidId: kidId, type: 'behavior_logged', payload: loggedBehavior });
    }

    res.status(201).json({ behavior: loggedBehavior });
  } catch (error: any) {
    console.error('[POST behaviors] Error:', error);
    res.status(500).json({ error: 'Failed to log behavior', details: error.message });
  }
});

app.delete('/api/behaviors/:id', authenticateToken, async (req: any, res) => {
  const adminSupabase = getAdminSupabaseClient(); // Use admin client for balance update
  const supabase = getSupabaseForUser(req); // Use user client for deleting behavior log
  const { id } = req.params;

  try {
    // First, get the behavior log to determine the token change
    const { data: behavior, error: fetchError } = await supabase
      .from('behaviors')
      .select('id, kid_id, token_change')
      .eq('id', id)
      .single();

    if (fetchError || !behavior) {
      console.error('[DELETE behaviors] Failed to fetch behavior to delete:', fetchError);
      return res.status(404).json({ error: 'Behavior not found' });
    }

    // Delete the behavior log
    const { error: deleteError } = await supabase
      .from('behaviors')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // Update kid's reward balance by REVERSING the token change using admin client
    if (behavior.token_change !== 0) {
      const { error: balanceError } = await adminSupabase
        .rpc('increment_reward_balance', {
          kid_id_param: behavior.kid_id,
          amount: -behavior.token_change // Reverse the change
        });

      if (balanceError) {
        console.error('[DELETE behaviors] Failed to reverse kid balance:', balanceError);
        // throw new Error('Failed to reverse kid balance after deleting behavior');
      }
    }

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`kid_${behavior.kid_id}`).emit('data_updated', { kidId: behavior.kid_id, type: 'behavior_deleted', payload: { id } });
    }

    res.status(200).json({ message: 'Behavior deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE behaviors] Error:', error);
    res.status(500).json({ error: 'Failed to delete behavior', details: error.message });
  }
});

// --- Activity Templates API ---

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
      
      const { error: rewardError } = await supabase.rpc('increment_reward_balance', { 
        kid_id_param: activity.kid_id, 
        amount: rewardQty 
      });
      
      // If RPC fails (e.g. not created yet), fallback to manual update
      if (rewardError) {
        console.warn('RPC increment_reward_balance failed, falling back to manual update:', rewardError);
        const { data: kidData, error: kidFetchError } = await supabase.from('kids').select('reward_balance').eq('id', activity.kid_id).single();
        if (!kidFetchError) {
          const newBalance = (kidData?.reward_balance || 0) + rewardQty;
          await supabase.from('kids').update({ reward_balance: newBalance }).eq('id', activity.kid_id);
        }
      }

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
  res.status(404).json({ error: 'API route not found', path: req.originalUrl });
});

// Vite integration
async function startServer() {
  const envMode = process.env.NODE_ENV || 'development';
  console.log(`[${new Date().toISOString()}] Starting server in ${envMode} mode...`);
  console.log(`[${new Date().toISOString()}] NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`[${new Date().toISOString()}] currentDirname: ${currentDirname}`);
  
  if (envMode !== 'production' && !isVercel) {
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
  } else if (!isVercel) {
    // In production, serve static files from dist
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

  // Catch-all for unhandled requests
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] Unhandled request: ${req.method} ${req.url}`);
    next();
  });

  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Global error handler:', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ error: 'Internal server error', details: err.message });
  });

  if (!isVercel) {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    // Background task to process overdue activities every minute
    setInterval(async () => {
      console.log('Background Task: Checking for overdue activities...');
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) return;

      const supabase = getAdminSupabaseClient();
      try {
        // Use select('*') to avoid errors if specific columns are missing from schema
        const { data: kids, error: kidsError } = await supabase.from('kids').select('*');
        if (kidsError) throw kidsError;
        
        console.log(`Background Task: Checking ${kids?.length || 0} kids.`);

        for (const kid of kids || []) {
          const timezone = kid.timezone || 'UTC';
          const now = new Date();
          
          // Get current local time for the kid
          let localYear, localMonth, localDay, localHour, localMinute;
          let validatedTimezone = 'UTC';

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
            validatedTimezone = timezone;
          } catch (e) {
            // Fallback to UTC if timezone is invalid
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
            validatedTimezone = 'UTC';
          }
          
          const localDateStr = `${localYear}-${localMonth}-${localDay}`;
          const localTimeInMinutes = localHour * 60 + localMinute;

          console.log(`Background Task: Processing kid ${kid.id} (${kid.name}), Local Date: ${localDateStr}, Local Time: ${localHour}:${localMinute}`);
          await moveOverdueActivities(supabase, kid.id, kid, localDateStr, localTimeInMinutes);
        }
      } catch (error: any) {
        console.error('Error in background task:', error.message || error);
        if (error.details) console.error('Details:', error.details);
        if (error.code) console.error('Code:', error.code);
      }
    }, 60000);
  } else {
    console.log(`[${new Date().toISOString()}] Running in Vercel serverless mode. Skipping server.listen() and background tasks.`);
  }
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
