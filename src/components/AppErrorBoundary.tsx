import React from 'react';

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Unhandled app render error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#121212] text-slate-200 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-[28px] border border-rose-500/20 bg-white/5 p-6">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-400">应用异常</div>
          <h1 className="mt-3 text-xl font-semibold text-white">界面渲染失败</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            当前页面遇到了未处理错误。你可以刷新应用后继续使用，已保存的本地数据不会因此被清空。
          </p>
          <button
            onClick={this.handleReload}
            className="mt-6 w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
          >
            重新加载应用
          </button>
        </div>
      </div>
    );
  }
}
