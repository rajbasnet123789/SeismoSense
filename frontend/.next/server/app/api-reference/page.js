(()=>{var e={};e.id=847,e.ids=[847],e.modules={7849:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external")},2934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},5403:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external")},4580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},4749:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external")},5869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},172:(e,t,r)=>{"use strict";r.r(t),r.d(t,{GlobalError:()=>o.a,__next_app__:()=>m,originalPathname:()=>p,pages:()=>c,routeModule:()=>x,tree:()=>l}),r(3121),r(5341),r(5866);var s=r(3191),a=r(8716),n=r(7922),o=r.n(n),i=r(5231),d={};for(let e in i)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(d[e]=()=>i[e]);r.d(t,d);let l=["",{children:["api-reference",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(r.bind(r,3121)),"D:\\Project_E\\frontend\\src\\app\\api-reference\\page.js"]}]},{}]},{layout:[()=>Promise.resolve().then(r.bind(r,5341)),"D:\\Project_E\\frontend\\src\\app\\layout.js"],"not-found":[()=>Promise.resolve().then(r.t.bind(r,5866,23)),"next/dist/client/components/not-found-error"]}],c=["D:\\Project_E\\frontend\\src\\app\\api-reference\\page.js"],p="/api-reference/page",m={require:r,loadChunk:()=>Promise.resolve()},x=new s.AppPageRouteModule({definition:{kind:a.x.APP_PAGE,page:"/api-reference/page",pathname:"/api-reference",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:l}})},7950:(e,t,r)=>{Promise.resolve().then(r.bind(r,8302))},8302:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>d});var s=r(326),a=r(7577);let n=[{method:"GET",path:"/health",tag:"System",desc:"API health check with database connectivity test.",params:[],response:`{
  "status": "healthy",
  "database": "connected"
}`,color:"#10B981"},{method:"POST",path:"/signup",tag:"Auth",desc:"Register a new user with Argon2-hashed password.",params:[{name:"name",type:"string",req:!0,desc:"Full name (1-100 chars)"},{name:"email",type:"email",req:!0,desc:"Valid email address"},{name:"password",type:"string",req:!0,desc:"Password (6-100 chars)"},{name:"phone_number",type:"string",req:!1,desc:"Optional phone number (max 20 chars)"}],response:`{
  "id": 1,
  "name": "Analyst",
  "email": "user@example.com",
  "phone_number": null,
  "created_at": "2024-01-15T09:42:31"
}`,color:"#2196F3"},{method:"POST",path:"/login",tag:"Auth",desc:"Authenticate user credentials and return a JWT access token.",params:[{name:"username",type:"string",req:!0,desc:"Registered email address"},{name:"password",type:"string",req:!0,desc:"Account password"}],response:`{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}`,color:"#9C27B0"},{method:"GET",path:"/users/me",tag:"Auth",desc:"Get the authenticated user profile. Requires Bearer token.",params:[],response:`{
  "id": 1,
  "name": "Analyst",
  "email": "user@example.com",
  "phone_number": null,
  "created_at": "2024-01-15T09:42:31"
}`,color:"#2196F3"},{method:"GET",path:"/predictions",tag:"Data",desc:"Retrieve stream predictions from seismic sensor Kafka consumers.",params:[{name:"limit",type:"integer",req:!1,desc:"Max records (default: 100)"},{name:"offset",type:"integer",req:!1,desc:"Pagination offset (default: 0)"}],response:`[
  {
    "id": 1,
    "station": "KATMN.IU",
    "p_wave": 0.874,
    "created_at": "2024-01-15T09:42:31"
  }
]`,color:"#F59E0B"},{method:"GET",path:"/predictions/station/{station}",tag:"Data",desc:"Filter predictions by a specific seismic station code.",params:[{name:"station",type:"string",req:!0,desc:"FDSN station code (e.g. KATMN.IU)"},{name:"limit",type:"integer",req:!1,desc:"Max records (default: 100)"},{name:"offset",type:"integer",req:!1,desc:"Pagination offset (default: 0)"}],response:`[
  {
    "id": 42,
    "station": "KATMN.IU",
    "p_wave": 0.912,
    "created_at": "2024-01-15T09:42:31"
  }
]`,color:"#F59E0B"},{method:"GET",path:"/stations",tag:"Data",desc:"List all seismic stations with aggregated metrics from stream data.",params:[],response:`[
  {
    "code": "KATMN",
    "network": "IU",
    "status": "online",
    "rate": 100,
    "events": 14,
    "last_seen": "09:42:31"
  }
]`,color:"#10B981"},{method:"GET",path:"/alerts",tag:"Data",desc:"Recent high-probability seismic events formatted as alerts.",params:[{name:"limit",type:"integer",req:!1,desc:"Max alerts (default: 20)"}],response:`[
  {
    "id": "ALT-0042",
    "sev": "critical",
    "type": "Seismic Event",
    "station": "KATMN.IU",
    "msg": "M3.6 detected — confidence 91.2% — station KATMN.IU",
    "ts": "09:42:31",
    "ack": false
  }
]`,color:"#EF4444"},{method:"POST",path:"/seed",tag:"Data",desc:"Insert 30 sample predictions (demo/testing when Kafka pipeline is not running).",params:[],response:`[
  { "id": 1, "station": "KATMN.IU", "p_wave": 0.874, "created_at": "..." }
]`,color:"#F59E0B"}],o={GET:{bg:"rgba(16,185,129,.12)",color:"#10B981",border:"rgba(16,185,129,.3)"},POST:{bg:"rgba(33,150,243,.12)",color:"#2196F3",border:"rgba(33,150,243,.3)"},PUT:{bg:"rgba(245,158,11,.12)",color:"#F59E0B",border:"rgba(245,158,11,.3)"},DELETE:{bg:"rgba(239,68,68,.12)",color:"#EF4444",border:"rgba(239,68,68,.3)"}};function i({ep:e}){let[t,r]=(0,a.useState)(!1),n=o[e.method];return(0,s.jsxs)("div",{className:"card",style:{borderLeft:`3px solid ${e.color}`,overflow:"hidden",transition:"box-shadow 0.2s"},children:[(0,s.jsxs)("button",{onClick:()=>r(e=>!e),style:{width:"100%",display:"flex",alignItems:"center",gap:"12px",padding:"14px 16px",background:"transparent",border:"none",cursor:"pointer",textAlign:"left"},children:[s.jsx("div",{style:{padding:"3px 9px",borderRadius:"3px",background:n.bg,color:n.color,border:`1px solid ${n.border}`,fontFamily:"JetBrains Mono, monospace",fontSize:"11px",fontWeight:700,letterSpacing:"0.05em",flexShrink:0,minWidth:"48px",textAlign:"center"},children:e.method}),s.jsx("span",{style:{fontFamily:"JetBrains Mono, monospace",fontSize:"13px",fontWeight:600,color:"#E6EDF3",flex:1},children:e.path}),s.jsx("span",{className:"badge badge-blue",children:e.tag}),s.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"#8B949E",strokeWidth:"2",strokeLinecap:"round",style:{transform:t?"rotate(180deg)":"none",transition:"transform 0.2s",flexShrink:0},children:s.jsx("polyline",{points:"6 9 12 15 18 9"})})]}),t&&(0,s.jsxs)("div",{style:{padding:"0 16px 16px",display:"flex",flexDirection:"column",gap:"14px",borderTop:"1px solid #21262D"},children:[s.jsx("p",{style:{fontSize:"13px",color:"#8B949E",marginTop:"12px",lineHeight:"1.6"},children:e.desc}),e.params.length>0&&(0,s.jsxs)("div",{children:[s.jsx("div",{className:"section-title",style:{marginBottom:"8px"},children:"Parameters"}),(0,s.jsxs)("table",{children:[s.jsx("thead",{children:(0,s.jsxs)("tr",{children:[s.jsx("th",{children:"Name"}),s.jsx("th",{children:"Type"}),s.jsx("th",{children:"Required"}),s.jsx("th",{children:"Description"})]})}),s.jsx("tbody",{children:e.params.map(e=>(0,s.jsxs)("tr",{children:[s.jsx("td",{children:s.jsx("code",{style:{fontFamily:"JetBrains Mono, monospace",fontSize:"12px",color:"#2196F3"},children:e.name})}),s.jsx("td",{children:s.jsx("code",{style:{fontFamily:"JetBrains Mono, monospace",fontSize:"11px",color:"#9C27B0"},children:e.type})}),s.jsx("td",{children:e.req?s.jsx("span",{className:"badge badge-red",style:{fontSize:"9px"},children:"required"}):s.jsx("span",{className:"badge badge-green",style:{fontSize:"9px"},children:"optional"})}),s.jsx("td",{style:{color:"#8B949E",fontSize:"12px"},children:e.desc})]},e.name))})]})]}),(0,s.jsxs)("div",{children:[s.jsx("div",{className:"section-title",style:{marginBottom:"8px"},children:"Example Response \xb7 200 OK"}),s.jsx("pre",{children:e.response})]})]})]})}function d(){return(0,s.jsxs)("div",{className:"page-enter",style:{display:"flex",flexDirection:"column",gap:"18px",maxWidth:"900px"},children:[(0,s.jsxs)("div",{children:[s.jsx("h1",{style:{fontFamily:"JetBrains Mono, monospace",fontSize:"18px",fontWeight:700,color:"#E6EDF3",marginBottom:"4px"},children:"Developer API Reference"}),(0,s.jsxs)("p",{style:{fontSize:"13px",color:"#8B949E"},children:["FastAPI \xb7 REST + SSE \xb7 Base URL: ",s.jsx("code",{style:{color:"#2196F3",fontFamily:"JetBrains Mono, monospace",fontSize:"12px"},children:"http://localhost:8000"})]})]}),(0,s.jsxs)("div",{style:{padding:"12px 16px",background:"rgba(33,150,243,0.06)",border:"1px solid rgba(33,150,243,0.2)",borderRadius:"6px",display:"flex",alignItems:"center",gap:"10px"},children:[(0,s.jsxs)("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"#2196F3",strokeWidth:"2",strokeLinecap:"round",children:[s.jsx("circle",{cx:"12",cy:"12",r:"10"}),s.jsx("line",{x1:"12",y1:"8",x2:"12",y2:"12"}),s.jsx("line",{x1:"12",y1:"16",x2:"12.01",y2:"16"})]}),(0,s.jsxs)("span",{style:{fontSize:"12px",color:"#8B949E"},children:["Authentication via ",s.jsx("code",{style:{fontFamily:"JetBrains Mono, monospace",color:"#2196F3",fontSize:"11px"},children:"Authorization: Bearer <token>"})," header on all endpoints."]})]}),n.map(e=>s.jsx(i,{ep:e},e.path))]})}},3121:(e,t,r)=>{"use strict";r.r(t),r.d(t,{$$typeof:()=>o,__esModule:()=>n,default:()=>i});var s=r(8570);let a=(0,s.createProxy)(String.raw`D:\Project_E\frontend\src\app\api-reference\page.js`),{__esModule:n,$$typeof:o}=a;a.default;let i=(0,s.createProxy)(String.raw`D:\Project_E\frontend\src\app\api-reference\page.js#default`)}};var t=require("../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[24,323],()=>r(172));module.exports=s})();