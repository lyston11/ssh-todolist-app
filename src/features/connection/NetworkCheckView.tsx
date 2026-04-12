import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { useConnection } from '../../state/ConnectionContext';
import { isLocalNode } from '../../lib/nodes';
import { nativeBridge, NetworkInfo } from '../../lib/bridge';

interface NetworkCheckViewProps {
  onBack: () => void;
  onSelect: (url: string) => void;
}

export const NetworkCheckView: React.FC<NetworkCheckViewProps> = ({ onBack, onSelect }) => {
  const { candidates, fetchCandidates, status, activeNode } = useConnection();
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const detect = async () => {
    setIsDetecting(true);
    try {
      const info = await nativeBridge.getNetworkInfo();
      setNetworkInfo(info);
      if (status === 'online' && activeNode && !isLocalNode(activeNode)) {
        await fetchCandidates();
      }
    } finally {
      setIsDetecting(false);
    }
  };

  useEffect(() => {
    void detect();
  }, [activeNode, status]);

  const canShowServiceCandidates = Boolean(activeNode && !isLocalNode(activeNode) && status === 'online');
  const candidatesHint = canShowServiceCandidates
    ? '这些地址来自当前已连接服务的 /api/meta。点任一地址后，会自动带入节点设置页。'
    : isLocalNode(activeNode)
      ? '当前处于本地模式，还没有连接远程服务，所以拿不到服务端候选地址。'
      : '先连接任意一个远程服务，之后这里才能看到服务端返回的候选地址。';

  return (
    <motion.div
      key="network-check"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mx-auto flex w-full max-w-[520px] flex-1 flex-col"
    >
      <header className="border-b border-white/10 bg-[#111315] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-base font-semibold text-white">网络诊断</h1>
              <p className="mt-1 text-sm text-slate-400">查看当前设备的网络信息，以及服务端提供的候选地址。</p>
            </div>
          </div>
          <button
            onClick={detect}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${isDetecting ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        <section className="rounded-xl border border-white/10 bg-[#181b1f] p-4">
          <div>
            <h2 className="text-sm font-medium text-white">本机网络信息</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Web 环境下无法完全读取本机 Tailscale 信息，Android 原生应用里会显示更完整的结果。
            </p>
          </div>

          <div className="mt-4 divide-y divide-white/10 rounded-lg border border-white/10 bg-[#111315]">
            <div className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="text-sm text-slate-400">局域网接口</div>
              <div className="max-w-[60%] text-right text-sm text-white">{networkInfo?.wifi || '读取中…'}</div>
            </div>
            <div className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="text-sm text-slate-400">Tailscale</div>
              <div className="max-w-[60%] text-right text-sm text-white">{networkInfo?.tailscale || '读取中…'}</div>
            </div>
            <div className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="text-sm text-slate-400">本机地址</div>
              <div className="max-w-[60%] text-right text-sm text-white">{networkInfo?.localIp || '读取中…'}</div>
            </div>
          </div>
        </section>

        <section className="mt-4 space-y-3">
          <div>
            <h2 className="text-sm font-medium text-white">候选连接地址</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">{candidatesHint}</p>
          </div>

          {canShowServiceCandidates && candidates.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#181b1f] divide-y divide-white/10">
              {candidates.map((node) => (
                <button
                  key={node.id}
                  onClick={() => onSelect(node.serverUrl)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white">{node.name}</div>
                    <div className="mt-1 truncate text-xs text-slate-400">{node.serverUrl}</div>
                    <div className="mt-1 truncate text-xs text-slate-500">{node.wsUrl}</div>
                    <div className="mt-1 text-xs text-slate-600">
                      {node.kind} · {node.source}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div
                      className={`text-xs ${
                        node.status === 'connectable'
                          ? 'text-emerald-300'
                          : node.status === 'needs-token'
                            ? 'text-amber-300'
                            : 'text-slate-400'
                      }`}
                    >
                      {node.status === 'connectable' ? '可连接' : node.status === 'needs-token' ? '需要 token' : '不可达'}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">带入地址</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-[#16181c] px-4 py-8 text-center text-sm text-slate-400">
              {canShowServiceCandidates ? '当前服务没有返回候选地址。' : '当前还不能拉取候选地址。'}
            </div>
          )}
        </section>
      </main>
    </motion.div>
  );
};
