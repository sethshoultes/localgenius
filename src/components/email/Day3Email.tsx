/**
 * Day 3 Email — "Here's what I've been up to"
 *
 * Sent 3 days after onboarding. Builds trust by showing work done.
 * Emotion: pride in what's already happening without effort.
 */

import * as React from "react";

interface Day3EmailProps {
  businessName: string;
  ownerName: string;
  postsCreated: number;
  reviewsResponded: number;
  websiteVisitors: number;
  topPost?: string;
}

export function Day3Email({
  businessName,
  ownerName,
  postsCreated,
  reviewsResponded,
  websiteVisitors,
  topPost,
}: Day3EmailProps) {
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
                      Three days in. Here&apos;s what I&apos;ve been up to.
                    </h2>

                    <p style={styles.text}>
                      {ownerName}, while you&apos;ve been running {businessName},
                      I&apos;ve been working in the background. Quick update:
                    </p>

                    {/* Stats */}
                    <table
                      width="100%"
                      cellPadding={0}
                      cellSpacing={0}
                      style={styles.statsTable}
                    >
                      <tr>
                        <td style={styles.statCell}>
                          <span style={styles.statNumber}>{postsCreated}</span>
                          <span style={styles.statLabel}>
                            {postsCreated === 1 ? "post" : "posts"} drafted
                          </span>
                        </td>
                        <td style={styles.statCell}>
                          <span style={styles.statNumber}>{reviewsResponded}</span>
                          <span style={styles.statLabel}>
                            {reviewsResponded === 1 ? "review" : "reviews"} answered
                          </span>
                        </td>
                        <td style={styles.statCell}>
                          <span style={styles.statNumber}>{websiteVisitors}</span>
                          <span style={styles.statLabel}>
                            people visited your site
                          </span>
                        </td>
                      </tr>
                    </table>

                    {topPost && (
                      <>
                        <p style={styles.text}>
                          <strong>Your best post so far:</strong>
                        </p>
                        <table
                          width="100%"
                          cellPadding={0}
                          cellSpacing={0}
                        >
                          <tr>
                            <td style={styles.quoteBlock}>
                              {topPost}
                            </td>
                          </tr>
                        </table>
                      </>
                    )}

                    <p style={styles.text}>
                      Everything I do waits for your approval. Nothing goes
                      live unless you say so. If you haven&apos;t checked in
                      yet, there might be a few things waiting for you.
                    </p>

                    <table
                      width="100%"
                      cellPadding={0}
                      cellSpacing={0}
                    >
                      <tr>
                        <td align="center" style={{ padding: "16px 0 24px" }}>
                          <a href="https://localgenius.company/app" style={styles.button}>
                            Check in
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
    padding: "20px 8px",
    width: "33.33%",
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
  quoteBlock: {
    backgroundColor: "#F2EDE8",
    padding: "16px 20px",
    borderRadius: "6px",
    color: "#2C2C2C",
    fontSize: "15px",
    fontStyle: "italic",
    lineHeight: "1.6",
    margin: "0 0 24px",
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
