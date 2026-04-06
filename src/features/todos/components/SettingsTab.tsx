import React from 'react';
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

  return (
    <div className="space-y-6 pb-10">
      {message && (
        <section className="rounded-[24px] border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="text-xs font-semibold text-emerald-400">操作反馈</div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-300">{message}</p>
        </section>
      )}

      <section className="space-y-3">
        <div className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">当前连接</div>
        <div className="flex items-center justify-between rounded-[24px] border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
              <HardDrive className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{activeNode?.name || '未连接节点'}</h3>
              <p className="text-[10px] font-mono text-slate-500">{activeNode ? getNodeAddressLabel(activeNode) : '等待导入配置'}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-1.5">
              <div className={`h-1.5 w-1.5 rounded-full ${status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-[10px] font-bold uppercase text-emerald-500">
                {isLocalNode(activeNode) ? '本地模式' : status === 'online' ? '已连接' : '未连接'}
              </span>
            </div>
            {activeNode && (
              <button
                onClick={onDisconnect}
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-rose-400 transition-colors hover:text-rose-300"
              >
                <Unplug className="h-3.5 w-3.5" />
                {isLocalNode(activeNode) ? '退出本地模式' : '断开'}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">节点配置</div>
        <div className="overflow-hidden rounded-[24px] border border-white/5 bg-white/5">
          <button
            onClick={onOpenNodeSettings}
            className="flex w-full items-center justify-between border-b border-white/5 p-5 text-left transition-colors hover:bg-white/5"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-400">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">地址与令牌</div>
                <div className="text-[10px] text-slate-500">修改节点 IP、MagicDNS 地址或访问 Token</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-600" />
          </button>
          <div className="grid grid-cols-2 gap-2 p-4">
            <button
              onClick={onScanImport}
              disabled={busyAction !== null}
              className="flex flex-col items-start gap-2 rounded-xl bg-white/5 p-4 transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              <QrCode className="h-5 w-5 text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                {busyAction === 'scan' ? '扫描中...' : '扫码导入'}
              </span>
            </button>
            <button
              onClick={onPasteImport}
              disabled={busyAction !== null}
              className="flex flex-col items-start gap-2 rounded-xl bg-white/5 p-4 transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              <ClipboardList className="h-5 w-5 text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                {busyAction === 'paste' ? '导入中...' : '剪贴板导入'}
              </span>
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">网络诊断</div>
        <button
          onClick={onOpenNetwork}
          className="flex w-full items-center justify-between rounded-[24px] border border-white/5 bg-white/5 p-5 text-left transition-colors hover:bg-white/10"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-400">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">Tailscale 检测</div>
              <div className="text-[10px] text-slate-500">检查本机网络、Tailscale 接口和候选节点</div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-600" />
        </button>
      </section>

      <section className="space-y-3">
        <div className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">清单管理</div>
        <button
          onClick={onOpenListManager}
          className="flex w-full items-center justify-between rounded-[24px] border border-white/5 bg-white/5 p-5 text-left transition-colors hover:bg-white/10"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-400">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">任务清单</div>
              <div className="text-[10px] text-slate-500">
                当前 {lists.length} 个清单 · 活跃清单 {activeList?.title || '未选择'}
              </div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-600" />
        </button>
      </section>

      <section className="space-y-3">
        <div className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">最近连接</div>
        <div className="overflow-hidden rounded-[24px] border border-white/5 bg-white/5 divide-y divide-white/5">
          {recentNodes.length > 0 ? (
            recentNodes.map((node) => (
              <div key={node.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <History className="h-4 w-4 text-slate-600" />
                  <div>
                    <div className="text-xs font-medium text-white">{node.name}</div>
                    <div className="text-[10px] font-mono text-slate-500">{node.ip}</div>
                    <div className="text-[9px] text-slate-600">{formatLastUsed(node.lastUsed)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onReconnectNode(node.ip)}
                    className="rounded-xl bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-300 transition-colors hover:text-emerald-400"
                  >
                    回连
                  </button>
                  <button
                    onClick={() => onRemoveRecent(node.id)}
                    className="rounded-xl bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-rose-400"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-5 text-[11px] text-slate-500">还没有历史连接记录。</div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="rounded-[24px] border border-white/5 bg-white/5 p-5">
          <div className="flex items-center gap-2 text-emerald-500">
            <ShieldCheck className="h-4 w-4" />
            <h3 className="text-xs font-bold uppercase tracking-widest">同步与安全说明</h3>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            {isLocalNode(activeNode)
              ? '当前处于本地模式。任务只保存在当前设备，不会尝试推送到远程服务。'
              : '应用采用本地优先架构。任务先落本地缓存，再在检测到 Tailscale 节点可达时同步到你的私有服务端。'}
            {!isLocalNode(activeNode) && (pendingCount > 0 ? ` 当前还有 ${pendingCount} 条变更等待同步。` : ' 当前同步队列为空。')}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="overflow-hidden rounded-[24px] border border-white/5 bg-white/5 divide-y divide-white/5">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3 text-slate-400">
              <Info className="h-4 w-4" />
              <span className="text-xs font-medium">关于 SSH Todo</span>
            </div>
            <span className="text-[10px] font-mono text-slate-600">v{APP_VERSION}</span>
          </div>
          <a
            href="https://github.com/lyston11/ssh-todolist-app"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-4 transition-colors hover:bg-white/5"
          >
            <div className="flex items-center gap-3 text-slate-400">
              <Github className="h-4 w-4" />
              <span className="text-xs font-medium">开源代码仓库</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-600" />
          </a>
        </div>
      </section>
    </div>
  );
};
