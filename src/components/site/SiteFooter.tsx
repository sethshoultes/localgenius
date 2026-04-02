export interface SiteFooterProps {
  businessName: string;
  address: string;
  phone: string;
}

/**
 * SiteFooter — Footer with business info and LocalGenius credit
 *
 * Features:
 * - Business name (Lora serif)
 * - Address and phone (clickable tel: link)
 * - "Made with LocalGenius" credit in sage color
 * - Responsive layout
 *
 * Server component (no 'use client' directive)
 */
export default function SiteFooter({
  businessName,
  address,
  phone,
}: SiteFooterProps) {
  // Sanitize phone number for tel: link
  const phoneHref = `tel:${phone.replace(/[^+\d]/g, '')}`;

  return (
    <footer
      className="border-t"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderTopColor: 'var(--border-default)',
        paddingTop: 'var(--space-12)',
        paddingBottom: 'var(--space-6)',
        marginTop: 'var(--space-16)',
      }}
    >
      <div
        className="mx-auto max-w-full px-5 md:px-10 flex flex-col gap-8"
        style={{
          maxWidth: '100%',
        }}
      >
        {/* Main footer content */}
        <div className="flex justify-between gap-8 flex-wrap md:flex-nowrap">
          {/* Business Info */}
          <div className="flex flex-col gap-1.5">
            <p
              style={{
                fontFamily: "'Lora', 'Georgia', serif",
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '0.25rem',
              }}
            >
              {businessName}
            </p>

            {address && (
              <p
                style={{
                  fontSize: '0.9375rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {address}
              </p>
            )}

            {phone && (
              <p style={{ margin: 0 }}>
                <a
                  href={phoneHref}
                  className="no-underline hover:underline transition-all"
                  style={{
                    fontSize: '0.9375rem',
                    color: 'var(--action-primary)',
                    fontWeight: 500,
                  }}
                >
                  {phone}
                </a>
              </p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            borderTop: '1px solid var(--border-default)',
            paddingTop: 'var(--space-5)',
          }}
        >
          {/* LocalGenius credit */}
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--color-sage-text)',
              letterSpacing: '0.02em',
              marginBottom: 0,
              textAlign: 'center',
            }}
          >
            Made with LocalGenius
          </p>
        </div>
      </div>
    </footer>
  );
}
