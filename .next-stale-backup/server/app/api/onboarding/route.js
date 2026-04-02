"use strict";(()=>{var e={};e.id=7218,e.ids=[7218],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},4770:e=>{e.exports=require("crypto")},2048:e=>{e.exports=require("fs")},2615:e=>{e.exports=require("http")},8791:e=>{e.exports=require("https")},5315:e=>{e.exports=require("path")},8621:e=>{e.exports=require("punycode")},6162:e=>{e.exports=require("stream")},7360:e=>{e.exports=require("url")},1764:e=>{e.exports=require("util")},2623:e=>{e.exports=require("worker_threads")},1568:e=>{e.exports=require("zlib")},2254:e=>{e.exports=require("node:buffer")},6005:e=>{e.exports=require("node:crypto")},7561:e=>{e.exports=require("node:fs")},4492:e=>{e.exports=require("node:stream")},2477:e=>{e.exports=require("node:stream/web")},7261:e=>{e.exports=require("node:util")},3134:(e,t,s)=>{s.r(t),s.d(t,{originalPathname:()=>N,patchFetch:()=>_,requestAsyncStorage:()=>D,routeModule:()=>q,serverHooks:()=>E,staticGenerationAsyncStorage:()=>z});var a={};s.r(a),s.d(a,{GET:()=>A,POST:()=>R});var i=s(9303),r=s(8716),o=s(3131),n=s(7070),l=s(1585),c=s(6033),d=s(5748),p=s(3887),u=s(7745),m=s(6403),h=s(6022);async function g(e,t){var s,a;let[i]=await d.db.select().from(p.businesses).where((0,u.xD)((0,u.eq)(p.businesses.id,e),(0,u.eq)(p.businesses.organizationId,t))).limit(1);if(!i)throw Error(`Business ${e} not found`);let r=(s=i.name,a=i.city,`${s} ${a}`.toLowerCase().replace(/['']/g,"").replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"").slice(0,63)),o=process.env.NEXT_PUBLIC_APP_URL||"https://localgenius.company",n=`${o}/site/${r}`;return await d.db.update(p.businesses).set({websiteUrl:n,updatedAt:new Date}).where((0,u.xD)((0,u.eq)(p.businesses.id,e),(0,u.eq)(p.businesses.organizationId,t))),{siteUrl:n,slug:r}}var b=s(8635),w=s(4035),v=s(3332);function f(e,t,s){return{timestamp:new Date().toISOString(),level:e,message:t,...s}}function y(e){{let t=JSON.stringify(e);"error"===e.level?console.error(t):"warn"===e.level?console.warn(t):console.log(t)}}let x={info(e,t={}){y(f("info",e,t))},warn(e,t={}){y(f("warn",e,t))},error(e,t={}){y(f("error",e,t))}};async function I(e){let t={websiteGenerated:!1,welcomeMessageSent:!1,postsGenerated:0,reviewsSynced:0,digestScheduled:!1,seoScore:null,totalSteps:7,completedSteps:0,errors:[]},s=Date.now();x.info("Onboarding pipeline started",{businessId:e.businessId,route:"onboarding-pipeline"});let[a]=await d.db.select().from(p.conversations).where((0,u.eq)(p.conversations.businessId,e.businessId)).limit(1);if(!a)return t.errors.push("No conversation found — cannot send messages"),t;try{if(process.env.LOCALGENIUS_SITES_API_TOKEN){let s=await g(e.businessId,e.organizationId);t.websiteGenerated=!0,t.completedSteps++,await $(e,"website_generated",{source:"onboarding",type:"cloudflare_sites",url:s.siteUrl}),x.info("Pipeline: Cloudflare site provisioned",{businessId:e.businessId,siteUrl:s.siteUrl})}else await (0,h.j)(e.businessId,e.organizationId,{name:e.businessName,vertical:e.vertical,city:e.city,state:e.state,address:e.address,phone:e.phone,photos:e.photos}),t.websiteGenerated=!0,t.completedSteps++,await $(e,"website_generated",{source:"onboarding",type:"static_html"}),x.info("Pipeline: static website generated (Sites not configured)",{businessId:e.businessId})}catch(s){t.errors.push(`Website: ${S(s)}`),x.error("Pipeline: website generation failed",{businessId:e.businessId,error:S(s)})}try{let s=await (0,b.R_)({prompt:`You are LocalGenius, welcoming ${e.businessName} (a ${e.vertical} in ${e.city}, ${e.state}). Write a warm, brief welcome message (3-4 sentences). Tell them:
1. Their website is live
2. You've already started working on their online presence
3. What they can expect this week (first social post, review responses, weekly digest on Sunday)
4. They can just talk to you like an employee — type anything

Don't say "AI" or "platform". Be warm, confident, specific to their business type.`,maxTokens:250});await d.db.insert(p.messages).values({conversationId:a.id,businessId:e.businessId,organizationId:e.organizationId,role:"assistant",contentType:"text",content:{text:s},aiModel:"claude-sonnet-4-20250514"}),t.welcomeMessageSent=!0,t.completedSteps++}catch(e){t.errors.push(`Welcome: ${S(e)}`)}if(e.hasGoogleConnection)try{let s=await (0,w.bH)(e.businessId,e.organizationId);t.reviewsSynced=s.synced,t.completedSteps++,s.synced>0&&await d.db.insert(p.messages).values({conversationId:a.id,businessId:e.businessId,organizationId:e.organizationId,role:"assistant",contentType:"text",content:{text:`I found ${s.synced} reviews on Google. I've drafted responses for the ones that need attention — check them out when you're ready.`}})}catch(e){t.errors.push(`Reviews: ${S(e)}`)}else t.completedSteps++;try{let s=function(e,t){let s={restaurant:["our most popular dish — the one regulars can't stop ordering","behind the scenes in our kitchen","what makes us different from every other restaurant on the block"],salon:["a stunning before-and-after transformation","meet our team — the people behind the magic","our most-requested service this month"],dental:["tips for keeping your smile healthy between visits","meet our team — we promise we're friendly","a patient success story (with permission)"],home_services:["a recent job we're proud of — before and after","seasonal maintenance tips from our experts","why our customers keep coming back"],default:["what makes our business special","meet the team behind the work","a happy customer story"]};return s[e]||s.default}(e.vertical,e.priorityFocus),i=[];for(let t of s.slice(0,3)){let s=await (0,b.OB)({name:e.businessName,vertical:e.vertical,city:e.city},t);i.push(s),await d.db.insert(p.actions).values({businessId:e.businessId,organizationId:e.organizationId,actionType:"social_post",status:"proposed",content:{text:s+"\n\nPosted by LocalGenius",platform:"instagram",topic:t}})}t.postsGenerated=i.length,t.completedSteps++,await d.db.insert(p.messages).values({conversationId:a.id,businessId:e.businessId,organizationId:e.organizationId,role:"assistant",contentType:"action_card",content:{text:`I created ${i.length} social posts for you — based on what works for ${e.vertical}s in ${e.city}. Take a look and approve the ones you like. I'll post them for you.`,actionType:"social_posts_batch",postCount:i.length,status:"pending_approval"}}),await $(e,"content_generated",{source:"onboarding",count:i.length})}catch(e){t.errors.push(`Posts: ${S(e)}`)}try{let s=function(){let e=new Date,t=(7-e.getDay())%7||7,s=new Date(e.getTime()+864e5*t);return s.setHours(7,0,0,0),s}();await d.db.insert(p.weeklyDigests).values({businessId:e.businessId,organizationId:e.organizationId,periodStart:new Date,periodEnd:s,metrics:{scheduled:!0,firstDigest:!0},actionsCompleted:{},recommendations:{narrative:"Your first Weekly Digest will arrive Sunday morning with a full recap of your first week."}}),t.digestScheduled=!0,t.completedSteps++,await $(e,"digest_scheduled",{source:"onboarding",scheduledFor:s.toISOString()})}catch(e){t.errors.push(`Digest: ${S(e)}`)}try{let s=await (0,v.N)(e.businessId,e.organizationId);t.seoScore=s.score.overall,t.completedSteps++;let i=s.score.overall>=80?"A":s.score.overall>=60?"B":s.score.overall>=40?"C":s.score.overall>=20?"D":"F",r=s.recommendations[0];await d.db.insert(p.messages).values({conversationId:a.id,businessId:e.businessId,organizationId:e.organizationId,role:"assistant",contentType:"report",content:{text:`Your SEO score is ${s.score.overall}/100 (grade: ${i}). ${s.aiInsights}${r?`

Top recommendation: ${r.title} — ${r.description}`:""}`,seoScore:s.score.overall,grade:i}}),await $(e,"seo_audit_completed",{source:"onboarding",score:s.score.overall})}catch(e){t.errors.push(`SEO: ${S(e)}`)}try{await $(e,"onboarding_completed",{source:"pipeline",completedSteps:t.completedSteps,totalSteps:t.totalSteps,durationMs:Date.now()-s}),t.completedSteps++}catch(e){t.errors.push(`Event: ${S(e)}`)}return x.info("Onboarding pipeline complete",{businessId:e.businessId,durationMs:Date.now()-s,completedSteps:t.completedSteps,totalSteps:t.totalSteps,errors:t.errors.length}),t}async function $(e,t,s){await d.db.insert(p.analyticsEvents).values({businessId:e.businessId,organizationId:e.organizationId,eventType:t,source:"onboarding_pipeline",metadata:s,occurredAt:new Date})}function S(e){return e instanceof Error?e.message:String(e)}let k=l.Ry({step:l.Km(["confirm","photos","priority","complete"]),data:l.IM(l._4()).optional()});async function R(e){try{let t=await (0,m.RA)(e);if(t instanceof n.NextResponse)return t;let s=await e.json(),a=k.parse(s),i=(0,u.xD)((0,u.eq)(p.businesses.id,t.businessId),(0,u.eq)(p.businesses.organizationId,t.organizationId));switch(a.step){case"confirm":{let e=a.data;e&&await d.db.update(p.businesses).set({address:e.address,phone:e.phone,updatedAt:new Date}).where(i);break}case"priority":{let e=a.data?.focus;e&&await d.db.update(p.businesses).set({priorityFocus:e,updatedAt:new Date}).where(i);break}case"complete":{await d.db.update(p.businesses).set({onboardingCompletedAt:new Date,updatedAt:new Date}).where(i);let[e]=await d.db.select().from(p.businesses).where(i).limit(1),[s]=await d.db.select().from(p.businessSettings).where((0,u.xD)((0,u.eq)(p.businessSettings.businessId,t.businessId),(0,u.eq)(p.businessSettings.platform,"google_business"),(0,u.eq)(p.businessSettings.connectionStatus,"active"))).limit(1),r=await I({businessId:t.businessId,organizationId:t.organizationId,userId:t.userId,businessName:e?.name||"",vertical:e?.vertical||"restaurant",city:e?.city||"",state:e?.state||"",address:e?.address,phone:e?.phone,photos:a.data?.photos,priorityFocus:e?.priorityFocus,hasGoogleConnection:!!s});return n.NextResponse.json({data:{step:"complete",status:"completed",pipeline:{websiteGenerated:r.websiteGenerated,welcomeMessageSent:r.welcomeMessageSent,postsGenerated:r.postsGenerated,reviewsSynced:r.reviewsSynced,digestScheduled:r.digestScheduled,seoScore:r.seoScore,completedSteps:r.completedSteps,totalSteps:r.totalSteps}},meta:{timestamp:new Date().toISOString()}})}}return n.NextResponse.json({data:{step:a.step,status:"completed"},meta:{timestamp:new Date().toISOString()}})}catch(e){if(e instanceof c.jm)return n.NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Invalid data",details:e.errors}},{status:400});return n.NextResponse.json({error:{code:"INTERNAL_ERROR",message:"Onboarding step failed"}},{status:500})}}async function A(e){try{let t=await (0,m.RA)(e);if(t instanceof n.NextResponse)return t;let[s]=await d.db.select().from(p.businesses).where((0,u.xD)((0,u.eq)(p.businesses.id,t.businessId),(0,u.eq)(p.businesses.organizationId,t.organizationId))).limit(1),[a]=await d.db.select().from(p.conversations).where((0,u.eq)(p.conversations.businessId,t.businessId)).limit(1);return n.NextResponse.json({data:{business:s?{id:s.id,name:s.name,vertical:s.vertical,city:s.city,onboardingCompleted:!!s.onboardingCompletedAt,priorityFocus:s.priorityFocus}:null,conversationId:a?.id||null},meta:{timestamp:new Date().toISOString()}})}catch(t){let e=t instanceof Error?t.message:"Failed to fetch onboarding status";return n.NextResponse.json({error:{code:"INTERNAL_ERROR",message:e}},{status:500})}}let q=new i.AppRouteRouteModule({definition:{kind:r.x.APP_ROUTE,page:"/api/onboarding/route",pathname:"/api/onboarding",filename:"route",bundlePath:"app/api/onboarding/route"},resolvedPagePath:"/Users/sethshoultes/Local Sites/localgenius/src/app/api/onboarding/route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:D,staticGenerationAsyncStorage:z,serverHooks:E}=q,N="/api/onboarding/route";function _(){return(0,o.patchFetch)({serverHooks:E,staticGenerationAsyncStorage:z})}},6403:(e,t,s)=>{s.d(t,{RA:()=>n,WG:()=>c,yh:()=>l});var a=s(7070),i=s(6176),r=s(6091);let o=new TextEncoder().encode(process.env.JWT_SECRET||"dev-secret-change-in-production");async function n(e){let t=e.headers.get("authorization"),s=e.cookies.get("lg_session")?.value,r=t?.startsWith("Bearer ")?t.slice(7):s;if(!r)return a.NextResponse.json({error:{code:"UNAUTHORIZED",message:"Missing authentication"}},{status:401});try{let{payload:e}=await i._(r,o);if(!e.sub||!e.org||!e.biz)return a.NextResponse.json({error:{code:"INVALID_TOKEN",message:"Malformed token payload"}},{status:401});return{userId:e.sub,organizationId:e.org,businessId:e.biz,plan:e.plan||"base"}}catch{return a.NextResponse.json({error:{code:"TOKEN_EXPIRED",message:"Access token expired"}},{status:401})}}async function l(e){return new r.N({sub:e.userId,org:e.organizationId,biz:e.businessId,plan:e.plan}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("15m").sign(o)}async function c(e){return new r.N({sub:e,type:"refresh"}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("30d").sign(o)}},3332:(e,t,s)=>{s.d(t,{N:()=>l});var a=s(5748),i=s(3887),r=s(7745),o=s(4149),n=s(8635);async function l(e,t){let[s]=await a.db.select().from(i.businesses).where((0,r.eq)(i.businesses.id,e)).limit(1);if(!s)throw Error("Business not found");let l=new Date(Date.now()-2592e6),[c]=await a.db.select({total:(0,o.i6)`count(*)`,avgRating:(0,o.i6)`avg(${i.reviews.rating})`,recent:(0,o.i6)`count(*) filter (where ${i.reviews.reviewDate} >= ${l})`,responded:(0,o.i6)`count(*) filter (where ${i.reviews.id} in (select review_id from review_responses))`}).from(i.reviews).where((0,r.eq)(i.reviews.businessId,e)),[d]=await a.db.select({totalPosts:(0,o.i6)`count(*)`,recentPosts:(0,o.i6)`count(*) filter (where ${i.contentItems.createdAt} >= ${l})`}).from(i.contentItems).where((0,r.xD)((0,r.eq)(i.contentItems.businessId,e),(0,r.eq)(i.contentItems.contentType,"social_post"))),[p]=await a.db.select({pageViews:(0,o.i6)`count(*) filter (where ${i.analyticsEvents.eventType} = 'page_view')`,searchImpressions:(0,o.i6)`count(*) filter (where ${i.analyticsEvents.eventType} = 'search_impression')`,directionRequests:(0,o.i6)`count(*) filter (where ${i.analyticsEvents.eventType} = 'direction_request')`,phoneCalls:(0,o.i6)`count(*) filter (where ${i.analyticsEvents.eventType} = 'phone_call')`}).from(i.analyticsEvents).where((0,r.xD)((0,r.eq)(i.analyticsEvents.businessId,e),(0,r.eg)(i.analyticsEvents.occurredAt,l))),[u]=await a.db.select().from(i.businessSettings).where((0,r.xD)((0,r.eq)(i.businessSettings.businessId,e),(0,r.eq)(i.businessSettings.platform,"google_business"))).limit(1),m=[],h=[],g=[],b=0;s.name?(b+=5,g.push({status:"pass",label:"Business name",detail:s.name})):g.push({status:"fail",label:"Business name",detail:"Missing",recommendation:"Add your business name"}),s.address?(b+=5,g.push({status:"pass",label:"Address",detail:s.address})):(g.push({status:"fail",label:"Address",detail:"Missing — critical for local search",recommendation:"Add your business address"}),h.push({priority:"high",category:"Profile",title:"Add business address",description:"Google uses your address to show your business in local search results and Google Maps.",estimatedImpact:"High — required for local pack results",actionable:!0})),s.phone?(b+=5,g.push({status:"pass",label:"Phone number",detail:s.phone})):(g.push({status:"fail",label:"Phone number",detail:"Missing",recommendation:"Add your phone number"}),h.push({priority:"high",category:"Profile",title:"Add phone number",description:"Phone number enables click-to-call from Google search results.",estimatedImpact:"High — direct lead generation",actionable:!0})),u?.connectionStatus==="active"?(b+=5,g.push({status:"pass",label:"Google Business Profile",detail:"Connected and active"})):(g.push({status:"fail",label:"Google Business Profile",detail:"Not connected",recommendation:"Connect your Google Business Profile to manage your listing"}),h.push({priority:"high",category:"Profile",title:"Connect Google Business Profile",description:"Connecting GBP allows LocalGenius to optimize your listing, respond to reviews, and track search performance.",estimatedImpact:"Critical — foundational for local SEO",actionable:!0})),s.vertical&&(b+=5,g.push({status:"pass",label:"Business category",detail:s.vertical})),m.push({name:"Profile Completeness",score:b,maxScore:25,findings:g});let w=[],v=0,f=Number(c?.total||0),y=Number(c?.avgRating||0),x=Number(c?.recent||0),I=Number(c?.responded||0),$=f>0?I/f:0;f>=50?(v+=7,w.push({status:"pass",label:"Review count",detail:`${f} total reviews`})):f>=20?(v+=4,w.push({status:"warn",label:"Review count",detail:`${f} reviews — aim for 50+`,recommendation:"Ask satisfied customers for reviews"})):(v+=1,w.push({status:"fail",label:"Review count",detail:`${f} reviews — below local average`,recommendation:"Actively request reviews from happy customers"}),h.push({priority:"high",category:"Reviews",title:"Increase review volume",description:`You have ${f} reviews. Businesses with 50+ reviews rank significantly higher in local search.`,estimatedImpact:"High — top 3 ranking factor",actionable:!0})),y>=4.5?(v+=7,w.push({status:"pass",label:"Average rating",detail:`${y.toFixed(1)} stars`})):y>=4?(v+=4,w.push({status:"warn",label:"Average rating",detail:`${y.toFixed(1)} stars — good, aim for 4.5+`})):(v+=1,w.push({status:"fail",label:"Average rating",detail:`${y.toFixed(1)} stars — needs improvement`})),x>=4?(v+=5,w.push({status:"pass",label:"Review velocity",detail:`${x} reviews in last 30 days`})):x>=1?(v+=2,w.push({status:"warn",label:"Review velocity",detail:`${x} reviews in last 30 days — aim for 4+`})):(w.push({status:"fail",label:"Review velocity",detail:"No new reviews in 30 days"}),h.push({priority:"medium",category:"Reviews",title:"Boost review velocity",description:"Google values fresh reviews. Aim for at least 4 new reviews per month.",estimatedImpact:"Medium — freshness signal",actionable:!0})),$>=.8?(v+=6,w.push({status:"pass",label:"Response rate",detail:`${(100*$).toFixed(0)}% of reviews responded`})):$>=.5?(v+=3,w.push({status:"warn",label:"Response rate",detail:`${(100*$).toFixed(0)}% responded — aim for 80%+`})):(v+=1,w.push({status:"fail",label:"Response rate",detail:`${(100*$).toFixed(0)}% — respond to all reviews`}),h.push({priority:"medium",category:"Reviews",title:"Respond to all reviews",description:"Google considers review responses a ranking signal. Aim for 80%+ response rate.",estimatedImpact:"Medium — engagement signal",actionable:!0})),m.push({name:"Reviews & Reputation",score:v,maxScore:25,findings:w});let S=[],k=0,R=Number(d?.recentPosts||0);R>=12?(k+=15,S.push({status:"pass",label:"Social posting frequency",detail:`${R} posts in 30 days`})):R>=4?(k+=8,S.push({status:"warn",label:"Social posting frequency",detail:`${R} posts — aim for 12+/month`})):(k+=2,S.push({status:"fail",label:"Social posting frequency",detail:`${R} posts in 30 days`}),h.push({priority:"medium",category:"Content",title:"Post more frequently",description:"Consistent social posting improves local search visibility. Aim for 3 posts per week.",estimatedImpact:"Medium — social signals + brand awareness",actionable:!0})),k+=10,S.push({status:"pass",label:"Website",detail:"Generated by LocalGenius — mobile-optimized"}),m.push({name:"Content & Social Signals",score:k,maxScore:25,findings:S});let A=[],q=0,D=Number(p?.pageViews||0),z=Number(p?.searchImpressions||0),E=Number(p?.phoneCalls||0);D>=200?(q+=8,A.push({status:"pass",label:"Website visits",detail:`${D} in 30 days`})):D>=50?(q+=4,A.push({status:"warn",label:"Website visits",detail:`${D} — growing`})):(q+=1,A.push({status:"fail",label:"Website visits",detail:`${D} in 30 days — needs improvement`})),z>=500?(q+=8,A.push({status:"pass",label:"Search impressions",detail:`${z} in 30 days`})):z>=100?(q+=4,A.push({status:"warn",label:"Search impressions",detail:`${z} — building visibility`})):(q+=1,A.push({status:"fail",label:"Search impressions",detail:`${z} — limited visibility`})),E>=20?(q+=9,A.push({status:"pass",label:"Phone calls from search",detail:`${E} in 30 days`})):E>=5?(q+=5,A.push({status:"warn",label:"Phone calls from search",detail:`${E} — aim for 20+/month`})):(q+=1,A.push({status:"fail",label:"Phone calls from search",detail:`${E} in 30 days`})),m.push({name:"Search Performance",score:q,maxScore:25,findings:A});let N=m.reduce((e,t)=>e+t.score,0),_=await (0,n.R_)({prompt:`You are a local SEO expert analyzing ${s.name} (${s.vertical} in ${s.city}, ${s.state}). Their SEO score is ${N}/100.

Key data: ${f} reviews (${y.toFixed(1)} avg), ${R} social posts in 30 days, ${D} website visits, ${E} calls from search, ${(100*$).toFixed(0)}% review response rate.

Top recommendations: ${h.slice(0,3).map(e=>e.title).join(", ")||"None — they're doing well!"}

Write 2-3 sentences of specific, actionable SEO advice for this business. Mention their city and business type. Be warm and encouraging, not technical. No jargon.`,maxTokens:200,model:"claude-haiku-4-5-20251001"});return{score:{overall:N,categories:m},recommendations:h.sort((e,t)=>{let s={high:0,medium:1,low:2};return s[e.priority]-s[t.priority]}),aiInsights:_}}},6022:(e,t,s)=>{s.d(t,{j:()=>c});var a=s(5748),i=s(3887),r=s(7745),o=s(4149),n=s(1445),l=s(8635);async function c(e,t,s){let c=s.description;c||(c=await (0,l.R_)({prompt:`Write a warm, confident 2-3 sentence description for ${s.name}, a ${s.vertical} in ${s.city}, ${s.state}. Write as if you are the owner speaking about your business. No marketing jargon. Local, authentic, proud.`,maxTokens:200}));let d=await (0,l.R_)({prompt:`Write a 5-8 word tagline for ${s.name}, a ${s.vertical} in ${s.city}. Warm, memorable, local. No clich\xe9s. Examples of the tone: "Tex-Mex from scratch on South Lamar" or "Where neighbors become regulars." Just the tagline, nothing else.`,maxTokens:50}),p=await a.db.select().from(i.reviews).where((0,r.xD)((0,r.eq)(i.reviews.businessId,e),(0,o.i6)`${i.reviews.rating} >= 4`)).orderBy((0,n.C)(i.reviews.rating),(0,n.C)(i.reviews.reviewDate)).limit(3),u=s.photos?.[0]||null,m=s.photos?.slice(1,4)||[],h=s.hours||{"Mon-Thu":"11am - 9pm","Fri-Sat":"11am - 10pm",Sun:"10am - 8pm"},g=`${s.name} — ${d.trim()}. ${s.vertical.charAt(0).toUpperCase()+s.vertical.slice(1)} in ${s.city}, ${s.state}.`,b=function(e){let t=e.reviews.length>0?e.reviews.map(e=>{var t;return`
        <div class="review-card">
          <div class="review-stars">${t=e.rating,"★".repeat(t)+"☆".repeat(5-t)}</div>
          <p class="review-text">"${e.text}"</p>
          <p class="review-author">— ${e.name}</p>
        </div>`}).join(""):"",s=e.galleryPhotos.length>0?`<section class="gallery">
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

  ${s}

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
</html>`}({name:s.name,tagline:d.trim(),description:c.trim(),vertical:s.vertical,city:s.city,state:s.state,address:s.address||"",phone:s.phone||"",heroPhoto:u,galleryPhotos:m,hours:h,reviews:p.map(e=>({name:e.reviewerName||"A happy customer",rating:e.rating,text:e.reviewText||""})),metaDescription:g});return await a.db.update(i.businesses).set({updatedAt:new Date}).where((0,r.xD)((0,r.eq)(i.businesses.id,e),(0,r.eq)(i.businesses.organizationId,t))),{html:b,metadata:{title:`${s.name} — ${d.trim()}`,description:g,generatedAt:new Date().toISOString()}}}}};var t=require("../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),a=t.X(0,[9276,4149,9187,2787,5972,3883,4524,1585,4588,3737,4035],()=>s(3134));module.exports=a})();