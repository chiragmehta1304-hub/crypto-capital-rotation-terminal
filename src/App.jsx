import { useState, useEffect, useCallback, useRef } from "react";

const C = {
  bg:"#02040a",panel:"#060b14",panelHover:"#0a1220",border:"#0d1f3c",borderBright:"#1a3a6e",
  accent:"#00d4ff",accentDim:"rgba(0,212,255,0.12)",accentGlow:"rgba(0,212,255,0.25)",
  green:"#00f5a0",greenDim:"rgba(0,245,160,0.08)",red:"#ff4466",redDim:"rgba(255,68,102,0.08)",
  yellow:"#ffcc44",yellowDim:"rgba(255,204,68,0.08)",purple:"#bf5fff",orange:"#ff8c42",
  text:"#c8d8f0",textBright:"#e8f4ff",muted:"#3a4f6a",dim:"#0d1928",dimmer:"#080f1c",
};
const mono={fontFamily:"'JetBrains Mono','Fira Code','Courier New',monospace"};
const fmt=(n,d=2)=>n==null?"—":Number(n).toFixed(d);
const fmtB=(n)=>{if(!n)return"—";if(n>=1e12)return`$${(n/1e12).toFixed(2)}T`;if(n>=1e9)return`$${(n/1e9).toFixed(1)}B`;if(n>=1e6)return`$${(n/1e6).toFixed(0)}M`;return`$${n}`;};
const fmtPct=(n)=>n==null?"—":`${n>=0?"+":""}${fmt(n)}%`;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const CG="https://api.coingecko.com/api/v3";
const BN="https://data-api.binance.vision/api/v3";
async function cgFetch(p){const r=await fetch(CG+p);if(!r.ok)throw new Error("CG "+r.status);return r.json();}
async function bnFetch(p){const r=await fetch(BN+p);if(!r.ok)throw new Error("BN "+r.status);return r.json();}

function calcAltScore({btcDom,ethBtcRatio,stableDom,total2Chg,btcChg}){
  let s=50;
  if(btcDom!=null)s+=clamp((55-btcDom)*2.5,-25,25);
  if(ethBtcRatio!=null)s+=clamp((ethBtcRatio-0.05)*800,-15,15);
  if(stableDom!=null)s+=clamp((8-stableDom)*2,-10,10);
  if(total2Chg!=null&&btcChg!=null)s+=clamp((total2Chg-btcChg)*1.5,-10,10);
  return clamp(Math.round(s),0,100);
}
function calcPhase(score){
  if(score<30)return{phase:1,label:"BTC Accumulation",desc:"Capital consolidating in BTC. Alts suppressed.",color:C.orange};
  if(score<50)return{phase:2,label:"ETH Expansion",desc:"ETH/BTC breaking out. Large caps leading.",color:C.accent};
  if(score<72)return{phase:3,label:"Midcap Rotation",desc:"Capital rotating into mid/small caps.",color:C.purple};
  return{phase:4,label:"Lowcap Mania",desc:"Full altseason. Memes & micro caps exploding.",color:C.green};
}
function halvingData(){
  const next=new Date("2028-04-01T00:00:00Z"),last=new Date("2024-04-20T00:00:00Z"),diff=next-Date.now();
  return{days:Math.floor(diff/86400000),hours:Math.floor((diff%86400000)/3600000),mins:Math.floor((diff%3600000)/60000),secs:Math.floor((diff%60000)/1000),pct:clamp(((Date.now()-last)/(next-last))*100,0,100)};
}

function Lbl({children,color=C.muted,size="10px",bold,style={}}){return<div style={{...mono,fontSize:size,color,letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:bold?"700":"400",...style}}>{children}</div>;}
function Num({v,color=C.textBright,size="28px",glow}){return<span style={{...mono,fontSize:size,fontWeight:"800",color,textShadow:glow?`0 0 20px ${color}88`:"none"}}>{v}</span>;}
function Chg({v,size="11px"}){if(v==null)return<span style={{...mono,fontSize:size,color:C.muted}}>—</span>;const up=v>=0;return<span style={{...mono,fontSize:size,color:up?C.green:C.red,background:up?C.greenDim:C.redDim,padding:"2px 7px",borderRadius:"4px",fontWeight:"700"}}>{up?"▲":"▼"} {Math.abs(v).toFixed(2)}%</span>;}
function Badge({children,color=C.accent}){return<span style={{...mono,fontSize:"9px",padding:"2px 8px",borderRadius:"20px",background:`${color}18`,color,border:`1px solid ${color}44`,letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:"700"}}>{children}</span>;}
function Dot({color,pulse}){return<div style={{width:"7px",height:"7px",borderRadius:"50%",background:color,boxShadow:`0 0 8px ${color}`,animation:pulse?"pulse 1.8s infinite":"none",flexShrink:0}}/>;}
function HBar({value,max=100,color=C.accent,height="5px"}){const pct=clamp((value/max)*100,0,100);return<div style={{height,background:C.dim,borderRadius:"3px",overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${color}55,${color})`,borderRadius:"3px",transition:"width 1.2s ease"}}/></div>;}
function Panel({children,style={},glow}){const[hov,setHov]=useState(false);return<div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{background:hov?C.panelHover:C.panel,border:`1px solid ${glow?C.accent:hov?C.borderBright:C.border}`,borderRadius:"10px",padding:"16px",boxShadow:glow?`0 0 28px ${C.accentGlow}`:"none",transition:"all 0.2s ease",...style}}>{children}</div>;}
function PT({children,right}){return<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}><Lbl size="11px" color={C.text} bold>{children}</Lbl>{right&&<div>{right}</div>}</div>;}

function AltGauge({score}){
  const s=clamp(score??50,0,100),r=65,cx=85,cy=80;
  const rad=(d)=>(d*Math.PI)/180,pt=(a)=>({x:cx+r*Math.cos(rad(180+a)),y:cy+r*Math.sin(rad(180+a))});
  const arc=(s0,e0)=>{const sp=pt(s0*1.8),ep=pt(e0*1.8);return`M ${sp.x} ${sp.y} A ${r} ${r} 0 ${(e0-s0)>50?1:0} 1 ${ep.x} ${ep.y}`;};
  const needle=pt(s*1.8),gc=s>=60?C.green:s>=40?C.yellow:C.red;
  const lbl=s>=75?"ALT SEASON":s>=60?"ALT FAVORED":s>=40?"NEUTRAL":s>=25?"BTC FAVORED":"BTC SEASON";
  return(<div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
    <svg width="170" height="95" viewBox="0 0 170 95">
      {[[0,33,C.red],[33,55,C.yellow],[55,100,C.green]].map(([s0,e0,c])=><path key={c} d={arc(s0,e0)} fill="none" stroke={c} strokeWidth="10" strokeLinecap="round" opacity="0.25"/>)}
      <path d={arc(0,s)} fill="none" stroke={gc} strokeWidth="10" strokeLinecap="round" style={{filter:`drop-shadow(0 0 6px ${gc})`}}/>
      <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r="4" fill={gc}/>
    </svg>
    <Num v={s} size="34px" color={gc} glow/><div style={{marginTop:"4px"}}><Badge color={gc}>{lbl}</Badge></div>
  </div>);
}

function FearGreedGauge({value,label,yesterday,lastWeek}){
  if(value==null)return<div style={{...mono,fontSize:"11px",color:C.muted,textAlign:"center",padding:"20px"}}>Loading...</div>;
  const gc=value>=75?C.red:value>=60?C.orange:value>=40?C.yellow:value>=25?C.green:C.accent;
  return(<div style={{textAlign:"center"}}>
    <div style={{width:"80px",height:"80px",borderRadius:"50%",margin:"0 auto",background:`conic-gradient(${gc} ${value*3.6}deg,${C.dim} 0deg)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 24px ${gc}44`}}>
      <div style={{width:"60px",height:"60px",borderRadius:"50%",background:C.panel,display:"flex",alignItems:"center",justifyContent:"center"}}><Num v={value} size="22px" color={gc} glow/></div>
    </div>
    <div style={{marginTop:"8px"}}><Badge color={gc}>{label}</Badge></div>
    {(yesterday||lastWeek)&&<div style={{marginTop:"8px",display:"flex",justifyContent:"center",gap:"12px"}}>
      {yesterday&&<div style={{textAlign:"center"}}><Lbl size="8px">Yesterday</Lbl><div style={{...mono,fontSize:"11px",color:C.text,marginTop:"2px"}}>{yesterday}</div></div>}
      {lastWeek&&<div style={{textAlign:"center"}}><Lbl size="8px">Last week</Lbl><div style={{...mono,fontSize:"11px",color:C.text,marginTop:"2px"}}>{lastWeek}</div></div>}
    </div>}
  </div>);
}

function HalvingCountdown(){
  const[h,setH]=useState(halvingData());
  useEffect(()=>{const id=setInterval(()=>setH(halvingData()),1000);return()=>clearInterval(id);},[]);
  return(<div>
    <PT right={<Badge color={C.orange}>~{Math.round(h.pct)}% of cycle</Badge>}>₿ BTC Halving Countdown</PT>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"6px",marginBottom:"12px"}}>
      {[["Days",h.days],["Hours",h.hours],["Mins",h.mins],["Secs",h.secs]].map(([l,v])=>(
        <div key={l} style={{background:C.dim,borderRadius:"8px",padding:"10px 6px",textAlign:"center",border:`1px solid ${C.orange}22`}}>
          <div style={{...mono,fontSize:"22px",fontWeight:"800",color:C.orange,textShadow:`0 0 12px ${C.orange}66`}}>{String(v).padStart(2,"0")}</div>
          <Lbl size="8px">{l}</Lbl>
        </div>
      ))}
    </div>
    <HBar value={h.pct} max={100} color={C.orange}/>
    <div style={{display:"flex",justifyContent:"space-between",marginTop:"4px"}}>
      <Lbl size="8px">Apr 2024 (last halving)</Lbl><Lbl size="8px">Apr 2028 (next)</Lbl>
    </div>
  </div>);
}

function PhaseTrack({phase}){
  const phases=[{n:1,lbl:"BTC Accum.",icon:"₿",clr:C.orange},{n:2,lbl:"ETH Expand",icon:"Ξ",clr:C.accent},{n:3,lbl:"Midcap Rot.",icon:"◈",clr:C.purple},{n:4,lbl:"Lowcap Mania",icon:"🔥",clr:C.green}];
  return(<div style={{display:"flex",alignItems:"center"}}>
    {phases.map((p,i)=>(<div key={p.n} style={{display:"flex",alignItems:"center",flex:i<3?1:0}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"5px"}}>
        <div style={{width:"38px",height:"38px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:p.n===phase?p.clr:p.n<phase?`${C.green}22`:C.dim,border:`2px solid ${p.n===phase?p.clr:p.n<phase?C.green:C.border}`,fontSize:"14px",color:p.n===phase?C.bg:p.n<phase?C.green:C.muted,fontWeight:"800",boxShadow:p.n===phase?`0 0 16px ${p.clr}88`:"none",transition:"all 0.4s",...mono}}>{p.n<phase?"✓":p.n===phase?p.icon:p.n}</div>
        <Lbl color={p.n===phase?p.clr:p.n<phase?C.green:C.muted} size="8px" style={{textAlign:"center",maxWidth:"56px"}}>{p.lbl}</Lbl>
      </div>
      {i<3&&<div style={{flex:1,height:"2px",background:p.n<phase?C.green:C.dim,margin:"0 3px",marginBottom:"18px",transition:"background 0.4s"}}/>}
    </div>))}
  </div>);
}

function RotSignals({btcDom,stableDom,total2Chg,btcChg,ethBtcRatio,altScore}){
  const signals=[
    {name:"BTC.D Declining",active:btcDom<54,watch:btcDom>=54&&btcDom<57,strength:btcDom<50?"HIGH":btcDom<54?"MED":"LOW",desc:`BTC Dom: ${fmt(btcDom)}%`},
    {name:"TOTAL2 Outperforming BTC",active:total2Chg-btcChg>1,watch:total2Chg-btcChg>0,strength:(total2Chg-btcChg)>5?"HIGH":(total2Chg-btcChg)>2?"MED":"LOW",desc:`Spread: ${fmtPct(total2Chg-btcChg)}`},
    {name:"Stable Dominance Falling",active:stableDom<7,watch:stableDom>=7&&stableDom<8,strength:stableDom<6?"HIGH":stableDom<7?"MED":"LOW",desc:`Stable Dom: ${fmt(stableDom)}%`},
    {name:"ETH/BTC Breakout",active:ethBtcRatio>0.058,watch:ethBtcRatio>=0.052&&ethBtcRatio<=0.058,strength:ethBtcRatio>0.065?"HIGH":ethBtcRatio>0.058?"MED":"LOW",desc:`Ratio: ${fmt(ethBtcRatio,4)}`},
    {name:"Risk-On Confirmed",active:altScore>60,watch:altScore>=45&&altScore<=60,strength:altScore>75?"HIGH":altScore>60?"MED":"LOW",desc:`Alt Score: ${altScore}/100`},
  ];
  const ac=signals.filter(s=>s.active).length;
  return(<div>
    <div style={{display:"flex",gap:"8px",marginBottom:"12px",flexWrap:"wrap"}}>
      <Badge color={ac>=4?C.green:ac>=2?C.yellow:C.red}>{ac}/5 signals active</Badge>
      <Badge color={ac>=4?C.green:ac>=2?C.yellow:C.red}>{ac>=4?"STRONG BUY":ac>=3?"BUY":ac>=2?"WATCH":"WAIT"}</Badge>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:"7px"}}>
      {signals.map((s,i)=>{const status=s.active?"ACTIVE":s.watch?"WATCH":"INACTIVE",sc=s.active?C.green:s.watch?C.yellow:C.muted,strc=s.strength==="HIGH"?C.green:s.strength==="MED"?C.yellow:C.muted;return(
        <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",background:s.active?`${C.green}08`:s.watch?`${C.yellow}06`:"transparent",border:`1px solid ${s.active?`${C.green}33`:s.watch?`${C.yellow}22`:C.border}`,borderRadius:"7px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"9px"}}><Dot color={sc} pulse={s.active}/>
            <div><div style={{...mono,fontSize:"11px",color:C.text,fontWeight:"600"}}>{s.name}</div><div style={{...mono,fontSize:"9px",color:C.muted}}>{s.desc}</div></div>
          </div>
          <div style={{display:"flex",gap:"6px"}}><Badge color={strc}>{s.strength}</Badge><Badge color={sc}>{status}</Badge></div>
        </div>
      );})}
    </div>
  </div>);
}

function LivePriceStream({wsPrices}){
  const pairs=[
    {sym:"BTCUSDT",name:"Bitcoin",color:C.orange},{sym:"ETHUSDT",name:"Ethereum",color:C.accent},
    {sym:"SOLUSDT",name:"Solana",color:C.purple},{sym:"BNBUSDT",name:"BNB",color:C.yellow},
    {sym:"XRPUSDT",name:"XRP",color:C.green},{sym:"DOGEUSDT",name:"Dogecoin",color:C.orange},
    {sym:"ADAUSDT",name:"Cardano",color:C.accent},{sym:"AVAXUSDT",name:"Avalanche",color:C.red},
  ];
  return(<div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 100px 75px 95px",gap:"8px",padding:"0 6px 7px",borderBottom:`1px solid ${C.border}`}}>
      {["Asset","Price","24h","Volume"].map((h,i)=><Lbl key={i} size="8px">{h}</Lbl>)}
    </div>
    {pairs.map(p=>{const d=wsPrices[p.sym];return(
      <div key={p.sym} style={{display:"grid",gridTemplateColumns:"1fr 100px 75px 95px",gap:"8px",padding:"8px 6px",borderRadius:"6px",background:C.dimmer,alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <div style={{width:"8px",height:"8px",borderRadius:"50%",background:p.color,boxShadow:`0 0 6px ${p.color}`}}/>
          <div><div style={{...mono,fontSize:"11px",color:C.textBright,fontWeight:"700"}}>{p.sym.replace("USDT","")}</div><div style={{...mono,fontSize:"8px",color:C.muted}}>{p.name}</div></div>
        </div>
        <div style={{...mono,fontSize:"12px",color:d?p.color:C.muted,fontWeight:"700"}}>{d?`$${Number(d.price).toLocaleString("en-US",{minimumFractionDigits:d.price>10?2:4})}`:"—"}</div>
        <Chg v={d?.priceChangePercent?parseFloat(d.priceChangePercent):null} size="10px"/>
        <div style={{...mono,fontSize:"9px",color:C.muted}}>{d?fmtB(parseFloat(d.quoteVolume)):"—"}</div>
      </div>
    );})}
    <div style={{marginTop:"4px",display:"flex",alignItems:"center",gap:"6px"}}><Dot color={C.green} pulse/><Lbl size="8px" color={C.green}>Binance WebSocket · prices update every tick</Lbl></div>
  </div>);
}

function SectorMap({sectors}){
  const maxV=Math.max(...(sectors||[]).map(s=>Math.abs(s.change||0)),1);
  return(<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"7px"}}>
    {(sectors||[]).map((s,i)=>{const intensity=Math.abs(s.change||0)/maxV,bc=(s.change||0)>=0?C.green:C.red;return(
      <div key={i} style={{padding:"12px 10px",borderRadius:"8px",background:`${bc}${Math.round(intensity*20).toString(16).padStart(2,"0")}`,border:`1px solid ${bc}${Math.round(intensity*45).toString(16).padStart(2,"0")}`,textAlign:"center"}}>
        <Lbl color={C.muted} size="9px">{s.name}</Lbl>
        <div style={{margin:"5px 0"}}><Num v={fmtPct(s.change)} size="14px" color={bc}/></div>
        <div style={{...mono,fontSize:"8px",color:C.muted}}>{fmtB(s.cap)}</div>
      </div>
    );})}
  </div>);
}

function TopCoins({coins,wsPrices}){
  return(<div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
    <div style={{display:"grid",gridTemplateColumns:"22px 1fr 90px 70px 70px 90px",gap:"8px",padding:"0 6px 8px",borderBottom:`1px solid ${C.border}`}}>
      {["#","Coin","Price","24h","7d","Mkt Cap"].map((h,i)=><Lbl key={i} size="8px">{h}</Lbl>)}
    </div>
    {(coins||[]).slice(0,15).map((c,i)=>{
      const wsKey=c.symbol?.toUpperCase()+"USDT",livePrice=wsPrices[wsKey]?.price;
      const dp=livePrice?parseFloat(livePrice):c.current_price;
      return(<div key={c.id} style={{display:"grid",gridTemplateColumns:"22px 1fr 90px 70px 70px 90px",gap:"8px",padding:"7px 6px",borderRadius:"6px",background:i%2===0?C.dimmer:"transparent",alignItems:"center"}}>
        <Lbl size="9px">{i+1}</Lbl>
        <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
          {c.image&&<img src={c.image} width="16" height="16" style={{borderRadius:"50%"}} alt=""/>}
          <div><div style={{...mono,fontSize:"10px",color:C.textBright,fontWeight:"700"}}>{c.symbol?.toUpperCase()}</div><div style={{...mono,fontSize:"8px",color:C.muted}}>{c.name}</div></div>
        </div>
        <div style={{...mono,fontSize:"10px",color:livePrice?C.accent:C.text,fontWeight:"700"}}>
          ${dp<1?dp?.toFixed(4):dp?.toLocaleString()}{livePrice&&<span style={{fontSize:"7px",color:C.accent,marginLeft:"2px"}}>●</span>}
        </div>
        <Chg v={c.price_change_percentage_24h} size="10px"/>
        <Chg v={c.price_change_percentage_7d_in_currency} size="10px"/>
        <div style={{...mono,fontSize:"9px",color:C.muted}}>{fmtB(c.market_cap)}</div>
      </div>);
    })}
    <div style={{marginTop:"4px",display:"flex",alignItems:"center",gap:"6px"}}><span style={{...mono,fontSize:"7px",color:C.accent}}>●</span><Lbl size="8px" color={C.accent}>Live price via Binance WebSocket</Lbl></div>
  </div>);
}

function PriceAlerts({wsPrices}){
  const[alerts,setAlerts]=useState(()=>{try{return JSON.parse(localStorage.getItem("crt_alerts")||"[]");}catch{return[];}});
  const[sym,setSym]=useState("BTCUSDT"),[price,setPrice]=useState(""),[ dir,setDir]=useState("above");
  const[triggered,setTriggered]=useState([]);
  useEffect(()=>{
    const nt=[];
    alerts.forEach(a=>{const p=wsPrices[a.sym]?.price;if(!p)return;const hit=a.dir==="above"?parseFloat(p)>=a.price:parseFloat(p)<=a.price;if(hit)nt.push(a.id);});
    if(nt.length)setTriggered(t=>[...new Set([...t,...nt])]);
  },[wsPrices,alerts]);
  const addAlert=()=>{if(!price)return;const n={id:Date.now(),sym,price:parseFloat(price),dir};const u=[...alerts,n];setAlerts(u);try{localStorage.setItem("crt_alerts",JSON.stringify(u));}catch{}setPrice("");};
  const removeAlert=(id)=>{const u=alerts.filter(a=>a.id!==id);setAlerts(u);try{localStorage.setItem("crt_alerts",JSON.stringify(u));}catch{}setTriggered(t=>t.filter(x=>x!==id));};
  const symbols=["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","DOGEUSDT","ADAUSDT"];
  return(<div>
    <div style={{display:"flex",gap:"6px",marginBottom:"12px",flexWrap:"wrap"}}>
      <select value={sym} onChange={e=>setSym(e.target.value)} style={{...mono,fontSize:"10px",background:C.dim,border:`1px solid ${C.border}`,color:C.text,borderRadius:"6px",padding:"5px 8px"}}>
        {symbols.map(s=><option key={s} value={s}>{s.replace("USDT","")}</option>)}
      </select>
      <select value={dir} onChange={e=>setDir(e.target.value)} style={{...mono,fontSize:"10px",background:C.dim,border:`1px solid ${C.border}`,color:C.text,borderRadius:"6px",padding:"5px 8px"}}>
        <option value="above">Above ▲</option><option value="below">Below ▼</option>
      </select>
      <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="Price e.g. 70000" style={{...mono,fontSize:"10px",background:C.dim,border:`1px solid ${C.border}`,color:C.text,borderRadius:"6px",padding:"5px 8px",flex:1,minWidth:"120px"}}/>
      <button onClick={addAlert} style={{...mono,fontSize:"10px",padding:"5px 14px",background:C.accentDim,border:`1px solid ${C.accent}44`,borderRadius:"6px",color:C.accent,cursor:"pointer"}}>+ Add Alert</button>
    </div>
    {!alerts.length&&<Lbl size="9px">No alerts set. Add one above.</Lbl>}
    <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
      {alerts.map(a=>{const iT=triggered.includes(a.id),cp=wsPrices[a.sym]?.price;return(
        <div key={a.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",background:iT?`${C.green}12`:C.dim,border:`1px solid ${iT?C.green:C.border}`,borderRadius:"7px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}><Dot color={iT?C.green:C.muted} pulse={iT}/>
            <div><div style={{...mono,fontSize:"11px",color:C.text}}>{a.sym.replace("USDT","")} {a.dir==="above"?"▲ above":"▼ below"} ${a.price.toLocaleString()}</div>
              <div style={{...mono,fontSize:"8px",color:C.muted}}>Current: {cp?`$${Number(cp).toLocaleString()}`:"connecting..."}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
            {iT&&<Badge color={C.green}>🔔 TRIGGERED</Badge>}
            <button onClick={()=>removeAlert(a.id)} style={{...mono,fontSize:"9px",padding:"2px 8px",background:"transparent",border:`1px solid ${C.red}44`,borderRadius:"4px",color:C.red,cursor:"pointer"}}>✕</button>
          </div>
        </div>
      );})}
    </div>
  </div>);
}

function TrendingCoins({trending}){
  if(!trending?.length)return<div style={{...mono,fontSize:"11px",color:C.muted,padding:"10px"}}>Loading trending...</div>;
  return(<div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
    {trending.slice(0,7).map((t,i)=>(
      <div key={t.item.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",background:C.dim,borderRadius:"7px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <div style={{...mono,fontSize:"11px",color:C.muted,minWidth:"18px"}}>#{i+1}</div>
          {t.item.thumb&&<img src={t.item.thumb} width="18" height="18" style={{borderRadius:"50%"}} alt=""/>}
          <div><div style={{...mono,fontSize:"10px",color:C.textBright,fontWeight:"700"}}>{t.item.symbol}</div><div style={{...mono,fontSize:"8px",color:C.muted}}>{t.item.name}</div></div>
        </div>
        <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
          <div style={{...mono,fontSize:"9px",color:C.muted}}>Rank #{t.item.market_cap_rank||"?"}</div>
          <Badge color={C.accent}>🔥 Trending</Badge>
        </div>
      </div>
    ))}
  </div>);
}

function Ticker({wsPrices,coins}){
  const[pos,setPos]=useState(0);
  const items=(coins||[]).slice(0,12).map(c=>{const k=c.symbol?.toUpperCase()+"USDT",lp=wsPrices[k]?.price,price=lp?parseFloat(lp):c.current_price,chg=c.price_change_percentage_24h;return`${c.symbol?.toUpperCase()} $${price<1?price?.toFixed(4):price?.toLocaleString()} ${chg>=0?"▲":"▼"}${Math.abs(chg||0).toFixed(2)}%`;});
  const str=items.join("   ·   ");
  useEffect(()=>{if(!str)return;const id=setInterval(()=>setPos(p=>p-1),30);return()=>clearInterval(id);},[str]);
  if(!str)return null;
  return(<div style={{overflow:"hidden",background:`${C.accent}08`,borderTop:`1px solid ${C.accent}22`,borderBottom:`1px solid ${C.accent}22`,padding:"7px 0"}}>
    <div style={{display:"inline-block",whiteSpace:"nowrap",transform:`translateX(${pos%((str.length*8)||1)}px)`}}>
      {[str,str].map((s,i)=><span key={i} style={{...mono,fontSize:"10px",color:C.accent,letterSpacing:"0.08em",marginRight:"80px"}}>{s}</span>)}
    </div>
  </div>);
}

export default function App(){
  const[data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(null);
  const[lastUpd,setLastUpd]=useState(null),[clock,setClock]=useState(new Date()),[tab,setTab]=useState("overview");
  const[syncing,setSyncing]=useState(false),[wsPrices,setWsPrices]=useState({}),[wsStatus,setWsStatus]=useState("connecting");
  const wsRef=useRef(null);

  useEffect(()=>{const id=setInterval(()=>setClock(new Date()),1000);return()=>clearInterval(id);},[]);

  useEffect(()=>{
    const streams=["btcusdt","ethusdt","solusdt","bnbusdt","xrpusdt","dogeusdt","adausdt","avaxusdt"].map(s=>`${s}@ticker`).join("/");
    const connect=()=>{
      const ws=new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
      wsRef.current=ws;
      ws.onopen=()=>setWsStatus("live");
      ws.onclose=()=>{setWsStatus("reconnecting");setTimeout(connect,3000);};
      ws.onerror=()=>setWsStatus("error");
      ws.onmessage=(e)=>{try{const msg=JSON.parse(e.data);if(msg?.data){const d=msg.data;setWsPrices(prev=>({...prev,[d.s]:{price:d.c,priceChangePercent:d.P,quoteVolume:d.q,high:d.h,low:d.l,open:d.o}}));}}catch{}};
    };
    connect();
    return()=>{if(wsRef.current)wsRef.current.close();};
  },[]);

  const load=useCallback(async()=>{
    setSyncing(true);
    try{
      const[globalRes,coinsRes,fearRes,trendRes]=await Promise.allSettled([
        cgFetch("/global"),
        cgFetch("/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h,7d"),
        fetch("https://api.alternative.me/fng/?limit=3").then(r=>r.json()),
        cgFetch("/search/trending"),
      ]);
      const global=globalRes.status==="fulfilled"?globalRes.value?.data:null;
      const coins=coinsRes.status==="fulfilled"?coinsRes.value:[];
      const fearArr=fearRes.status==="fulfilled"?fearRes.value?.data:[];
      const trending=trendRes.status==="fulfilled"?trendRes.value?.coins:[];
      const btcDom=global?.market_cap_percentage?.btc??0,ethDom=global?.market_cap_percentage?.eth??0;
      const stableDom=(global?.market_cap_percentage?.usdt??0)+(global?.market_cap_percentage?.usdc??0)+(global?.market_cap_percentage?.dai??0);
      const othersDom=Math.max(0,100-btcDom-ethDom-stableDom);
      const btc=coins.find(c=>c.id==="bitcoin"),eth=coins.find(c=>c.id==="ethereum");
      const ethBtcRatio=btc?.current_price&&eth?.current_price?eth.current_price/btc.current_price:0;
      const btcChg=btc?.price_change_percentage_24h??0,total2Chg=(global?.market_cap_change_percentage_24h_usd??0)*1.1;
      const altScore=calcAltScore({btcDom,ethBtcRatio,stableDom,total2Chg,btcChg});
      const phaseObj=calcPhase(altScore);
      const sectors=[
        {name:"AI / Tech",ids:["fetch-ai","singularitynet","ocean-protocol"]},
        {name:"MEME",ids:["dogecoin","shiba-inu","pepe"]},
        {name:"DeFi",ids:["uniswap","aave","compound-governance-token"]},
        {name:"L1s",ids:["solana","avalanche-2","cardano"]},
        {name:"RWA",ids:["chainlink","ondo-finance","mantra-dao"]},
        {name:"GameFi",ids:["axie-infinity","the-sandbox","gala"]},
      ].map(sec=>{const sc=coins.filter(c=>sec.ids.includes(c.id));return{name:sec.name,change:sc.length?sc.reduce((a,c)=>a+(c.price_change_percentage_24h||0),0)/sc.length:null,cap:sc.reduce((a,c)=>a+(c.market_cap||0),0)};});
      let btcHistory=[];
      try{const k=await bnFetch("/klines?symbol=BTCUSDT&interval=1d&limit=30");btcHistory=k.map(x=>parseFloat(x[4]));}catch{}
      setData({btcDom,ethDom,stableDom,othersDom,ethBtcRatio,altScore,...phaseObj,total2Chg,btcChg,
        totalMcap:global?.total_market_cap?.usd,btcMcap:btc?.market_cap,totalMcapChg:global?.market_cap_change_percentage_24h_usd,
        activeCoins:global?.active_cryptocurrencies,coins,sectors,trending,
        fearValue:fearArr[0]?parseInt(fearArr[0].value):null,fearLabel:fearArr[0]?.value_classification??"—",
        fearYesterday:fearArr[1]?.value??null,fearLastWeek:fearArr[2]?.value??null,
        btcPrice:btc?.current_price,ethPrice:eth?.current_price,volume24h:global?.total_volume?.usd,btcHistory,
      });
      setLastUpd(new Date());setError(null);
    }catch(e){setError("API rate limited. Auto-retry in 90s.");}
    finally{setLoading(false);setSyncing(false);}
  },[]);

  useEffect(()=>{load();const id=setInterval(load,90000);return()=>clearInterval(id);},[load]);

  const tabs=[
    {id:"overview",label:"Overview"},{id:"liveprices",label:"⚡ Live"},{id:"signals",label:"Signals"},
    {id:"sectors",label:"Sectors"},{id:"coins",label:"Coins"},{id:"dominance",label:"Dominance"},
    {id:"alerts",label:"🔔 Alerts"},{id:"halving",label:"₿ Halving"},{id:"trending",label:"🔥 Trending"},
  ];
  const wsColor=wsStatus==="live"?C.green:wsStatus==="reconnecting"?C.yellow:C.red;

  return(<div style={{background:C.bg,minHeight:"100vh",color:C.text}}>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.35;transform:scale(0.82)}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      ::-webkit-scrollbar{width:3px;height:3px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.border}}
      input,select,button{outline:none}
    `}</style>

    {/* HEADER */}
    <div style={{background:C.panel,borderBottom:`1px solid ${C.border}`,padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"8px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
        <div style={{width:"34px",height:"34px",borderRadius:"8px",background:`linear-gradient(135deg,${C.accent},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"17px",fontWeight:"900",color:C.bg,boxShadow:`0 0 16px ${C.accentGlow}`,flexShrink:0}}>◈</div>
        <div>
          <div style={{...mono,fontSize:"14px",fontWeight:"800",color:C.textBright,letterSpacing:"0.06em"}}>CAPITAL ROTATION TERMINAL</div>
          <Lbl size="8px" style={{marginTop:"1px"}}>Multi-Source Live Intelligence · Binance WebSocket + CoinGecko + Alternative.me</Lbl>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"14px",flexWrap:"wrap"}}>
        {data&&<div style={{display:"flex",gap:"14px"}}>
          {[["BTC",wsPrices["BTCUSDT"]?.price||data.btcPrice,C.orange],["ETH",wsPrices["ETHUSDT"]?.price||data.ethPrice,C.accent]].map(([sym,price,clr])=>(
            <div key={sym} style={{textAlign:"right"}}><Lbl size="7px">{sym}</Lbl><div style={{...mono,fontSize:"13px",color:clr,fontWeight:"800"}}>${Number(price||0).toLocaleString()}</div></div>
          ))}
          <div style={{textAlign:"right"}}><Lbl size="7px">Total MCap</Lbl><div style={{...mono,fontSize:"12px",color:C.text,fontWeight:"700"}}>{fmtB(data.totalMcap)}</div></div>
        </div>}
        <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:"5px"}}><Dot color={wsColor} pulse={wsStatus==="live"}/><Lbl size="8px" color={wsColor}>WS:{wsStatus.toUpperCase()}</Lbl></div>
          <div style={{display:"flex",alignItems:"center",gap:"5px"}}><Dot color={error?C.red:C.green} pulse={!error}/><Lbl size="8px" color={error?C.red:C.green}>{error?"ERR":"REST"}</Lbl></div>
        </div>
        <Lbl size="8px">{clock.toUTCString().slice(17,25)} UTC</Lbl>
        <button onClick={load} disabled={syncing} style={{...mono,fontSize:"9px",padding:"5px 10px",background:syncing?C.dim:C.accentDim,border:`1px solid ${C.accent}44`,borderRadius:"6px",color:C.accent,cursor:syncing?"wait":"pointer",letterSpacing:"0.1em"}}>{syncing?"SYNC...":"⟳ SYNC"}</button>
      </div>
    </div>

    {data?.coins&&<Ticker wsPrices={wsPrices} coins={data.coins}/>}

    {/* TABS */}
    <div style={{background:C.panel,borderBottom:`1px solid ${C.border}`,display:"flex",overflowX:"auto",padding:"0 20px"}}>
      {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{...mono,fontSize:"9px",padding:"10px 14px",background:"transparent",border:"none",borderBottom:`2px solid ${tab===t.id?C.accent:"transparent"}`,color:tab===t.id?C.accent:C.muted,cursor:"pointer",letterSpacing:"0.08em",textTransform:"uppercase",transition:"all 0.2s",fontWeight:tab===t.id?"700":"400",whiteSpace:"nowrap"}}>{t.label}</button>)}
      {lastUpd&&<div style={{...mono,fontSize:"8px",color:C.muted,marginLeft:"auto",alignSelf:"center",whiteSpace:"nowrap"}}>Updated {lastUpd.toLocaleTimeString()}</div>}
    </div>

    {loading?(<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"60vh",gap:"14px"}}>
      <div style={{width:"40px",height:"40px",border:`3px solid ${C.border}`,borderTop:`3px solid ${C.accent}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <Lbl size="11px">Connecting to live data sources...</Lbl>
    </div>):(<div style={{padding:"16px 20px",animation:"fadeUp 0.4s ease"}}>

      {/* OVERVIEW */}
      {tab==="overview"&&data&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px"}}>
        {[
          {lbl:"BTC Dominance",v:`${fmt(data.btcDom)}%`,chg:data.btcChg,color:C.orange,sub:data.btcDom<50?"⚡ Altseason territory":data.btcDom>57?"⚠ BTC season":"◎ Transition zone"},
          {lbl:"ETH / BTC Ratio",v:fmt(data.ethBtcRatio,4),chg:null,color:C.accent,sub:data.ethBtcRatio>0.058?"⚡ ETH breakout zone":"◎ Accumulating"},
          {lbl:"Stable Dominance",v:`${fmt(data.stableDom)}%`,chg:null,color:C.green,sub:data.stableDom<7?"⚡ Risk-on: deployed":data.stableDom>10?"⚠ Risk-off":"◎ Neutral"},
        ].map((k,i)=><Panel key={i}><Lbl>{k.lbl}</Lbl><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",margin:"10px 0 8px"}}><Num v={k.v} color={k.color} glow/>{k.chg!=null&&<Chg v={k.chg}/>}</div><Lbl size="8px">{k.sub}</Lbl></Panel>)}

        <Panel glow={data.altScore>60}><PT right={<Badge color={data.altScore>=60?C.green:data.altScore>=40?C.yellow:C.red}>{data.label}</Badge>}>Altseason Score</PT><AltGauge score={data.altScore}/><div style={{marginTop:"10px"}}><Lbl size="8px" style={{textAlign:"center"}}>{data.desc}</Lbl></div></Panel>

        <Panel><PT>Fear & Greed Index</PT><FearGreedGauge value={data.fearValue} label={data.fearLabel} yesterday={data.fearYesterday} lastWeek={data.fearLastWeek}/></Panel>

        <Panel><PT right={<Badge color={C.accent}>Phase {data.phase}</Badge>}>Market Cycle</PT><PhaseTrack phase={data.phase}/><div style={{marginTop:"12px",padding:"8px",background:C.dim,borderRadius:"6px"}}><Lbl size="9px">{data.desc}</Lbl></div></Panel>

        <Panel style={{gridColumn:"1/4"}}><PT right={<Lbl size="8px">Top movers from top 20</Lbl>}>🔥 Biggest 24h Movers</PT>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"8px"}}>
            {[...(data.coins||[])].sort((a,b)=>Math.abs(b.price_change_percentage_24h||0)-Math.abs(a.price_change_percentage_24h||0)).slice(0,5).map(c=>(
              <div key={c.id} style={{padding:"10px",borderRadius:"8px",background:(c.price_change_percentage_24h||0)>=0?C.greenDim:C.redDim,border:`1px solid ${(c.price_change_percentage_24h||0)>=0?`${C.green}33`:`${C.red}33`}`,textAlign:"center"}}>
                {c.image&&<img src={c.image} width="20" height="20" style={{borderRadius:"50%",marginBottom:"4px",display:"block",margin:"0 auto 4px"}} alt=""/>}
                <Lbl size="9px" color={C.text} bold>{c.symbol?.toUpperCase()}</Lbl>
                <div style={{marginTop:"4px"}}><Chg v={c.price_change_percentage_24h} size="11px"/></div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel style={{gridColumn:"1/4"}}><PT right={<Lbl size="8px">% of total market cap</Lbl>}>Capital Distribution</PT>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px",marginBottom:"12px"}}>
            {[["Bitcoin",C.orange,data.btcDom,data.btcDom<50?"BULLISH ALTS":data.btcDom>57?"BTC SEASON":"NEUTRAL"],
              ["Ethereum",C.accent,data.ethDom,data.ethBtcRatio>0.058?"ETH BREAKOUT":"ACCUMULATING"],
              ["Stables",C.green,data.stableDom,data.stableDom<7?"RISK-ON":data.stableDom>10?"RISK-OFF":"NEUTRAL"],
              ["Others",C.purple,data.othersDom,data.othersDom>22?"ALT EXPANSION":"ACCUMULATING"]].map(([lbl,clr,val,sig])=>(
              <div key={lbl} style={{padding:"12px",background:C.dim,borderRadius:"8px",textAlign:"center"}}>
                <Lbl size="8px" color={clr}>{lbl}</Lbl>
                <div style={{...mono,fontSize:"22px",fontWeight:"800",color:clr,margin:"6px 0 4px",textShadow:`0 0 16px ${clr}55`}}>{fmt(val)}%</div>
                <div style={{marginBottom:"6px"}}><Badge color={clr}>{sig}</Badge></div>
                <HBar value={val||0} max={65} color={clr}/>
              </div>
            ))}
          </div>
        </Panel>
      </div>}

      {/* LIVE PRICES */}
      {tab==="liveprices"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
        <Panel style={{gridColumn:"1/3"}}><PT right={<div style={{display:"flex",gap:"6px"}}><Dot color={wsColor} pulse={wsStatus==="live"}/><Badge color={wsColor}>Binance WebSocket · {wsStatus.toUpperCase()}</Badge></div>}>⚡ Real-Time Price Stream</PT><LivePriceStream wsPrices={wsPrices}/></Panel>
        {["BTCUSDT","ETHUSDT"].map(sym=>{const d=wsPrices[sym];const name=sym.replace("USDT","");const clr=sym==="BTCUSDT"?C.orange:C.accent;return(<Panel key={sym}><PT>{name} Live Stats</PT>{d?<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
          {[["Price",`$${Number(d.price).toLocaleString()}`,clr],["24h Chg",`${parseFloat(d.priceChangePercent||0).toFixed(2)}%`,parseFloat(d.priceChangePercent||0)>=0?C.green:C.red],["24h High",`$${Number(d.high||0).toLocaleString()}`,C.green],["24h Low",`$${Number(d.low||0).toLocaleString()}`,C.red],["Volume",fmtB(parseFloat(d.quoteVolume||0)),C.muted],["Open",`$${Number(d.open||0).toLocaleString()}`,C.muted]].map(([l,v,c])=>(
            <div key={l} style={{padding:"10px",background:C.dim,borderRadius:"7px"}}><Lbl size="8px">{l}</Lbl><div style={{...mono,fontSize:"13px",color:c,fontWeight:"700",marginTop:"3px"}}>{v}</div></div>
          ))}</div>:<Lbl size="10px">Connecting to WebSocket...</Lbl>}</Panel>);})}
      </div>}

      {/* SIGNALS */}
      {tab==="signals"&&data&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
        <Panel style={{gridColumn:"1/3"}}><PT right={<Badge color={C.green}>Live Engine</Badge>}>⚡ Rotation Signal Radar</PT><RotSignals btcDom={data.btcDom} stableDom={data.stableDom} total2Chg={data.total2Chg} btcChg={data.btcChg} ethBtcRatio={data.ethBtcRatio} altScore={data.altScore}/></Panel>
        <Panel><PT>Signal Playbook</PT><div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
          {[["BTC.D < 50% + TOTAL2 ↑","Strong alt rotation. Go long midcaps.",C.green],["STABLE.D < 6%","Dry powder deployed. Risk-on confirmed.",C.green],["ETH/BTC > 0.065","ETH dominance phase. ETH-ecosystem plays.",C.accent],["BTC.D > 58%","BTC season. Minimize alt exposure.",C.red],["STABLE.D > 10%","Risk-off. Capital hiding in stables.",C.red],["Score 60–75","Midcap rotation phase. Size up carefully.",C.yellow]].map(([rule,out,c],i)=>(
            <div key={i} style={{padding:"9px 12px",background:C.dim,borderRadius:"7px",borderLeft:`3px solid ${c}`}}><div style={{...mono,fontSize:"9px",color:C.muted,marginBottom:"3px"}}>{rule}</div><div style={{...mono,fontSize:"11px",color:c,fontWeight:"600"}}>{out}</div></div>
          ))}
        </div></Panel>
        <Panel><PT>Live Index Readings</PT><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
          {[{lbl:"Altseason Score",v:`${data.altScore}/100`,c:data.altScore>60?C.green:data.altScore>40?C.yellow:C.red},{lbl:"BTC Dominance",v:`${fmt(data.btcDom)}%`,c:C.orange},{lbl:"ETH/BTC",v:fmt(data.ethBtcRatio,4),c:C.accent},{lbl:"Stable Dom",v:`${fmt(data.stableDom)}%`,c:C.green},{lbl:"Others Dom",v:`${fmt(data.othersDom)}%`,c:C.purple},{lbl:"Fear & Greed",v:`${data.fearValue??"—"} · ${data.fearLabel}`,c:data.fearValue>70?C.red:data.fearValue>50?C.yellow:C.green}].map((x,i)=>(
            <div key={i} style={{padding:"10px",background:C.dim,borderRadius:"7px"}}><Lbl size="8px">{x.lbl}</Lbl><div style={{...mono,fontSize:"14px",color:x.c,fontWeight:"700",marginTop:"4px"}}>{x.v}</div></div>
          ))}
        </div></Panel>
      </div>}

      {/* SECTORS */}
      {tab==="sectors"&&data&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
        <Panel style={{gridColumn:"1/3"}}><PT right={<Lbl size="8px">24h avg performance</Lbl>}>🔥 Narrative Sector Heatmap</PT><SectorMap sectors={data.sectors}/></Panel>
        <Panel><PT>Sector Rankings</PT><div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
          {[...data.sectors].sort((a,b)=>(b.change||0)-(a.change||0)).map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",background:C.dim,borderRadius:"7px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}><div style={{...mono,fontSize:"10px",color:C.muted,minWidth:"16px"}}>#{i+1}</div><Lbl size="10px" color={C.text} bold>{s.name}</Lbl></div>
              <div style={{display:"flex",gap:"10px",alignItems:"center"}}><div style={{...mono,fontSize:"9px",color:C.muted}}>{fmtB(s.cap)}</div><Chg v={s.change}/></div>
            </div>
          ))}
        </div></Panel>
        <Panel><PT>Rotation Insight</PT>{(()=>{const sorted=[...data.sectors].sort((a,b)=>(b.change||0)-(a.change||0)),top=sorted[0],bot=sorted[sorted.length-1];return[{icon:"🔥",txt:`Capital INTO ${top?.name} (${fmtPct(top?.change)})`,c:C.green},{icon:"❄️",txt:`Capital OUT of ${bot?.name} (${fmtPct(bot?.change)})`,c:C.red},{icon:"⚡",txt:`Rotation: ${bot?.name} → ${top?.name}`,c:C.accent},{icon:"📊",txt:`${data.sectors.filter(s=>(s.change||0)>0).length}/${data.sectors.length} sectors positive`,c:C.yellow}].map((x,i)=><div key={i} style={{padding:"10px 12px",background:C.dim,borderRadius:"7px",display:"flex",gap:"10px",marginBottom:"6px"}}><span style={{fontSize:"14px"}}>{x.icon}</span><div style={{...mono,fontSize:"11px",color:x.c}}>{x.txt}</div></div>);})()}</Panel>
      </div>}

      {/* COINS */}
      {tab==="coins"&&data&&<Panel><PT right={<div style={{display:"flex",gap:"6px"}}><Badge color={C.green}>CoinGecko REST</Badge><Badge color={C.accent}>Binance WS Live</Badge></div>}>Top 15 by Market Cap</PT><TopCoins coins={data.coins} wsPrices={wsPrices}/></Panel>}

      {/* DOMINANCE */}
      {tab==="dominance"&&data&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
        <Panel style={{gridColumn:"1/3"}}><PT right={<Lbl size="8px">% of total market cap</Lbl>}>Capital Distribution Map</PT>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px",marginBottom:"14px"}}>
            {[["Bitcoin",data.btcDom,C.orange,data.btcDom<50?"BULLISH ALTS":data.btcDom>57?"BTC SEASON":"NEUTRAL"],["Ethereum",data.ethDom,C.accent,data.ethBtcRatio>0.058?"ETH BREAKOUT":"ACCUMULATING"],["Stables",data.stableDom,C.green,data.stableDom<7?"RISK-ON":data.stableDom>10?"RISK-OFF":"NEUTRAL"],["Others",data.othersDom,C.purple,data.othersDom>22?"ALT EXPANSION":"ACCUMULATING"]].map(([lbl,val,clr,sig])=>(
              <div key={lbl} style={{padding:"16px",background:C.dim,borderRadius:"10px",border:`1px solid ${clr}22`}}>
                <Lbl size="9px" color={clr}>{lbl}</Lbl><div style={{...mono,fontSize:"28px",fontWeight:"800",color:clr,margin:"8px 0 4px",textShadow:`0 0 20px ${clr}55`}}>{fmt(val)}%</div>
                <div style={{marginBottom:"8px"}}><Badge color={clr}>{sig}</Badge></div><HBar value={val||0} max={65} color={clr}/>
              </div>
            ))}
          </div>
        </Panel>
        <Panel><PT>Dominance Interpretation</PT><div style={{display:"flex",flexDirection:"column",gap:"7px"}}>
          {[["BTC.D > 58%","BTC Season — Avoid alts.",C.red],["BTC.D 54–58%","Transition zone — Wait.",C.yellow],["BTC.D 48–54%","Alt rotation starting. ETH & L1s first.",C.accent],["BTC.D < 48%","Full alt season. Memes rally.",C.green],["STABLE > 10%","Risk-off. Potential bottom.",C.red],["STABLE < 6%","All-in. Market overheated.",C.yellow],["ETH.D ↑ + BTC.D ↓","ETH rotation confirmed.",C.accent]].map(([c,s,cl],i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"120px 1fr",gap:"10px",padding:"8px 10px",background:C.dim,borderRadius:"7px"}}>
              <div style={{...mono,fontSize:"9px",color:C.muted,borderRight:`1px solid ${C.border}`,paddingRight:"10px"}}>{c}</div>
              <div style={{...mono,fontSize:"10px",color:cl,fontWeight:"600"}}>{s}</div>
            </div>
          ))}
        </div></Panel>
        <Panel><PT>System Assessment</PT><div style={{padding:"14px",background:C.dim,borderRadius:"8px",marginBottom:"12px"}}><div style={{...mono,fontSize:"12px",color:data.altScore>60?C.green:data.altScore>40?C.yellow:C.red,lineHeight:"1.7"}}>{data.altScore>70?`Full altseason. BTC.D ${fmt(data.btcDom)}%, Stable.D ${fmt(data.stableDom)}%. Capital rotating aggressively into alts.`:data.altScore>50?`Early rotation. BTC.D ${fmt(data.btcDom)}%, ETH/BTC ${fmt(data.ethBtcRatio,4)}. Watch for mid-cap breakouts.`:`BTC-dominant. Score ${data.altScore}/100. Maintain BTC-heavy positioning.`}</div></div><AltGauge score={data.altScore}/></Panel>
      </div>}

      {/* ALERTS */}
      {tab==="alerts"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
        <Panel style={{gridColumn:"1/3"}}><PT right={<Badge color={C.accent}>Binance WebSocket · Real-time</Badge>}>🔔 Price Alert System</PT><PriceAlerts wsPrices={wsPrices}/></Panel>
        <Panel><PT>How Alerts Work</PT><div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
          {[["⚡","Real-time","Alerts check prices every tick via Binance WebSocket — instant detection."],["🔔","In-Browser","Alerts trigger visually. Keep this tab open."],["💾","Saved","Alerts persist in your browser — survive page reloads."],["🎯","Precise","Binance prices accurate to the cent."]].map(([icon,lbl,desc],i)=>(
            <div key={i} style={{display:"flex",gap:"10px",padding:"10px",background:C.dim,borderRadius:"7px"}}><span style={{fontSize:"16px"}}>{icon}</span><div><div style={{...mono,fontSize:"10px",color:C.text,fontWeight:"700"}}>{lbl}</div><div style={{...mono,fontSize:"9px",color:C.muted,marginTop:"2px"}}>{desc}</div></div></div>
          ))}
        </div></Panel>
      </div>}

      {/* HALVING */}
      {tab==="halving"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
        <Panel style={{gridColumn:"1/3"}}><HalvingCountdown/></Panel>
        <Panel><PT>What Halving Means</PT><div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
          {[["What is it?","Every ~4 years, BTC block rewards cut in half. Supply shock reduces miner selling pressure."],["Historical pattern","BTC historically enters a bull run 6–18 months post-halving. Alts tend to follow 3–6 months after BTC peaks."],["Current cycle","We're in the post-April 2024 halving cycle. Historically the strongest alt season occurs 12–18 months post-halving."],["Next halving","April 2028. Block reward drops from 3.125 → 1.5625 BTC per block."]].map(([lbl,desc],i)=>(
            <div key={i} style={{padding:"10px 12px",background:C.dim,borderRadius:"7px",borderLeft:`3px solid ${C.orange}`}}><div style={{...mono,fontSize:"9px",color:C.orange,marginBottom:"4px",fontWeight:"700"}}>{lbl}</div><div style={{...mono,fontSize:"10px",color:C.text,lineHeight:"1.6"}}>{desc}</div></div>
          ))}
        </div></Panel>
        {data&&<Panel><PT>Cycle Position</PT><div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
          {[{lbl:"Altseason Score",v:`${data.altScore}/100`,c:data.altScore>60?C.green:data.altScore>40?C.yellow:C.red},{lbl:"Market Phase",v:data.label,c:data.color},{lbl:"BTC Dominance",v:`${fmt(data.btcDom)}%`,c:C.orange},{lbl:"Days to Halving",v:`~${halvingData().days} days`,c:C.accent}].map((x,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px",background:C.dim,borderRadius:"7px"}}><Lbl size="9px">{x.lbl}</Lbl><div style={{...mono,fontSize:"14px",color:x.c,fontWeight:"700"}}>{x.v}</div></div>
          ))}
        </div></Panel>}
      </div>}

      {/* TRENDING */}
      {tab==="trending"&&data&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
        <Panel style={{gridColumn:"1/3"}}><PT right={<Badge color={C.accent}>CoinGecko</Badge>}>🔥 Trending Coins Right Now</PT><TrendingCoins trending={data.trending}/></Panel>
        <Panel><PT>Top Gainers (24h)</PT><div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
          {[...(data.coins||[])].sort((a,b)=>(b.price_change_percentage_24h||0)-(a.price_change_percentage_24h||0)).slice(0,7).map((c,i)=>(
            <div key={c.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",background:C.greenDim,border:`1px solid ${C.green}22`,borderRadius:"7px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>{c.image&&<img src={c.image} width="16" height="16" style={{borderRadius:"50%"}} alt=""/>}<Lbl size="9px" color={C.text} bold>{c.symbol?.toUpperCase()}</Lbl></div>
              <Chg v={c.price_change_percentage_24h}/>
            </div>
          ))}
        </div></Panel>
        <Panel><PT>Top Losers (24h)</PT><div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
          {[...(data.coins||[])].sort((a,b)=>(a.price_change_percentage_24h||0)-(b.price_change_percentage_24h||0)).slice(0,7).map((c,i)=>(
            <div key={c.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",background:C.redDim,border:`1px solid ${C.red}22`,borderRadius:"7px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>{c.image&&<img src={c.image} width="16" height="16" style={{borderRadius:"50%"}} alt=""/>}<Lbl size="9px" color={C.text} bold>{c.symbol?.toUpperCase()}</Lbl></div>
              <Chg v={c.price_change_percentage_24h}/>
            </div>
          ))}
        </div></Panel>
      </div>}

    </div>)}

    <div style={{textAlign:"center",padding:"16px",borderTop:`1px solid ${C.border}`,marginTop:"8px"}}>
      <Lbl size="8px">Capital Rotation Terminal · Binance WebSocket + CoinGecko + Alternative.me · Not Financial Advice</Lbl>
    </div>
  </div>);
}
