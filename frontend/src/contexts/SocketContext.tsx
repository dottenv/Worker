import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketCtx = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const connectedRef = useRef(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        connectedRef.current = false;
      }
      return;
    }

    if (socketRef.current?.connected) return;

    const s = io(window.location.origin, {
      path: '/socket.io',
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      timeout: 20000,
    });

    socketRef.current = s;
    s.on("connect", () => { setSocket(s); connectedRef.current = true; });
    s.on("disconnect", () => { connectedRef.current = false; });
    s.on("connect_error", () => { connectedRef.current = false; });
  }, [token]);

  return (
    <SocketCtx.Provider value={socket}>
      {children}
    </SocketCtx.Provider>
  );
}

export function useSocket() {
  return useContext(SocketCtx);
}

export function useSocketEvent(event: string, handler: (...args: any[]) => void) {
  const socket = useSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket) return;
    const wrapped = (...args: any[]) => handlerRef.current(...args);
    socket.on(event, wrapped);
    return () => { socket.off(event, wrapped); };
  }, [socket, event]);
}
