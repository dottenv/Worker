import { Table, Button, Modal, Form, Input, message, Space, Popconfirm, Tag } from "antd";
import { PlusOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";

export default function EmployeesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const fetch = () =>
    api.get(`/api/employees?warehouse_id=${id}`).then((r) => setEmployees(r.data));

  useEffect(() => { fetch(); }, [id]);

  const handleCreate = async (values: any) => {
    await api.post("/api/employees", { ...values, warehouse_id: Number(id) });
    message.success("Сотрудник добавлен");
    setOpen(false);
    form.resetFields();
    fetch();
  };

  const handleToggle = async (employee: any) => {
    await api.put(`/api/employees/${employee.id}`, {
      is_active: !employee.is_active,
    });
    fetch();
  };

  const columns = [
    { title: "Имя", key: "name", render: (_: any, r: any) => `${r.first_name} ${r.last_name}` },
    { title: "Должность", dataIndex: "position", key: "position" },
    { title: "Телефон", dataIndex: "phone", key: "phone" },
    { title: "Email", dataIndex: "email", key: "email" },
    {
      title: "Статус",
      dataIndex: "is_active",
      key: "is_active",
      render: (v: boolean) => (
        <Tag color={v ? "green" : "red"}>{v ? "Активен" : "Неактивен"}</Tag>
      ),
    },
    {
      title: "Действия",
      key: "actions",
      render: (_: any, record: any) => (
        <Button onClick={() => handleToggle(record)}>
          {record.is_active ? "Деактивировать" : "Активировать"}
        </Button>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/warehouses")}>
          Назад
        </Button>
        <h3 style={{ margin: 0 }}>Сотрудники склада</h3>
      </Space>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => setOpen(true)}
        style={{ marginBottom: 16 }}
      >
        Добавить сотрудника
      </Button>
      <Table dataSource={employees} columns={columns} rowKey="id" />
      <Modal
        title="Новый сотрудник"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="first_name" label="Имя" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="last_name" label="Фамилия" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="position" label="Должность">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Телефон">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input />
          </Form.Item>
          <Form.Item name="pin_code" label="PIN-код" rules={[{ required: true, min: 4, max: 6 }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
