import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, Toast, Card } from "antd-mobile";
import api from "../api";

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: { employee_id: string; pin_code: string }) => {
    setLoading(true);
    try {
      const res = await api.post("/api/auth/employee-login", {
        employee_id: Number(values.employee_id),
        pin_code: values.pin_code,
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("employee", JSON.stringify(res.data.employee));
      Toast.show({ content: "Успешный вход", position: "top" });
      navigate("/sessions");
    } catch {
      Toast.show({ content: "Неверные данные", position: "top" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, marginTop: 80 }}>
      <Card>
        <h2 style={{ textAlign: "center" }}>WorkTime</h2>
        <Form onFinish={handleLogin} layout="horizontal">
          <Form.Item
            name="employee_id"
            label="ID"
            rules={[{ required: true, message: "Введите ID" }]}
          >
            <Input type="number" placeholder="Ваш ID" />
          </Form.Item>
          <Form.Item
            name="pin_code"
            label="PIN"
            rules={[{ required: true, message: "Введите PIN" }]}
          >
            <Input type="password" placeholder="****" maxLength={6} />
          </Form.Item>
          <Button block type="submit" color="primary" loading={loading} size="large">
            Войти
          </Button>
        </Form>
      </Card>
    </div>
  );
}
