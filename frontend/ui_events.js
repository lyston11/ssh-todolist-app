import { renderEditCharacterCount, syncEditTextareaHeight } from "./ui_dialogs.js";
import { bindDelegatedPress, bindPress, elements } from "./ui_dom.js";

export function initUI(handlers) {
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
    syncEditTextareaHeight();
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
