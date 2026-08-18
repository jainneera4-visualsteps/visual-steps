import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from '@google/genai';
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
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_BUCKET,
  detectImageType,
  getImageExtension,
  isSupportedImageMimeType,
} from './src/utils/uploadSecurity';

dotenv.config();

type ActivityCompletionRecord = {
  status?: string | null;
  completion_date?: string | null;
};

const getActivityDateInTimeZone = (value: string, timeZone?: string | null): string | null => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const part = (type: string) => parts.find(item => item.type === type)?.value || '';
    return `${part('year')}-${part('month')}-${part('day')}`;
  } catch {
    return null;
  }
};

const countAssignedActivitiesCompletedOnDate = (
  activities: ActivityCompletionRecord[],
  targetDate: string,
  timeZone?: string | null,
): number => activities.filter(activity => (
  activity.status === 'completed'
  && Boolean(activity.completion_date)
  && getActivityDateInTimeZone(activity.completion_date as string, timeZone) === targetDate
)).length;

interface AuthenticationUserUpdates {
  email?: string;
  password?: string;
}

const updateAuthenticationUser = async (
  client: {
    auth: {
      admin: {
        updateUserById: (
          userId: string,
          updates: AuthenticationUserUpdates,
        ) => Promise<{ error: { message: string } | null }>;
      };
    };
  },
  userId: string,
  updates: AuthenticationUserUpdates,
) => {
  if (!userId) throw new Error('Authentication user id is required');
  if (!updates.email && !updates.password) return null;

  const { error } = await client.auth.admin.updateUserById(userId, updates);
  return error;
};

// Dual compatibility for ESM and CJS
const currentDirname = process.cwd();

const app = express();

// Set default headers for API responses
app.use((req, res, next) => {
  if (req.url.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
  }
  next();
});

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

export default app;

const server = http.createServer(app);
let io: Server | null = null;

if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
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

const cleanEnvVar = (name: string): string => {
  const val = process.env[name];
  if (!val) return '';
  let cleaned = val.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.substring(1, cleaned.length - 1);
  }
  cleaned = cleaned.trim();
  if (cleaned === 'undefined' || cleaned === 'null') return '';
  return cleaned;
};

const PORT = 3000;
const PRODUCTION_APP_URL = 'https://visual-steps-six.vercel.app';
const JWT_SECRET = cleanEnvVar('JWT_SECRET') || 'dev-secret-key-change-in-prod';

// Supabase setup
let supabaseUrl = (cleanEnvVar('SUPABASE_URL') || cleanEnvVar('VITE_SUPABASE_URL') || '').trim();
if (supabaseUrl) {
  if (!supabaseUrl.startsWith('http')) {
    // If it's just a project ID, expand it. Otherwise, assume it needs https://
    // Supabase project IDs are usually 20 alphanumeric chars
    if (supabaseUrl.length >= 15 && supabaseUrl.length <= 30 && /^[a-z0-9]+$/.test(supabaseUrl)) { 
        supabaseUrl = `https://${supabaseUrl}.supabase.co`;
    } else {
        supabaseUrl = 'https://' + supabaseUrl;
    }
  }
}

const supabaseKey = (cleanEnvVar('SUPABASE_ANON_KEY') || cleanEnvVar('VITE_SUPABASE_ANON_KEY') || cleanEnvVar('SUPABASE_KEY') || '').trim();
const supabaseServiceKey = (cleanEnvVar('SUPABASE_SERVICE_ROLE_KEY') || cleanEnvVar('VITE_SUPABASE_SERVICE_ROLE_KEY') || '').trim();

console.log('[STARTUP] Backend Supabase URL:', supabaseUrl || 'MISSING');
console.log('[STARTUP] Backend Supabase Key:', supabaseKey ? `Present (Starts with ${supabaseKey.substring(0, 10)}...)` : 'MISSING');
console.log('[STARTUP] Backend Service Key:', supabaseServiceKey ? `Present (Starts with ${supabaseServiceKey.substring(0, 10)}...)` : 'NOT FOUND (Using anon key for admin tasks)');
console.log('[STARTUP] JWT_SECRET:', JWT_SECRET ? 'Present' : 'USING DEFAULT');

if (!supabaseUrl || !supabaseKey) {
  console.error('[STARTUP] CRITICAL: Missing Supabase environment variables! Please set SUPABASE_URL and SUPABASE_ANON_KEY.');
} else {
  // Check if project URL matches ANON key (both usually contain the project ID or are signed by it)
  // This is a loose check but helps detect obviously mismatched pairs
  const urlProject = (supabaseUrl.split('//')[1] || '').split('.')[0];
  console.log(`[STARTUP] Configured Project ID: ${urlProject}`);
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
  const adminKey = supabaseServiceKey || supabaseKey;
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

// Keep uploads in memory only long enough to validate and transfer them to
// persistent Supabase Storage. Never trust the browser-provided extension.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    callback(null, isSupportedImageMimeType(file.mimetype));
  },
});

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use((req, _res, next) => {
  console.log('Request URL:', req.url);
  next();
});

// Auth Middleware
export const isKidApiRequestAllowed = (method: string, pathName: string, kidId: string): boolean => {
  const methodUpper = method.toUpperCase();
  const encodedKidId = encodeURIComponent(kidId);
  const ownKidBase = `/api/kids/${encodedKidId}`;

  if (methodUpper === 'GET' && pathName === ownKidBase) return true;
  if (methodUpper === 'GET' && pathName === `${ownKidBase}/activities`) return true;
  if (methodUpper === 'GET' && pathName === `${ownKidBase}/reward-items`) return true;
  if (methodUpper === 'PUT' && /^\/api\/activities\/[^/]+$/.test(pathName)) return true;
  if (methodUpper === 'GET' && /^\/api\/quizzes\/[^/]+$/.test(pathName)) return true;
  if (methodUpper === 'POST' && pathName === '/api/quiz-results') return true;

  return false;
};

const authenticateToken = async (req: any, res: any, next: any) => {
  console.log(`[AUTH_DEBUG] Request: ${req.method} ${req.url}`);
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.cookies.token;

  if (!token || token === 'undefined' || token === 'null') {
    console.warn(`[AUTH_DEBUG] Missing token string: "${token}" for ${req.url}`);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. Check if it's a kid token (JWT signed by our server)
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded && decoded.role === 'kid') {
        if (!decoded.kidId || !decoded.userId) {
          return res.status(401).json({ error: 'Invalid child session' });
        }
        if (!isKidApiRequestAllowed(req.method, req.path, decoded.kidId)) {
          return res.status(403).json({ error: 'Parent access required' });
        }
        req.user = { id: decoded.userId, role: 'kid', kidId: decoded.kidId };
        req.token = token;
        return next();
      }
      if (process.env.NODE_ENV === 'test' && decoded?.role === 'test-parent') {
        req.user = { id: decoded.userId, role: 'parent', email: decoded.email };
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
      auth: { 
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
      },
      global: {
          headers: {
              Authorization: `Bearer ${token}`
          }
      }
    });
    
    // Verify the token with Supabase with a timeout to prevent hanging connections
    const getUserWithTimeout = async () => {
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Supabase request timed out')), 10000)
      );
      const request = supabase.auth.getUser(token);
      return Promise.race([request, timeout]) as Promise<{ data: { user: any }; error: any }>;
    };

    const { data: { user }, error } = await getUserWithTimeout().catch(err => ({ 
      data: { user: null }, 
      error: { message: err.message || 'Supabase Timeout' } 
    }));

    if (error || !user) {
      const errorMsg = error?.message || 'No user';
      console.error(`[AUTH_DEBUG] Supabase verification failed: ${errorMsg}`);
      
      // Detailed mismatch check
      let projectIdFromToken = 'unknown';
      let tokenIssuer = 'unknown';
      let decoded: any = null;
      try {
        decoded = jwt.decode(token);
        tokenIssuer = decoded?.iss || 'unknown';
        
        // Supabase issuer is usually https://<project>.supabase.co/auth/v1
        if (tokenIssuer && tokenIssuer.includes('.supabase.co')) {
            const parts = tokenIssuer.split('//')[1]?.split('.');
            if (parts && parts.length > 0) projectIdFromToken = parts[0];
        } else if (tokenIssuer && (tokenIssuer.includes('localhost') || tokenIssuer.includes('127.0.0.1'))) {
            projectIdFromToken = 'localhost';
        }
      } catch (e) {}
      
      const backendProjectId = (supabaseUrl.split('//')[1] || '').split('.')[0] || 'unknown';
      
      // A mismatch is likely if both are known but different
      const isProjectMismatch = projectIdFromToken !== 'unknown' && 
                               backendProjectId !== 'unknown' && 
                               projectIdFromToken !== backendProjectId;

      console.warn(`[AUTH_DEBUG] Token Info - Issuer: ${tokenIssuer}, ProjectFromToken: ${projectIdFromToken}, UserID: ${decoded?.sub || 'unknown'}`);
      console.warn(`[AUTH_DEBUG] Backend Info - Project: ${backendProjectId}, URL: ${supabaseUrl}`);

      if (isProjectMismatch) {
        console.error(`[AUTH_DEBUG] PROJECT MISMATCH: Token for "${projectIdFromToken}", Server for "${backendProjectId}".`);
        return res.status(401).json({ 
          error: 'Supabase Project Mismatch', 
          details: `Configuration error: Your browser has a session for project "${projectIdFromToken}", but the server is configured to use project "${backendProjectId}". Please ensure VITE_SUPABASE_URL and SUPABASE_URL are both set to the correct URL in settings.`,
          projectIdFromToken,
          backendProjectId
        });
      }

      // Special handling for the common "Auth session missing!" error
      if (errorMsg === 'Auth session missing!') {
        return res.status(401).json({
          error: 'Invalid Session',
          details: 'Your session is invalid or has expired. This can happen if you logged out elsewhere or if the Supabase project configuration was recently changed.',
          code: 401
        });
      }

      return res.status(401).json({ 
        error: 'Invalid Session', 
        details: errorMsg,
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
    console.log(`[AUTH_DEBUG] Success: Supabase token for ${user.email}`);
    next();
  } catch (err: any) {
    console.error('authenticateToken: Unexpected error:', err.message, err.stack);
    res.status(500).json({ error: 'Authentication processing error', details: err.message });
  }
};

// Helper Functions
type SafeSmtpError = {
  code: string;
  command?: string;
  responseCode?: number;
};

const getSafeSmtpError = (error: any): SafeSmtpError => ({
  code: String(error?.code || 'SMTP_ERROR').slice(0, 80),
  ...(error?.command ? { command: String(error.command).slice(0, 40) } : {}),
  ...(Number.isFinite(error?.responseCode) ? { responseCode: Number(error.responseCode) } : {}),
});

const getMissingSmtpVariables = () => {
  const requiredVariables = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  return requiredVariables.filter((name) => !cleanEnvVar(name));
};

const getTransporter = async () => {
  const smtpUser = cleanEnvVar('SMTP_USER');
  const smtpPass = cleanEnvVar('SMTP_PASS');
  const smtpHost = cleanEnvVar('SMTP_HOST') || 'smtp.ethereal.email';
  const smtpPort = parseInt(cleanEnvVar('SMTP_PORT') || '587');

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  // If no credentials are provided, try to create a test account for development
  if (!smtpUser || !smtpPass) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('Skipping email: SMTP credentials are incomplete in production.', {
        missingVariables: getMissingSmtpVariables(),
      });
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
    if (!transporter) return false;

    const smtpFrom = cleanEnvVar('SMTP_FROM') || cleanEnvVar('SMTP_USER') || '"Visual Steps" <noreply@visualsteps.com>';
    const appUrl = cleanEnvVar('APP_URL') || (process.env.NODE_ENV === 'production'
      ? PRODUCTION_APP_URL
      : 'http://localhost:3000');
    
    const info = await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: 'Welcome to Visual Steps — Let’s Make Every Step Clearer',
      text: `Hello ${name || 'User'},\n\nWelcome to Visual Steps. You have made a thoughtful choice to create more structure, clarity, and encouragement in your child’s daily routine. We are glad to support your family.\n\nVisual Steps helps parents turn everyday goals into clear, manageable actions. In one place, you can:\n- Plan visual activities and break routines into step-by-step instructions\n- Organize schedules and assign activities for each child\n- Create personalized social stories, worksheets, and quizzes\n- Encourage progress through rewards and positive parent messages\n- Review completed activities, progress reports, and learning history\n- Personalize each child’s experience, schedule, interests, and support needs\n\nStart with one small routine that would make today easier. Add the activity, divide it into simple steps, and celebrate each success along the way.\n\nOpen your Visual Steps dashboard: ${appUrl}/login\nRegistered email: ${email}\n\nYou know your child best. Visual Steps gives you practical tools to turn that knowledge into consistent, visible support—and every completed step is meaningful progress.\n\nIf you have questions, reply to this email. We are here to help.\n\nWarmly,\nThe Visual Steps Team`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 12px; color: #333; line-height: 1.6;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Welcome to Visual Steps</h1>
            <p style="color: #64748b; font-size: 16px; margin-top: 8px;">Clearer routines. Encouraging progress. One step at a time.</p>
          </div>
          
          <p>Hello <strong>${name || 'User'}</strong>,</p>
          
          <p>You have made a thoughtful choice to create more structure, clarity, and encouragement in your child’s daily routine. We are glad to support your family.</p>

          <p><strong>Visual Steps</strong> helps parents turn everyday goals into clear, manageable actions. Whether you are building a morning routine, supporting learning, or encouraging greater independence, you now have one organized place to guide and celebrate progress.</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="margin-top: 0; color: #1e293b; font-size: 16px;">What you can do with Visual Steps:</h3>
            <ul style="margin-bottom: 0; padding-left: 20px; color: #475569;">
              <li>Plan visual activities and break routines into step-by-step instructions</li>
              <li>Organize schedules and assign activities for each child</li>
              <li>Create personalized social stories, worksheets, and quizzes</li>
              <li>Encourage progress through rewards and positive parent messages</li>
              <li>Review completed activities, progress reports, and learning history</li>
              <li>Personalize each child’s experience, schedule, interests, and support needs</li>
            </ul>
          </div>

          <div style="background-color: #eff6ff; padding: 18px 20px; border-left: 4px solid #2563eb; border-radius: 6px; margin: 25px 0;">
            <strong style="color: #1e3a8a;">A good first step</strong>
            <p style="margin: 6px 0 0; color: #475569;">Choose one small routine that would make today easier. Add the activity, divide it into simple steps, and celebrate each success along the way.</p>
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
          
          <p>You know your child best. Visual Steps gives you practical tools to turn that knowledge into consistent, visible support—and every completed step is meaningful progress.</p>

          <p>If you have questions, reply to this email. We are here to help.</p>
          
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
    return true;
  } catch (error: any) {
    console.error('Error sending welcome email:', getSafeSmtpError(error));
    return false;
  }
};

const sendPasswordChangeEmail = async (email: string, name: string): Promise<boolean> => {
  console.log(`Attempting to send password change confirmation to: ${email}`);
  try {
    const transporter = await getTransporter();
    if (!transporter) return false;

    const smtpFrom = cleanEnvVar('SMTP_FROM') || cleanEnvVar('SMTP_USER') || '"Visual Steps" <noreply@visualsteps.com>';
    
    const info = await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: 'Security Alert: Your Visual Steps Password Was Changed',
      text: `Hello ${name || 'User'},\n\nThis is a confirmation that the password for your Visual Steps account (${email}) has been successfully changed.\n\nIf you did not perform this action, please request a secure password reset link from the Visual Steps sign-in page and contact our support team immediately.\n\nBest regards,\nThe Visual Steps Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #d9534f;">Security Alert: Password Changed</h2>
          <p>Hello ${name || 'User'},</p>
          <p>This is a confirmation that the password for your Visual Steps account (<strong>${email}</strong>) has been successfully changed.</p>
          <p style="background-color: #fcf8e3; padding: 15px; border: 1px solid #faebcc; border-radius: 4px; color: #8a6d3b;">
            <strong>Important:</strong> If you did not perform this action, request a secure password reset link from the Visual Steps sign-in page and contact our support team immediately.
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
    return true;
  } catch (error: any) {
    console.error('Error sending password change email:', getSafeSmtpError(error));
    return false;
  }
};

// Authenticated, non-secret SMTP diagnostic. This verifies the connection but
// does not send an email or return credential values.
app.get('/api/email-health', authenticateToken, async (_req: any, res) => {
  const missingVariables = getMissingSmtpVariables();
  if (missingVariables.length > 0) {
    return res.status(503).json({
      status: 'misconfigured',
      configured: false,
      missingVariables,
    });
  }

  try {
    const transporter = await getTransporter();
    if (!transporter) {
      return res.status(503).json({ status: 'misconfigured', configured: false });
    }

    await transporter.verify();
    return res.json({ status: 'ready', configured: true, connection: true });
  } catch (error: any) {
    const smtpError = getSafeSmtpError(error);
    console.error('SMTP health check failed:', smtpError);
    return res.status(502).json({
      status: 'connection_failed',
      configured: true,
      connection: false,
      smtpError,
    });
  }
});

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

// Helper to compile dynamic family action history log for AI instruction
async function buildConciergeSystemInstruction(req: any): Promise<string> {
  const userId = req.user?.id;
  let historyLogText = "No recent system history log entries recorded yet.";
  
  if (userId) {
    try {
      const supabase = getSupabaseForUser(req);
      
      // Get kids
      let { data: kids } = await supabase
        .from('kids')
        .select('id, name')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (!kids || kids.length === 0) {
        const { data: parentKids } = await supabase
          .from('kids')
          .select('id, name')
          .eq('parent_id', userId)
          .order('created_at', { ascending: false });
        kids = parentKids || [];
      }
      
      if (kids && kids.length > 0) {
        const kidIds = kids.map(k => k.id);
        const kidNamesMap = new Map(kids.map(k => [k.id, k.name]));
        
        // Fetch recent activities
        const { data: recentActivities } = await supabase
          .from('activities')
          .select('id, activity_type, category, description, title, kid_id, created_at')
          .in('kid_id', kidIds)
          .order('created_at', { ascending: false })
          .limit(3);
          
        // Fetch recent worksheets
        const { data: recentWorksheets } = await supabase
          .from('worksheets')
          .select('id, kid_id, subject, topic, grade_level, created_at')
          .in('kid_id', kidIds)
          .order('created_at', { ascending: false })
          .limit(3);
          
        const logLines: string[] = [];
        
        if (recentActivities && recentActivities.length > 0) {
          recentActivities.forEach(act => {
            const kidName = kidNamesMap.get(act.kid_id) || 'Student';
            const dateStr = act.created_at ? new Date(act.created_at).toLocaleDateString() : 'recent';
            logLines.push(`- Scheduled Activity: Created "${act.title || act.description || 'Task'}" (${act.activity_type || 'chore'}) for ${kidName} on ${dateStr}.`);
          });
        }
        
        if (recentWorksheets && recentWorksheets.length > 0) {
          recentWorksheets.forEach(ws => {
            const kidName = kidNamesMap.get(ws.kid_id) || 'Student';
            const dateStr = ws.created_at ? new Date(ws.created_at).toLocaleDateString() : 'recent';
            logLines.push(`- Worksheet Generated: Created a ${ws.subject || 'Math'} worksheet about ${ws.topic || 'practice'} for ${kidName} on ${dateStr}.`);
          });
        }
        
        if (logLines.length > 0) {
          historyLogText = logLines.join('\n');
        }
      }
    } catch (e) {
      console.error('Error compiling user history log for system instructions:', e);
    }
  }

  return `# ROLE
You are an adaptive AI Assistant for our parenting platform. Your job is to help parents seamlessly navigate the website, explain available features, and dynamically configure or execute any application functionality based on the user's active context.

# DYNAMIC MEMORY & LEARNING
You have access to a live "User History Log" provided at the start of the conversation. This log updates automatically whenever the user takes any action on the website. 📈

Always review the User History Log before responding. 
- If a user wants to repeat, modify, or reference a past action, look at the most recent relevant entries in the History Log. 🕒
- Replicate or adapt the parameters, settings, and context found in that log entry to execute the new task precisely. ⚙️

# CURRENT USER HISTORY LOG
${historyLogText}

# INSTRUCTIONS
1. Check the history log to understand the user's recent activity, preferences, and past actions across the platform. 📋
2. If critical information is missing to repeat or perform an action, ask exactly one clarifying question. ❓
3. Use your available function tools to execute the appropriate website action based on these learned details. 🚀`;
}

// AI Command Endpoint
app.post('/api/command', authenticateToken, async (req: any, res) => {
  return res.status(410).json({ error: 'AI concierge has been removed' });
  console.log('[API] /api/command hit!', { prompt: req.body?.prompt });
  const { prompt } = req.body;
  
  // Clean apiKey safely using cleanEnvVar helper and standard direct env fallback
  let apiKey = (cleanEnvVar('GEMINI_API_KEY') || cleanEnvVar('GOOGLE_API_KEY') || '').trim();
  if (!apiKey || apiKey === 'undefined' || apiKey === 'null' || apiKey.length < 10) {
    apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  }
  
  console.log('[API] Using API Key (DEBUG):', {
    present: !!apiKey,
    length: apiKey?.length,
  });
  if (!apiKey || apiKey === 'undefined' || apiKey === 'null' || apiKey.length < 10) {
    console.log('[API] GEMINI_API_KEY missing or invalid');
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured or invalid' });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const systemInstruction = await buildConciergeSystemInstruction(req);

    // Try gemini-3.5-flash first as it is the standard and widely supported text model
    let response;
    try {
      console.log('[API] Attempting model gemini-3.5-flash');
      response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction,
          tools: [{
            functionDeclarations: [
              {
                name: 'triggerOnboardingTour',
                description: 'Triggers the onboarding walkthrough tour for the parent.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {}
                }
              },
              {
                name: 'openPage',
                description: 'Navigates the parent to a specific page/route of the App Map. Path options: "/", "/worksheets", "/reports", "/planner", "/tokens".',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    path: {
                      type: Type.STRING,
                      description: 'The target route, e.g. /worksheets, /reports, /planner, /tokens, /'
                    }
                  },
                  required: ['path']
                }
              },
              {
                name: 'addActivity',
                description: 'Creates a new digital chore, homework, task, or activity for a child.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    activityType: {
                      type: Type.STRING,
                      description: 'Type of activity, e.g. chore, learning, activity'
                    },
                    title: {
                      type: Type.STRING,
                      description: 'Title or name of the activity, e.g. vacuuming, reading'
                    }
                  },
                  required: ['activityType', 'title']
                }
              },
              {
                name: 'distributeTokens',
                description: 'Distributes and awards reward tokens to a kid for positive behaviors.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    tokens: {
                      type: Type.INTEGER,
                      description: 'How many tokens to distribute'
                    }
                  },
                  required: ['tokens']
                }
              },
              {
                name: 'generate_custom_quiz',
                description: 'Triggers the creation of a personalized quiz for a child based on history context.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    student_id: {
                      type: Type.STRING,
                      description: 'The unique identifier of the kid/student.'
                    },
                    subject: {
                      type: Type.STRING,
                      description: 'The educational subject of the quiz (e.g., Mathematics, Science, Reading).'
                    },
                    topic: {
                      type: Type.STRING,
                      description: 'The specific topic or concept to test (e.g., Addition, Photosynthesis, Sight Words).'
                    },
                    difficulty: {
                      type: Type.STRING,
                      description: 'The difficulty level of the quiz (e.g., easy, medium, hard).'
                    },
                    number_of_questions: {
                      type: Type.INTEGER,
                      description: 'The number of questions to generate for the quiz (default is 5).'
                    }
                  },
                  required: ['student_id', 'subject', 'topic']
                }
              }
            ]
          }]
        }
      });
    } catch (modelError: any) {
      console.warn('[API] gemini-3.5-flash failed, falling back to gemini-3-flash-preview:', modelError.message || modelError);
      response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction,
          tools: [{
            functionDeclarations: [
              {
                name: 'triggerOnboardingTour',
                description: 'Triggers the onboarding walkthrough tour for the parent.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {}
                }
              },
              {
                name: 'openPage',
                description: 'Navigates the parent to a specific page/route of the App Map. Path options: "/", "/worksheets", "/reports", "/planner", "/tokens".',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    path: {
                      type: Type.STRING,
                      description: 'The target route, e.g. /worksheets, /reports, /planner, /tokens, /'
                    }
                  },
                  required: ['path']
                }
              },
              {
                name: 'addActivity',
                description: 'Creates a new digital chore, homework, task, or activity for a child.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    activityType: {
                      type: Type.STRING,
                      description: 'Type of activity, e.g. chore, learning, activity'
                    },
                    title: {
                      type: Type.STRING,
                      description: 'Title or name of the activity, e.g. vacuuming, reading'
                    }
                  },
                  required: ['activityType', 'title']
                }
              },
              {
                name: 'distributeTokens',
                description: 'Distributes and awards reward tokens to a kid for positive behaviors.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    tokens: {
                      type: Type.INTEGER,
                      description: 'How many tokens to distribute'
                    }
                  },
                  required: ['tokens']
                }
              },
              {
                name: 'generate_custom_quiz',
                description: 'Triggers the creation of a personalized quiz for a child based on history context.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    student_id: {
                      type: Type.STRING,
                      description: 'The unique identifier of the kid/student.'
                    },
                    subject: {
                      type: Type.STRING,
                      description: 'The educational subject of the quiz (e.g., Mathematics, Science, Reading).'
                    },
                    topic: {
                      type: Type.STRING,
                      description: 'The specific topic or concept to test (e.g., Addition, Photosynthesis, Sight Words).'
                    },
                    difficulty: {
                      type: Type.STRING,
                      description: 'The difficulty level of the quiz (e.g., easy, medium, hard).'
                    },
                    number_of_questions: {
                      type: Type.INTEGER,
                      description: 'The number of questions to generate for the quiz (default is 5).'
                    }
                  },
                  required: ['student_id', 'subject', 'topic']
                }
              }
            ]
          }]
        }
      });
    }

    console.log('[API] Gemini response received');
    
    const functionCalls = response.functionCalls;
    const call = functionCalls?.[0];

    if (call) {
      res.json({ 
        functionCall: call.name, 
        args: call.args, 
        response: response.text || `Executed action: ${call.name}` 
      });
    } else {
      const text = response.text;
      res.json({ response: text || "The assistant didn't have a response." });
    }
  } catch (error: any) {
    console.error('AI Command Error:', error);
    const status = error.status || 500;
    const message = error.message || (error.error && error.error.message) || error.toString();
    res.status(status).json({
      error: 'Failed to process AI command',
      details: message,
    });
  }
});

// Upload File Endpoint
app.post('/api/upload', authenticateToken, (req: any, res) => {
  upload.single('image')(req, res, async (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Image must be 5 MB or smaller' });
      }
      console.error('Upload parser error:', err);
      return res.status(400).json({ error: 'Invalid image upload' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Choose a JPEG, PNG, WebP, or GIF image' });
    }

    const detectedType = detectImageType(req.file.buffer);
    if (!detectedType || detectedType !== req.file.mimetype) {
      return res.status(400).json({ error: 'The file content does not match a supported image type' });
    }

    const objectPath = `${req.user.id}/${uuidv4()}.${getImageExtension(detectedType)}`;
    const storageClient = getSupabaseClient(req.token);
    const { error: storageError } = await storageClient.storage
      .from(UPLOAD_BUCKET)
      .upload(objectPath, req.file.buffer, {
        contentType: detectedType,
        cacheControl: '31536000',
        upsert: false,
      });

    if (storageError) {
      console.error('Supabase image upload failed:', storageError.message);
      return res.status(500).json({ error: 'Image storage is unavailable. Please try again.' });
    }

    const { data } = storageClient.storage.from(UPLOAD_BUCKET).getPublicUrl(objectPath);
    return res.status(201).json({ imageUrl: data.publicUrl });
  });
});

// Create Profile
app.post('/api/auth/create-profile', async (req: any, res) => {
  const { id, email, name, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  console.log('create-profile: request body:', { id, email, name, hasPassword: !!password });
  
  if (!id || !normalizedEmail) {
    console.log('create-profile: missing fields');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
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
          email: normalizedEmail,
          name, 
          password_hash: hashedPassword
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
    
    // Complete the SMTP attempt before returning. Serverless runtimes may stop
    // background work as soon as the response has been sent.
    const emailSent = await sendWelcomeEmail(normalizedEmail, name);

    res.status(201).json({ message: 'Profile created', emailSent });
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
    const emailSent = await sendWelcomeEmail(email, name);
    if (!emailSent) {
      return res.status(502).json({
        error: 'Welcome email could not be sent',
        details: 'Check Email Delivery in Profile for the SMTP status.',
      });
    }
    res.json({ message: 'Welcome email resent successfully' });
  } catch (error: any) {
    console.error('Resend welcome email error:', error);
    res.status(500).json({ error: 'Failed to resend welcome email', details: error.message });
  }
});

// Send the existing Visual Steps confirmation after Supabase has securely
// completed an email-link password recovery.
app.post('/api/auth/password-change-confirmation', authenticateToken, async (req: any, res) => {
  const emailSent = await sendPasswordChangeEmail(req.user.email, req.user.name);
  res.json({ emailSent });
});

const isMissingColumnError = (error: any) => {
  if (!error) return false;
  if (error.code === '42703' || error.code === 'PGRST204') return true;
  const message = String(error.message || '').toLowerCase();
  return message.includes('column') && (message.includes('does not exist') || message.includes('not found'));
};

const fetchUserProfileWithRetentionFallback = async (supabase: any, userId: string) => {
  const projections = [
    'id, name, email, max_parent_message_days',
    'id, name, email, max_parent_messages',
    'id, name, email',
  ];

  let lastMissingColumnError: any = null;

  for (const projection of projections) {
    const { data, error } = await supabase
      .from('users')
      .select(projection)
      .eq('id', userId)
      .single();

    if (!error && data) {
      return {
        ...data,
        max_parent_message_days: data.max_parent_message_days ?? data.max_parent_messages ?? 20,
      };
    }

    if (isMissingColumnError(error)) {
      lastMissingColumnError = error;
      continue;
    }

    if (error) {
      throw error;
    }
  }

  if (lastMissingColumnError) {
    throw lastMissingColumnError;
  }

  throw new Error('User profile not found');
};

// Update Profile
app.get('/api/user/profile', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const userId = req.user.id;

  try {
    let profile: any;

    try {
      profile = await fetchUserProfileWithRetentionFallback(supabase, userId);
    } catch (err) {
      const adminSupabase = getAdminSupabaseClient();
      profile = await fetchUserProfileWithRetentionFallback(adminSupabase, userId);
    }

    res.json({ profile });
  } catch (error: any) {
    console.error('GET /api/user/profile failed:', error);
    res.status(500).json({ error: 'Internal server error', details: error?.message || 'Failed to load profile' });
  }
});

app.put('/api/user/profile', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { name, email, newPassword, maxParentMessageDays, maxParentMessages } = req.body;
  const userId = req.user.id;

  try {
    const baseUpdates: any = {};

    if (name) baseUpdates.name = name;
    if (email) baseUpdates.email = email;

    const incomingRetentionDays = maxParentMessageDays !== undefined ? maxParentMessageDays : maxParentMessages;
    let parsedRetentionDays: number | undefined;
    if (incomingRetentionDays !== undefined) {
      const parsedDays = Number(incomingRetentionDays);
      if (Number.isFinite(parsedDays) && parsedDays > 0) {
        parsedRetentionDays = Math.floor(parsedDays);
      } else {
        return res.status(400).json({ error: 'Retention days must be a positive number' });
      }
    }

    if (newPassword && String(newPassword).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (email || newPassword) {
      const authUpdates: { email?: string; password?: string } = {};
      if (email && email !== req.user.email) authUpdates.email = email;
      if (newPassword) authUpdates.password = newPassword;

      if (Object.keys(authUpdates).length > 0) {
        const adminSupabase = getAdminSupabaseClient();
        const authUpdateError = await updateAuthenticationUser(adminSupabase, userId, authUpdates);
        if (authUpdateError) {
          console.error('Supabase Auth profile update failed:', authUpdateError);
          return res.status(400).json({ error: 'Failed to update authentication details', details: authUpdateError.message });
        }
      }
    }

    if (newPassword) {
      // Retain the legacy hash for compatibility; login uses Supabase Auth.
      baseUpdates.password_hash = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(baseUpdates).length === 0 && parsedRetentionDays === undefined) {
      return res.json({ message: 'No changes made' });
    }

    const attemptBaseProfileUpdate = async (client: any) => {
      const { error } = await client.from('users').update(baseUpdates).eq('id', userId);
      if (error) throw error;
    };

    const attemptRetentionUpdate = async (client: any) => {
      if (parsedRetentionDays === undefined) {
        return { applied: false, skipped: true };
      }

      const { error: newColumnError } = await client
        .from('users')
        .update({ max_parent_message_days: parsedRetentionDays })
        .eq('id', userId);

      if (!newColumnError) {
        return { applied: true, column: 'max_parent_message_days' };
      }

      if (!isMissingColumnError(newColumnError) || !String(newColumnError.message || '').includes('max_parent_message_days')) {
        throw newColumnError;
      }

      const { error: legacyColumnError } = await client
        .from('users')
        .update({ max_parent_messages: parsedRetentionDays })
        .eq('id', userId);

      if (!legacyColumnError) {
        return { applied: true, column: 'max_parent_messages' };
      }

      if (isMissingColumnError(legacyColumnError)) {
        throw legacyColumnError;
      }

      throw legacyColumnError;
    };

    try {
      if (Object.keys(baseUpdates).length > 0) {
        await attemptBaseProfileUpdate(supabase);
      }
      await attemptRetentionUpdate(supabase);
    } catch (err) {
      const adminSupabase = getAdminSupabaseClient();
      if (Object.keys(baseUpdates).length > 0) {
        await attemptBaseProfileUpdate(adminSupabase);
      }
      await attemptRetentionUpdate(adminSupabase);
    }

    let updatedProfile: any;
    try {
      updatedProfile = await fetchUserProfileWithRetentionFallback(supabase, userId);
    } catch (err) {
      try {
        const adminSupabase = getAdminSupabaseClient();
        updatedProfile = await fetchUserProfileWithRetentionFallback(adminSupabase, userId);
      } catch (readError: any) {
        // Do not fail the entire update if read-back fails after a successful write.
        console.warn('PUT /api/user/profile read-back failed after successful update:', readError);
        updatedProfile = {
          id: userId,
          name: name ?? req.user?.name,
          email: email ?? req.user?.email,
          max_parent_message_days: parsedRetentionDays,
        };
      }
    }

    // If password was changed, send confirmation email
    if (newPassword) {
      // Complete the SMTP attempt before returning so Vercel cannot terminate
      // the function while the email is still being sent.
      await sendPasswordChangeEmail(email || req.user.email, name || req.user.name);
    }

    if (parsedRetentionDays !== undefined) {
      await pruneExpiredParentMessages(supabase, userId);
    }

    res.json({ message: 'Profile updated successfully', profile: updatedProfile });
  } catch (error: any) {
    console.error('PUT /api/user/profile failed:', error);
    const resolvedDetails = error?.details || error?.hint || error?.message || (typeof error === 'string' ? error : null) || 'Failed to update profile';
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Email already in use', details: resolvedDetails });
    }
    if (error?.code === 'PGRST116') {
      return res.status(404).json({ error: 'Profile not found', details: resolvedDetails });
    }
    if (error?.code === '42501') {
      return res.status(403).json({ error: 'Profile update blocked by database permissions', details: resolvedDetails });
    }
    res.status(500).json({ error: 'Internal server error', details: resolvedDetails });
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
  return res.status(410).json({ error: 'Child chatbot has been removed' });
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
  return res.status(410).json({ error: 'Child chatbot has been removed' });
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

  if (req.user.role === 'kid' && req.user.kidId !== kidId) {
    return res.status(403).json({ error: 'Forbidden' });
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
  return res.status(410).json({ error: 'Child chatbot has been removed' });
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
  return res.status(410).json({ error: 'Child chatbot has been removed' });
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
  return res.status(410).json({ error: 'Child chatbot has been removed' });
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
      const backendProjectId = supabaseUrl?.split('//')[1]?.split('.')[0] || 'unknown';
      return res.status(404).json({ 
        error: 'Parent not found', 
        details: `The parent account '${email}' was not found in the current backend database (${backendProjectId}). Please verify that your backend SUPABASE_URL matches the project where you created the parent account.`,
        backendProject: backendProjectId
      });
    }

    console.log('Found parent user:', user.id);

    // Find kids for this user
    let { data: kids, error: kidsError } = await supabase
      .from('kids')
      .select('id, name')
      .eq('user_id', user.id);

    // Fallback for parent_id
    if ((!kids || kids.length === 0) && !kidsError) {
      console.log('No kids found for user_id in by-parent-email, checking parent_id fallback...');
      const { data: parentKids, error: parentError } = await supabase
        .from('kids')
        .select('id, name')
        .eq('parent_id', user.id);
      if (!parentError && parentKids && parentKids.length > 0) {
        kids = parentKids;
        console.log(`Found ${kids.length} kids via parent_id fallback for user ${user.id}`);
      }
    }

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

const normalizeMaxParentMessageDays = (value: any) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.floor(parsed);
};

const getParentMessageRetentionDays = async (supabase: any, userId: string) => {
  for (const column of ['max_parent_message_days', 'max_parent_messages']) {
    const { data, error } = await supabase
      .from('users')
      .select(column)
      .eq('id', userId)
      .single();

    if (!error && data) {
      return normalizeMaxParentMessageDays(data[column]);
    }

    if (error && !isMissingColumnError(error)) {
      console.warn(`Failed to read parent-message retention from ${column}:`, error);
      break;
    }
  }

  return 20;
};

const getParentMessageCutoff = (retentionDays: number) =>
  new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

const getLatestParentMessagesMap = async (supabase: any, userId: string, kidIds: string[]) => {
  const latestByKid: Record<string, string> = {};
  if (!kidIds || kidIds.length === 0) return latestByKid;

  const retentionDays = await getParentMessageRetentionDays(supabase, userId);
  const cutoff = getParentMessageCutoff(retentionDays);

  const { data, error } = await supabase
    .from('parent_messages')
    .select('kid_id, message, created_at')
    .eq('user_id', userId)
    .in('kid_id', kidIds)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return latestByKid;
  }

  for (const row of data) {
    if (!latestByKid[row.kid_id]) {
      latestByKid[row.kid_id] = row.message;
    }
  }

  return latestByKid;
};

const pruneExpiredParentMessages = async (
  supabase: any,
  userId: string,
  kidId?: string
) => {
  const retentionDays = await getParentMessageRetentionDays(supabase, userId);
  const cutoff = getParentMessageCutoff(retentionDays);

  let deleteQuery = supabase
    .from('parent_messages')
    .delete()
    .eq('user_id', userId)
    .lt('created_at', cutoff);

  if (kidId) {
    deleteQuery = deleteQuery.eq('kid_id', kidId);
  }

  const { error: pruneError } = await deleteQuery;

  if (pruneError) {
    console.warn('Failed to prune expired parent messages:', pruneError);
  }
};

const insertParentMessageAndPrune = async (
  supabase: any,
  userId: string,
  kidId: string,
  messageRaw: string
) => {
  const message = (messageRaw || '').trim();
  if (!message) {
    throw new Error('Message cannot be empty');
  }

  const { error: insertError } = await supabase
    .from('parent_messages')
    .insert({ user_id: userId, kid_id: kidId, message });

  if (insertError) {
    throw insertError;
  }

  await pruneExpiredParentMessages(supabase, userId, kidId);
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
    
    // Attempt standard retrieval by user_id
    let { data: kids, error } = await supabase
      .from('kids')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    // Fallback: If no kids found with user_id, check for parent_id column (legacy/alternative schema)
    if ((!kids || kids.length === 0) && !error) {
      console.log('No kids found for user_id, checking parent_id fallback...');
      const { data: parentKids, error: parentError } = await supabase
        .from('kids')
        .select('*')
        .eq('parent_id', userId)
        .order('created_at', { ascending: false });
        
      if (!parentError && parentKids && parentKids.length > 0) {
        kids = parentKids;
        console.log(`Found ${kids.length} kids via parent_id fallback for user ${userId}`);
      }
    }

    if (error) {
      console.error('Supabase error fetching kids:', error);
      return res.status(500).json({ 
        error: 'Supabase Query Error', 
        message: error.message,
        details: error,
        userId: userId
      });
    }
    
    console.log(`Fetched ${kids?.length || 0} kids for user ${userId}`);
    
    const messageKidIds = (kids || []).map(k => k.id);
    await pruneExpiredParentMessages(supabase, userId);
    const latestMessages = await getLatestParentMessagesMap(supabase, userId, messageKidIds);

    const processedKids = (kids || []).map(k => {
      const kid = k;
      if (latestMessages[kid.id]) {
        kid.parent_message = latestMessages[kid.id];
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
  if (req.user.role === 'kid' && req.user.kidId !== id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
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

    const processedKid = { ...kid };
    try {
      const messageOwnerId = req.user.userId || req.user.id;
      await pruneExpiredParentMessages(supabase, messageOwnerId, id);
      const latestMessages = await getLatestParentMessagesMap(supabase, messageOwnerId, [id]);
      if (latestMessages[id]) {
        processedKid.parent_message = latestMessages[id];
      }
    } catch (msgErr) {
      console.warn('Failed to load latest parent message from parent_messages:', msgErr);
    }
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
      .select('id, user_id, reward_balance, name, reward_type, timezone')
      .eq('id', id)
      .single();

    if (checkError || !kid) return res.status(403).json({ error: 'Forbidden' });
    let isOwner = kid.user_id === userId;
    if (!isOwner) {
      const { data: legacyKid, error: legacyErr } = await supabase
        .from('kids')
        .select('id')
        .eq('id', id)
        .eq('parent_id', userId)
        .maybeSingle();

      if (!legacyErr && legacyKid) {
        isOwner = true;
      } else if (legacyErr && legacyErr.code !== '42703' && legacyErr.code !== 'PGRST204') {
        console.warn('Ownership fallback via parent_id failed:', legacyErr.message || legacyErr);
      }
    }
    if (!isOwner) return res.status(403).json({ error: 'Forbidden' });

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

        const timezone = kid.timezone || 'UTC';

        // Function to convert date to timezone string in YYYY-MM-DD HH:MM:SS
        const getZonedDateString = (date: Date, tz: string) => {
          const parts = new Intl.DateTimeFormat('en-US', {
              timeZone: tz,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
          }).formatToParts(date);
          
          const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
          return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
        };

        const completionDate = getZonedDateString(new Date(), timezone);

        await supabase.from('activity_history').insert({
          kid_id: id,
          activity_type: 'Parent Bonus',
          category: 'Reward',
          description: `Parent gave the ${rewardDisplay} to ${currentKidName}.`,
          reward_qty: amountEarned,
          completion_date: completionDate
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
    if (parentMessage !== undefined && String(parentMessage).trim()) {
      await insertParentMessageAndPrune(supabase, userId, id, String(parentMessage));
    }
    // timezone is removed as it does not exist in the database schema

    let error: any = null;
    if (Object.keys(updates).length > 0) {
      console.log('API: Updating kid id:', id, 'updates:', updates);
      const updateResult = await supabase
        .from('kids')
        .update(updates)
        .eq('id', id);
      error = updateResult.error;
    }

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
        let retryError: any = null;
        if (Object.keys(updatesWithOldCode).length > 0) {
          const retryResult = await supabase
            .from('kids')
            .update(updatesWithOldCode)
            .eq('id', id);
          retryError = retryResult.error;
        }

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

  if (req.user.role === 'kid' && req.user.kidId !== kidId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

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

    // Each repeated/reassigned occurrence is a separate activity row. Count
    // completion timestamps on those assignments instead of inferring them
    // from created_at or report history.
    const completionTargetDate = getActivityDateInTimeZone(
      new Date().toISOString(),
      kid.timezone || 'UTC',
    ) || today;
    const completedTodayCount = countAssignedActivitiesCompletedOnDate(
      activities || [],
      completionTargetDate,
      kid.timezone || 'UTC',
    );

    res.json({ activities: activitiesWithSteps, completedTodayCount });
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
      .order('created_at', { ascending: false });

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

// Parent messages
app.post('/api/kids/:kidId/messages', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { kidId } = req.params;
  const { message } = req.body;
  const userId = req.user.id;

  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const { data: kid, error: kidErr } = await supabase
      .from('kids')
      .select('id, user_id')
      .eq('id', kidId)
      .single();

    if (kidErr || !kid) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    let isOwner = kid.user_id === userId;
    if (!isOwner) {
      const { data: legacyKid, error: legacyErr } = await supabase
        .from('kids')
        .select('id')
        .eq('id', kidId)
        .eq('parent_id', userId)
        .maybeSingle();

      if (!legacyErr && legacyKid) {
        isOwner = true;
      } else if (legacyErr && legacyErr.code !== '42703' && legacyErr.code !== 'PGRST204') {
        console.warn('POST message ownership fallback via parent_id failed:', legacyErr.message || legacyErr);
      }
    }

    if (!isOwner) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await insertParentMessageAndPrune(supabase, userId, kidId, String(message));

    const io = req.app.get('io');
    if (io) {
      io.to(`kid_${kidId}`).emit('data_updated', { kidId });
    }

    res.status(201).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save parent message' });
  }
});

app.get('/api/kids/:kidId/messages', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { kidId } = req.params;
  const userId = req.user.id;

  try {
    const { data: kid, error: kidErr } = await supabase
      .from('kids')
      .select('id, user_id')
      .eq('id', kidId)
      .single();

    if (kidErr || !kid) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    let isOwner = kid.user_id === userId;
    if (!isOwner) {
      const { data: legacyKid, error: legacyErr } = await supabase
        .from('kids')
        .select('id')
        .eq('id', kidId)
        .eq('parent_id', userId)
        .maybeSingle();

      if (!legacyErr && legacyKid) {
        isOwner = true;
      } else if (legacyErr && legacyErr.code !== '42703' && legacyErr.code !== 'PGRST204') {
        console.warn('GET message ownership fallback via parent_id failed:', legacyErr.message || legacyErr);
      }
    }

    if (!isOwner) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await pruneExpiredParentMessages(supabase, userId, kidId);

    const retentionDays = await getParentMessageRetentionDays(supabase, userId);
    const cutoff = getParentMessageCutoff(retentionDays);

    const { data: messages, error } = await supabase
      .from('parent_messages')
      .select('id, kid_id, message, created_at')
      .eq('kid_id', kidId)
      .eq('user_id', userId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ messages: messages || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch parent messages' });
  }
});

app.delete('/api/kids/:kidId/messages/:messageId', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { kidId, messageId } = req.params;
  const userId = req.user.id;

  try {
    const { data: kid, error: kidErr } = await supabase
      .from('kids')
      .select('id, user_id')
      .eq('id', kidId)
      .single();

    if (kidErr || !kid) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    let isOwner = kid.user_id === userId;
    if (!isOwner) {
      const { data: legacyKid, error: legacyErr } = await supabase
        .from('kids')
        .select('id')
        .eq('id', kidId)
        .eq('parent_id', userId)
        .maybeSingle();

      if (!legacyErr && legacyKid) {
        isOwner = true;
      } else if (legacyErr && legacyErr.code !== '42703' && legacyErr.code !== 'PGRST204') {
        console.warn('DELETE message ownership fallback via parent_id failed:', legacyErr.message || legacyErr);
      }
    }

    if (!isOwner) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { error } = await supabase
      .from('parent_messages')
      .delete()
      .eq('id', messageId)
      .eq('kid_id', kidId)
      .eq('user_id', userId);

    if (error) throw error;

    const io = req.app.get('io');
    if (io) {
      io.to(`kid_${kidId}`).emit('data_updated', { kidId });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete parent message' });
  }
});

app.put('/api/kids/:kidId/confirm-reward', authenticateToken, async (req: any, res) => {
    const adminSupabase = getAdminSupabaseClient();
    const { kidId } = req.params;
    try {
        const { data: kid, error: kidErr } = await adminSupabase
            .from('kids')
            .select('reward_balance')
            .eq('id', kidId)
            .single();
        if (kidErr || !kid) throw kidErr || new Error('Kid not found');

        // Legacy pending-reward endpoint retained for backward compatibility.
        const noteLines: string[] = [];
        let totalPendingAmount = 0;
        let alreadyAdded = false;
        
        const newNotes = noteLines.filter((line: string) => {
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
            const { error: rpcError } = await adminSupabase.rpc('increment_reward_balance', {
                kid_id_param: kidId,
                amount: totalPendingAmount
            });

            if (rpcError) {
                console.warn('RPC increment_reward_balance failed, falling back to manual update:', rpcError);
                const { data: kidData, error: kidFetchError } = await adminSupabase.from('kids').select('reward_balance').eq('id', kidId).single();
                if (!kidFetchError) {
                    const newBalance = (kidData?.reward_balance || 0) + totalPendingAmount;
                    await adminSupabase.from('kids').update({ reward_balance: newBalance }).eq('id', kidId);
                }
            }
        }
        
        res.status(200).json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/activities/:id', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;
  let { activityType, category, repeatFrequency, repeatsTill, timeOfDay, description, link, imageUrl, status, dueDate, steps, repeat_interval, repeat_unit } = req.body;
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

    if (req.user.role === 'kid' && activity.kid_id !== req.user.kidId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Children may complete their own pending activity, but cannot edit its
    // content, schedule, recurrence, ownership, or restore history records.
    if (req.user.role === 'kid') {
      if (isHistory || status !== 'completed') {
        return res.status(403).json({ error: 'Children may only complete pending activities' });
      }
      activityType = activity.activity_type;
      category = activity.category;
      repeatFrequency = activity.repeat_frequency;
      repeatsTill = activity.repeats_till;
      timeOfDay = activity.time_of_day;
      description = activity.description;
      link = activity.link;
      imageUrl = activity.image_url;
      dueDate = activity.due_date;
      repeat_interval = activity.repeat_interval;
      repeat_unit = activity.repeat_unit;
      steps = undefined;
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

    const isNewCompletion = status === 'completed' && activity.status !== 'completed';
    const assignedCompletionDate = isNewCompletion
      ? new Date().toISOString()
      : status === 'pending'
        ? null
        : activity.completion_date;

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
        completion_date: assignedCompletionDate,
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
    if (isNewCompletion) {
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

      // Fetch kid's timezone
      const { data: kidData } = await supabase.from('kids').select('timezone').eq('id', activity.kid_id).single();
      const timezone = kidData?.timezone || 'UTC';

      // Function to convert date to timezone string in YYYY-MM-DD HH:MM:SS
      const getZonedDateString = (date: Date, tz: string) => {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).formatToParts(date);
        
        const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
        return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
      };

      const completionDate = getZonedDateString(new Date(), timezone);

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
          completion_date: completionDate,
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
      .order('updated_at', { ascending: false });

    if (error) throw error;
    res.json({ stories });
  } catch (error: any) {
    console.error('Social stories fetch error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message || String(error) });
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
  } catch (error: any) {
    console.error('Social story create error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message || String(error) });
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
  } catch (error: any) {
    console.error('Social story update error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message || String(error) });
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
  if (req.user.role === 'kid' && req.user.kidId !== kidId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const onlyActive = req.query.onlyActive === 'true';

  try {
    let query = supabase
      .from('reward_items')
      .select('*')
      .eq('kid_id', kidId);
    
    if (onlyActive) {
      query = query.eq('is_active', true);
    }

    const { data: items, error } = await query.order('cost', { ascending: true });

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
  const { name, cost, imageUrl, location, is_active } = req.body;
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
          location: location || null,
          is_active: typeof is_active === 'boolean' ? is_active : true
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
  const { name, cost, imageUrl, location, is_active } = req.body;
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
        location: location || null,
        is_active: typeof is_active === 'boolean' ? is_active : true
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
  const { quantity, itemName, location, purchasedAt } = req.body;

  if (!quantity || quantity <= 0) return res.status(400).json({ error: 'Invalid quantity' });

  try {
    const { data: kid, error: kidError } = await supabase
      .from('kids')
      .select('reward_balance, timezone')
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
          location: location || 'General',
          purchased_at: purchasedAt || new Date().toISOString()
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

// --- AI Helpers ---

type GeminiImageResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          data?: string;
          mimeType?: string;
        };
      }>;
    };
  }>;
};

export const extractInlineImageDataUrl = (response: GeminiImageResponse): string | null => {
  const parts = response.candidates?.[0]?.content?.parts || [];

  for (const part of parts) {
    const data = part.inlineData?.data;
    if (!data) continue;

    if (data.startsWith('data:image/')) return data;
    const mimeType = part.inlineData?.mimeType || 'image/png';
    return `data:${mimeType};base64,${data}`;
  }

  return null;
};

/**
 * Executes a Gemini API call with automatic retry on transient (503, 429, 500) errors,
 * and falls back to alternative models if the primary model fails.
 */
export async function generateContentWithRetryAndFallback(
  ai: any,
  params: {
    model: string;
    contents: any;
    config?: any;
  },
  maxRetries = 2,
  wait: (milliseconds: number) => Promise<void> = milliseconds =>
    new Promise(resolve => setTimeout(resolve, milliseconds)),
): Promise<any> {
  const modelNameInput = params.model;
  const modelLower = (modelNameInput || '').toLowerCase();
  
  // Decide sequential models list for fallback
  let modelsToTry: string[] = [];
  if (modelLower.includes('pro')) {
    modelsToTry = [modelNameInput, 'gemini-3.1-pro-preview', 'gemini-3.5-flash', 'gemini-3-flash-preview'];
  } else if (modelLower.includes('image')) {
    modelsToTry = [modelNameInput, 'gemini-2.5-flash-image', 'gemini-3.1-flash-image-preview'];
  } else {
    modelsToTry = [modelNameInput, 'gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite'];
  }
  
  // Clean up any empty or duplicated items
  modelsToTry = modelsToTry.filter((m, index, self) => m && self.indexOf(m) === index);

  let lastError: any = null;

  for (const model of modelsToTry) {
    let attempts = 0;
    while (attempts <= maxRetries) {
      try {
        console.log(`[AI SDK Engine] Attempting model ${model} (attempt ${attempts + 1}/${maxRetries + 1})...`);
        const result = await ai.models.generateContent({
          ...params,
          model,
        });
        console.log(`[AI SDK Engine] Success with model ${model}`);
        return result;
      } catch (err: any) {
        attempts++;
        lastError = err;
        const errCode = err.status || (err.error && err.error.code) || 500;
        const errMsg = err.message || '';
        
        console.error(`[AI SDK Engine] Model ${model} failed with code ${errCode}: ${errMsg}`);
        
        // Authentication and invalid-request failures cannot be fixed by retrying.
        if (errCode === 400 || errCode === 403 || errMsg.includes('API key not valid') || errMsg.includes('API_KEY_INVALID')) {
          throw err;
        }

        // A missing/unavailable model should move directly to the next fallback.
        if (errCode === 404) break;

        const isTransient = errCode === 429 || errCode === 500 || errCode === 503;
        if (!isTransient) throw err;

        if (attempts <= maxRetries) {
          const delayTime = Math.min(2000, 500 * Math.pow(2, attempts));
          console.log(`[AI SDK Engine] Transient error, retrying in ${delayTime}ms...`);
          await wait(delayTime);
        }
      }
    }
    console.warn(`[AI SDK Engine] Model ${model} failed all attempts. Trying next fallback...`);
  }

  throw lastError;
}

const allowedAiModels = new Set([
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
  'gemini-2.5-flash-image',
]);

export const resolveRequestedAiModel = (requestedModel: unknown): string | null => {
  const model = typeof requestedModel === 'string' && requestedModel.trim()
    ? requestedModel.trim()
    : 'gemini-3-flash-preview';

  return allowedAiModels.has(model) ? model : null;
};

type AiClientFactory = (apiKey: string) => any;

const defaultAiClientFactory: AiClientFactory = apiKey => new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

let aiClientFactory: AiClientFactory = defaultAiClientFactory;

/** Replaces the AI transport in isolated tests; passing null restores production behavior. */
export const setAiClientFactoryForTests = (factory: AiClientFactory | null): void => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('AI client replacement is only available in the test environment');
  }
  aiClientFactory = factory || defaultAiClientFactory;
};

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
  
    const modelNameInput = resolveRequestedAiModel(model_body || model_name_body);
    const apiKey = (cleanEnvVar('GEMINI_API_KEY') || cleanEnvVar('GOOGLE_API_KEY')).trim();
    let finalModelName = 'gemini-3-flash-preview';
    
    try {
    if (!apiKey || apiKey === 'undefined' || apiKey === 'null' || apiKey.length < 10) {
      return res.status(500).json({ 
        error: `AI API key not configured. Please set GEMINI_API_KEY in your settings.` 
      });
    }

    if (!modelNameInput) {
      return res.status(400).json({ error: 'Unsupported AI model requested' });
    }
    finalModelName = modelNameInput;

    console.log(`[AI Generation] Using SDK with model: ${finalModelName}`);

    const ai = aiClientFactory(apiKey);
    
    // Format contents for SDK
    const formattedContents = Array.isArray(contents) ? contents : [{ role: 'user', parts: [{ text: contents || prompt }] }];
    
    // Scrub undefined/null from config to prevent SDK errors
    const generationConfig: any = { ...config };
    if (responseMimeType) generationConfig.responseMimeType = responseMimeType;
    if (responseSchema) generationConfig.responseSchema = responseSchema;
    if (systemInstruction) generationConfig.systemInstruction = systemInstruction;

    // Filter out null/undefined values
    Object.keys(generationConfig).forEach(key => {
        if (generationConfig[key] === undefined || generationConfig[key] === null) {
            delete generationConfig[key];
        }
    });

    const result = await generateContentWithRetryAndFallback(ai, {
      model: finalModelName,
      contents: formattedContents,
      config: {
        ...generationConfig,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ]
      }
    });

    // Image models can return a text part and an image part together. Always
    // prioritize inline image data for image requests instead of result.text.
    let text = finalModelName.includes('image')
      ? extractInlineImageDataUrl(result)
      : result.text;

    if (!text && !finalModelName.includes('image')) text = result.text;

    if (!text && finalModelName.includes('image')) {
      return res.status(502).json({ error: 'AI image response did not contain image data' });
    }

    res.json({ text });

  } catch (error: any) {
    console.error('[AI Generation] SDK Exception:', error);
    
    let errorMessage = error.message || 'AI generation failed';
    let errorStatus = error.status || 500;
    let errorReason = '';

    // Extract more detail if possible from SDK error
    if (error.response?.error) {
        const remoteError = error.response.error;
        console.error('[AI Generation] Remote Error Data:', JSON.stringify(remoteError, null, 2));
        errorMessage = remoteError.message || errorMessage;
        
        // Extract ErrorInfo reason if present
        if (remoteError.details) {
            const errorInfo = remoteError.details.find((d: any) => 
                d['@type'] === 'type.googleapis.com/google.rpc.ErrorInfo' || 
                (d['@type'] && d['@type'].includes('ErrorInfo'))
            );
            if (errorInfo) {
                errorReason = errorInfo.reason || errorInfo.metadata?.reason || '';
            }
        }
    }

    // Add user-friendly advice based on status or reason
    if (errorStatus === 403 || errorStatus === 400 || errorReason === 'API_KEY_INVALID' || errorMessage.includes('API key not valid')) {
        errorMessage = `API Key Invalid: ${errorMessage}. Action: Please check your Gemini API key in the app Settings > Secrets menu. Ensure it's correctly copied and the Generative Language API is enabled.`;
        errorStatus = 403;
    } else if (errorStatus === 429 || errorReason === 'RATE_LIMIT_EXCEEDED' || errorReason === 'QUOTA_EXHAUSTED' || errorMessage.includes('quota')) {
        errorMessage = `Quota Exceeded: ${errorMessage}. Action: Please try again in 60 seconds or switch to a paid API key.`;
        errorStatus = 429;
    } else if (errorStatus === 404 || errorReason === 'MODEL_NOT_FOUND') {
        errorMessage = `Model Not Found: ${errorMessage}. Action: The requested model (${finalModelName}) is not available in your region.`;
        errorStatus = 404;
    }

    res.status(errorStatus).json({ 
      error: errorMessage,
      message: errorMessage,
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
      .select('*')
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
  const { title, topic, subject, targetAge, gradeLevel, worksheetType, content, kidId } = req.body;
  const userId = req.user.id;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

  try {
    const supabase = getAdminSupabaseClient();
    const id = uuidv4();
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    
    // Build the insert object dynamically
    const insertData: any = {
      id,
      user_id: userId,
      title,
      content: contentStr
    };

    // Add optional fields only if they are not undefined
    if (topic !== undefined) insertData.topic = topic;
    if (subject !== undefined) insertData.subject = subject;
    if (targetAge !== undefined) insertData.target_age = targetAge;
    if (gradeLevel !== undefined) insertData.grade_level = gradeLevel;
    if (worksheetType !== undefined) insertData.worksheet_type = worksheetType;
    if (kidId !== undefined) insertData.kid_id = kidId;

    const { error } = await supabase
      .from('worksheets')
      .insert([insertData]);

    if (error) {
      console.error('Database error in POST /api/worksheets:', JSON.stringify(error, null, 2));
      // If column is missing (42703 or PGRST204), it's a schema issue
      if (error.code === '42703' || error.code === 'PGRST204') {
        // Fallback: Try saving without kid_id if it's the specific missing column error
        console.warn('kid_id column likely missing in worksheets table, retrying without it...');
        const { kid_id, ...fallbackData } = insertData;
        const { error: retryError } = await supabase.from('worksheets').insert([fallbackData]);
        if (retryError) {
          console.error('Fallback failed:', JSON.stringify(retryError, null, 2));
          throw retryError;
        }
        
        return res.status(201).json({ 
          message: 'Worksheet saved successfully (Note: Child assignments are currently disabled for worksheets)', 
          worksheetId: id,
          warning: 'Schema mismatch'
        });
      }
      throw error;
    }

    res.status(201).json({ message: 'Worksheet saved successfully', worksheetId: id });
  } catch (error: any) {
    console.error('Worksheet save error:', JSON.stringify(error, null, 2));
    res.status(500).json({ 
      error: 'Failed to save worksheet', 
      details: error.message || String(error),
      code: error.code
    });
  }
});

// Update a worksheet
app.put('/api/worksheets/:id', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;
  const { title, topic, subject, targetAge, gradeLevel, worksheetType, content, kidId } = req.body;
  const userId = req.user.id;

  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

  try {
    const supabase = getAdminSupabaseClient();
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    
    // Build update object dynamically
    const updateData: any = {
      content: contentStr
    };

    if (title !== undefined) updateData.title = title;
    if (topic !== undefined) updateData.topic = topic;
    if (subject !== undefined) updateData.subject = subject;
    if (targetAge !== undefined) updateData.target_age = targetAge;
    if (gradeLevel !== undefined) updateData.grade_level = gradeLevel;
    if (worksheetType !== undefined) updateData.worksheet_type = worksheetType;

    if (kidId !== undefined) {
      updateData.kid_id = kidId || null;
    }

    const { error } = await supabase
      .from('worksheets')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Database error in PUT /api/worksheets:', JSON.stringify(error, null, 2));
      if (error.code === '42703' || error.code === 'PGRST204') {
        const { kid_id, ...fallbackData } = updateData;
        const { error: retryError } = await supabase
          .from('worksheets')
          .update(fallbackData)
          .eq('id', id)
          .eq('user_id', userId);
        if (retryError) {
          console.error('Fallback update failed:', JSON.stringify(retryError, null, 2));
          throw retryError;
        }
        
        return res.json({ 
          message: 'Worksheet updated successfully (Note: Child assignments are currently disabled for worksheets)' 
        });
      }
      throw error;
    }
    res.json({ message: 'Worksheet updated successfully' });
  } catch (error: any) {
    console.error('Worksheet update error:', JSON.stringify(error, null, 2));
    res.status(500).json({ 
      error: 'Failed to update worksheet', 
      details: error.message || String(error),
      code: error.code
    });
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
      .select('*')
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
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('*') // Select all to avoid explicit column errors if schema isn't updated yet
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quizzes:', error);
      throw error;
    }
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
    if (req.user.role === 'kid') {
      const belongsToParent = quiz.user_id === req.user.id;
      const assignedToChild = !quiz.kid_id || quiz.kid_id === req.user.kidId;
      if (!belongsToParent || !assignedToChild) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    res.json({ quiz });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a quiz
app.post('/api/quizzes', authenticateToken, async (req: any, res) => {
  const { kidId, title, topic, subject, difficulty, gradeLevel, noOfQuestions, questionType, questionScore, content } = req.body;
  const userId = req.user.id;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

  try {
    const supabase = getAdminSupabaseClient();
    const id = uuidv4();
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    
    // Build the insert object dynamically
    const insertData: any = {
      id,
      user_id: userId,
      title,
      content: contentStr
    };

    if (topic !== undefined) insertData.topic = topic;
    if (difficulty !== undefined) insertData.difficulty = difficulty;
    if (gradeLevel !== undefined) {
      insertData.grade_level = gradeLevel;
      insertData.gradelevel = gradeLevel; // Common variation
    }

    if (kidId !== undefined && kidId !== '') insertData.kid_id = kidId;
    if (subject !== undefined) insertData.subject = subject;
    
    // Check for schema variations for other fields
    if (noOfQuestions !== undefined) {
      insertData.no_of_questions = noOfQuestions;
      insertData.num_questions = noOfQuestions;
    }
    if (questionType !== undefined) {
      insertData.question_type = questionType;
      insertData.type = questionType;
    }
    if (questionScore !== undefined) {
      insertData.score_per_question = questionScore;
      insertData.points_per_question = questionScore;
    }

    console.log(`[QUIZ_SAVE] Attempting to save quiz for user ${userId}, kid ${kidId || 'none'}`);
    
    const { error } = await supabase
      .from('quizzes')
      .insert([insertData]);

    if (error) {
      console.error('Database error in POST /api/quizzes (Attempt 1):', JSON.stringify(error, null, 2));
      
      // If error is column not found, try with restricted data
      if (error.code === '42703' || error.code === 'PGRST204') {
        console.warn('One or more columns missing in quizzes table, retrying with minimal fields...');
        
        // Final attempt with only fields definitely known to exist in most versions of this table
        const minimalData: any = {
          id,
          user_id: userId,
          title,
          content: contentStr
        };
        
        // Add optional fields one by one in the second attempt if the error message doesn't point to them
        // For simplicity, we just keep the confirmed ones
        if (topic) minimalData.topic = topic;
        if (difficulty) minimalData.difficulty = difficulty;
        if (kidId && kidId !== '') minimalData.kid_id = kidId;
        
        // Try grade_level then gradelevel if it fails
        minimalData.grade_level = gradeLevel;

        const { error: retryError } = await supabase.from('quizzes').insert([minimalData]);
        
        if (retryError) {
          console.error('Fallback quiz insert failed:', JSON.stringify(retryError, null, 2));
          
          // One last attempt - absolute minimum
          if (retryError.code === '42703' || retryError.code === 'PGRST204') {
            const absoluteMinimal = { id, user_id: userId, title, content: contentStr };
            const { error: finalError } = await supabase.from('quizzes').insert([absoluteMinimal]);
            if (finalError) throw finalError;
          } else {
            throw retryError;
          }
        }
        
        return res.status(201).json({ 
          message: 'Quiz created successfully (some optional fields were omitted due to schema differences)', 
          quizId: id 
        });
      }
      throw error;
    }
    
    if (kidId) {
      const io = req.app.get('io');
      if (io) io.to(`kid_${kidId}`).emit('data_updated', { kidId });
    }

    res.status(201).json({ message: 'Quiz saved successfully', quizId: id });
  } catch (error: any) {
    console.error('Quiz save error (Final Catch):', JSON.stringify(error, null, 2));
    res.status(500).json({ 
      error: 'Failed to save quiz', 
      details: error.message || String(error),
      code: error.code
    });
  }
});

// Update a quiz
app.put('/api/quizzes/:id', authenticateToken, async (req: any, res) => {
  const supabase = getSupabaseForUser(req);
  const { id } = req.params;
  const { kidId, title, topic, subject, difficulty, gradeLevel, noOfQuestions, questionType, questionScore, content } = req.body;
  const userId = req.user.id;

  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

  try {
    const supabase = getAdminSupabaseClient();
    // Check ownership
    const { data: quiz, error: checkError } = await supabase
      .from('quizzes')
      .select('user_id')
      .eq('id', id)
      .single();

    if (checkError || !quiz || quiz.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);

    // Build update object dynamically
    const updateData: any = {
      title,
      topic,
      difficulty,
      grade_level: gradeLevel,
      content: contentStr
    };

    if (kidId !== undefined) updateData.kid_id = kidId;
    if (subject !== undefined) updateData.subject = subject;
    if (noOfQuestions !== undefined) updateData.no_of_questions = noOfQuestions;
    if (questionType !== undefined) updateData.question_type = questionType;
    if (questionScore !== undefined) updateData.score_per_question = questionScore;

    const { error } = await supabase
      .from('quizzes')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Database error in PUT /api/quizzes/:id:', JSON.stringify(error, null, 2));
      if (error.code === '42703' || error.code === 'PGRST204') {
        console.warn('Fallback update for quiz...');
        const minimalUpdate = {
          title,
          topic,
          difficulty,
          grade_level: gradeLevel,
          content: contentStr
        };
        const { error: retryError } = await supabase
          .from('quizzes')
          .update(minimalUpdate)
          .eq('id', id);
        if (retryError) {
          console.error('Fallback quiz update failed:', JSON.stringify(retryError, null, 2));
          throw retryError;
        }
        return res.json({ message: 'Quiz updated successfully (some fields omitted)' });
      }
      throw error;
    }
    
    res.json({ message: 'Quiz updated successfully' });
  } catch (error: any) {
    console.error('Quiz update error:', JSON.stringify(error, null, 2));
    res.status(500).json({ 
      error: 'Failed to update quiz', 
      details: error.message || String(error),
      code: error.code
    });
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
  if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
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

  if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
    startServer().then(() => {
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`[${new Date().toISOString()}] Server listening on port ${PORT}`);
      });
    }).catch(err => {
      console.error('Failed to initialize server:', err);
      // Still listen so we can at least show errors or handle pings if possible,
      // but the app is likely broken.
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`[${new Date().toISOString()}] Server listening on port ${PORT} (with startup errors)`);
      });
    });
  }
