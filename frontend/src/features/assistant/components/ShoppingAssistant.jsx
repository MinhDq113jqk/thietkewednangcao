import { Button as BsButton, Form as BsForm } from 'react-bootstrap';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import assistantApi from '../api/assistantApi';
import Spinner from '../../../components/ui/Spinner';
import { formatVnd, getProductPrice } from '../../../utils/format';
import ProductImage from '../../products/components/ProductImage';
import ProductMetadata from '../../products/components/ProductMetadata';

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
  const className = "d-inline-flex align-items-center gap-2 rounded-2 border px-2 py-2 booking-caption fw-bold text-primary shopping-assistant-detail-1";

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
      className="d-grid align-items-center gap-3 border-top px-2 py-2 text-start shopping-assistant-detail-2"
    >
      <span className="d-flex align-items-center justify-content-center overflow-hidden rounded-2 text-primary shopping-assistant-detail-3">
        <ProductImage src={product.image} alt={product.name} compact />
      </span>
      <span className="shopping-assistant-detail-4">
        <span className="d-block text-truncate booking-small fw-bold text-dark">{product.name}</span>
        <span className="mt-1 d-block text-truncate booking-caption text-secondary">
          {product.shop?.name || product.category || 'SouvenirShop'}
        </span>
        <span className="mt-1 d-block booking-small fw-bold text-danger">
          {formatVnd(getProductPrice(product))}
        </span>
        <ProductMetadata product={product} className="mt-1" />
      </span>
      <ArrowRight size={16} className="text-secondary" aria-hidden />
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
        <BsButton variant="primary"
          type="button"
          onClick={() => setIsOpen(true)}
          className="booking-assistant-launcher"
          aria-label="Mở Trợ lý Quà Việt"
          title="Hỏi giá và thông tin"
        >
          <MessageCircle size={24} aria-hidden />
        </BsButton>
      )}

      {isOpen && (
        <section
          className="position-fixed d-flex w-auto flex-column overflow-hidden rounded-3 border shopping-assistant-detail-5"
          aria-label="Trợ lý Quà Việt"
        >
          <header className="d-flex flex-shrink-0 align-items-center gap-3 bg-dark-subtle px-3 shopping-assistant-detail-6">
            <span className="d-flex flex-shrink-0 align-items-center justify-content-center rounded-2 text-dark shopping-assistant-detail-7">
              <Bot size={21} aria-hidden />
            </span>
            <span className="flex-grow-1 shopping-assistant-detail-8">
              <span className="d-block booking-title fs-6 fw-bold">Trợ lý Quà Việt</span>
              <span className="mt-1 d-flex align-items-center gap-2 shopping-assistant-detail-9">
                <span className="rounded-pill shopping-assistant-detail-10" aria-hidden />
                Dữ liệu trực tiếp từ cửa hàng
              </span>
            </span>
            <BsButton variant="outline-primary"
              type="button"
              onClick={() => setIsOpen(false)}
              className="d-flex align-items-center justify-content-center shopping-assistant-detail-11"
              aria-label="Đóng trợ lý"
              title="Đóng"
            >
              <X size={20} aria-hidden />
            </BsButton>
          </header>

          <div
            className="flex-grow-1 overflow-y-auto px-2 py-3 shopping-assistant-detail-12"
            aria-live="polite"
            aria-busy={isLoading}
          >
            <div className="mb-3 d-flex align-items-start gap-2 rounded-2 border px-2 py-2 text-secondary shopping-assistant-detail-13">
              <ShieldCheck size={15} className="mt-1 flex-shrink-0 text-primary" aria-hidden />
              Không nhập mật khẩu, OTP, mã PIN hoặc thông tin thẻ.
            </div>

            <div className="shopping-assistant-detail-14">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={message.role === 'user' ? "ms-5" : "me-4"}
                >
                  <div className={`d-flex align-items-start gap-2 ${message.role === 'user' ? "justify-content-end" : ''}`}>
                    {message.role !== 'user' && (
                      <span className="mt-1 d-flex flex-shrink-0 align-items-center justify-content-center rounded-2 text-primary shopping-assistant-detail-15">
                        <Sparkles size={14} aria-hidden />
                      </span>
                    )}
                    <p className={`rounded-3 px-2 py-3 booking-small shopping-assistant-detail-18 ${
                      message.role === 'user'
                        ? "bg-primary shopping-assistant-detail-16"
                        : "border text-body shopping-assistant-detail-17"
                    }`}>
                      {message.reply}
                    </p>
                  </div>

                  {!!message.products?.length && (
                    <div className="ms-5 mt-2 overflow-hidden rounded-3 border shopping-assistant-detail-19">
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
                    <div className="ms-5 mt-2 d-flex flex-wrap gap-2">
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
                    <div className="ms-5 mt-2 d-flex flex-wrap gap-2">
                      {message.suggestions.map((suggestion) => (
                        <BsButton variant="outline-primary"
                          key={suggestion}
                          type="button"
                          onClick={() => sendMessage(suggestion)}
                          disabled={isLoading}
                          className="px-3 py-2 text-start booking-caption shopping-assistant-detail-20"
                        >
                          {suggestion}
                        </BsButton>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="me-5 d-flex align-items-center gap-2">
                  <span className="d-flex align-items-center justify-content-center rounded-2 text-primary shopping-assistant-detail-21">
                    <Sparkles size={14} aria-hidden />
                  </span>
                  <span className="d-flex align-items-center gap-2 rounded-3 border px-2 booking-caption text-secondary shopping-assistant-detail-22">
                    <Spinner size="sm" label="Trợ lý đang trả lời..." className="text-primary" />
                    <span aria-hidden="true">Đang trả lời...</span>
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <BsForm onSubmit={handleSubmit} className="flex-shrink-0 border-top p-2 shopping-assistant-detail-23">
            <div className="d-flex align-items-end gap-2 rounded-3 border p-2 shopping-assistant-detail-24">
              <BsForm.Control as="textarea"
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
                className="flex-grow-1 px-2 py-2 booking-small text-dark shopping-assistant-detail-25"
                aria-label="Câu hỏi cho Trợ lý Quà Việt"
              />
              <BsButton variant="primary"
                type="submit"
                disabled={!input.trim() || isLoading}
                className="d-flex flex-shrink-0 align-items-center justify-content-center shopping-assistant-detail-26"
                aria-label="Gửi câu hỏi"
                title="Gửi"
              >
                <Send size={17} aria-hidden />
              </BsButton>
            </div>
            <p className="mt-2 text-center text-secondary shopping-assistant-detail-27">
              Trợ lý không lưu lịch sử sau khi bạn đóng trang.
            </p>
          </BsForm>
        </section>
      )}
    </>
  );
}

export default ShoppingAssistant;
