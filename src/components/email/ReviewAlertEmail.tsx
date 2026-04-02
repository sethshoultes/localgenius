/**
 * Review Alert Email — sent immediately for 1-3 star reviews
 *
 * Urgent but calm. Shows the review, gives a clear CTA to respond.
 */

import * as React from "react";
import type { ReviewData } from "@/services/email";

interface ReviewAlertEmailProps {
  businessName: string;
  review: ReviewData;
}

export function ReviewAlertEmail({
  businessName,
  review,
}: ReviewAlertEmailProps) {
  const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);

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
                    <p style={styles.preheading}>New review for {businessName}</p>
                    <h2 style={styles.heading}>
                      A {review.rating}-star review just came in.
                    </h2>

                    <p style={styles.text}>
                      {review.reviewerName} left a review on{" "}
                      <strong>{review.platform}</strong>. Here's what they said:
                    </p>

                    {/* Review card */}
                    <table
                      width="100%"
                      cellPadding={0}
                      cellSpacing={0}
                      style={styles.reviewCard}
                    >
                      <tr>
                        <td style={styles.reviewCardInner}>
                          <div style={styles.stars}>{stars}</div>
                          <div style={styles.reviewerName}>
                            {review.reviewerName} on {review.platform}
                          </div>
                          <p style={styles.reviewText}>
                            &ldquo;{review.text}&rdquo;
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style={styles.text}>
                      I've already drafted a response for you. Open LocalGenius
                      to review it, edit if you'd like, and post it — the sooner
                      you respond, the better it looks to future customers.
                    </p>

                    {/* CTA */}
                    <table width="100%" cellPadding={0} cellSpacing={0}>
                      <tr>
                        <td align="center" style={{ padding: "8px 0 24px" }}>
                          <a
                            href="https://app.localgenius.com"
                            style={styles.button}
                          >
                            Review &amp; Respond
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style={styles.textMuted}>
                      Responding quickly shows you care — even a short,
                      thoughtful reply makes a difference.
                    </p>
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td style={styles.footer}>
                    <p style={styles.footerText}>
                      LocalGenius &middot; Review alerts for {businessName}
                    </p>
                    <p style={styles.footerText}>
                      You're getting this because I noticed a review rated 3 stars or
                      below. Reply to this email with questions.
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
  preheading: {
    color: "#C4704B",
    fontSize: "13px",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    margin: "0 0 8px",
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
    fontSize: "14px",
    fontStyle: "italic",
    lineHeight: "1.6",
    margin: "0",
  },
  reviewCard: {
    marginBottom: "24px",
  },
  reviewCardInner: {
    backgroundColor: "#FAF8F5",
    border: "1px solid #F0EDE8",
    borderLeft: "4px solid #C4704B",
    borderRadius: "6px",
    padding: "20px 24px",
  },
  stars: {
    color: "#C4704B",
    fontSize: "22px",
    letterSpacing: "2px",
    marginBottom: "8px",
  },
  reviewerName: {
    color: "#666666",
    fontSize: "13px",
    fontWeight: 600,
    marginBottom: "12px",
  },
  reviewText: {
    color: "#2C2C2C",
    fontSize: "16px",
    lineHeight: "1.6",
    margin: 0,
    fontStyle: "italic",
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
