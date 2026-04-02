/**
 * Welcome Email — sent after onboarding completes
 *
 * Warm, confident, sets expectations for the first week.
 */

import * as React from "react";

interface WelcomeEmailProps {
  businessName: string;
}

export function WelcomeEmail({ businessName }: WelcomeEmailProps) {
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
                      Welcome aboard, {businessName}.
                    </h2>
                    <p style={styles.text}>
                      You just hired the marketing teammate you always needed.
                      I'm already getting to know your business, your
                      neighborhood, and your customers.
                    </p>

                    <p style={styles.text}>
                      <strong>Here's what to expect this week:</strong>
                    </p>

                    <table
                      width="100%"
                      cellPadding={0}
                      cellSpacing={0}
                      style={{ marginBottom: "24px" }}
                    >
                      <tr>
                        <td style={styles.timelineItem}>
                          <span style={styles.timelineBadge}>Today</span>
                          <span style={styles.timelineText}>
                            I'll review your online presence and flag anything
                            that needs attention.
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style={styles.timelineItem}>
                          <span style={styles.timelineBadge}>Day 2-3</span>
                          <span style={styles.timelineText}>
                            Your first social post drafts and review response
                            suggestions will be ready for your approval.
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style={styles.timelineItem}>
                          <span style={styles.timelineBadge}>Day 7</span>
                          <span style={styles.timelineText}>
                            Your first Weekly Digest arrives — a plain-English
                            summary of what happened, what I did, and what's
                            next.
                          </span>
                        </td>
                      </tr>
                    </table>

                    <p style={styles.text}>
                      You're in control. Nothing goes live without your
                      say-so. Just open your conversation anytime to check in,
                      give direction, or ask a question.
                    </p>

                    <table
                      width="100%"
                      cellPadding={0}
                      cellSpacing={0}
                    >
                      <tr>
                        <td align="center" style={{ padding: "16px 0 24px" }}>
                          <a href="https://app.localgenius.com" style={styles.button}>
                            Open LocalGenius
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
  wrapper: {
    backgroundColor: "#FAF8F5",
  },
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
  content: {
    padding: "36px 40px",
  },
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
  timelineItem: {
    padding: "10px 0",
    borderBottom: "1px solid #F0EDE8",
  },
  timelineBadge: {
    display: "inline-block",
    backgroundColor: "#C4704B",
    color: "#FFFFFF",
    fontSize: "12px",
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: "12px",
    marginRight: "12px",
    verticalAlign: "middle",
  },
  timelineText: {
    color: "#2C2C2C",
    fontSize: "15px",
    lineHeight: "1.5",
    verticalAlign: "middle",
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
