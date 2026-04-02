/**
 * Demo seed script — creates Maria's Kitchen with rich, realistic sample data.
 * Run: pnpm db:seed
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../schema";
import { hashPassword } from "../../lib/password";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a Date offset from `now` by the given number of days (negative = past). */
function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/** Returns a Date offset from `now` by the given number of days + a random hour offset. */
function daysAgoRandom(now: Date, days: number): Date {
  return new Date(
    now.getTime() -
      days * 24 * 60 * 60 * 1000 -
      Math.random() * 24 * 60 * 60 * 1000
  );
}

/** Returns a Date at a specific time on a given day offset. */
function daysAgoAt(now: Date, days: number, hour: number, minute: number): Date {
  const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** Seeded random number generator for reproducibility. */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });
  const now = new Date();
  const rand = seededRandom(42);

  console.log("Seeding demo data for Maria's Kitchen...\n");

  // ─── 1. Organization ───────────────────────────────────────────────────────

  const [org] = await db
    .insert(schema.organizations)
    .values({ name: "Maria's Kitchen" })
    .returning();
  console.log(`  Created org: ${org.id}`);

  // ─── 2. Business ───────────────────────────────────────────────────────────

  const [biz] = await db
    .insert(schema.businesses)
    .values({
      organizationId: org.id,
      name: "Maria's Kitchen",
      vertical: "restaurant",
      city: "Austin",
      state: "TX",
      address: "1401 S Lamar Blvd, Austin, TX 78704",
      phone: "(512) 555-0142",
      employeeCount: 11,
      timezone: "America/Chicago",
      priorityFocus: "reviews",
      autonomyLevel: 0,
      onboardingCompletedAt: daysAgo(now, 7),
    })
    .returning();
  console.log(`  Created business: ${biz.name} (${biz.id})`);

  // ─── 3. User — Maria Gonzalez ──────────────────────────────────────────────

  const passwordHash = await hashPassword("localgenius123");
  const [user] = await db
    .insert(schema.users)
    .values({
      organizationId: org.id,
      businessId: biz.id,
      email: "maria@mariaskitchen.com",
      name: "Maria Gonzalez",
      passwordHash,
      consentAt: daysAgo(now, 7),
    })
    .returning();
  console.log(`  Created user: ${user.email}`);

  // ─── 4. Conversation ───────────────────────────────────────────────────────

  const [convo] = await db
    .insert(schema.conversations)
    .values({ businessId: biz.id, organizationId: org.id })
    .returning();

  // ─── 5. Reviews (20 reviews, spread over 60 days) ─────────────────────────

  const reviewsData: Array<{
    platform: string;
    externalReviewId: string;
    reviewerName: string;
    rating: number;
    reviewText: string;
    sentiment: "positive" | "neutral" | "negative";
    keyTopics: string[];
    daysAgo: number;
  }> = [
    // --- 12 five-star reviews ---
    {
      platform: "google",
      externalReviewId: "g-001",
      reviewerName: "Jake R.",
      rating: 5,
      reviewText:
        "Best fish tacos in Austin, hands down. The chipotle lime crema is incredible and the portions are generous. My wife and I come here every week now.",
      sentiment: "positive",
      keyTopics: ["fish tacos", "chipotle lime crema", "portions"],
      daysAgo: 55,
    },
    {
      platform: "google",
      externalReviewId: "g-002",
      reviewerName: "Carlos P.",
      rating: 5,
      reviewText:
        "Maria herself came to our table to check on us. You can tell she puts her heart into this place. The enchiladas suizas were absolutely perfect — creamy, rich, and not too heavy. Amazing food, amazing people.",
      sentiment: "positive",
      keyTopics: ["owner interaction", "enchiladas suizas", "hospitality"],
      daysAgo: 50,
    },
    {
      platform: "google",
      externalReviewId: "g-003",
      reviewerName: "David L.",
      rating: 5,
      reviewText:
        "Maria's Kitchen is a South Lamar gem. Authentic Tex-Mex flavors, super friendly staff, and the frozen margaritas are dangerously good. Perfect date night spot.",
      sentiment: "positive",
      keyTopics: ["authentic tex-mex", "margaritas", "date night", "staff"],
      daysAgo: 46,
    },
    {
      platform: "google",
      externalReviewId: "g-004",
      reviewerName: "Priya K.",
      rating: 5,
      reviewText:
        "Brought my parents here when they visited from Houston. They said the queso was the best they've ever had — and they don't say that lightly! The churros with chocolate sauce were the perfect ending.",
      sentiment: "positive",
      keyTopics: ["queso", "churros", "family dining"],
      daysAgo: 42,
    },
    {
      platform: "yelp",
      externalReviewId: "y-001",
      reviewerName: "Austin Foodie",
      rating: 5,
      reviewText:
        "I write about restaurants for a living and Maria's Kitchen is the real deal. The mole is complex and clearly made from scratch — you can taste the time that goes into it. The homemade tortillas seal the deal. Don't sleep on this place.",
      sentiment: "positive",
      keyTopics: ["mole", "homemade tortillas", "food blogger"],
      daysAgo: 38,
    },
    {
      platform: "google",
      externalReviewId: "g-005",
      reviewerName: "Mike T.",
      rating: 5,
      reviewText:
        "This place is the real deal. We come every Friday night. The enchiladas are out of this world and the kids love the quesadillas. Family favorite.",
      sentiment: "positive",
      keyTopics: ["enchiladas", "regular customer", "family friendly", "quesadillas"],
      daysAgo: 35,
    },
    {
      platform: "google",
      externalReviewId: "g-006",
      reviewerName: "Rachel A.",
      rating: 5,
      reviewText:
        "First time here and WOW. Got the fish tacos and a mango margarita. Both were phenomenal. The patio is lovely on a warm evening. Already planning my next visit.",
      sentiment: "positive",
      keyTopics: ["fish tacos", "mango margarita", "patio", "first visit"],
      daysAgo: 30,
    },
    {
      platform: "facebook",
      externalReviewId: "fb-001",
      reviewerName: "Tommy Nguyen",
      rating: 5,
      reviewText:
        "Ordered catering for our office party and it was a HUGE hit. Everyone raved about the street tacos and the guacamole. Maria's team was professional and delivery was on time. Highly recommend for events!",
      sentiment: "positive",
      keyTopics: ["catering", "street tacos", "guacamole", "office party"],
      daysAgo: 26,
    },
    {
      platform: "google",
      externalReviewId: "g-007",
      reviewerName: "Samantha B.",
      rating: 5,
      reviewText:
        "The happy hour here is unbeatable. $5 margaritas and half-price queso dip from 3-6pm. Great way to start the weekend. Staff is always so welcoming.",
      sentiment: "positive",
      keyTopics: ["happy hour", "margaritas", "queso", "value"],
      daysAgo: 20,
    },
    {
      platform: "google",
      externalReviewId: "g-008",
      reviewerName: "James W.",
      rating: 5,
      reviewText:
        "I've eaten Tex-Mex all over Texas and Maria's Kitchen ranks in my top 3. The carne asada is perfectly seasoned and cooked, and the rice and beans are anything but an afterthought. Every detail matters here.",
      sentiment: "positive",
      keyTopics: ["carne asada", "rice and beans", "attention to detail"],
      daysAgo: 14,
    },
    {
      platform: "google",
      externalReviewId: "g-009",
      reviewerName: "Emily Chen",
      rating: 5,
      reviewText:
        "Celebrated my birthday here and Maria brought out complimentary churros with a candle. Such a sweet touch. The enchiladas verdes were incredible and my friends are still talking about the queso. Love this place!",
      sentiment: "positive",
      keyTopics: ["birthday", "churros", "enchiladas verdes", "queso", "hospitality"],
      daysAgo: 8,
    },
    {
      platform: "google",
      externalReviewId: "g-010",
      reviewerName: "Brandon F.",
      rating: 5,
      reviewText:
        "Just moved to the neighborhood and this is already my go-to spot. The breakfast tacos on Saturday morning are incredible — egg, chorizo, and potato with that green salsa. Can't beat it.",
      sentiment: "positive",
      keyTopics: ["breakfast tacos", "chorizo", "neighborhood spot", "green salsa"],
      daysAgo: 3,
    },

    // --- 4 four-star reviews ---
    {
      platform: "google",
      externalReviewId: "g-011",
      reviewerName: "Sarah M.",
      rating: 4,
      reviewText:
        "Food was great but we waited 25 minutes for a table on a Tuesday night. Once seated, everything was excellent — the fish tacos were fresh and flavorful. Worth the wait, but they could use more seating.",
      sentiment: "positive",
      keyTopics: ["wait time", "fish tacos", "seating"],
      daysAgo: 44,
    },
    {
      platform: "yelp",
      externalReviewId: "y-002",
      reviewerName: "Heather J.",
      rating: 4,
      reviewText:
        "Great food, especially the queso and the chicken enchiladas. Only knock is parking — South Lamar is tough and we circled for 10 minutes. The food makes up for it though. Will definitely return.",
      sentiment: "positive",
      keyTopics: ["queso", "chicken enchiladas", "parking"],
      daysAgo: 32,
    },
    {
      platform: "google",
      externalReviewId: "g-012",
      reviewerName: "Robert H.",
      rating: 4,
      reviewText:
        "Solid Tex-Mex. The margaritas are strong and the fajitas sizzle is legit. A bit noisy on weekend evenings — hard to have a conversation. But the food quality is top notch.",
      sentiment: "positive",
      keyTopics: ["margaritas", "fajitas", "noise level"],
      daysAgo: 18,
    },
    {
      platform: "facebook",
      externalReviewId: "fb-002",
      reviewerName: "Alicia Ramirez",
      rating: 4,
      reviewText:
        "Really enjoyed the brunch menu. The huevos rancheros were legit. Service was a tad slow since it was busy, but our server was apologetic and attentive. Would come back for sure.",
      sentiment: "positive",
      keyTopics: ["brunch", "huevos rancheros", "service speed"],
      daysAgo: 10,
    },

    // --- 2 three-star reviews ---
    {
      platform: "google",
      externalReviewId: "g-013",
      reviewerName: "Jennifer K.",
      rating: 3,
      reviewText:
        "The food was decent but portion sizes felt small for the price. $18 for three tacos? The fish tacos tasted good but I left hungry. The queso appetizer was great though. Mixed feelings.",
      sentiment: "neutral",
      keyTopics: ["portion size", "pricing", "fish tacos", "queso"],
      daysAgo: 40,
    },
    {
      platform: "yelp",
      externalReviewId: "y-003",
      reviewerName: "Greg S.",
      rating: 3,
      reviewText:
        "Food is genuinely good — the enchiladas and rice were on point. But our server seemed overwhelmed and forgot our drink order twice. When the food came it was great, I just wish the service matched the kitchen quality.",
      sentiment: "neutral",
      keyTopics: ["enchiladas", "service", "drink order", "inconsistency"],
      daysAgo: 22,
    },

    // --- 1 two-star review ---
    {
      platform: "google",
      externalReviewId: "g-014",
      reviewerName: "Lisa W.",
      rating: 2,
      reviewText:
        "Came here based on the great reviews and was pretty disappointed. Waited 40 minutes for our food and when it arrived, the enchiladas were lukewarm at best. Our server didn't check on us once after dropping the plates. I expected a lot more based on what everyone says. Maybe it was an off night?",
      sentiment: "negative",
      keyTopics: ["wait time", "cold food", "service", "expectations"],
      daysAgo: 15,
    },

    // --- 1 one-star review ---
    {
      platform: "google",
      externalReviewId: "g-015",
      reviewerName: "Mark D.",
      rating: 1,
      reviewText:
        "Terrible experience. My wife and I both got sick after eating here last Saturday. We had the fish tacos and chicken quesadilla. Spent all of Sunday in bed. I've reported this to the health department. Absolutely unacceptable for a restaurant. Will never return.",
      sentiment: "negative",
      keyTopics: ["food safety", "illness", "fish tacos", "chicken quesadilla"],
      daysAgo: 12,
    },
  ];

  const insertedReviews: Array<{ id: string; rating: number; externalReviewId: string }> = [];
  for (const r of reviewsData) {
    const [inserted] = await db
      .insert(schema.reviews)
      .values({
        businessId: biz.id,
        organizationId: org.id,
        platform: r.platform,
        externalReviewId: r.externalReviewId,
        reviewerName: r.reviewerName,
        rating: r.rating,
        reviewText: r.reviewText,
        reviewDate: daysAgoRandom(now, r.daysAgo),
        sentiment: r.sentiment,
        keyTopics: r.keyTopics,
      })
      .returning();
    insertedReviews.push({ id: inserted.id, rating: r.rating, externalReviewId: r.externalReviewId });
  }
  console.log(`  Created ${reviewsData.length} reviews (12x5star, 4x4star, 2x3star, 1x2star, 1x1star)`);

  // Look up specific review IDs for responses
  const twoStarReview = insertedReviews.find((r) => r.externalReviewId === "g-014")!;
  const oneStarReview = insertedReviews.find((r) => r.externalReviewId === "g-015")!;
  const fiveStarReviewForResponse = insertedReviews.find((r) => r.externalReviewId === "g-010")!;

  // ─── 6. Actions (15 completed actions over 30 days) ────────────────────────

  const actionsData: Array<{
    actionType: "social_post" | "review_response" | "gbp_update" | "seo_optimization" | "email_campaign";
    status: "completed";
    content: Record<string, unknown>;
    daysAgo: number;
    label: string;
  }> = [
    // 8 social posts
    {
      actionType: "social_post",
      status: "completed",
      content: {
        text: "Fresh fish tacos just landed at Maria's Kitchen! Crispy battered cod, house-made slaw, and our famous chipotle lime crema. Available now for lunch and dinner. Come hungry. #AustinEats #FishTacos #MariasKitchen #SouthLamar",
        platform: "instagram",
      },
      daysAgo: 6,
      label: "Fish tacos launch post",
    },
    {
      actionType: "social_post",
      status: "completed",
      content: {
        text: "Weekend brunch is BACK! Join us Saturday & Sunday 9am-2pm for huevos rancheros, breakfast tacos, and bottomless mimosas. Bring the crew. #AustinBrunch #WeekendVibes #MariasKitchen",
        platform: "facebook",
      },
      daysAgo: 25,
      label: "Weekend brunch promo",
    },
    {
      actionType: "social_post",
      status: "completed",
      content: {
        text: "Happy Hour just got happier! $5 margaritas + half-price queso every weekday 3-6pm. Tag someone who needs this after work. #HappyHour #AustinHappyHour #MariasKitchen #SouthLamar",
        platform: "instagram",
      },
      daysAgo: 22,
      label: "Happy hour announcement",
    },
    {
      actionType: "social_post",
      status: "completed",
      content: {
        text: "Introducing our NEW smoked brisket tacos! Slow-smoked for 12 hours, topped with pickled onions and our house BBQ-chipotle sauce. Available this weekend only. Come early — they go fast! #NewMenuItem #AustinFood #BrisketTacos",
        platform: "instagram",
      },
      daysAgo: 18,
      label: "New menu item — brisket tacos",
    },
    {
      actionType: "social_post",
      status: "completed",
      content: {
        text: "Meet the team that makes the magic happen! From our kitchen crew to our front of house family, every plate that leaves Maria's Kitchen is made with love. We're hiring — DM us if you want to join! #TeamMariasKitchen #AustinJobs",
        platform: "facebook",
      },
      daysAgo: 15,
      label: "Team photo / hiring post",
    },
    {
      actionType: "social_post",
      status: "completed",
      content: {
        text: "Customer spotlight: Shoutout to the Martinez family who've been coming every Friday for 3 years! We love our regulars. What's YOUR go-to order? Drop it in the comments. #CustomerLove #MariasKitchen #AustinCommunity",
        platform: "instagram",
      },
      daysAgo: 11,
      label: "Customer spotlight",
    },
    {
      actionType: "social_post",
      status: "completed",
      content: {
        text: "Ever wonder how we make our famous queso? Hint: it starts with REAL cheese, roasted peppers, and a family recipe Maria brought from her grandmother's kitchen. Some things are worth doing the hard way. #BehindTheScenes #FromScratch #MariasKitchen",
        platform: "instagram",
      },
      daysAgo: 7,
      label: "Behind the scenes — queso",
    },
    {
      actionType: "social_post",
      status: "completed",
      content: {
        text: "Holiday hours reminder: We'll be OPEN on Easter Sunday 11am-6pm with a special family-style menu. Reservations recommended — call (512) 555-0142 or book online. #EasterBrunch #AustinDining #MariasKitchen",
        platform: "facebook",
      },
      daysAgo: 4,
      label: "Holiday hours post",
    },

    // 3 review responses (action records)
    {
      actionType: "review_response",
      status: "completed",
      content: {
        reviewId: "placeholder-2star",
        platform: "google",
        text: "Response to Lisa W. (2-star)",
      },
      daysAgo: 14,
      label: "Response to 2-star review (Lisa W.)",
    },
    {
      actionType: "review_response",
      status: "completed",
      content: {
        reviewId: "placeholder-1star",
        platform: "google",
        text: "Response to Mark D. (1-star)",
      },
      daysAgo: 11,
      label: "Response to 1-star review (Mark D.)",
    },
    {
      actionType: "review_response",
      status: "completed",
      content: {
        reviewId: "placeholder-5star",
        platform: "google",
        text: "Response to Brandon F. (5-star)",
      },
      daysAgo: 2,
      label: "Response to 5-star review (Brandon F.)",
    },

    // 2 GBP updates
    {
      actionType: "gbp_update",
      status: "completed",
      content: {
        updateType: "hours",
        text: "Updated business hours: Added Saturday brunch hours (9am-2pm), adjusted Friday closing to 11pm",
      },
      daysAgo: 24,
      label: "Hours update — brunch + Friday",
    },
    {
      actionType: "gbp_update",
      status: "completed",
      content: {
        updateType: "description",
        text: 'Optimized GBP description: "Family-owned Tex-Mex restaurant on South Lamar. Serving Austin\'s best fish tacos, enchiladas, and hand-shaken margaritas since 2015. Dine-in, takeout, and catering available."',
      },
      daysAgo: 20,
      label: "Description optimization",
    },

    // 1 SEO optimization
    {
      actionType: "seo_optimization",
      status: "completed",
      content: {
        text: "Added structured data markup for restaurant schema, optimized Google Business Profile categories (added 'Catering' and 'Brunch Restaurant'), updated NAP consistency across directories",
      },
      daysAgo: 17,
      label: "SEO — structured data + categories",
    },

    // 1 email campaign
    {
      actionType: "email_campaign",
      status: "completed",
      content: {
        subject: "We miss you at Maria's Kitchen!",
        text: "Personalized 'we miss you' email to 142 customers who haven't visited in 30+ days. Included a 15% off coupon code COMEBACK15. Open rate: 34%, click rate: 12%.",
        recipientCount: 142,
        couponCode: "COMEBACK15",
      },
      daysAgo: 9,
      label: "Win-back email campaign",
    },
  ];

  const insertedActions: Array<{ id: string; label: string }> = [];
  for (const a of actionsData) {
    const [inserted] = await db
      .insert(schema.actions)
      .values({
        businessId: biz.id,
        organizationId: org.id,
        actionType: a.actionType,
        status: a.status,
        content: a.content,
        approvedAt: daysAgoAt(now, a.daysAgo, 10, 0),
        executedAt: daysAgoAt(now, a.daysAgo, 10, 5),
      })
      .returning();
    insertedActions.push({ id: inserted.id, label: a.label });
  }
  console.log(`  Created ${actionsData.length} actions (8 social, 3 review_response, 2 gbp, 1 seo, 1 email)`);

  // Look up action IDs for review responses
  const twoStarResponseAction = insertedActions.find((a) => a.label.includes("2-star"))!;
  const oneStarResponseAction = insertedActions.find((a) => a.label.includes("1-star"))!;
  const fiveStarResponseAction = insertedActions.find((a) => a.label.includes("5-star"))!;

  // ─── 7. Review Responses ───────────────────────────────────────────────────

  await db.insert(schema.reviewResponses).values({
    reviewId: twoStarReview.id,
    businessId: biz.id,
    organizationId: org.id,
    actionId: twoStarResponseAction.id,
    responseText:
      "Lisa, thank you for taking the time to share your experience. I'm truly sorry your visit didn't meet expectations — a 40-minute wait and lukewarm food is not the standard we hold ourselves to. I'd love the chance to make it right. Please reach out to me directly at maria@mariaskitchen.com and your next meal is on us. We're working on improving our kitchen timing during peak hours. — Maria",
    postedAt: daysAgoAt(now, 14, 11, 30),
    postedToPlatform: true,
  });

  await db.insert(schema.reviewResponses).values({
    reviewId: oneStarReview.id,
    businessId: biz.id,
    organizationId: org.id,
    actionId: oneStarResponseAction.id,
    responseText:
      "Mark, I am so sorry to hear that you and your wife felt ill after dining with us. Food safety is something we take extremely seriously. We've conducted a full review of our kitchen protocols with our team and our most recent health inspection was a perfect score. I'd like to speak with you directly to understand more about your experience — please contact me at maria@mariaskitchen.com. Your health and trust matter deeply to us. — Maria",
    postedAt: daysAgoAt(now, 11, 9, 0),
    postedToPlatform: true,
  });

  await db.insert(schema.reviewResponses).values({
    reviewId: fiveStarReviewForResponse.id,
    businessId: biz.id,
    organizationId: org.id,
    actionId: fiveStarResponseAction.id,
    responseText:
      "Welcome to the neighborhood, Brandon! So glad you found us and that you're already a fan of the Saturday breakfast tacos. That green salsa is my abuela's recipe. See you next weekend! — Maria",
    postedAt: daysAgoAt(now, 2, 14, 0),
    postedToPlatform: true,
  });

  console.log("  Created 3 review responses (2-star, 1-star, 5-star)");

  // ─── 8. Conversation Messages (25+ messages over 7 days) ──────────────────

  const messagesData: Array<{
    role: "system" | "owner" | "assistant";
    contentType: "text" | "action_card" | "report" | "digest";
    content: Record<string, unknown>;
    aiModel?: string;
    daysAgo: number;
    hour: number;
    minute: number;
  }> = [
    // ── Day 1: Onboarding welcome, Maria asks about posting ──
    {
      role: "system",
      contentType: "text",
      content: {
        text: "Welcome to LocalGenius! Your account for Maria's Kitchen has been set up. Your AI marketing assistant is ready to help.",
      },
      daysAgo: 7,
      hour: 9,
      minute: 0,
    },
    {
      role: "assistant",
      contentType: "text",
      content: {
        text: "Hi Maria! I'm your LocalGenius assistant. I've connected to your Google Business Profile and I can see Maria's Kitchen is already getting some great reviews.\n\nHere's what I can help you with:\n- Respond to customer reviews (I'll draft, you approve)\n- Create and schedule social media posts\n- Track how customers find you online\n- Send you a weekly report on how your business is performing\n\nWhat would you like to tackle first?",
      },
      aiModel: "claude-sonnet-4-6-20250514",
      daysAgo: 7,
      hour: 9,
      minute: 1,
    },
    {
      role: "owner",
      contentType: "text",
      content: {
        text: "Hey! This is cool. I've been meaning to post more on social media but I just never have time. Can you help with that?",
      },
      daysAgo: 7,
      hour: 9,
      minute: 15,
    },
    {
      role: "assistant",
      contentType: "text",
      content: {
        text: "Absolutely! I can create posts for you and schedule them at the best times for engagement. I just need you to approve them before they go live.\n\nTo start, what's something exciting happening at Maria's Kitchen right now? A new menu item, a special, or something your regulars are loving?",
      },
      aiModel: "claude-sonnet-4-6-20250514",
      daysAgo: 7,
      hour: 9,
      minute: 16,
    },
    {
      role: "owner",
      contentType: "text",
      content: {
        text: "We just added fish tacos to the menu and people are going crazy for them!",
      },
      daysAgo: 7,
      hour: 9,
      minute: 22,
    },

    // ── Day 2: LocalGenius drafts fish tacos post, Maria approves ──
    {
      role: "assistant",
      contentType: "action_card",
      content: {
        text: "Here's a post I drafted for your new fish tacos:\n\n\"Fresh fish tacos just landed at Maria's Kitchen! Crispy battered cod, house-made slaw, and our famous chipotle lime crema. Available now for lunch and dinner. Come hungry.\n\n#AustinEats #FishTacos #MariasKitchen #SouthLamar #TexMex\"\n\nI'd recommend posting to Instagram and Facebook at 11:30am tomorrow — right before the lunch crowd starts searching. Want me to schedule it?",
        actionType: "social_post",
        platforms: ["instagram", "facebook"],
        scheduledFor: "11:30 AM tomorrow",
      },
      aiModel: "claude-sonnet-4-6-20250514",
      daysAgo: 6,
      hour: 10,
      minute: 0,
    },
    {
      role: "owner",
      contentType: "text",
      content: {
        text: "Looks great! Post it.",
      },
      daysAgo: 6,
      hour: 10,
      minute: 8,
    },
    {
      role: "assistant",
      contentType: "text",
      content: {
        text: "Done! Scheduled for Instagram and Facebook at 11:30am. I'll let you know how it performs.\n\nTip: Posts with food photos get 2-3x more engagement. If you snap a photo of the fish tacos, I can add it to future posts!",
      },
      aiModel: "claude-sonnet-4-6-20250514",
      daysAgo: 6,
      hour: 10,
      minute: 9,
    },

    // ── Day 3: Negative review comes in, draft response ──
    {
      role: "assistant",
      contentType: "text",
      content: {
        text: "Heads up — a new 2-star review just came in on Google from Lisa W. She mentioned a long wait and lukewarm food.\n\nHere's the review:\n\"Came here based on the great reviews and was pretty disappointed. Waited 40 minutes for our food and when it arrived, the enchiladas were lukewarm at best. Our server didn't check on us once after dropping the plates. I expected a lot more based on what everyone says. Maybe it was an off night?\"\n\nI've drafted a response for you:",
      },
      aiModel: "claude-sonnet-4-6-20250514",
      daysAgo: 5,
      hour: 8,
      minute: 30,
    },
    {
      role: "assistant",
      contentType: "action_card",
      content: {
        text: "\"Lisa, thank you for sharing your experience. I'm sorry your visit fell short — a long wait and lukewarm food isn't the standard we set for ourselves. I'd love the opportunity to make it right. Please reach out at maria@mariaskitchen.com and your next meal is on us. We're working on improving our kitchen flow during busy periods. — Maria\"",
        actionType: "review_response",
        platform: "google",
        reviewerName: "Lisa W.",
        rating: 2,
      },
      aiModel: "claude-sonnet-4-6-20250514",
      daysAgo: 5,
      hour: 8,
      minute: 31,
    },
    {
      role: "owner",
      contentType: "text",
      content: {
        text: "Good draft but can you make it a bit more personal? I want her to know I actually read her review. And change it to say 'peak hours' instead of 'busy periods'.",
      },
      daysAgo: 5,
      hour: 9,
      minute: 0,
    },
    {
      role: "assistant",
      contentType: "action_card",
      content: {
        text: "Updated! Here's the revised response:\n\n\"Lisa, thank you for taking the time to share your experience. I'm truly sorry your visit didn't meet expectations — a 40-minute wait and lukewarm food is not the standard we hold ourselves to. I'd love the chance to make it right. Please reach out to me directly at maria@mariaskitchen.com and your next meal is on us. We're working on improving our kitchen timing during peak hours. — Maria\"",
        actionType: "review_response",
        platform: "google",
        reviewerName: "Lisa W.",
        rating: 2,
      },
      aiModel: "claude-sonnet-4-6-20250514",
      daysAgo: 5,
      hour: 9,
      minute: 1,
    },
    {
      role: "owner",
      contentType: "text",
      content: {
        text: "Perfect. Post it.",
      },
      daysAgo: 5,
      hour: 9,
      minute: 5,
    },
    {
      role: "assistant",
      contentType: "text",
      content: {
        text: "Posted! Great call on the personal touch — responses that reference specific details from the review show future customers that you genuinely care. Lisa may even update her review after hearing from you directly.",
      },
      aiModel: "claude-sonnet-4-6-20250514",
      daysAgo: 5,
      hour: 9,
      minute: 6,
    },

    // ── Day 4: Maria asks "how am I doing?" ──
    {
      role: "owner",
      contentType: "text",
      content: {
        text: "Hey, how am I doing overall? Like are things getting better?",
      },
      daysAgo: 4,
      hour: 14,
      minute: 0,
    },
    {
      role: "assistant",
      contentType: "report",
      content: {
        text: "Great question! Here's your quick snapshot:\n\n**Reviews (last 30 days)**\n- 8 new reviews, average rating: 4.5 stars\n- Positive themes: fish tacos (mentioned 4x), margaritas, queso, friendly staff\n- Areas to watch: wait times (mentioned 3x), parking (2x)\n\n**Online Visibility**\n- Google Business Profile views: up 18% vs previous month\n- Phone calls from Google: 34 this month (up from 28)\n- Direction requests: up 22%\n\n**Social Media**\n- Your fish tacos post got 47 likes and 12 shares — your best-performing post in months\n- Follower growth: +23 this week on Instagram\n\n**Overall**: You're in great shape, Maria. The fish tacos launch gave you a nice bump. The main thing to work on is the wait time issue — it's the #1 thing in your lower-rated reviews. Would you like me to help brainstorm solutions?",
        reportType: "mini-summary",
      },
      aiModel: "claude-sonnet-4-6-20250514",
      daysAgo: 4,
      hour: 14,
      minute: 1,
    },
    {
      role: "owner",
      contentType: "text",
      content: {
        text: "Wow that's really helpful! Yeah the wait times... we've been busier than expected. I'm thinking about adding another cook for the Friday/Saturday rush.",
      },
      daysAgo: 4,
      hour: 14,
      minute: 10,
    },
    {
      role: "assistant",
      contentType: "text",
      content: {
        text: "That's smart thinking. Friday and Saturday are definitely your peak — they account for about 45% of your review mentions about wait times. An extra cook during those shifts could make a real difference.\n\nIn the meantime, I can help set expectations by updating your Google Business Profile to mention that Friday/Saturday evenings are popular and reservations are recommended. Want me to draft that update?",
      },
      aiModel: "claude-sonnet-4-6-20250514",
      daysAgo: 4,
      hour: 14,
      minute: 11,
    },
    {
      role: "owner",
      contentType: "text",
      content: { text: "Yes please, do that." },
      daysAgo: 4,
      hour: 14,
      minute: 15,
    },

    // ── Day 5: Weekend special campaign suggestion ──
    {
      role: "assistant",
      contentType: "action_card",
      content: {
        text: "I have an idea for this weekend. Your Saturday brunch has been getting a lot of love in recent reviews — what if we run a \"Weekend Special\" campaign?\n\nHere's what I'm thinking:\n- **Friday evening post**: Teaser — \"Something special is cooking for Saturday brunch...\"\n- **Saturday morning post**: Reveal — Feature a photo of your best brunch dish with a limited-time offer\n- **Saturday afternoon**: Story/reel showing the brunch crowd\n\nThis kind of 3-part content series builds anticipation and tends to drive 30-40% more engagement than single posts. Want me to draft the posts?",
        actionType: "social_post",
        campaignName: "Weekend Special",
      },
      aiModel: "claude-sonnet-4-6-20250514",
      daysAgo: 3,
      hour: 10,
      minute: 0,
    },
    {
      role: "owner",
      contentType: "text",
      content: {
        text: "I love that idea! Let's do it. Our huevos rancheros are probably the most photogenic brunch item.",
      },
      daysAgo: 3,
      hour: 10,
      minute: 20,
    },
    {
      role: "assistant",
      contentType: "text",
      content: {
        text: "Perfect pick — huevos rancheros photograph beautifully. I'll draft all three posts and have them ready for your approval by end of day. If you can snap a photo of the huevos rancheros plated up, that'll make the Saturday post really pop.\n\nI'll schedule the Friday teaser for 5pm (catches the \"what should we do this weekend\" crowd) and the Saturday reveal for 9am.",
      },
      aiModel: "claude-sonnet-4-6-20250514",
      daysAgo: 3,
      hour: 10,
      minute: 21,
    },

    // ── Day 6: First Weekly Digest ──
    {
      role: "assistant",
      contentType: "digest",
      content: {
        text: "Your first weekly digest is here! Here's how Maria's Kitchen performed this week:\n\n**Reviews**: 5 new reviews (avg 4.4 stars)\n- Best quote: \"Best fish tacos in Austin\" — Jake R.\n- You responded to 2 reviews this week (including the 2-star)\n\n**Google Business Profile**\n- 287 profile views (+18% vs last week)\n- 34 phone calls (+21%)\n- 89 direction requests (+15%)\n- Top search queries: \"tex mex south lamar\", \"fish tacos austin\", \"marias kitchen\"\n\n**Social Media**\n- 3 posts published\n- 142 total engagements (47 likes on fish tacos post alone)\n- Instagram followers: 1,247 (+23)\n\n**Actions Completed**\n- 3 social posts published\n- 1 review response posted\n- 1 GBP description optimized\n- 1 SEO update (structured data + categories)\n\n**Recommendation for Next Week**\nYour fish tacos content performed 3x better than your average post. Let's create more content around specific menu items — I'll draft a \"behind the scenes\" post about your queso recipe.\n\nKeep it up, Maria! Your online presence is growing.",
        digestType: "weekly",
        periodStart: daysAgo(now, 9).toISOString(),
        periodEnd: daysAgo(now, 2).toISOString(),
      },
      aiModel: "claude-sonnet-4-6-20250514",
      daysAgo: 2,
      hour: 8,
      minute: 0,
    },
    {
      role: "owner",
      contentType: "text",
      content: {
        text: "This is amazing! I had no idea we were getting that many views. Quick question — how do I compare to other restaurants in the area?",
      },
      daysAgo: 2,
      hour: 8,
      minute: 30,
    },

    // ── Day 7: Competitor comparison ──
    {
      role: "assistant",
      contentType: "report",
      content: {
        text: "Great question! Here's how Maria's Kitchen stacks up against similar restaurants on South Lamar:\n\n**Review Ratings (Google)**\n- Maria's Kitchen: 4.6 avg (87 reviews)\n- Torchy's Tacos (S Lamar): 4.3 avg (2,100+ reviews)\n- Loro (S Lamar): 4.5 avg (1,800+ reviews)\n- Valentina's: 4.7 avg (950+ reviews)\n\n**What You're Winning At**\n- Your review response rate (38%) is higher than most local restaurants (~15%)\n- Your average rating (4.6) beats the South Lamar average (4.2)\n- Customers specifically mention \"authentic\" and \"family-owned\" — big differentiators\n\n**Where Competitors Have an Edge**\n- Review volume: Larger restaurants have 10-20x more reviews. More reviews = higher Google visibility.\n- Social media following: Torchy's has 45K followers vs your 1,247\n- Photo count on Google: You have 34 photos, competitors average 200+\n\n**My Recommendation**\nFocus on review volume — encourage happy customers to leave reviews. Even getting to 150 reviews would significantly boost your Google ranking for \"tex-mex south lamar.\" I can help you set up a simple post-visit review request. Want me to draft one?",
        reportType: "competitor-comparison",
      },
      aiModel: "claude-sonnet-4-6-20250514",
      daysAgo: 1,
      hour: 9,
      minute: 0,
    },
    {
      role: "owner",
      contentType: "text",
      content: {
        text: "Yes! Let's figure out a way to get more reviews. Maybe we can add something to the receipt or put a QR code on the tables?",
      },
      daysAgo: 1,
      hour: 9,
      minute: 15,
    },
    {
      role: "assistant",
      contentType: "text",
      content: {
        text: "Both great ideas! Here's what I'd recommend:\n\n1. **Table QR codes** — I'll generate a short link that goes directly to your Google review page. You can print small table cards that say \"Loved your meal? Tell us on Google!\" with the QR code.\n\n2. **Receipt message** — Add a simple line: \"We'd love your feedback! Scan the QR code on your table or visit [short link].\"\n\n3. **Post-visit text** (if you collect phone numbers): A simple \"Thanks for dining with us! If you enjoyed your meal, a Google review helps us a lot\" with the link.\n\nThe QR code approach is the easiest win — it typically increases review volume by 25-40% within the first month. Want me to generate the short link and design the table card?",
      },
      aiModel: "claude-sonnet-4-6-20250514",
      daysAgo: 1,
      hour: 9,
      minute: 16,
    },
  ];

  for (const msg of messagesData) {
    await db.insert(schema.messages).values({
      conversationId: convo.id,
      businessId: biz.id,
      organizationId: org.id,
      role: msg.role,
      contentType: msg.contentType,
      content: msg.content,
      aiModel: msg.aiModel || null,
      createdAt: daysAgoAt(now, msg.daysAgo, msg.hour, msg.minute),
    });
  }
  console.log(`  Created ${messagesData.length} conversation messages (7-day narrative)`);

  // ─── 9. Analytics Events (30 days, realistic patterns) ─────────────────────

  const eventConfigs: Record<string, { min: number; max: number; weekendMultiplier: number }> = {
    page_view: { min: 15, max: 45, weekendMultiplier: 1.6 },
    phone_call: { min: 2, max: 8, weekendMultiplier: 1.3 },
    booking: { min: 1, max: 5, weekendMultiplier: 1.8 },
    social_engagement: { min: 5, max: 20, weekendMultiplier: 1.2 },
    review_received: { min: 0, max: 3, weekendMultiplier: 1.0 },
    direction_request: { min: 3, max: 12, weekendMultiplier: 1.5 },
  };

  // Days with social posts get a boost to social_engagement
  const socialPostDays = new Set([25, 22, 18, 15, 11, 7, 6, 4]);

  let totalEvents = 0;
  for (let day = 0; day < 30; day++) {
    const dateForDay = daysAgo(now, day);
    const dayOfWeek = dateForDay.getDay(); // 0=Sun, 6=Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

    for (const [eventType, config] of Object.entries(eventConfigs)) {
      let count = Math.floor(
        config.min + rand() * (config.max - config.min)
      );
      if (isWeekend) {
        count = Math.floor(count * config.weekendMultiplier);
      }

      // Boost social engagement on days with social posts
      if (eventType === "social_engagement" && socialPostDays.has(day)) {
        count = Math.floor(count * 1.8);
      }

      // Make review_received more clustered — skip most days
      if (eventType === "review_received" && rand() > 0.4) {
        count = 0;
      }

      for (let j = 0; j < count; j++) {
        await db.insert(schema.analyticsEvents).values({
          businessId: biz.id,
          organizationId: org.id,
          eventType,
          source: eventType === "social_engagement" ? "instagram" : "google",
          metadata: {},
          occurredAt: new Date(
            dateForDay.getTime() +
              rand() * 16 * 60 * 60 * 1000 + // spread across 16 waking hours
              6 * 60 * 60 * 1000 // start from 6am
          ),
        });
        totalEvents++;
      }
    }
  }
  console.log(`  Created ${totalEvents} analytics events across 30 days`);

  // ─── 10. Weekly Digest ─────────────────────────────────────────────────────

  await db.insert(schema.weeklyDigests).values({
    businessId: biz.id,
    organizationId: org.id,
    periodStart: daysAgo(now, 9),
    periodEnd: daysAgo(now, 2),
    metrics: {
      reviewCount: 5,
      averageRating: 4.4,
      profileViews: 287,
      profileViewsChange: 0.18,
      phoneCalls: 34,
      phoneCallsChange: 0.21,
      directionRequests: 89,
      directionRequestsChange: 0.15,
      socialEngagements: 142,
      instagramFollowers: 1247,
      instagramFollowersChange: 23,
      topSearchQueries: [
        "tex mex south lamar",
        "fish tacos austin",
        "marias kitchen",
        "best mexican food austin",
        "brunch south lamar",
      ],
    },
    actionsCompleted: {
      socialPosts: 3,
      reviewResponses: 1,
      gbpUpdates: 1,
      seoOptimizations: 1,
      emailCampaigns: 0,
      total: 6,
    },
    recommendations: [
      "Create more menu-specific content — fish tacos post outperformed average by 3x",
      "Increase review volume with QR code table cards and receipt prompts",
      "Add more photos to Google Business Profile (currently 34, competitors average 200+)",
      "Consider a Friday afternoon social post to capture weekend diners",
    ],
  });
  console.log("  Created 1 weekly digest");

  // ─── Done ──────────────────────────────────────────────────────────────────

  console.log("\nSeed complete!");
  console.log(`  Login: maria@mariaskitchen.com / localgenius123`);
  console.log(`  Business: Maria's Kitchen (${biz.id})`);
  console.log(`  Org: ${org.id}`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
