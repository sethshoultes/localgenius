'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ConversationThread, { type ThreadMessage } from '@/components/conversation/ConversationThread';
import QuickActions from '@/components/conversation/QuickActions';
import Input from '@/components/shared/Input';
import ErrorBanner from '@/components/shared/ErrorBanner';
import { MessageSkeleton } from '@/components/shared/Skeleton';
import {
  getConversation,
  streamMessage,
  publishContent,
  sendMessage,
  type Message,
  ApiError,
} from '@/lib/api';

function apiMessageToThread(msg: Message): ThreadMessage {
  return {
    id: msg.id,
    type:
      msg.role === 'user'
        ? 'user_message'
        : msg.type === 'approval' && msg.metadata?.fields
          ? 'settings_card'
          : msg.type === 'approval'
            ? 'approval_card'
            : msg.type === 'report'
              ? 'report_card'
            : 'system_message',
    content: msg.content,
    timestamp: formatTimestamp(msg.createdAt),
    metadata: msg.metadata as ThreadMessage['metadata'],
  };
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const WELCOME_MESSAGE: ThreadMessage = {
  id: 'welcome',
  type: 'system_message',
  content:
    "Good morning. I've been getting things set up for you — your website is live, your Google listing is updated, and I'm keeping an eye on your reviews. Whenever you need something, just tell me here. I'll handle the rest.",
  timestamp: 'Just now',
};

export default function ThreadPage() {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitLoading, setIsInitLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const cancelStreamRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const conv = await getConversation();
        if (mounted) {
          setConversationId(conv.id);
          setMessages(
            conv.messages.length > 0
              ? conv.messages.map(apiMessageToThread)
              : [WELCOME_MESSAGE],
          );
        }
      } catch (err) {
        if (mounted) {
          // No conversation yet (new user) or network error — show welcome
          setConversationId(null);
          setMessages([WELCOME_MESSAGE]);
          if (err instanceof ApiError && err.status !== 404) {
            setError('Could not load your conversation. Please refresh.');
          }
        }
      } finally {
        if (mounted) setIsInitLoading(false);
      }
    }

    init();
    return () => { mounted = false; };
  }, []);

  const handleSend = useCallback(
    (text: string) => {
      if (!conversationId || !text.trim()) return;

      setError(null);
      const userMsg: ThreadMessage = {
        id: `user-${Date.now()}`,
        type: 'user_message',
        content: text,
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputValue('');
      setIsLoading(true);
      setStreamingContent('');

      const cancel = streamMessage(
        conversationId,
        text,
        (chunk) => setStreamingContent((prev) => prev + chunk),
        (message) => {
          setStreamingContent('');
          setIsLoading(false);
          setMessages((prev) => [...prev, apiMessageToThread(message)]);
        },
        (err) => {
          setStreamingContent('');
          setIsLoading(false);
          if (err instanceof ApiError && err.status >= 500) {
            setError('Something went wrong. Tap Retry to try again.');
          } else {
            const fallback: ThreadMessage = {
              id: `system-${Date.now()}`,
              type: 'system_message',
              content: "Got it — I'll handle that. Here's what I'm working on for you...",
              timestamp: 'Just now',
            };
            setMessages((prev) => [...prev, fallback]);
          }
        },
      );

      cancelStreamRef.current = cancel;
    },
    [conversationId],
  );

  const handleRetry = () => {
    setError(null);
    const lastUserMsg = [...messages].reverse().find((m) => m.type === 'user_message');
    if (lastUserMsg) {
      setMessages((prev) => prev.filter((m) => m.id !== lastUserMsg.id));
      handleSend(lastUserMsg.content);
    }
  };

  const handleApprove = useCallback(
    async (msg: ThreadMessage) => {
      if (!conversationId) return;
      try {
        if (msg.metadata?.contentId) {
          await publishContent(msg.metadata.contentId);
        } else {
          await sendMessage(conversationId, `Approved: ${msg.metadata?.title ?? msg.content}`);
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id
              ? { ...m, metadata: { ...m.metadata, status: 'approved' as const } }
              : m,
          ),
        );
      } catch {
        setError('Failed to approve. Please try again.');
      }
    },
    [conversationId],
  );

  const handleEdit = useCallback(
    (msg: ThreadMessage) => {
      setInputValue(msg.content);
    },
    [],
  );

  const handleSettingsSave = useCallback(
    async (values: Record<string, string>) => {
      try {
        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ step: 'confirm', data: values }),
        });
        if (!res.ok) throw new Error('Request failed');
      } catch {
        setError('Failed to save settings. Please try again.');
      }
    },
    [],
  );

  const displayMessages = [...messages];
  if (streamingContent) {
    displayMessages.push({
      id: 'streaming',
      type: 'system_message',
      content: streamingContent,
      timestamp: 'Just now',
    });
  }

  if (isInitLoading) {
    return <MessageSkeleton />;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {error && (
        <ErrorBanner
          message={error}
          onRetry={handleRetry}
          onDismiss={() => setError(null)}
        />
      )}

      <ConversationThread
        messages={displayMessages}
        isLoading={isLoading && !streamingContent}
        onApprove={handleApprove}
        onEdit={handleEdit}
        onSettingsSave={handleSettingsSave}
      />

      {/* Quick actions + spacer for fixed input bar */}
      <div className="h-[112px] flex-shrink-0" />

      <QuickActions
        onSelect={(command) => {
          setInputValue(command);
        }}
        visible={!isLoading && messages.length > 0}
      />

      <Input
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSend}
        placeholder="Talk to LocalGenius..."
        disabled={isLoading}
      />
    </div>
  );
}
