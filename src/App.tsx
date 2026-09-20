import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { AppShell } from './components/layout/AppShell';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { Batches } from './pages/Batches';
import { Cards } from './pages/Cards';
import { CardDetails } from './pages/CardDetails';
import { QRGenerator } from './pages/QRGenerator';
import { Scanner } from './pages/Scanner';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { TestCardView } from './pages/TestCardView';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Phase 1 Test Dynamic URL Card Route */}
            <Route path="/c/:publicToken" element={<TestCardView />} />

            {/* Public Login */}
            <Route path="/login" element={<Login />} />

            {/* Authenticated CRM Shell */}
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/batches" element={<Batches />} />
              <Route path="/cards" element={<Cards />} />
              <Route path="/cards/:id" element={<CardDetails />} />
              <Route path="/qr-generator" element={<QRGenerator />} />
              <Route path="/scanner" element={<Scanner />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
              {/* Default fallback route redirects to /dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
