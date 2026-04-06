import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Check, Wifi, ShieldCheck, Settings, QrCode, Edit3, Activity } from 'lucide-react';

interface OnboardingViewProps {
  onBack: () => void;
  onSettings: () => void;
  onNetwork: () => void;
  onScanImport: () => void;
  onFinish: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onBack, onSettings, onNetwork, onScanImport, onFinish }) => {
  const [onboardingStep, setOnboardingStep] = useState(1);

  const nextStep = () => {
    if (onboardingStep < 3) setOnboardingStep(onboardingStep + 1);
    else onFinish();
  };

  const prevStep = () => {
    if (onboardingStep > 1) setOnboardingStep(onboardingStep - 1);
    else onBack();
  };

  return (
    <motion.div key="onboarding" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col max-w-md mx-auto w-full">
      <header className="p-6 flex items-center justify-between border-b border-white/5 bg-[#121212]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={prevStep} className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors"><ChevronLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-semibold text-white">配置同步节点</h1>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Progress</span>
          <span className="text-sm font-mono text-emerald-500">{onboardingStep}/3</span>
        </div>
      </header>
      <main className="flex-1 p-6 space-y-8 overflow-y-auto pb-32">
        <div className={`relative pl-8 border-l-2 transition-colors ${onboardingStep >= 1 ? 'border-emerald-500/50' : 'border-white/10'}`}>
          <div className={`absolute -left-[11px] top-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${onboardingStep > 1 ? 'bg-emerald-500 text-black' : onboardingStep === 1 ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/50' : 'bg-white/10 text-slate-500'}`}>{onboardingStep > 1 ? <Check className="w-3 h-3" /> : '1'}</div>
          <div className={`space-y-4 ${onboardingStep === 1 ? 'opacity-100' : 'opacity-40'}`}>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Wifi className="w-4 h-4 text-emerald-500" />网络环境准备</h3>
            {onboardingStep === 1 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">请确保 Tailscale 已开启并连接到你的私有网。这是建立安全隧道的先决条件。</p>
                <button onClick={onNetwork} className="w-full py-3 bg-white/5 hover:bg-white/10 text-xs font-medium rounded-xl border border-white/10 transition-colors flex items-center justify-center gap-2"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />检测 Tailscale 状态</button>
              </motion.div>
            )}
          </div>
        </div>
        <div className={`relative pl-8 border-l-2 transition-colors ${onboardingStep >= 2 ? 'border-emerald-500/50' : 'border-white/10'}`}>
          <div className={`absolute -left-[11px] top-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${onboardingStep > 2 ? 'bg-emerald-500 text-black' : onboardingStep === 2 ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/50' : 'bg-white/10 text-slate-500'}`}>{onboardingStep > 2 ? <Check className="w-3 h-3" /> : '2'}</div>
          <div className={`space-y-4 ${onboardingStep === 2 ? 'opacity-100' : 'opacity-40'}`}>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Settings className="w-4 h-4 text-emerald-500" />导入节点配置</h3>
            {onboardingStep === 2 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <button onClick={onSettings} className="w-full p-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center gap-4 transition-colors group text-left">
                  <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-500 group-hover:scale-110 transition-transform"><Edit3 className="w-6 h-6" /></div>
                  <div><div className="text-sm font-semibold text-white">手动输入</div><div className="text-[10px] text-slate-500 uppercase tracking-tighter">IP / MagicDNS / Token</div></div>
                </button>
                <button onClick={onScanImport} className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center gap-4 transition-colors">
                  <div className="p-3 bg-white/10 rounded-xl text-slate-400"><QrCode className="w-6 h-6" /></div>
                  <div className="text-left"><div className="text-sm font-semibold text-white">扫码导入</div><div className="text-[10px] text-slate-500 uppercase tracking-tighter">Recommended</div></div>
                </button>
              </motion.div>
            )}
          </div>
        </div>
        <div className={`relative pl-8 transition-colors`}>
          <div className={`absolute -left-[11px] top-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${onboardingStep === 3 ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/50' : 'bg-white/10 text-slate-500'}`}>3</div>
          <div className={`space-y-4 ${onboardingStep === 3 ? 'opacity-100' : 'opacity-40'}`}>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-500" />建立同步链路</h3>
            {onboardingStep === 3 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-white/5 rounded-2xl border border-white/10 flex flex-col items-center gap-4 text-center">
                <div className="relative"><div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" /><Activity className="w-12 h-12 text-emerald-500 relative z-10" /></div>
                <div className="space-y-1"><p className="text-sm text-white font-medium">准备就绪</p><p className="text-xs text-slate-500">点击下方按钮验证并开启同步</p></div>
              </motion.div>
            )}
          </div>
        </div>
      </main>
      <footer className="p-6 bg-[#121212] border-t border-white/5 sticky bottom-0 z-20">
        <button onClick={nextStep} className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-900 disabled:text-emerald-700 text-black font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
          {onboardingStep === 3 ? '开启同步之旅' : '下一步'}
        </button>
      </footer>
    </motion.div>
  );
};
