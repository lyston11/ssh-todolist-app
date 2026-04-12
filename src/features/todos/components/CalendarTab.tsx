import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckSquare2, ChevronLeft, ChevronRight, ClipboardList, Square } from 'lucide-react';
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
    <div className="space-y-4 pb-6">
      <section className="rounded-lg border border-white/10 bg-[#181b1f] px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            <div className="text-xs text-slate-500">今日</div>
            <div className="mt-1 text-sm font-medium text-white">{todayCount} 项任务</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">逾期</div>
            <div className="mt-1 text-sm font-medium text-rose-300">{overdueCount} 项未完成</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">未安排</div>
            <div className="mt-1 text-sm font-medium text-slate-200">{unscheduledCount} 项待定</div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-[#181b1f] p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-white">{formatMonthLabel(visibleMonth)}</div>
            <div className="mt-1 text-sm text-slate-400">按日期查看任务安排</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setVisibleMonth(startOfMonth(new Date()));
                setSelectedDateKey(todayKey);
              }}
              className="inline-flex h-9 items-center rounded-md border border-white/10 px-3 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              今天
            </button>
            <button
              onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-[#111315] text-slate-300 transition-colors hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-[#111315] text-slate-300 transition-colors hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-2">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="text-center text-xs text-slate-500">
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

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDateKey(dateKey)}
                className={`min-h-16 rounded-lg border p-2 text-left transition-colors ${
                  isSelected
                    ? 'border-emerald-400/40 bg-emerald-500/10'
                    : isCurrentMonth
                      ? 'border-white/10 bg-[#111315] hover:border-white/20'
                      : 'border-transparent bg-transparent text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className={`text-xs font-bold ${isToday ? 'text-emerald-400' : isCurrentMonth ? 'text-white' : 'text-slate-700'}`}>
                    {date.getDate()}
                  </div>
                  {dayTasks.length > 0 && <span className="text-[10px] text-slate-400">{dayTasks.length}</span>}
                </div>
                {dayTasks.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <span
                        key={task.id}
                        className={`h-1.5 w-1.5 rounded-full ${task.completed ? 'bg-slate-600' : 'bg-emerald-400'}`}
                      />
                    ))}
                    {dayTasks.length > 3 && <span className="text-[10px] text-slate-500">+{dayTasks.length - 3}</span>}
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
            <div className="text-base font-semibold text-white">{formatDateKeyLabel(selectedDateKey)}</div>
            <div className="text-sm text-slate-400">当天任务</div>
          </div>
          <div className="rounded-md border border-white/10 bg-[#181b1f] px-3 py-1.5 text-xs text-slate-300">
            {selectedDayTasks.length} 条
          </div>
        </div>

        {selectedDayTasks.length > 0 ? (
          selectedDayTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => onTaskPress(task)}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors ${
                task.completed ? 'border-white/5 bg-[#15181c] opacity-70' : 'border-white/10 bg-[#181b1f] hover:border-white/20'
              }`}
            >
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleTaskCompletion(task);
                }}
                className="flex h-5 w-5 items-center justify-center"
              >
                {task.completed ? (
                  <CheckSquare2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <Square className="h-5 w-5 text-slate-500" />
                )}
              </button>
              <div className="min-w-0 flex-1 space-y-2">
                <div className={`truncate text-sm font-medium text-white ${task.completed ? 'line-through text-slate-500' : ''}`}>
                  {task.title}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1">
                    <CalendarDays className="h-3 w-3" />
                    {formatDueDate(task.dueAt)}
                  </span>
                  {task.tag && <span className="rounded-md border border-white/10 px-2 py-1">{task.tag}</span>}
                  <span className="rounded-md border border-white/10 px-2 py-1">
                    {lists.find((todoList) => todoList.id === task.listId)?.title || '未分组'}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-white/10 bg-[#16181c] px-4 py-10 text-center">
            <ClipboardList className="mx-auto mb-3 h-6 w-6 text-slate-600" />
            <p className="text-sm font-medium text-white">这一天还没有安排任务</p>
            <p className="mt-2 text-sm text-slate-400">
              可以去任务页编辑任务，为它设置一个截止日期，日历这里就会自动出现。
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
