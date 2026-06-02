import { useEffect, useState } from "react";
import { List, Tag, InfiniteScroll, PullToRefresh, DotLoading } from "antd-mobile";
import api from "../api";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);

  const fetch = async () => {
    const employee = JSON.parse(localStorage.getItem("employee") || "{}");
    if (!employee.id) return;
    const res = await api.get("/api/sessions", {
      params: { employee_id: employee.id },
    });
    setSessions(res.data);
  };

  useEffect(() => { fetch(); }, []);

  return (
    <PullToRefresh onRefresh={fetch}>
      <List header="Мои сессии">
        {sessions.length === 0 && (
          <List.Item>
            <span style={{ color: "#999" }}>Нет сессий</span>
          </List.Item>
        )}
        {sessions.map((s: any) => (
          <List.Item
            key={s.id}
            description={
              <span style={{ fontSize: 12 }}>
                Начало: {s.clock_in ? new Date(s.clock_in).toLocaleString("ru-RU") : "-"}
                <br />
                Конец: {s.clock_out ? new Date(s.clock_out).toLocaleString("ru-RU") : "-"}
              </span>
            }
          >
            <span>
              {s.date}{" "}
              <Tag color={s.status === "working" ? "success" : "default"}>
                {s.status === "working" ? "Работает" : "Завершена"}
              </Tag>
            </span>
          </List.Item>
        ))}
      </List>
    </PullToRefresh>
  );
}
