import { Table, Button, Modal, Form, Input, message, Space, Popconfirm } from "antd";
import { PlusOutlined, TeamOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetch = () => api.get("/api/warehouses").then((r) => setWarehouses(r.data));

  useEffect(() => { fetch(); }, []);

  const handleCreate = async (values: any) => {
    await api.post("/api/warehouses", values);
    message.success("Склад создан");
    setOpen(false);
    form.resetFields();
    fetch();
  };

  const handleDelete = async (id: number) => {
    await api.delete(`/api/warehouses/${id}`);
    message.success("Склад удалён");
    fetch();
  };

  const columns = [
    { title: "Название", dataIndex: "name", key: "name" },
    { title: "Адрес", dataIndex: "address", key: "address" },
    {
      title: "Действия",
      key: "actions",
      render: (_: any, record: any) => (
        <Space>
          <Button
            icon={<TeamOutlined />}
            onClick={() => navigate(`/warehouses/${record.id}/employees`)}
          >
            Сотрудники
          </Button>
          <Popconfirm title="Удалить склад?" onConfirm={() => handleDelete(record.id)}>
            <Button danger>Удалить</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16, justifyContent: "space-between", width: "100%" }}>
        <h3>Склады</h3>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Добавить склад
        </Button>
      </Space>
      <Table dataSource={warehouses} columns={columns} rowKey="id" />
      <Modal
        title="Новый склад"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Адрес">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
