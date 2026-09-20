import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import Skeleton from '../components/ui/Skeleton';
import Spinner, { LoadingStatus } from '../components/ui/Spinner';
import { formatVnd, getProductPrice } from '../utils/format';

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
  const sizeClass = size === 'lg' ? 'h-11 w-11' : 'h-10 w-10';

  return (
    <span className={`flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#E6F3F1] text-[#0F766E]`}>
      {counterpart.avatar ? (
        <img src={counterpart.avatar} alt="" className="h-full w-full object-cover" />
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
      <div className="space-y-2 p-3" aria-label="Đang tải tin nhắn" aria-busy="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex h-20 items-center gap-3 rounded-md border border-transparent p-3" aria-hidden="true">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[#E6F3F1] text-[#0F766E]">
          <MessageCircle size={23} aria-hidden />
        </span>
        <h2 className="mt-4 text-base font-bold text-[#17201D]">Chưa có cuộc trò chuyện</h2>
        <p className="mt-2 text-sm leading-6 text-[#68756F]">
          Mở một sản phẩm và chọn “Nhắn người bán” để bắt đầu.
        </p>
        <Link
          to="/products"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-[#0F766E] px-4 text-sm font-bold text-white hover:bg-[#0B5F58]"
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
          <button
            key={conversation.id}
            type="button"
            onClick={() => onSelect(conversation.id)}
            className={`grid w-full grid-cols-[40px_1fr_auto] gap-3 border-b border-[#E6EBE8] px-3 py-3 text-left transition ${
              active ? 'bg-[#E6F3F1]' : 'bg-white hover:bg-[#F7F9F8]'
            }`}
          >
            <CounterpartAvatar counterpart={counterpart} />
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <strong className="truncate text-sm text-[#17201D]">{counterpart.name}</strong>
                <span className="shrink-0 text-[10px] font-semibold uppercase text-[#7A8781]">
                  {counterpart.label}
                </span>
              </span>
              <span className={`mt-1 block truncate text-xs ${
                conversation.unreadCount ? 'font-bold text-[#33413B]' : 'text-[#7A8781]'
              }`}>
                {conversation.lastMessage || 'Chưa có tin nhắn'}
              </span>
            </span>
            <span className="flex min-w-7 flex-col items-end gap-1">
              <span className="whitespace-nowrap text-[10px] text-[#8A9691]">
                {formatConversationTime(conversation.lastMessageAt)}
              </span>
              {conversation.unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C93F2C] px-1 text-[10px] font-bold text-white">
                  {Math.min(conversation.unreadCount, 99)}
                </span>
              )}
            </span>
          </button>
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

  const conversationsQuery = useQuery({
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

  const messagesQuery = useQuery({
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
    <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase text-[#0F766E]">Trao đổi trực tiếp</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-[#17201D]">Tin nhắn</h1>
      </div>

      <section
        className="grid h-[calc(100dvh-245px)] min-h-[420px] max-h-[720px] overflow-hidden rounded-lg border border-[#D5DEDA] bg-white shadow-sm md:h-[calc(100dvh-180px)] md:min-h-[520px] md:grid-cols-[310px_minmax(0,1fr)]"
        aria-busy={conversationsQuery.isLoading || (Boolean(selectedId) && messagesQuery.isLoading)}
      >
        <aside className={`${selectedId ? 'hidden md:flex' : 'flex'} min-h-0 flex-col border-r border-[#DDE4E0]`}>
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#DDE4E0] px-4">
            <strong className="text-sm text-[#17201D]">Cuộc trò chuyện</strong>
            <span className="text-xs text-[#7A8781]">{conversations.length}</span>
          </div>
          <ConversationList
            conversations={conversations}
            isLoading={conversationsQuery.isLoading}
            onSelect={selectConversation}
            selectedId={selectedId}
          />
        </aside>

        <div className={`${selectedId ? 'flex' : 'hidden md:flex'} min-h-0 flex-col`}>
          {!selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <MessageCircle size={42} strokeWidth={1.4} className="text-[#8A9691]" />
              <h2 className="mt-4 text-lg font-bold text-[#17201D]">Chọn một cuộc trò chuyện</h2>
              <p className="mt-2 text-sm text-[#68756F]">
                Tin nhắn mới sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <>
              <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[#DDE4E0] px-3 sm:px-4">
                <button
                  type="button"
                  onClick={closeConversation}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-[#405049] hover:bg-[#EEF4F1] md:hidden"
                  aria-label="Quay lại danh sách tin nhắn"
                >
                  <ChevronLeft size={20} aria-hidden />
                </button>
                <CounterpartAvatar counterpart={counterpart} size="lg" />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm text-[#17201D]">{counterpart.name}</strong>
                  <span className="block text-xs text-[#68756F]">{counterpart.label}</span>
                </span>
                {selectedConversation?.shop?.slug && (
                  <Link
                    to={`/shop/${selectedConversation.shop.slug}`}
                    className="hidden text-xs font-bold text-[#0F766E] hover:underline sm:block"
                  >
                    Xem gian hàng
                  </Link>
                )}
              </header>

              {selectedConversation?.product && (
                <Link
                  to={`/products/${selectedConversation.product.id}`}
                  className="flex shrink-0 items-center gap-3 border-b border-[#DDE4E0] bg-[#F7F9F8] px-4 py-2.5 hover:bg-[#EEF4F1]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white text-[#0F766E]">
                    {selectedConversation.product.image ? (
                      <img
                        src={selectedConversation.product.image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package size={18} aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-[#17201D]">
                      {selectedConversation.product.name}
                    </span>
                    <span className="mt-0.5 block text-xs font-bold text-[#C93F2C]">
                      {formatVnd(getProductPrice(selectedConversation.product))}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-[#0F766E]">Xem sản phẩm</span>
                </Link>
              )}

              <div className="flex-1 overflow-y-auto bg-[#F7F8F5] px-3 py-4 sm:px-5" aria-busy={messagesQuery.isLoading}>
                <div className="mx-auto max-w-3xl">
                  <div className="mb-4 flex items-start gap-2 rounded-md border border-[#DDE4E0] bg-white px-3 py-2 text-[11px] leading-5 text-[#596760]">
                    <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#0F766E]" aria-hidden />
                    Không gửi mật khẩu, OTP hoặc thông tin thanh toán trong tin nhắn.
                  </div>

                  {messagesQuery.isLoading ? (
                    <LoadingStatus label="Đang tải tin nhắn..." className="py-10" />
                  ) : messages.length ? (
                    <div className="space-y-3">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.isMine ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[82%] rounded-lg px-3 py-2.5 ${
                            message.isMine
                              ? 'bg-[#0F766E] text-white'
                              : 'border border-[#DDE4E0] bg-white text-[#33413B]'
                          }`}>
                            <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p>
                            <p className={`mt-1 text-right text-[10px] ${
                              message.isMine ? 'text-[#CDE7E3]' : 'text-[#8A9691]'
                            }`}>
                              {formatMessageTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <MessageCircle className="mx-auto text-[#8A9691]" size={36} strokeWidth={1.4} />
                      <h2 className="mt-3 text-sm font-bold text-[#17201D]">Bắt đầu câu chuyện</h2>
                      <p className="mt-1 text-xs text-[#7A8781]">
                        Hỏi về chất liệu, kích thước, tồn kho hoặc thời gian chuẩn bị.
                      </p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="shrink-0 border-t border-[#DDE4E0] bg-white p-3">
                <div className="mx-auto flex max-w-3xl items-end gap-2">
                  <textarea
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
                    className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-lg border border-[#CAD5D0] px-3 py-2.5 text-sm leading-6 text-[#17201D] outline-none focus:border-[#0F766E]"
                    aria-label="Nội dung tin nhắn"
                  />
                  <button
                    type="submit"
                    disabled={!messageBody.trim() || sendMutation.isPending}
                    aria-busy={sendMutation.isPending}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#0F766E] text-white hover:bg-[#0B5F58] disabled:cursor-not-allowed disabled:bg-[#A8B7B1]"
                    aria-label="Gửi tin nhắn"
                    title="Gửi"
                  >
                    {sendMutation.isPending
                      ? <Spinner size="sm" label="Đang gửi tin nhắn..." />
                      : <Send size={18} aria-hidden />}
                  </button>
                </div>
                {sendMutation.isError && (
                  <p className="mx-auto mt-2 max-w-3xl text-xs text-[#C93F2C]">
                    Chưa gửi được tin nhắn. Vui lòng thử lại.
                  </p>
                )}
              </form>
            </>
          )}
        </div>
      </section>

      <p className="mt-3 text-xs text-[#7A8781]">
        Tin nhắn tự làm mới định kỳ. Không chia sẻ thông tin nhạy cảm trong cuộc trò chuyện.
      </p>
    </main>
  );
}

export default MessagesPage;
