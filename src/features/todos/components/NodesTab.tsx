import React from 'react';
import { HardDrive, Globe, RefreshCw, Trash2, ShieldCheck, Plus, History } from 'lucide-react';
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
    <div className="space-y-6 pb-10">
      <section className="space-y-3">
        <div className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">当前活跃节点</div>
        <div className="relative overflow-hidden rounded-[24px] border border-emerald-500/30 bg-emerald-500/5 p-5">
          <div className="absolute right-0 top-0 p-3">
            <div className="rounded px-2 py-0.5 text-[8px] font-bold uppercase tracking-tighter text-black bg-emerald-500">
              {isLocalNode(activeNode) ? 'Local' : status === 'online' ? 'Connected' : 'Disconnected'}
            </div>
          </div>
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-500">
              <HardDrive className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{activeNode?.name || '未连接节点'}</h3>
              <p className="text-[10px] font-mono text-slate-500">{getNodeAddressLabel(activeNode)}</p>
            </div>
          </div>
          {activeNode && (
            <div className="flex items-center justify-between border-t border-white/5 pt-4">
              <div className="text-[10px] text-slate-500">
                {isLocalNode(activeNode) ? '当前工作区不依赖远程节点。' : `最近使用: ${formatLastUsed(activeNode.lastUsed)}`}
              </div>
              {!isLocalNode(activeNode) && (
                <button
                  onClick={() => onReconnect(activeNode.ip)}
                  className="rounded-xl bg-white/5 p-2 text-slate-300 transition-colors hover:text-emerald-500"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">最近连接记录</div>
        {recentNodes.length > 0 ? (
          <div className="space-y-2">
            {recentNodes.map((node) => (
              <div
                key={node.id}
                className="group flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      node.status === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
                    }`}
                  >
                    {node.hasToken ? <ShieldCheck className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{node.name}</h4>
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${
                          node.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'
                        }`}
                      />
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">{node.ip}</div>
                    <div className="text-[9px] font-bold uppercase text-slate-600">{formatLastUsed(node.lastUsed)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onReconnect(node.ip)}
                    className="rounded-xl bg-emerald-500/10 p-2 text-emerald-500 opacity-0 transition-all group-hover:opacity-100"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onRemoveRecent(node.id)}
                    className="p-2 text-slate-600 transition-colors hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/5 p-10 text-center">
            <History className="mb-3 h-8 w-8 text-slate-700" />
            <p className="text-xs text-slate-500">暂无连接记录</p>
          </div>
        )}
      </section>

      <button
        onClick={onAddNode}
        className="flex w-full items-center justify-center gap-3 rounded-[24px] border border-dashed border-emerald-500/20 p-5 text-emerald-500/60 transition-all hover:bg-emerald-500/5 hover:text-emerald-500"
      >
        <Plus className="h-5 w-5" />
        <span className="text-sm font-bold uppercase tracking-widest">添加新节点</span>
      </button>
    </div>
  );
};
