import { createContext, useState, useCallback, type ReactNode } from 'react';

interface HeaderState {
  backTo: string | null;
  title?: string;
}

interface HeaderContextType {
  state: HeaderState;
  setBack: (url: string | null, title?: string) => void;
}

export const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HeaderState>({ backTo: null });

  const setBack = useCallback((backTo: string | null, title?: string) => {
    setState({ backTo, title });
  }, []);

  return (
    <HeaderContext.Provider value={{ state, setBack }}>
      {children}
    </HeaderContext.Provider>
  );
}
