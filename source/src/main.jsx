import { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import { isLazyImportError } from './utils/lazyWithRetry.js';
import '@fontsource/be-vietnam-pro/latin-400.css';
import '@fontsource/be-vietnam-pro/vietnamese-400.css';
import '@fontsource/be-vietnam-pro/latin-500.css';
import '@fontsource/be-vietnam-pro/vietnamese-500.css';
import '@fontsource/be-vietnam-pro/latin-600.css';
import '@fontsource/be-vietnam-pro/vietnamese-600.css';
import '@fontsource/be-vietnam-pro/latin-700.css';
import '@fontsource/be-vietnam-pro/vietnamese-700.css';
import '@fontsource/fraunces/latin-600.css';
import '@fontsource/fraunces/vietnamese-600.css';
import '@fontsource/fraunces/latin-700.css';
import '@fontsource/fraunces/vietnamese-700.css';
import './index.css';

const rootElement = document.getElementById('root');

const showBootError = (error) => {
  const message = import.meta.env.DEV
    ? error?.stack || error?.message || String(error)
    : 'Không thể khởi động ứng dụng.';
  rootElement.innerHTML = `
    <main style="font-family: Arial, sans-serif; padding: 32px; color: #17201d; background: #f7f8f5; min-height: 100vh;">
      <h1 style="font-size: 24px; margin-bottom: 12px;">Không thể mở SouvenirShop</h1>
      <p style="margin-bottom: 16px; color: #596760;">Kết nối với máy chủ đang bị gián đoạn. Hãy tải lại trang sau ít phút.</p>
      <button onclick="window.location.reload()" style="border: 0; border-radius: 8px; padding: 12px 18px; background: #0f766e; color: white; font-weight: 700; cursor: pointer;">Tải lại trang</button>
      ${import.meta.env.DEV ? `<pre style="margin-top: 20px; white-space: pre-wrap; background: white; border: 1px solid #d5deda; border-radius: 8px; padding: 16px;">${message.replaceAll('<', '&lt;')}</pre>` : ''}
    </main>
  `;
};

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      const message = this.state.error.stack || this.state.error.message || String(this.state.error);
      const chunkError = isLazyImportError(this.state.error);
      return (
        <main style={{ minHeight: '100vh', padding: 32, background: '#f7f8f5', color: '#17201d', fontFamily: 'Arial, sans-serif' }}>
          <h1 style={{ fontSize: 24, marginBottom: 12 }}>
            {chunkError ? 'Chưa thể tải trang này' : 'SouvenirShop đang gặp lỗi'}
          </h1>
          <p style={{ marginBottom: 16, color: '#596760' }}>
            {chunkError
              ? 'Kết nối với máy chủ bị gián đoạn. Hãy tải lại trang để tiếp tục.'
              : 'Vui lòng tải lại trang. Nếu lỗi vẫn còn, hãy gửi thông tin cho đội hỗ trợ.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ border: 0, borderRadius: 8, padding: '12px 18px', background: '#0f766e', color: 'white', fontWeight: 700, cursor: 'pointer' }}
          >
            Tải lại trang
          </button>
          {import.meta.env.DEV && (
            <pre style={{ marginTop: 20, whiteSpace: 'pre-wrap', background: 'white', border: '1px solid #d5deda', borderRadius: 8, padding: 16 }}>
              {message}
            </pre>
          )}
        </main>
      );
    }

    return this.props.children;
  }
}

const queryClient = new QueryClient();
const root = createRoot(rootElement);

try {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>
  );
} catch (error) {
  showBootError(error);
}
