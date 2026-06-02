import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation, Outlet } from "react-router-dom";
import { TabBar, NavBar, SafeArea } from "antd-mobile";
import {
  UnorderedListOutline,
  ClockCircleOutline,
  UserOutline,
} from "antd-mobile-icons";
import api from "./api";
import LoginPage from "./pages/LoginPage";
import SessionsPage from "./pages/SessionsPage";
import ProfilePage from "./pages/ProfilePage";

function PrivateRoute() {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function MainTabs() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const tabs = [
    { key: "/sessions", title: "Сессии", icon: <UnorderedListOutline /> },
    { key: "/clock", title: "Таймер", icon: <ClockCircleOutline /> },
    { key: "/profile", title: "Профиль", icon: <UserOutline /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <NavBar>WorkTime</NavBar>
      <div style={{ flex: 1, overflow: "auto" }}>
        <Outlet />
      </div>
      <SafeArea position="bottom" />
      <TabBar activeKey={path} onChange={(key) => navigate(key)}>
        {tabs.map((t) => (
          <TabBar.Item key={t.key} icon={t.icon} title={t.title} />
        ))}
      </TabBar>
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/api/auth/me")
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<PrivateRoute />}>
        <Route element={<MainTabs />}>
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/clock" element={<div />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
    </Routes>
  );
}
