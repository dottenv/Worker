import { Layout, Menu, Button, Typography } from "antd";
import {
  DashboardOutlined,
  ShopOutlined,
  ClockCircleOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";

const { Header, Sider, Content } = Layout;

export default function AppLayout({
  user,
  onLogout,
}: {
  user: any;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: "/", icon: <DashboardOutlined />, label: "Дашборд" },
    { key: "/warehouses", icon: <ShopOutlined />, label: "Склады" },
    { key: "/sessions", icon: <ClockCircleOutlined />, label: "Сессии" },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider collapsible>
        <div style={{ padding: 16, color: "#fff", fontSize: 18, fontWeight: "bold" }}>
          WorkTime
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography.Text>{user?.company_name || user?.username}</Typography.Text>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={onLogout}
          >
            Выйти
          </Button>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
