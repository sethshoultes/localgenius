import ThreadPage from '@/components/conversation/ThreadPage';
import AppShell from '@/components/conversation/AppShell';

/**
 * /app — The conversation thread. The entire product.
 * Behind onboarding/auth. Maria sees this after signing up.
 */
export default function AppPage() {
  return (
    <AppShell>
      <ThreadPage />
    </AppShell>
  );
}
