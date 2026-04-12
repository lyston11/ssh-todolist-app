import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { ConnectionProvider, useConnection } from './state/ConnectionContext';
import { TodoProvider } from './state/TodoContext';
import { Terminal } from 'lucide-react';
import { nativeBridge } from './lib/bridge';
import { hasImportConfigInUrl, stripSensitiveImportParams } from './lib/import_config';

// Feature Components (to be created)
import { WelcomeView } from './features/connection/WelcomeView';
import { OnboardingView } from './features/connection/OnboardingView';
import { NodeSettingsView } from './features/connection/NodeSettingsView';
import { NetworkCheckView } from './features/connection/NetworkCheckView';
import { MainAppView } from './features/todos/MainAppView';

type AppView = 'welcome' | 'onboarding' | 'main' | 'node-settings' | 'network-check';

const AppContent: React.FC = () => {
  const { status, importConfig, enterLocalMode } = useConnection();
  const [view, setView] = useState<AppView>('welcome');
  const [stage, setStage] = useState<'splash' | 'app'>('splash');
  const [nodeSettingsBackView, setNodeSettingsBackView] = useState<AppView>('onboarding');
  const [networkBackView, setNetworkBackView] = useState<AppView>('onboarding');
  const [prefillNodeAddress, setPrefillNodeAddress] = useState('');
  const [globalNotice, setGlobalNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const handledIncomingUrlsRef = useRef<Set<string>>(new Set());

  const openNodeSettings = (backView: AppView, address?: string) => {
    setNodeSettingsBackView(backView);
    setPrefillNodeAddress(address || '');
    setView('node-settings');
  };

  const openNetworkCheck = (backView: AppView) => {
    setNetworkBackView(backView);
    setView('network-check');
  };

  const handleIncomingImport = useCallback(async (rawUrl: string | null) => {
    const normalizedUrl = rawUrl?.trim();
    if (!normalizedUrl || handledIncomingUrlsRef.current.has(normalizedUrl)) {
      return;
    }

    handledIncomingUrlsRef.current.add(normalizedUrl);
    try {
      await importConfig(normalizedUrl);
      setPrefillNodeAddress('');
      setGlobalNotice({ kind: 'success', text: '已从导入链接接入节点。' });
      setView('main');
    } catch (error) {
      console.error('Failed to import incoming link:', error);
      setGlobalNotice({ kind: 'error', text: '导入链接失败，请检查配置内容。' });
      setNodeSettingsBackView('main');
      setView('node-settings');
    }
  }, [importConfig]);

  const handleScanImport = useCallback(async () => {
    try {
      const text = await nativeBridge.scanQrCode();
      if (!text) {
        throw new Error('未读取到二维码内容');
      }

      await importConfig(text);
      setPrefillNodeAddress('');
      setGlobalNotice({ kind: 'success', text: '已通过扫码导入节点。' });
      setView('main');
    } catch (error) {
      console.error('Failed to scan import config:', error);
      setGlobalNotice({
        kind: 'error',
        text: error instanceof Error ? error.message : '扫码导入失败'
      });
    }
  }, [importConfig]);

  useEffect(() => {
    const timer = setTimeout(() => setStage('app'), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Auto-switch to main if online
  useEffect(() => {
    if (status === 'online' && view !== 'main') {
      setView('main');
      setPrefillNodeAddress('');
    }
  }, [status, view]);

  useEffect(() => {
    if (!globalNotice) {
      return;
    }

    const timer = setTimeout(() => setGlobalNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [globalNotice]);

  useEffect(() => {
    let disposed = false;
    let listenerHandle: { remove: () => Promise<void> } | null = null;

    if (typeof window !== 'undefined') {
      const currentUrl = window.location.href;
      if (hasImportConfigInUrl(currentUrl)) {
        void handleIncomingImport(currentUrl).finally(() => {
          const sanitizedUrl = stripSensitiveImportParams(currentUrl);
          if (sanitizedUrl !== currentUrl && typeof window.history.replaceState === 'function') {
            window.history.replaceState({}, '', sanitizedUrl);
          }
        });
      }
    }

    nativeBridge.getLaunchUrl().then((url) => {
      if (!disposed) {
        void handleIncomingImport(url);
      }
    });

    nativeBridge.addIncomingLinkListener((url) => {
      void handleIncomingImport(url);
    }).then((handle) => {
      if (disposed) {
        void handle.remove();
        return;
      }
      listenerHandle = handle;
    });

    return () => {
      disposed = true;
      if (listenerHandle) {
        void listenerHandle.remove();
      }
    };
  }, [handleIncomingImport]);

  if (stage === 'splash') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#111315] p-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-[#181b1f] text-emerald-400">
            <Terminal className="h-6 w-6" />
          </div>
          <div className="text-sm text-slate-400">正在启动 SSH Todo…</div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-[#111315] font-sans text-slate-300 selection:bg-emerald-500/30">
      <AnimatePresence>
        {globalNotice && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`fixed left-1/2 top-4 z-[70] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-lg border px-4 py-3 text-sm ${
              globalNotice.kind === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
            }`}
          >
            {globalNotice.text}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {view === 'welcome' && (
          <WelcomeView
            onNext={() => setView('onboarding')}
            onLocal={() => {
              enterLocalMode();
              setView('main');
            }}
          />
        )}
        {view === 'onboarding' && (
          <OnboardingView
            onBack={() => setView('welcome')}
            onSettings={() => openNodeSettings('onboarding')}
            onNetwork={() => openNetworkCheck('onboarding')}
            onScanImport={() => void handleScanImport()}
            onFinish={() => setView('main')}
          />
        )}
        {view === 'node-settings' && (
          <NodeSettingsView
            onBack={() => setView(nodeSettingsBackView)}
            onFinish={() => {
              setPrefillNodeAddress('');
              setView('main');
            }}
            prefillAddress={prefillNodeAddress}
          />
        )}
        {view === 'network-check' && (
          <NetworkCheckView
            onBack={() => setView(networkBackView)}
            onSelect={(url) => {
              openNodeSettings('network-check', url);
            }}
          />
        )}
        {view === 'main' && (
          <MainAppView
            onSettings={() => openNodeSettings('main')}
            onNetwork={() => openNetworkCheck('main')}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppErrorBoundary>
      <ConnectionProvider>
        <TodoProvider>
          <AppContent />
        </TodoProvider>
      </ConnectionProvider>
    </AppErrorBoundary>
  );
};

export default App;
