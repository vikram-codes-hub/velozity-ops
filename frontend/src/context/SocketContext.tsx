// frontend/src/context/SocketContext.tsx
//
// One Socket.io connection for the whole app, established once a user is
// authenticated and torn down on logout.

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getAccessToken } from '../lib/api';
import type { ActivityEvent, AppNotification } from '../types/domain';

export type { ActivityEvent };
export type { AppNotification as NotificationEvent };

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000';

interface SocketContextValue {
  isConnected: boolean;
  /** Admin presence count — null until the first presence:update arrives */
  onlineCount: number | null;
  joinProject: (projectId: string) => Promise<void>;
  leaveProject: (projectId: string) => void;
  subscribeToActivity: (handler: (event: ActivityEvent) => void) => () => void;
  subscribeToNotifications: (handler: (event: AppNotification) => void) => () => void;
  subscribeToUnreadCount: (handler: (count: number) => void) => () => void;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      // Logged out — tear down any existing connection.
      socketRef.current?.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setOnlineCount(null);
      return;
    }

    const token = getAccessToken();
    const socket = io(SOCKET_URL, {
      auth: { token },
      withCredentials: true,
    });

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('presence:update', (payload: { onlineCount: number }) => {
      setOnlineCount(payload.onlineCount);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // Re-connect if the user identity changes (e.g. different account
    // logs in without a full page reload in between).
  }, [user?.id]);

  // joinProject returns a Promise so callers (e.g. useProject hook) can
  // await the server's ack and set `isJoined` state accurately.
  const joinProject = useCallback((projectId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error('Socket not connected'));
        return;
      }
      socketRef.current.emit('project:join', projectId, (err?: string) => {
        if (err) {
          console.error(`Failed to join project room ${projectId}:`, err);
          reject(new Error(err));
        } else {
          resolve();
        }
      });
    });
  }, []);

  const leaveProject = useCallback((projectId: string) => {
    socketRef.current?.emit('project:leave', projectId);
  }, []);

  // Subscribe helpers return an unsubscribe function, so components can
  // wire them up in a useEffect and clean up correctly on unmount.
  const subscribeToActivity = useCallback(
    (handler: (event: ActivityEvent) => void) => {
      socketRef.current?.on('activity:new', handler);
      return () => {
        socketRef.current?.off('activity:new', handler);
      };
    },
    []
  );

  const subscribeToNotifications = useCallback(
    (handler: (event: AppNotification) => void) => {
      socketRef.current?.on('notification:new', handler);
      return () => {
        socketRef.current?.off('notification:new', handler);
      };
    },
    []
  );

  const subscribeToUnreadCount = useCallback(
    (handler: (count: number) => void) => {
      const wrapped = (payload: { count: number }) => handler(payload.count);
      socketRef.current?.on('notification:unread-count', wrapped);
      return () => {
        socketRef.current?.off('notification:unread-count', wrapped);
      };
    },
    []
  );

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        onlineCount,
        joinProject,
        leaveProject,
        subscribeToActivity,
        subscribeToNotifications,
        subscribeToUnreadCount,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used within a SocketProvider.');
  }
  return ctx;
}