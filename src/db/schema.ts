/**
 * LocalGenius Database Schema — Drizzle ORM
 *
 * Full spec: engineering/data-model.md
 * Multi-tenant: every business-scoped table has organization_id + business_id
 * RLS: enforced at PostgreSQL level via organization_id (see data-model.md)
 *
 * 14 tables total:
 *   Core:        organizations, businesses, users
 *   Conversation: conversations, messages
 *   Execution:   actions, content_items
 *   Reviews:     reviews, review_responses
 *   Analytics:   analytics_events, attribution_events, weekly_digests
 *   Benchmarks:  benchmark_aggregates
 *   Settings:    business_settings
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  numeric,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const planEnum = pgEnum("plan", ["base", "pro", "franchise"]);

export const messageRoleEnum = pgEnum("message_role", [
  "owner",
  "assistant",
  "system",
]);

export const contentTypeEnum = pgEnum("content_type", [
  "text",
  "action_card",
  "report",
  "digest",
  "media",
]);

export const actionTypeEnum = pgEnum("action_type", [
  "social_post",
  "review_response",
  "website_update",
  "email_campaign",
  "sms_campaign",
  "seo_optimization",
  "gbp_update",
  "digest_generation",
]);

export const actionStatusEnum = pgEnum("action_status", [
  "proposed",
  "approved",
  "scheduled",
  "executing",
  "completed",
  "failed",
  "rejected",
]);

export const attributionConfidenceEnum = pgEnum("attribution_confidence", [
  "direct",
  "correlated",
  "aggregate",
]);

export const connectionStatusEnum = pgEnum("connection_status", [
  "active",
  "expired",
  "revoked",
  "error",
]);

export const periodTypeEnum = pgEnum("period_type", [
  "daily",
  "weekly",
  "monthly",
]);

export const sentimentEnum = pgEnum("sentiment", [
  "positive",
  "neutral",
  "negative",
]);

export const priorityFocusEnum = pgEnum("priority_focus", [
  "found_online",
  "reviews",
  "social",
]);

// ─── 1. Organizations ─────────────────────────────────────────────────────────
// Multi-tenant root entity. Solo operators: 1 org = 1 business.
// Franchise operators (future): 1 org = many businesses.

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  plan: planEnum("plan").notNull().default("base"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ─── 2. Businesses ────────────────────────────────────────────────────────────
// Central entity. Everything scopes to a business.

export const businesses = pgTable(
  "businesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    vertical: text("vertical").notNull().default("restaurant"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    address: text("address"),
    phone: text("phone"),
    employeeCount: integer("employee_count"),
    timezone: text("timezone").notNull().default("America/Chicago"),
    onboardingCompletedAt: timestamp("onboarding_completed_at", {
      withTimezone: true,
    }),
    priorityFocus: priorityFocusEnum("priority_focus"),
    autonomyLevel: integer("autonomy_level").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("idx_businesses_org").on(table.organizationId)]
);

// ─── 3. Users ─────────────────────────────────────────────────────────────────
// Owners who interact with LocalGenius. v1: one user per business.

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    email: text("email").unique().notNull(),
    phone: text("phone"),
    name: text("name").notNull(),
    role: text("role").notNull().default("owner"),
    authProvider: text("auth_provider").notNull().default("email"),
    passwordHash: text("password_hash"),
    consentAt: timestamp("consent_at", { withTimezone: true }),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_users_business").on(table.businessId),
    index("idx_users_email").on(table.email),
  ]
);

// ─── 4. Conversations ─────────────────────────────────────────────────────────
// One active conversation per business. The product IS one thread.

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_conversations_business").on(table.businessId)]
);

// ─── 5. Messages ──────────────────────────────────────────────────────────────
// Every item in the thread: owner messages, AI responses, action cards, reports.

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    role: messageRoleEnum("role").notNull(),
    contentType: contentTypeEnum("content_type").notNull(),
    content: jsonb("content").notNull(),
    aiModel: text("ai_model"),
    tokensInput: integer("tokens_input"),
    tokensOutput: integer("tokens_output"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_messages_conversation").on(
      table.conversationId,
      table.createdAt
    ),
    index("idx_messages_business").on(table.businessId, table.createdAt),
  ]
);

// ─── 6. Actions ───────────────────────────────────────────────────────────────
// Every thing LocalGenius does or proposes. Born from a message, generates outcomes.

export const actions = pgTable(
  "actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    messageId: uuid("message_id").references(() => messages.id),
    actionType: actionTypeEnum("action_type").notNull(),
    status: actionStatusEnum("status").notNull().default("proposed"),
    content: jsonb("content").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    autoApproved: boolean("auto_approved").notNull().default(false),
    externalId: text("external_id"),
    externalPlatform: text("external_platform"),
    errorDetails: jsonb("error_details"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_actions_business_type").on(
      table.businessId,
      table.actionType,
      table.createdAt
    ),
    index("idx_actions_status").on(table.status),
    index("idx_actions_external").on(table.externalPlatform, table.externalId),
  ]
);

// ─── 7. Content Items ─────────────────────────────────────────────────────────
// All AI-generated assets. Stored separately from actions for versioning.

export const contentItems = pgTable(
  "content_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    actionId: uuid("action_id").references(() => actions.id),
    contentType: text("content_item_type").notNull(),
    content: jsonb("content").notNull(),
    version: integer("version").notNull().default(1),
    approved: boolean("approved").notNull().default(false),
    performance: jsonb("performance"),
    aiModel: text("ai_model").notNull(),
    tokensUsed: integer("tokens_used"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_content_items_business").on(
      table.businessId,
      table.contentType,
      table.createdAt
    ),
  ]
);

// ─── 8. Reviews ───────────────────────────────────────────────────────────────
// Centralized review store across Google, Yelp, Facebook.

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    platform: text("platform").notNull(),
    externalReviewId: text("external_review_id").notNull(),
    reviewerName: text("reviewer_name"),
    rating: integer("rating").notNull(),
    reviewText: text("review_text"),
    reviewDate: timestamp("review_date", { withTimezone: true }).notNull(),
    sentiment: sentimentEnum("sentiment"),
    keyTopics: jsonb("key_topics"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_reviews_unique").on(
      table.businessId,
      table.platform,
      table.externalReviewId
    ),
    index("idx_reviews_business_date").on(table.businessId, table.reviewDate),
    index("idx_reviews_sentiment").on(
      table.businessId,
      table.sentiment,
      table.reviewDate
    ),
  ]
);

// ─── 9. Review Responses ──────────────────────────────────────────────────────
// Tracks responses to reviews, linked to the action that generated them.

export const reviewResponses = pgTable(
  "review_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    actionId: uuid("action_id").references(() => actions.id),
    responseText: text("response_text").notNull(),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    postedToPlatform: boolean("posted_to_platform").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_review_responses_review").on(table.reviewId)]
);

// ─── 10. Analytics Events ─────────────────────────────────────────────────────
// Raw events from external platforms. 13-month rolling retention.

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    eventType: text("event_type").notNull(),
    source: text("source").notNull(),
    metadata: jsonb("metadata"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_analytics_events_business").on(
      table.businessId,
      table.occurredAt
    ),
    index("idx_analytics_events_type").on(table.eventType, table.occurredAt),
  ]
);

// ─── 11. Attribution Events ───────────────────────────────────────────────────
// Links actions to measurable outcomes. Core of Jensen's Question #2.

export const attributionEvents = pgTable(
  "attribution_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    actionId: uuid("action_id").references(() => actions.id),
    eventType: text("event_type").notNull(),
    confidence: attributionConfidenceEnum("confidence")
      .notNull()
      .default("direct"),
    attributionWindowHours: integer("attribution_window_hours"),
    valueCents: integer("value_cents"),
    metadata: jsonb("metadata"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_attribution_business").on(table.businessId, table.occurredAt),
    index("idx_attribution_action").on(table.actionId),
    index("idx_attribution_type").on(table.eventType, table.occurredAt),
  ]
);

// ─── 12. Weekly Digests ───────────────────────────────────────────────────────
// Pre-computed weekly summaries. Also stored as messages, but here for querying.

export const weeklyDigests = pgTable(
  "weekly_digests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    messageId: uuid("message_id").references(() => messages.id),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    metrics: jsonb("metrics").notNull(),
    actionsCompleted: jsonb("actions_completed").notNull(),
    recommendations: jsonb("recommendations"),
    shareableUrl: text("shareable_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_digests_business").on(table.businessId, table.periodStart),
  ]
);

// ─── 13. Benchmark Aggregates ─────────────────────────────────────────────────
// Anonymized, no business_id, no PII. Dual-write pattern.
// Survives account deletion. Jensen's Questions #3 and #4.

export const benchmarkAggregates = pgTable(
  "benchmark_aggregates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vertical: text("vertical").notNull(),
    city: text("city").notNull(),
    sizeBucket: text("size_bucket").notNull(),
    periodType: periodTypeEnum("period_type").notNull(),
    periodStart: timestamp("period_start", { mode: "date" }).notNull(),
    metricName: text("metric_name").notNull(),
    metricValue: numeric("metric_value").notNull(),
    sampleSize: integer("sample_size").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_benchmarks_unique").on(
      table.vertical,
      table.city,
      table.sizeBucket,
      table.periodType,
      table.periodStart,
      table.metricName
    ),
    index("idx_benchmarks_lookup").on(
      table.vertical,
      table.city,
      table.sizeBucket,
      table.metricName,
      table.periodStart
    ),
  ]
);

// ─── 14. Business Settings ────────────────────────────────────────────────────
// Platform connections, preferences, and integration config per business.

export const businessSettings = pgTable(
  "business_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    platform: text("platform").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    platformUserId: text("platform_user_id"),
    platformBusinessId: text("platform_business_id"),
    connectionStatus: connectionStatusEnum("connection_status")
      .notNull()
      .default("active"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    config: jsonb("config"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_settings_business_platform").on(
      table.businessId,
      table.platform
    ),
    index("idx_settings_status").on(table.connectionStatus),
  ]
);
