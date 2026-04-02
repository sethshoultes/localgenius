"use strict";(()=>{var e={};e.id=7059,e.ids=[7059,5748,6962],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},2048:e=>{e.exports=require("fs")},2615:e=>{e.exports=require("http")},8791:e=>{e.exports=require("https")},5315:e=>{e.exports=require("path")},8621:e=>{e.exports=require("punycode")},6162:e=>{e.exports=require("stream")},7360:e=>{e.exports=require("url")},1764:e=>{e.exports=require("util")},2623:e=>{e.exports=require("worker_threads")},1568:e=>{e.exports=require("zlib")},7561:e=>{e.exports=require("node:fs")},4492:e=>{e.exports=require("node:stream")},2477:e=>{e.exports=require("node:stream/web")},3968:(e,t,o)=>{o.r(t),o.d(t,{originalPathname:()=>v,patchFetch:()=>f,requestAsyncStorage:()=>m,routeModule:()=>h,serverHooks:()=>w,staticGenerationAsyncStorage:()=>g});var a={};o.r(a),o.d(a,{GET:()=>u});var r=o(9303),s=o(8716),i=o(3131),n=o(7070),c=o(5748),d=o(3887),l=o(7745),p=o(6022);async function u(e,{params:t}){try{let{businessId:e}=await t,[o]=await c.db.select().from(d.businesses).where((0,l.eq)(d.businesses.id,e)).limit(1);if(!o||o.deletedAt)return new n.NextResponse("<html><body><h1>Site not found</h1></body></html>",{status:404,headers:{"Content-Type":"text/html"}});let a=await (0,p.j)(o.id,o.organizationId,{name:o.name,vertical:o.vertical,city:o.city,state:o.state,address:o.address,phone:o.phone});return new n.NextResponse(a.html,{status:200,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"public, s-maxage=3600, stale-while-revalidate=86400"}})}catch(e){return new n.NextResponse("<html><body><h1>Something went wrong</h1><p>We're working on it.</p></body></html>",{status:500,headers:{"Content-Type":"text/html"}})}}let h=new r.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/website/[businessId]/route",pathname:"/api/website/[businessId]",filename:"route",bundlePath:"app/api/website/[businessId]/route"},resolvedPagePath:"/Users/sethshoultes/Local Sites/localgenius/src/app/api/website/[businessId]/route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:m,staticGenerationAsyncStorage:g,serverHooks:w}=h,v="/api/website/[businessId]/route";function f(){return(0,i.patchFetch)({serverHooks:w,staticGenerationAsyncStorage:g})}},5748:(e,t,o)=>{o.d(t,{db:()=>d,getDb:()=>c});var a=o(2237),r=o(2787),s=o(3887);let i=null,n=null;function c(){return n||(n=(0,r.tS)(function(){if(!i){if(!process.env.DATABASE_URL)throw Error("DATABASE_URL environment variable is not set");i=(0,a.qn)(process.env.DATABASE_URL)}return i}(),{schema:s})),n}let d=new Proxy({},{get:(e,t)=>c()[t]})},8635:(e,t,o)=>{o.d(t,{L:()=>l,OB:()=>d,R_:()=>n,Vw:()=>c,f8:()=>p});var a=o(4588);let r=null;function s(){return r||(r=new a.default({apiKey:process.env.ANTHROPIC_API_KEY})),r}let i=`You are LocalGenius, an AI marketing assistant for local businesses. You speak like a capable, warm colleague — not a chatbot. You are the employee they always needed but could never afford.

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
- You can update: homepage content, about section, hours, contact info, menu/services, photos, theme colors.`;async function n(e){let{prompt:t,systemPrompt:o=i,model:a="claude-sonnet-4-20250514",maxTokens:r=1024,businessContext:n}=e,c=n?`

Business context:
${JSON.stringify(n,null,2)}`:"",d=(await s().messages.create({model:a,max_tokens:r,system:o+c,messages:[{role:"user",content:t}]})).content.find(e=>"text"===e.type);return d?d.text:""}async function*c(e){let{prompt:t,systemPrompt:o=i,model:a="claude-sonnet-4-20250514",maxTokens:r=1024,businessContext:n}=e,c=n?`

Business context:
${JSON.stringify(n,null,2)}`:"";for await(let e of s().messages.stream({model:a,max_tokens:r,system:o+c,messages:[{role:"user",content:t}]}))"content_block_delta"===e.type&&"text_delta"===e.delta.type&&(yield e.delta.text)}async function d(e,t){return n({prompt:`Write a social media post for ${e.name}, a ${e.vertical} in ${e.city}. Topic: ${t}. Write in their voice — warm, local, authentic. Include 3-5 relevant hashtags. Keep it under 280 characters for the main text.`,maxTokens:512})}async function l(e,t){return n({prompt:`Draft a response to this review for ${e.name}:
Rating: ${t.rating}/5
Reviewer: ${t.reviewerName||"Anonymous"}
Review: "${t.reviewText||"(no text)"}"

Guidelines:
- Thank them by name if available
- For positive reviews (4-5 stars): brief, grateful, personal
- For negative reviews (1-3 stars): empathetic, acknowledge the issue, offer to make it right
- Never be defensive
- Keep it under 150 words`,maxTokens:256})}async function p(e,t){let o=t.competitorContext?`

Competitor context: ${JSON.stringify(t.competitorContext)}
Use this data in "How You Compare". Tone: motivating and proud — highlight wins ("you're rated higher than…", "you're gaining reviews faster"). Where the business is behind, frame it as an opportunity ("close the review gap") not a threat. Never anxiety-inducing.`:"\n\nNo competitor data available — skip the 'How You Compare' section or note that competitor tracking isn't set up yet.",a=t.seoScore?`

SEO score: ${JSON.stringify(t.seoScore)}
Use this in "Your SEO Health". Show the score and grade (e.g., "72/100, grade B"). Mention the top recommendation. If the score improved from last week, celebrate it.`:"\n\nNo SEO data available — skip the 'Your SEO Health' section or note that the first SEO audit is coming soon.",r=t.roiSummary?`

ROI Summary: ${JSON.stringify(t.roiSummary)}
Lead with the headline (e.g., "I saved you 4.2 hours this week"). Show specific numbers: posts published, reviews responded, hours saved. If there's estimated dollar value, mention it ("drove an estimated $X in bookings"). This section is the #1 retention driver — make Maria feel the value.`:"";return n({prompt:`Generate a Weekly Digest for ${e.name}. Structure it in six sections:

1. "Your Week at a Glance" (ROI headline): Lead with time saved and actions completed. "${t.roiSummary?.headline||"Here is what happened this week."}". Show specific numbers.
2. "What Happened" (what the world did): Summarize metrics — reviews, visits, calls, bookings. Never a number without context.
3. "What I Did" (what LocalGenius did): Actions completed — posts published, reviews responded, emails sent. Frame as "I did this so you didn't have to."
4. "How You Compare" (competitor comparison): Compare review counts, ratings, and momentum vs competitors.
5. "Your SEO Health" (SEO score): Show the score and grade. Mention the top recommendation.
6. "What I Recommend" (what to do next): One specific, actionable recommendation.

Metrics this week: ${JSON.stringify(t)}${o}${a}${r}

Tone: warm, conversational, slightly proud of their business. Keep the entire digest under 350 words.`,model:"claude-haiku-4-5-20251001",maxTokens:768})}},6022:(e,t,o)=>{o.d(t,{j:()=>d});var a=o(5748),r=o(3887),s=o(7745),i=o(4149),n=o(1445),c=o(8635);async function d(e,t,o){let d=o.description;d||(d=await (0,c.R_)({prompt:`Write a warm, confident 2-3 sentence description for ${o.name}, a ${o.vertical} in ${o.city}, ${o.state}. Write as if you are the owner speaking about your business. No marketing jargon. Local, authentic, proud.`,maxTokens:200}));let l=await (0,c.R_)({prompt:`Write a 5-8 word tagline for ${o.name}, a ${o.vertical} in ${o.city}. Warm, memorable, local. No clich\xe9s. Examples of the tone: "Tex-Mex from scratch on South Lamar" or "Where neighbors become regulars." Just the tagline, nothing else.`,maxTokens:50}),p=await a.db.select().from(r.reviews).where((0,s.xD)((0,s.eq)(r.reviews.businessId,e),(0,i.i6)`${r.reviews.rating} >= 4`)).orderBy((0,n.C)(r.reviews.rating),(0,n.C)(r.reviews.reviewDate)).limit(3),u=o.photos?.[0]||null,h=o.photos?.slice(1,4)||[],m=o.hours||{"Mon-Thu":"11am - 9pm","Fri-Sat":"11am - 10pm",Sun:"10am - 8pm"},g=`${o.name} — ${l.trim()}. ${o.vertical.charAt(0).toUpperCase()+o.vertical.slice(1)} in ${o.city}, ${o.state}.`,w=function(e){let t=e.reviews.length>0?e.reviews.map(e=>{var t;return`
        <div class="review-card">
          <div class="review-stars">${t=e.rating,"★".repeat(t)+"☆".repeat(5-t)}</div>
          <p class="review-text">"${e.text}"</p>
          <p class="review-author">— ${e.name}</p>
        </div>`}).join(""):"",o=e.galleryPhotos.length>0?`<section class="gallery">
        <div class="gallery-grid">
          ${e.galleryPhotos.map(t=>`<img src="${t}" alt="${e.name}" loading="lazy" />`).join("")}
        </div>
      </section>`:"",a=Object.entries(e.hours).map(([e,t])=>`<div class="hours-row"><span>${e}</span><span>${t}</span></div>`).join("");return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${e.metaDescription}">
  <title>${e.name} — ${e.tagline}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --charcoal: #2C2C2C;
      --warm-white: #FAF8F5;
      --terracotta: #C4704B;
      --sage: #7A8B6F;
      --gold: #D4A853;
      --slate: #6B7280;
      --cream: #F2EDE8;
      --blush: #F5E6E0;
    }

    body {
      font-family: 'Source Sans 3', system-ui, -apple-system, sans-serif;
      color: var(--charcoal);
      background: var(--warm-white);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    /* ─── Hero ─── */
    .hero {
      position: relative;
      min-height: 60vh;
      display: flex;
      align-items: flex-end;
      padding: 40px 24px;
      background: ${e.heroPhoto?`linear-gradient(to top, rgba(44,44,44,0.85) 0%, rgba(44,44,44,0.3) 50%, transparent 100%), url('${e.heroPhoto}') center/cover no-repeat`:"linear-gradient(135deg, var(--terracotta) 0%, #8B4B3A 100%)"};
    }
    .hero-content { max-width: 640px; color: white; }
    .hero h1 { font-size: 2.5rem; font-weight: 700; line-height: 1.15; margin-bottom: 8px; }
    .hero .tagline { font-size: 1.25rem; opacity: 0.9; margin-bottom: 16px; }
    .hero .cta-row { display: flex; gap: 12px; flex-wrap: wrap; }
    .btn {
      display: inline-block; padding: 14px 28px; border-radius: 8px;
      text-decoration: none; font-weight: 600; font-size: 1rem; transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .btn-primary { background: var(--terracotta); color: white; }
    .btn-secondary { background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.3); }

    /* ─── Sections ─── */
    section { padding: 48px 24px; max-width: 720px; margin: 0 auto; }
    h2 { font-size: 1.5rem; font-weight: 600; margin-bottom: 16px; color: var(--charcoal); }

    .about p { font-size: 1.1rem; color: var(--slate); line-height: 1.8; }

    /* ─── Gallery ─── */
    .gallery-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px; border-radius: 12px; overflow: hidden;
    }
    .gallery-grid img { width: 100%; height: 200px; object-fit: cover; border-radius: 8px; }

    /* ─── Hours ─── */
    .hours-card { background: var(--cream); border-radius: 12px; padding: 24px; }
    .hours-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.06); }
    .hours-row:last-child { border-bottom: none; }

    /* ─── Reviews ─── */
    .reviews-grid { display: grid; gap: 16px; }
    .review-card { background: white; border: 1px solid var(--cream); border-radius: 12px; padding: 20px; }
    .review-stars { color: var(--gold); font-size: 1.1rem; margin-bottom: 8px; }
    .review-text { font-style: italic; color: var(--slate); margin-bottom: 8px; }
    .review-author { font-size: 0.875rem; color: var(--slate); }

    /* ─── Contact ─── */
    .contact-card { background: var(--cream); border-radius: 12px; padding: 24px; }
    .contact-item { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .contact-item:last-child { margin-bottom: 0; }
    .contact-icon { width: 20px; text-align: center; color: var(--terracotta); }

    /* ─── Footer ─── */
    footer {
      text-align: center; padding: 32px 24px; color: var(--slate);
      font-size: 0.8rem; border-top: 1px solid var(--cream);
    }
    footer a { color: var(--terracotta); text-decoration: none; }

    @media (max-width: 480px) {
      .hero h1 { font-size: 1.75rem; }
      .hero { min-height: 50vh; padding: 32px 20px; }
      section { padding: 32px 20px; }
    }
  </style>
</head>
<body>
  <header class="hero">
    <div class="hero-content">
      <h1>${e.name}</h1>
      <p class="tagline">${e.tagline}</p>
      <div class="cta-row">
        ${e.phone?`<a href="tel:${e.phone.replace(/[^+\d]/g,"")}" class="btn btn-primary">Call Us</a>`:""}
        ${e.address?`<a href="https://maps.google.com/?q=${encodeURIComponent(e.address)}" class="btn btn-secondary" target="_blank">Get Directions</a>`:""}
      </div>
    </div>
  </header>

  <section class="about">
    <h2>About Us</h2>
    <p>${e.description}</p>
  </section>

  ${o}

  ${e.reviews.length>0?`
  <section class="reviews">
    <h2>What People Are Saying</h2>
    <div class="reviews-grid">
      ${t}
    </div>
  </section>`:""}

  <section class="hours-section">
    <h2>Hours</h2>
    <div class="hours-card">
      ${a}
    </div>
  </section>

  <section class="contact-section">
    <h2>Visit Us</h2>
    <div class="contact-card">
      ${e.address?`<div class="contact-item"><span class="contact-icon">&#x1F4CD;</span><span>${e.address}</span></div>`:""}
      ${e.phone?`<div class="contact-item"><span class="contact-icon">&#x1F4DE;</span><a href="tel:${e.phone.replace(/[^+\d]/g,"")}">${e.phone}</a></div>`:""}
    </div>
  </section>

  <footer>
    <p>&copy; ${new Date().getFullYear()} ${e.name}. All rights reserved.</p>
    <p style="margin-top: 8px;">Powered by <a href="https://localgenius.com">LocalGenius</a></p>
  </footer>
</body>
</html>`}({name:o.name,tagline:l.trim(),description:d.trim(),vertical:o.vertical,city:o.city,state:o.state,address:o.address||"",phone:o.phone||"",heroPhoto:u,galleryPhotos:h,hours:m,reviews:p.map(e=>({name:e.reviewerName||"A happy customer",rating:e.rating,text:e.reviewText||""})),metaDescription:g});return await a.db.update(r.businesses).set({updatedAt:new Date}).where((0,s.xD)((0,s.eq)(r.businesses.id,e),(0,s.eq)(r.businesses.organizationId,t))),{html:w,metadata:{title:`${o.name} — ${l.trim()}`,description:g,generatedAt:new Date().toISOString()}}}}};var t=require("../../../../webpack-runtime.js");t.C(e);var o=e=>t(t.s=e),a=t.X(0,[9276,4149,9187,2787,5972,4588,3737],()=>o(3968));module.exports=a})();