import * as React from "react";

interface PaymentFailedEmailProps {
  businessName: string;
}

export function PaymentFailedEmail({ businessName }: PaymentFailedEmailProps) {
  return (
    <div style={{ fontFamily: "'Source Sans 3', system-ui, sans-serif", backgroundColor: "#FAF8F5", padding: "40px 20px" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto", backgroundColor: "#FFFFFF", borderRadius: "12px", padding: "40px 32px" }}>
        <h1 style={{ color: "#2C2C2C", fontSize: "24px", fontWeight: 600, margin: "0 0 8px" }}>
          Quick heads up, {businessName}.
        </h1>
        <p style={{ color: "#6B7280", fontSize: "16px", lineHeight: "24px", margin: "0 0 24px" }}>
          {"Your latest payment didn't go through. No worries — these things happen. Your account is still active, but I'll need you to update your payment method so I can keep working for you."}
        </p>
        <div style={{ backgroundColor: "#FEF2F2", borderRadius: "8px", padding: "16px 20px", margin: "0 0 24px", borderLeft: "4px solid #C0392B" }}>
          <p style={{ color: "#2C2C2C", fontSize: "14px", margin: 0 }}>
            {"Your service continues for 7 days while you sort this out. After that, I'll pause new posts and campaigns until payment is updated."}
          </p>
        </div>
        <a href="https://app.localgenius.com/billing" style={{ display: "inline-block", backgroundColor: "#C4704B", color: "#FFFFFF", padding: "12px 24px", borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontWeight: 600 }}>
          Update Payment Method
        </a>
        <p style={{ color: "#6B7280", fontSize: "12px", marginTop: "32px", borderTop: "1px solid #F2EDE8", paddingTop: "16px" }}>
          Your business, handled. — LocalGenius
        </p>
      </div>
    </div>
  );
}
