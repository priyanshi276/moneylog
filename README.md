# 💰 ExpenseTrack — Full Stack Expense Tracker

A complete personal finance web app built with **React.js + Node.js + Express.js**.
No database server required — data is stored in a JSON file on the backend.

---

## 📸 Features

- **Dashboard** — Net balance, income/expense summary cards, 6-month bar chart, category donut chart, recent transactions
- **Transactions** — Full paginated list with search, filter by type/date range, sort by any column
- **Add / Edit / Delete** — Modal form for managing transactions (income & expense)
- **Authentication** — JWT-based login & registration with secure password hashing
- **Responsive** — Works on desktop and mobile

---

## 🏗️ Tech Stack

| Layer     | Technology                |
|-----------|---------------------------|
| Frontend  | React 18, React Router 6  |
| Backend   | Node.js, Express.js       |
| Auth      | JSON Web Tokens + bcryptjs|
| Storage   | JSON file (no DB needed!) |
| Styling   | Pure CSS (custom design)  |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- Two terminal windows

---

### Step 1 — Start the Backend

```bash
cd backend
npm install
npm run dev
```

The API will be running at: **http://localhost:5000**

---

### Step 2 — Start the Frontend

```bash
cd frontend
npm install
npm start
```

The app will open at: **http://localhost:3000**

---

## 📁 Project Structure

```
expense-tracker/
│
├── backend/
│   ├── server.js         ← Express API (all routes in one file)
│   ├── db.json           ← JSON file database (auto-managed)
│   ├── .env              ← Environment variables
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js                        ← Router + protected routes
│       ├── index.css                     ← Global styles
│       ├── context/AuthContext.js        ← Auth state (JWT)
│       ├── utils/api.js                  ← Axios instance
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── Dashboard.jsx             ← Charts + summary
│       │   └── Transactions.jsx          ← Full list + CRUD
│       └── components/
│           ├── Layout.jsx                ← Sidebar + topbar
│           └── TransactionModal.jsx      ← Add/Edit form
│
└── README.md
```

---

## 🔑 API Reference

### Auth
| Method | Endpoint             | Description        |
|--------|----------------------|--------------------|
| POST   | `/api/auth/register` | Create account     |
| POST   | `/api/auth/login`    | Login → JWT token  |
| GET    | `/api/auth/me`       | Get current user   |

### Transactions
| Method | Endpoint                    | Description            |
|--------|-----------------------------|------------------------|
| GET    | `/api/transactions`         | List (filter/sort/page)|
| POST   | `/api/transactions`         | Create transaction     |
| PUT    | `/api/transactions/:id`     | Update transaction     |
| DELETE | `/api/transactions/:id`     | Delete transaction     |

### Reports
| Method | Endpoint       | Description                        |
|--------|----------------|------------------------------------|
| GET    | `/api/summary` | Dashboard totals, charts, recent   |

---

## ⚙️ Configuration

### Backend `.env`
```env
PORT=5000
JWT_SECRET=your_strong_secret_here
JWT_EXPIRES_IN=604800        # 7 days in seconds
FRONTEND_URL=http://localhost:3000
```

### Frontend proxy
The `frontend/package.json` has `"proxy": "http://localhost:5000"` so API calls work in development.
For production, set `REACT_APP_API_URL=https://your-api-domain.com/api` in a `.env` file in the frontend folder.

---

## 🎨 Categories

**Income:** Salary, Freelance, Business, Investment, Gift, Refund, Bonus, Other Income

**Expense:** Food & Dining, Transportation, Shopping, Entertainment, Bills & Utilities,
Healthcare, Education, Travel, Groceries, Rent, Insurance, Subscriptions, Other Expense

---

## 🗄️ Data Storage

All data is stored in `backend/db.json`. This file is:
- Created automatically when the server first starts
- Updated on every transaction
- Backed up by simply copying the file

To reset all data: delete `backend/db.json` and restart the server.

---

## 🔒 Security Notes

- Passwords are hashed with **bcryptjs** (10 rounds)
- JWT tokens expire after 7 days
- Each user can only access their own transactions
- Change the `JWT_SECRET` in `.env` before deploying to production
