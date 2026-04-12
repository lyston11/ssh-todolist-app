import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, HardDrive, Terminal } from 'lucide-react';
import { formatLastUsed } from '../../lib/format';
import { useConnection } from '../../state/ConnectionContext';

interface WelcomeViewProps {
  onNext: () => void;
  onLocal: () => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onNext, onLocal }) => {
  const { recentNodes, connect } = useConnection();

  const handleReconnect = async (serverUrl: string) => {
    try {
      await connect(serverUrl);
    } catch {
      onNext();
    }
  };

  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mx-auto flex w-full max-w-[520px] flex-1 flex-col px-4 py-6"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#181b1f] text-emerald-400">
          <Terminal className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">SSH Todo</h1>
          <p className="mt-1 text-sm text-slate-400">连接你的同步节点，或者先在本地模式开始使用。</p>
        </div>
      </div>

      {recentNodes.length > 0 ? (
        <div className="space-y-6">
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white">最近使用的节点</h2>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#181b1f] divide-y divide-white/10">
              {recentNodes.slice(0, 3).map((node) => (
                <button
                  key={node.id}
                  onClick={() => void handleReconnect(node.ip)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${node.status === 'online' ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-white">{node.name}</div>
                      <div className="truncate text-xs text-slate-400">{node.ip}</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-slate-500">{formatLastUsed(node.lastUsed)}</div>
                    <div className="mt-1 text-xs text-slate-600">{node.latency !== '-' ? node.latency : '最近连接'}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white">继续操作</h2>
            <div className="grid gap-2">
              <button
                onClick={onNext}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-500 text-sm font-medium text-black transition-colors hover:bg-emerald-400"
              >
                配置新节点
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={onLocal}
                className="inline-flex h-11 items-center justify-center rounded-md border border-white/10 bg-[#181b1f] text-sm text-slate-200 transition-colors hover:bg-white/5"
              >
                仅使用本地模式
              </button>
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-xl border border-white/10 bg-[#181b1f] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#111315] text-slate-300">
                <HardDrive className="h-5 w-5" />
              </div>
              <div className="space-y-2 text-sm text-slate-400">
                <p>你可以先连接同一 Tailscale 网络里的同步服务，再在多设备之间同步任务。</p>
                <p>如果现在还没有准备好节点，也可以先进入本地模式，之后再补接入。</p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white">开始使用</h2>
            <div className="grid gap-2">
              <button
                onClick={onNext}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-500 text-sm font-medium text-black transition-colors hover:bg-emerald-400"
              >
                接入同步节点
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={onLocal}
                className="inline-flex h-11 items-center justify-center rounded-md border border-white/10 bg-[#181b1f] text-sm text-slate-200 transition-colors hover:bg-white/5"
              >
                先进入本地模式
              </button>
            </div>
          </section>
        </div>
      )}
    </motion.div>
  );
};
