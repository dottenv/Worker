import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";

interface DataContextType {
  loaded: boolean;
  centers: any[];
  swaps: any[];
  schedule: any[];
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextType>({
  loaded: false,
  centers: [],
  swaps: [],
  schedule: [],
  refresh: async () => {},
});

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, isOwner } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [centers, setCenters] = useState<any[]>([]);
  const [swaps, setSwaps] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);

  const refresh = async () => {
    if (!user) return;
    try {
      const [cs, sw, sc] = await Promise.all([
        api.serviceCenters.list().catch(() => []),
        (isOwner ? api.swaps.admin() : api.swaps.list()).catch(() => []),
        (() => {
          const scId = Number(localStorage.getItem("activeCenterId"));
          if (scId) {
            return api.schedule.admin({ service_center_id: scId }).catch(() => []);
          }
          return [];
        })(),
      ]);
      setCenters(cs);
      setSwaps(sw);
      setSchedule(sc);
    } catch {
      // ignore
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    setLoaded(false);
    if (user) refresh();
    else setLoaded(true);
  }, [user, isOwner]);

  return (
    <DataContext.Provider value={{ loaded, centers, swaps, schedule, refresh }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
