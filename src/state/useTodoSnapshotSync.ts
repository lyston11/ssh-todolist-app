import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/client.ts';
import { realtimeSocket } from '../realtime/socket.ts';
import type { ConnectionStatus, SnapshotResponse } from '../types/api.ts';

const NOOP_MESSAGE_HANDLER = () => {};

interface UseTodoSnapshotSyncOptions {
  status: ConnectionStatus;
  applySnapshot: (snapshot: SnapshotResponse) => void;
}

export function useTodoSnapshotSync({ status, applySnapshot }: UseTodoSnapshotSyncOptions) {
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchSnapshot = useCallback(async () => {
    if (status !== 'online') {
      return;
    }

    setIsSyncing(true);
    try {
      const snapshot = await apiClient.getSnapshot();
      applySnapshot(snapshot);
    } catch (error) {
      console.error('Failed to fetch snapshot:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [applySnapshot, status]);

  useEffect(() => {
    if (status !== 'online') {
      realtimeSocket.onMessage(NOOP_MESSAGE_HANDLER);
      return;
    }

    void fetchSnapshot();
    realtimeSocket.onMessage(applySnapshot);

    return () => {
      realtimeSocket.onMessage(NOOP_MESSAGE_HANDLER);
    };
  }, [applySnapshot, fetchSnapshot, status]);

  return {
    isSyncing,
    fetchSnapshot,
  };
}
