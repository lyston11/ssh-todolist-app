import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Square, CheckSquare2 } from 'lucide-react';
import { TodoItem, TodoList } from '../../../types/api';
import {
  addMonths,
  buildMonthGrid,
  formatDateKeyLabel,
  formatDueDate,
  formatMonthLabel,
  getDateKeyFromTimestamp,
  getLocalDateKey,
  startOfMonth
} from '../lib/dates';

interface CalendarTabProps {
  items: TodoItem[];
  lists: TodoList[];
  onTaskPress: (task: TodoItem) => void;
  onToggleTaskCompletion: (task: TodoItem) => void;
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export const CalendarTab: React.FC<CalendarTabProps> = ({ items, lists, onTaskPress, onToggleTaskCompletion }) => {
  const todayKey = getLocalDateKey(new Date());
  const scheduledItems = useMemo(
    () =>
      items
        .filter((task) => typeof task.dueAt === 'number')
        .sort((left, right) => (left.dueAt || 0) - (right.dueAt || 0)),
    [items],
  );

  const initialSelectedKey = scheduledItems[0] ? getDateKeyFromTimestamp(scheduledItems[0].dueAt) || todayKey : todayKey;
  const [selectedDateKey, setSelectedDateKey] = useState(initialSelectedKey);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(scheduledItems[0]?.dueAt ? new Date(scheduledItems[0].dueAt) : new Date()),
  );

  useEffect(() => {
    if (!scheduledItems.length) {
      setSelectedDateKey(todayKey);
      setVisibleMonth(startOfMonth(new Date()));
      return;
    }

    const hasSelection = scheduledItems.some((task) => getDateKeyFromTimestamp(task.dueAt) === selectedDateKey);
    if (!hasSelection) {
      const nextSelectedKey = getDateKeyFromTimestamp(scheduledItems[0].dueAt) || todayKey;
      setSelectedDateKey(nextSelectedKey);
      if (scheduledItems[0].dueAt) {
        setVisibleMonth(startOfMonth(new Date(scheduledItems[0].dueAt)));
      }
    }
  }, [scheduledItems, selectedDateKey, todayKey]);

  const tasksByDay = useMemo(() => {
    const result = new Map<string, TodoItem[]>();
    scheduledItems.forEach((task) => {
      const dateKey = getDateKeyFromTimestamp(task.dueAt);
      if (!dateKey) {
        return;
      }

      const current = result.get(dateKey) || [];
      current.push(task);
      result.set(dateKey, current);
    });

    result.forEach((dayTasks) => {
      dayTasks.sort((left, right) => {
        if (left.completed !== right.completed) {
          return Number(left.completed) - Number(right.completed);
        }
        return (left.dueAt || 0) - (right.dueAt || 0);
      });
    });
    return result;
  }, [scheduledItems]);

  const selectedDayTasks = tasksByDay.get(selectedDateKey) || [];
  const overdueCount = scheduledItems.filter((task) => !task.completed && (getDateKeyFromTimestamp(task.dueAt) || '') < todayKey).length;
  const todayCount = tasksByDay.get(todayKey)?.length || 0;
  const unscheduledCount = items.filter((task) => typeof task.dueAt !== 'number').length;
  const monthGrid = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);

  return (
    <div className="space-y-6 pb-10">
      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-[24px] border border-white/5 bg-white/5 p-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">今日</div>
          <div className="mt-2 text-2xl font-bold text-white">{todayCount}</div>
          <div className="mt-1 text-[10px] text-slate-500">今天到期的任务</div>
        </div>
        <div className="rounded-[24px] border border-white/5 bg-white/5 p-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">逾期</div>
          <div className="mt-2 text-2xl font-bold text-rose-400">{overdueCount}</div>
          <div className="mt-1 text-[10px] text-slate-500">未完成且已过期</div>
        </div>
        <div className="rounded-[24px] border border-white/5 bg-white/5 p-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">待安排</div>
          <div className="mt-2 text-2xl font-bold text-sky-400">{unscheduledCount}</div>
          <div className="mt-1 text-[10px] text-slate-500">还没设日期的任务</div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/5 bg-white/5 p-5">
        <div className="mb-5 flex items-center justify-between">
          <button
            onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
            className="rounded-xl border border-white/5 bg-white/5 p-2 text-slate-400 transition-colors hover:text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <div className="text-sm font-bold text-white">{formatMonthLabel(visibleMonth)}</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Calendar View</div>
          </div>
          <button
            onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
            className="rounded-xl border border-white/5 bg-white/5 p-2 text-slate-400 transition-colors hover:text-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-2">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {monthGrid.map((date) => {
            const dateKey = getLocalDateKey(date);
            const dayTasks = tasksByDay.get(dateKey) || [];
            const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
            const isSelected = dateKey === selectedDateKey;
            const isToday = dateKey === todayKey;
            const completedCount = dayTasks.filter((task) => task.completed).length;

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDateKey(dateKey)}
                className={`min-h-16 rounded-2xl border p-2 text-left transition-all ${
                  isSelected
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : isCurrentMonth
                      ? 'border-white/5 bg-white/[0.03] hover:bg-white/10'
                      : 'border-transparent bg-transparent text-slate-700'
                }`}
              >
                <div className={`text-xs font-bold ${isToday ? 'text-emerald-400' : isCurrentMonth ? 'text-white' : 'text-slate-700'}`}>
                  {date.getDate()}
                </div>
                {dayTasks.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="text-[9px] font-bold text-slate-300">{dayTasks.length} 项</div>
                    <div className="h-1.5 rounded-full bg-white/5">
                      <div
                        className="h-1.5 rounded-full bg-emerald-500"
                        style={{ width: `${(completedCount / dayTasks.length) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-white">{formatDateKeyLabel(selectedDateKey)}</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">当日任务</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-300">
            {selectedDayTasks.length} 条
          </div>
        </div>

        {selectedDayTasks.length > 0 ? (
          selectedDayTasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              onClick={() => onTaskPress(task)}
              className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-all active:scale-[0.98] ${
                task.completed ? 'border-transparent bg-white/[0.02] opacity-60' : 'border-white/5 bg-white/5 hover:border-white/10'
              }`}
            >
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleTaskCompletion(task);
                }}
                className="flex h-6 w-6 items-center justify-center"
              >
                {task.completed ? (
                  <CheckSquare2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Square className="h-5 w-5 text-slate-500" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div className={`truncate text-sm font-medium text-white ${task.completed ? 'line-through text-slate-500' : ''}`}>
                  {task.title}
                </div>
                <div className="mt-1.5 flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                    <CalendarDays className="h-3 w-3" />
                    {formatDueDate(task.dueAt)}
                  </span>
                  {task.tag && (
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-emerald-400">
                      {task.tag}
                    </span>
                  )}
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-slate-500">
                    {lists.find((todoList) => todoList.id === task.listId)?.title || '未分组'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                <Clock3 className="h-3.5 w-3.5" />
                {task.completed ? '已完成' : '待办'}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-white/5 px-6 py-14 text-center">
            <Check className="mb-3 h-8 w-8 text-slate-700" />
            <p className="text-sm font-bold text-slate-300">这一天还没有安排任务</p>
            <p className="mt-2 max-w-[220px] text-[11px] leading-relaxed text-slate-500">
              可以去任务页编辑任务，为它设置一个截止日期，日历这里就会自动出现。
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
