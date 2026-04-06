import React from 'react';
import { motion } from 'motion/react';
import { Terminal, Server, Laptop, Smartphone, ArrowRight } from 'lucide-react';
import { useConnection } from '../../state/ConnectionContext';

interface WelcomeViewProps {
  onNext: () => void;
  onLocal: () => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onNext, onLocal }) => {
  const { recentNodes, connect } = useConnection();

  return (
    <motion.div key="welcome" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col items-center justify-center p-6 gap-8 max-w-md mx-auto w-full">
      <div className="flex flex-col items-center gap-2">
        <Terminal className="w-12 h-12 text-emerald-500" />
        <h1 className="text-xl font-semibold tracking-tight text-white">SSH Todo</h1>
      </div>
      
      {recentNodes.length > 0 ? (
        <div className="w-full space-y-4">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] text-center">欢迎回来 · 快速回连</div>
          <div className="space-y-3">
            {recentNodes.slice(0, 2).map(node => (
              <button 
                key={node.id}
                onClick={() => connect(node.ip)}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${node.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                  <div className="text-left">
                    <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{node.name}</div>
                    <div className="text-[10px] font-mono text-slate-500">{node.ip}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-[9px] font-bold text-slate-600 uppercase">{node.lastUsed}</div>
                  {node.latency !== '-' && <div className="text-[9px] font-mono text-emerald-500/50">{node.latency}</div>}
                </div>
              </button>
            ))}
          </div>
          <button onClick={onNext} className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20">
            接入新节点 <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative w-64 h-64 flex items-center justify-center">
            <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="z-10 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
              <Server className="w-10 h-10 text-emerald-500" />
            </motion.div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2"><Laptop className="w-6 h-6 text-slate-500" /></div>
            <div className="absolute bottom-0 left-1/4"><Smartphone className="w-6 h-6 text-slate-500" /></div>
            <div className="absolute bottom-0 right-1/4"><Smartphone className="w-6 h-6 text-slate-500" /></div>
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <motion.line x1="50%" y1="20%" x2="50%" y2="40%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-emerald-500/20" animate={{ strokeDashoffset: [0, -20] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
              <motion.line x1="30%" y1="80%" x2="45%" y2="60%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-emerald-500/20" animate={{ strokeDashoffset: [0, -20] }} transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }} />
              <motion.line x1="70%" y1="80%" x2="55%" y2="60%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-emerald-500/20" animate={{ strokeDashoffset: [0, -20] }} transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }} />
            </svg>
          </div>
          <div className="flex flex-col items-center text-center gap-4">
            <h2 className="text-2xl font-bold text-white tracking-tight">掌控你的任务节点</h2>
            <p className="text-slate-400 leading-relaxed text-sm">基于 Tailscale 的私有化同步，<br />数据永不离境。</p>
          </div>
          <div className="w-full flex flex-col gap-3">
            <button onClick={onNext} className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors active:scale-[0.98]">
              接入同步节点 <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={onLocal} className="w-full h-14 bg-transparent hover:bg-white/5 text-slate-300 font-medium rounded-2xl border border-white/10 transition-colors active:scale-[0.98]">仅使用本地模式</button>
          </div>
        </>
      )}
    </motion.div>
  );
};
