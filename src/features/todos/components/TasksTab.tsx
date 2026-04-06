import React from 'react';
import { motion } from 'motion/react';
import { CalendarDays, Check, CheckSquare, CloudUpload, Clock, Plus, RefreshCw, Square, WandSparkles } from 'lucide-react';
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
  return (
    <>
      <div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {lists.map((todoList) => (
            <button
              key={todoList.id}
              onClick={() => onSelectList(todoList.id)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                activeListId === todoList.id
                  ? 'border border-white/20 bg-white/10 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {todoList.title}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => onSelectCategory('all')}
            className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all ${
              categoryFilter === 'all'
                ? 'border border-white/20 bg-white/10 text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            全部分类
          </button>
          {availableTaskTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onSelectCategory(tag)}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all ${
                categoryFilter === tag
                  ? 'bg-emerald-500 text-black'
                  : 'border border-white/5 bg-white/5 text-slate-500'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex rounded-xl border border-white/5 bg-white/5 p-1">
            {(['all', 'active', 'completed'] as const).map((filterValue) => (
              <button
                key={filterValue}
                onClick={() => onSelectTaskFilter(filterValue)}
                className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all ${
                  taskFilter === filterValue ? 'bg-emerald-500 text-black' : 'text-slate-500'
                }`}
              >
                {filterValue === 'all' ? '全部' : filterValue === 'active' ? '进行中' : '已完成'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1">
                <CloudUpload className="h-3 w-3 text-amber-500" />
                <span className="text-[9px] font-bold text-amber-500">{pendingCount}</span>
              </div>
            )}
            {isSyncing && <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-500" />}
            <button
              onClick={onToggleBatchMode}
              className={`rounded-xl border px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                isBatchMode
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                  : 'border-white/10 bg-white/5 text-slate-300'
              }`}
            >
              {isBatchMode ? '完成选择' : '批量处理'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2 pb-32">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            const isSelected = selectedTaskIds.has(task.id);
            return (
              <motion.div
                key={task.id}
                layout
                onClick={() => onTaskPress(task)}
                className={`group flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-all active:scale-[0.98] ${
                  isBatchMode && isSelected
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : task.completed
                      ? 'border-transparent bg-white/[0.02] opacity-60'
                      : 'border-white/5 bg-white/5 hover:border-white/10'
                }`}
              >
                {isBatchMode ? (
                  <div className="flex h-6 w-6 items-center justify-center">
                    {isSelected ? (
                      <CheckSquare className="h-5 w-5 text-emerald-500" />
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
                    className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-all ${
                      task.completed
                        ? 'border-emerald-500 bg-emerald-500'
                        : 'border-slate-700 group-hover:border-emerald-500/50'
                    }`}
                  >
                    {task.completed && <Check className="h-3.5 w-3.5 text-black" />}
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className={`truncate text-sm font-medium text-white ${task.completed ? 'text-slate-500 line-through' : ''}`}>
                    {task.title}
                  </h3>
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                      <Clock className="h-3 w-3" />
                      {task.completedAt ? '已完成' : '待处理'}
                    </span>
                    {task.tag && (
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-emerald-400">
                        {task.tag}
                      </span>
                    )}
                    {task.dueAt && (
                      <span className="flex items-center gap-1 rounded bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-sky-400">
                        <CalendarDays className="h-3 w-3" />
                        {formatDueDate(task.dueAt)}
                      </span>
                    )}
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-slate-500">
                      {lists.find((todoList) => todoList.id === task.listId)?.title || '未分组'}
                    </span>
                    {task.isPending && (
                      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-amber-500">
                        待同步
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-white/5 px-6 py-16 text-center">
            <WandSparkles className="mb-3 h-8 w-8 text-slate-700" />
            <p className="text-sm font-bold text-slate-300">当前筛选下没有任务</p>
            <p className="mt-2 max-w-[220px] text-[11px] leading-relaxed text-slate-500">
              可以切换清单、分类或状态筛选，也可以直接新建一条任务。
            </p>
          </div>
        )}
      </div>

      {!isBatchMode && (
        <button
          onClick={onOpenNewTask}
          className="fixed bottom-24 right-6 z-30 flex h-16 w-16 items-center justify-center rounded-[24px] bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 transition-transform active:scale-90"
        >
          <Plus className="h-8 w-8" />
        </button>
      )}
    </>
  );
};
