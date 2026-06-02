import { Form, Input, Button, Card, message, Typography, Tabs } from "antd";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function LoginPage({
  onLogin,
}: {
  onLogin: (user: any) => void;
}) {
  const navigate = useNavigate();

  const handleLogin = async (values: any) => {
    try {
      const res = await api.post("/api/auth/login", values);
      localStorage.setItem("token", res.data.token);
      onLogin(res.data.user);
      navigate("/");
    } catch {
      message.error("Неверный email или пароль");
    }
  };

  const handleRegister = async (values: any) => {
    try {
      const res = await api.post("/api/auth/register", values);
      localStorage.setItem("token", res.data.token);
      onLogin(res.data.user);
      navigate("/");
    } catch (err: any) {
      message.error(err.response?.data?.error || "Ошибка регистрации");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f0f2f5",
      }}
    >
      <Card style={{ width: 400 }}>
        <Typography.Title level={3} style={{ textAlign: "center" }}>
          WorkTime CRM
        </Typography.Title>
        <Tabs
          centered
          items={[
            {
              key: "login",
              label: "Вход",
              children: (
                <Form onFinish={handleLogin} layout="vertical">
                  <Form.Item name="email" label="Email" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    label="Пароль"
                    rules={[{ required: true }]}
                  >
                    <Input.Password />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" block>
                    Войти
                  </Button>
                </Form>
              ),
            },
            {
              key: "register",
              label: "Регистрация",
              children: (
                <Form onFinish={handleRegister} layout="vertical">
                  <Form.Item name="username" label="Имя пользователя" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="email" label="Email" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="company_name" label="Название компании">
                    <Input />
                  </Form.Item>
                  <Form.Item name="password" label="Пароль" rules={[{ required: true, min: 6 }]}>
                    <Input.Password />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" block>
                    Зарегистрироваться
                  </Button>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
