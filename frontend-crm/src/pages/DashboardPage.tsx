import { Card, Row, Col, Typography, Statistic } from "antd";
import { useEffect, useState } from "react";
import api from "../api";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    warehouses: 0,
    employees: 0,
    activeSessions: 0,
  });

  useEffect(() => {
    Promise.all([
      api.get("/api/warehouses"),
      api.get("/api/employees?active_only=true"),
      api.get("/api/sessions?date=" + new Date().toISOString().split("T")[0]),
    ]).then(([wh, emp, sess]) => {
      setStats({
        warehouses: wh.data.length,
        employees: emp.data.length,
        activeSessions: sess.data.filter((s: any) => s.status === "working").length,
      });
    });
  }, []);

  return (
    <>
      <Typography.Title level={4}>Дашборд</Typography.Title>
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic title="Склады" value={stats.warehouses} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Активные сотрудники" value={stats.employees} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Сегодня работают" value={stats.activeSessions} />
          </Card>
        </Col>
      </Row>
    </>
  );
}
