import React from 'react';

export class AppErrorBoundary extends React.Component<
  {children: React.ReactNode},
  {failed: boolean}
> {
  declare readonly props: {children: React.ReactNode};
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  componentDidCatch(error: Error) {
    console.error('Application rendering failed', {name: error.name});
  }
  render() {
    if (this.state.failed) return (
      <main role="alert" className="min-h-screen flex items-center justify-center bg-indigo-50 p-6">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Không thể hiển thị trang</h1>
          <p className="mt-3 text-sm text-slate-600">Đã xảy ra lỗi khi tải giao diện. Vui lòng tải lại trang để thử lại.</p>
          <button type="button" onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white">Tải lại trang</button>
        </div>
      </main>
    );
    return this.props.children;
  }
}
