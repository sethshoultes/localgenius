import { MessageSkeleton } from '@/components/shared/Skeleton';

/**
 * App loading state — thread skeleton so it feels like
 * the conversation is about to appear.
 */
export default function AppLoading() {
  return <MessageSkeleton />;
}
