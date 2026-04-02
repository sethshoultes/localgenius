'use client';

import { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import ApprovalCard from './ApprovalCard';
import SettingsCard from './SettingsCard';
import PublishedCard from './PublishedCard';
import ScheduledCard from './ScheduledCard';
import InsightCard from './InsightCard';
import ReviewAlertCard from './ReviewAlertCard';
import TypingIndicator from './TypingIndicator';

export type ThreadMessageType = 'user_message' | 'system_message' | 'approval_card' | 'report_card' | 'settings_card' | 'published_card' | 'scheduled_card' | 'insight_card' | 'review_alert_card';

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
    contentId?: string;
    actionId?: string;
    platform?: 'instagram' | 'facebook' | 'google';
    postUrl?: string;
    scheduledTime?: string;
    reviewId?: string;
    reviewerName?: string;
    rating?: number;
    reviewText?: string;
    draftResponse?: string;
    insight?: string;
    suggestion?: string;
    fields?: { key: string; label: string; value: string; type?: 'text' | 'tel' | 'url' | 'textarea'; placeholder?: string }[];
  };
}

interface ConversationThreadProps {
  messages: ThreadMessage[];
  isLoading?: boolean;
  onApprove?: (message: ThreadMessage) => void;
  onEdit?: (message: ThreadMessage) => void;
  onSettingsSave?: (values: Record<string, string>) => Promise<void>;
}

export default function ConversationThread({
  messages,
  isLoading = false,
  onApprove,
  onEdit,
  onSettingsSave,
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
              onPress: () => onApprove?.(msg),
            }}
            secondaryAction={{
              label: msg.metadata?.secondaryLabel ?? 'Edit',
              onPress: () => onEdit?.(msg),
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

      case 'settings_card':
        return (
          <SettingsCard
            key={msg.id}
            title={msg.metadata?.title ?? 'Update details'}
            description={msg.content}
            fields={msg.metadata?.fields ?? []}
            onSave={async (values) => {
              if (onSettingsSave) {
                await onSettingsSave(values);
              }
            }}
            timestamp={msg.timestamp}
          />
        );

      case 'published_card':
        return (
          <PublishedCard
            key={msg.id}
            platform={msg.metadata?.platform ?? 'instagram'}
            title={msg.metadata?.title ?? 'Post published'}
            preview={msg.content}
            postUrl={msg.metadata?.postUrl}
            timestamp={msg.timestamp}
          />
        );

      case 'scheduled_card':
        return (
          <ScheduledCard
            key={msg.id}
            title={msg.metadata?.title ?? 'Post scheduled'}
            description={msg.content}
            scheduledTime={msg.metadata?.scheduledTime ?? ''}
            platform={msg.metadata?.platform ?? 'instagram'}
            onCancel={() => {/* TODO: call cancel endpoint */}}
            timestamp={msg.timestamp}
          />
        );

      case 'insight_card':
        return (
          <InsightCard
            key={msg.id}
            insight={msg.metadata?.insight ?? msg.content}
            suggestion={msg.metadata?.suggestion ?? ''}
            onAccept={() => {/* TODO: act on insight */}}
            onDismiss={() => {/* TODO: dismiss insight */}}
            timestamp={msg.timestamp}
          />
        );

      case 'review_alert_card':
        return (
          <ReviewAlertCard
            key={msg.id}
            reviewerName={msg.metadata?.reviewerName ?? 'Someone'}
            rating={msg.metadata?.rating ?? 5}
            reviewText={msg.content}
            platform={(msg.metadata?.platform as 'google' | 'yelp') ?? 'google'}
            draftResponse={msg.metadata?.draftResponse ?? ''}
            onApproveResponse={(response) => {
              if (msg.metadata?.reviewId) {
                // TODO: call respondToReview
              }
            }}
            onEditResponse={(response) => {
              // TODO: open edit flow
            }}
            timestamp={msg.timestamp}
          />
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
      <div className="thread-container flex flex-col gap-content-gap py-6 animate-in">
        {messages.map(renderMessage)}

        {/* Typing indicator */}
        {isLoading && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
