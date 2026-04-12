import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Check, ChevronLeft, Edit3, QrCode, ShieldCheck, Wifi } from 'lucide-react';

interface OnboardingViewProps {
  onBack: () => void;
  onSettings: () => void;
  onNetwork: () => void;
  onScanImport: () => void;
  onFinish: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onBack, onSettings, onNetwork, onScanImport, onFinish }) => {
  const [onboardingStep, setOnboardingStep] = useState(1);

  const steps = useMemo(
    () => [
      {
        id: 1,
        title: '确认网络',
        description: '先确认设备已经接入 Tailscale，后续连接才会稳定。',
      },
      {
        id: 2,
        title: '导入配置',
        description: '填写节点地址和 token，或者直接扫码导入。',
      },
      {
        id: 3,
        title: '开始同步',
        description: '配置完成后进入主界面，任务会在连接恢复后自动同步。',
      },
    ],
    [],
  );

  const nextStep = () => {
    if (onboardingStep < 3) {
      setOnboardingStep((current) => current + 1);
      return;
    }
    onFinish();
  };

  const prevStep = () => {
    if (onboardingStep > 1) {
      setOnboardingStep((current) => current - 1);
      return;
    }
    onBack();
  };

  return (
    <motion.div
      key="onboarding"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mx-auto flex w-full max-w-[520px] flex-1 flex-col"
    >
      <header className="border-b border-white/10 bg-[#111315] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={prevStep}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-base font-semibold text-white">接入同步节点</h1>
              <p className="mt-1 text-sm text-slate-400">按顺序完成网络确认、配置导入和同步启动。</p>
            </div>
          </div>
          <div className="text-sm text-slate-400">{onboardingStep}/3</div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        <section className="space-y-2">
          {steps.map((step) => {
            const active = step.id === onboardingStep;
            const completed = step.id < onboardingStep;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setOnboardingStep(step.id)}
                className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  active
                    ? 'border-emerald-400/40 bg-emerald-500/10'
                    : 'border-white/10 bg-[#181b1f] hover:bg-white/5'
                }`}
              >
                <div
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs ${
                    completed
                      ? 'border-emerald-400 bg-emerald-400 text-black'
                      : active
                        ? 'border-emerald-400/40 text-emerald-300'
                        : 'border-white/10 text-slate-400'
                  }`}
                >
                  {completed ? <Check className="h-3.5 w-3.5" /> : step.id}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white">{step.title}</div>
                  <div className="mt-1 text-sm text-slate-400">{step.description}</div>
                </div>
              </button>
            );
          })}
        </section>

        <section className="mt-4 rounded-xl border border-white/10 bg-[#181b1f] p-4">
          {onboardingStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#111315] text-emerald-400">
                  <Wifi className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-white">确认网络已准备好</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    确保当前设备已经登录 Tailscale，并且与服务端处于同一 tailnet。你可以在下一页手动填写 Tailscale IP。
                  </p>
                </div>
              </div>
              <button
                onClick={onNetwork}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 px-3 text-sm text-slate-200 transition-colors hover:bg-white/5"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                打开网络诊断
              </button>
            </div>
          )}

          {onboardingStep === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-medium text-white">导入节点配置</h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">可以手动填写地址和 token，也可以直接通过二维码导入。</p>
              </div>
              <div className="grid gap-2">
                <button
                  onClick={onSettings}
                  className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#111315] px-4 py-3 text-left transition-colors hover:bg-white/5"
                >
                  <Edit3 className="h-4 w-4 text-emerald-400" />
                  <div>
                    <div className="text-sm font-medium text-white">手动填写</div>
                    <div className="text-xs text-slate-400">输入节点地址和访问 token</div>
                  </div>
                </button>
                <button
                  onClick={onScanImport}
                  className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#111315] px-4 py-3 text-left transition-colors hover:bg-white/5"
                >
                  <QrCode className="h-4 w-4 text-emerald-400" />
                  <div>
                    <div className="text-sm font-medium text-white">扫码导入</div>
                    <div className="text-xs text-slate-400">从服务端配置页直接导入</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {onboardingStep === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-medium text-white">准备进入主界面</h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  连接成功后会进入主界面。之后任务会先保存在本地，再在网络可用时同步到服务端。
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#111315] px-4 py-3 text-sm text-slate-400">
                如果当前还没连上服务，也可以先进入主界面，稍后再到设置页补充连接信息。
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#111315] px-4 py-3">
        <button
          onClick={nextStep}
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-emerald-500 text-sm font-medium text-black transition-colors hover:bg-emerald-400"
        >
          {onboardingStep === 3 ? '进入主界面' : '继续'}
        </button>
      </footer>
    </motion.div>
  );
};
