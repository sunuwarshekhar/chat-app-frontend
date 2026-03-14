import { useEffect, useCallback, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getSocketUrl } from '../api/client';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const url = getSocketUrl();
    const s = io(url, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(s);

    // If it connects immediately / from cache
    if (s.connected) {
      setConnected(true);
    }

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));

    return () => {
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
