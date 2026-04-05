import {
  buildBatchSelectionSummary,
  filterTodos,
  getVisibleTodos,
} from "./todo_queries.js";
import { bindPress, elements } from "./ui_dom.js";

export function renderActiveView(activeView) {
  elements.appCard.dataset.activeView = activeView;
  elements.mobileNavButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === activeView);
  });
}

export function renderLists(state, handlers) {
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

export function renderFilters(currentFilter) {
  elements.filterButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === currentFilter);
  });
}

export function renderBatchToolbar(state) {
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

export function renderTodos(state) {
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

export function renderSyncState(syncState) {
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

export function renderPendingOperations(pendingOperations) {
  elements.syncQueueStatus.textContent = `${pendingOperations} 个待同步操作`;
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
    option.disabled =
      selectedSourceListIds.size > 0 &&
      selectedSourceListIds.size === 1 &&
      selectedSourceListIds.has(list.id);
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
