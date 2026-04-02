'use client';

import { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import ApprovalCard from './ApprovalCard';

export type ThreadMessageType = 'user_message' | 'system_message' | 'approval_card' | 'report_card';

export interface ThreadMessage {
  id: string;
  type: ThreadMessageType;
  content: string;
  timestamp: string;
  metadata?: {
    title?: string;
    description?: string;
    primaryLabel?: string;
    secondaryLabel?: string;
    status?: 'pending' | 'approved' | 'dismissed' | 'published' | 'scheduled';
  };
}

interface ConversationThreadProps {
  messages: ThreadMessage[];
  isLoading?: boolean;
}

export default function ConversationThread({
  messages,
  isLoading = false,
}: ConversationThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages (if near bottom)
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;

    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const renderMessage = (msg: ThreadMessage) => {
    switch (msg.type) {
      case 'user_message':
        return (
          <MessageBubble
            key={msg.id}
            variant="user"
            content={msg.content}
            timestamp={msg.timestamp}
          />
        );

      case 'system_message':
        return (
          <MessageBubble
            key={msg.id}
            variant="system"
            content={msg.content}
            timestamp={msg.timestamp}
          />
        );

      case 'approval_card':
        return (
          <ApprovalCard
            key={msg.id}
            title={msg.metadata?.title ?? 'Action'}
            description={msg.content}
            primaryAction={{
              label: msg.metadata?.primaryLabel ?? 'Approve',
              onPress: () => {/* TODO: wire to API */},
            }}
            secondaryAction={{
              label: msg.metadata?.secondaryLabel ?? 'Edit',
              onPress: () => {/* TODO: wire to edit flow */},
            }}
            status={msg.metadata?.status ?? 'pending'}
            timestamp={msg.timestamp}
          />
        );

      case 'report_card':
        return (
          <div key={msg.id} className="card-subtle animate-in">
            <p className="text-body text-charcoal">{msg.content}</p>
            <span className="text-caption text-slate mt-2 block">{msg.timestamp}</span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-screen-margin"
      role="log"
      aria-live="polite"
      aria-label="Conversation thread"
    >
      <div className="thread-container flex flex-col gap-content-gap py-6">
        {messages.map(renderMessage)}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-cream rounded-md rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-slate-light rounded-full animate-pulse-glow" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-slate-light rounded-full animate-pulse-glow" style={{ animationDelay: '200ms' }} />
              <span className="w-2 h-2 bg-slate-light rounded-full animate-pulse-glow" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
