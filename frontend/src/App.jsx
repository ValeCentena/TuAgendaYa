import { Routes, Route, Navigate } from 'react-router-dom';

import DashboardLayout from './components/layout/DashboardLayout.jsx';
import AdminLayout from './components/layout/AdminLayout.jsx';
import Login from './pages/Login.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Agenda from './pages/Agenda.jsx';
import Clientes from './pages/Clientes.jsx';
import Estadisticas from './pages/Estadisticas.jsx';
import Configuracion from './pages/Configuracion.jsx';
import Booking from './pages/Booking.jsx';
import TokenAction from './pages/TokenAction.jsx';
import AdminLoginPage from './pages/AdminLoginPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import AdminProfessionalsPage from './pages/AdminProfessionalsPage.jsx';
import AdminProfessionalDetailPage from './pages/AdminProfessionalDetailPage.jsx';

export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Panel profesional (requiere auth) */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="estadisticas" element={<Estadisticas />} />
        <Route path="configuracion" element={<Configuracion />} />
      </Route>

      {/* Acciones por token (clientes, sin auth) */}
      <Route path="/turno/:token/confirmar" element={<TokenAction />} />
      <Route path="/turno/:token/cancelar" element={<TokenAction />} />

      {/* Panel admin */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="professionals" element={<AdminProfessionalsPage />} />
        <Route path="professionals/:id" element={<AdminProfessionalDetailPage />} />
      </Route>

      {/* Booking público (sin auth) */}
      <Route path="/:slug" element={<Booking />} />
    </Routes>
  );
}