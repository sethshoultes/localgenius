/**
 * Day 14 Email — "Two weeks. Let's talk about what's next."
 *
 * The relationship-deepening email. By now Maria has seen two digests,
 * approved several posts, and (hopefully) received real value.
 * This is the soft ask: commit to the habit, share with a friend.
 * Emotion: quiet confidence, partnership.
 */

import * as React from "react";

interface Day14EmailProps {
  businessName: string;
  ownerName: string;
  totalWebsiteVisitors: number;
  totalReviewsHandled: number;
  totalPostsPublished: number;
  averageRating: number;
  ratingChange?: number;
  recommendedNextStep: string;
}

export function Day14Email({
  businessName,
  ownerName,
  totalWebsiteVisitors,
  totalReviewsHandled,
  totalPostsPublished,
  averageRating,
  ratingChange,
  recommendedNextStep,
}: Day14EmailProps) {
  const ratingText = ratingChange && ratingChange > 0
    ? `${averageRating} (up from ${(averageRating - ratingChange).toFixed(1)} two weeks ago)`
    : `${averageRating}`;

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={styles.body}>
        <table
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={styles.wrapper}
        >
          <tr>
            <td align="center">
              <table
                width="600"
                cellPadding={0}
                cellSpacing={0}
                style={styles.container}
              >
                {/* Header */}
                <tr>
                  <td style={styles.header}>
                    <h1 style={styles.logo}>LocalGenius</h1>
                  </td>
                </tr>

                {/* Body */}
                <tr>
                  <td style={styles.content}>
                    <h2 style={styles.heading}>
                      Two weeks of {businessName}. Here&apos;s where you stand.
                    </h2>

                    <p style={styles.text}>
                      {ownerName}, we&apos;ve been working together for two
                      weeks now. Here&apos;s what that looks like:
                    </p>

                    {/* Two-week summary */}
                    <table
                      width="100%"
                      cellPadding={0}
                      cellSpacing={0}
                      style={styles.summaryTable}
                    >
                      <tr>
                        <td style={styles.summaryRow}>
                          <span style={styles.summaryLabel}>People who found you online</span>
                          <span style={styles.summaryValue}>{totalWebsiteVisitors.toLocaleString()}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style={styles.summaryRow}>
                          <span style={styles.summaryLabel}>Reviews handled</span>
                          <span style={styles.summaryValue}>{totalReviewsHandled}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style={styles.summaryRow}>
                          <span style={styles.summaryLabel}>Posts published</span>
                          <span style={styles.summaryValue}>{totalPostsPublished}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style={styles.summaryRowLast}>
                          <span style={styles.summaryLabel}>Your Google rating</span>
                          <span style={styles.summaryValue}>{ratingText}</span>
                        </td>
                      </tr>
                    </table>

                    <p style={styles.text}>
                      None of that required you to write a post, respond to a
                      review, or update a listing. That&apos;s time back in
                      your day.
                    </p>

                    {/* Recommendation */}
                    <table
                      width="100%"
                      cellPadding={0}
                      cellSpacing={0}
                    >
                      <tr>
                        <td style={styles.recommendBlock}>
                          <span style={styles.recommendLabel}>My recommendation</span>
                          <span style={styles.recommendText}>{recommendedNextStep}</span>
                        </td>
                      </tr>
                    </table>

                    <p style={styles.text}>
                      If LocalGenius has been helpful, the best thing you can
                      do is tell one person who runs a local business. Not
                      because I need the growth — because they probably need
                      the help.
                    </p>

                    <table
                      width="100%"
                      cellPadding={0}
                      cellSpacing={0}
                    >
                      <tr>
                        <td align="center" style={{ padding: "16px 0 8px" }}>
                          <a href="https://localgenius.company/app" style={styles.button}>
                            Open LocalGenius
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style={{ padding: "8px 0 24px" }}>
                          <a href="https://localgenius.company/welcome" style={styles.secondaryLink}>
                            Share with a friend
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style={styles.textMuted}>
                      Your business, handled.
                    </p>
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td style={styles.footer}>
                    <p style={styles.footerText}>
                      LocalGenius &middot; The marketing teammate for local
                      businesses
                    </p>
                    <p style={styles.footerText}>
                      Questions? Just reply to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    margin: 0,
    padding: 0,
    backgroundColor: "#FAF8F5",
    fontFamily:
      "'Source Sans 3', 'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  wrapper: { backgroundColor: "#FAF8F5" },
  container: {
    maxWidth: "600px",
    backgroundColor: "#FFFFFF",
    borderRadius: "8px",
    overflow: "hidden",
    margin: "32px auto",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  header: {
    backgroundColor: "#2C2C2C",
    padding: "32px 40px 28px",
  },
  logo: {
    color: "#FAF8F5",
    fontSize: "22px",
    fontWeight: 700,
    margin: 0,
    letterSpacing: "-0.02em",
  },
  content: { padding: "36px 40px" },
  heading: {
    color: "#2C2C2C",
    fontSize: "24px",
    fontWeight: 700,
    margin: "0 0 16px",
    lineHeight: "1.3",
  },
  text: {
    color: "#2C2C2C",
    fontSize: "16px",
    lineHeight: "1.6",
    margin: "0 0 16px",
  },
  textMuted: {
    color: "#7A8B6F",
    fontSize: "16px",
    fontStyle: "italic",
    lineHeight: "1.6",
    margin: "0",
  },
  summaryTable: {
    margin: "24px 0",
  },
  summaryRow: {
    padding: "14px 0",
    borderBottom: "1px solid #F0EDE8",
  },
  summaryRowLast: {
    padding: "14px 0",
  },
  summaryLabel: {
    color: "#6B7280",
    fontSize: "15px",
  },
  summaryValue: {
    float: "right" as const,
    color: "#2C2C2C",
    fontSize: "15px",
    fontWeight: 700,
  },
  recommendBlock: {
    backgroundColor: "#F5E0D5",
    padding: "20px 24px",
    borderRadius: "6px",
    margin: "0 0 24px",
  },
  recommendLabel: {
    display: "block",
    color: "#A35535",
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    marginBottom: "8px",
  },
  recommendText: {
    display: "block",
    color: "#2C2C2C",
    fontSize: "16px",
    lineHeight: "1.5",
  },
  button: {
    display: "inline-block",
    backgroundColor: "#C4704B",
    color: "#FFFFFF",
    fontSize: "16px",
    fontWeight: 600,
    padding: "14px 32px",
    borderRadius: "6px",
    textDecoration: "none",
    textAlign: "center" as const,
  },
  secondaryLink: {
    color: "#A35535",
    fontSize: "14px",
    textDecoration: "underline",
  },
  footer: {
    backgroundColor: "#FAF8F5",
    padding: "24px 40px",
    borderTop: "1px solid #F0EDE8",
  },
  footerText: {
    color: "#999999",
    fontSize: "13px",
    lineHeight: "1.5",
    margin: "0 0 4px",
  },
};
