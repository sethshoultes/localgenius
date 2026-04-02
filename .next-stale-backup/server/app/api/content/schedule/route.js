"use strict";(()=>{var e={};e.id=9263,e.ids=[9263,5748,6962],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},2048:e=>{e.exports=require("fs")},2615:e=>{e.exports=require("http")},8791:e=>{e.exports=require("https")},5315:e=>{e.exports=require("path")},8621:e=>{e.exports=require("punycode")},6162:e=>{e.exports=require("stream")},7360:e=>{e.exports=require("url")},1764:e=>{e.exports=require("util")},2623:e=>{e.exports=require("worker_threads")},1568:e=>{e.exports=require("zlib")},2254:e=>{e.exports=require("node:buffer")},6005:e=>{e.exports=require("node:crypto")},7561:e=>{e.exports=require("node:fs")},4492:e=>{e.exports=require("node:stream")},2477:e=>{e.exports=require("node:stream/web")},7261:e=>{e.exports=require("node:util")},6013:(e,t,s)=>{s.r(t),s.d(t,{originalPathname:()=>I,patchFetch:()=>x,requestAsyncStorage:()=>y,routeModule:()=>w,serverHooks:()=>v,staticGenerationAsyncStorage:()=>b});var o={};s.r(o),s.d(o,{DELETE:()=>g,GET:()=>f,POST:()=>m});var n=s(9303),a=s(8716),r=s(3131),i=s(7070),u=s(1585),d=s(6033),c=s(6403),l=s(9781);let p=u.Ry({platform:u.Km(["instagram","facebook"]),topic:u.Z_().min(1),scheduledFor:u.Z_().datetime(),content:u.Z_().optional(),mediaUrls:u.IX(u.Z_().url()).optional()}),h=u.Ry({postId:u.Z_().uuid()});async function m(e){try{let t=await (0,c.RA)(e);if(t instanceof i.NextResponse)return t;let s=await e.json(),o=p.parse(s),n=new Date(o.scheduledFor);if(n<=new Date)return i.NextResponse.json({error:{code:"INVALID_SCHEDULE",message:"Scheduled time must be in the future"}},{status:400});let a=await (0,l.Os)({businessId:t.businessId,organizationId:t.organizationId,platform:o.platform,topic:o.topic,scheduledFor:n,content:o.content,mediaUrls:o.mediaUrls});return i.NextResponse.json({data:{scheduledPost:a},meta:{timestamp:new Date().toISOString()}},{status:201})}catch(t){if(t instanceof d.jm)return i.NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Invalid schedule request",details:t.errors}},{status:400});let e=t instanceof Error?t.message:"Scheduling failed";return i.NextResponse.json({error:{code:"SCHEDULE_ERROR",message:e}},{status:500})}}async function f(e){let t=await (0,c.RA)(e);if(t instanceof i.NextResponse)return t;let s=await (0,l.uV)(t.businessId,t.organizationId);return i.NextResponse.json({data:{scheduledPosts:s,count:s.length},meta:{timestamp:new Date().toISOString()}})}async function g(e){try{let t=await (0,c.RA)(e);if(t instanceof i.NextResponse)return t;let s=await e.json(),o=h.parse(s);if(!await (0,l.al)(o.postId,t.businessId))return i.NextResponse.json({error:{code:"NOT_FOUND",message:"Scheduled post not found or already published"}},{status:404});return i.NextResponse.json({data:{cancelled:!0,postId:o.postId},meta:{timestamp:new Date().toISOString()}})}catch(e){if(e instanceof d.jm)return i.NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Invalid request",details:e.errors}},{status:400});return i.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"Cancellation failed"}},{status:500})}}let w=new n.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/content/schedule/route",pathname:"/api/content/schedule",filename:"route",bundlePath:"app/api/content/schedule/route"},resolvedPagePath:"/Users/sethshoultes/Local Sites/localgenius/src/app/api/content/schedule/route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:y,staticGenerationAsyncStorage:b,serverHooks:v}=w,I="/api/content/schedule/route";function x(){return(0,r.patchFetch)({serverHooks:v,staticGenerationAsyncStorage:b})}},6403:(e,t,s)=>{s.d(t,{RA:()=>i,WG:()=>d,yh:()=>u});var o=s(7070),n=s(6176),a=s(6091);let r=new TextEncoder().encode(process.env.JWT_SECRET||"dev-secret-change-in-production");async function i(e){let t=e.headers.get("authorization"),s=e.cookies.get("lg_session")?.value,a=t?.startsWith("Bearer ")?t.slice(7):s;if(!a)return o.NextResponse.json({error:{code:"UNAUTHORIZED",message:"Missing authentication"}},{status:401});try{let{payload:e}=await n._(a,r);if(!e.sub||!e.org||!e.biz)return o.NextResponse.json({error:{code:"INVALID_TOKEN",message:"Malformed token payload"}},{status:401});return{userId:e.sub,organizationId:e.org,businessId:e.biz,plan:e.plan||"base"}}catch{return o.NextResponse.json({error:{code:"TOKEN_EXPIRED",message:"Access token expired"}},{status:401})}}async function u(e){return new a.N({sub:e.userId,org:e.organizationId,biz:e.businessId,plan:e.plan}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("15m").sign(r)}async function d(e){return new a.N({sub:e,type:"refresh"}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("30d").sign(r)}},5748:(e,t,s)=>{s.d(t,{db:()=>d,getDb:()=>u});var o=s(2237),n=s(2787),a=s(3887);let r=null,i=null;function u(){return i||(i=(0,n.tS)(function(){if(!r){if(!process.env.DATABASE_URL)throw Error("DATABASE_URL environment variable is not set");r=(0,o.qn)(process.env.DATABASE_URL)}return r}(),{schema:a})),i}let d=new Proxy({},{get:(e,t)=>u()[t]})},8635:(e,t,s)=>{s.d(t,{L:()=>c,OB:()=>d,R_:()=>i,Vw:()=>u,f8:()=>l});var o=s(4588);let n=null;function a(){return n||(n=new o.default({apiKey:process.env.ANTHROPIC_API_KEY})),n}let r=`You are LocalGenius, an AI marketing assistant for local businesses. You speak like a capable, warm colleague — not a chatbot. You are the employee they always needed but could never afford.

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
- You can update: homepage content, about section, hours, contact info, menu/services, photos, theme colors.`;async function i(e){let{prompt:t,systemPrompt:s=r,model:o="claude-sonnet-4-20250514",maxTokens:n=1024,businessContext:i}=e,u=i?`

Business context:
${JSON.stringify(i,null,2)}`:"",d=(await a().messages.create({model:o,max_tokens:n,system:s+u,messages:[{role:"user",content:t}]})).content.find(e=>"text"===e.type);return d?d.text:""}async function*u(e){let{prompt:t,systemPrompt:s=r,model:o="claude-sonnet-4-20250514",maxTokens:n=1024,businessContext:i}=e,u=i?`

Business context:
${JSON.stringify(i,null,2)}`:"";for await(let e of a().messages.stream({model:o,max_tokens:n,system:s+u,messages:[{role:"user",content:t}]}))"content_block_delta"===e.type&&"text_delta"===e.delta.type&&(yield e.delta.text)}async function d(e,t){return i({prompt:`Write a social media post for ${e.name}, a ${e.vertical} in ${e.city}. Topic: ${t}. Write in their voice — warm, local, authentic. Include 3-5 relevant hashtags. Keep it under 280 characters for the main text.`,maxTokens:512})}async function c(e,t){return i({prompt:`Draft a response to this review for ${e.name}:
Rating: ${t.rating}/5
Reviewer: ${t.reviewerName||"Anonymous"}
Review: "${t.reviewText||"(no text)"}"

Guidelines:
- Thank them by name if available
- For positive reviews (4-5 stars): brief, grateful, personal
- For negative reviews (1-3 stars): empathetic, acknowledge the issue, offer to make it right
- Never be defensive
- Keep it under 150 words`,maxTokens:256})}async function l(e,t){let s=t.competitorContext?`

Competitor context: ${JSON.stringify(t.competitorContext)}
Use this data in "How You Compare". Tone: motivating and proud — highlight wins ("you're rated higher than…", "you're gaining reviews faster"). Where the business is behind, frame it as an opportunity ("close the review gap") not a threat. Never anxiety-inducing.`:"\n\nNo competitor data available — skip the 'How You Compare' section or note that competitor tracking isn't set up yet.",o=t.seoScore?`

SEO score: ${JSON.stringify(t.seoScore)}
Use this in "Your SEO Health". Show the score and grade (e.g., "72/100, grade B"). Mention the top recommendation. If the score improved from last week, celebrate it.`:"\n\nNo SEO data available — skip the 'Your SEO Health' section or note that the first SEO audit is coming soon.",n=t.roiSummary?`

ROI Summary: ${JSON.stringify(t.roiSummary)}
Lead with the headline (e.g., "I saved you 4.2 hours this week"). Show specific numbers: posts published, reviews responded, hours saved. If there's estimated dollar value, mention it ("drove an estimated $X in bookings"). This section is the #1 retention driver — make Maria feel the value.`:"";return i({prompt:`Generate a Weekly Digest for ${e.name}. Structure it in six sections:

1. "Your Week at a Glance" (ROI headline): Lead with time saved and actions completed. "${t.roiSummary?.headline||"Here is what happened this week."}". Show specific numbers.
2. "What Happened" (what the world did): Summarize metrics — reviews, visits, calls, bookings. Never a number without context.
3. "What I Did" (what LocalGenius did): Actions completed — posts published, reviews responded, emails sent. Frame as "I did this so you didn't have to."
4. "How You Compare" (competitor comparison): Compare review counts, ratings, and momentum vs competitors.
5. "Your SEO Health" (SEO score): Show the score and grade. Mention the top recommendation.
6. "What I Recommend" (what to do next): One specific, actionable recommendation.

Metrics this week: ${JSON.stringify(t)}${s}${o}${n}

Tone: warm, conversational, slightly proud of their business. Keep the entire digest under 350 words.`,model:"claude-haiku-4-5-20251001",maxTokens:768})}},9781:(e,t,s)=>{s.d(t,{Os:()=>i,al:()=>u,uV:()=>d});var o=s(5748),n=s(3887),a=s(7745),r=s(8635);async function i(e){let t=e.content;if(!t){let[s]=await o.db.select().from(n.businesses).where((0,a.eq)(n.businesses.id,e.businessId)).limit(1);t=await (0,r.OB)({name:s?.name||"the business",vertical:s?.vertical||"restaurant",city:s?.city||""},e.topic)}let s={text:t,mediaUrls:e.mediaUrls||[],topic:e.topic},[i]=await o.db.insert(n.contentItems).values({businessId:e.businessId,organizationId:e.organizationId,contentType:"social_post",content:s,aiModel:"claude-sonnet-4-20250514",approved:!0}).returning(),[u]=await o.db.insert(n.actions).values({businessId:e.businessId,organizationId:e.organizationId,actionType:"social_post",status:"scheduled",content:{...s,platform:e.platform},scheduledFor:e.scheduledFor}).returning(),[d]=await o.db.insert(n.scheduledPosts).values({businessId:e.businessId,organizationId:e.organizationId,contentItemId:i.id,actionId:u.id,platform:e.platform,content:s,scheduledFor:e.scheduledFor,status:"pending"}).returning();return{id:d.id,platform:d.platform,content:s,scheduledFor:d.scheduledFor,status:d.status}}async function u(e,t){let[s]=await o.db.select().from(n.scheduledPosts).where((0,a.xD)((0,a.eq)(n.scheduledPosts.id,e),(0,a.eq)(n.scheduledPosts.businessId,t),(0,a.eq)(n.scheduledPosts.status,"pending"))).limit(1);return!!s&&(await o.db.update(n.scheduledPosts).set({status:"cancelled"}).where((0,a.eq)(n.scheduledPosts.id,e)),s.actionId&&await o.db.update(n.actions).set({status:"rejected",updatedAt:new Date}).where((0,a.eq)(n.actions.id,s.actionId)),!0)}async function d(e,t){return(await o.db.select().from(n.scheduledPosts).where((0,a.xD)((0,a.eq)(n.scheduledPosts.businessId,e),(0,a.eq)(n.scheduledPosts.organizationId,t),(0,a.eq)(n.scheduledPosts.status,"pending"))).orderBy(n.scheduledPosts.scheduledFor).limit(20)).map(e=>({id:e.id,platform:e.platform,content:e.content,scheduledFor:e.scheduledFor,status:e.status}))}}};var t=require("../../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),o=t.X(0,[9276,4149,9187,2787,5972,3883,4524,1585,4588,3737],()=>s(6013));module.exports=o})();