import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import AdminLayout from './components/layout/AdminLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import HomePage from './pages/HomePage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import BookPage from './pages/BookPage.jsx';
import AdminLoginPage from './pages/AdminLoginPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import AdminProfessionalsPage from './pages/AdminProfessionalsPage.jsx';
import AdminProfessionalDetailPage from './pages/AdminProfessionalDetailPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<Layout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="professionals" element={<AdminProfessionalsPage />} />
        <Route path="professionals/:id" element={<AdminProfessionalDetailPage />} />
      </Route>

      <Route path="/reservar/:slug" element={<BookPage />} />
      <Route path="/:slug" element={<BookPage />} />
    </Routes>
  );
}