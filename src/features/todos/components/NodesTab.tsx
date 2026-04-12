import React from 'react';
import { HardDrive, Globe, RefreshCw, ShieldCheck, Plus, History } from 'lucide-react';
import { formatLastUsed } from '../../../lib/format';
import { getNodeAddressLabel, isLocalNode } from '../../../lib/nodes';
import { RecentNode } from '../../../lib/storage';
import { ConnectionStatus } from '../../../types/api';

interface NodesTabProps {
  status: ConnectionStatus;
  activeNode: RecentNode | null;
  recentNodes: RecentNode[];
  onReconnect: (url: string) => void;
  onRemoveRecent: (id: string) => void;
  onAddNode: () => void;
}

export const NodesTab: React.FC<NodesTabProps> = ({
  status,
  activeNode,
  recentNodes,
  onReconnect,
  onRemoveRecent,
  onAddNode
}) => {
  return (
    <div className="space-y-4 pb-6">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-white">当前节点</h2>
        <div className="rounded-lg border border-white/10 bg-[#181b1f] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <HardDrive className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-medium text-white">{activeNode?.name || '未连接节点'}</h3>
                <p className="mt-1 truncate text-xs text-slate-400">{getNodeAddressLabel(activeNode)}</p>
              </div>
            </div>
            <div className="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300">
              {isLocalNode(activeNode) ? '本地模式' : status === 'online' ? '已连接' : '未连接'}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs text-slate-400">
            <span>
              {activeNode
                ? isLocalNode(activeNode)
                  ? '当前工作区不依赖远程节点。'
                  : `最近使用 ${formatLastUsed(activeNode.lastUsed)}`
                : '还没有配置远程节点。'}
            </span>
            <div className="flex items-center gap-2">
              {activeNode && !isLocalNode(activeNode) && (
                <button
                  onClick={() => onReconnect(activeNode.ip)}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-slate-200 transition-colors hover:bg-white/5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  重新连接
                </button>
              )}
              <button
                onClick={onAddNode}
                className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-slate-200 transition-colors hover:bg-white/5"
              >
                <Plus className="h-3.5 w-3.5" />
                添加节点
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-white">最近连接记录</h2>
        {recentNodes.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-white/10 bg-[#181b1f] divide-y divide-white/10">
            {recentNodes.map((node) => (
              <div
                key={node.id}
                className="group flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      node.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#111315] text-slate-400'
                    }`}
                  >
                    {node.hasToken ? <ShieldCheck className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate text-sm font-medium text-white">{node.name}</h4>
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${
                          node.status === 'online' ? 'bg-emerald-400' : 'bg-slate-600'
                        }`}
                      />
                    </div>
                    <div className="truncate text-xs text-slate-400">{node.ip}</div>
                    <div className="text-xs text-slate-500">{formatLastUsed(node.lastUsed)}</div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => onReconnect(node.ip)}
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
            ))}
          </div>
        ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-[#16181c] p-8 text-center">
              <History className="mx-auto mb-3 h-6 w-6 text-slate-600" />
              <p className="text-sm text-slate-400">暂无连接记录</p>
            </div>
          )}
      </section>
    </div>
  );
};
