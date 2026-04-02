import ThreadPage from '@/components/conversation/ThreadPage';

export const dynamic = 'force-dynamic';

/**
 * Root page — renders the conversation thread.
 * This is the entire product. One screen. One conversation.
 */
export default function Page() {
  return <ThreadPage />;
}
