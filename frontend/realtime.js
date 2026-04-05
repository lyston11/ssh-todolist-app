export function connectRealtime({
  socketConfig,
  serverBaseUrl,
  authToken,
  onConnecting,
  onOnline,
  onOffline,
  onSnapshot,
}) {
  let socket = null;
  let reconnectTimer = null;
  let stopped = false;

  const connect = () => {
    if (stopped) {
      return;
    }

    clearReconnectTimer();
    onConnecting();

    const nextSocket = new WebSocket(buildSocketUrl(serverBaseUrl(), socketConfig(), authToken()));
    socket = nextSocket;

    nextSocket.addEventListener("open", () => {
      if (stopped || socket !== nextSocket) {
        return;
      }
      Promise.resolve(onOnline()).catch((error) => {
        console.error(error);
        if (stopped || socket !== nextSocket) {
          return;
        }
        nextSocket.close();
      });
    });

    nextSocket.addEventListener("message", (event) => {
      if (stopped || socket !== nextSocket) {
        return;
      }

      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "todos.snapshot" && Array.isArray(payload.items)) {
          onSnapshot(payload);
        }
      } catch (error) {
        console.error(error);
      }
    });

    nextSocket.addEventListener("close", () => {
      if (socket !== nextSocket) {
        return;
      }

      socket = null;
      if (stopped) {
        return;
      }

      onOffline();
      scheduleReconnect();
    });

    nextSocket.addEventListener("error", () => {
      if (stopped || socket !== nextSocket) {
        return;
      }

      nextSocket.close();
    });
  };

  const scheduleReconnect = () => {
    if (reconnectTimer !== null) {
      return;
    }

    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, 2000);
  };

  const clearReconnectTimer = () => {
    if (reconnectTimer === null) {
      return;
    }

    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  };

  connect();

  return {
    disconnect() {
      stopped = true;
      clearReconnectTimer();
      const activeSocket = socket;
      socket = null;
      activeSocket?.close();
    },
    reconnectNow() {
      if (stopped) {
        return;
      }

      clearReconnectTimer();
      const activeSocket = socket;
      socket = null;
      if (activeSocket && activeSocket.readyState !== WebSocket.CLOSED) {
        activeSocket.close();
      }
      connect();
    },
  };
}

function buildSocketUrl(serverBaseUrl, socketConfig, authToken) {
  if (socketConfig.wsUrl) {
    const socketUrl = new URL(socketConfig.wsUrl);
    const normalizedToken = authToken.trim();
    if (normalizedToken) {
      socketUrl.searchParams.set("token", normalizedToken);
    }
    return socketUrl.toString();
  }

  const serverUrl = new URL(`${serverBaseUrl}/`);
  const protocol = serverUrl.protocol === "https:" ? "wss:" : "ws:";
  const port = socketConfig.wsPort ?? serverUrl.port ?? "";
  const socketUrl = new URL(`${protocol}//${serverUrl.hostname}${port ? `:${port}` : ""}${socketConfig.wsPath}`);
  const normalizedToken = authToken.trim();
  if (normalizedToken) {
    socketUrl.searchParams.set("token", normalizedToken);
  }
  return socketUrl.toString();
}
