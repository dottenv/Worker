import { useLayoutEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { HeaderProvider } from './contexts/HeaderContext';
import { useHeader } from './contexts/useHeader';
import { PushProvider } from './contexts/PushContext';
import { SocketProvider } from './contexts/SocketContext';
import { DataProvider, useData } from './contexts/DataContext';
import { CenterProvider } from './contexts/CenterContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CentersList from './pages/CentersList';
import CenterDetail from './pages/CenterDetail';
import SettingsIndex from './pages/SettingsIndex';
import SettingsProfile from './pages/SettingsProfile';
import SettingsApp from './pages/SettingsApp';
import SettingsNavigation from './pages/SettingsNavigation';
import SettingsNotifications from './pages/SettingsNotifications';
import EmployeeCard from './pages/EmployeeCard';
import MySchedule from './pages/MySchedule';
import AdminSchedule from './pages/AdminSchedule';
import SwapList from './pages/SwapList';
import SwapDetail from './pages/SwapDetail';
import SwapNew from './pages/SwapNew';
import UserProfile from './pages/UserProfile';
import Notifications from './pages/Notifications';
import Finance from './pages/Finance';
import FinanceAdmin from './pages/FinanceAdmin';
import TimeRequests from './pages/TimeRequests';
import ShiftManager from './pages/ShiftManager';
import ShiftDocuments from './pages/ShiftDocuments';
import ShiftDocumentsList from './pages/ShiftDocumentsList';
import CustomFieldManager from './pages/CustomFieldManager';
import Purchases from './pages/Purchases';
import PurchasesAdmin from './pages/PurchasesAdmin';
import Modules from './pages/Modules';
import LoadingSpinner from './components/LoadingSpinner';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="text-center py-8 text-gray-400">Загрузка...</div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function HeaderSync() {
  const { setBack } = useHeader();
  const path = useLocation().pathname;

  useLayoutEffect(() => {
    if (path === '/centers/new') {
      setBack('/centers', 'Склады');
    } else if (/^\/centers\/\d+$/.test(path)) {
      setBack('/centers', 'Склады');
    } else if (/^\/centers\/\d+\/employees\/\d+$/.test(path)) {
      const scId = path.split('/')[2];
      setBack(`/centers/${scId}`, 'Склады');
    } else if (/^\/centers\/\d+\/shifts$/.test(path)) {
      const scId = path.split('/')[2];
      setBack(`/centers/${scId}`, 'Склады');
    } else if (path === '/swaps') {
      setBack(null);
    } else if (path === '/swaps/new') {
      setBack('/swaps', 'Обмен');
    } else if (/^\/swaps\/\d+$/.test(path)) {
      setBack('/swaps', 'Обмен');
    } else if (path === '/schedule/admin') {
      setBack('/schedule', 'График');
    } else if (path === '/settings') {
      setBack(null);
    } else if (path === '/settings/modules') {
      setBack('/settings', 'Настройки');
    } else if (path.startsWith('/settings/')) {
      setBack('/settings', 'Настройки');
    } else if (path === '/time-requests') {
      setBack('/');
    } else if (/^\/profile\/\d+$/.test(path)) {
      setBack('/');
    } else if (path === '/purchases') {
      setBack(null);
    } else if (path === '/purchases/admin') {
      setBack('/purchases', 'Закупки');
    } else if (path === '/shift-documents') {
      setBack(null);
    } else if (/^\/shift-documents\/\d+$/.test(path)) {
      setBack('/shift-documents', 'Документы смен');
    } else if (/^\/centers\/\d+\/custom-fields$/.test(path)) {
      const scId = path.split('/')[2];
      setBack(`/centers/${scId}`, 'Центры');
    } else {
      setBack(null);
    }
  }, [path]);

  return null;
}

function AppShell() {
  const { loaded } = useData();
  if (!loaded) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
        </div>
      </div>
    );
  }
  return <Layout />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <SocketProvider>
            <PushProvider>
            <CenterProvider>
            <NotificationProvider>
            <DataProvider>
              <HeaderProvider>
                <HeaderSync />
                <AppShell />
              </HeaderProvider>
            </DataProvider>
            </NotificationProvider>
            </CenterProvider>
            </PushProvider>
            </SocketProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="centers" element={<CentersList />} />
        <Route path="centers/new" element={<CentersList />} />
        <Route path="centers/:id" element={<CenterDetail />} />
        <Route path="centers/:scId/employees/:memberId" element={<EmployeeCard />} />
        <Route path="centers/:scId/shifts" element={<ShiftManager />} />
        <Route path="schedule" element={<MySchedule />} />
        <Route path="schedule/admin" element={<AdminSchedule />} />
        <Route path="swaps" element={<SwapList />} />
        <Route path="swaps/new" element={<SwapNew />} />
        <Route path="swaps/:id" element={<SwapDetail />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="finance" element={<Finance />} />
        <Route path="finance/admin" element={<FinanceAdmin />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="purchases/admin" element={<PurchasesAdmin />} />
        <Route path="time-requests" element={<TimeRequests />} />
        <Route path="shift-documents" element={<ShiftDocumentsList />} />
        <Route path="shift-documents/:entryId" element={<ShiftDocuments />} />
        <Route path="centers/:scId/custom-fields" element={<CustomFieldManager />} />
        <Route path="settings" element={<SettingsIndex />} />
        <Route path="settings/profile" element={<SettingsProfile />} />
        <Route path="settings/app" element={<SettingsApp />} />
        <Route path="settings/navigation" element={<SettingsNavigation />} />
        <Route path="settings/modules" element={<Modules />} />
        <Route path="settings/notifications" element={<SettingsNotifications />} />
        <Route path="profile/:userId" element={<UserProfile />} />
  
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
