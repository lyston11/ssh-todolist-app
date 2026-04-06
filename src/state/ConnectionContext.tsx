import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Candidate, ConnectCandidate, ConnectionStatus } from '../types/api';
import { ApiClient, apiClient } from '../api/client';
import { realtimeSocket } from '../realtime/socket';
import { normalizeServerUrl } from '../lib/connection';
import { parseImportedConfig } from '../lib/import_config';
import { createLocalNode, isLocalNode } from '../lib/nodes';
import { RecentNode, storage } from '../lib/storage';

interface ConnectionContextType {
  status: ConnectionStatus;
  activeNode: RecentNode | null;
  recentNodes: RecentNode[];
  connect: (url: string, token?: string) => Promise<void>;
  importConfig: (configStr: string) => Promise<void>;
  enterLocalMode: () => void;
  disconnect: () => void;
  removeRecent: (id: string) => void;
  testConnection: (url: string, token?: string) => Promise<boolean>;
  candidates: Candidate[];
  fetchCandidates: () => Promise<void>;
}

const CURRENT_TOKEN_KEY = 'current_token';
const CURRENT_URL_KEY = 'current_url';
const CURRENT_MODE_KEY = 'current_mode';

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

function createId() {
  return typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function mapCandidate(candidate: ConnectCandidate, authRequired: boolean, hasToken: boolean): Candidate {
  const url = new URL(candidate.serverUrl);
  const labelSource =
    candidate.kind === 'tailscale'
      ? 'Tailscale'
      : candidate.kind === 'lan'
        ? 'LAN'
        : candidate.kind === 'public'
          ? 'Public'
          : candidate.kind;

  return {
    id: `${candidate.kind}:${candidate.serverUrl}`,
    name: `${labelSource} · ${candidate.host}`,
    ip: candidate.host,
    serverUrl: candidate.serverUrl,
    wsUrl: candidate.wsUrl,
    kind: candidate.kind,
    source: candidate.source,
    status: authRequired && !hasToken ? 'needs-token' : 'connectable',
    latency: url.port ? `${url.port}` : undefined,
  };
}

export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<ConnectionStatus>('offline');
  const [activeNode, setActiveNode] = useState<RecentNode | null>(null);
  const [recentNodes, setRecentNodes] = useState<RecentNode[]>(() => storage.getRecentNodes());
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const enterLocalMode = useCallback(() => {
    realtimeSocket.disconnect();
    apiClient.setToken(null);
    apiClient.setBaseUrl('');
    setCandidates([]);
    setActiveNode(createLocalNode());
    setStatus('offline');
    sessionStorage.removeItem(CURRENT_TOKEN_KEY);
    sessionStorage.removeItem(CURRENT_URL_KEY);
    sessionStorage.setItem(CURRENT_MODE_KEY, 'local');
  }, []);

  const disconnect = useCallback(() => {
    realtimeSocket.disconnect();
    apiClient.setToken(null);
    apiClient.setBaseUrl('');
    setActiveNode(null);
    setCandidates([]);
    setStatus('offline');
    sessionStorage.removeItem(CURRENT_TOKEN_KEY);
    sessionStorage.removeItem(CURRENT_URL_KEY);
    sessionStorage.removeItem(CURRENT_MODE_KEY);
  }, []);

  useEffect(() => {
    realtimeSocket.onStatus((socketStatus) => {
      if (socketStatus === 'connected') {
        setStatus('online');
        return;
      }

      if (socketStatus === 'reconnecting') {
        setStatus('reconnecting');
        return;
      }

      if (socketStatus === 'error') {
        setStatus('node-unreachable');
        return;
      }

      if (socketStatus === 'disconnected') {
        setStatus((currentStatus) => (currentStatus === 'offline' ? currentStatus : 'offline'));
      }
    });
  }, []);

  const connect = useCallback(async (url: string, token?: string) => {
    const normalizedUrl = normalizeServerUrl(url);
    const explicitToken = token?.trim() || '';
    const storedToken = storage.getRecentNodeToken(normalizedUrl) || '';
    const initialToken = explicitToken || storedToken;

    setStatus('reconnecting');

    try {
      apiClient.setBaseUrl(normalizedUrl);
      apiClient.setToken(initialToken || null);

      await apiClient.checkHealth();

      const config = await apiClient.getConnectConfig();
      const resolvedServerUrl = config.serverUrl || normalizedUrl;
      const resolvedStoredToken = storage.getRecentNodeToken(resolvedServerUrl) || '';
      const normalizedToken = explicitToken || resolvedStoredToken || storedToken || initialToken;

      apiClient.setBaseUrl(resolvedServerUrl);
      apiClient.setToken(normalizedToken || null);

      if (config.authRequired && !normalizedToken) {
        throw new Error('AUTH_ERROR');
      }

      const meta = await apiClient.getMeta();
      realtimeSocket.connect(config.wsUrl || meta.wsUrl, normalizedToken || undefined);

      const newNode: RecentNode = {
        id: createId(),
        kind: 'remote',
        name: new URL(resolvedServerUrl).hostname,
        ip: resolvedServerUrl,
        lastUsed: new Date().toISOString(),
        status: 'online',
        latency: '...',
        hasToken: Boolean(normalizedToken),
        authRequired: config.authRequired,
      };

      setActiveNode(newNode);
      setCandidates(meta.candidates.map((candidate) => mapCandidate(candidate, meta.authRequired, Boolean(normalizedToken))));
      storage.saveRecentNode(newNode);
      storage.saveRecentNodeToken(normalizedUrl, normalizedToken || null);
      storage.saveRecentNodeToken(resolvedServerUrl, normalizedToken || null);
      setRecentNodes(storage.getRecentNodes());
      setStatus('reconnecting');

      sessionStorage.setItem(CURRENT_TOKEN_KEY, normalizedToken);
      sessionStorage.setItem(CURRENT_URL_KEY, resolvedServerUrl);
      sessionStorage.setItem(CURRENT_MODE_KEY, 'remote');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'AUTH_ERROR' && !explicitToken) {
        storage.removeRecentNodeToken(normalizedUrl);
      }
      if (message === 'AUTH_ERROR' || /401|403|token/i.test(message)) {
        setStatus('token-error');
      } else {
        setStatus('node-unreachable');
      }
      throw err;
    }
  }, []);

  const importConfig = useCallback(async (configStr: string) => {
    try {
      const config = parseImportedConfig(configStr);
      if (!config.serverUrl) {
        throw new Error('配置缺少 serverUrl');
      }
      await connect(config.serverUrl, config.token);
    } catch (err) {
      console.error('Failed to import config:', err);
      throw new Error('配置导入失败，请检查 JSON、config64 或导入链接格式');
    }
  }, [connect]);

  const testConnection = useCallback(async (url: string, token?: string): Promise<boolean> => {
    try {
      const client = new ApiClient();
      const normalizedUrl = normalizeServerUrl(url);
      const explicitToken = token?.trim() || '';
      const storedToken = storage.getRecentNodeToken(normalizedUrl) || '';
      const initialToken = explicitToken || storedToken;

      client.setBaseUrl(normalizedUrl);
      client.setToken(initialToken || null);

      await client.checkHealth();
      const config = await client.getConnectConfig();
      const resolvedServerUrl = config.serverUrl || normalizedUrl;
      const normalizedToken = explicitToken || storage.getRecentNodeToken(resolvedServerUrl) || storedToken;

      client.setBaseUrl(resolvedServerUrl);
      client.setToken(normalizedToken || null);

      if (config.authRequired && !normalizedToken) {
        return false;
      }

      await client.getMeta();
      return true;
    } catch {
      return false;
    }
  }, []);

  const fetchCandidates = useCallback(async () => {
    if (!activeNode || isLocalNode(activeNode)) {
      return;
    }

    try {
      const meta = await apiClient.getMeta();
      setCandidates(
        meta.candidates.map((candidate) =>
          mapCandidate(candidate, meta.authRequired, Boolean(sessionStorage.getItem(CURRENT_TOKEN_KEY))),
        ),
      );
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
    }
  }, [activeNode]);

  const removeRecent = useCallback((id: string) => {
    storage.removeRecentNode(id);
    setRecentNodes(storage.getRecentNodes());
  }, []);

  useEffect(() => {
    const savedUrl = sessionStorage.getItem(CURRENT_URL_KEY);
    const savedToken = sessionStorage.getItem(CURRENT_TOKEN_KEY);
    const savedMode = sessionStorage.getItem(CURRENT_MODE_KEY);

    if (!savedUrl) {
      if (savedMode === 'local') {
        enterLocalMode();
      }
      return;
    }

    connect(savedUrl, savedToken || undefined).catch(() => {
      sessionStorage.removeItem(CURRENT_TOKEN_KEY);
      sessionStorage.removeItem(CURRENT_URL_KEY);
      sessionStorage.removeItem(CURRENT_MODE_KEY);
    });
  }, [connect, enterLocalMode]);

  const value = useMemo(
    () => ({
      status,
      activeNode,
      recentNodes,
      connect,
      importConfig,
      enterLocalMode,
      disconnect,
      removeRecent,
      testConnection,
      candidates,
      fetchCandidates,
    }),
    [
      status,
      activeNode,
      recentNodes,
      connect,
      importConfig,
      enterLocalMode,
      disconnect,
      removeRecent,
      testConnection,
      candidates,
      fetchCandidates,
    ],
  );

  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
};

export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within ConnectionProvider');
  }
  return context;
};
