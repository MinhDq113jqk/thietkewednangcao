import { Button as BsButton, Container as BsContainer, Form as BsForm } from 'react-bootstrap';
import { useAccountQuery } from '../../../hooks/useAccountQuery';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  MessageCircle,
  Package,
  Send,
  ShieldCheck,
  Store,
  UserRound,
} from 'lucide-react';
import chatApi from '../api/chatApi';
import Skeleton from '../../../components/ui/Skeleton';
import Spinner, { LoadingStatus } from '../../../components/ui/Spinner';
import { formatVnd, getProductPrice } from '../../../utils/format';

const formatMessageTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const pad = (number) => String(number).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())} · ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
};

const formatConversationTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const pad = (number) => String(number).padStart(2, '0');
  return sameDay
    ? `${pad(date.getHours())}:${pad(date.getMinutes())}`
    : `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
};

const getCounterpart = (conversation) => (
  conversation?.perspective === 'seller'
    ? {
        name: conversation.buyer?.name || 'Người mua',
        avatar: conversation.buyer?.avatar,
        label: 'Người mua',
      }
    : {
        name: conversation?.shop?.name || 'Gian hàng',
        avatar: conversation?.shop?.logo,
        label: 'Gian hàng',
      }
);

function CounterpartAvatar({ counterpart, size = 'md' }) {
  const sizeClass = size === 'lg' ? "messages-page-detail-1" : "messages-page-detail-2";

  return (
    <span className={`d-flex ${sizeClass} flex-shrink-0 align-items-center justify-content-center overflow-hidden rounded-2 bg-primary-subtle text-primary`}>
      {counterpart.avatar ? (
        <img src={counterpart.avatar} alt="" className="h-100 w-100 object-fit-cover" />
      ) : counterpart.label === 'Gian hàng' ? (
        <Store size={19} aria-hidden />
      ) : (
        <UserRound size={19} aria-hidden />
      )}
    </span>
  );
}

function ConversationList({ conversations, isLoading, onSelect, selectedId }) {
  if (isLoading) {
    return (
      <div className="p-2 messages-page-detail-3" aria-label="Đang tải tin nhắn" aria-busy="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="d-flex align-items-center gap-3 rounded-2 border p-2 messages-page-detail-4" aria-hidden="true">
            <Skeleton className="flex-shrink-0 rounded-pill messages-page-detail-5" />
            <div className="flex-grow-1 messages-page-detail-6">
              <Skeleton className="messages-page-detail-7" />
              <Skeleton className="messages-page-detail-8" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <div className="d-flex flex-grow-1 flex-column align-items-center justify-content-center px-4 text-center">
        <span className="d-flex align-items-center justify-content-center rounded-2 bg-primary-subtle text-primary messages-page-detail-9">
          <MessageCircle size={23} aria-hidden />
        </span>
        <h2 className="mt-3 fs-6 fw-bold text-dark">Chưa có cuộc trò chuyện</h2>
        <p className="mt-2 booking-small text-secondary messages-page-detail-10">
          Mở một sản phẩm và chọn “Nhắn người bán” để bắt đầu.
        </p>
        <Link
          to="/products"
          className="mt-3 d-inline-flex align-items-center justify-content-center rounded-2 bg-primary px-3 booking-small fw-bold messages-page-detail-11"
        >
          Khám phá sản phẩm
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto">
      {conversations.map((conversation) => {
        const counterpart = getCounterpart(conversation);
        const active = String(selectedId) === String(conversation.id);

        return (
          <BsButton variant="outline-primary"
            key={conversation.id}
            type="button"
            onClick={() => onSelect(conversation.id)}
            className={`d-grid w-100 gap-3 border-bottom px-2 py-2 text-start messages-page-detail-13 ${
              active ? "bg-primary-subtle" : "messages-page-detail-12"
            }`}
          >
            <CounterpartAvatar counterpart={counterpart} />
            <span className="messages-page-detail-14">
              <span className="d-flex align-items-center gap-2">
                <strong className="text-truncate booking-small text-dark">{counterpart.name}</strong>
                <span className="flex-shrink-0 fw-semibold text-uppercase text-secondary messages-page-detail-15">
                  {counterpart.label}
                </span>
              </span>
              <span className={`mt-1 d-block text-truncate booking-caption ${
                conversation.unreadCount ? "fw-bold text-body" : "text-secondary"
              }`}>
                {conversation.lastMessage || 'Chưa có tin nhắn'}
              </span>
            </span>
            <span className="d-flex flex-column align-items-end gap-1 messages-page-detail-16">
              <span className="text-nowrap text-secondary messages-page-detail-17">
                {formatConversationTime(conversation.lastMessageAt)}
              </span>
              {conversation.unreadCount > 0 && (
                <span className="d-flex align-items-center justify-content-center rounded-pill bg-danger px-1 fw-bold messages-page-detail-18">
                  {Math.min(conversation.unreadCount, 99)}
                </span>
              )}
            </span>
          </BsButton>
        );
      })}
    </div>
  );
}

function MessagesPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [messageBody, setMessageBody] = useState('');
  const selectedId = searchParams.get('conversation');
  const messagesEndRef = useRef(null);
  const lastMarkedReadRef = useRef('');

  const conversationsQuery = useAccountQuery({
    queryKey: ['conversations'],
    queryFn: chatApi.getConversations,
    refetchInterval: 20000,
  });
  const conversations = useMemo(
    () => conversationsQuery.data || [],
    [conversationsQuery.data]
  );
  const selectedConversation = conversations.find(
    (conversation) => String(conversation.id) === String(selectedId)
  );

  const messagesQuery = useAccountQuery({
    queryKey: ['conversation-messages', selectedId],
    queryFn: () => chatApi.getMessages(selectedId),
    enabled: Boolean(selectedId),
    refetchInterval: 8000,
  });
  const messages = useMemo(
    () => messagesQuery.data || [],
    [messagesQuery.data]
  );

  const sendMutation = useMutation({
    mutationFn: (body) => chatApi.sendMessage(selectedId, body),
    onSuccess: () => {
      setMessageBody('');
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  useEffect(() => {
    if (!selectedId || !messages.length || !selectedConversation?.unreadCount) return;
    const lastMessage = messages[messages.length - 1];
    const readKey = `${selectedId}:${lastMessage.id}:${selectedConversation.unreadCount}`;
    if (lastMarkedReadRef.current === readKey) return;

    lastMarkedReadRef.current = readKey;
    chatApi.markRead(selectedId)
      .then(() => queryClient.invalidateQueries({ queryKey: ['conversations'] }))
      .catch(() => {
        lastMarkedReadRef.current = '';
      });
  }, [messages, queryClient, selectedConversation?.unreadCount, selectedId]);

  useEffect(() => {
    if (selectedId) messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, selectedId]);

  const selectConversation = (conversationId) => {
    setSearchParams({ conversation: conversationId });
  };

  const closeConversation = () => {
    setSearchParams({});
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const body = messageBody.trim();
    if (!body || sendMutation.isPending) return;
    sendMutation.mutate(body);
  };

  const counterpart = getCounterpart(selectedConversation);

  return (
    <BsContainer as="main" className="w-100 px-2 py-3 py-sm-4">
      <div className="mb-3">
        <p className="booking-caption fw-bold text-uppercase text-primary">Trao đổi trực tiếp</p>
        <h1 className="mt-1 booking-title fs-4 fw-semibold text-dark">Tin nhắn</h1>
      </div>

      <section
        className="d-grid overflow-hidden rounded-3 border shadow-sm messages-page-detail-19"
        aria-busy={conversationsQuery.isLoading || (Boolean(selectedId) && messagesQuery.isLoading)}
      >
        <aside className={`${selectedId ? "d-none d-md-flex" : "d-flex"} flex-column border-end messages-page-detail-20`}>
          <div className="d-flex flex-shrink-0 align-items-center justify-content-between border-bottom px-3 messages-page-detail-21">
            <strong className="booking-small text-dark">Cuộc trò chuyện</strong>
            <span className="booking-caption text-secondary">{conversations.length}</span>
          </div>
          <ConversationList
            conversations={conversations}
            isLoading={conversationsQuery.isLoading}
            onSelect={selectConversation}
            selectedId={selectedId}
          />
        </aside>

        <div className={`${selectedId ? "d-flex" : "d-none d-md-flex"} flex-column messages-page-detail-22`}>
          {!selectedId ? (
            <div className="d-flex flex-grow-1 flex-column align-items-center justify-content-center px-4 text-center">
              <MessageCircle size={42} strokeWidth={1.4} className="text-secondary" />
              <h2 className="mt-3 fs-5 fw-bold text-dark">Chọn một cuộc trò chuyện</h2>
              <p className="mt-2 booking-small text-secondary">
                Tin nhắn mới sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <>
              <header className="d-flex flex-shrink-0 align-items-center gap-3 border-bottom px-2 px-sm-3 messages-page-detail-23">
                <BsButton variant="outline-primary"
                  type="button"
                  onClick={closeConversation}
                  className="d-flex align-items-center justify-content-center d-md-none messages-page-detail-24"
                  aria-label="Quay lại danh sách tin nhắn"
                >
                  <ChevronLeft size={20} aria-hidden />
                </BsButton>
                <CounterpartAvatar counterpart={counterpart} size="lg" />
                <span className="flex-grow-1 messages-page-detail-25">
                  <strong className="d-block text-truncate booking-small text-dark">{counterpart.name}</strong>
                  <span className="d-block booking-caption text-secondary">{counterpart.label}</span>
                </span>
                {selectedConversation?.shop?.slug && (
                  <Link
                    to={`/shop/${selectedConversation.shop.slug}`}
                    className="d-none booking-caption fw-bold text-primary d-sm-block messages-page-detail-26"
                  >
                    Xem gian hàng
                  </Link>
                )}
              </header>

              {selectedConversation?.product && (
                <Link
                  to={`/products/${selectedConversation.product.id}`}
                  className="d-flex flex-shrink-0 align-items-center gap-3 border-bottom px-3 py-3 messages-page-detail-27"
                >
                  <span className="d-flex flex-shrink-0 align-items-center justify-content-center overflow-hidden rounded-2 text-primary messages-page-detail-28">
                    {selectedConversation.product.image ? (
                      <img
                        src={selectedConversation.product.image}
                        alt=""
                        className="h-100 w-100 object-fit-cover"
                      />
                    ) : (
                      <Package size={18} aria-hidden />
                    )}
                  </span>
                  <span className="flex-grow-1 messages-page-detail-29">
                    <span className="d-block text-truncate booking-caption fw-bold text-dark">
                      {selectedConversation.product.name}
                    </span>
                    <span className="mt-1 d-block booking-caption fw-bold text-danger">
                      {formatVnd(getProductPrice(selectedConversation.product))}
                    </span>
                  </span>
                  <span className="booking-caption fw-semibold text-primary">Xem sản phẩm</span>
                </Link>
              )}

              <div className="flex-grow-1 overflow-y-auto px-2 py-3 px-sm-4 messages-page-detail-30" aria-busy={messagesQuery.isLoading}>
                <BsContainer as="div" className="booking-compact">
                  <div className="mb-3 d-flex align-items-start gap-2 rounded-2 border px-2 py-2 text-secondary messages-page-detail-31">
                    <ShieldCheck size={15} className="mt-1 flex-shrink-0 text-primary" aria-hidden />
                    Không gửi mật khẩu, OTP hoặc thông tin thanh toán trong tin nhắn.
                  </div>

                  {messagesQuery.isLoading ? (
                    <LoadingStatus label="Đang tải tin nhắn..." className="py-5" />
                  ) : messages.length ? (
                    <div className="messages-page-detail-32">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`d-flex ${message.isMine ? "justify-content-end" : "justify-content-start"}`}
                        >
                          <div className={`rounded-3 px-2 py-3 messages-page-detail-35 ${
                            message.isMine
                              ? "bg-primary messages-page-detail-33"
                              : "border text-body messages-page-detail-34"
                          }`}>
                            <p className="text-break booking-small messages-page-detail-36">{message.body}</p>
                            <p className={`mt-1 text-end messages-page-detail-38 ${
                              message.isMine ? "messages-page-detail-37" : "text-secondary"
                            }`}>
                              {formatMessageTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-5 text-center">
                      <MessageCircle className="mx-auto text-secondary" size={36} strokeWidth={1.4} />
                      <h2 className="mt-2 booking-small fw-bold text-dark">Bắt đầu câu chuyện</h2>
                      <p className="mt-1 booking-caption text-secondary">
                        Hỏi về chất liệu, kích thước, tồn kho hoặc thời gian chuẩn bị.
                      </p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </BsContainer>
              </div>

              <BsForm onSubmit={handleSubmit} className="flex-shrink-0 border-top p-2 messages-page-detail-39">
                <BsContainer as="div" className="d-flex align-items-end gap-2 booking-compact">
                  <BsForm.Control as="textarea"
                    value={messageBody}
                    onChange={(event) => setMessageBody(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSubmit(event);
                      }
                    }}
                    rows={1}
                    maxLength={2000}
                    placeholder="Nhập tin nhắn..."
                    className="flex-grow-1 rounded-3 border px-2 py-3 booking-small text-dark messages-page-detail-40"
                    aria-label="Nội dung tin nhắn"
                  />
                  <BsButton variant="primary"
                    type="submit"
                    disabled={!messageBody.trim() || sendMutation.isPending}
                    aria-busy={sendMutation.isPending}
                    className="d-flex flex-shrink-0 align-items-center justify-content-center messages-page-detail-41"
                    aria-label="Gửi tin nhắn"
                    title="Gửi"
                  >
                    {sendMutation.isPending
                      ? <Spinner size="sm" label="Đang gửi tin nhắn..." />
                      : <Send size={18} aria-hidden />}
                  </BsButton>
                </BsContainer>
                {sendMutation.isError && (
                  <p className="mx-auto mt-2 booking-caption text-danger messages-page-detail-42">
                    Chưa gửi được tin nhắn. Vui lòng thử lại.
                  </p>
                )}
              </BsForm>
            </>
          )}
        </div>
      </section>

      <p className="mt-2 booking-caption text-secondary">
        Tin nhắn tự làm mới định kỳ. Không chia sẻ thông tin nhạy cảm trong cuộc trò chuyện.
      </p>
    </BsContainer>
  );
}

export default MessagesPage;
