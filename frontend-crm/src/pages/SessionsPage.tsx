import { Table, DatePicker, Select, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import api from "../api";

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [warehouseId, setWarehouseId] = useState<number | undefined>();

  const fetch = () => {
    const params: any = { date };
    if (warehouseId) params.warehouse_id = warehouseId;
    api.get("/api/sessions", { params }).then((r) => setSessions(r.data));
  };

  useEffect(() => {
    api.get("/api/warehouses").then((r) => setWarehouses(r.data));
  }, []);

  useEffect(() => { fetch(); }, [date, warehouseId]);

  const columns = [
    { title: "Сотрудник", dataIndex: "employee_id", key: "employee_id" },
    { title: "Начало", dataIndex: "clock_in", key: "clock_in" },
    { title: "Конец", dataIndex: "clock_out", key: "clock_out" },
    { title: "Длительность", dataIndex: "duration", key: "duration" },
    {
      title: "Статус",
      dataIndex: "status",
      key: "status",
      render: (v: string) => (
        <span style={{ color: v === "working" ? "green" : "default" }}>
          {v === "working" ? "Работает" : "Завершена"}
        </span>
      ),
    },
    { title: "Заметка", dataIndex: "note", key: "note" },
  ];

  return (
    <>
      <Typography.Title level={4}>Сессии</Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <DatePicker
          value={date ? undefined : undefined}
          onChange={(_, d) => setDate(d || new Date().toISOString().split("T")[0])}
        />
        <Select
          placeholder="Все склады"
          allowClear
          style={{ width: 200 }}
          onChange={(v) => setWarehouseId(v)}
          options={warehouses.map((w: any) => ({ label: w.name, value: w.id }))}
        />
      </Space>
      <Table dataSource={sessions} columns={columns} rowKey="id" />
    </>
  );
}
