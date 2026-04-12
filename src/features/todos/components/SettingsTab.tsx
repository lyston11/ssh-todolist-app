import React, { ReactNode } from 'react';
import {
  Activity,
  ChevronRight,
  ClipboardList,
  FolderKanban,
  Github,
  Globe,
  HardDrive,
  History,
  Info,
  QrCode,
  ShieldCheck,
  Unplug
} from 'lucide-react';
import { APP_VERSION } from '../../../config/app';
import { formatLastUsed } from '../../../lib/format';
import { getNodeAddressLabel, isLocalNode } from '../../../lib/nodes';
import { RecentNode } from '../../../lib/storage';
import { ConnectionStatus, TodoList } from '../../../types/api';

interface SettingsTabProps {
  status: ConnectionStatus;
  activeNode: RecentNode | null;
  recentNodes: RecentNode[];
  lists: TodoList[];
  activeListId: string;
  pendingCount: number;
  busyAction: string | null;
  message: string | null;
  onOpenNodeSettings: () => void;
  onOpenNetwork: () => void;
  onOpenListManager: () => void;
  onPasteImport: () => void;
  onScanImport: () => void;
  onReconnectNode: (url: string) => void;
  onRemoveRecent: (id: string) => void;
  onDisconnect: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  status,
  activeNode,
  recentNodes,
  lists,
  activeListId,
  pendingCount,
  busyAction,
  message,
  onOpenNodeSettings,
  onOpenNetwork,
  onOpenListManager,
  onPasteImport,
  onScanImport,
  onReconnectNode,
  onRemoveRecent,
  onDisconnect
}) => {
  const activeList = lists.find((todoList) => todoList.id === activeListId);
  const syncSummary = isLocalNode(activeNode)
    ? '当前处于本地模式，任务只保存在当前设备。'
    : pendingCount > 0
      ? `当前有 ${pendingCount} 条变更等待同步。`
      : '当前没有待同步的数据。';

  return (
    <div className="space-y-4 pb-6">
      {message && (
        <section className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-200">
          {message}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-white">当前连接</h2>
        <div className="rounded-lg border border-white/10 bg-[#181b1f] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <HardDrive className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-medium text-white">{activeNode?.name || '未连接节点'}</h3>
                <p className="mt-1 truncate text-xs text-slate-400">{activeNode ? getNodeAddressLabel(activeNode) : '等待导入配置'}</p>
              </div>
            </div>
            <div className="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300">
              {isLocalNode(activeNode) ? '本地模式' : status === 'online' ? '已连接' : '未连接'}
            </div>
          </div>

          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="text-sm leading-6 text-slate-400">{syncSummary}</p>
            {activeNode && (
              <button
                onClick={onDisconnect}
                className="mt-3 inline-flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-rose-200 transition-colors hover:bg-rose-500/10"
              >
                <Unplug className="h-3.5 w-3.5" />
                {isLocalNode(activeNode) ? '退出本地模式' : '断开连接'}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-white">连接与导入</h2>
        <div className="overflow-hidden rounded-lg border border-white/10 bg-[#181b1f]">
          <SettingsRow
            icon={<Globe className="h-4 w-4" />}
            title="节点地址与令牌"
            description="手动填写 Tailscale 地址和短 token"
            onClick={onOpenNodeSettings}
          />
          <SettingsRow
            icon={<QrCode className="h-4 w-4" />}
            title={busyAction === 'scan' ? '扫描中…' : '扫码导入'}
            description="从服务端二维码接入"
            onClick={onScanImport}
            disabled={busyAction !== null}
          />
          <SettingsRow
            icon={<ClipboardList className="h-4 w-4" />}
            title={busyAction === 'paste' ? '导入中…' : '剪贴板导入'}
            description="导入链接或配置文本"
            onClick={onPasteImport}
            disabled={busyAction !== null}
          />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-white">网络与数据</h2>
        <div className="overflow-hidden rounded-lg border border-white/10 bg-[#181b1f]">
          <SettingsRow
            icon={<Activity className="h-4 w-4" />}
            title="网络诊断"
            description="查看本机网络信息和候选节点"
            onClick={onOpenNetwork}
          />
          <SettingsRow
            icon={<FolderKanban className="h-4 w-4" />}
            title="清单管理"
            description={`当前 ${lists.length} 个清单，活跃清单 ${activeList?.title || '未选择'}`}
            onClick={onOpenListManager}
          />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-white">最近连接</h2>
        <div className="overflow-hidden rounded-lg border border-white/10 bg-[#181b1f] divide-y divide-white/10">
          {recentNodes.length > 0 ? (
            recentNodes.map((node) => (
              <div key={node.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex items-center gap-3">
                  <History className="h-4 w-4 shrink-0 text-slate-500" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-white">{node.name}</div>
                    <div className="truncate text-xs text-slate-400">{node.ip}</div>
                    <div className="text-xs text-slate-500">{formatLastUsed(node.lastUsed)}</div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => onReconnectNode(node.ip)}
                    className="rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-slate-200 transition-colors hover:bg-white/5"
                  >
                    回连
                  </button>
                  <button
                    onClick={() => onRemoveRecent(node.id)}
                    className="rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:bg-white/5 hover:text-rose-300"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-5 text-sm text-slate-400">还没有历史连接记录。</div>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-white">关于</h2>
        <div className="overflow-hidden rounded-lg border border-white/10 bg-[#181b1f] divide-y divide-white/10">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3 text-slate-300">
              <Info className="h-4 w-4" />
              <span className="text-sm font-medium">SSH Todo</span>
            </div>
            <span className="text-xs text-slate-500">v{APP_VERSION}</span>
          </div>
          <div className="flex items-start gap-3 px-4 py-3 text-slate-300">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <div>
              <div className="text-sm font-medium text-white">同步方式</div>
              <div className="mt-1 text-xs leading-6 text-slate-400">本地优先，连接恢复后自动同步到你的私有服务端。</div>
            </div>
          </div>
          <a
            href="https://github.com/lyston11/ssh-todolist-app"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/5"
          >
            <div className="flex items-center gap-3 text-slate-300">
              <Github className="h-4 w-4" />
              <span className="text-sm font-medium">开源代码仓库</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </a>
        </div>
      </section>
    </div>
  );
};

interface SettingsRowProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}

const SettingsRow: React.FC<SettingsRowProps> = ({ icon, title, description, onClick, disabled = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-white/5 disabled:opacity-50"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#111315] text-slate-300">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-white">{title}</div>
          <div className="mt-1 truncate text-xs text-slate-400">{description}</div>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
    </button>
  );
};
