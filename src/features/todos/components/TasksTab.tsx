import React from 'react';
import { CalendarDays, Check, CheckSquare, ClipboardList, CloudUpload, Plus, RefreshCw, Square } from 'lucide-react';
import { TodoItem, TodoList } from '../../../types/api';
import { formatDueDate } from '../lib/dates';

interface TasksTabProps {
  lists: TodoList[];
  activeListId: string;
  onSelectList: (id: string) => void;
  availableTaskTags: string[];
  categoryFilter: string;
  onSelectCategory: (value: string) => void;
  taskFilter: 'all' | 'active' | 'completed';
  onSelectTaskFilter: (value: 'all' | 'active' | 'completed') => void;
  pendingCount: number;
  isSyncing: boolean;
  filteredTasks: TodoItem[];
  isBatchMode: boolean;
  selectedTaskIds: ReadonlySet<string>;
  onToggleBatchMode: () => void;
  onTaskPress: (task: TodoItem) => void;
  onToggleTaskCompletion: (task: TodoItem) => void;
  onOpenNewTask: () => void;
}

export const TasksTab: React.FC<TasksTabProps> = ({
  lists,
  activeListId,
  onSelectList,
  availableTaskTags,
  categoryFilter,
  onSelectCategory,
  taskFilter,
  onSelectTaskFilter,
  pendingCount,
  isSyncing,
  filteredTasks,
  isBatchMode,
  selectedTaskIds,
  onToggleBatchMode,
  onTaskPress,
  onToggleTaskCompletion,
  onOpenNewTask
}) => {
  const activeCount = filteredTasks.filter((task) => !task.completed).length;
  const completedCount = filteredTasks.length - activeCount;

  return (
    <div className="space-y-4">
      <section className="overflow-x-auto border-b border-white/10 pb-1 no-scrollbar">
        <div className="flex min-w-max gap-4">
          {lists.map((todoList) => (
            <button
              key={todoList.id}
              onClick={() => onSelectList(todoList.id)}
              className={`border-b-2 px-1 pb-2 text-sm transition-colors ${
                activeListId === todoList.id
                  ? 'border-emerald-400 text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {todoList.title}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-white/10 bg-[#181b1f] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md bg-[#111315] p-1">
            {(['all', 'active', 'completed'] as const).map((filterValue) => (
              <button
                key={filterValue}
                onClick={() => onSelectTaskFilter(filterValue)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  taskFilter === filterValue ? 'bg-[#23272d] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {filterValue === 'all' ? '全部' : filterValue === 'active' ? '进行中' : '已完成'}
              </button>
            ))}
          </div>
          <button
            onClick={onToggleBatchMode}
            className={`ml-auto rounded-md border px-3 py-1.5 text-sm transition-colors ${
              isBatchMode
                ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
                : 'border-white/10 text-slate-300 hover:bg-white/5'
            }`}
          >
            {isBatchMode ? '结束批量' : '批量处理'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onSelectCategory('all')}
            className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
              categoryFilter === 'all'
                ? 'border-white/20 bg-white/10 text-white'
                : 'border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            全部分类
          </button>
          {availableTaskTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onSelectCategory(tag)}
              className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                categoryFilter === tag
                  ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-3 text-xs text-slate-400">
          <span>当前 {filteredTasks.length} 项</span>
          <span>进行中 {activeCount} 项</span>
          <span>已完成 {completedCount} 项</span>
          {pendingCount > 0 && (
            <div className="inline-flex items-center gap-1.5 text-amber-300">
              <CloudUpload className="h-3.5 w-3.5" />
              <span>{pendingCount} 条待同步</span>
            </div>
          )}
          {isSyncing && (
            <div className="inline-flex items-center gap-1.5 text-emerald-300">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>正在同步</span>
            </div>
          )}
          {!pendingCount && !isSyncing && <span>列表会在连接恢复后自动同步。</span>}
        </div>
      </section>

      <section className="space-y-2 pb-6">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            const isSelected = selectedTaskIds.has(task.id);
            const listTitle = lists.find((todoList) => todoList.id === task.listId)?.title || '未分组';
            return (
              <div
                key={task.id}
                onClick={() => onTaskPress(task)}
                className={`group flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors ${
                  isBatchMode && isSelected
                    ? 'border-emerald-400/40 bg-emerald-500/10'
                    : task.completed
                      ? 'border-white/5 bg-[#15181c] opacity-70'
                      : 'border-white/10 bg-[#181b1f] hover:border-white/20'
                }`}
              >
                {isBatchMode ? (
                  <div className="flex h-6 w-6 items-center justify-center pt-0.5">
                    {isSelected ? (
                      <CheckSquare className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <Square className="h-5 w-5 text-slate-500" />
                    )}
                  </div>
                ) : (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleTaskCompletion(task);
                    }}
                    className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                      task.completed
                        ? 'border-emerald-400 bg-emerald-400 text-black'
                        : 'border-slate-600 text-transparent group-hover:border-emerald-400'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`min-w-0 text-sm font-medium ${task.completed ? 'text-slate-500 line-through' : 'text-white'}`}>
                      {task.title}
                    </div>
                    <span className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-400">
                      {listTitle}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>{task.completedAt ? '已完成' : '待处理'}</span>
                    {task.dueAt && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDueDate(task.dueAt)}
                      </span>
                    )}
                    {task.tag && <span className="rounded-md border border-white/10 px-2 py-1">{task.tag}</span>}
                    {task.isPending && <span className="text-amber-300">待同步</span>}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-lg border border-dashed border-white/10 bg-[#16181c] px-4 py-10 text-center">
            <ClipboardList className="mx-auto mb-3 h-6 w-6 text-slate-600" />
            <p className="text-sm font-medium text-white">当前筛选下没有任务</p>
            <p className="mt-2 text-sm text-slate-400">调整筛选，或者直接新建一条任务。</p>
            <button
              onClick={onOpenNewTask}
              className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md border border-white/10 px-3 text-sm text-slate-200 transition-colors hover:bg-white/5"
            >
              <Plus className="h-4 w-4" />
              新建任务
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
