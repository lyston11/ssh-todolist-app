import type { SnapshotResponse } from '../types/api.ts';

export type SocketEvent = 'open' | 'close' | 'error' | 'message';
export type SocketStatus = 'connected' | 'disconnected' | 'reconnecting' | 'error';

export class RealtimeSocket {
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private wsUrl: string | null = null;
  private token: string | undefined;
  private manualDisconnect = true;
  private runtimeListenersBound = false;
  private onMessageCallback: (data: SnapshotResponse) => void = () => {};
  private onStatusChange: (status: SocketStatus) => void = () => {};

  connect(wsUrl: string, token?: string) {
    this.wsUrl = wsUrl;
    this.token = token?.trim() || undefined;
    this.manualDisconnect = false;
    this.reconnectAttempts = 0;
    this.clearReconnectTimer();
    this.ensureRuntimeListeners();
    this.openSocket();
  }

  disconnect() {
    this.manualDisconnect = true;
    this.clearReconnectTimer();

    if (this.socket) {
      const socket = this.socket;
      this.socket = null;
      socket.onopen = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      socket.close();
    }

    this.onStatusChange('disconnected');
  }

  onMessage(callback: (data: SnapshotResponse) => void) {
    this.onMessageCallback = callback;
  }

  onStatus(callback: (status: SocketStatus) => void) {
    this.onStatusChange = callback;
  }

  private openSocket() {
    if (!this.wsUrl) {
      return;
    }

    if (this.socket) {
      const previousSocket = this.socket;
      this.socket = null;
      previousSocket.onopen = null;
      previousSocket.onclose = null;
      previousSocket.onerror = null;
      previousSocket.onmessage = null;
      previousSocket.close();
    }

    const currentSocket = new WebSocket(this.buildWebSocketUrl());
    this.socket = currentSocket;

    currentSocket.onopen = () => {
      if (this.socket !== currentSocket) {
        return;
      }

      this.reconnectAttempts = 0;
      this.clearReconnectTimer();
      this.onStatusChange('connected');
    };

    currentSocket.onclose = () => {
      if (this.socket !== currentSocket) {
        return;
      }

      this.socket = null;
      if (this.manualDisconnect) {
        this.onStatusChange('disconnected');
        return;
      }

      this.scheduleReconnect();
    };

    currentSocket.onerror = () => {
      if (this.socket !== currentSocket || this.manualDisconnect) {
        return;
      }

      this.onStatusChange('error');
    };

    currentSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'todos.snapshot') {
          this.onMessageCallback(data as SnapshotResponse);
        }
      } catch (err) {
        console.error('WebSocket message parse error:', err);
      }
    };
  }

  private buildWebSocketUrl() {
    if (!this.wsUrl) {
      throw new Error('WebSocket URL not configured');
    }

    return this.token ? `${this.wsUrl}?token=${encodeURIComponent(this.token)}` : this.wsUrl;
  }

  private scheduleReconnect(forceImmediate = false) {
    if (this.manualDisconnect || !this.wsUrl || this.reconnectTimer) {
      return;
    }

    const delay = forceImmediate
      ? 0
      : Math.min(1000 * 2 ** Math.min(this.reconnectAttempts, 4), 15000);
    this.reconnectAttempts += 1;
    this.onStatusChange('reconnecting');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.manualDisconnect) {
        this.openSocket();
      }
    }, delay);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private ensureRuntimeListeners() {
    if (this.runtimeListenersBound || typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', this.handleRuntimeReconnect);
    document.addEventListener('visibilitychange', this.handleVisibilityReconnect);
    this.runtimeListenersBound = true;
  }

  private handleRuntimeReconnect = () => {
    if (this.manualDisconnect) {
      return;
    }

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.scheduleReconnect(true);
  };

  private handleVisibilityReconnect = () => {
    if (document.visibilityState === 'visible') {
      this.handleRuntimeReconnect();
    }
  };
}

export const realtimeSocket = new RealtimeSocket();
