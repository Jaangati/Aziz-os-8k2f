import {useId,useState} from 'react';
import {ChartNoAxesCombined} from 'lucide-react';

type Day={date:string;spent:number;income:number};
export function MoneyCharts({days,categories,currency}:{days:Day[];categories:[string,number][];currency:string}){
 const gradientId=useId();
 const [selected,setSelected]=useState<number|null>(null);
 const values=days.map(day=>day.spent);
 const cumulative=values.map((_,i)=>values.slice(0,i+1).reduce((sum,n)=>sum+n,0));
 const last=Math.max(0,values.findLastIndex(amount=>amount!==0));
 const active=Math.min(selected??last,Math.max(0,days.length-1));
 const maximum=Math.max(1,...cumulative),minimum=Math.min(0,...cumulative),range=maximum-minimum;
 const point=(i:number)=>[i/Math.max(1,cumulative.length-1)*400,132-(cumulative[i]-minimum)/range*116];
 const path=cumulative.map((_,i)=>point(i).join(',')).join(' ');
 const [x,y]=point(active);
 const axis=new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1});
 const grid=[20,56,94,132];
 const fmt=new Intl.NumberFormat('en',{style:'currency',currency});
 const date=(iso:string)=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(iso+'T00:00:00Z'));
 const selectPoint=(svg:SVGSVGElement,clientX:number)=>{
  const rect=svg.getBoundingClientRect();
  const position=(clientX-rect.left)/Math.max(1,rect.width);
  setSelected(Math.max(0,Math.min(days.length-1,Math.round(position*(days.length-1)))));
 };
 const positive=categories.filter(([,amount])=>amount>0);
 return <article className="finance-panel money-chart cumulative-chart">
  <header><span className="activity-icon"><ChartNoAxesCombined size={18}/></span><div><h2>Spending this month</h2><small>Running total after refunds</small></div></header>
  {days.length>0&&<><div className="cumulative-value"><strong>{fmt.format(cumulative[active]/100)}</strong><small>Through {date(days[active].date)}</small></div>
   <div className="chart-axis-frame"><div className="chart-axis-labels" aria-hidden="true">{grid.map(v=><span key={v} style={{top:v/140*100+'%'}}>{axis.format((minimum+(132-v)/116*range)/100)}</span>)}</div><svg viewBox="0 0 400 140" preserveAspectRatio="none" role="img" aria-label={'Cumulative spending: '+fmt.format((cumulative.at(-1)||0)/100)} className="cumulative-plot" onPointerMove={event=>{if(event.pointerType!=='touch')selectPoint(event.currentTarget,event.clientX);}} onClick={event=>selectPoint(event.currentTarget,event.clientX)}>
    <defs><linearGradient id={gradientId} x2="0%" y2="100%"><stop stopColor="#aa8bd6" stopOpacity=".37"/><stop offset="100%" stopColor="#dccbef" stopOpacity=".04"/></linearGradient></defs>
    {grid.map(v=><line key={v} x1="0" x2="400" y1={v} y2={v} stroke="#dfdbd1"/>)}
    <polygon points={'0,140 '+path+' 400,140'} fill={'url(#'+gradientId+')'}/>
    <polyline points={path} fill="none" stroke="#7658a3" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round"/>
    <line x1={x} x2={x} y1={y} y2="140" stroke="#756582" strokeDasharray="3 4"/>
    <line x1="0" x2="400" y1={y} y2={y} stroke="#a095ad" strokeDasharray="3 4"/><circle cx={x} cy={y} r="4.5" fill="#fff" stroke="#7658a3" strokeWidth="2.3"/>
   </svg></div>
   <input type="range" aria-label="Day of month for spending total" aria-valuetext={date(days[active].date)+' · '+fmt.format(cumulative[active]/100)} min="1" max={days.length} value={active+1} onChange={e=>setSelected(Number(e.target.value)-1)}/>
   <div className="cumulative-dates"><span>{date(days[0].date)}</span><span>{date(days.at(-1)!.date)}</span></div></>}
  {positive.length>0&&<details className="spending-breakdown"><summary>Spending by category</summary><ul>{positive.slice(0,5).map(([category,amount])=><li key={category}>{category}<strong>{fmt.format(amount/100)}</strong></li>)}</ul></details>}
 </article>;
}
