import {
  closeEditDialog,
  closeListDialog,
  openEditDialog,
  openListDialog,
  resetComposer,
} from "./ui_dialogs.js";
import { initUI as initUIEvents } from "./ui_events.js";
import { renderConnection, renderOnboarding } from "./ui_connection.js";
import {
  renderActiveView,
  renderBatchToolbar,
  renderFilters,
  renderLists,
  renderPendingOperations,
  renderSyncState,
  renderTodos,
} from "./ui_todos.js";

let currentHandlers = null;

export function initUI(handlers) {
  currentHandlers = handlers;
  initUIEvents(handlers);
}

export function renderApp(state) {
  renderOnboarding(state, currentHandlers);
  renderConnection(state, currentHandlers);
  renderActiveView(state.activeView);
  renderLists(state, currentHandlers);
  renderFilters(state.currentFilter);
  renderBatchToolbar(state);
  renderTodos(state);
  renderSyncState(state.syncState);
  renderPendingOperations(state.pendingOperations);
}

export {
  closeEditDialog,
  closeListDialog,
  openEditDialog,
  openListDialog,
  resetComposer,
};
