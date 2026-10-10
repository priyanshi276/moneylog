import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout    from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Login     from './pages/Login';
import Register  from './pages/Register';
import { ThemeProvider } from './context/ThemeContext';
import Settings from './pages/Settings';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <span className="spinner" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const Public = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

// export default function App() {
//   return (
//     <AuthProvider>
//       <BrowserRouter>
//         <Routes>
//           <Route path="/login"    element={<Public><Login /></Public>} />
//           <Route path="/register" element={<Public><Register /></Public>} />
//           <Route path="/" element={<Protected><Layout /></Protected>}>
//             <Route index element={<Navigate to="/dashboard" replace />} />
//             <Route path="dashboard"    element={<Dashboard />} />
//             <Route path="transactions" element={<Transactions />} />
//           </Route>
//           <Route path="*" element={<Navigate to="/dashboard" replace />} />
//         </Routes>
//       </BrowserRouter>
//     </AuthProvider>
//   );
// }
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
              <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<Public><Login /></Public>} />
          <Route path="/register" element={<Public><Register /></Public>} />
          <Route path="/" element={<Protected><Layout /></Protected>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"    element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
          <Route path="/forgot-password" element={<Public><ForgotPassword /></Public>} />
          <Route path="/reset-password/:token" element={<Public><ResetPassword /></Public>} />
        </Routes>
      </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
