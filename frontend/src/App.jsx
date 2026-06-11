import { Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout.jsx';
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
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminLayout from './components/layout/AdminLayout.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminProfessionals from './pages/admin/AdminProfessionals.jsx';
import AdminProfessionalDetail from './pages/admin/AdminProfessionalDetail.jsx';

export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Panel profesional (requiere auth) */}
      <Route path="/dashboard" element={<Layout />}>
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
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="professionals" element={<AdminProfessionals />} />
        <Route path="professionals/:id" element={<AdminProfessionalDetail />} />
      </Route>

      {/* Booking público (sin auth) */}
      <Route path="/:slug" element={<Booking />} />
    </Routes>
  );
}