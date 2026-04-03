const elements = {
  appCard: document.querySelector(".app-card"),
  connectionForm: document.querySelector("#connection-form"),
  serverUrlInput: document.querySelector("#server-url-input"),
  serverTokenInput: document.querySelector("#server-token-input"),
  testServerUrlButton: document.querySelector("#test-server-url"),
  resetServerUrlButton: document.querySelector("#reset-server-url"),
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

export function initUI(handlers) {
  currentHandlers = handlers;
  elements.serverUrlInput.addEventListener("input", (event) => {
    handlers.onServerUrlInput(event.target.value);
  });

  elements.serverTokenInput.addEventListener("input", (event) => {
    handlers.onServerTokenInput(event.target.value);
  });

  elements.connectionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handlers.onSaveServerUrl(elements.serverUrlInput.value, elements.serverTokenInput.value);
  });

  elements.testServerUrlButton.addEventListener("click", async () => {
    await handlers.onTestServerUrl(elements.serverUrlInput.value, elements.serverTokenInput.value);
  });

  elements.resetServerUrlButton.addEventListener("click", async () => {
    await handlers.onResetServerUrl();
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
  renderConnection(state);
  renderActiveView(state.activeView);
  renderLists(state, currentHandlers);
  renderFilters(state.currentFilter);
  renderTodos(state);
  renderSyncState(state.syncState);
  renderPendingOperations(state.pendingOperations);
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
  elements.serverUrlInput.value = state.serverDraftUrl;
  elements.serverTokenInput.value = state.serverDraftToken;
  elements.connectionMessage.textContent = state.serverConnectionMessage;
  elements.connectionMessage.dataset.state = state.serverConnectionState;

  const isTesting = state.serverConnectionState === "testing";
  elements.testServerUrlButton.disabled = isTesting;
  elements.resetServerUrlButton.disabled = isTesting;
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
