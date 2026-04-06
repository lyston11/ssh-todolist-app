import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Activity, Calendar, ClipboardList, HardDrive, RefreshCw, Settings, ShieldCheck, Wifi } from 'lucide-react';
import { useConnection } from '../../state/ConnectionContext';
import { useTodo } from '../../state/TodoContext';
import { nativeBridge } from '../../lib/bridge';
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
import { useTaskEditor } from './hooks/useTaskEditor';

interface MainAppViewProps {
  onSettings: () => void;
  onNetwork: () => void;
}

const DEFAULT_TASK_TAGS = ['工作', '私人', '系统', '购物'] as const;

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
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isMoveSheetOpen, setIsMoveSheetOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isListManagerOpen, setIsListManagerOpen] = useState(false);
  const [settingsBusyAction, setSettingsBusyAction] = useState<string | null>(null);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

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

  const selectedTaskIdSet = useMemo(() => new Set(selectedTaskIds), [selectedTaskIds]);

  useEffect(() => {
    if (activeTab !== 'tasks' && isBatchMode) {
      setIsBatchMode(false);
      setSelectedTaskIds([]);
    }
  }, [activeTab, isBatchMode]);

  useEffect(() => {
    setSelectedTaskIds((currentSelection) =>
      currentSelection.filter((id) => items.some((todo) => todo.id === id)),
    );
  }, [items]);

  const toggleBatchMode = () => {
    setIsBatchMode((currentValue) => !currentValue);
    setSelectedTaskIds([]);
  };

  const toggleTaskSelection = (id: string) => {
    setSelectedTaskIds((currentSelection) =>
      currentSelection.includes(id)
        ? currentSelection.filter((selectedId) => selectedId !== id)
        : [...currentSelection, id],
    );
  };

  const resetBatchState = () => {
    setIsBatchMode(false);
    setSelectedTaskIds([]);
    setIsMoveSheetOpen(false);
    setIsDeleteConfirmOpen(false);
  };

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

  const handleReconnect = async (url: string) => {
    setSettingsMessage(null);
    try {
      setSettingsBusyAction('reconnect');
      await connect(url);
      setSettingsMessage('已发起节点连接。');
    } catch (error: any) {
      setSettingsMessage(error?.message || '节点连接失败，请重新检查配置。');
    } finally {
      setSettingsBusyAction(null);
    }
  };

  const handlePasteImport = async () => {
    setSettingsMessage(null);
    try {
      setSettingsBusyAction('paste');
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        throw new Error('剪贴板里没有可导入的配置内容');
      }
      await importConfig(text);
      setSettingsMessage('剪贴板配置已导入，正在尝试连接节点。');
    } catch (error: any) {
      setSettingsMessage(error?.message || '剪贴板导入失败');
    } finally {
      setSettingsBusyAction(null);
    }
  };

  const handleScanImport = async () => {
    setSettingsMessage(null);
    try {
      setSettingsBusyAction('scan');
      const text = await nativeBridge.scanQrCode();
      if (!text) {
        throw new Error('未读取到二维码内容');
      }
      await importConfig(text);
      setSettingsMessage('二维码配置已导入，正在尝试连接节点。');
    } catch (error: any) {
      setSettingsMessage(error?.message || '扫码导入失败');
    } finally {
      setSettingsBusyAction(null);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setSettingsMessage('已断开当前节点连接，本地缓存仍然保留。');
  };

  const handleCreateList = async (title: string) => {
    setSettingsMessage(null);
    await createList(title);
    setSettingsMessage(`已新增清单：${title.trim()}`);
  };

  const handleRenameList = async (listId: string, title: string) => {
    setSettingsMessage(null);
    await updateList(listId, title);
    setSettingsMessage(`已更新清单名称：${title.trim()}`);
  };

  const handleDeleteList = async (listId: string) => {
    setSettingsMessage(null);
    const target = lists.find((todoList) => todoList.id === listId);
    try {
      await deleteList(listId);
      setSettingsMessage(`已删除清单：${target?.title || '未命名清单'}`);
    } catch (error: any) {
      setSettingsMessage(error?.message || '删除清单失败');
      throw error;
    }
  };

  const headerTitle =
    activeTab === 'tasks' ? '任务首页' : activeTab === 'nodes' ? '节点管理' : activeTab === 'calendar' ? '日历视图' : '设置';

  return (
    <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative flex max-w-md flex-1 flex-col mx-auto w-full">
      <AnimatePresence mode="wait">
        {status === 'reconnecting' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="z-30 flex items-center justify-center gap-3 border-b border-emerald-500/20 bg-emerald-500/10 px-6 py-2.5"
          >
            <RefreshCw className="h-3 w-3 animate-spin text-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">正在尝试重新连接节点...</span>
          </motion.div>
        )}
        {status === 'offline' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="z-30 flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-6 py-2.5"
          >
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-500">
              <Wifi className="h-3 w-3" /> {isLocalNode(activeNode) ? '本地模式 · 数据仅保存在当前设备' : '离线模式 · 本地缓存已启用'}
            </div>
          </motion.div>
        )}
        {status === 'token-error' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="z-30 flex items-center justify-between border-b border-rose-500/20 bg-rose-500/10 px-6 py-3"
          >
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-rose-500">
              <ShieldCheck className="h-3 w-3" /> 访问令牌已失效
            </div>
            <button
              onClick={onSettings}
              className="rounded-lg bg-rose-500 px-3 py-1 text-[9px] font-bold uppercase text-white"
            >
              去设置
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#121212]/95 p-6 pb-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight text-white">{headerTitle}</h1>
            <div className="mt-1 flex items-center gap-2">
              <div className={`h-1.5 w-1.5 rounded-full ${status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
              <span className="text-[10px] font-mono text-slate-500">
                {getNodeStatusLabel(activeNode, status)}
              </span>
            </div>
          </div>
          <button onClick={onNetwork} className="rounded-xl border border-white/5 bg-white/5 p-2 text-slate-400">
            <Activity className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-32">
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
            <motion.div key="nodes-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
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
            <motion.div key="settings-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
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
            <motion.div
              key="calendar-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
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

      <TaskMoveSheet open={isMoveSheetOpen} lists={lists} onClose={() => setIsMoveSheetOpen(false)} onMove={handleBatchMove} />
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
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleBatchDelete}
      />

      <AnimatePresence>{isBatchMode && <TaskBatchBar selectedCount={selectedTaskIds.length} onComplete={handleBatchComplete} onMove={() => setIsMoveSheetOpen(true)} onDelete={() => setIsDeleteConfirmOpen(true)} onCancel={resetBatchState} />}</AnimatePresence>

      {!isBatchMode && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-20 items-center justify-between border-t border-white/5 bg-[#121212]/90 px-6 backdrop-blur-xl">
          <button onClick={() => setActiveTab('tasks')} className={`flex flex-col items-center gap-1 ${activeTab === 'tasks' ? 'text-emerald-500' : 'text-slate-500'}`}>
            <ClipboardList className="h-6 w-6" />
            <span className="text-[8px] font-bold uppercase tracking-tighter">Tasks</span>
          </button>
          <button onClick={() => setActiveTab('calendar')} className={`flex flex-col items-center gap-1 ${activeTab === 'calendar' ? 'text-emerald-500' : 'text-slate-500'}`}>
            <Calendar className="h-6 w-6" />
            <span className="text-[8px] font-bold uppercase tracking-tighter">Plan</span>
          </button>
          <button onClick={() => setActiveTab('nodes')} className={`flex flex-col items-center gap-1 ${activeTab === 'nodes' ? 'text-emerald-500' : 'text-slate-500'}`}>
            <HardDrive className="h-6 w-6" />
            <span className="text-[8px] font-bold uppercase tracking-tighter">Nodes</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 ${activeTab === 'settings' ? 'text-emerald-500' : 'text-slate-500'}`}>
            <Settings className="h-6 w-6" />
            <span className="text-[8px] font-bold uppercase tracking-tighter">Setup</span>
          </button>
        </nav>
      )}
    </motion.div>
  );
};
