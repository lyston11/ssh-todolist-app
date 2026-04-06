export function formatLastUsed(lastUsed: string) {
  const parsed = new Date(lastUsed);
  if (Number.isNaN(parsed.getTime())) {
    return lastUsed;
  }

  return parsed.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}
