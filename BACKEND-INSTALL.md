# 📚 VYGC Backend Documentation

## 🏗️ Architecture

```
┌─────────────────┐
│   Client (Frontend) │
│   index.html    │
└────────┬────────┘
         │ HTTPS/JSON
         ▼
┌─────────────────┐
│   Express API   │
│   server.js     │ ← Routes + Middleware
└────────┬────────┘
         │ Supabase Client
         ▼
┌─────────────────┐
│   Supabase DB   │ ← PostgreSQL
│   (Cloud)       │
└─────────────────┘
```

## 📁 Project Structure

```
vygc-verification/
├── server.js                  ← Main Express server (API)
├── package.json              ← Node dependencies
├── .env                      ← Configuration (create from .env.example)
├── .env.example             ← Template
├── vygc-api.js               ← Frontend API client (browser)
├── supabase-schema.sql       ← Database schema for Supabase
├── BACKEND-INSTALL.md        ← This file
└── node_modules/             ← (after npm install)
```

---

## 🚀 Installation Guide

### Step 1: Prerequisites

**Install Node.js (if not installed):**
- Download from https://nodejs.org (LTS version)
- Verify: `node --version` (should be >= 18.x)

**Create Supabase account:**
1. Go to https://supabase.com
2. Click "Start your project" → Sign up (GitHub or email)
3. Create new project:
   - Name: `vygc-verification`
   - Region: Choose closest (e.g., Frankfurt, Singapore)
   - Password: Set strong database password (save it!)
4. Wait ~2 minutes for provisioning

### Step 2: Setup Supabase Database

1. In Supabase Dashboard → **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy entire contents of `supabase-schema.sql`
4. Paste into SQL Editor
5. Click **Run** (or press Ctrl+Enter)

✅ You should see: "Success. No rows returned" (this is normal)

**Verify:**
- Go to **Table Editor** (left sidebar)
- You should see 2 tables: `submissions` and `admin_users`

### Step 3: Get Supabase Credentials

In Supabase Dashboard:
1. Click **Settings** (gear icon) → **API**
2. Copy these values:

```
Supabase URL:     https://xxxxx.supabase.co
anon/public key:  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **NEVER expose service_role key in frontend!** Keep it backend-only.

### Step 4: Configure Backend

1. Open `.env` file (created earlier)
2. Fill in your Supabase credentials:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=your-random-64-char-string-here-generate-with-node
```

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

3. (Optional) Configure email SMTP settings if you want real emails.

### Step 5: Install Dependencies & Run

```bash
cd C:\Users\DELL\Verification
npm install
npm start
```

You should see:
```
✅ Connected to Supabase successfully
🚀 VYGC Backend Server running on port 3000
```

### Step 6: Test API

Open browser or terminal:

```bash
# Health check
curl http://localhost:3000/api/health

# Expected response:
# {"status":"ok","timestamp":"2024-...","uptime":12.345}
```

If you see an error about Supabase connection, double-check your `.env` file.

---

## 🔧 API Endpoints Reference

### Public Endpoints (no auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/submissions` | Create new submission (client form) |
| POST | `/api/auth/login` | Admin login (returns JWT) |
| GET | `/api/health` | Health check |

### Protected Endpoints (require `Authorization: Bearer <token>`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/submissions` | List all submissions (query: ?status=pending&limit=100&offset=0) |
| GET | `/api/submissions/:id` | Get single submission |
| PATCH | `/api/submissions/:id` | Update status (body: {status: 'approved'\|'rejected'}) |
| DELETE | `/api/submissions/:id` | Delete submission |
| GET | `/api/stats` | Get counts (total/pending/approved/rejected) |
| GET | `/api/export/csv` | Download CSV export |
| GET | `/api/auth/verify` | Verify JWT token |

---

## 🎯 Frontend Integration

### Option A: Using the Provided API Client

1. Include `vygc-api.js` in your HTML:
```html
<script src="vygc-api.js"></script>
<script>
  // Initialize
  const api = new VYGCAPI('http://localhost:3000/api');

  // Submit form
  await api.submitVerification({
    rechargeType: 'neosurf',
    rechargeCode: '1234567890123456',
    currency: 'eur',
    email: 'client@example.com'
  });
</script>
```

### Option B: Plain Fetch (manual)

```javascript
// Submit without client-side storage
const response = await fetch('http://localhost:3000/api/submissions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData)
});

if (response.ok) {
  console.log('✅ Submitted to database');
}
```

---

## 🔐 Authentication Flow

### Admin Login (frontend)
```javascript
// Get credentials from login form
const { token, user } = await api.login('admin@vygc.com', 'admin123');

// Store token automatically in localStorage
// Use in subsequent requests: Authorization: Bearer <token>
```

### Protected Request Example
```javascript
const response = await fetch('http://localhost:3000/api/submissions', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('vygc_admin_token')}`
  }
});
```

### Token Expiry
- Tokens expire after **24 hours**
- Frontend should redirect to login if 401 returned
- Call `api.verifyToken()` to check validity

---

## 📊 Database Schema Explained

### `submissions` table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Unique ID |
| created_at | timestamp | Auto-generated |
| recharge_type | varchar | neosurf, pcs, steam, etc. |
| recharge_code | text | The actual coupon code |
| currency | varchar | eur, usd, chf... |
| email | varchar | Client email |
| status | varchar | pending / approved / rejected |
| ip_address | inet | Client IP (optional) |
| user_agent | text | Browser info |
| metadata | jsonb | Extra data if needed |
| processed_at | timestamp | When admin handled it |
| processed_by | UUID | Admin user ID (FK) |

### `admin_users` table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Admin ID |
| email | varchar | Login email |
| password_hash | varchar | Bcrypt hash |
| name | varchar | Display name |
| role | varchar | admin, superadmin... |
| is_active | boolean | Can be disabled |
| last_login_at | timestamp | Audit trail |

---

## 🚨 Security Best Practices

### 1. Environment Variables
NEVER commit `.env` to Git. Add to `.gitignore`:
```
.env
node_modules/
```

### 2. Supabase RLS (Row Level Security)
The schema enables RLS. Only authenticated requests (via JWT) can access data.

### 3. Rate Limiting
Built-in: 100 requests per 15 minutes per IP. Adjust in `server.js`.

### 4. Password Security
Admin passwords are **bcrypt hashed** (10 rounds). Never store plain text.

### 5. CORS
Configured in `.env`:
```env
ALLOWED_ORIGINS=http://localhost:8000,http://localhost:3000
```

### 6. Helmet.js
Sets security headers (XSS protection, HSTS, etc.) automatically.

### 7. SQL Injection Protection
Using parameterized queries via Supabase client. Safe by default.

---

## 📧 Email Notifications

### Setup (Optional)

If you want real email notifications to admin:

1. **Use Gmail** (easiest):
   - Enable 2-Factor Authentication on your Gmail
   - Generate App Password: Google Account → Security → 2FA → App passwords
   - Use that password in `.env`

2. **Or use SendGrid/Mailgun** (production):
   - Get API key from provider
   - Update `server.js` email transport configuration

### Email Templates
Currently plain HTML in `sendAdminNotification()` function. Customize as needed.

---

## 🔄 Real-time Updates (Supabase Realtime)

To add live updates when admin approves/rejects:

```javascript
// In admin.html <script>
const supabase = window.supabase.createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Subscribe to changes
const channel = supabase
  .channel('submissions-changes')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'submissions' },
    (payload) => {
      console.log('Change received!', payload);
      loadSubmissions(); // Refresh UI
    }
  )
  .subscribe();
```

Need to enable in Supabase: Settings → Replication → **Enable Realtime**

---

## 🐛 Debugging

### Check Server Logs
```bash
# In terminal (where server runs)
# Errors appear here
```

### Check Requests
```bash
# Test endpoint
curl -X GET http://localhost:3000/api/health

# With auth token (replace YOUR_TOKEN)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/submissions
```

### Supabase Dashboard
- **Table Editor**: View/edit data directly
- **SQL Editor**: Run queries manually
- **Logs**: Settings → Logs → API logs

### Common Issues

| Problem | Solution |
|---------|----------|
| `Error: Connection failed` | Check `.env` credentials, restart server |
| `401 Unauthorized` | Token missing/expired, re-login |
| `RLS policy violation` | Make sure RLS policies are set correctly in Supabase |
| `Email not sending` | Verify SMTP settings, check spam folder |
| `CORS error` | Add frontend URL to `ALLOWED_ORIGINS` in `.env` |
| `Table doesn't exist` | Run `supabase-schema.sql` in Supabase SQL Editor |

---

## 📦 Dependencies Explained

| Package | Purpose |
|---------|---------|
| `express` | Web framework |
| `cors` | Cross-origin requests |
| `helmet` | Security headers |
| `express-rate-limit` | Prevent abuse |
| `bcryptjs` | Password hashing |
| `jsonwebtoken` | Admin authentication |
| `@supabase/supabase-js` | Database client |
| `nodemailer` | Send emails |
| `dotenv` | Load environment variables |
| `express-validator` | Input validation |

---

## 🚀 Production Deployment

### Option 1: Vercel (Recommended)
1. Push code to GitHub
2. Go to https://vercel.com
3. Import project → Add environment variables
4. Deploy (auto-deploys on git push)

### Option 2: Railway
```bash
# Install Railway CLI
npm i -g @railway/cli
# Login & Deploy
railway login
railway up
```

### Option 3: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

Then push to any container host (AWS ECS, Google Cloud Run, etc.).

### Production Checklist
- [ ] Change `ADMIN_PASSWORD` hash (use bcrypt)
- [ ] Generate strong `JWT_SECRET` (64 random chars)
- [ ] Enable Supabase Realtime (if needed)
- [ ] Set up proper SMTP (not Gmail)
- [ ] Enable SSL/HTTPS (Vercel/Railway do it automatically)
- [ ] Add domain to `ALLOWED_ORIGINS`
- [ ] Set `NODE_ENV=production`
- [ ] Use Supabase service role key securely (server-side only)

---

## 📈 Scaling Considerations

### Current Design (MVP)
- Single server instance
- Single database
- Local file system not used (all in Supabase)
- ~1000 requests/day comfortably

### Scale to 10x
- Enable Supabase read replicas
- Add Redis cache for frequent queries
- Use connection pooling
- Consider serverless functions (Vercel) instead of persistent server

### Scale to 100x
- Implement queue system (Bull/BullMQ) for email sending
- Add CDN for static assets
- Database partitioning by date
- Load balancer + multiple instances

---

## 🤝 Contributing

To extend this system:

1. **Add new recharge types**: Update frontend + continue using same API
2. **Add user accounts**: Create `users` table in Supabase
3. **Add webhook notifications**: Implement `/api/webhooks/stripe` etc.
4. **Add audit log**: Create `audit_logs` table, log all admin actions

---

## 📞 Support

**Issues?**
1. Check console logs (Ctrl+Shift+I in browser)
2. Check server terminal for errors
3. Verify Supabase connection strings
4. Test SQL schema in Supabase SQL Editor

**Questions?** Refer to:
- `ADMIN-GUIDE.md` - Admin panel usage
- `README-REVOLUTIONARY.md` - Frontend features
- `QUICKSTART.md` - Getting started

---

**Happy coding!** 🎉

Last updated: 2024
VYGC Team
