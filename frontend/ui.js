const elements = {
  appCard: document.querySelector(".app-card"),
  onboardingOverlay: document.querySelector("#onboarding-overlay"),
  onboardingTitle: document.querySelector("#onboarding-title"),
  onboardingBody: document.querySelector("#onboarding-body"),
  onboardingChecklist: document.querySelector("#onboarding-checklist"),
  onboardingUseDraftButton: document.querySelector("#onboarding-use-draft"),
  onboardingFetchConfigButton: document.querySelector("#onboarding-fetch-config"),
  onboardingPasteConfigButton: document.querySelector("#onboarding-paste-config"),
  onboardingScanConfigButton: document.querySelector("#onboarding-scan-config"),
  onboardingDiscoverNetworkButton: document.querySelector("#onboarding-discover-network"),
  onboardingConnectRecentButton: document.querySelector("#onboarding-connect-recent"),
  onboardingOpenSettingsButton: document.querySelector("#onboarding-open-settings"),
  onboardingDismissButton: document.querySelector("#onboarding-dismiss"),
  connectionGuide: document.querySelector("#connection-guide"),
  connectionGuideEyebrow: document.querySelector("#connection-guide-eyebrow"),
  connectionGuideTitle: document.querySelector("#connection-guide-title"),
  connectionGuideBody: document.querySelector("#connection-guide-body"),
  connectionGuideChecklist: document.querySelector("#connection-guide-checklist"),
  guideFetchConfigButton: document.querySelector("#guide-fetch-config"),
  guideConnectCurrentButton: document.querySelector("#guide-connect-current"),
  guideConnectRecentButton: document.querySelector("#guide-connect-recent"),
  guideScanConfigButton: document.querySelector("#guide-scan-config"),
  guideDiscoverNetworkButton: document.querySelector("#guide-discover-network"),
  guideOpenTasksButton: document.querySelector("#guide-open-tasks"),
  guidePasteConfigButton: document.querySelector("#guide-paste-config"),
  connectionForm: document.querySelector("#connection-form"),
  serverUrlInput: document.querySelector("#server-url-input"),
  serverTokenInput: document.querySelector("#server-token-input"),
  connectionConfigInput: document.querySelector("#connection-config-input"),
  testServerUrlButton: document.querySelector("#test-server-url"),
  fetchConnectionConfigButton: document.querySelector("#fetch-connection-config"),
  scanConnectionConfigButton: document.querySelector("#scan-connection-config"),
  importConnectionConfigButton: document.querySelector("#import-connection-config"),
  pasteConnectionConfigButton: document.querySelector("#paste-connection-config"),
  resetServerUrlButton: document.querySelector("#reset-server-url"),
  recentConnectionsList: document.querySelector("#recent-connections-list"),
  recentConnectionsEmpty: document.querySelector("#recent-connections-empty"),
  refreshNetworkSnapshotButton: document.querySelector("#refresh-network-snapshot"),
  probeNetworkCandidatesButton: document.querySelector("#probe-network-candidates"),
  networkDiscoverySummary: document.querySelector("#network-discovery-summary"),
  networkDiscoveryList: document.querySelector("#network-discovery-list"),
  connectionMessage: document.querySelector("#connection-message"),
  mobileNavButtons: document.querySelectorAll(".mobile-nav-button"),
  addListButton: document.querySelector("#add-list-button"),
  listsTabs: document.querySelector("#lists-tabs"),
  syncQueueStatus: document.querySelector("#sync-queue-status"),
  fabButton: document.querySelector("#fab-button"),
  todoForm: document.querySelector("#todo-form"),
  todoInput: document.querySelector("#todo-input"),
  todoList: document.querySelector("#todo-list"),
  todoCount: document.querySelector("#todo-count"),
  clearCompletedButton: document.querySelector("#clear-completed"),
  emptyState: document.querySelector("#empty-state"),
  syncStatus: document.querySelector("#sync-status"),
  filterButtons: document.querySelectorAll(".filter"),
  itemTemplate: document.querySelector("#todo-item-template"),
  editDialog: document.querySelector("#edit-dialog"),
  editForm: document.querySelector("#edit-form"),
  editorTitle: document.querySelector("#editor-title"),
  editInput: document.querySelector("#edit-input"),
  editListSelect: document.querySelector("#edit-list-select"),
  closeEditorButton: document.querySelector("#close-editor"),
  cancelEditButton: document.querySelector("#cancel-edit"),
  listDialog: document.querySelector("#list-dialog"),
  listForm: document.querySelector("#list-form"),
  listEditorTitle: document.querySelector("#list-editor-title"),
  listInput: document.querySelector("#list-input"),
  closeListEditorButton: document.querySelector("#close-list-editor"),
  cancelListEditButton: document.querySelector("#cancel-list-edit"),
};

let currentHandlers = null;

function bindPress(element, handler) {
  let lastTouchAt = 0;

  element.addEventListener(
    "touchend",
    async (event) => {
      lastTouchAt = Date.now();
      event.preventDefault();
      await handler(event);
    },
    { passive: false },
  );

  element.addEventListener("click", async (event) => {
    if (Date.now() - lastTouchAt < 700) {
      return;
    }
    await handler(event);
  });
}

export function initUI(handlers) {
  currentHandlers = handlers;
  elements.serverUrlInput.addEventListener("input", (event) => {
    handlers.onServerUrlInput(event.target.value);
  });

  elements.serverTokenInput.addEventListener("input", (event) => {
    handlers.onServerTokenInput(event.target.value);
  });

  elements.connectionConfigInput.addEventListener("input", (event) => {
    handlers.onConnectionConfigInput(event.target.value);
  });

  elements.connectionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handlers.onSaveServerUrl(elements.serverUrlInput.value, elements.serverTokenInput.value);
  });

  bindPress(elements.onboardingUseDraftButton, async () => {
    await handlers.onSaveServerUrl(elements.serverUrlInput.value, elements.serverTokenInput.value);
  });

  bindPress(elements.onboardingFetchConfigButton, async () => {
    await handlers.onFetchConnectionConfig(elements.serverUrlInput.value);
  });

  bindPress(elements.onboardingPasteConfigButton, async () => {
    await handlers.onPasteConnectionConfig();
  });

  bindPress(elements.onboardingScanConfigButton, async () => {
    await handlers.onScanConnectionConfig();
  });

  bindPress(elements.onboardingDiscoverNetworkButton, async () => {
    await handlers.onRefreshNetworkSnapshot();
  });

  bindPress(elements.onboardingConnectRecentButton, async () => {
    const firstRecentConnection = handlers.getPreferredRecentConnection();
    if (!firstRecentConnection) {
      return;
    }
    await handlers.onConnectRecentConnection(firstRecentConnection.serverBaseUrl);
  });

  bindPress(elements.onboardingOpenSettingsButton, async () => {
    handlers.onDismissOnboarding(false);
    handlers.onViewChange("settings");
  });

  bindPress(elements.onboardingDismissButton, async () => {
    handlers.onDismissOnboarding(true);
  });

  elements.onboardingOverlay.addEventListener(
    "touchmove",
    (event) => {
      if (!elements.onboardingOverlay.hidden) {
        event.preventDefault();
      }
    },
    { passive: false },
  );

  elements.onboardingOverlay.addEventListener("wheel", (event) => {
    if (!elements.onboardingOverlay.hidden) {
      event.preventDefault();
    }
  });

  elements.guideFetchConfigButton.addEventListener("click", async () => {
    await handlers.onFetchConnectionConfig(elements.serverUrlInput.value);
  });

  elements.guideConnectCurrentButton.addEventListener("click", async () => {
    await handlers.onSaveServerUrl(elements.serverUrlInput.value, elements.serverTokenInput.value);
  });

  elements.guideConnectRecentButton.addEventListener("click", async () => {
    const firstRecentConnection = handlers.getPreferredRecentConnection();
    if (!firstRecentConnection) {
      return;
    }
    await handlers.onConnectRecentConnection(firstRecentConnection.serverBaseUrl);
  });

  elements.guideScanConfigButton.addEventListener("click", async () => {
    await handlers.onScanConnectionConfig();
  });

  elements.guideDiscoverNetworkButton.addEventListener("click", async () => {
    await handlers.onRefreshNetworkSnapshot();
  });

  elements.guideOpenTasksButton.addEventListener("click", () => {
    handlers.onViewChange("tasks");
  });

  elements.guidePasteConfigButton.addEventListener("click", async () => {
    await handlers.onPasteConnectionConfig();
  });

  elements.testServerUrlButton.addEventListener("click", async () => {
    await handlers.onTestServerUrl(elements.serverUrlInput.value, elements.serverTokenInput.value);
  });

  elements.fetchConnectionConfigButton.addEventListener("click", async () => {
    await handlers.onFetchConnectionConfig(elements.serverUrlInput.value);
  });

  elements.scanConnectionConfigButton.addEventListener("click", async () => {
    await handlers.onScanConnectionConfig();
  });

  elements.importConnectionConfigButton.addEventListener("click", async () => {
    await handlers.onImportConnectionConfig(elements.connectionConfigInput.value);
  });

  elements.pasteConnectionConfigButton.addEventListener("click", async () => {
    await handlers.onPasteConnectionConfig();
  });

  elements.resetServerUrlButton.addEventListener("click", async () => {
    await handlers.onResetServerUrl();
  });

  elements.refreshNetworkSnapshotButton.addEventListener("click", async () => {
    await handlers.onRefreshNetworkSnapshot();
  });

  elements.probeNetworkCandidatesButton.addEventListener("click", async () => {
    await handlers.onProbeDiscoveryCandidates();
  });

  elements.recentConnectionsList.addEventListener("click", async (event) => {
    const target = event.target;
    const item = target.closest(".recent-connection-card");
    if (!item) {
      return;
    }

    const { serverBaseUrl } = item.dataset;
    if (!serverBaseUrl) {
      return;
    }

    if (target.classList.contains("recent-connection-remove")) {
      await handlers.onRemoveRecentConnection(serverBaseUrl);
      return;
    }

    if (target.classList.contains("recent-connection-connect")) {
      await handlers.onConnectRecentConnection(serverBaseUrl);
    }
  });

  elements.networkDiscoveryList.addEventListener("click", async (event) => {
    const target = event.target;
    const item = target.closest(".network-candidate-card");
    if (!item) {
      return;
    }

    const { serverBaseUrl } = item.dataset;
    if (!serverBaseUrl) {
      return;
    }

    if (target.classList.contains("network-candidate-use")) {
      await handlers.onUseDiscoveryCandidate(serverBaseUrl);
    }
  });

  elements.mobileNavButtons.forEach((button) => {
    button.addEventListener("click", () => {
      handlers.onViewChange(button.dataset.view);
    });
  });

  elements.addListButton.addEventListener("click", () => {
    handlers.onOpenListDialog();
  });

  elements.fabButton.addEventListener("click", () => {
    handlers.onOpenCreateDialog();
  });

  elements.todoForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handlers.onCreate(elements.todoInput.value);
  });

  elements.clearCompletedButton.addEventListener("click", handlers.onClearCompleted);

  elements.filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      handlers.onFilterChange(button.dataset.filter);
    });
  });

  elements.todoList.addEventListener("click", async (event) => {
    const target = event.target;
    const item = target.closest(".todo-item");
    if (!item) {
      return;
    }

    const todoId = item.dataset.todoId;

    if (target.classList.contains("delete-button")) {
      await handlers.onDelete(todoId);
      return;
    }

    if (target.classList.contains("edit-button")) {
      handlers.onOpenEdit(todoId);
    }
  });

  elements.todoList.addEventListener("change", async (event) => {
    const target = event.target;
    if (!target.classList.contains("todo-toggle")) {
      return;
    }

    const item = target.closest(".todo-item");
    if (!item) {
      return;
    }

    await handlers.onToggle(item.dataset.todoId, target.checked);
  });

  elements.editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handlers.onSaveEdit({
      title: elements.editInput.value,
      listId: elements.editListSelect.value,
    });
  });

  elements.cancelEditButton.addEventListener("click", () => {
    handlers.onCancelEdit();
  });

  elements.closeEditorButton.addEventListener("click", () => {
    handlers.onCancelEdit();
  });

  elements.editDialog.addEventListener("close", () => {
    handlers.onDialogClose();
  });

  elements.listForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handlers.onSaveList(elements.listInput.value);
  });

  elements.closeListEditorButton.addEventListener("click", () => {
    handlers.onCancelListEdit();
  });

  elements.cancelListEditButton.addEventListener("click", () => {
    handlers.onCancelListEdit();
  });

  elements.listDialog.addEventListener("close", () => {
    handlers.onListDialogClose();
  });
}

export function renderApp(state) {
  renderOnboarding(state, currentHandlers);
  renderConnection(state);
  renderActiveView(state.activeView);
  renderLists(state, currentHandlers);
  renderFilters(state.currentFilter);
  renderTodos(state);
  renderSyncState(state.syncState);
  renderPendingOperations(state.pendingOperations);
}

function renderOnboarding(state, handlers) {
  const model = buildOnboardingModel(state);

  elements.onboardingOverlay.hidden = !state.onboardingVisible;
  document.body.dataset.onboardingVisible = state.onboardingVisible ? "true" : "false";
  elements.onboardingTitle.textContent = model.title;
  elements.onboardingBody.textContent = model.body;
  elements.onboardingChecklist.innerHTML = "";

  model.checklist.forEach((item) => {
    const node = document.createElement("li");
    node.className = "onboarding-item";
    node.dataset.state = item.done ? "done" : "pending";
    node.textContent = `${item.done ? "已完成" : "下一步"} · ${item.label}`;
    elements.onboardingChecklist.append(node);
  });

  const hasDraftUrl = Boolean(state.serverDraftUrl.trim());
  const hasRecentConnections = state.recentConnections.length > 0;
  const isTesting = state.serverConnectionState === "testing";

  elements.onboardingUseDraftButton.disabled = isTesting || !hasDraftUrl;
  elements.onboardingFetchConfigButton.disabled = isTesting || !hasDraftUrl;
  elements.onboardingPasteConfigButton.disabled = isTesting;
  elements.onboardingScanConfigButton.disabled = isTesting;
  elements.onboardingDiscoverNetworkButton.disabled = isTesting || state.discoveryState === "testing";
  elements.onboardingConnectRecentButton.disabled =
    isTesting || !hasRecentConnections || !handlers.getPreferredRecentConnection();
}

function buildOnboardingModel(state) {
  const hasDraftUrl = Boolean(state.serverDraftUrl.trim());
  const hasToken = Boolean(state.serverDraftToken.trim());
  const hasConfigDraft = Boolean(state.connectionConfigDraft.trim());
  const hasRecentConnections = state.recentConnections.length > 0;

  if (hasRecentConnections) {
    return {
      title: "继续使用最近的同步节点",
      body: "你已经连接过至少一个节点。手机上最省事的方式是先直接回连最近节点，不够再去改配置。",
      checklist: [
        { label: "选择最近节点并回连", done: true },
        { label: "需要时再切换到其他节点", done: hasDraftUrl },
        { label: "连接成功后进入任务页", done: false },
      ],
    };
  }

  return {
    title: "先把这台设备接入你的同步节点",
    body: "先填 Tailscale 地址，然后拉取服务端配置；如果你已经复制了 JSON，也可以直接从剪贴板导入。",
    checklist: [
      { label: "填写同步节点地址", done: hasDraftUrl },
      { label: "准备 token 或导入完整配置", done: hasToken || hasConfigDraft },
      { label: "建立连接并进入任务页", done: false },
    ],
  };
}

export function resetComposer() {
  elements.todoForm.reset();
  elements.todoInput.focus();
}

export function openEditDialog({ todo, lists, mode }) {
  elements.editorTitle.textContent = mode === "create" ? "新建任务" : "编辑任务";
  elements.editInput.value = todo.title;
  renderEditorLists(lists, todo.listId);
  elements.editDialog.showModal();
  elements.editInput.focus();
  elements.editInput.select();
}

export function closeEditDialog() {
  elements.editDialog.close();
}

export function openListDialog({ title, mode }) {
  elements.listEditorTitle.textContent = mode === "create" ? "新建清单" : "编辑清单";
  elements.listInput.value = title;
  elements.listDialog.showModal();
  elements.listInput.focus();
  elements.listInput.select();
}

export function closeListDialog() {
  elements.listDialog.close();
}

function renderConnection(state) {
  renderConnectionGuide(state, currentHandlers);
  elements.serverUrlInput.value = state.serverDraftUrl;
  elements.serverTokenInput.value = state.serverDraftToken;
  elements.connectionConfigInput.value = state.connectionConfigDraft;
  elements.connectionMessage.textContent = state.serverConnectionMessage;
  elements.connectionMessage.dataset.state = state.serverConnectionState;
  renderRecentConnections(state.recentConnections);
  renderNetworkDiscovery(state);

  const isTesting = state.serverConnectionState === "testing";
  elements.testServerUrlButton.disabled = isTesting;
  elements.fetchConnectionConfigButton.disabled = isTesting;
  elements.scanConnectionConfigButton.disabled = isTesting;
  elements.importConnectionConfigButton.disabled = isTesting;
  elements.pasteConnectionConfigButton.disabled = isTesting;
  elements.resetServerUrlButton.disabled = isTesting;
  elements.refreshNetworkSnapshotButton.disabled = isTesting || state.discoveryState === "testing";
  elements.probeNetworkCandidatesButton.disabled = isTesting || state.discoveryState === "testing";
}

function renderConnectionGuide(state, handlers) {
  const guide = buildConnectionGuideModel(state);

  elements.connectionGuide.dataset.mode = guide.mode;
  elements.connectionGuideEyebrow.textContent = guide.eyebrow;
  elements.connectionGuideTitle.textContent = guide.title;
  elements.connectionGuideBody.textContent = guide.body;
  elements.connectionGuideChecklist.innerHTML = "";

  guide.checklist.forEach((item) => {
    const node = document.createElement("li");
    node.className = "connection-guide-item";
    node.dataset.state = item.done ? "done" : "pending";
    node.textContent = `${item.done ? "已完成" : "待完成"} · ${item.label}`;
    elements.connectionGuideChecklist.append(node);
  });

  const hasDraftUrl = Boolean(state.serverDraftUrl.trim());
  const hasRecentConnections = state.recentConnections.length > 0;
  const isOnline = state.syncState === "online";
  const isTesting = state.serverConnectionState === "testing";

  elements.guideFetchConfigButton.hidden = isOnline || !hasDraftUrl;
  elements.guideConnectCurrentButton.hidden = isOnline || !hasDraftUrl;
  elements.guideConnectRecentButton.hidden = isOnline || !hasRecentConnections;
  elements.guideScanConfigButton.hidden = isOnline;
  elements.guideDiscoverNetworkButton.hidden = false;
  elements.guideOpenTasksButton.hidden = !isOnline || state.activeView === "tasks";
  elements.guidePasteConfigButton.hidden = isOnline;

  elements.guideFetchConfigButton.disabled = isTesting || !hasDraftUrl;
  elements.guideConnectCurrentButton.disabled = isTesting || !hasDraftUrl;
  elements.guideConnectRecentButton.disabled = isTesting || !hasRecentConnections || !handlers.getPreferredRecentConnection();
  elements.guideScanConfigButton.disabled = isTesting;
  elements.guideDiscoverNetworkButton.disabled = isTesting || state.discoveryState === "testing";
  elements.guideOpenTasksButton.disabled = false;
  elements.guidePasteConfigButton.disabled = isTesting;
}

function buildConnectionGuideModel(state) {
  const hasDraftUrl = Boolean(state.serverDraftUrl.trim() || state.serverBaseUrl.trim());
  const hasConfigDraft = Boolean(state.connectionConfigDraft.trim());
  const hasToken = Boolean(state.serverDraftToken.trim() || state.serverToken.trim());
  const hasRecentConnections = state.recentConnections.length > 0;
  const isOnline = state.syncState === "online";

  if (isOnline) {
    return {
      mode: "online",
      eyebrow: "已连接",
      title: "同步节点已经就绪",
      body: `当前节点 ${state.serverBaseUrl || state.serverDraftUrl} 已连通，现在可以直接进入任务页继续使用。`,
      checklist: [
        { label: "同步节点地址可用", done: true },
        { label: "实时同步已建立", done: true },
        { label: "本地缓存和待同步队列已绑定当前节点", done: true },
      ],
    };
  }

  if (hasRecentConnections) {
    return {
      mode: "returning",
      eyebrow: "快速回连",
      title: "优先试试最近成功连接过的节点",
      body: "在手机上最省事的方式通常是一键回连最近节点，不必重新手填 Tailscale 地址。",
      checklist: [
        { label: "已有可复用的最近节点", done: true },
        { label: "当前节点地址已填写", done: hasDraftUrl },
        { label: "当前 token 已准备", done: hasToken },
      ],
    };
  }

  return {
    mode: "setup",
    eyebrow: "首次连接",
    title: "先连接一个同步节点",
    body: "先填一个 Tailscale 节点地址，再拉取服务端配置，或者直接导入服务端导出的 JSON。",
    checklist: [
      { label: "填写节点地址或导入连接配置", done: hasDraftUrl || hasConfigDraft },
      { label: "准备好 token", done: hasToken },
      { label: "建立同步连接", done: false },
    ],
  };
}

function renderRecentConnections(recentConnections) {
  elements.recentConnectionsList.innerHTML = "";
  elements.recentConnectionsEmpty.hidden = recentConnections.length > 0;

  recentConnections.forEach((connection) => {
    const item = document.createElement("article");
    item.className = "recent-connection-card";
    item.dataset.serverBaseUrl = connection.serverBaseUrl;

    const title = document.createElement("p");
    title.className = "recent-connection-title";
    title.textContent = connection.serverBaseUrl;

    const meta = document.createElement("p");
    meta.className = "recent-connection-meta";
    meta.textContent = buildRecentConnectionMeta(connection);

    const actions = document.createElement("div");
    actions.className = "recent-connection-actions";

    const connectButton = document.createElement("button");
    connectButton.type = "button";
    connectButton.className = "recent-connection-connect";
    connectButton.textContent = "连接";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "ghost-button recent-connection-remove";
    removeButton.textContent = "删除";

    actions.append(connectButton, removeButton);
    item.append(title, meta, actions);
    elements.recentConnectionsList.append(item);
  });
}

function renderNetworkDiscovery(state) {
  elements.networkDiscoverySummary.textContent = buildNetworkSummary(state);
  elements.networkDiscoveryList.innerHTML = "";

  state.discoveryCandidates.forEach((candidate) => {
    const item = document.createElement("article");
    item.className = "network-candidate-card";
    item.dataset.serverBaseUrl = candidate.serverBaseUrl;
    item.dataset.status = candidate.status;

    const title = document.createElement("p");
    title.className = "network-candidate-title";
    title.textContent = candidate.serverBaseUrl;

    const meta = document.createElement("p");
    meta.className = "network-candidate-meta";
    meta.textContent = buildDiscoveryCandidateMeta(candidate);

    const actions = document.createElement("div");
    actions.className = "network-candidate-actions";

    const useButton = document.createElement("button");
    useButton.type = "button";
    useButton.className = "network-candidate-use";
    useButton.textContent = candidate.serverToken ? "连接" : "使用";

    actions.append(useButton);
    item.append(title, meta, actions);
    elements.networkDiscoveryList.append(item);
  });
}

function buildRecentConnectionMeta(connection) {
  const tokenState = connection.serverToken ? "已保存 token" : connection.authRequired ? "需要 token" : "无需 token";
  const lastUsedAt = new Date(connection.lastUsedAt).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${tokenState} · 最近使用 ${lastUsedAt}`;
}

function buildNetworkSummary(state) {
  if (state.discoveryState === "testing") {
    return "正在读取网络信息或测试候选节点...";
  }

  if (!state.networkSnapshot?.lastUpdatedAt) {
    return "还没有读取本机网络信息。";
  }

  const tailscaleIps = Array.isArray(state.networkSnapshot?.tailscale)
    ? state.networkSnapshot.tailscale.map((item) => item.address).filter(Boolean)
    : [];

  if (tailscaleIps.length === 0) {
    return "未检测到本机 Tailscale 地址。可以先打开 Tailscale，再重新读取网络。";
  }

  return `本机 Tailscale 地址：${tailscaleIps.join(" / ")}`;
}

function buildDiscoveryCandidateMeta(candidate) {
  const latency = typeof candidate.latencyMs === "number" ? ` · ${candidate.latencyMs} ms` : "";
  const tokenHint = candidate.serverToken ? " · 已带 token" : "";
  return `${candidate.label} · ${candidate.message}${latency}${tokenHint}`;
}

function renderActiveView(activeView) {
  elements.appCard.dataset.activeView = activeView;
  elements.mobileNavButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === activeView);
  });
}

function renderLists(state, handlers) {
  elements.listsTabs.innerHTML = "";

  state.lists.forEach((list) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "list-tab";
    if (list.id === state.activeListId) {
      button.classList.add("is-active");
    }
    button.dataset.listId = list.id;
    button.textContent = list.title;
    button.addEventListener("click", () => {
      handlers.onSelectList(list.id);
    });
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      handlers.onOpenListDialog(list.id);
    });
    elements.listsTabs.append(button);
  });
}

function renderFilters(currentFilter) {
  elements.filterButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === currentFilter);
  });
}

function renderTodos(state) {
  const visibleTodos = state.activeListId
    ? state.todos.filter((todo) => todo.listId === state.activeListId)
    : state.todos;
  const filteredTodos = getFilteredTodos(visibleTodos, state.currentFilter);
  elements.todoList.innerHTML = "";

  filteredTodos.forEach((todo) => {
    const itemFragment = elements.itemTemplate.content.cloneNode(true);
    const item = itemFragment.querySelector(".todo-item");
    const title = itemFragment.querySelector(".todo-title");
    const meta = itemFragment.querySelector(".todo-meta");
    const toggle = itemFragment.querySelector(".todo-toggle");

    item.dataset.todoId = todo.id;
    item.classList.toggle("is-completed", todo.completed);
    title.textContent = todo.title;
    meta.textContent = todo.completed
      ? `已完成于 ${formatDate(todo.completedAt ?? todo.createdAt)}`
      : `创建于 ${formatDate(todo.createdAt)}`;
    toggle.checked = todo.completed;

    elements.todoList.append(itemFragment);
  });

  const activeCount = visibleTodos.filter((todo) => !todo.completed).length;
  const hasVisibleTodos = filteredTodos.length > 0;

  elements.todoCount.textContent = `${activeCount} 个待完成`;
  elements.emptyState.classList.toggle("is-visible", !hasVisibleTodos);
  elements.clearCompletedButton.disabled = !visibleTodos.some((todo) => todo.completed);
}

function renderSyncState(syncState) {
  elements.syncStatus.classList.toggle("is-online", syncState === "online");
  elements.syncStatus.classList.toggle("is-offline", syncState === "offline");

  if (syncState === "online") {
    elements.syncStatus.textContent = "已连接实时同步节点";
    return;
  }

  if (syncState === "offline") {
    elements.syncStatus.textContent = "同步服务不可用";
    return;
  }

  elements.syncStatus.textContent = "正在连接同步服务";
}

function renderPendingOperations(pendingOperations) {
  elements.syncQueueStatus.textContent = `${pendingOperations} 个待同步操作`;
}

function renderEditorLists(lists, activeListId) {
  elements.editListSelect.innerHTML = "";
  lists.forEach((list) => {
    const option = document.createElement("option");
    option.value = list.id;
    option.textContent = list.title;
    option.selected = list.id === activeListId;
    elements.editListSelect.append(option);
  });
}

function getFilteredTodos(todos, currentFilter) {
  if (currentFilter === "active") {
    return todos.filter((todo) => !todo.completed);
  }

  if (currentFilter === "completed") {
    return todos.filter((todo) => todo.completed);
  }

  return todos;
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}
