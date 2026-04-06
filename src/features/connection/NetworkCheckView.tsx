import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, RefreshCw, Wifi, ShieldCheck, Globe, Server, ArrowRight, Search } from 'lucide-react';
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
    const info = await nativeBridge.getNetworkInfo();
    setNetworkInfo(info);
    if (status === 'online' && activeNode && !isLocalNode(activeNode)) {
      await fetchCandidates();
    }
    setIsDetecting(false);
  };

  useEffect(() => {
    void detect();
  }, [activeNode, status]);

  const canShowServiceCandidates = Boolean(activeNode && !isLocalNode(activeNode) && status === 'online');
  const candidatesTitle = canShowServiceCandidates ? '当前服务返回的候选连接地址' : '候选连接地址';
  const candidatesHint = canShowServiceCandidates
    ? '这些地址来自当前已连接服务的 /api/meta，可用于同一服务的其他设备导入。'
    : isLocalNode(activeNode)
      ? '当前处于本地模式，没有连接远程服务，所以无法拉取服务端候选地址。'
      : '尚未连接远程服务，无法拉取服务端候选地址。';

  return (
    <motion.div key="network-check" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="flex-1 flex flex-col max-w-md mx-auto w-full">
      <header className="p-6 flex items-center justify-between border-b border-white/5 bg-[#121212]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors"><ChevronLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-semibold text-white tracking-tight">网络诊断与接入</h1>
        </div>
        <button onClick={detect} className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors">
          <RefreshCw className={`w-4 h-4 ${isDetecting ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <main className="flex-1 p-6 space-y-8 overflow-y-auto pb-40">
        <section className="space-y-4">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest ml-1">本机环境 (Local Environment)</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
              <Wifi className="w-4 h-4 text-emerald-500" />
              <div className="text-[10px] text-slate-500 uppercase font-mono">Wi-Fi Status</div>
              <div className="text-sm font-bold text-white">{networkInfo?.wifi || 'Detecting...'}</div>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <div className="text-[10px] text-slate-500 uppercase font-mono">Tailscale</div>
              <div className="text-sm font-bold text-white">{networkInfo?.tailscale || 'Detecting...'}</div>
            </div>
          </div>
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-emerald-500" />
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-mono">My Tailscale IP</div>
                <div className="text-sm font-bold text-white font-mono">{networkInfo?.localIp || '...'}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{candidatesTitle}</div>
            {isDetecting && <span className="text-[10px] font-mono text-emerald-500/50">Scanning...</span>}
          </div>
          <p className="px-1 text-[11px] leading-relaxed text-slate-500">{candidatesHint}</p>
          
          <div className="space-y-3">
            {canShowServiceCandidates && candidates.length > 0 ? candidates.map((node) => (
              <motion.div 
                key={node.id}
                onClick={() => onSelect(node.serverUrl)}
                className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group transition-colors hover:border-emerald-500/30 cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl ${
                    node.status === 'connectable'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : node.status === 'needs-token'
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-slate-500/10 text-slate-500'
                  }`}>
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{node.name}</div>
                    <div className="text-[10px] font-mono text-slate-500">{node.serverUrl}</div>
                    <div className="mt-1 text-[10px] font-mono text-slate-600">{node.wsUrl}</div>
                    <div className="mt-1 text-[9px] uppercase tracking-widest text-slate-600">{node.kind} · {node.source}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[9px] font-bold uppercase tracking-widest ${
                      node.status === 'connectable'
                        ? 'text-emerald-500'
                        : node.status === 'needs-token'
                          ? 'text-amber-500'
                          : 'text-slate-500'
                    }`}
                  >
                    {node.status === 'connectable' ? '可连接' : node.status === 'needs-token' ? '需令牌' : '不可达'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-500 transition-colors" />
                </div>
              </motion.div>
            )) : (
              <div className="p-8 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center text-center gap-3">
                <Search className="w-6 h-6 text-slate-600" />
                <p className="text-sm font-medium text-slate-400">
                  {canShowServiceCandidates ? '当前服务没有返回候选地址' : '暂时无法拉取候选地址'}
                </p>
                <p className="text-[10px] text-slate-600 leading-relaxed max-w-[220px]">{candidatesHint}</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </motion.div>
  );
};
