import {
  buildBatchSelectionSummary,
  filterTodos,
  getVisibleTodos,
} from "./todo_queries.js";

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
  connectionStatusTitle: document.querySelector("#connection-status-title"),
  connectionStatusBody: document.querySelector("#connection-status-body"),
  connectionStatusTags: document.querySelector("#connection-status-tags"),
  connectionForm: document.querySelector("#connection-form"),
  serverUrlInput: document.querySelector("#server-url-input"),
  serverTokenInput: document.querySelector("#server-token-input"),
  connectionConfigInput: document.querySelector("#connection-config-input"),
  connectServerButton: document.querySelector("#connect-server-button"),
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
  editListButton: document.querySelector("#edit-list-button"),
  deleteListButton: document.querySelector("#delete-list-button"),
  activeListSummary: document.querySelector("#active-list-summary"),
  activeListTitle: document.querySelector("#active-list-title"),
  activeListMeta: document.querySelector("#active-list-meta"),
  listsTabs: document.querySelector("#lists-tabs"),
  syncQueueStatus: document.querySelector("#sync-queue-status"),
  fabButton: document.querySelector("#fab-button"),
  todoForm: document.querySelector("#todo-form"),
  todoInput: document.querySelector("#todo-input"),
  todoList: document.querySelector("#todo-list"),
  todoCount: document.querySelector("#todo-count"),
  todoPanelEyebrow: document.querySelector("#todo-panel-eyebrow"),
  todoPanelTitle: document.querySelector("#todo-panel-title"),
  todoPanelMeta: document.querySelector("#todo-panel-meta"),
  toggleSelectionModeButton: document.querySelector("#toggle-selection-mode"),
  batchToolbar: document.querySelector("#batch-toolbar"),
  batchSelectionSummary: document.querySelector("#batch-selection-summary"),
  selectVisibleTodosButton: document.querySelector("#select-visible-todos"),
  clearSelectedTodosButton: document.querySelector("#clear-selected-todos"),
  batchCompleteTodosButton: document.querySelector("#batch-complete-todos"),
  batchUncompleteTodosButton: document.querySelector("#batch-uncomplete-todos"),
  batchDeleteTodosButton: document.querySelector("#batch-delete-todos"),
  batchMoveListSelect: document.querySelector("#batch-move-list-select"),
  batchMoveTodosButton: document.querySelector("#batch-move-todos"),
  clearCompletedButton: document.querySelector("#clear-completed"),
  emptyState: document.querySelector("#empty-state"),
  emptyStateText: document.querySelector("#empty-state-text"),
  syncStatus: document.querySelector("#sync-status"),
  filterButtons: document.querySelectorAll(".filter"),
  itemTemplate: document.querySelector("#todo-item-template"),
  editDialog: document.querySelector("#edit-dialog"),
  editForm: document.querySelector("#edit-form"),
  editorTitle: document.querySelector("#editor-title"),
  editorDescription: document.querySelector("#editor-description"),
  editInput: document.querySelector("#edit-input"),
  editCharacterCount: document.querySelector("#edit-character-count"),
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
  if (!element) {
    return;
  }

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

function bindDelegatedPress(container, selector, handler, { preventDefault = true } = {}) {
  if (!container) {
    return;
  }

  let lastTouchAt = 0;

  const invoke = async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const item = target.closest(selector);
    if (!item || !container.contains(item)) {
      return;
    }

    await handler(event, item, target);
  };

  container.addEventListener(
    "touchend",
    async (event) => {
      lastTouchAt = Date.now();
      if (preventDefault) {
        event.preventDefault();
      }
      await invoke(event);
    },
    { passive: false },
  );

  container.addEventListener("click", async (event) => {
    if (Date.now() - lastTouchAt < 700) {
      return;
    }
    await invoke(event);
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

  elements.editInput.addEventListener("input", () => {
    renderEditCharacterCount();
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

  bindPress(elements.guideConnectCurrentButton, async () => {
    await handlers.onSaveServerUrl(elements.serverUrlInput.value, elements.serverTokenInput.value);
  });

  bindPress(elements.guideConnectRecentButton, async () => {
    const firstRecentConnection = handlers.getPreferredRecentConnection();
    if (!firstRecentConnection) {
      return;
    }
    await handlers.onConnectRecentConnection(firstRecentConnection.serverBaseUrl);
  });

  bindPress(elements.guideFetchConfigButton, async () => {
    await handlers.onFetchConnectionConfig(elements.serverUrlInput.value);
  });

  bindPress(elements.guideScanConfigButton, async () => {
    await handlers.onScanConnectionConfig();
  });

  bindPress(elements.guideDiscoverNetworkButton, async () => {
    await handlers.onRefreshNetworkSnapshot();
  });

  bindPress(elements.guideOpenTasksButton, () => {
    handlers.onViewChange("tasks");
  });

  bindPress(elements.guidePasteConfigButton, async () => {
    await handlers.onPasteConnectionConfig();
  });

  bindPress(elements.testServerUrlButton, async () => {
    await handlers.onTestServerUrl(elements.serverUrlInput.value, elements.serverTokenInput.value);
  });

  bindPress(elements.fetchConnectionConfigButton, async () => {
    await handlers.onFetchConnectionConfig(elements.serverUrlInput.value);
  });

  bindPress(elements.scanConnectionConfigButton, async () => {
    await handlers.onScanConnectionConfig();
  });

  bindPress(elements.importConnectionConfigButton, async () => {
    await handlers.onImportConnectionConfig(elements.connectionConfigInput.value);
  });

  bindPress(elements.pasteConnectionConfigButton, async () => {
    await handlers.onPasteConnectionConfig();
  });

  bindPress(elements.resetServerUrlButton, async () => {
    await handlers.onResetServerUrl();
  });

  bindPress(elements.refreshNetworkSnapshotButton, async () => {
    await handlers.onRefreshNetworkSnapshot();
  });

  bindPress(elements.probeNetworkCandidatesButton, async () => {
    await handlers.onProbeDiscoveryCandidates();
  });

  bindDelegatedPress(elements.recentConnectionsList, ".recent-connection-card", async (_event, item, target) => {
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

  bindDelegatedPress(elements.networkDiscoveryList, ".network-candidate-card", async (_event, item, target) => {
    const { serverBaseUrl } = item.dataset;
    if (!serverBaseUrl) {
      return;
    }

    if (target.classList.contains("network-candidate-use")) {
      await handlers.onUseDiscoveryCandidate(serverBaseUrl);
    }
  });

  elements.mobileNavButtons.forEach((button) => {
    bindPress(button, () => {
      handlers.onViewChange(button.dataset.view);
    });
  });

  bindPress(elements.addListButton, () => {
    handlers.onOpenListDialog();
  });

  bindPress(elements.editListButton, () => {
    handlers.onEditActiveList();
  });

  bindPress(elements.deleteListButton, async () => {
    await handlers.onDeleteActiveList();
  });

  bindPress(elements.fabButton, () => {
    handlers.onOpenCreateDialog();
  });

  elements.todoForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handlers.onCreate(elements.todoInput.value);
  });

  bindPress(elements.clearCompletedButton, handlers.onClearCompleted);
  bindPress(elements.toggleSelectionModeButton, () => {
    handlers.onToggleSelectionMode();
  });
  bindPress(elements.selectVisibleTodosButton, () => {
    handlers.onSelectVisibleTodos();
  });
  bindPress(elements.clearSelectedTodosButton, () => {
    handlers.onClearSelectedTodos();
  });
  bindPress(elements.batchCompleteTodosButton, async () => {
    await handlers.onBatchCompleteTodos();
  });
  bindPress(elements.batchUncompleteTodosButton, async () => {
    await handlers.onBatchUncompleteTodos();
  });
  bindPress(elements.batchDeleteTodosButton, async () => {
    await handlers.onBatchDeleteTodos();
  });
  bindPress(elements.batchMoveTodosButton, async () => {
    await handlers.onBatchMoveTodos();
  });

  elements.batchMoveListSelect?.addEventListener("change", (event) => {
    handlers.onBatchMoveListChange(event.target.value);
  });

  elements.filterButtons.forEach((button) => {
    bindPress(button, () => {
      handlers.onFilterChange(button.dataset.filter);
    });
  });

  bindDelegatedPress(
    elements.todoList,
    ".todo-item",
    async (_event, item, target) => {
      const todoId = item.dataset.todoId;
      const isSelectionMode = item.dataset.selectionMode === "true";
      const isSelected = item.dataset.selected === "true";

      if (target.closest(".delete-button")) {
        await handlers.onDelete(todoId);
        return;
      }

      if (target.closest(".edit-button")) {
        handlers.onOpenEdit(todoId);
        return;
      }

      if (target.closest(".todo-check") || target.closest(".todo-select")) {
        return;
      }

      if (target.closest(".todo-content")) {
        if (isSelectionMode) {
          await handlers.onToggleTodoSelection(todoId, !isSelected);
          return;
        }

        handlers.onOpenEdit(todoId);
        return;
      }

      if (isSelectionMode && !target.closest(".todo-actions")) {
        await handlers.onToggleTodoSelection(todoId, !isSelected);
      }
    },
    { preventDefault: false },
  );

  elements.todoList.addEventListener("change", async (event) => {
    const target = event.target;
    const item = target.closest(".todo-item");
    if (!item) {
      return;
    }

    if (target.classList.contains("todo-toggle")) {
      await handlers.onToggle(item.dataset.todoId, target.checked);
      return;
    }

    if (target.classList.contains("todo-select-toggle")) {
      await handlers.onToggleTodoSelection(item.dataset.todoId, target.checked);
    }
  });

  elements.editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handlers.onSaveEdit({
      title: elements.editInput.value,
      listId: elements.editListSelect.value,
    });
  });

  bindPress(elements.cancelEditButton, () => {
    handlers.onCancelEdit();
  });

  bindPress(elements.closeEditorButton, () => {
    handlers.onCancelEdit();
  });

  elements.editDialog.addEventListener("close", () => {
    handlers.onDialogClose();
  });

  elements.listForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handlers.onSaveList(elements.listInput.value);
  });

  bindPress(elements.closeListEditorButton, () => {
    handlers.onCancelListEdit();
  });

  bindPress(elements.cancelListEditButton, () => {
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
  renderBatchToolbar(state);
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
  elements.editorDescription.textContent =
    mode === "create"
      ? "直接写下这次要完成的具体动作，手机上会优先给你更宽的编辑区域。"
      : "你可以改任务标题、切换所属清单，保存后会继续同步到当前节点。";
  elements.editInput.value = todo.title;
  renderEditCharacterCount();
  renderEditorLists(lists, todo.listId);
  elements.editDialog.showModal();
  elements.editInput.focus();
  elements.editInput.setSelectionRange(0, elements.editInput.value.length);
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
  renderConnectionStatusCard(state);
  elements.serverUrlInput.value = state.serverDraftUrl;
  elements.serverTokenInput.value = state.serverDraftToken;
  elements.connectionConfigInput.value = state.connectionConfigDraft;
  elements.connectionMessage.textContent = state.serverConnectionMessage;
  elements.connectionMessage.dataset.state = state.serverConnectionState;
  renderRecentConnections(state.recentConnections);
  renderNetworkDiscovery(state);

  const isTesting = state.serverConnectionState === "testing";
  elements.connectServerButton.disabled = isTesting;
  elements.testServerUrlButton.disabled = isTesting;
  elements.fetchConnectionConfigButton.disabled = isTesting;
  elements.scanConnectionConfigButton.disabled = isTesting;
  elements.importConnectionConfigButton.disabled = isTesting;
  elements.pasteConnectionConfigButton.disabled = isTesting;
  elements.resetServerUrlButton.disabled = isTesting;
  elements.refreshNetworkSnapshotButton.disabled = isTesting || state.discoveryState === "testing";
  elements.probeNetworkCandidatesButton.disabled = isTesting || state.discoveryState === "testing";
}

function renderConnectionStatusCard(state) {
  const model = buildConnectionStatusModel(state);

  elements.connectionStatusTitle.textContent = model.title;
  elements.connectionStatusBody.textContent = model.body;
  elements.connectionStatusTags.innerHTML = "";

  model.tags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = "connection-status-tag";
    chip.dataset.tone = tag.tone;
    chip.textContent = tag.label;
    elements.connectionStatusTags.append(chip);
  });
}

function buildConnectionStatusModel(state) {
  const currentNode = state.serverBaseUrl || state.serverDraftUrl || "";
  const hasToken = Boolean((state.serverToken || state.serverDraftToken || "").trim());
  const baseTags = [
    {
      label: hasToken ? "已填写 token" : "未填写 token",
      tone: hasToken ? "ready" : "neutral",
    },
    {
      label: `${state.pendingOperations} 个待同步操作`,
      tone: state.pendingOperations > 0 ? "warning" : "neutral",
    },
  ];

  if (!currentNode) {
    return {
      title: "还没有连接节点",
      body: "先接入一个同步节点，后续最近连接、候选节点和离线缓存都会围绕这个节点工作。",
      tags: [{ label: "未配置节点", tone: "danger" }, ...baseTags],
    };
  }

  if (state.serverConnectionState === "testing" || state.syncState === "connecting") {
    return {
      title: `正在检查 ${currentNode}`,
      body: "正在验证节点、拉取快照或恢复实时同步连接，请稍等。",
      tags: [{ label: "连接中", tone: "warning" }, ...baseTags, { label: currentNode, tone: "neutral" }],
    };
  }

  if (state.syncState === "online") {
    return {
      title: "实时同步已经就绪",
      body: `当前节点 ${currentNode} 已连通，这台设备上的本地缓存和同步队列都绑定到这个节点。`,
      tags: [{ label: "在线", tone: "ready" }, ...baseTags, { label: currentNode, tone: "neutral" }],
    };
  }

  if (state.serverConnectionState === "error" || state.syncState === "offline") {
    return {
      title: "当前节点暂时不可用",
      body: `节点 ${currentNode} 当前不可用，但本地改动仍会进入离线队列，等连接恢复后继续同步。`,
      tags: [{ label: "离线", tone: "danger" }, ...baseTags, { label: currentNode, tone: "neutral" }],
    };
  }

  return {
    title: `已选中节点 ${currentNode}`,
    body: "节点地址已经就绪。你可以继续测试、拉取服务端配置，或者直接建立连接。",
    tags: [{ label: "待连接", tone: "neutral" }, ...baseTags],
  };
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
  const activeList = state.lists.find((list) => list.id === state.activeListId) ?? state.lists[0] ?? null;
  const canManageLists = state.lists.length > 0;
  const canDeleteList = state.lists.length > 1 && activeList !== null;

  elements.activeListSummary.hidden = !canManageLists;
  elements.editListButton.disabled = !canManageLists;
  elements.deleteListButton.disabled = !canDeleteList;

  if (activeList) {
    const totalCount = state.todos.filter((todo) => todo.listId === activeList.id).length;
    const activeCount = state.todos.filter((todo) => todo.listId === activeList.id && !todo.completed).length;
    const completedCount = totalCount - activeCount;

    elements.activeListTitle.textContent = activeList.title;
    elements.activeListMeta.textContent = `${totalCount} 项任务 · ${activeCount} 项待完成 · ${completedCount} 项已完成`;
  } else {
    elements.activeListTitle.textContent = "还没有清单";
    elements.activeListMeta.textContent = "新建一个清单后，就可以按项目或场景管理待办。";
  }

  state.lists.forEach((list) => {
    const listTodoCount = state.todos.filter((todo) => todo.listId === list.id && !todo.completed).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "list-tab";
    if (list.id === state.activeListId) {
      button.classList.add("is-active");
    }
    button.dataset.listId = list.id;

    const title = document.createElement("span");
    title.className = "list-tab-title";
    title.textContent = list.title;

    const count = document.createElement("span");
    count.className = "list-tab-count";
    count.textContent = String(listTodoCount);

    button.append(title, count);
    bindPress(button, () => {
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

function renderBatchToolbar(state) {
  const visibleTodos = getVisibleTodos(state);
  const filteredTodos = filterTodos(visibleTodos, state.currentFilter);
  const selectedTodoIds = new Set(state.selectedTodoIds);
  const selectedTodos = filteredTodos.filter((todo) => selectedTodoIds.has(todo.id));
  const hasVisibleTodos = filteredTodos.length > 0;
  const hasSelectedTodos = selectedTodos.length > 0;
  const hasIncompleteSelectedTodos = selectedTodos.some((todo) => !todo.completed);
  const hasCompletedSelectedTodos = selectedTodos.some((todo) => todo.completed);
  const canMoveSelectedTodos =
    hasSelectedTodos &&
    Boolean(state.batchMoveListId) &&
    selectedTodos.some((todo) => todo.listId !== state.batchMoveListId);

  elements.batchToolbar.hidden = !state.selectionMode;
  elements.toggleSelectionModeButton.textContent = state.selectionMode ? "完成批量" : "批量操作";
  elements.toggleSelectionModeButton.classList.toggle("is-active", state.selectionMode);
  elements.toggleSelectionModeButton.disabled = !state.selectionMode && !hasVisibleTodos;
  elements.batchSelectionSummary.textContent = buildBatchSelectionSummary({
    hasVisibleTodos,
    visibleCount: filteredTodos.length,
    selectedCount: selectedTodos.length,
  });

  elements.selectVisibleTodosButton.disabled = !hasVisibleTodos || selectedTodos.length === filteredTodos.length;
  elements.clearSelectedTodosButton.disabled = !hasSelectedTodos;
  elements.batchCompleteTodosButton.disabled = !hasIncompleteSelectedTodos;
  elements.batchUncompleteTodosButton.disabled = !hasCompletedSelectedTodos;
  elements.batchDeleteTodosButton.disabled = !hasSelectedTodos;

  renderBatchMoveOptions(state, selectedTodos);
  elements.batchMoveTodosButton.disabled = !canMoveSelectedTodos;
}

function renderTodos(state) {
  const visibleTodos = getVisibleTodos(state);
  const filteredTodos = filterTodos(visibleTodos, state.currentFilter);
  const listTitleById = new Map(state.lists.map((list) => [list.id, list.title]));
  const selectedTodoIds = new Set(state.selectedTodoIds);
  elements.todoList.innerHTML = "";

  filteredTodos.forEach((todo) => {
    const itemFragment = elements.itemTemplate.content.cloneNode(true);
    const item = itemFragment.querySelector(".todo-item");
    const selectToggle = itemFragment.querySelector(".todo-select-toggle");
    const title = itemFragment.querySelector(".todo-title");
    const statusBadge = itemFragment.querySelector(".todo-status-badge");
    const listBadge = itemFragment.querySelector(".todo-list-badge");
    const meta = itemFragment.querySelector(".todo-meta");
    const toggle = itemFragment.querySelector(".todo-toggle");
    const isSelected = selectedTodoIds.has(todo.id);

    item.dataset.todoId = todo.id;
    item.dataset.selectionMode = state.selectionMode ? "true" : "false";
    item.dataset.selected = isSelected ? "true" : "false";
    item.classList.toggle("is-completed", todo.completed);
    item.classList.toggle("is-selected", isSelected);
    title.textContent = todo.title;
    statusBadge.textContent = todo.completed ? "已完成" : "进行中";
    statusBadge.dataset.tone = todo.completed ? "completed" : "active";
    listBadge.textContent = listTitleById.get(todo.listId) ?? "未知清单";
    meta.textContent = todo.completed
      ? `已完成于 ${formatDate(todo.completedAt ?? todo.updatedAt ?? todo.createdAt)} · 创建于 ${formatDate(todo.createdAt)}`
      : `创建于 ${formatDate(todo.createdAt)} · 最近更新 ${formatDate(todo.updatedAt ?? todo.createdAt)}`;
    toggle.checked = todo.completed;
    toggle.disabled = state.selectionMode;
    selectToggle.checked = isSelected;

    elements.todoList.append(itemFragment);
  });

  const activeCount = visibleTodos.filter((todo) => !todo.completed).length;
  const hasVisibleTodos = filteredTodos.length > 0;
  renderTodoPanelHeader(state, visibleTodos, filteredTodos);

  elements.todoCount.textContent = `${activeCount} 个待完成`;
  elements.emptyState.classList.toggle("is-visible", !hasVisibleTodos);
  elements.emptyStateText.textContent = buildEmptyStateMessage(state, visibleTodos, filteredTodos);
  elements.clearCompletedButton.disabled = !visibleTodos.some((todo) => todo.completed);
}

function renderTodoPanelHeader(state, visibleTodos, filteredTodos) {
  const activeList = state.lists.find((list) => list.id === state.activeListId) ?? null;
  const filterLabel = getFilterLabel(state.currentFilter);
  const completedCount = visibleTodos.filter((todo) => todo.completed).length;

  elements.todoPanelEyebrow.textContent = activeList ? `当前清单 · ${filterLabel}` : `任务视图 · ${filterLabel}`;
  elements.todoPanelTitle.textContent = activeList ? activeList.title : "全部任务";
  elements.todoPanelMeta.textContent = buildTodoPanelMeta({
    syncState: state.syncState,
    visibleCount: visibleTodos.length,
    filteredCount: filteredTodos.length,
    completedCount,
    filterLabel,
  });
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

function renderEditCharacterCount() {
  const maxLength = Number(elements.editInput.maxLength) || 120;
  const currentLength = elements.editInput.value.length;
  elements.editCharacterCount.textContent = `${currentLength} / ${maxLength}`;
  elements.editCharacterCount.dataset.state = currentLength >= maxLength ? "limit" : "default";
}

function renderBatchMoveOptions(state, selectedTodos) {
  elements.batchMoveListSelect.innerHTML = "";

  if (state.lists.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "还没有可移动的清单";
    elements.batchMoveListSelect.append(option);
    elements.batchMoveListSelect.disabled = true;
    return;
  }

  const selectedSourceListIds = new Set(selectedTodos.map((todo) => todo.listId));
  const fallbackValue =
    state.batchMoveListId && state.lists.some((list) => list.id === state.batchMoveListId)
      ? state.batchMoveListId
      : state.lists[0]?.id ?? "";

  state.lists.forEach((list) => {
    const option = document.createElement("option");
    option.value = list.id;
    option.textContent = list.title;
    option.disabled = selectedSourceListIds.size > 0 && selectedSourceListIds.size === 1 && selectedSourceListIds.has(list.id);
    option.selected = list.id === fallbackValue;
    elements.batchMoveListSelect.append(option);
  });

  elements.batchMoveListSelect.disabled = state.lists.length < 2;

  if (elements.batchMoveListSelect.value !== fallbackValue) {
    const firstEnabledOption = Array.from(elements.batchMoveListSelect.options).find((option) => !option.disabled);
    elements.batchMoveListSelect.value = firstEnabledOption?.value ?? fallbackValue;
  }
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function getFilterLabel(currentFilter) {
  if (currentFilter === "active") {
    return "进行中";
  }
  if (currentFilter === "completed") {
    return "已完成";
  }
  return "全部";
}

function buildTodoPanelMeta({ syncState, visibleCount, filteredCount, completedCount, filterLabel }) {
  const syncLabel =
    syncState === "online" ? "实时同步中" : syncState === "offline" ? "当前离线" : "正在建立连接";

  if (visibleCount === 0) {
    return `${syncLabel} · 当前还没有任务`;
  }

  return `${syncLabel} · 共 ${visibleCount} 项任务 · ${completedCount} 项已完成 · 当前筛选显示 ${filteredCount} 项（${filterLabel}）`;
}

function buildEmptyStateMessage(state, visibleTodos, filteredTodos) {
  if (!state.serverBaseUrl) {
    return "先去设置页连接同步节点，再开始管理任务。";
  }

  if (visibleTodos.length === 0) {
    return "这个清单还没有任务。先写下今天最重要的一件事。";
  }

  if (filteredTodos.length === 0 && state.currentFilter === "active") {
    return "当前筛选下没有进行中的任务，这个清单已经清空了。";
  }

  if (filteredTodos.length === 0 && state.currentFilter === "completed") {
    return "当前筛选下还没有已完成任务。";
  }

  return "还没有任务。先写下今天最重要的一件事。";
}
