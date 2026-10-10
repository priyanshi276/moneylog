require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const fs      = require('fs');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');

const app        = express();
const PORT       = process.env.PORT        || 5000;
const JWT_SECRET = process.env.JWT_SECRET  || 'fallback_secret';
const JWT_TTL    = parseInt(process.env.JWT_EXPIRES_IN || '604800', 10);
const DB_PATH    = path.join(__dirname, 'db.json');
const multer = require('multer');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) return cb(new Error('Only JPG/PNG/WEBP images allowed'));
    cb(null, true);
  },
});

// Serve uploaded receipts
app.use('/uploads', express.static(UPLOAD_DIR));
// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());

// ── DB helpers ────────────────────────────────────────────────────────────────
// const readDB  = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const readDB = () => {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  if (!db.accounts)       db.accounts = [];
  if (!db.notifications)  db.notifications = [];
  if (!db.reset_tokens)   db.reset_tokens = [];
  return db;
};
const writeDB = (d) => fs.writeFileSync(DB_PATH, JSON.stringify(d, null, 2));

// ── Auth middleware ───────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    const db   = readDB();
    const user = db.users.find(u => u.id === decoded.sub);
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    req.db   = db;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const safe = ({ password, ...u }) => u;

// ════════════════════════════════════════
//  AUTH ROUTES
// ════════════════════════════════════════

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  const errs = {};
  if (!name  || name.trim().length < 2)    errs.name     = 'Name must be at least 2 characters.';
  if (!email || !/\S+@\S+\.\S+/.test(email)) errs.email  = 'Enter a valid email.';
  if (!password || password.length < 6)    errs.password = 'Password must be at least 6 characters.';
  if (Object.keys(errs).length) return res.status(422).json({ errors: errs });

  const db = readDB();
  if (db.users.find(u => u.email === email))
    return res.status(422).json({ errors: { email: 'Email already registered.' } });

  const user = {
    id:         uuidv4(),
    name:       name.trim(),
    email:      email.toLowerCase(),
    password:   await bcrypt.hash(password, 10),
    created_at: new Date().toISOString(),
  };
  db.users.push(user);
  writeDB(db);
  return res.status(201).json({ message: 'Account created. Please log in.' });
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const db   = readDB();
  const user = db.users.find(u => u.email === email?.toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ message: 'Invalid email or password.' });

  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: JWT_TTL });
  return res.json({ token, user: safe(user) });
});

// GET /api/auth/me
// PUT /api/auth/profile
app.put('/api/auth/profile', auth, (req, res) => {
  const { name, email } = req.body;
  const errs = {};
  if (!name || name.trim().length < 2) errs.name = 'Name must be at least 2 characters.';
  if (!email || !/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email.';

  const db = req.db;
  if (email && db.users.find(u => u.email === email.toLowerCase() && u.id !== req.user.id))
    errs.email = 'Email already in use.';
  if (Object.keys(errs).length) return res.status(422).json({ errors: errs });

  const idx = db.users.findIndex(u => u.id === req.user.id);
  db.users[idx].name  = name.trim();
  db.users[idx].email = email.toLowerCase();
  writeDB(db);
  res.json({ user: safe(db.users[idx]) });
});

// PUT /api/auth/password
app.put('/api/auth/password', auth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!new_password || new_password.length < 6)
    return res.status(422).json({ errors: { new_password: 'Password must be at least 6 characters.' } });

  const db  = req.db;
  const idx = db.users.findIndex(u => u.id === req.user.id);
  const match = await bcrypt.compare(current_password || '', db.users[idx].password);
  if (!match) return res.status(401).json({ message: 'Current password is incorrect.' });

  db.users[idx].password = await bcrypt.hash(new_password, 10);
  writeDB(db);
  res.json({ message: 'Password updated.' });
});

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  const db   = req.db || readDB();
  const user = db.users.find(u => u.email === email?.toLowerCase());
  // Always respond the same way, whether or not the user exists (avoid leaking which emails are registered)
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    db.reset_tokens = db.reset_tokens.filter(t => t.user_id !== user.id); // clear old tokens
    db.reset_tokens.push({ token, user_id: user.id, expires_at: Date.now() + 15 * 60 * 1000 });
    writeDB(db);
    // No email service configured — log the reset link to the server console instead.
    console.log(`\n🔗 Password reset link for ${user.email}:\n   http://localhost:3000/reset-password/${token}\n`);
  }
  res.json({ message: 'If that email is registered, a reset link has been sent.' });
});

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, new_password } = req.body;
  if (!new_password || new_password.length < 6)
    return res.status(422).json({ errors: { new_password: 'Password must be at least 6 characters.' } });

  const db = readDB();
  const entry = db.reset_tokens.find(t => t.token === token && t.expires_at > Date.now());
  if (!entry) return res.status(400).json({ message: 'Reset link is invalid or expired.' });

  const idx = db.users.findIndex(u => u.id === entry.user_id);
  db.users[idx].password = await bcrypt.hash(new_password, 10);
  db.reset_tokens = db.reset_tokens.filter(t => t.token !== token);
  writeDB(db);
  res.json({ message: 'Password reset successful. Please log in.' });
});
app.get('/api/auth/me', auth, (req, res) => {
  res.json({ user: safe(req.user) });
});

// ════════════════════════════════════════
//  TRANSACTIONS
// ════════════════════════════════════════

// GET /api/transactions
app.get('/api/transactions', auth, (req, res) => {
  const { type, search, from, to, page = 1, limit = 20, sort = 'date', order = 'desc' } = req.query;

  let list = req.db.transactions.filter(t => t.user_id === req.user.id);

  if (type   && type   !== 'all') list = list.filter(t => t.type === type);
  if (search) list = list.filter(t =>
    t.description.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );
  if (from)  list = list.filter(t => t.date >= from);
  if (to)    list = list.filter(t => t.date <= to);

  list.sort((a, b) => {
    const av = a[sort], bv = b[sort];
    if (order === 'asc')  return av < bv ? -1 : av > bv ? 1 : 0;
    return av > bv ? -1 : av < bv ? 1 : 0;
  });

  const total = list.length;
  const pages = Math.ceil(total / limit);
  const data  = list.slice((page - 1) * limit, page * limit);

  res.json({ data, total, pages, page: +page });
});

// POST /api/transactions
app.post('/api/transactions', auth, (req, res) => {
  const { type, amount, description, category, date, notes } = req.body;
  const errs = {};
  if (!type    || !['income','expense'].includes(type)) errs.type   = 'Type must be income or expense.';
  if (!amount  || isNaN(amount) || +amount <= 0)        errs.amount = 'Enter a valid positive amount.';
  if (!description?.trim())  errs.description = 'Description is required.';
  if (!category?.trim())     errs.category    = 'Category is required.';
  if (!date)                 errs.date        = 'Date is required.';
  if (Object.keys(errs).length) return res.status(422).json({ errors: errs });

  const tx = {
    id:          uuidv4(),
    user_id:     req.user.id,
    type,
    amount:      parseFloat((+amount).toFixed(2)),
    description: description.trim(),
    category:    category.trim(),
    date,
    notes:       notes?.trim() || '',
    created_at:  new Date().toISOString(),
  };
  const db = req.db;
  db.transactions.push(tx);
  writeDB(db);
  if (tx.type === 'expense' && tx.amount >= 5000) {
    pushNotification(db, req.user.id, 'large_expense', `Large expense recorded: ${tx.description} — ₹${tx.amount}`);
  }
  res.status(201).json({ data: tx });
});

// PUT /api/transactions/:id
app.put('/api/transactions/:id', auth, (req, res) => {
  const db  = req.db;
  const idx = db.transactions.findIndex(t => t.id === req.params.id && t.user_id === req.user.id);
  if (idx === -1) return res.status(404).json({ message: 'Transaction not found.' });

  const { type, amount, description, category, date, notes } = req.body;
  db.transactions[idx] = {
    ...db.transactions[idx],
    ...(type        && { type }),
    ...(amount      && { amount: parseFloat((+amount).toFixed(2)) }),
    ...(description && { description: description.trim() }),
    ...(category    && { category: category.trim() }),
    ...(date        && { date }),
    notes: notes?.trim() ?? db.transactions[idx].notes,
    updated_at: new Date().toISOString(),
  };
  writeDB(db);
  res.json({ data: db.transactions[idx] });
});

// DELETE /api/transactions/:id
app.delete('/api/transactions/:id', auth, (req, res) => {
  const db  = req.db;
  const idx = db.transactions.findIndex(t => t.id === req.params.id && t.user_id === req.user.id);
  if (idx === -1) return res.status(404).json({ message: 'Transaction not found.' });
  db.transactions.splice(idx, 1);
  writeDB(db);
  res.json({ message: 'Deleted.' });
});
// POST /api/transactions/:id/receipt
app.post('/api/transactions/:id/receipt', auth, upload.single('receipt'), (req, res) => {
  const db  = req.db;
  const idx = db.transactions.findIndex(t => t.id === req.params.id && t.user_id === req.user.id);
  if (idx === -1) return res.status(404).json({ message: 'Transaction not found.' });
  if (!req.file) return res.status(422).json({ message: 'No file uploaded.' });

  db.transactions[idx].receipt_url = `/uploads/${req.file.filename}`;
  writeDB(db);
  res.json({ data: db.transactions[idx] });
});

// DELETE /api/transactions/:id/receipt
app.delete('/api/transactions/:id/receipt', auth, (req, res) => {
  const db  = req.db;
  const idx = db.transactions.findIndex(t => t.id === req.params.id && t.user_id === req.user.id);
  if (idx === -1) return res.status(404).json({ message: 'Transaction not found.' });

  if (db.transactions[idx].receipt_url) {
    const filePath = path.join(UPLOAD_DIR, path.basename(db.transactions[idx].receipt_url));
    fs.existsSync(filePath) && fs.unlinkSync(filePath);
  }
  db.transactions[idx].receipt_url = null;
  writeDB(db);
  res.json({ data: db.transactions[idx] });
});

// ════════════════════════════════════════
//  SUMMARY / REPORTS
// ════════════════════════════════════════

// GET /api/summary
app.get('/api/summary', auth, (req, res) => {
  const all = req.db.transactions.filter(t => t.user_id === req.user.id);

  const totalIncome  = all.filter(t => t.type === 'income') .reduce((s, t) => s + t.amount, 0);
  const totalExpense = all.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance      = totalIncome - totalExpense;

  // Monthly data — last 6 months
  const now         = new Date();
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym    = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    const inc   = all.filter(t => t.type === 'income'  && t.date.startsWith(ym)).reduce((s, t) => s + t.amount, 0);
    const exp   = all.filter(t => t.type === 'expense' && t.date.startsWith(ym)).reduce((s, t) => s + t.amount, 0);
    monthlyData.push({ label, income: inc, expense: exp });
  }

  // Expense by category (top 6)
  const catMap = {};
  all.filter(t => t.type === 'expense').forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
  });
  const byCategory = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, amount]) => ({ name, amount }));

  // Recent 5 transactions
  const recent = [...all]
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  // This month stats
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthIncome  = all.filter(t => t.type === 'income'  && t.date.startsWith(thisMonth)).reduce((s, t) => s + t.amount, 0);
  const monthExpense = all.filter(t => t.type === 'expense' && t.date.startsWith(thisMonth)).reduce((s, t) => s + t.amount, 0);

  res.json({ totalIncome, totalExpense, balance, monthlyData, byCategory, recent, monthIncome, monthExpense });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message?.includes('images allowed')) {
    return res.status(422).json({ message: err.message });
  }
  next(err);
});
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

app.listen(PORT, () => {
  console.log(`\n🚀  Expense Tracker API → http://localhost:${PORT}\n`);
});
// ════════════════════════════════════════
//  NOTIFICATIONS
// ════════════════════════════════════════

const pushNotification = (db, user_id, type, message) => {
  db.notifications.push({
    id: uuidv4(), user_id, type, message,
    read: false, created_at: new Date().toISOString(),
  });
};

// GET /api/notifications
app.get('/api/notifications', auth, (req, res) => {
  const list = req.db.notifications
    .filter(n => n.user_id === req.user.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 30);
  res.json({ data: list, unread: list.filter(n => !n.read).length });
});

// PUT /api/notifications/:id/read
app.put('/api/notifications/:id/read', auth, (req, res) => {
  const db  = req.db;
  const n = db.notifications.find(x => x.id === req.params.id && x.user_id === req.user.id);
  if (!n) return res.status(404).json({ message: 'Not found.' });
  n.read = true;
  writeDB(db);
  res.json({ data: n });
});

// PUT /api/notifications/read-all
app.put('/api/notifications/read-all', auth, (req, res) => {
  const db = req.db;
  db.notifications.forEach(n => { if (n.user_id === req.user.id) n.read = true; });
  writeDB(db);
  res.json({ message: 'All marked read.' });
});