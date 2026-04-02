/**
 * Day 7 Email — "Your first week"
 *
 * Sent 7 days after onboarding, alongside the first Weekly Digest.
 * Reinforces the value delivered. First real proof of ROI.
 * Emotion: pride, relief, "this is actually working."
 */

import * as React from "react";

interface Day7EmailProps {
  businessName: string;
  ownerName: string;
  websiteVisitors: number;
  newReviews: number;
  postsPublished: number;
  socialReach: number;
  bestMoment: string;
}

export function Day7Email({
  businessName,
  ownerName,
  websiteVisitors,
  newReviews,
  postsPublished,
  socialReach,
  bestMoment,
}: Day7EmailProps) {
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
                      One week of {businessName}, handled.
                    </h2>

                    <p style={styles.text}>
                      {ownerName}, your first week is done. Here&apos;s what
                      happened while you were running your business:
                    </p>

                    {/* Week stats */}
                    <table
                      width="100%"
                      cellPadding={0}
                      cellSpacing={0}
                      style={styles.statsTable}
                    >
                      <tr>
                        <td style={styles.statCell}>
                          <span style={styles.statNumber}>{websiteVisitors}</span>
                          <span style={styles.statLabel}>people found your site</span>
                        </td>
                        <td style={styles.statCell}>
                          <span style={styles.statNumber}>{newReviews}</span>
                          <span style={styles.statLabel}>new reviews</span>
                        </td>
                      </tr>
                      <tr>
                        <td style={styles.statCell}>
                          <span style={styles.statNumber}>{postsPublished}</span>
                          <span style={styles.statLabel}>posts published</span>
                        </td>
                        <td style={styles.statCell}>
                          <span style={styles.statNumber}>{socialReach.toLocaleString()}</span>
                          <span style={styles.statLabel}>people reached</span>
                        </td>
                      </tr>
                    </table>

                    {/* Best moment */}
                    <table
                      width="100%"
                      cellPadding={0}
                      cellSpacing={0}
                    >
                      <tr>
                        <td style={styles.highlightBlock}>
                          <span style={styles.highlightLabel}>Best moment this week</span>
                          <span style={styles.highlightText}>{bestMoment}</span>
                        </td>
                      </tr>
                    </table>

                    <p style={styles.text}>
                      I also sent your first Weekly Digest to your
                      conversation — a quick summary of everything that
                      happened, everything I did, and what I recommend next.
                      It arrives every Monday.
                    </p>

                    <p style={styles.text}>
                      <strong>The best part?</strong> You didn&apos;t have to
                      think about any of this. That&apos;s the point.
                    </p>

                    <table
                      width="100%"
                      cellPadding={0}
                      cellSpacing={0}
                    >
                      <tr>
                        <td align="center" style={{ padding: "16px 0 24px" }}>
                          <a href="https://localgenius.company/app" style={styles.button}>
                            See the full digest
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
  statsTable: {
    margin: "24px 0",
    borderTop: "1px solid #F0EDE8",
    borderBottom: "1px solid #F0EDE8",
  },
  statCell: {
    textAlign: "center" as const,
    padding: "20px 12px",
    width: "50%",
  },
  statNumber: {
    display: "block",
    color: "#C4704B",
    fontSize: "28px",
    fontWeight: 700,
    lineHeight: "1.2",
  },
  statLabel: {
    display: "block",
    color: "#6B7280",
    fontSize: "13px",
    lineHeight: "1.4",
    marginTop: "4px",
  },
  highlightBlock: {
    backgroundColor: "#E8EDE5",
    padding: "20px 24px",
    borderRadius: "6px",
    margin: "0 0 24px",
  },
  highlightLabel: {
    display: "block",
    color: "#5C6B52",
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    marginBottom: "8px",
  },
  highlightText: {
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
