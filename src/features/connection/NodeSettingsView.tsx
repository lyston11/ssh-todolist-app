import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, Clipboard, Globe, QrCode, RefreshCw, ShieldCheck } from 'lucide-react';
import { useConnection } from '../../state/ConnectionContext';
import { nativeBridge } from '../../lib/bridge';

interface NodeSettingsViewProps {
  onBack: () => void;
  onFinish: () => void;
  prefillAddress?: string;
}

interface FeedbackState {
  kind: 'success' | 'error';
  text: string;
}

export const NodeSettingsView: React.FC<NodeSettingsViewProps> = ({ onBack, onFinish, prefillAddress }) => {
  const { connect, testConnection, importConfig } = useConnection();
  const [nodeAddress, setNodeAddress] = useState('');
  const [nodeToken, setNodeToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  useEffect(() => {
    if (prefillAddress?.trim()) {
      setNodeAddress(prefillAddress.trim());
      setFeedback(null);
    }
  }, [prefillAddress]);

  const handleTest = async () => {
    if (!nodeAddress.trim()) {
      return;
    }

    setIsTesting(true);
    setFeedback(null);
    try {
      const success = await testConnection(nodeAddress, nodeToken);
      setFeedback({
        kind: success ? 'success' : 'error',
        text: success ? '连接测试通过，节点可以访问。' : '连接测试失败，请检查地址或 token。',
      });
    } catch (error) {
      setFeedback({
        kind: 'error',
        text: error instanceof Error ? error.message : '连接测试失败，请检查地址或 token。',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!nodeAddress.trim()) {
      return;
    }

    setIsConnecting(true);
    setFeedback(null);
    try {
      await connect(nodeAddress, nodeToken);
      onFinish();
    } catch (error) {
      setFeedback({
        kind: 'error',
        text: error instanceof Error ? error.message : '连接失败，请检查地址或 token。',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handlePasteConfig = async () => {
    setFeedback(null);
    try {
      setIsConnecting(true);
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        throw new Error('剪贴板里没有可用的配置内容。');
      }
      await importConfig(text);
      onFinish();
    } catch (error) {
      setFeedback({
        kind: 'error',
        text: error instanceof Error ? error.message : '粘贴配置失败。',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleScanConfig = async () => {
    setFeedback(null);
    try {
      setIsConnecting(true);
      const text = await nativeBridge.scanQrCode();
      if (!text.trim()) {
        throw new Error('未读取到二维码内容。');
      }
      await importConfig(text);
      onFinish();
    } catch (error) {
      setFeedback({
        kind: 'error',
        text: error instanceof Error ? error.message : '扫码导入失败。',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <motion.div
      key="node-settings"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mx-auto flex w-full max-w-[520px] flex-1 flex-col"
    >
      <header className="border-b border-white/10 bg-[#111315] px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-base font-semibold text-white">节点连接设置</h1>
            <p className="mt-1 text-sm text-slate-400">手动填写地址和 token，或者直接导入配置。</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        <section className="space-y-4 rounded-xl border border-white/10 bg-[#181b1f] p-4">
          <div>
            <h2 className="text-sm font-medium text-white">连接信息</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">支持直接填写 Tailscale IP 或 MagicDNS 地址。未写协议时会自动补全。</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">节点地址</label>
            <div className="relative">
              <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={nodeAddress}
                onChange={(event) => {
                  setNodeAddress(event.target.value);
                  setFeedback(null);
                }}
                placeholder="例如 100.x.x.x 或 my-mac.tailnet.ts.net"
                className="h-11 w-full rounded-md border border-white/10 bg-[#111315] pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-emerald-400/40"
              />
            </div>
            {prefillAddress?.trim() && (
              <p className="text-xs text-slate-500">已从候选地址带入当前节点。</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-white">访问 token</label>
              <button
                type="button"
                onClick={() => setShowToken((current) => !current)}
                className="text-xs text-slate-400 transition-colors hover:text-white"
              >
                {showToken ? '隐藏' : '显示'}
              </button>
            </div>
            <div className="relative">
              <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type={showToken ? 'text' : 'password'}
                value={nodeToken}
                onChange={(event) => {
                  setNodeToken(event.target.value);
                  setFeedback(null);
                }}
                placeholder="例如 mytodo-2026"
                className="h-11 w-full rounded-md border border-white/10 bg-[#111315] pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-emerald-400/40"
              />
            </div>
            <p className="text-xs text-slate-500">如果服务端开启鉴权，再填写 token。token 可以保持简短易输。</p>
          </div>
        </section>

        <section className="mt-4 space-y-3 rounded-xl border border-white/10 bg-[#181b1f] p-4">
          <div>
            <h2 className="text-sm font-medium text-white">快捷导入</h2>
            <p className="mt-1 text-sm text-slate-400">支持扫码或读取剪贴板中的导入链接、config64 和配置文本。</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              onClick={handleScanConfig}
              disabled={isConnecting}
              className="flex items-center gap-3 rounded-md border border-white/10 bg-[#111315] px-4 py-3 text-left transition-colors hover:bg-white/5 disabled:opacity-50"
            >
              <QrCode className="h-4 w-4 text-emerald-400" />
              <div>
                <div className="text-sm font-medium text-white">扫码导入</div>
                <div className="text-xs text-slate-400">从服务端配置页直接扫码</div>
              </div>
            </button>
            <button
              onClick={handlePasteConfig}
              disabled={isConnecting}
              className="flex items-center gap-3 rounded-md border border-white/10 bg-[#111315] px-4 py-3 text-left transition-colors hover:bg-white/5 disabled:opacity-50"
            >
              <Clipboard className="h-4 w-4 text-emerald-400" />
              <div>
                <div className="text-sm font-medium text-white">粘贴配置</div>
                <div className="text-xs text-slate-400">读取剪贴板中的导入内容</div>
              </div>
            </button>
          </div>
        </section>

        <AnimatePresence>
          {feedback && (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                feedback.kind === 'success'
                  ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-200'
                  : 'border-rose-500/20 bg-rose-500/5 text-rose-200'
              }`}
            >
              {feedback.text}
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-white/10 bg-[#111315] px-4 py-3">
        <div className="flex gap-3">
          <button
            onClick={handleTest}
            disabled={isTesting || isConnecting || !nodeAddress.trim()}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-white/10 text-sm text-slate-200 transition-colors hover:bg-white/5 disabled:opacity-40"
          >
            {isTesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4 text-emerald-400" />}
            测试连接
          </button>
          <button
            onClick={handleConnect}
            disabled={isConnecting || isTesting || !nodeAddress.trim()}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-emerald-500 text-sm font-medium text-black transition-colors hover:bg-emerald-400 disabled:opacity-40"
          >
            {isConnecting ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
            保存并连接
          </button>
        </div>
      </footer>
    </motion.div>
  );
};
