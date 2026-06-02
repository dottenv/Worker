import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "./api";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import WarehousesPage from "./pages/WarehousesPage";
import EmployeesPage from "./pages/EmployeesPage";
import SessionsPage from "./pages/SessionsPage";
import AppLayout from "./components/AppLayout";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/api/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={setUser} />} />
      <Route
        element={
          <PrivateRoute>
            <AppLayout user={user} onLogout={() => { setUser(null); localStorage.removeItem("token"); }} />
          </PrivateRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/warehouses" element={<WarehousesPage />} />
        <Route path="/warehouses/:id/employees" element={<EmployeesPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
      </Route>
    </Routes>
  );
}
