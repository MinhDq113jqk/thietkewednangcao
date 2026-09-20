import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  MessageCircle,
  PackageSearch,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import assistantApi from '../api/assistantApi';
import Spinner from './ui/Spinner';
import { formatVnd, getProductPrice } from '../utils/format';

const initialMessage = {
  id: 'welcome',
  role: 'assistant',
  reply: 'Chào bạn, mình là Trợ lý Quà Việt. Mình có thể tra giá sản phẩm và hướng dẫn bạn đến đúng thông tin trên SouvenirShop.',
  suggestions: [
    'Giá tượng gốm Bát Tràng',
    'Liên hệ hỗ trợ',
    'SouvenirShop là gì?',
  ],
};

const fallbackMessage = {
  role: 'assistant',
  reply: 'Kết nối với trợ lý đang gián đoạn. Bạn có thể mở trang sản phẩm hoặc liên hệ đội hỗ trợ.',
  actions: [
    { label: 'Khám phá sản phẩm', href: '/products' },
    { label: 'Liên hệ hỗ trợ', href: '/contact' },
  ],
};

const createMessageId = () => (
  globalThis.crypto?.randomUUID?.()
  || `${Date.now()}-${Math.random().toString(16).slice(2)}`
);

function AssistantAction({ action, onNavigate }) {
  const className = 'inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[#BFD0C8] bg-white px-3 py-2 text-xs font-bold text-[#0F766E] transition hover:border-[#0F766E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]';

  if (action.href.startsWith('/')) {
    return (
      <Link to={action.href} onClick={onNavigate} className={className}>
        {action.label}
        <ArrowRight size={14} aria-hidden />
      </Link>
    );
  }

  return (
    <a href={action.href} className={className}>
      {action.label}
      <ArrowRight size={14} aria-hidden />
    </a>
  );
}

function ProductResult({ product, onNavigate }) {
  return (
    <Link
      to={`/products/${product.id}`}
      onClick={onNavigate}
      className="grid grid-cols-[56px_1fr_auto] items-center gap-3 border-t border-[#DDE4E0] bg-white px-3 py-3 text-left transition first:border-t-0 hover:bg-[#F7FAF8] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0F766E]"
    >
      <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-md bg-[#EEF4F1] text-[#0F766E]">
        {product.image ? (
          <img
            src={product.image}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <PackageSearch size={22} aria-hidden />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-[#17201D]">{product.name}</span>
        <span className="mt-1 block truncate text-xs text-[#68756F]">
          {product.shop?.name || product.category || 'SouvenirShop'}
        </span>
        <span className="mt-1 block text-sm font-bold text-[#C93F2C]">
          {formatVnd(getProductPrice(product))}
        </span>
      </span>
      <ArrowRight size={16} className="text-[#7A8781]" aria-hidden />
    </Link>
  );
}

function ShoppingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([initialMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    inputRef.current?.focus();
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [isLoading, isOpen, messages]);

  const sendMessage = async (rawMessage) => {
    const message = rawMessage.trim();
    if (!message || isLoading) return;

    setMessages((current) => [
      ...current,
      { id: createMessageId(), role: 'user', reply: message },
    ].slice(-30));
    setInput('');
    setIsLoading(true);

    try {
      const response = await assistantApi.sendMessage(message);
      setMessages((current) => [
        ...current,
        { id: createMessageId(), role: 'assistant', ...response },
      ].slice(-30));
    } catch {
      setMessages((current) => [
        ...current,
        { id: createMessageId(), ...fallbackMessage },
      ].slice(-30));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage(input);
  };

  const closeOnNavigate = () => setIsOpen(false);

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#0F766E] text-white shadow-[0_12px_30px_rgba(15,118,110,0.28)] transition hover:bg-[#0B5F58] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F766E] motion-safe:hover:-translate-y-0.5"
          aria-label="Mở Trợ lý Quà Việt"
          title="Hỏi giá và thông tin"
        >
          <MessageCircle size={24} aria-hidden />
        </button>
      )}

      {isOpen && (
        <section
          className="fixed inset-x-3 bottom-3 z-[70] flex h-[min(620px,calc(100dvh-24px))] w-auto flex-col overflow-hidden rounded-lg border border-[#CAD5D0] bg-white shadow-[0_24px_70px_rgba(23,32,29,0.24)] sm:left-auto sm:w-[390px]"
          aria-label="Trợ lý Quà Việt"
        >
          <header className="flex h-[72px] shrink-0 items-center gap-3 bg-[#17201D] px-4 text-white">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#F2C14E] text-[#17201D]">
              <Bot size={21} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-base font-bold">Trợ lý Quà Việt</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#C8D1CD]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#5FD0C4]" aria-hidden />
                Dữ liệu trực tiếp từ cửa hàng
              </span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-[#DCE4E0] hover:bg-[#2C3934] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label="Đóng trợ lý"
              title="Đóng"
            >
              <X size={20} aria-hidden />
            </button>
          </header>

          <div
            className="flex-1 overflow-y-auto bg-[#F7F8F5] px-3 py-4"
            aria-live="polite"
            aria-busy={isLoading}
          >
            <div className="mb-4 flex items-start gap-2 rounded-md border border-[#DDE4E0] bg-white px-3 py-2 text-[11px] leading-5 text-[#596760]">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#0F766E]" aria-hidden />
              Không nhập mật khẩu, OTP, mã PIN hoặc thông tin thẻ.
            </div>

            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={message.role === 'user' ? 'ml-10' : 'mr-5'}
                >
                  <div className={`flex items-start gap-2 ${message.role === 'user' ? 'justify-end' : ''}`}>
                    {message.role !== 'user' && (
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#DCEFEB] text-[#0F766E]">
                        <Sparkles size={14} aria-hidden />
                      </span>
                    )}
                    <p className={`rounded-lg px-3 py-2.5 text-sm leading-6 ${
                      message.role === 'user'
                        ? 'bg-[#0F766E] text-white'
                        : 'border border-[#DDE4E0] bg-white text-[#33413B]'
                    }`}>
                      {message.reply}
                    </p>
                  </div>

                  {!!message.products?.length && (
                    <div className="ml-9 mt-2 overflow-hidden rounded-lg border border-[#DDE4E0]">
                      {message.products.map((product) => (
                        <ProductResult
                          key={product.id}
                          product={product}
                          onNavigate={closeOnNavigate}
                        />
                      ))}
                    </div>
                  )}

                  {!!message.actions?.length && (
                    <div className="ml-9 mt-2 flex flex-wrap gap-2">
                      {message.actions.map((action) => (
                        <AssistantAction
                          key={`${action.label}-${action.href}`}
                          action={action}
                          onNavigate={closeOnNavigate}
                        />
                      ))}
                    </div>
                  )}

                  {!!message.suggestions?.length && (
                    <div className="ml-9 mt-2 flex flex-wrap gap-2">
                      {message.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => sendMessage(suggestion)}
                          disabled={isLoading}
                          className="min-h-8 rounded-md border border-[#CAD5D0] bg-transparent px-2.5 py-1.5 text-left text-xs font-semibold text-[#405049] hover:border-[#0F766E] hover:bg-white hover:text-[#0F766E] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="mr-12 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#DCEFEB] text-[#0F766E]">
                    <Sparkles size={14} aria-hidden />
                  </span>
                  <span className="flex h-10 items-center gap-2 rounded-lg border border-[#DDE4E0] bg-white px-3 text-xs text-[#68756F]">
                    <Spinner size="sm" label="Trợ lý đang trả lời..." className="text-[#0F766E]" />
                    <span aria-hidden="true">Đang trả lời...</span>
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="shrink-0 border-t border-[#DDE4E0] bg-white p-3">
            <div className="flex min-h-11 items-end gap-2 rounded-lg border border-[#CAD5D0] bg-white p-1.5 focus-within:border-[#0F766E]">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage(input);
                  }
                }}
                maxLength={300}
                rows={1}
                placeholder="Hỏi giá hoặc thông tin..."
                className="max-h-24 min-h-8 min-w-0 flex-1 resize-none px-2 py-1.5 text-sm leading-5 text-[#17201D] outline-none placeholder:text-[#8A9691]"
                aria-label="Câu hỏi cho Trợ lý Quà Việt"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#0F766E] text-white hover:bg-[#0B5F58] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E] disabled:cursor-not-allowed disabled:bg-[#A8B7B1]"
                aria-label="Gửi câu hỏi"
                title="Gửi"
              >
                <Send size={17} aria-hidden />
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-[#7A8781]">
              Trợ lý không lưu lịch sử sau khi bạn đóng trang.
            </p>
          </form>
        </section>
      )}
    </>
  );
}

export default ShoppingAssistant;
