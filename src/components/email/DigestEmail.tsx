/**
 * Weekly Digest Email — sent Monday mornings
 *
 * Matches the in-app digest style: warm palette, terracotta accents,
 * three-act narrative structure.
 */

import * as React from "react";
import type { DigestData } from "@/services/email";

interface DigestEmailProps {
  businessName: string;
  digestData: DigestData;
}

export function DigestEmail({ businessName, digestData }: DigestEmailProps) {
  const { metrics, narrative } = digestData;

  // Extract common metrics for the summary bar
  const metricEntries = Object.entries(metrics).slice(0, 4);

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
                    <p style={styles.headerSubtitle}>Weekly Digest</p>
                  </td>
                </tr>

                {/* Greeting */}
                <tr>
                  <td style={styles.content}>
                    <h2 style={styles.heading}>
                      Your week in review, {businessName}
                    </h2>

                    {/* Metrics bar */}
                    {metricEntries.length > 0 && (
                      <table
                        width="100%"
                        cellPadding={0}
                        cellSpacing={0}
                        style={styles.metricsBar}
                      >
                        <tr>
                          {metricEntries.map(([key, value], i) => (
                            <td
                              key={key}
                              align="center"
                              style={{
                                ...styles.metricCell,
                                borderRight:
                                  i < metricEntries.length - 1
                                    ? "1px solid #F0EDE8"
                                    : "none",
                              }}
                            >
                              <div style={styles.metricValue}>
                                {String(value)}
                              </div>
                              <div style={styles.metricLabel}>
                                {formatMetricLabel(key)}
                              </div>
                            </td>
                          ))}
                        </tr>
                      </table>
                    )}

                    {/* Narrative */}
                    <div style={styles.narrativeBlock}>
                      {narrative.split("\n").map((paragraph, i) => (
                        <p key={i} style={styles.text}>
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {/* CTA */}
                    <table width="100%" cellPadding={0} cellSpacing={0}>
                      <tr>
                        <td align="center" style={{ padding: "8px 0 24px" }}>
                          <a
                            href="https://app.localgenius.com"
                            style={styles.button}
                          >
                            See Full Details
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style={styles.textMuted}>
                      Another good week in the books. Talk soon.
                    </p>
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td style={styles.footer}>
                    <p style={styles.footerText}>
                      LocalGenius &middot; Your weekly digest for {businessName}
                    </p>
                    <p style={styles.footerText}>
                      Reply to this email anytime with questions.
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

function formatMetricLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
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
    margin: "0 0 4px",
    letterSpacing: "-0.02em",
  },
  headerSubtitle: {
    color: "#C4704B",
    fontSize: "14px",
    fontWeight: 600,
    margin: 0,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
  },
  content: {
    padding: "36px 40px",
  },
  heading: {
    color: "#2C2C2C",
    fontSize: "24px",
    fontWeight: 700,
    margin: "0 0 24px",
    lineHeight: "1.3",
  },
  metricsBar: {
    backgroundColor: "#FAF8F5",
    borderRadius: "8px",
    padding: "4px",
    marginBottom: "28px",
  },
  metricCell: {
    padding: "16px 12px",
  },
  metricValue: {
    color: "#C4704B",
    fontSize: "24px",
    fontWeight: 700,
    lineHeight: "1.2",
  },
  metricLabel: {
    color: "#666666",
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    marginTop: "4px",
  },
  narrativeBlock: {
    borderLeft: "3px solid #C4704B",
    paddingLeft: "20px",
    marginBottom: "24px",
  },
  text: {
    color: "#2C2C2C",
    fontSize: "16px",
    lineHeight: "1.6",
    margin: "0 0 12px",
  },
  textMuted: {
    color: "#7A8B6F",
    fontSize: "16px",
    fontStyle: "italic",
    lineHeight: "1.6",
    margin: "0",
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
