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

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());

// ── DB helpers ────────────────────────────────────────────────────────────────
const readDB  = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
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
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

app.listen(PORT, () => {
  console.log(`\n🚀  Expense Tracker API → http://localhost:${PORT}\n`);
});
