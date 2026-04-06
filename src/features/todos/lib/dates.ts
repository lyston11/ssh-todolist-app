export function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDateKeyFromTimestamp(timestamp?: number | null) {
  if (typeof timestamp !== 'number') {
    return null;
  }
  return getLocalDateKey(new Date(timestamp));
}

export function formatDueDate(timestamp?: number | null) {
  if (typeof timestamp !== 'number') {
    return '';
  }

  const target = new Date(timestamp);
  const todayKey = getLocalDateKey(new Date());
  const targetKey = getLocalDateKey(target);
  if (todayKey === targetKey) {
    return '今天截止';
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (targetKey === getLocalDateKey(tomorrow)) {
    return '明天截止';
  }

  return target.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  });
}

export function toDateInputValue(timestamp?: number | null) {
  if (typeof timestamp !== 'number') {
    return '';
  }

  const target = new Date(timestamp);
  return getLocalDateKey(target);
}

export function parseDateInputToTimestamp(dateValue: string) {
  const trimmed = dateValue.trim();
  if (!trimmed) {
    return null;
  }

  const [year, month, day] = trimmed.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }

  // Store at local noon so pure date values are less sensitive to timezone shifts.
  return new Date(year, month - 1, day, 12, 0, 0, 0).getTime();
}

export function formatDateKeyLabel(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

export function formatMonthLabel(date: Date) {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long'
  });
}

export function buildMonthGrid(baseMonth: Date) {
  const firstDay = startOfMonth(baseMonth);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return current;
  });
}
