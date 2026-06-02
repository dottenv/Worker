import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { TabBar, NavBar, SafeArea } from "antd-mobile";
import {
  UnorderedListOutline,
  ClockCircleOutline,
  UserOutline,
} from "antd-mobile-icons";
import { useNavigate, useLocation } from "react-router-dom";
import api from "./api";
import LoginPage from "./pages/LoginPage";
import SessionsPage from "./pages/SessionsPage";
import ProfilePage from "./pages/ProfilePage";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
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
        <Routes>
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/clock" element={<div />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </div>
      <SafeArea position="bottom" />
      <TabBar
        activeKey={path}
        onChange={(key) => navigate(key)}
      >
        {tabs.map((t) => (
          <TabBar.Item key={t.key} icon={t.icon} title={t.title} />
        ))}
      </TabBar>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
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
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <PrivateRoute>
            <MainTabs />
          </PrivateRoute>
        }
      >
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}
