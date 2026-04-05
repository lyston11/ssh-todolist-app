export const elements = {
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

export function bindPress(element, handler) {
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

export function bindDelegatedPress(container, selector, handler, { preventDefault = true } = {}) {
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
