import { useEffect, useRef, useCallback, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getSocketUrl } from '../api/client';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const url = getSocketUrl();
    const s = io(url, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    setSocket(s);
    s.on('connect', () => mounted.current && setConnected(true));
    s.on('disconnect', () => mounted.current && setConnected(false));
    return () => {
      mounted.current = false;
      s.close();
      setSocket(null);
      setConnected(false);
    };
  }, []);

  const emit = useCallback(
    <T>(event: string, data?: T) => {
      socket?.emit(event, data);
    },
    [socket],
  );

  return { socket, connected, emit };
}
