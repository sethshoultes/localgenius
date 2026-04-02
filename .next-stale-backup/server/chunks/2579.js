"use strict";exports.id=2579,exports.ids=[2579],exports.modules={2579:(e,t,s)=>{s.d(t,{runAnalyticsRollup:()=>i});async function i(){let{db:e}=await Promise.all([s.e(4149),s.e(9187),s.e(2787),s.e(3737),s.e(5748)]).then(s.bind(s,5748)),{analyticsEvents:t}=await Promise.all([s.e(4149),s.e(9187),s.e(3737)]).then(s.bind(s,3887)),{sql:i,eq:n,and:a,gte:o,lt:r}=await Promise.all([s.e(4149),s.e(8748)]).then(s.bind(s,7091)),d=new Date,u=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()-1)),l=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())),c=await e.select({businessId:t.businessId,organizationId:t.organizationId,eventType:t.eventType,count:i`count(*)`.as("count")}).from(t).where(a(o(t.occurredAt,u),r(t.occurredAt,l))).groupBy(t.businessId,t.organizationId,t.eventType);if(0===c.length)return{success:!0,duration_ms:0,details:{date:u.toISOString().slice(0,10),businessesRolled:0,rowsWritten:0}};let g=new Map;for(let e of c){let t=g.get(e.businessId);t||(t={organizationId:e.organizationId,metrics:{}},g.set(e.businessId,t)),t.metrics[e.eventType]=Number(e.count)}let T=0,b=u.toISOString().slice(0,10);for(let[t,{organizationId:s,metrics:n}]of g)await e.execute(i`
      INSERT INTO business_metrics (id, business_id, organization_id, date, metrics, created_at)
      VALUES (
        gen_random_uuid(),
        ${t},
        ${s},
        ${b}::date,
        ${JSON.stringify(n)}::jsonb,
        now()
      )
      ON CONFLICT (business_id, date)
      DO UPDATE SET metrics = EXCLUDED.metrics
    `),T++;return{success:!0,duration_ms:0,details:{date:b,businessesRolled:g.size,rowsWritten:T,eventRows:c.length}}}}};