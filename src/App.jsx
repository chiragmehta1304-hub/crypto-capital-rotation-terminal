import { useState, useEffect, useCallback, useRef } from "react";

// ─────────────────────────────────────────────────────────────
//  LIGHT THEME DESIGN SYSTEM
// ─────────────────────────────────────────────────────────────
const T = {
  /* backgrounds */
  bg:      "#f4f6fb", bg2: "#ebedf5", bg3: "#e0e3ef",
  surface: "#ffffff", surfaceHov: "#f8f9fd",
  /* borders */
  line: "#dde2ef", lineHard: "#c4cbe0",
  /* brand */
  blue: "#2563eb", blueLt: "#eff6ff", blueMid: "#bfdbfe",
  indigo: "#4f46e5", indigoLt: "#eef2ff",
  /* semantic */
  green: "#059669", greenLt: "#d1fae5", greenMd: "#6ee7b7",
  red:   "#dc2626", redLt:   "#fee2e2",
  yellow:"#d97706", yellowLt:"#fef3c7",
  orange:"#ea580c", orangeLt:"#ffedd5",
  purple:"#7c3aed", purpleLt:"#ede9fe",
  teal:  "#0891b2", tealLt:  "#cffafe",
  /* text */
  t1: "#0f172a", t2: "#1e293b", t3: "#475569", t4: "#94a3b8",
  /* elevation */
  s1: "0 1px 3px rgba(15,23,42,.07),0 1px 2px rgba(15,23,42,.04)",
  s2: "0 4px 12px rgba(15,23,42,.08),0 2px 4px rgba(15,23,42,.04)",
  s3: "0 12px 32px rgba(15,23,42,.10),0 4px 8px rgba(15,23,42,.04)",
};

// ─────────────────────────────────────────────────────────────
//  TYPOGRAPHY
// ─────────────────────────────────────────────────────────────
const DM   = { fontFamily:"'DM Sans','Outfit','Segoe UI',sans-serif" };
const MONO = { fontFamily:"'IBM Plex Mono','Fira Code','Courier New',monospace" };

// ─────────────────────────────────────────────────────────────
//  API CONFIG
// ─────────────────────────────────────────────────────────────
const K = {
  CG:       "CG-d69CXuKoGK6pM7urRUVneFvM",
  CP:       "93c18a021aa1af5e1a1bb0c855deedc4a14f702e",
  CMC:      "e5981b06f84e4b638e6c262d35d0faa7",
  GEMINI:   "AIzaSyCsYbhZO8V9q3YQbasbXwJaELBX2_Y9kug",
  MESSARI:  "0+Nf5g+xOogreY91VvW4faXU7GxERupesxpQyoJaF-VR-aWu",
  OPENSEA:  "ab19cd56924743abbe4cf8b57251a4c2",
};

// ─────────────────────────────────────────────────────────────
//  UTILS
// ─────────────────────────────────────────────────────────────
const fmt    = (n, d=2) => n == null ? "—" : Number(n).toFixed(d);
const fmtK   = (n) => { if(!n) return "—"; if(n>=1e12) return `$${(n/1e12).toFixed(2)}T`; if(n>=1e9) return `$${(n/1e9).toFixed(1)}B`; if(n>=1e6) return `$${(n/1e6).toFixed(1)}M`; return `$${n}`; };
const fmtP   = (n) => n == null ? "—" : `${n>=0?"+":""}${fmt(n)}%`;
const clamp  = (v,lo,hi) => Math.max(lo, Math.min(hi, v));
const ago    = (d) => { if(!d) return ""; const s=Math.floor((Date.now()-new Date(d))/1000); if(s<60) return `${s}s ago`; if(s<3600) return `${Math.floor(s/60)}m ago`; if(s<86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`; };

// ─────────────────────────────────────────────────────────────
//  API HELPERS
// ─────────────────────────────────────────────────────────────
async function cg(path) {
  const r = await fetch(`https://api.coingecko.com/api/v3${path}`, { headers: { "x-cg-demo-api-key": K.CG } });
  if (!r.ok) throw new Error("CG " + r.status);
  return r.json();
}
async function bn(path) {
  const r = await fetch(`https://data-api.binance.vision/api/v3${path}`);
  if (!r.ok) throw new Error("BN " + r.status);
  return r.json();
}
async function fng(limit=7) {
  const r = await fetch(`https://api.alternative.me/fng/?limit=${limit}`);
  if (!r.ok) throw new Error("FNG");
  return r.json();
}
async function cp(filter="hot") {
  const r = await fetch(`https://cryptopanic.com/api/v1/posts/?auth_token=${K.CP}&public=true&filter=${filter}&kind=news`);
  if (!r.ok) throw new Error("CP " + r.status);
  return r.json();
}
async function messari(asset) {
  const r = await fetch(`https://data.messari.io/api/v1/assets/${asset}/metrics`, { headers: { "x-messari-api-key": K.MESSARI } });
  if (!r.ok) throw new Error("MS " + r.status);
  return r.json();
}
async function openSeaStats() {
  // OpenSea NFT collections — top volume
  const r = await fetch("https://api.opensea.io/api/v2/collections?limit=8&order_by=seven_day_volume", { headers: { "x-api-key": K.OPENSEA } });
  if (!r.ok) throw new Error("OS " + r.status);
  return r.json();
}

// ─────────────────────────────────────────────────────────────
//  SCORE ENGINE
// ─────────────────────────────────────────────────────────────
function altScore({ btcDom, ethBtcRatio, stableDom, total2Chg, btcChg }) {
  let s = 50;
  if (btcDom != null)     s += clamp((55 - btcDom) * 2.5, -25, 25);
  if (ethBtcRatio != null)s += clamp((ethBtcRatio - 0.05) * 800, -15, 15);
  if (stableDom != null)  s += clamp((8 - stableDom) * 2, -10, 10);
  if (total2Chg != null && btcChg != null) s += clamp((total2Chg - btcChg) * 1.5, -10, 10);
  return clamp(Math.round(s), 0, 100);
}
function phase(s) {
  if (s < 30) return { n:1, label:"BTC Accumulation", desc:"Capital locked in BTC. Alts suppressed, patience required.", clr:T.orange, lt:T.orangeLt };
  if (s < 50) return { n:2, label:"ETH Expansion",    desc:"ETH/BTC confirming. Large caps beginning to outperform.", clr:T.teal,   lt:T.tealLt };
  if (s < 72) return { n:3, label:"Midcap Rotation",  desc:"Capital moving down the cap curve. Mid/small caps leading.", clr:T.purple, lt:T.purpleLt };
  return              { n:4, label:"Lowcap Mania",     desc:"Full altseason. Memes and micro-caps exploding upward.", clr:T.green,  lt:T.greenLt };
}
function halvingNow() {
  const next=new Date("2028-04-01T00:00:00Z"), last=new Date("2024-04-20T00:00:00Z"), diff=next-Date.now();
  return { days:Math.floor(diff/86400000), hours:Math.floor((diff%86400000)/3600000), mins:Math.floor((diff%3600000)/60000), secs:Math.floor((diff%60000)/1000), pct:clamp(((Date.now()-last)/(next-last))*100,0,100) };
}
function sentLabel(v) {
  if(v>=80)return"Extreme Greed"; if(v>=60)return"Greed"; if(v>=40)return"Neutral"; if(v>=20)return"Fear"; return"Extreme Fear";
}
function sentColor(v) {
  return v>=75?T.red:v>=60?T.orange:v>=40?T.yellow:v>=25?T.green:T.teal;
}

// ─────────────────────────────────────────────────────────────
//  ATOMS
// ─────────────────────────────────────────────────────────────
function Pill({ children, color=T.blue, bg=T.blueLt, size="9px", bold=true }) {
  return <span style={{ ...MONO, fontSize:size, fontWeight:bold?"700":"500", color, background:bg, padding:"2px 8px", borderRadius:"20px", letterSpacing:"0.05em", textTransform:"uppercase", border:`1px solid ${color}33`, whiteSpace:"nowrap", lineHeight:1.8 }}>{children}</span>;
}
function Chg({ v, size="11px", bg=true }) {
  if (v == null) return <span style={{ ...MONO, fontSize:size, color:T.t4 }}>—</span>;
  const up = v >= 0;
  const base = { ...MONO, fontSize:size, fontWeight:"700", color:up?T.green:T.red };
  if (bg) Object.assign(base, { background:up?T.greenLt:T.redLt, padding:"2px 7px", borderRadius:"4px" });
  return <span style={base}>{up?"▲":"▼"} {Math.abs(v).toFixed(2)}%</span>;
}
function Dot({ color, pulse, size="7px" }) {
  return <div style={{ width:size, height:size, borderRadius:"50%", background:color, boxShadow:`0 0 5px ${color}88`, animation:pulse?"pulse 1.8s infinite":"none", flexShrink:0 }}/>;
}
function Bar({ v, max=100, color=T.blue, h="6px", bg=T.bg3 }) {
  return <div style={{ height:h, background:bg, borderRadius:"3px", overflow:"hidden" }}><div style={{ height:"100%", width:`${clamp((v/max)*100,0,100)}%`, background:color, borderRadius:"3px", transition:"width 1.2s ease" }}/></div>;
}
function Card({ children, style={}, accent, hover=true }) {
  const [hov,setHov]=useState(false);
  const lbrd = accent ? `3px solid ${accent}` : undefined;
  return <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{ background:hov&&hover?T.surfaceHov:T.surface, border:`1px solid ${hov&&hover?T.lineHard:T.line}`, borderLeft:lbrd, borderRadius:"14px", padding:"20px", boxShadow:hov&&hover?T.s2:T.s1, transition:"all 0.18s ease", ...style }}>{children}</div>;
}
function Sec({ children, right, icon, subtitle }) {
  return <div style={{ marginBottom:"14px" }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
        {icon&&<span style={{ fontSize:"15px" }}>{icon}</span>}
        <span style={{ ...DM, fontSize:"12px", fontWeight:"800", color:T.t2, letterSpacing:"-0.01em", textTransform:"uppercase" }}>{children}</span>
      </div>
      {right}
    </div>
    {subtitle&&<div style={{ ...DM, fontSize:"10px", color:T.t4, marginTop:"3px" }}>{subtitle}</div>}
  </div>;
}
function Kpi({ label, value, sub, color=T.t1, icon, chg }) {
  return <div style={{ padding:"14px", background:T.bg2, borderRadius:"10px" }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"8px" }}>
      <span style={{ ...DM, fontSize:"10px", fontWeight:"700", color:T.t3, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</span>
      {icon&&<span style={{ fontSize:"14px" }}>{icon}</span>}
    </div>
    <div style={{ ...MONO, fontSize:"22px", fontWeight:"900", color, lineHeight:1, marginBottom:"4px" }}>{value}</div>
    {sub&&<div style={{ ...DM, fontSize:"10px", color:T.t3 }}>{sub}</div>}
    {chg!=null&&<div style={{ marginTop:"4px" }}><Chg v={chg} size="10px"/></div>}
  </div>;
}

// ─────────────────────────────────────────────────────────────
//  ALTSEASON GAUGE
// ─────────────────────────────────────────────────────────────
function AltGauge({ score }) {
  const s=clamp(score??50,0,100), r=64, cx=84, cy=78;
  const rad=d=>(d*Math.PI)/180, pt=a=>({ x:cx+r*Math.cos(rad(180+a)), y:cy+r*Math.sin(rad(180+a)) });
  const arc=(s0,e0)=>{ const sp=pt(s0*1.8),ep=pt(e0*1.8); return `M ${sp.x} ${sp.y} A ${r} ${r} 0 ${(e0-s0)>50?1:0} 1 ${ep.x} ${ep.y}`; };
  const gc = s>=60?T.green:s>=40?T.yellow:T.red;
  const lbl = s>=75?"ALT SEASON":s>=60?"ALT FAVORED":s>=40?"NEUTRAL":s>=25?"BTC FAVORED":"BTC SEASON";
  return <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
    <svg width="168" height="92" viewBox="0 0 168 92">
      {[[0,33,T.red],[33,55,T.yellow],[55,100,T.green]].map(([s0,e0,c])=><path key={c} d={arc(s0,e0)} fill="none" stroke={c} strokeWidth="9" strokeLinecap="round" opacity="0.2"/>)}
      <path d={arc(0,s)} fill="none" stroke={gc} strokeWidth="9" strokeLinecap="round"/>
      <line x1={cx} y1={cy} x2={pt(s*1.8).x} y2={pt(s*1.8).y} stroke={T.t2} strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r="5" fill={gc}/>
    </svg>
    <span style={{ ...MONO, fontSize:"40px", fontWeight:"900", color:gc, lineHeight:1 }}>{s}</span>
    <div style={{ marginTop:"6px" }}><Pill color={gc} bg={gc+"18"}>{lbl}</Pill></div>
  </div>;
}

// ─────────────────────────────────────────────────────────────
//  FEAR & GREED HISTORY
// ─────────────────────────────────────────────────────────────
function FngChart({ history }) {
  if (!history?.length) return <div style={{ ...DM, fontSize:"11px", color:T.t4, padding:"16px", textAlign:"center" }}>Loading...</div>;
  const vals = history.map(h=>parseInt(h.value));
  const mn=Math.min(...vals), mx=Math.max(...vals), range=mx-mn||1;
  const W=260,H=52;
  const px=i=>(i/(vals.length-1))*W, py=v=>H-((v-mn)/range)*(H-8)-4;
  const pts=vals.map((v,i)=>`${px(i)},${py(v)}`).join(" ");
  const last=vals[0], prev=vals[vals.length-1];
  const gc=sentColor(last);
  const area=`M${px(0)},${H} `+vals.map((v,i)=>`L${px(i)},${py(v)}`).join(" ")+` L${px(vals.length-1)},${H} Z`;
  return <div>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"10px" }}>
      <div>
        <div style={{ ...MONO, fontSize:"34px", fontWeight:"900", color:gc, lineHeight:1 }}>{last}</div>
        <div style={{ ...DM, fontSize:"11px", color:T.t3, marginTop:"2px" }}>{sentLabel(last)}</div>
      </div>
      <div style={{ textAlign:"right" }}>
        <div style={{ ...DM, fontSize:"9px", color:T.t4, marginBottom:"3px" }}>{vals.length}-day trend</div>
        {vals.map((v,i)=><span key={i} style={{ display:"inline-block", width:"18px", height:"22px", marginLeft:"2px", borderRadius:"3px", background:sentColor(v), opacity:i===0?1:0.5, verticalAlign:"bottom", height:`${(v/100)*22+6}px` }}/>).reverse()}
      </div>
    </div>
    <svg width={W} height={H} style={{ overflow:"visible", display:"block" }}>
      <defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={gc} stopOpacity="0.2"/><stop offset="100%" stopColor={gc} stopOpacity="0"/></linearGradient></defs>
      <path d={area} fill="url(#fg)"/>
      <polyline points={pts} fill="none" stroke={gc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    <div style={{ display:"flex", justifyContent:"space-between", marginTop:"4px" }}>
      <span style={{ ...DM, fontSize:"9px", color:T.t4 }}>{vals.length} days ago</span>
      <span style={{ ...DM, fontSize:"9px", color:T.t4 }}>Today</span>
    </div>
  </div>;
}

// ─────────────────────────────────────────────────────────────
//  PHASE TRACK
// ─────────────────────────────────────────────────────────────
function PhaseTrack({ n }) {
  const ps = [
    { n:1, label:"BTC Accum.", icon:"₿", c:T.orange },
    { n:2, label:"ETH Expand", icon:"Ξ", c:T.teal },
    { n:3, label:"Midcap Rot.", icon:"◈", c:T.purple },
    { n:4, label:"Lowcap Mania", icon:"🔥", c:T.green },
  ];
  return <div style={{ display:"flex", alignItems:"center" }}>
    {ps.map((p,i)=><div key={p.n} style={{ display:"flex", alignItems:"center", flex:i<3?1:0 }}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"5px" }}>
        <div style={{ width:"42px", height:"42px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", background:p.n===n?p.c:p.n<n?T.greenLt:T.bg3, border:`2px solid ${p.n===n?p.c:p.n<n?T.green:T.line}`, fontSize:"16px", color:p.n===n?"#fff":p.n<n?T.green:T.t4, fontWeight:"800", boxShadow:p.n===n?`0 4px 14px ${p.c}55`:"none", transition:"all 0.3s", ...MONO }}>
          {p.n<n?"✓":p.n===n?p.icon:p.n}
        </div>
        <span style={{ ...DM, fontSize:"8px", fontWeight:"700", color:p.n===n?p.c:p.n<n?T.green:T.t4, textAlign:"center", maxWidth:"56px", textTransform:"uppercase", letterSpacing:"0.04em" }}>{p.label}</span>
      </div>
      {i<3&&<div style={{ flex:1, height:"2px", background:p.n<n?T.green:T.bg3, margin:"0 4px", marginBottom:"20px", transition:"background 0.3s" }}/>}
    </div>)}
  </div>;
}

// ─────────────────────────────────────────────────────────────
//  ROTATION SIGNALS
// ─────────────────────────────────────────────────────────────
function Signals({ d }) {
  if (!d) return null;
  const spread = (d.total2Chg||0)-(d.btcChg||0);
  const sigs = [
    { name:"BTC Dominance Declining",    active:d.btcDom<54,          watch:d.btcDom>=54&&d.btcDom<57,    str:d.btcDom<50?"HIGH":d.btcDom<54?"MED":"LOW",    note:`Dom: ${fmt(d.btcDom)}%` },
    { name:"TOTAL2 Outperforming BTC",   active:spread>1,             watch:spread>0,                     str:spread>5?"HIGH":spread>2?"MED":"LOW",           note:`Spread: ${fmtP(spread)}` },
    { name:"Stable Dom Contracting",     active:d.stableDom<7,        watch:d.stableDom>=7&&d.stableDom<8,str:d.stableDom<6?"HIGH":d.stableDom<7?"MED":"LOW",note:`Dom: ${fmt(d.stableDom)}%` },
    { name:"ETH/BTC Ratio Breakout",     active:d.ethBtc>0.058,       watch:d.ethBtc>=0.052&&d.ethBtc<=0.058,str:d.ethBtc>0.065?"HIGH":d.ethBtc>0.058?"MED":"LOW",note:`Ratio: ${fmt(d.ethBtc,4)}` },
    { name:"Risk-On Environment",        active:d.score>60,           watch:d.score>=45&&d.score<=60,     str:d.score>75?"HIGH":d.score>60?"MED":"LOW",       note:`Score: ${d.score}/100` },
    { name:"Fear & Greed Neutral+",      active:d.fngVal>=40,         watch:d.fngVal>=25&&d.fngVal<40,    str:d.fngVal>=60?"HIGH":d.fngVal>=40?"MED":"LOW",   note:`F&G: ${d.fngVal??'—'}` },
  ];
  const ac = sigs.filter(s=>s.active).length;
  const verdict = ac>=5?"STRONG BUY":ac>=4?"BUY":ac>=3?"WATCH":ac>=2?"CAUTIOUS":"WAIT";
  const vc = ac>=4?T.green:ac>=3?T.teal:ac>=2?T.yellow:T.red;
  return <div>
    <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"16px", flexWrap:"wrap" }}>
      <span style={{ ...DM, fontSize:"28px", fontWeight:"900", color:vc }}>{verdict}</span>
      <Pill color={vc} bg={vc+"18"}>{ac}/6 signals firing</Pill>
      <Pill color={T.t3} bg={T.bg3} size="9px">Updated live</Pill>
    </div>
    <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
      {sigs.map((s,i)=>{
        const sc = s.active?T.green:s.watch?T.yellow:T.t4;
        const strc = s.str==="HIGH"?T.green:s.str==="MED"?T.yellow:T.t4;
        return <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:s.active?T.greenLt:s.watch?T.yellowLt:T.bg2, border:`1px solid ${s.active?T.green+"44":s.watch?T.yellow+"44":T.line}`, borderRadius:"10px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <Dot color={sc} pulse={s.active}/>
            <div>
              <div style={{ ...DM, fontSize:"12px", color:T.t1, fontWeight:"600" }}>{s.name}</div>
              <div style={{ ...MONO, fontSize:"9px", color:T.t3 }}>{s.note}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:"6px" }}>
            <Pill color={strc} bg={strc+"14"} size="9px">{s.str}</Pill>
            <Pill color={sc} bg={sc+"14"} size="9px">{s.active?"ACTIVE":s.watch?"WATCH":"QUIET"}</Pill>
          </div>
        </div>;
      })}
    </div>
  </div>;
}

// ─────────────────────────────────────────────────────────────
//  LIVE PRICE TABLE
// ─────────────────────────────────────────────────────────────
function PriceTable({ ws }) {
  const rows = [
    ["BTCUSDT","Bitcoin",T.orange],["ETHUSDT","Ethereum",T.teal],["SOLUSDT","Solana",T.purple],
    ["BNBUSDT","BNB",T.yellow],["XRPUSDT","XRP",T.green],["DOGEUSDT","Dogecoin",T.orange],
    ["ADAUSDT","Cardano",T.blue],["AVAXUSDT","Avalanche",T.red],["DOTUSDT","Polkadot",T.purple],
    ["LINKUSDT","Chainlink",T.teal],["MATICUSDT","Polygon",T.indigo],["LTCUSDT","Litecoin",T.t3],
  ];
  return <div>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 100px 72px 70px 92px", gap:"8px", padding:"0 6px 8px", borderBottom:`1px solid ${T.line}` }}>
      {["Asset","Price","24h %","High","Volume"].map((h,i)=><span key={i} style={{ ...DM, fontSize:"9px", fontWeight:"700", color:T.t3, textTransform:"uppercase", letterSpacing:"0.06em" }}>{h}</span>)}
    </div>
    {rows.map(([sym,name,color])=>{
      const d=ws[sym];
      const p=d?parseFloat(d.price):null;
      const ch=d?parseFloat(d.priceChangePercent):null;
      return <div key={sym} style={{ display:"grid", gridTemplateColumns:"1fr 100px 72px 70px 92px", gap:"8px", padding:"8px 6px", alignItems:"center", borderBottom:`1px solid ${T.bg2}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <div style={{ width:"9px", height:"9px", borderRadius:"50%", background:color, flexShrink:0 }}/>
          <div>
            <div style={{ ...DM, fontSize:"12px", color:T.t1, fontWeight:"700" }}>{sym.replace("USDT","")}</div>
            <div style={{ ...DM, fontSize:"9px", color:T.t4 }}>{name}</div>
          </div>
        </div>
        <div style={{ ...MONO, fontSize:"12px", color:d?color:T.t4, fontWeight:"700" }}>{p?`$${p.toLocaleString("en-US",{minimumFractionDigits:p>10?2:4})}`:"—"}</div>
        <Chg v={ch} size="10px"/>
        <div style={{ ...MONO, fontSize:"10px", color:T.t3 }}>{d?`$${Number(d.high).toLocaleString()}`:"—"}</div>
        <div style={{ ...MONO, fontSize:"9px", color:T.t4 }}>{d?fmtK(parseFloat(d.quoteVolume)):"—"}</div>
      </div>;
    })}
  </div>;
}

// ─────────────────────────────────────────────────────────────
//  SECTOR HEATMAP
// ─────────────────────────────────────────────────────────────
function Heatmap({ sectors }) {
  const max = Math.max(...sectors.map(s=>Math.abs(s.change||0)),1);
  return <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"8px" }}>
    {sectors.map((s,i)=>{
      const pos=(s.change||0)>=0, c=pos?T.green:T.red, intensity=Math.abs(s.change||0)/max;
      return <div key={i} style={{ padding:"14px 12px", borderRadius:"10px", background:pos?`rgba(5,150,105,${intensity*0.16})`:`rgba(220,38,38,${intensity*0.16})`, border:`1px solid ${c}44`, textAlign:"center" }}>
        <div style={{ ...DM, fontSize:"10px", fontWeight:"700", color:T.t2, marginBottom:"6px" }}>{s.name}</div>
        <div style={{ ...MONO, fontSize:"17px", fontWeight:"800", color:c }}>{fmtP(s.change)}</div>
        <div style={{ ...DM, fontSize:"9px", color:T.t4, marginTop:"4px" }}>{fmtK(s.cap)}</div>
        {s.leaders&&<div style={{ marginTop:"6px", display:"flex", gap:"3px", justifyContent:"center", flexWrap:"wrap" }}>
          {s.leaders.map(l=><Pill key={l} color={c} bg={c+"12"} size="8px">{l}</Pill>)}
        </div>}
      </div>;
    })}
  </div>;
}

// ─────────────────────────────────────────────────────────────
//  TOP COINS TABLE
// ─────────────────────────────────────────────────────────────
function CoinsTable({ coins, ws }) {
  return <div>
    <div style={{ display:"grid", gridTemplateColumns:"26px 1fr 100px 70px 70px 95px 70px", gap:"8px", padding:"0 6px 8px", borderBottom:`1px solid ${T.line}` }}>
      {["#","Coin","Price","24h","7d","Mkt Cap","Vol 24h"].map((h,i)=><span key={i} style={{ ...DM, fontSize:"9px", fontWeight:"700", color:T.t3, textTransform:"uppercase", letterSpacing:"0.06em" }}>{h}</span>)}
    </div>
    {coins.slice(0,20).map((c,i)=>{
      const key=c.symbol?.toUpperCase()+"USDT";
      const lp=ws[key]?.price;
      const dp=lp?parseFloat(lp):c.current_price;
      return <div key={c.id} style={{ display:"grid", gridTemplateColumns:"26px 1fr 100px 70px 70px 95px 70px", gap:"8px", padding:"8px 6px", borderRadius:"7px", background:i%2===0?T.bg2+"99":"transparent", alignItems:"center" }}>
        <span style={{ ...DM, fontSize:"9px", color:T.t4, fontWeight:"700" }}>{i+1}</span>
        <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
          {c.image&&<img src={c.image} width="19" height="19" style={{ borderRadius:"50%" }} alt=""/>}
          <div><div style={{ ...DM, fontSize:"11px", color:T.t1, fontWeight:"700" }}>{c.symbol?.toUpperCase()}</div><div style={{ ...DM, fontSize:"8px", color:T.t4 }}>{c.name}</div></div>
        </div>
        <div style={{ ...MONO, fontSize:"11px", color:lp?T.blue:T.t1, fontWeight:"700" }}>${dp<1?dp?.toFixed(4):dp?.toLocaleString()}{lp&&<span style={{ fontSize:"6px", color:T.blue, marginLeft:"2px" }}>●</span>}</div>
        <Chg v={c.price_change_percentage_24h} size="10px"/>
        <Chg v={c.price_change_percentage_7d_in_currency} size="10px"/>
        <div style={{ ...MONO, fontSize:"9px", color:T.t3 }}>{fmtK(c.market_cap)}</div>
        <div style={{ ...MONO, fontSize:"9px", color:T.t4 }}>{fmtK(c.total_volume)}</div>
      </div>;
    })}
  </div>;
}

// ─────────────────────────────────────────────────────────────
//  NEWS FEED
// ─────────────────────────────────────────────────────────────
function NewsFeed({ news, filter, setFilter }) {
  const filters = ["hot","bullish","bearish","important","rising"];
  if (!news) return <div style={{ ...DM, fontSize:"12px", color:T.t4, padding:"20px", textAlign:"center" }}>Loading news...</div>;
  return <div>
    <div style={{ display:"flex", gap:"6px", marginBottom:"14px", flexWrap:"wrap" }}>
      {filters.map(f=><button key={f} onClick={()=>setFilter(f)} style={{ ...DM, fontSize:"10px", fontWeight:filter===f?"700":"500", padding:"5px 12px", background:filter===f?T.blue:T.bg2, border:`1px solid ${filter===f?T.blue:T.line}`, borderRadius:"20px", color:filter===f?"#fff":T.t3, cursor:"pointer", transition:"all 0.15s", textTransform:"capitalize" }}>{f==="hot"?"🔥 Hot":f==="bullish"?"🐂 Bullish":f==="bearish"?"🐻 Bearish":f==="important"?"⚡ Important":"📈 Rising"}</button>)}
    </div>
    <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
      {(news||[]).slice(0,15).map((n,i)=>{
        const bull=(n.votes?.positive||0)>(n.votes?.negative||0);
        const bear=(n.votes?.negative||0)>(n.votes?.positive||0);
        const sc=bull?T.green:bear?T.red:T.t3;
        const sbg=bull?T.greenLt:bear?T.redLt:T.bg2;
        return <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" style={{ display:"block", padding:"11px 14px", background:T.bg2, borderRadius:"10px", border:`1px solid ${T.line}`, textDecoration:"none", transition:"all 0.15s" }}>
          <div style={{ display:"flex", gap:"10px", alignItems:"flex-start" }}>
            <div style={{ flex:1 }}>
              <div style={{ ...DM, fontSize:"12px", fontWeight:"600", color:T.t1, lineHeight:"1.45", marginBottom:"5px" }}>{n.title}</div>
              <div style={{ display:"flex", gap:"6px", alignItems:"center", flexWrap:"wrap" }}>
                <span style={{ ...DM, fontSize:"9px", color:T.t4 }}>{n.source?.title}</span>
                <span style={{ color:T.t4, fontSize:"8px" }}>·</span>
                <span style={{ ...DM, fontSize:"9px", color:T.t4 }}>{ago(n.published_at)}</span>
                {n.currencies?.slice(0,4).map(c=><Pill key={c.code} color={T.blue} bg={T.blueLt} size="8px">{c.code}</Pill>)}
                {n.panic_score!=null&&<Pill color={n.panic_score>60?T.red:T.t3} bg={n.panic_score>60?T.redLt:T.bg3} size="8px">panic {n.panic_score}</Pill>}
              </div>
            </div>
            {(bull||bear)&&<Pill color={sc} bg={sbg} size="8px">{bull?"🐂 BULL":"🐻 BEAR"}</Pill>}
          </div>
        </a>;
      })}
    </div>
  </div>;
}

// ─────────────────────────────────────────────────────────────
//  MESSARI DEEP METRICS
// ─────────────────────────────────────────────────────────────
function MessariPanel({ data }) {
  if (!data) return <div style={{ ...DM, fontSize:"12px", color:T.t4, padding:"16px", textAlign:"center" }}>Loading Messari metrics...</div>;
  const md = data?.data?.market_data;
  const mc = data?.data?.marketcap;
  const bl = data?.data?.blockchain_stats_24_hours;
  const roi= data?.data?.roi_data;
  const an = data?.data?.asset?.profile?.general?.overview?.short_description;
  const rows = [
    ["Price USD",      md?.price_usd?`$${md.price_usd.toLocaleString()}`:null, T.blue],
    ["Volume/MCap",    md?.volume_turnover_last_24_hours?`${fmt(md.volume_turnover_last_24_hours*100)}%`:null, T.teal],
    ["Circulating MCap", mc?.current_marketcap_usd?fmtK(mc.current_marketcap_usd):null, T.purple],
    ["Real MCap",      mc?.realized_marketcap_usd?fmtK(mc.realized_marketcap_usd):null, T.indigo],
    ["ATH",            md?.ohlcv_last_24_hour?.high?`$${md.ohlcv_last_24_hour.high.toLocaleString()}`:null, T.green],
    ["Tx Count 24h",   bl?.transaction_count?.toLocaleString(), T.orange],
    ["Active Addr 24h",bl?.unique_addresses_used?.toLocaleString(), T.teal],
    ["ROI 1yr",        roi?.percent_change_last_1_year?fmtP(roi.percent_change_last_1_year):null, (roi?.percent_change_last_1_year||0)>=0?T.green:T.red],
    ["ROI 3yr",        roi?.percent_change_last_3_years?fmtP(roi.percent_change_last_3_years):null, (roi?.percent_change_last_3_years||0)>=0?T.green:T.red],
  ].filter(r=>r[1]);
  return <div>
    {an&&<div style={{ padding:"12px 14px", background:T.blueLt, borderRadius:"10px", marginBottom:"14px", ...DM, fontSize:"11px", color:T.t2, lineHeight:"1.6", borderLeft:`3px solid ${T.blue}` }}>{an}</div>}
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
      {rows.map(([l,v,c],i)=><div key={i} style={{ padding:"10px 12px", background:T.bg2, borderRadius:"8px" }}>
        <div style={{ ...DM, fontSize:"9px", fontWeight:"700", color:T.t4, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"4px" }}>{l}</div>
        <div style={{ ...MONO, fontSize:"13px", fontWeight:"800", color:c }}>{v}</div>
      </div>)}
    </div>
  </div>;
}

// ─────────────────────────────────────────────────────────────
//  NFT MARKET (OpenSea)
// ─────────────────────────────────────────────────────────────
function NFTPanel({ nfts }) {
  if (!nfts) return <div style={{ ...DM, fontSize:"12px", color:T.t4, padding:"16px", textAlign:"center" }}>Loading NFT data...</div>;
  const cols = nfts?.collections || nfts?.results || [];
  if (!cols.length) return <div style={{ ...DM, fontSize:"12px", color:T.t4, padding:"16px", textAlign:"center" }}>NFT data unavailable (OpenSea CORS restriction on free plans — use via backend proxy)</div>;
  return <div style={{ display:"flex", flexDirection:"column", gap:"7px" }}>
    {cols.slice(0,8).map((c,i)=><div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", background:T.bg2, borderRadius:"9px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
        {c.image_url&&<img src={c.image_url} width="26" height="26" style={{ borderRadius:"6px", objectFit:"cover" }} alt=""/>}
        <div><div style={{ ...DM, fontSize:"11px", fontWeight:"700", color:T.t1 }}>{c.name||c.collection}</div><div style={{ ...DM, fontSize:"9px", color:T.t4 }}>{c.chain||"ethereum"}</div></div>
      </div>
      <div style={{ textAlign:"right" }}>
        <div style={{ ...MONO, fontSize:"11px", fontWeight:"700", color:T.blue }}>{c.stats?.seven_day_volume?`Ξ${Number(c.stats.seven_day_volume).toFixed(0)}`:c.seven_day_volume?`Ξ${c.seven_day_volume}`:"—"}</div>
        <div style={{ ...DM, fontSize:"8px", color:T.t4 }}>7d volume</div>
      </div>
    </div>)}
    <div style={{ ...DM, fontSize:"9px", color:T.t4, textAlign:"center", marginTop:"6px" }}>Data via OpenSea API · ethereum chain</div>
  </div>;
}

// ─────────────────────────────────────────────────────────────
//  AI INSIGHT (Google Gemini)
// ─────────────────────────────────────────────────────────────
function AIPanel({ snap }) {
  const [text,setText]=useState(""), [loading,setLoading]=useState(false), [ts,setTs]=useState(null), [err,setErr]=useState(null);
  const run = async () => {
    if (!snap) return;
    setLoading(true); setErr(null);
    const prompt = `You are a senior crypto market structure analyst. Based on the following live data, write a concise professional analysis (3-4 sentences max) covering: current market phase, what the signals suggest for capital allocation, and one specific actionable insight.

DATA: BTC Dominance=${fmt(snap.btcDom)}%, ETH/BTC=${fmt(snap.ethBtc,4)}, Stable Dom=${fmt(snap.stableDom)}%, Altseason Score=${snap.score}/100, Phase="${snap.phaseLabel}", Fear & Greed=${snap.fngVal} (${snap.fngLabel}), BTC 24h=${fmtP(snap.btcChg)}, Total MCap=${fmtK(snap.totalMcap)}, MCap Change=${fmtP(snap.mcapChg)}.

Rules: Plain text only. No markdown. No bullet points. Max 80 words. Be specific and data-driven.`;
    try {
      const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${K.GEMINI}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.7,maxOutputTokens:150}})});
      const d=await r.json();
      const t=d?.candidates?.[0]?.content?.parts?.[0]?.text||"Analysis unavailable.";
      setText(t); setTs(new Date());
    } catch(e) { setErr("Gemini API error. Check quota or key."); }
    finally { setLoading(false); }
  };
  return <div>
    <div style={{ display:"flex", gap:"8px", alignItems:"center", marginBottom:"14px", flexWrap:"wrap" }}>
      <button onClick={run} disabled={loading||!snap} style={{ ...DM, fontSize:"11px", fontWeight:"700", padding:"8px 18px", background:loading?T.bg3:T.blue, border:"none", borderRadius:"8px", color:loading?T.t3:"#fff", cursor:loading?"wait":"pointer", transition:"all 0.2s" }}>{loading?"🔄 Analyzing market...":"✨ Generate AI Analysis"}</button>
      {ts&&<span style={{ ...DM, fontSize:"9px", color:T.t4 }}>Generated {ago(ts)}</span>}
      <Pill color={T.purple} bg={T.purpleLt}>Gemini 2.0 Flash</Pill>
    </div>
    {err&&<div style={{ padding:"12px 14px", background:T.redLt, borderRadius:"8px", ...DM, fontSize:"11px", color:T.red, marginBottom:"12px" }}>{err}</div>}
    {text?<div style={{ padding:"16px 18px", background:T.blueLt, border:`1px solid ${T.blueMid}`, borderRadius:"12px", borderLeft:`4px solid ${T.blue}` }}>
      <div style={{ ...DM, fontSize:"13px", color:T.t1, lineHeight:"1.75", fontWeight:"500" }}>{text}</div>
    </div>:<div style={{ padding:"20px", background:T.bg2, borderRadius:"12px", textAlign:"center" }}>
      <div style={{ fontSize:"28px", marginBottom:"8px" }}>✨</div>
      <div style={{ ...DM, fontSize:"12px", color:T.t3, fontWeight:"500" }}>Click Generate to get an AI-powered market analysis using live data from all connected APIs.</div>
    </div>}
  </div>;
}

// ─────────────────────────────────────────────────────────────
//  PRICE ALERTS
// ─────────────────────────────────────────────────────────────
function Alerts({ ws }) {
  const [alerts,setAlerts]=useState(()=>{try{return JSON.parse(localStorage.getItem("crt4_alerts")||"[]");}catch{return[];}});
  const [sym,setSym]=useState("BTCUSDT"), [price,setPrice]=useState(""), [dir,setDir]=useState("above");
  const [fired,setFired]=useState([]);
  useEffect(()=>{
    const nf=[];
    alerts.forEach(a=>{const p=ws[a.sym]?.price; if(!p)return; const hit=a.dir==="above"?parseFloat(p)>=a.price:parseFloat(p)<=a.price; if(hit)nf.push(a.id);});
    if(nf.length)setFired(f=>[...new Set([...f,...nf])]);
  },[ws,alerts]);
  const add=()=>{if(!price||isNaN(parseFloat(price)))return; const n={id:Date.now(),sym,price:parseFloat(price),dir}; const u=[...alerts,n]; setAlerts(u); try{localStorage.setItem("crt4_alerts",JSON.stringify(u));}catch{} setPrice("");};
  const del=id=>{const u=alerts.filter(a=>a.id!==id); setAlerts(u); try{localStorage.setItem("crt4_alerts",JSON.stringify(u));}catch{} setFired(f=>f.filter(x=>x!==id));};
  const inp={...MONO,fontSize:"11px",background:T.bg2,border:`1px solid ${T.line}`,color:T.t1,borderRadius:"8px",padding:"8px 11px"};
  const syms=["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","DOGEUSDT","ADAUSDT","AVAXUSDT","DOTUSDT","LINKUSDT"];
  return <div>
    <div style={{ display:"flex", gap:"7px", marginBottom:"14px", flexWrap:"wrap" }}>
      <select value={sym} onChange={e=>setSym(e.target.value)} style={inp}>{syms.map(s=><option key={s} value={s}>{s.replace("USDT","")}</option>)}</select>
      <select value={dir} onChange={e=>setDir(e.target.value)} style={inp}><option value="above">▲ Above</option><option value="below">▼ Below</option></select>
      <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="Target price, e.g. 75000" style={{...inp,flex:1,minWidth:"140px"}}/>
      <button onClick={add} style={{...DM,fontSize:"11px",fontWeight:"700",padding:"8px 18px",background:T.blue,border:"none",borderRadius:"8px",color:"#fff",cursor:"pointer"}}>+ Add Alert</button>
    </div>
    {!alerts.length&&<div style={{...DM,fontSize:"12px",color:T.t4,textAlign:"center",padding:"20px",background:T.bg2,borderRadius:"10px"}}>No alerts yet. Set a price target above and it will trigger in real-time via Binance WebSocket.</div>}
    <div style={{ display:"flex", flexDirection:"column", gap:"7px" }}>
      {alerts.map(a=>{
        const isFired=fired.includes(a.id), cp=ws[a.sym]?.price;
        return <div key={a.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 14px", background:isFired?T.greenLt:T.bg2, border:`1px solid ${isFired?T.green+"66":T.line}`, borderRadius:"10px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <Dot color={isFired?T.green:T.t4} pulse={isFired}/>
            <div>
              <div style={{ ...DM, fontSize:"12px", color:T.t1, fontWeight:"600" }}>{a.sym.replace("USDT","")} {a.dir==="above"?"▲ above":"▼ below"} ${a.price.toLocaleString()}</div>
              <div style={{ ...DM, fontSize:"9px", color:T.t3 }}>Live: {cp?`$${Number(cp).toLocaleString()}`:"connecting..."}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
            {isFired&&<Pill color={T.green} bg={T.greenLt}>🔔 TRIGGERED</Pill>}
            <button onClick={()=>del(a.id)} style={{...DM,fontSize:"9px",padding:"3px 10px",background:"transparent",border:`1px solid ${T.red}55`,borderRadius:"6px",color:T.red,cursor:"pointer"}}>Remove</button>
          </div>
        </div>;
      })}
    </div>
  </div>;
}

// ─────────────────────────────────────────────────────────────
//  HALVING COUNTDOWN
// ─────────────────────────────────────────────────────────────
function HalvingPanel() {
  const [h,setH]=useState(halvingNow());
  useEffect(()=>{const id=setInterval(()=>setH(halvingNow()),1000);return()=>clearInterval(id);},[]);
  return <div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"8px", marginBottom:"14px" }}>
      {[["Days",h.days],["Hours",h.hours],["Mins",h.mins],["Secs",h.secs]].map(([l,v])=><div key={l} style={{ background:T.orangeLt, borderRadius:"10px", padding:"14px 8px", textAlign:"center", border:`1px solid ${T.orange}33` }}>
        <div style={{ ...MONO, fontSize:"28px", fontWeight:"900", color:T.orange, lineHeight:1 }}>{String(v).padStart(2,"0")}</div>
        <div style={{ ...DM, fontSize:"9px", fontWeight:"700", color:T.orange, marginTop:"4px", textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
      </div>)}
    </div>
    <Bar v={h.pct} max={100} color={T.orange} bg={T.orangeLt} h="8px"/>
    <div style={{ display:"flex", justifyContent:"space-between", marginTop:"5px" }}>
      <span style={{ ...DM, fontSize:"9px", color:T.t4 }}>Last halving: April 20, 2024</span>
      <span style={{ ...DM, fontSize:"9px", color:T.orange, fontWeight:"700" }}>{fmt(h.pct,1)}% of cycle elapsed</span>
      <span style={{ ...DM, fontSize:"9px", color:T.t4 }}>Next: ~April 2028</span>
    </div>
  </div>;
}

// ─────────────────────────────────────────────────────────────
//  TICKER
// ─────────────────────────────────────────────────────────────
function Ticker({ ws, coins }) {
  const [pos,setPos]=useState(0);
  const items=(coins||[]).slice(0,14).map(c=>{const k=c.symbol?.toUpperCase()+"USDT",lp=ws[k]?.price,p=lp?parseFloat(lp):c.current_price,ch=c.price_change_percentage_24h;return`${c.symbol?.toUpperCase()}  $${p<1?p?.toFixed(4):p?.toLocaleString()}  ${(ch||0)>=0?"▲":"▼"}${Math.abs(ch||0).toFixed(2)}%`;});
  const str=items.join("      ·      ");
  useEffect(()=>{if(!str)return;const id=setInterval(()=>setPos(p=>p-1),26);return()=>clearInterval(id);},[str]);
  if(!str)return null;
  return <div style={{ overflow:"hidden", background:T.surface, borderTop:`1px solid ${T.line}`, borderBottom:`1px solid ${T.line}`, padding:"7px 0" }}>
    <div style={{ display:"inline-block", whiteSpace:"nowrap", transform:`translateX(${pos%((str.length*7.4)||1)}px)` }}>
      {[str,str].map((s,i)=><span key={i} style={{ ...MONO, fontSize:"10px", color:T.t2, letterSpacing:"0.06em", marginRight:"100px" }}>{s}</span>)}
    </div>
  </div>;
}

// ─────────────────────────────────────────────────────────────
//  DOMINANCE CHART (SVG)
// ─────────────────────────────────────────────────────────────
function DomChart({ btcHistory }) {
  if(!btcHistory?.length) return null;
  const mn=Math.min(...btcHistory), mx=Math.max(...btcHistory), range=mx-mn||1;
  const W=560, H=100;
  const px=i=>(i/(btcHistory.length-1))*W;
  const py=v=>H-8-((v-mn)/range)*(H-20);
  const pts=btcHistory.map((v,i)=>`${px(i)},${py(v)}`).join(" ");
  const area=`M${px(0)},${H} `+btcHistory.map((v,i)=>`L${px(i)},${py(v)}`).join(" ")+` L${px(btcHistory.length-1)},${H} Z`;
  const last=btcHistory[btcHistory.length-1], first=btcHistory[0];
  const pct=((last-first)/first)*100;
  const isUp=pct>=0;
  return <div>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
      <span style={{ ...DM, fontSize:"10px", color:T.t3 }}>BTC Price — 30-day trend</span>
      <Chg v={pct} size="10px"/>
    </div>
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:"visible" }}>
      <defs><linearGradient id="dcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={isUp?T.green:T.red} stopOpacity="0.18"/><stop offset="100%" stopColor={isUp?T.green:T.red} stopOpacity="0"/></linearGradient></defs>
      <path d={area} fill="url(#dcg)"/>
      <polyline points={pts} fill="none" stroke={isUp?T.green:T.red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>;
}

// ─────────────────────────────────────────────────────────────
//  MAIN APP
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [data,  setData  ] = useState(null);
  const [loading,setLoad ] = useState(true);
  const [error, setError ] = useState(null);
  const [upd,   setUpd   ] = useState(null);
  const [clock, setClock ] = useState(new Date());
  const [tab,   setTab   ] = useState("overview");
  const [syncing,setSyncing]=useState(false);
  const [ws,    setWs    ] = useState({});
  const [wsSt,  setWsSt  ] = useState("connecting");
  const [newsFilter,setNF] = useState("hot");
  const wsRef = useRef(null);

  // ── Clock ──────────────────────────────────────────────────
  useEffect(()=>{const id=setInterval(()=>setClock(new Date()),1000);return()=>clearInterval(id);},[]);

  // ── Binance WebSocket (12 pairs) ───────────────────────────
  useEffect(()=>{
    const syms=["btcusdt","ethusdt","solusdt","bnbusdt","xrpusdt","dogeusdt","adausdt","avaxusdt","dotusdt","linkusdt","maticusdt","ltcusdt"];
    const streams=syms.map(s=>`${s}@ticker`).join("/");
    const connect=()=>{
      const w=new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
      wsRef.current=w;
      w.onopen=()=>setWsSt("live");
      w.onclose=()=>{setWsSt("reconnecting");setTimeout(connect,3500);};
      w.onerror=()=>setWsSt("error");
      w.onmessage=e=>{try{const m=JSON.parse(e.data);if(m?.data){const d=m.data;setWs(prev=>({...prev,[d.s]:{price:d.c,priceChangePercent:d.P,quoteVolume:d.q,high:d.h,low:d.l,open:d.o}}));}}catch{}};
    };
    connect();
    return()=>{if(wsRef.current)wsRef.current.close();};
  },[]);

  // ── REST load ─────────────────────────────────────────────
  const load = useCallback(async()=>{
    setSyncing(true);
    try {
      const [gR,cR,fR,tR,nR,mBtcR,mEthR,osR] = await Promise.allSettled([
        cg("/global"),
        cg("/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=25&sparkline=false&price_change_percentage=24h,7d"),
        fng(14),
        cg("/search/trending"),
        cp(newsFilter),
        messari("bitcoin"),
        messari("ethereum"),
        openSeaStats(),
      ]);

      const global = gR.status==="fulfilled" ? gR.value?.data : null;
      const coins  = cR.status==="fulfilled" ? cR.value : [];
      const fngD   = fR.status==="fulfilled" ? fR.value?.data : [];
      const trending = tR.status==="fulfilled" ? tR.value?.coins : [];
      const news   = nR.status==="fulfilled" ? nR.value?.results : [];
      const msBtc  = mBtcR.status==="fulfilled" ? mBtcR.value : null;
      const msEth  = mEthR.status==="fulfilled" ? mEthR.value : null;
      const nfts   = osR.status==="fulfilled" ? osR.value : null;

      const btcDom   = global?.market_cap_percentage?.btc ?? 0;
      const ethDom   = global?.market_cap_percentage?.eth ?? 0;
      const stableDom= (global?.market_cap_percentage?.usdt??0)+(global?.market_cap_percentage?.usdc??0)+(global?.market_cap_percentage?.dai??0);
      const othersDom= Math.max(0,100-btcDom-ethDom-stableDom);
      const btc = coins.find(c=>c.id==="bitcoin");
      const eth = coins.find(c=>c.id==="ethereum");
      const ethBtc= btc?.current_price&&eth?.current_price ? eth.current_price/btc.current_price : 0;
      const btcChg   = btc?.price_change_percentage_24h ?? 0;
      const total2Chg= (global?.market_cap_change_percentage_24h_usd??0)*1.1;
      const score    = altScore({btcDom,ethBtcRatio:ethBtc,stableDom,total2Chg,btcChg});
      const phaseObj = phase(score);
      const fngVal   = fngD?.[0] ? parseInt(fngD[0].value) : null;

      const sectors = [
        {name:"AI / Tech",   ids:["fetch-ai","singularitynet","ocean-protocol"],        leaders:["FET","AGIX"]},
        {name:"MEME",        ids:["dogecoin","shiba-inu","pepe"],                       leaders:["DOGE","SHIB"]},
        {name:"DeFi",        ids:["uniswap","aave","compound-governance-token"],        leaders:["UNI","AAVE"]},
        {name:"L1 Chains",   ids:["solana","avalanche-2","cardano"],                    leaders:["SOL","AVAX"]},
        {name:"RWA",         ids:["chainlink","ondo-finance","mantra-dao"],              leaders:["LINK","ONDO"]},
        {name:"GameFi",      ids:["axie-infinity","the-sandbox","gala"],               leaders:["AXS","SAND"]},
        {name:"Layer 2",     ids:["polygon","arbitrum","optimism"],                     leaders:["MATIC","ARB"]},
        {name:"Infrastructure",ids:["filecoin","the-graph","helium"],                   leaders:["FIL","GRT"]},
        {name:"Payments",    ids:["ripple","stellar","nano"],                           leaders:["XRP","XLM"]},
      ].map(s=>{
        const sc=coins.filter(c=>s.ids.includes(c.id));
        return {...s, change:sc.length?sc.reduce((a,c)=>a+(c.price_change_percentage_24h||0),0)/sc.length:null, cap:sc.reduce((a,c)=>a+(c.market_cap||0),0)};
      });

      // BTC 30d history
      let btcHistory=[];
      try{const k=await bn("/klines?symbol=BTCUSDT&interval=1d&limit=30");btcHistory=k.map(x=>parseFloat(x[4]));}catch{}

      setData({ btcDom,ethDom,stableDom,othersDom,ethBtc,score,...phaseObj,total2Chg,btcChg,
        totalMcap:global?.total_market_cap?.usd,mcapChg:global?.market_cap_change_percentage_24h_usd,
        volume24h:global?.total_volume?.usd,activeCoins:global?.active_cryptocurrencies,
        coins,sectors,trending,news,btcHistory,fngHistory:fngD||[],fngVal,fngLabel:fngD?.[0]?.value_classification??"—",
        btcPrice:btc?.current_price,ethPrice:eth?.current_price,
        msBtc,msEth,nfts,
      });
      setUpd(new Date());
      setError(null);
    } catch(e) {
      setError("Some APIs rate-limited or restricted. Showing available data.");
    } finally { setLoad(false); setSyncing(false); }
  }, [newsFilter]);

  useEffect(()=>{load();const id=setInterval(load,90000);return()=>clearInterval(id);},[load]);
  useEffect(()=>{if(data)load();},[newsFilter]);

  const tabs = [
    {id:"overview",  label:"Overview",        icon:"📊"},
    {id:"live",      label:"Live Prices",      icon:"⚡"},
    {id:"signals",   label:"Signals",          icon:"🎯"},
    {id:"sectors",   label:"Sectors",          icon:"🔥"},
    {id:"coins",     label:"Coins",            icon:"💰"},
    {id:"dominance", label:"Dominance",        icon:"📈"},
    {id:"news",      label:"News",             icon:"📰"},
    {id:"messari",   label:"Deep Metrics",     icon:"🔬"},
    {id:"nft",       label:"NFT Market",       icon:"🖼"},
    {id:"ai",        label:"AI Insight",       icon:"✨"},
    {id:"alerts",    label:"Alerts",           icon:"🔔"},
    {id:"halving",   label:"Halving",          icon:"₿"},
    {id:"trending",  label:"Trending",         icon:"🚀"},
  ];

  const wsc = wsSt==="live"?T.green:wsSt==="reconnecting"?T.yellow:T.red;
  const liveBTC = ws["BTCUSDT"]?.price||data?.btcPrice;
  const liveETH = ws["ETHUSDT"]?.price||data?.ethPrice;

  // ── RENDER ─────────────────────────────────────────────────
  return <div style={{ background:T.bg, minHeight:"100vh", color:T.t1 }}>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900&family=IBM+Plex+Mono:wght@400;600;700&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.25;transform:scale(0.7)}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      ::-webkit-scrollbar{width:4px;height:4px}
      ::-webkit-scrollbar-track{background:${T.bg2}}
      ::-webkit-scrollbar-thumb{background:${T.lineHard};border-radius:3px}
      input,select,button{outline:none;font-family:inherit}
      button:active{transform:scale(0.97)}
    `}</style>

    {/* ── HEADER ── */}
    <div style={{ background:T.surface, borderBottom:`1px solid ${T.line}`, padding:"12px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"10px", boxShadow:T.s1, position:"sticky", top:0, zIndex:100 }}>
      <div style={{ display:"flex", alignItems:"center", gap:"13px" }}>
        <div style={{ width:"38px", height:"38px", borderRadius:"11px", background:`linear-gradient(135deg,${T.blue},${T.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px", color:"#fff", boxShadow:`0 4px 16px ${T.blue}44`, flexShrink:0, fontWeight:"900" }}>◈</div>
        <div>
          <div style={{ ...DM, fontSize:"16px", fontWeight:"900", color:T.t1, letterSpacing:"-0.02em" }}>Capital Rotation Terminal</div>
          <div style={{ ...DM, fontSize:"10px", color:T.t4, marginTop:"1px" }}>Professional Crypto Market Intelligence · Multi-Source Live Data</div>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:"18px", flexWrap:"wrap" }}>
        {data&&<div style={{ display:"flex", gap:"20px" }}>
          {[["BTC",liveBTC,T.orange],["ETH",liveETH,T.teal]].map(([sym,price,c])=><div key={sym} style={{ textAlign:"right" }}>
            <div style={{ ...DM, fontSize:"9px", fontWeight:"700", color:T.t3, textTransform:"uppercase", letterSpacing:"0.06em" }}>{sym}</div>
            <div style={{ ...MONO, fontSize:"15px", color:c, fontWeight:"900", lineHeight:1.2 }}>${Number(price||0).toLocaleString()}</div>
          </div>)}
          <div style={{ textAlign:"right" }}>
            <div style={{ ...DM, fontSize:"9px", fontWeight:"700", color:T.t3, textTransform:"uppercase", letterSpacing:"0.06em" }}>Total MCap</div>
            <div style={{ ...MONO, fontSize:"15px", color:T.t1, fontWeight:"900", lineHeight:1.2 }}>{fmtK(data.totalMcap)}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ ...DM, fontSize:"9px", fontWeight:"700", color:T.t3, textTransform:"uppercase", letterSpacing:"0.06em" }}>Alt Score</div>
            <div style={{ ...MONO, fontSize:"15px", color:data.score>60?T.green:data.score>40?T.yellow:T.red, fontWeight:"900", lineHeight:1.2 }}>{data.score}/100</div>
          </div>
        </div>}
        <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"5px", padding:"4px 10px", background:wsSt==="live"?T.greenLt:T.yellowLt, borderRadius:"20px", border:`1px solid ${wsc}44` }}>
            <Dot color={wsc} pulse={wsSt==="live"} size="6px"/>
            <span style={{ ...DM, fontSize:"9px", fontWeight:"700", color:wsc }}>WS {wsSt.toUpperCase()}</span>
          </div>
          {error&&<Pill color={T.orange} bg={T.orangeLt}>⚠ Partial data</Pill>}
          <span style={{ ...MONO, fontSize:"10px", color:T.t4 }}>{clock.toUTCString().slice(17,25)} UTC</span>
          <button onClick={load} disabled={syncing} style={{ ...DM, fontSize:"10px", fontWeight:"700", padding:"7px 15px", background:syncing?T.bg3:T.blue, border:"none", borderRadius:"8px", color:syncing?T.t3:"#fff", cursor:syncing?"wait":"pointer", transition:"all 0.2s" }}>{syncing?"Syncing…":"⟳ Sync"}</button>
        </div>
      </div>
    </div>

    {/* ── TICKER ── */}
    {data?.coins&&<Ticker ws={ws} coins={data.coins}/>}

    {/* ── TABS ── */}
    <div style={{ background:T.surface, borderBottom:`1px solid ${T.line}`, display:"flex", overflowX:"auto", padding:"0 24px", gap:"0" }}>
      {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{ ...DM, fontSize:"10px", fontWeight:tab===t.id?"800":"500", padding:"11px 13px", background:"transparent", border:"none", borderBottom:`2.5px solid ${tab===t.id?T.blue:"transparent"}`, color:tab===t.id?T.blue:T.t3, cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.15s", display:"flex", alignItems:"center", gap:"5px" }}>
        <span style={{ fontSize:"11px" }}>{t.icon}</span>{t.label}
      </button>)}
      {upd&&<span style={{ ...DM, fontSize:"9px", color:T.t4, marginLeft:"auto", alignSelf:"center", whiteSpace:"nowrap", paddingRight:"6px" }}>Updated {upd.toLocaleTimeString()}</span>}
    </div>

    {/* ── CONTENT ── */}
    {loading ? (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"62vh", gap:"16px" }}>
        <div style={{ width:"38px", height:"38px", border:`3px solid ${T.bg3}`, borderTop:`3px solid ${T.blue}`, borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>
        <span style={{ ...DM, fontSize:"13px", color:T.t3, fontWeight:"500" }}>Connecting to 6+ live data sources…</span>
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", justifyContent:"center" }}>
          {["Binance WS","CoinGecko","Alternative.me","CryptoPanic","Messari","OpenSea"].map(s=><Pill key={s} color={T.t3} bg={T.bg3}>{s}</Pill>)}
        </div>
      </div>
    ) : (
      <div style={{ padding:"20px 24px", animation:"fadeUp 0.3s ease" }}>

        {/* ════ OVERVIEW ════ */}
        {tab==="overview"&&data&&<div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"14px" }}>

          {/* KPIs row */}
          {[
            {l:"BTC Dominance",    v:`${fmt(data.btcDom)}%`,          chg:data.btcChg,  c:T.orange, sub:data.btcDom<50?"⚡ Alt season territory":data.btcDom>57?"⚠ BTC dominance season":"◎ Transition zone", icon:"₿"},
            {l:"ETH / BTC Ratio",  v:fmt(data.ethBtc,4),              chg:null,         c:T.teal,   sub:data.ethBtc>0.058?"⚡ ETH breakout zone active":"◎ Accumulation phase", icon:"Ξ"},
            {l:"Stable Dominance", v:`${fmt(data.stableDom)}%`,       chg:null,         c:T.green,  sub:data.stableDom<7?"⚡ Risk-on — capital deployed":data.stableDom>10?"⚠ Risk-off — hiding in stables":"◎ Neutral zone", icon:"$"},
          ].map((k,i)=><Card key={i} accent={k.c}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px" }}>
              <span style={{ ...DM, fontSize:"10px", fontWeight:"700", color:T.t3, textTransform:"uppercase", letterSpacing:"0.06em" }}>{k.l}</span>
              <div style={{ width:"32px", height:"32px", borderRadius:"9px", background:k.c+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", fontWeight:"900", color:k.c, ...MONO }}>{k.icon}</div>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"8px" }}>
              <span style={{ ...MONO, fontSize:"32px", fontWeight:"900", color:k.c, lineHeight:1 }}>{k.v}</span>
              {k.chg!=null&&<Chg v={k.chg}/>}
            </div>
            <div style={{ ...DM, fontSize:"10px", color:T.t3 }}>{k.sub}</div>
          </Card>)}

          {/* Altseason gauge */}
          <Card accent={data.score>60?T.green:data.score>40?T.yellow:T.red}>
            <Sec icon="🎯" right={<Pill color={data.score>=60?T.green:data.score>=40?T.yellow:T.red} bg={(data.score>=60?T.green:data.score>=40?T.yellow:T.red)+"18"}>{data.label}</Pill>}>Altseason Score</Sec>
            <AltGauge score={data.score}/>
            <div style={{ marginTop:"10px", padding:"9px 12px", background:T.bg2, borderRadius:"8px" }}>
              <span style={{ ...DM, fontSize:"10px", color:T.t2 }}>{data.desc}</span>
            </div>
          </Card>

          {/* Fear & Greed */}
          <Card>
            <Sec icon="😰" right={<Pill color={sentColor(data.fngVal)} bg={sentColor(data.fngVal)+"18"}>{data.fngLabel}</Pill>}>Fear & Greed (14-day)</Sec>
            <FngChart history={data.fngHistory}/>
          </Card>

          {/* Phase tracker */}
          <Card>
            <Sec icon="🔄" right={<Pill color={T.blue} bg={T.blueLt}>Phase {data.n} / 4</Pill>}>Market Cycle Phase</Sec>
            <PhaseTrack n={data.n}/>
            <div style={{ marginTop:"12px", padding:"10px 13px", background:data.lt, borderRadius:"9px", border:`1px solid ${data.clr}33` }}>
              <span style={{ ...DM, fontSize:"11px", color:data.clr, fontWeight:"600" }}>{data.desc}</span>
            </div>
          </Card>

          {/* Market stats */}
          <Card style={{ gridColumn:"span 2" }}>
            <Sec icon="📊">Global Market Statistics</Sec>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"8px", marginBottom:"14px" }}>
              <Kpi label="Total Market Cap"   value={fmtK(data.totalMcap)}  color={T.blue}   icon="🌐" chg={data.mcapChg}/>
              <Kpi label="24h Volume"         value={fmtK(data.volume24h)}  color={T.teal}   icon="📊"/>
              <Kpi label="Active Coins"       value={(data.activeCoins||0).toLocaleString()} color={T.purple} icon="🪙"/>
              <Kpi label="Others Dominance"   value={`${fmt(data.othersDom)}%`} color={T.indigo} icon="◈"/>
            </div>
            <DomChart btcHistory={data.btcHistory}/>
          </Card>

          {/* Movers */}
          <Card style={{ gridColumn:"1/-1" }}>
            <Sec icon="🚀" subtitle="Sorted by absolute magnitude of 24h move">Biggest Movers Today</Sec>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"8px" }}>
              {[...(data.coins||[])].sort((a,b)=>Math.abs(b.price_change_percentage_24h||0)-Math.abs(a.price_change_percentage_24h||0)).slice(0,10).map(c=>{
                const up=(c.price_change_percentage_24h||0)>=0;
                return <div key={c.id} style={{ padding:"12px 10px", borderRadius:"10px", background:up?T.greenLt:T.redLt, border:`1px solid ${up?T.green+"44":T.red+"44"}`, textAlign:"center" }}>
                  {c.image&&<img src={c.image} width="22" height="22" style={{ borderRadius:"50%", display:"block", margin:"0 auto 6px" }} alt=""/>}
                  <div style={{ ...DM, fontSize:"10px", fontWeight:"800", color:T.t1 }}>{c.symbol?.toUpperCase()}</div>
                  <div style={{ marginTop:"4px" }}><Chg v={c.price_change_percentage_24h} size="10px"/></div>
                </div>;
              })}
            </div>
          </Card>

          {/* Capital distribution */}
          <Card style={{ gridColumn:"1/-1" }}>
            <Sec icon="🥧" subtitle="% of total market capitalization">Capital Distribution</Sec>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"10px" }}>
              {[["Bitcoin",data.btcDom,T.orange,T.orangeLt,65,data.btcDom<50?"BULLISH ALTS":data.btcDom>57?"BTC SEASON":"NEUTRAL"],["Ethereum",data.ethDom,T.teal,T.tealLt,25,data.ethBtc>0.058?"ETH BREAKOUT":"ACCUMULATING"],["Stablecoins",data.stableDom,T.green,T.greenLt,15,data.stableDom<7?"RISK-ON":data.stableDom>10?"RISK-OFF":"NEUTRAL"],["Others / Alts",data.othersDom,T.purple,T.purpleLt,40,data.othersDom>22?"ALT EXPANSION":"ACCUMULATING"]].map(([lbl,val,c,bg,max,sig])=><div key={lbl} style={{ padding:"14px", background:bg, borderRadius:"12px", border:`1px solid ${c}33` }}>
                <div style={{ ...DM, fontSize:"10px", fontWeight:"700", color:c, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.04em" }}>{lbl}</div>
                <div style={{ ...MONO, fontSize:"28px", fontWeight:"900", color:c, lineHeight:1, marginBottom:"8px" }}>{fmt(val)}%</div>
                <Pill color={c} bg={c+"18"} size="8px">{sig}</Pill>
                <div style={{ marginTop:"10px" }}><Bar v={val||0} max={max} color={c} bg={c+"22"}/></div>
              </div>)}
            </div>
          </Card>
        </div>}

        {/* ════ LIVE PRICES ════ */}
        {tab==="live"&&<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
          <Card style={{ gridColumn:"1/-1" }}>
            <Sec icon="⚡" right={<div style={{ display:"flex", gap:"6px", alignItems:"center" }}><Dot color={wsc} pulse={wsSt==="live"}/><Pill color={wsc} bg={wsc+"18"}>Binance WebSocket · {wsSt.toUpperCase()}</Pill></div>}>Real-Time Price Stream — 12 Pairs</Sec>
            <PriceTable ws={ws}/>
          </Card>
          {["BTCUSDT","ETHUSDT"].map(sym=>{
            const d=ws[sym], n=sym.replace("USDT",""), c=sym==="BTCUSDT"?T.orange:T.teal;
            return <Card key={sym}>
              <Sec icon={sym==="BTCUSDT"?"₿":"Ξ"}>{n} Live Stats</Sec>
              {d?<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
                {[["Price",`$${Number(d.price).toLocaleString()}`,c],["24h Chg",`${parseFloat(d.priceChangePercent||0).toFixed(2)}%`,parseFloat(d.priceChangePercent||0)>=0?T.green:T.red],["24h High",`$${Number(d.high||0).toLocaleString()}`,T.green],["24h Low",`$${Number(d.low||0).toLocaleString()}`,T.red],["Volume",fmtK(parseFloat(d.quoteVolume||0)),T.purple],["Open",`$${Number(d.open||0).toLocaleString()}`,T.t2]].map(([l,v,c])=><Kpi key={l} label={l} value={v} color={c}/>)}
              </div>:<div style={{ ...DM, fontSize:"12px", color:T.t4, padding:"16px", textAlign:"center" }}>Connecting…</div>}
            </Card>;
          })}
        </div>}

        {/* ════ SIGNALS ════ */}
        {tab==="signals"&&data&&<div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:"14px" }}>
          <Card>
            <Sec icon="🎯" right={<Pill color={T.green} bg={T.greenLt}>Live Engine</Pill>}>Rotation Signal Radar</Sec>
            <Signals d={data}/>
          </Card>
          <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
            <Card>
              <Sec icon="📖">Signal Playbook</Sec>
              <div style={{ display:"flex", flexDirection:"column", gap:"7px" }}>
                {[["BTC.D < 50% + TOTAL2 ↑","Strong alt rotation. Go long midcaps.",T.green],["STABLE.D < 6%","Dry powder deployed. Risk-on.",T.green],["ETH/BTC > 0.065","ETH phase. ETH-ecosystem plays.",T.teal],["BTC.D > 58%","BTC season. Minimize alt exposure.",T.red],["STABLE.D > 10%","Risk-off. Capital in stables.",T.red],["Score 60–75","Midcap rotation phase.",T.yellow],["F&G > 75","Extreme greed — reduce risk.",T.red],["F&G < 25","Extreme fear — accumulate.",T.green]].map(([rule,out,c],i)=><div key={i} style={{ padding:"8px 12px", background:T.bg2, borderRadius:"8px", borderLeft:`3px solid ${c}` }}>
                  <div style={{ ...MONO, fontSize:"9px", color:T.t3, marginBottom:"3px" }}>{rule}</div>
                  <div style={{ ...DM, fontSize:"11px", color:c, fontWeight:"600" }}>{out}</div>
                </div>)}
              </div>
            </Card>
            <Card>
              <Sec icon="📐">Live Index Readings</Sec>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"7px" }}>
                {[{l:"Alt Score",v:`${data.score}/100`,c:data.score>60?T.green:data.score>40?T.yellow:T.red},{l:"BTC Dom",v:`${fmt(data.btcDom)}%`,c:T.orange},{l:"ETH/BTC",v:fmt(data.ethBtc,4),c:T.teal},{l:"Stable Dom",v:`${fmt(data.stableDom)}%`,c:T.green},{l:"Others Dom",v:`${fmt(data.othersDom)}%`,c:T.purple},{l:"F&G Today",v:`${data.fngVal??"—"} · ${data.fngLabel}`,c:sentColor(data.fngVal)}].map((x,i)=><Kpi key={i} label={x.l} value={x.v} color={x.c}/>)}
              </div>
            </Card>
          </div>
        </div>}

        {/* ════ SECTORS ════ */}
        {tab==="sectors"&&data&&<div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:"14px" }}>
          <Card>
            <Sec icon="🔥" subtitle="24h average performance by narrative">Narrative Sector Heatmap — 9 Sectors</Sec>
            <Heatmap sectors={data.sectors}/>
          </Card>
          <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
            <Card>
              <Sec icon="🏆">Sector Rankings</Sec>
              <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
                {[...data.sectors].sort((a,b)=>(b.change||0)-(a.change||0)).map((s,i)=><div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 11px", background:T.bg2, borderRadius:"8px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"9px" }}>
                    <span style={{ ...DM, fontSize:"10px", fontWeight:"800", color:T.t4, minWidth:"20px" }}>#{i+1}</span>
                    <span style={{ ...DM, fontSize:"11px", color:T.t1, fontWeight:"600" }}>{s.name}</span>
                  </div>
                  <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                    <span style={{ ...MONO, fontSize:"9px", color:T.t4 }}>{fmtK(s.cap)}</span>
                    <Chg v={s.change}/>
                  </div>
                </div>)}
              </div>
            </Card>
            <Card>
              <Sec icon="💡">Rotation Insight</Sec>
              {(()=>{const s=[...data.sectors].sort((a,b)=>(b.change||0)-(a.change||0)),top=s[0],bot=s[s.length-1];
                return [{icon:"🔥",t:`Capital INTO ${top?.name} (${fmtP(top?.change)})`,c:T.green,bg:T.greenLt},{icon:"❄️",t:`Capital OUT of ${bot?.name} (${fmtP(bot?.change)})`,c:T.red,bg:T.redLt},{icon:"⚡",t:`Rotation: ${bot?.name} → ${top?.name}`,c:T.blue,bg:T.blueLt},{icon:"📊",t:`${data.sectors.filter(s=>(s.change||0)>0).length}/${data.sectors.length} sectors positive today`,c:T.purple,bg:T.purpleLt}].map((x,i)=><div key={i} style={{ padding:"9px 12px", background:x.bg, borderRadius:"8px", display:"flex", gap:"9px", marginBottom:"7px", border:`1px solid ${x.c}22` }}>
                  <span style={{ fontSize:"14px" }}>{x.icon}</span><span style={{ ...DM, fontSize:"11px", color:x.c, fontWeight:"600" }}>{x.t}</span>
                </div>);
              })()}
            </Card>
          </div>
        </div>}

        {/* ════ COINS ════ */}
        {tab==="coins"&&data&&<Card>
          <Sec icon="💰" right={<div style={{ display:"flex", gap:"6px" }}><Pill color={T.green} bg={T.greenLt}>CoinGecko</Pill><Pill color={T.blue} bg={T.blueLt}>Binance WS Live ●</Pill></div>}>Top 20 Coins — Live Prices</Sec>
          <CoinsTable coins={data.coins} ws={ws}/>
        </Card>}

        {/* ════ DOMINANCE ════ */}
        {tab==="dominance"&&data&&<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
          <Card style={{ gridColumn:"1/-1" }}>
            <Sec icon="📈" subtitle="% of total market cap by category">Capital Distribution Map</Sec>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"10px", marginBottom:"16px" }}>
              {[["Bitcoin",data.btcDom,T.orange,T.orangeLt,data.btcDom<50?"BULLISH ALTS":data.btcDom>57?"BTC SEASON":"NEUTRAL"],["Ethereum",data.ethDom,T.teal,T.tealLt,data.ethBtc>0.058?"ETH BREAKOUT":"ACCUMULATING"],["Stables",data.stableDom,T.green,T.greenLt,data.stableDom<7?"RISK-ON":data.stableDom>10?"RISK-OFF":"NEUTRAL"],["Others",data.othersDom,T.purple,T.purpleLt,data.othersDom>22?"ALT EXPANSION":"ACCUMULATING"]].map(([lbl,val,c,bg,sig])=><div key={lbl} style={{ padding:"16px", background:bg, borderRadius:"12px", border:`1px solid ${c}33` }}>
                <div style={{ ...DM, fontSize:"9px", fontWeight:"700", color:c, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.05em" }}>{lbl}</div>
                <div style={{ ...MONO, fontSize:"32px", fontWeight:"900", color:c, lineHeight:1, marginBottom:"10px" }}>{fmt(val)}%</div>
                <Pill color={c} bg={c+"18"} size="8px">{sig}</Pill>
                <div style={{ marginTop:"12px" }}><Bar v={val||0} max={65} color={c} bg={c+"22"}/></div>
              </div>)}
            </div>
            <DomChart btcHistory={data.btcHistory}/>
          </Card>
          <Card>
            <Sec icon="📖">Dominance Interpretation Matrix</Sec>
            <div style={{ display:"flex", flexDirection:"column", gap:"7px" }}>
              {[["BTC.D > 58%","BTC Season active — minimize alt exposure.",T.red],["BTC.D 54–58%","Transition zone — wait for confirmation.",T.yellow],["BTC.D 48–54%","Alt rotation begins — ETH and L1s first.",T.teal],["BTC.D < 48%","Full alt season — memes and microcaps surge.",T.green],["STABLE > 10%","Risk-off environment — potential market bottom near.",T.red],["STABLE < 6%","All-in risk-on — watch for overheating signals.",T.yellow],["ETH.D ↑ + BTC.D ↓","ETH breakout confirmed — L1 and L2 follow.",T.teal],["OTHERS > 25%","Broadest altcoin participation — late cycle signal.",T.purple]].map(([cond,sig,c],i)=><div key={i} style={{ display:"grid", gridTemplateColumns:"130px 1fr", gap:"10px", padding:"9px 11px", background:T.bg2, borderRadius:"8px" }}>
                <div style={{ ...MONO, fontSize:"9px", color:T.t3, borderRight:`1px solid ${T.line}`, paddingRight:"10px" }}>{cond}</div>
                <div style={{ ...DM, fontSize:"10px", color:c, fontWeight:"600" }}>{sig}</div>
              </div>)}
            </div>
          </Card>
          <Card>
            <Sec icon="🔍">Live Assessment</Sec>
            <div style={{ padding:"14px 16px", background:data.score>60?T.greenLt:data.score>40?T.yellowLt:T.redLt, borderRadius:"10px", marginBottom:"14px", border:`1px solid ${data.clr}44` }}>
              <div style={{ ...DM, fontSize:"12px", color:data.clr, lineHeight:"1.7", fontWeight:"600" }}>
                {data.score>70?`Full altseason conditions active. BTC.D at ${fmt(data.btcDom)}%, Stable.D at ${fmt(data.stableDom)}%. Capital is aggressively rotating into alts.`:data.score>50?`Early rotation detected. BTC.D ${fmt(data.btcDom)}%, ETH/BTC at ${fmt(data.ethBtc,4)}. Watch for mid-cap breakouts.`:`BTC-dominant market. Score ${data.score}/100. Favor BTC positioning until signals flip.`}
              </div>
            </div>
            <AltGauge score={data.score}/>
          </Card>
        </div>}

        {/* ════ NEWS ════ */}
        {tab==="news"&&<Card>
          <Sec icon="📰" right={<Pill color={T.blue} bg={T.blueLt}>CryptoPanic API</Pill>}>Live Crypto News Feed</Sec>
          <NewsFeed news={data?.news} filter={newsFilter} setFilter={v=>{setNF(v);}}/>
        </Card>}

        {/* ════ DEEP METRICS ════ */}
        {tab==="messari"&&data&&<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
          <Card>
            <Sec icon="₿" right={<Pill color={T.orange} bg={T.orangeLt}>Messari API</Pill>}>Bitcoin — On-Chain Metrics</Sec>
            <MessariPanel data={data.msBtc}/>
          </Card>
          <Card>
            <Sec icon="Ξ" right={<Pill color={T.teal} bg={T.tealLt}>Messari API</Pill>}>Ethereum — On-Chain Metrics</Sec>
            <MessariPanel data={data.msEth}/>
          </Card>
          <Card style={{ gridColumn:"1/-1" }}>
            <Sec icon="📐" subtitle="Data powered by Messari · institutional-grade">Metric Explanations</Sec>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"10px" }}>
              {[["Volume/MCap","Ratio of daily trading volume to market cap. High = active market. Low = accumulation.","📊"],["Realized MCap","Market cap using last-moved price per coin. Better baseline for market value vs speculation.","💎"],["Active Addresses","Unique addresses active in last 24h. Higher = more network utilization.","🔗"],["Transaction Count","Number of on-chain transactions. Proxy for network demand and usage growth.","⛓"],["ROI 1yr","Return on investment over 12 months vs USD. Annualized performance metric.","📈"],["ATH Distance","How far current price is from all-time high. Context for cycle position.","🏔"]].map(([t,d,icon],i)=><div key={i} style={{ padding:"12px 13px", background:T.bg2, borderRadius:"9px" }}>
                <div style={{ display:"flex", gap:"7px", alignItems:"center", marginBottom:"5px" }}>
                  <span style={{ fontSize:"14px" }}>{icon}</span>
                  <span style={{ ...DM, fontSize:"10px", fontWeight:"700", color:T.t2 }}>{t}</span>
                </div>
                <span style={{ ...DM, fontSize:"10px", color:T.t3, lineHeight:"1.5" }}>{d}</span>
              </div>)}
            </div>
          </Card>
        </div>}

        {/* ════ NFT ════ */}
        {tab==="nft"&&<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
          <Card>
            <Sec icon="🖼" right={<Pill color={T.blue} bg={T.blueLt}>OpenSea API</Pill>}>Top NFT Collections (7-day volume)</Sec>
            <NFTPanel nfts={data?.nfts}/>
          </Card>
          <Card>
            <Sec icon="📊">NFT Market Context</Sec>
            <div style={{ display:"flex", flexDirection:"column", gap:"9px" }}>
              {[["📈","NFT & Alt Season Correlation","NFT markets typically heat up during crypto bull cycles, particularly when ETH is performing well vs BTC."],["🔗","ETH Relationship","High ETH/BTC ratio often precedes NFT market activity as more ETH capital seeks yield."],["📉","Wash Trading Warning","OpenSea volume includes wash trading. Use as directional indicator only."],["🏆","Blue Chips vs Speculative","BAYC/CryptoPunks are considered blue-chip. New collections are highly speculative."],["⚡","Gas Fees Matter","High ETH gas fees reduce NFT activity. Monitor ETH network congestion alongside NFT volumes."]].map(([icon,t,d],i)=><div key={i} style={{ padding:"10px 12px", background:T.bg2, borderRadius:"9px", display:"flex", gap:"9px" }}>
                <span style={{ fontSize:"15px" }}>{icon}</span>
                <div><div style={{ ...DM, fontSize:"10px", fontWeight:"700", color:T.t2, marginBottom:"3px" }}>{t}</div><div style={{ ...DM, fontSize:"10px", color:T.t3, lineHeight:"1.5" }}>{d}</div></div>
              </div>)}
            </div>
          </Card>
        </div>}

        {/* ════ AI INSIGHT ════ */}
        {tab==="ai"&&<div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:"14px" }}>
          <Card>
            <Sec icon="✨" right={<Pill color={T.purple} bg={T.purpleLt}>Google Gemini 2.0 Flash</Pill>}>AI Market Analysis</Sec>
            <AIPanel snap={data}/>
          </Card>
          <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
            <Card>
              <Sec icon="📋">Current Snapshot for AI</Sec>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"7px" }}>
                {data&&[{l:"Alt Score",v:`${data.score}/100`,c:data.score>60?T.green:T.yellow},{l:"BTC Dom",v:`${fmt(data.btcDom)}%`,c:T.orange},{l:"ETH/BTC",v:fmt(data.ethBtc,4),c:T.teal},{l:"Stable Dom",v:`${fmt(data.stableDom)}%`,c:T.green},{l:"Phase",v:data.label,c:data.clr},{l:"F&G",v:`${data.fngVal??"—"}`,c:sentColor(data.fngVal)},{l:"MCap Change",v:fmtP(data.mcapChg),c:(data.mcapChg||0)>=0?T.green:T.red},{l:"BTC 24h",v:fmtP(data.btcChg),c:data.btcChg>=0?T.green:T.red}].map((x,i)=><Kpi key={i} label={x.l} value={x.v} color={x.c}/>)}
              </div>
            </Card>
            <Card>
              <Sec icon="ℹ️">How AI Analysis Works</Sec>
              {[["✨","Gemini 2.0 Flash","Google's latest model for fast, accurate financial analysis."],["📊","Data-Driven","Uses only live market data from all connected APIs."],["⚡","On-Demand","Click Generate to analyze current conditions instantly."],["🔄","Always Fresh","Each analysis uses a fresh snapshot of live data."]].map(([icon,t,d],i)=><div key={i} style={{ display:"flex", gap:"9px", padding:"10px 12px", background:T.bg2, borderRadius:"9px", marginBottom:"7px" }}>
                <span style={{ fontSize:"15px" }}>{icon}</span>
                <div><div style={{ ...DM, fontSize:"10px", fontWeight:"700", color:T.t2, marginBottom:"3px" }}>{t}</div><div style={{ ...DM, fontSize:"9px", color:T.t3 }}>{d}</div></div>
              </div>)}
            </Card>
          </div>
        </div>}

        {/* ════ ALERTS ════ */}
        {tab==="alerts"&&<div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:"14px" }}>
          <Card>
            <Sec icon="🔔" right={<Pill color={T.blue} bg={T.blueLt}>Binance WebSocket · Real-time</Pill>}>Price Alert System</Sec>
            <Alerts ws={ws}/>
          </Card>
          <Card>
            <Sec icon="ℹ️">Alert System Details</Sec>
            {[["⚡","Real-time Triggers","Prices are checked every WebSocket tick — immediate detection when target is hit."],["💾","Browser Persistent","Alerts are saved in localStorage — they survive page reloads and browser restarts."],["🎯","Binance Precision","Uses Binance spot prices, accurate to 8 decimal places."],["🔔","Visual Alerts","Triggered alerts glow green with TRIGGERED badge. No audio (browser restriction)."],["📋","12 Pairs Available","BTC, ETH, SOL, BNB, XRP, DOGE, ADA, AVAX, DOT, LINK — all streaming live."]].map(([icon,t,d],i)=><div key={i} style={{ display:"flex", gap:"9px", padding:"10px 12px", background:T.bg2, borderRadius:"9px", marginBottom:"7px" }}>
              <span style={{ fontSize:"15px" }}>{icon}</span>
              <div><div style={{ ...DM, fontSize:"10px", fontWeight:"700", color:T.t2, marginBottom:"3px" }}>{t}</div><div style={{ ...DM, fontSize:"9px", color:T.t3 }}>{d}</div></div>
            </div>)}
          </Card>
        </div>}

        {/* ════ HALVING ════ */}
        {tab==="halving"&&<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
          <Card style={{ gridColumn:"1/-1" }}>
            <Sec icon="₿" subtitle="Next halving: ~April 2028 — block reward drops from 3.125 → 1.5625 BTC">Bitcoin Halving Countdown</Sec>
            <HalvingPanel/>
          </Card>
          <Card>
            <Sec icon="📚">Historical Halving Context</Sec>
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {[["What happens?","Every ~210,000 blocks (~4 years), BTC issuance is cut in half. This reduces daily sell pressure from miners by 50%.",T.orange],["Cycle 1 (2012)","First halving reduced reward from 50→25 BTC. BTC rose from ~$12 to $1,100 over the following year.",T.green],["Cycle 2 (2016)","12.5 BTC per block. BTC rose from ~$650 to ~$20,000 by end of 2017 (~18 months later).",T.teal],["Cycle 3 (2020)","6.25 BTC per block. BTC hit ATH of $69,000 in Nov 2021 (~18 months post-halving).",T.purple],["Cycle 4 (2024)","3.125 BTC per block. Currently in this cycle. Alt season historically follows BTC peak by 3-6 months.",T.blue],["Cycle 5 (2028)","1.5625 BTC per block. Reward will be lower than many miners' break-even costs.",T.indigo]].map(([t,d,c],i)=><div key={i} style={{ padding:"10px 12px", background:T.bg2, borderRadius:"9px", borderLeft:`3px solid ${c}` }}>
                <div style={{ ...DM, fontSize:"10px", fontWeight:"800", color:c, marginBottom:"3px" }}>{t}</div>
                <div style={{ ...DM, fontSize:"10px", color:T.t2, lineHeight:"1.6" }}>{d}</div>
              </div>)}
            </div>
          </Card>
          {data&&<Card>
            <Sec icon="📍">Your Position in This Cycle</Sec>
            <div style={{ display:"flex", flexDirection:"column", gap:"9px", marginBottom:"14px" }}>
              {[{l:"Altseason Score",v:`${data.score}/100`,c:data.score>60?T.green:data.score>40?T.yellow:T.red},{l:"Market Phase",v:data.label,c:data.clr},{l:"BTC Dominance",v:`${fmt(data.btcDom)}%`,c:T.orange},{l:"Days to Next Halving",v:`~${halvingNow().days.toLocaleString()} days`,c:T.teal},{l:"Cycle Elapsed",v:`${fmt(halvingNow().pct,1)}%`,c:T.purple},{l:"Fear & Greed",v:`${data.fngVal??"—"} — ${data.fngLabel}`,c:sentColor(data.fngVal)}].map((x,i)=><div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 12px", background:T.bg2, borderRadius:"9px" }}>
                <span style={{ ...DM, fontSize:"11px", fontWeight:"600", color:T.t2 }}>{x.l}</span>
                <span style={{ ...MONO, fontSize:"13px", fontWeight:"800", color:x.c }}>{x.v}</span>
              </div>)}
            </div>
            <PhaseTrack n={data.n}/>
          </Card>}
        </div>}

        {/* ════ TRENDING ════ */}
        {tab==="trending"&&data&&<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"14px" }}>
          <Card>
            <Sec icon="🔥" right={<Pill color={T.blue} bg={T.blueLt}>CoinGecko</Pill>}>Trending Now</Sec>
            <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
              {(data.trending||[]).slice(0,8).map((t,i)=><div key={t.item.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 11px", background:T.bg2, borderRadius:"9px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                  <span style={{ ...DM, fontSize:"10px", fontWeight:"800", color:T.t4, minWidth:"18px" }}>#{i+1}</span>
                  {t.item.thumb&&<img src={t.item.thumb} width="20" height="20" style={{ borderRadius:"50%" }} alt=""/>}
                  <div><div style={{ ...DM, fontSize:"10px", color:T.t1, fontWeight:"700" }}>{t.item.symbol}</div><div style={{ ...DM, fontSize:"8px", color:T.t4 }}>{t.item.name}</div></div>
                </div>
                <Pill color={T.orange} bg={T.orangeLt} size="8px">🔥 Hot</Pill>
              </div>)}
            </div>
          </Card>
          <Card>
            <Sec icon="🟢">Top Gainers 24h</Sec>
            <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
              {[...(data.coins||[])].sort((a,b)=>(b.price_change_percentage_24h||0)-(a.price_change_percentage_24h||0)).slice(0,8).map((c,i)=><div key={c.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 11px", background:T.greenLt, border:`1px solid ${T.green}33`, borderRadius:"9px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
                  {c.image&&<img src={c.image} width="18" height="18" style={{ borderRadius:"50%" }} alt=""/>}
                  <div><div style={{ ...DM, fontSize:"10px", fontWeight:"700", color:T.t1 }}>{c.symbol?.toUpperCase()}</div><div style={{ ...DM, fontSize:"8px", color:T.t4 }}>${c.current_price?.toLocaleString()}</div></div>
                </div>
                <Chg v={c.price_change_percentage_24h}/>
              </div>)}
            </div>
          </Card>
          <Card>
            <Sec icon="🔴">Top Losers 24h</Sec>
            <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
              {[...(data.coins||[])].sort((a,b)=>(a.price_change_percentage_24h||0)-(b.price_change_percentage_24h||0)).slice(0,8).map((c,i)=><div key={c.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 11px", background:T.redLt, border:`1px solid ${T.red}33`, borderRadius:"9px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
                  {c.image&&<img src={c.image} width="18" height="18" style={{ borderRadius:"50%" }} alt=""/>}
                  <div><div style={{ ...DM, fontSize:"10px", fontWeight:"700", color:T.t1 }}>{c.symbol?.toUpperCase()}</div><div style={{ ...DM, fontSize:"8px", color:T.t4 }}>${c.current_price?.toLocaleString()}</div></div>
                </div>
                <Chg v={c.price_change_percentage_24h}/>
              </div>)}
            </div>
          </Card>
        </div>}

      </div>
    )}

    {/* ── FOOTER ── */}
    <div style={{ background:T.surface, borderTop:`1px solid ${T.line}`, padding:"14px 24px", textAlign:"center", marginTop:"10px" }}>
      <span style={{ ...DM, fontSize:"9px", color:T.t4 }}>
        Capital Rotation Terminal v4 · Binance WebSocket · CoinGecko · CryptoPanic · Alternative.me · Messari · OpenSea · Google Gemini · Not Financial Advice
      </span>
    </div>
  </div>;
}
