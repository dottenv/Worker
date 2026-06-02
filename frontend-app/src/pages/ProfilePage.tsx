import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { List, Button, Toast } from "antd-mobile";
import api from "../api";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<any>(null);

  useEffect(() => {
    const emp = localStorage.getItem("employee");
    if (emp) setEmployee(JSON.parse(emp));
  }, []);

  const handleClockIn = async () => {
    try {
      await api.post("/api/sessions/clock-in", {
        employee_id: employee?.id,
      });
      Toast.show({ content: "Начало смены", position: "top" });
    } catch {
      Toast.show({ content: "Уже начато", position: "top" });
    }
  };

  const handleClockOut = async () => {
    try {
      await api.post("/api/sessions/clock-out", {
        employee_id: employee?.id,
      });
      Toast.show({ content: "Смена завершена", position: "top" });
    } catch {
      Toast.show({ content: "Нет активной смены", position: "top" });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("employee");
    navigate("/login");
  };

  return (
    <div style={{ padding: 16 }}>
      <List header="Профиль">
        <List.Item>
          {employee?.first_name} {employee?.last_name}
        </List.Item>
        <List.Item>{employee?.position}</List.Item>
      </List>
      <div style={{ display: "flex", gap: 12, margin: "24px 0" }}>
        <Button block color="primary" size="large" onClick={handleClockIn}>
          Начать смену
        </Button>
        <Button block color="danger" size="large" onClick={handleClockOut}>
          Завершить смену
        </Button>
      </div>
      <Button block onClick={handleLogout}>Выйти</Button>
    </div>
  );
}
