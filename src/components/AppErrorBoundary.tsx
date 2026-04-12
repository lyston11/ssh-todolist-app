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
      <div className="flex min-h-screen items-center justify-center bg-[#111315] p-6 text-slate-200">
        <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#181b1f] p-5">
          <div className="text-sm font-medium text-rose-300">界面渲染失败</div>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            当前页面遇到了未处理错误。你可以刷新应用后继续使用，已保存的本地数据不会因此被清空。
          </p>
          <button
            onClick={this.handleReload}
            className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-md bg-emerald-500 px-4 text-sm font-medium text-black transition-colors hover:bg-emerald-400"
          >
            重新加载应用
          </button>
        </div>
      </div>
    );
  }
}
