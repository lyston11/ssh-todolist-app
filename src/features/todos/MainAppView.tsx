import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Activity, Calendar, ClipboardList, HardDrive, Plus, RefreshCw, Settings, ShieldCheck, Wifi } from 'lucide-react';
import { useConnection } from '../../state/ConnectionContext';
import { useTodo } from '../../state/TodoContext';
import { getNodeStatusLabel, isLocalNode } from '../../lib/nodes';
import { CalendarTab } from './components/CalendarTab';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ListManagerSheet } from './components/ListManagerSheet';
import { NodesTab } from './components/NodesTab';
import { SettingsTab } from './components/SettingsTab';
import { TaskBatchBar } from './components/TaskBatchBar';
import { TaskEditorSheet } from './components/TaskEditorSheet';
import { TaskMoveSheet } from './components/TaskMoveSheet';
import { TasksTab } from './components/TasksTab';
import { useTaskBatchState } from './hooks/useTaskBatchState';
import { useTaskEditor } from './hooks/useTaskEditor';
import { useWorkspaceActions } from './hooks/useWorkspaceActions';

interface MainAppViewProps {
  onSettings: () => void;
  onNetwork: () => void;
}

const DEFAULT_TASK_TAGS = ['工作', '私人', '系统', '购物'] as const;
const TAB_TITLES = {
  tasks: '任务',
  calendar: '日历',
  nodes: '节点',
  settings: '设置',
} as const;

export const MainAppView: React.FC<MainAppViewProps> = ({ onSettings, onNetwork }) => {
  const { status, activeNode, recentNodes, removeRecent, connect, importConfig, disconnect } = useConnection();
  const {
    lists,
    items,
    activeListId,
    setActiveListId,
    createList,
    updateList,
    deleteList,
    createTodo,
    updateTodo,
    deleteTodo,
    batchComplete,
    moveTodos,
    batchDelete,
    isSyncing,
    pendingCount
  } = useTodo();

  const [activeTab, setActiveTab] = useState<'tasks' | 'calendar' | 'nodes' | 'settings'>('tasks');
  const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isListManagerOpen, setIsListManagerOpen] = useState(false);

  const {
    isBatchMode,
    selectedTaskIds,
    selectedTaskIdSet,
    isMoveSheetOpen,
    isDeleteConfirmOpen,
    toggleBatchMode,
    toggleTaskSelection,
    resetBatchState,
    openMoveSheet,
    closeMoveSheet,
    openDeleteConfirm,
    closeDeleteConfirm,
  } = useTaskBatchState({
    batchEnabled: activeTab === 'tasks',
    items,
  });

  const {
    defaultListId,
    defaultTaskTag,
    editingTask,
    isTaskEditorOpen,
    openNewTask,
    openEditTask,
    closeTaskEditor,
    saveTask,
    deleteCurrentTask,
  } = useTaskEditor({
    activeListId,
    lists,
    createTodo,
    updateTodo,
    deleteTodo,
  });

  const {
    busyAction: settingsBusyAction,
    message: settingsMessage,
    handleReconnect,
    handlePasteImport,
    handleScanImport,
    handleDisconnect,
    handleCreateList,
    handleRenameList,
    handleDeleteList,
  } = useWorkspaceActions({
    lists,
    connect,
    importConfig,
    disconnect,
    createList,
    updateList,
    deleteList,
  });

  const availableTaskTags = useMemo(
    () =>
      Array.from(
        new Set([
          ...DEFAULT_TASK_TAGS,
          ...items.map((task) => task.tag?.trim() || '').filter((tag) => Boolean(tag))
        ]),
      ),
    [items],
  );

  const filteredTasks = useMemo(
    () =>
      items.filter((task) => {
        if (activeListId && task.listId !== activeListId) return false;
        if (categoryFilter !== 'all' && (task.tag || '') !== categoryFilter) return false;
        if (taskFilter === 'active') return !task.completed;
        if (taskFilter === 'completed') return task.completed;
        return true;
      }),
    [items, activeListId, categoryFilter, taskFilter],
  );

  const handleBatchComplete = async () => {
    if (selectedTaskIds.length === 0) return;
    await batchComplete(selectedTaskIds);
    resetBatchState();
  };

  const handleBatchMove = async (listId: string) => {
    if (selectedTaskIds.length === 0) return;
    await moveTodos(selectedTaskIds, listId);
    resetBatchState();
  };

  const handleBatchDelete = async () => {
    if (selectedTaskIds.length === 0) return;
    await batchDelete(selectedTaskIds);
    resetBatchState();
  };
  const headerTitle = TAB_TITLES[activeTab];

  return (
    <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative mx-auto flex w-full max-w-[640px] flex-1 flex-col">
      <AnimatePresence mode="wait">
        {status === 'reconnecting' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="z-30 flex items-center gap-2 border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300"
          >
            <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
            <span>正在重新连接节点…</span>
          </motion.div>
        )}
        {status === 'offline' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="z-30 flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-200"
          >
            <Wifi className="h-4 w-4 text-amber-400" />
            <span>{isLocalNode(activeNode) ? '本地模式，数据仅保存在当前设备。' : '当前离线，本地缓存仍可继续工作。'}</span>
          </motion.div>
        )}
        {status === 'token-error' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="z-30 flex items-center justify-between gap-3 border-b border-rose-500/20 bg-rose-500/10 px-4 py-2"
          >
            <div className="flex items-center gap-2 text-sm text-rose-200">
              <ShieldCheck className="h-4 w-4 text-rose-400" />
              <span>访问令牌已失效，请更新后重连。</span>
            </div>
            <button
              onClick={onSettings}
              className="rounded-md border border-rose-400/30 px-3 py-1.5 text-sm text-rose-100 transition-colors hover:bg-rose-500/10"
            >
              去设置
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#111315] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-white">{headerTitle}</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-400">
              <div className={`h-2 w-2 rounded-full ${status === 'online' ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span className="truncate">{getNodeStatusLabel(activeNode, status)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'tasks' && !isBatchMode && (
              <button
                onClick={openNewTask}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-500 px-3 text-sm font-medium text-black transition-colors hover:bg-emerald-400"
              >
                <Plus className="h-4 w-4" />
                新建
              </button>
            )}
            <button
              onClick={onNetwork}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-[#181b1f] text-slate-300 transition-colors hover:bg-[#1d2126] hover:text-white"
            >
              <Activity className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'tasks' ? (
            <motion.div key="tasks-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TasksTab
                lists={lists}
                activeListId={activeListId}
                onSelectList={setActiveListId}
                availableTaskTags={availableTaskTags}
                categoryFilter={categoryFilter}
                onSelectCategory={setCategoryFilter}
                taskFilter={taskFilter}
                onSelectTaskFilter={setTaskFilter}
                pendingCount={pendingCount}
                isSyncing={isSyncing}
                filteredTasks={filteredTasks}
                isBatchMode={isBatchMode}
                selectedTaskIds={selectedTaskIdSet}
                onToggleBatchMode={toggleBatchMode}
                onTaskPress={(task) => (isBatchMode ? toggleTaskSelection(task.id) : openEditTask(task))}
                onToggleTaskCompletion={(task) => updateTodo(task.id, { completed: !task.completed })}
                onOpenNewTask={openNewTask}
              />
            </motion.div>
          ) : activeTab === 'nodes' ? (
            <motion.div key="nodes-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <NodesTab
                status={status}
                activeNode={activeNode}
                recentNodes={recentNodes}
                onReconnect={handleReconnect}
                onRemoveRecent={removeRecent}
                onAddNode={onSettings}
              />
            </motion.div>
          ) : activeTab === 'settings' ? (
            <motion.div key="settings-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SettingsTab
                status={status}
                activeNode={activeNode}
                recentNodes={recentNodes}
                lists={lists}
                activeListId={activeListId}
                pendingCount={pendingCount}
                busyAction={settingsBusyAction}
                message={settingsMessage}
                onOpenNodeSettings={onSettings}
                onOpenNetwork={onNetwork}
                onOpenListManager={() => setIsListManagerOpen(true)}
                onPasteImport={handlePasteImport}
                onScanImport={handleScanImport}
                onReconnectNode={handleReconnect}
                onRemoveRecent={removeRecent}
                onDisconnect={handleDisconnect}
              />
            </motion.div>
          ) : (
            <motion.div key="calendar-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CalendarTab
                items={items}
                lists={lists}
                onTaskPress={openEditTask}
                onToggleTaskCompletion={(task) => updateTodo(task.id, { completed: !task.completed })}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <TaskEditorSheet
        open={isTaskEditorOpen}
        editingTask={editingTask}
        defaultListId={defaultListId}
        defaultTaskTag={defaultTaskTag}
        availableTaskTags={availableTaskTags}
        lists={lists}
        onClose={closeTaskEditor}
        onSave={saveTask}
        onDelete={deleteCurrentTask}
      />

      <TaskMoveSheet open={isMoveSheetOpen} lists={lists} onClose={closeMoveSheet} onMove={handleBatchMove} />
      <ListManagerSheet
        open={isListManagerOpen}
        lists={lists}
        activeListId={activeListId}
        onClose={() => setIsListManagerOpen(false)}
        onSelectList={setActiveListId}
        onCreateList={handleCreateList}
        onRenameList={handleRenameList}
        onDeleteList={handleDeleteList}
      />
      <ConfirmDialog
        open={isDeleteConfirmOpen}
        title="确认删除？"
        description={`你将删除选中的 ${selectedTaskIds.length} 项任务，此操作无法撤销。`}
        confirmLabel="确认删除"
        onClose={closeDeleteConfirm}
        onConfirm={handleBatchDelete}
      />

      <AnimatePresence>{isBatchMode && <TaskBatchBar selectedCount={selectedTaskIds.length} onComplete={handleBatchComplete} onMove={openMoveSheet} onDelete={openDeleteConfirm} onCancel={resetBatchState} />}</AnimatePresence>

      {!isBatchMode && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#111315]">
          <div className="mx-auto grid h-16 w-full max-w-[640px] grid-cols-4 px-2">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex flex-col items-center justify-center gap-1 rounded-md text-xs transition-colors ${
                activeTab === 'tasks' ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              <ClipboardList className="h-5 w-5" />
              <span>任务</span>
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex flex-col items-center justify-center gap-1 rounded-md text-xs transition-colors ${
                activeTab === 'calendar' ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              <Calendar className="h-5 w-5" />
              <span>日历</span>
            </button>
            <button
              onClick={() => setActiveTab('nodes')}
              className={`flex flex-col items-center justify-center gap-1 rounded-md text-xs transition-colors ${
                activeTab === 'nodes' ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              <HardDrive className="h-5 w-5" />
              <span>节点</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center justify-center gap-1 rounded-md text-xs transition-colors ${
                activeTab === 'settings' ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              <Settings className="h-5 w-5" />
              <span>设置</span>
            </button>
          </div>
        </nav>
      )}
    </motion.div>
  );
};
