/**
 * Marketing layout — passthrough.
 *
 * Header and footer are provided by the root layout (Header.tsx + GlobalFooter.tsx).
 * This layout exists only to group marketing pages under a route segment.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
