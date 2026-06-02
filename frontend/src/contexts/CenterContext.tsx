import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../api/client";

interface CenterContextType {
  centers: any[];
  activeCenterId: number | null;
  setActiveCenterId: (id: number) => void;
  activeCenter: any | null;
}

const CenterCtx = createContext<CenterContextType>({
  centers: [],
  activeCenterId: null,
  setActiveCenterId: () => {},
  activeCenter: null,
});

const STORAGE_KEY = "activeCenterId";

export function CenterProvider({ children }: { children: ReactNode }) {
  const [centers, setCenters] = useState<any[]>([]);
  const [activeCenterId, setActiveCenterIdState] = useState<number | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? Number(saved) : null;
  });

  useEffect(() => {
    api.serviceCenters.list().then((cs) => {
      setCenters(cs);
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && cs.find((c: any) => c.id === Number(saved))) {
        setActiveCenterIdState(Number(saved));
      } else if (cs.length > 0 && !saved) {
        setActiveCenterIdState(cs[0].id);
      }
    }).catch(() => setCenters([]));
  }, []);

  const setActiveCenterId = (id: number) => {
    setActiveCenterIdState(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  };

  const activeCenter = centers.find((c) => c.id === activeCenterId) || null;

  return (
    <CenterCtx.Provider value={{ centers, activeCenterId, setActiveCenterId, activeCenter }}>
      {children}
    </CenterCtx.Provider>
  );
}

export function useCenters() {
  return useContext(CenterCtx);
}
