import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Globe, ShieldCheck, QrCode, Clipboard, Activity, Check, RefreshCw } from 'lucide-react';
import { normalizeServerUrl } from '../../lib/connection';
import { useConnection } from '../../state/ConnectionContext';
import { nativeBridge } from '../../lib/bridge';

interface NodeSettingsViewProps {
  onBack: () => void;
  onFinish: () => void;
  prefillAddress?: string;
}

export const NodeSettingsView: React.FC<NodeSettingsViewProps> = ({ onBack, onFinish, prefillAddress }) => {
  const { connect, testConnection, importConfig } = useConnection();
  const [nodeAddress, setNodeAddress] = useState('');
  const [nodeToken, setNodeToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'none' | 'success' | 'error'>('none');
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (prefillAddress?.trim()) {
      setNodeAddress(prefillAddress.trim());
      setTestResult('none');
    }
  }, [prefillAddress]);

  const handleTest = async () => {
    if (!nodeAddress) return;
    setIsTesting(true);
    setTestResult('none');
    try {
      const success = await testConnection(normalizeServerUrl(nodeAddress), nodeToken);
      setTestResult(success ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!nodeAddress) return;
    setIsConnecting(true);
    try {
      await connect(nodeAddress, nodeToken);
      onFinish();
    } catch (err) {
      setTestResult('error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handlePasteConfig = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setIsConnecting(true);
        await importConfig(text);
        onFinish();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '导入失败');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleScanConfig = async () => {
    try {
      setIsConnecting(true);
      const text = await nativeBridge.scanQrCode();
      if (!text) {
        throw new Error('未读取到二维码内容');
      }
      await importConfig(text);
      onFinish();
    } catch (err) {
      alert(err instanceof Error ? err.message : '扫码导入失败');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <motion.div key="node-settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="flex-1 flex flex-col max-w-md mx-auto w-full">
      <header className="p-6 flex items-center justify-between border-b border-white/5 bg-[#121212]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors"><ChevronLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-semibold text-white tracking-tight">节点连接设置</h1>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-8 overflow-y-auto pb-40">
        <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl flex items-center gap-4 relative overflow-hidden group">
          <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500 relative z-10"><Globe className="w-6 h-6" /></div>
          <div className="relative z-10">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-0.5">Target Infrastructure</div>
            <div className="text-base font-bold text-white font-mono">{nodeAddress || '待配置新节点'}</div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest px-1">节点地址 (Address)</label>
          <div className="relative group">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text" 
              value={nodeAddress}
              onChange={(e) => { setNodeAddress(e.target.value); setTestResult('none'); }}
              placeholder="100.x.x.x 或 nas.tail-net.ts.net"
              className="w-full h-16 bg-white/5 border border-white/10 focus:border-emerald-500/50 focus:bg-emerald-500/5 rounded-2xl pl-12 pr-4 text-sm font-mono text-white placeholder:text-slate-600 outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">访问令牌 (Secure Token)</label>
            <button onClick={() => setShowToken(!showToken)} className="text-[10px] font-mono text-emerald-500/50 hover:text-emerald-500 transition-colors">
              {showToken ? '隐藏' : '显示'}
            </button>
          </div>
          <div className="relative group">
            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type={showToken ? 'text' : 'password'} 
              value={nodeToken}
              onChange={(e) => { setNodeToken(e.target.value); setTestResult('none'); }}
              placeholder="SSH_TODO_TOKEN_••••••••"
              className="w-full h-16 bg-white/5 border border-white/10 focus:border-emerald-500/50 focus:bg-emerald-500/5 rounded-2xl pl-12 pr-12 text-sm font-mono text-white placeholder:text-slate-600 outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleScanConfig}
            className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-medium flex flex-col items-start gap-3 transition-all active:scale-95"
          >
            <div className="p-2 bg-white/5 rounded-lg text-slate-400"><QrCode className="w-4 h-4" /></div>
            <span>扫码导入</span>
          </button>
          <button 
            onClick={handlePasteConfig}
            className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-medium flex flex-col items-start gap-3 transition-all active:scale-95"
          >
            <div className="p-2 bg-white/5 rounded-lg text-slate-400"><Clipboard className="w-4 h-4" /></div>
            <span>粘贴配置</span>
          </button>
        </div>

        <AnimatePresence>
          {testResult !== 'none' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} 
              className={`p-5 rounded-3xl border flex items-start gap-4 ${testResult === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}
            >
              <div className={`p-2 rounded-xl ${testResult === 'success' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                {testResult === 'success' ? <Check className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold">{testResult === 'success' ? '连接测试成功' : '连接失败'}</div>
                <p className="text-[10px] opacity-80 leading-relaxed">
                  {testResult === 'success' ? '已成功握手，节点响应正常。' : '无法连接到指定节点。请检查地址或 Token。'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="p-6 bg-[#121212]/90 backdrop-blur-xl border-t border-white/5 sticky bottom-0 z-20 space-y-4">
        <button 
          onClick={handleTest} 
          disabled={isTesting || !nodeAddress} 
          className="w-full h-14 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white text-sm font-semibold rounded-2xl border border-white/10 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
        >
          {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4 text-emerald-500" />}
          测试连接
        </button>
        <button 
          onClick={handleConnect} 
          disabled={isConnecting || !nodeAddress} 
          className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-900/50 disabled:text-emerald-700 text-black font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/10"
        >
          {isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : '保存并开启同步'}
        </button>
      </footer>
    </motion.div>
  );
};
