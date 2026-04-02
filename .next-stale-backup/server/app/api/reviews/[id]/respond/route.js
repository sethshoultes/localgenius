"use strict";(()=>{var e={};e.id=5134,e.ids=[5134,5748,6962],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},2048:e=>{e.exports=require("fs")},2615:e=>{e.exports=require("http")},8791:e=>{e.exports=require("https")},5315:e=>{e.exports=require("path")},8621:e=>{e.exports=require("punycode")},6162:e=>{e.exports=require("stream")},7360:e=>{e.exports=require("url")},1764:e=>{e.exports=require("util")},2623:e=>{e.exports=require("worker_threads")},1568:e=>{e.exports=require("zlib")},2254:e=>{e.exports=require("node:buffer")},6005:e=>{e.exports=require("node:crypto")},7561:e=>{e.exports=require("node:fs")},4492:e=>{e.exports=require("node:stream")},2477:e=>{e.exports=require("node:stream/web")},7261:e=>{e.exports=require("node:util")},5502:(e,t,s)=>{s.r(t),s.d(t,{originalPathname:()=>x,patchFetch:()=>I,requestAsyncStorage:()=>v,routeModule:()=>g,serverHooks:()=>b,staticGenerationAsyncStorage:()=>y});var o={};s.r(o),s.d(o,{POST:()=>w});var r=s(9303),n=s(8716),a=s(3131),i=s(7070),u=s(1585),d=s(6033),c=s(5748),p=s(3887),l=s(7745),m=s(6403),h=s(8635);let f=u.Ry({responseText:u.Z_().min(1).max(2e3).optional(),useAiDraft:u.O7().default(!0)});async function w(e,{params:t}){try{let s=await (0,m.RA)(e);if(s instanceof i.NextResponse)return s;let{id:o}=await t,r=await e.json(),n=f.parse(r),[a]=await c.db.select().from(p.reviews).where((0,l.xD)((0,l.eq)(p.reviews.id,o),(0,l.eq)(p.reviews.organizationId,s.organizationId))).limit(1);if(!a)return i.NextResponse.json({error:{code:"NOT_FOUND",message:"Review not found"}},{status:404});let u=n.responseText||"";if(n.useAiDraft&&!u){let[e]=await c.db.select().from(p.businesses).where((0,l.eq)(p.businesses.id,s.businessId)).limit(1);u=await (0,h.L)({name:e?.name||"the business"},{reviewerName:a.reviewerName,rating:a.rating,reviewText:a.reviewText})}let[d]=await c.db.insert(p.actions).values({businessId:s.businessId,organizationId:s.organizationId,actionType:"review_response",status:"completed",content:{reviewId:o,responseText:u,platform:a.platform},executedAt:new Date}).returning(),[w]=await c.db.insert(p.reviewResponses).values({reviewId:o,businessId:s.businessId,organizationId:s.organizationId,actionId:d.id,responseText:u,postedAt:new Date,postedToPlatform:"yelp"!==a.platform}).returning();return i.NextResponse.json({data:{response:{...w,platform:a.platform,needsManualPosting:"yelp"===a.platform}},meta:{timestamp:new Date().toISOString()}})}catch(t){if(t instanceof d.jm)return i.NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Invalid data",details:t.errors}},{status:400});let e=t instanceof Error?t.message:"Failed to respond";return i.NextResponse.json({error:{code:"INTERNAL_ERROR",message:e}},{status:500})}}let g=new r.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/reviews/[id]/respond/route",pathname:"/api/reviews/[id]/respond",filename:"route",bundlePath:"app/api/reviews/[id]/respond/route"},resolvedPagePath:"/Users/sethshoultes/Local Sites/localgenius/src/app/api/reviews/[id]/respond/route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:v,staticGenerationAsyncStorage:y,serverHooks:b}=g,x="/api/reviews/[id]/respond/route";function I(){return(0,a.patchFetch)({serverHooks:b,staticGenerationAsyncStorage:y})}},6403:(e,t,s)=>{s.d(t,{RA:()=>i,WG:()=>d,yh:()=>u});var o=s(7070),r=s(6176),n=s(6091);let a=new TextEncoder().encode(process.env.JWT_SECRET||"dev-secret-change-in-production");async function i(e){let t=e.headers.get("authorization"),s=e.cookies.get("lg_session")?.value,n=t?.startsWith("Bearer ")?t.slice(7):s;if(!n)return o.NextResponse.json({error:{code:"UNAUTHORIZED",message:"Missing authentication"}},{status:401});try{let{payload:e}=await r._(n,a);if(!e.sub||!e.org||!e.biz)return o.NextResponse.json({error:{code:"INVALID_TOKEN",message:"Malformed token payload"}},{status:401});return{userId:e.sub,organizationId:e.org,businessId:e.biz,plan:e.plan||"base"}}catch{return o.NextResponse.json({error:{code:"TOKEN_EXPIRED",message:"Access token expired"}},{status:401})}}async function u(e){return new n.N({sub:e.userId,org:e.organizationId,biz:e.businessId,plan:e.plan}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("15m").sign(a)}async function d(e){return new n.N({sub:e,type:"refresh"}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("30d").sign(a)}},5748:(e,t,s)=>{s.d(t,{db:()=>d,getDb:()=>u});var o=s(2237),r=s(2787),n=s(3887);let a=null,i=null;function u(){return i||(i=(0,r.tS)(function(){if(!a){if(!process.env.DATABASE_URL)throw Error("DATABASE_URL environment variable is not set");a=(0,o.qn)(process.env.DATABASE_URL)}return a}(),{schema:n})),i}let d=new Proxy({},{get:(e,t)=>u()[t]})},8635:(e,t,s)=>{s.d(t,{L:()=>c,OB:()=>d,R_:()=>i,Vw:()=>u,f8:()=>p});var o=s(4588);let r=null;function n(){return r||(r=new o.default({apiKey:process.env.ANTHROPIC_API_KEY})),r}let a=`You are LocalGenius, an AI marketing assistant for local businesses. You speak like a capable, warm colleague — not a chatbot. You are the employee they always needed but could never afford.

Rules:
- Never say "AI-powered", "platform", "solution", or "streamline"
- Use the business owner's name when you know it
- Keep responses concise — the owner is busy
- When proposing actions (social posts, review responses), present them as drafts for approval
- For social posts, write in the business's voice, not yours
- Always include specific numbers when reporting results
- Tone: warm, confident, competent. Not cute, not corporate.

Scheduling:
- When the owner asks to post something at a specific time (e.g., "post about fish tacos on Thursday at 5pm"), generate the content now and present it as a scheduled post for approval.
- Format your response as: "Here's a post about [topic]. I'll schedule it for [day] at [time] on [platform]." followed by the draft content and approval buttons.
- If no time is specified, suggest an optimal posting time based on the business type (restaurants: 11am for lunch, 5pm for dinner; salons: 10am weekdays).
- If no platform is specified, default to Instagram for visual businesses (restaurants, salons) and Facebook for service businesses.
- Understand natural language time: "tomorrow", "this Thursday", "next Monday at noon", "Friday evening" (= 5pm).
- Always confirm the scheduled time with the owner before committing.

Business Updates:
- When the owner asks to update business info (hours, phone, address, description, etc.), make the change and confirm what you did.
- Parse natural language: "we're closing at 9pm on weekdays now" → update hours for Mon-Fri to close at 9pm.
- "New phone number is 512-555-0199" → update phone.
- "We moved to 2100 S Lamar" → update address.
- After updating, confirm what you actually changed. Only claim actions that were performed.
- If Google Business Profile is connected, say: "Done — I updated your [field] here and on your Google listing."
- If Google Business Profile is NOT connected, say: "Done — I updated your [field]. I've prepared the update for Google — you'll need to approve it in your Google Business Profile, or connect your account so I can do it automatically."
- NEVER claim you updated an external service (Google, Facebook, etc.) unless the business context confirms that integration is active. Honesty is non-negotiable.
- For hours, parse into structured format: { "Mon-Fri": "11am-9pm", "Sat": "10am-10pm", "Sun": "10am-8pm" }
- If the request is ambiguous, ask ONE clarifying question. Never two.
- You can update: hours, phone, email, address, description, website URL, social links.

Website Updates:
- If the business has a live website (check business context for websiteUrl containing "localgenius.site"), you can update it directly.
- When the owner says "update my website", "change my site", "add brunch to my website", etc., use the SITE_UPDATE action.
- Format your response as: "I'll update your website now." Then describe what you changed: "Done — I updated your [section]. Your site at [url] now shows the new [content]."
- If the business does NOT have a live website, suggest provisioning one: "You don't have a live website yet. Want me to create one? It takes about 5 minutes."
- Website updates happen via MCP — the owner never sees a CMS or editor. They talk to you, you update the site.
- You can update: homepage content, about section, hours, contact info, menu/services, photos, theme colors.`;async function i(e){let{prompt:t,systemPrompt:s=a,model:o="claude-sonnet-4-20250514",maxTokens:r=1024,businessContext:i}=e,u=i?`

Business context:
${JSON.stringify(i,null,2)}`:"",d=(await n().messages.create({model:o,max_tokens:r,system:s+u,messages:[{role:"user",content:t}]})).content.find(e=>"text"===e.type);return d?d.text:""}async function*u(e){let{prompt:t,systemPrompt:s=a,model:o="claude-sonnet-4-20250514",maxTokens:r=1024,businessContext:i}=e,u=i?`

Business context:
${JSON.stringify(i,null,2)}`:"";for await(let e of n().messages.stream({model:o,max_tokens:r,system:s+u,messages:[{role:"user",content:t}]}))"content_block_delta"===e.type&&"text_delta"===e.delta.type&&(yield e.delta.text)}async function d(e,t){return i({prompt:`Write a social media post for ${e.name}, a ${e.vertical} in ${e.city}. Topic: ${t}. Write in their voice — warm, local, authentic. Include 3-5 relevant hashtags. Keep it under 280 characters for the main text.`,maxTokens:512})}async function c(e,t){return i({prompt:`Draft a response to this review for ${e.name}:
Rating: ${t.rating}/5
Reviewer: ${t.reviewerName||"Anonymous"}
Review: "${t.reviewText||"(no text)"}"

Guidelines:
- Thank them by name if available
- For positive reviews (4-5 stars): brief, grateful, personal
- For negative reviews (1-3 stars): empathetic, acknowledge the issue, offer to make it right
- Never be defensive
- Keep it under 150 words`,maxTokens:256})}async function p(e,t){let s=t.competitorContext?`

Competitor context: ${JSON.stringify(t.competitorContext)}
Use this data in "How You Compare". Tone: motivating and proud — highlight wins ("you're rated higher than…", "you're gaining reviews faster"). Where the business is behind, frame it as an opportunity ("close the review gap") not a threat. Never anxiety-inducing.`:"\n\nNo competitor data available — skip the 'How You Compare' section or note that competitor tracking isn't set up yet.",o=t.seoScore?`

SEO score: ${JSON.stringify(t.seoScore)}
Use this in "Your SEO Health". Show the score and grade (e.g., "72/100, grade B"). Mention the top recommendation. If the score improved from last week, celebrate it.`:"\n\nNo SEO data available — skip the 'Your SEO Health' section or note that the first SEO audit is coming soon.",r=t.roiSummary?`

ROI Summary: ${JSON.stringify(t.roiSummary)}
Lead with the headline (e.g., "I saved you 4.2 hours this week"). Show specific numbers: posts published, reviews responded, hours saved. If there's estimated dollar value, mention it ("drove an estimated $X in bookings"). This section is the #1 retention driver — make Maria feel the value.`:"";return i({prompt:`Generate a Weekly Digest for ${e.name}. Structure it in six sections:

1. "Your Week at a Glance" (ROI headline): Lead with time saved and actions completed. "${t.roiSummary?.headline||"Here is what happened this week."}". Show specific numbers.
2. "What Happened" (what the world did): Summarize metrics — reviews, visits, calls, bookings. Never a number without context.
3. "What I Did" (what LocalGenius did): Actions completed — posts published, reviews responded, emails sent. Frame as "I did this so you didn't have to."
4. "How You Compare" (competitor comparison): Compare review counts, ratings, and momentum vs competitors.
5. "Your SEO Health" (SEO score): Show the score and grade. Mention the top recommendation.
6. "What I Recommend" (what to do next): One specific, actionable recommendation.

Metrics this week: ${JSON.stringify(t)}${s}${o}${r}

Tone: warm, conversational, slightly proud of their business. Keep the entire digest under 350 words.`,model:"claude-haiku-4-5-20251001",maxTokens:768})}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),o=t.X(0,[9276,4149,9187,2787,5972,3883,4524,1585,4588,3737],()=>s(5502));module.exports=o})();