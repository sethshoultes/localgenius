import * as React from "react";

interface SubscriptionEmailProps {
  businessName: string;
  plan: "base" | "pro";
  amount: string;
}

export function SubscriptionEmail({ businessName, plan, amount }: SubscriptionEmailProps) {
  const features = plan === "pro"
    ? ["Conversational command center", "AI website generation", "Review auto-responses", "Social media posting", "Email & SMS campaigns", "Local SEO agent", "Weekly digest + benchmarks", "Priority support"]
    : ["Conversational command center", "AI website generation", "Review auto-responses", "Social media posting", "Weekly digest"];

  return (
    <div style={{ fontFamily: "'Source Sans 3', system-ui, sans-serif", backgroundColor: "#FAF8F5", padding: "40px 20px" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto", backgroundColor: "#FFFFFF", borderRadius: "12px", padding: "40px 32px" }}>
        <h1 style={{ color: "#2C2C2C", fontSize: "24px", fontWeight: 600, margin: "0 0 8px" }}>
          {"You're all set, "}{businessName}.
        </h1>
        <p style={{ color: "#6B7280", fontSize: "16px", lineHeight: "24px", margin: "0 0 24px" }}>
          Your {plan === "pro" ? "Pro" : "Base"} plan is active — {amount}/month.
        </p>
        <div style={{ backgroundColor: "#F2EDE8", borderRadius: "8px", padding: "20px", margin: "0 0 24px" }}>
          <p style={{ color: "#2C2C2C", fontSize: "14px", fontWeight: 600, margin: "0 0 12px" }}>{"What's included:"}</p>
          {features.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", margin: "0 0 8px" }}>
              <span style={{ color: "#7A8B6F" }}>{"✓"}</span>
              <span style={{ color: "#2C2C2C", fontSize: "14px" }}>{f}</span>
            </div>
          ))}
        </div>
        <a href="https://app.localgenius.com" style={{ display: "inline-block", backgroundColor: "#C4704B", color: "#FFFFFF", padding: "12px 24px", borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: 600 }}>
          Open LocalGenius
        </a>
        <p style={{ color: "#6B7280", fontSize: "12px", marginTop: "32px", borderTop: "1px solid #F2EDE8", paddingTop: "16px" }}>
          Your business, handled. — LocalGenius
        </p>
      </div>
    </div>
  );
}
