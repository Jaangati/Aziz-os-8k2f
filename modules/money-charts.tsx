import {useState} from 'react';
import {BarChart3,ChartNoAxesColumnIncreasing} from 'lucide-react';

type Day={date:string;spent:number;income:number};
export function MoneyCharts({days,categories,currency}:{days:Day[];categories:[string,number][];currency:string}){
 const [selected,setSelected]=useState<string|null>(null);
 const active=days.find(day=>day.date===selected)||days.reduce<Day|undefined>((largest,day)=>!largest||Math.max(Math.abs(day.spent),day.income)>Math.max(Math.abs(largest.spent),largest.income)?day:largest,undefined);
 const value=new Intl.NumberFormat('en',{style:'currency',currency});
 const axis=new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1});
 const peak=Math.max(1,...days.flatMap(day=>[Math.abs(day.spent),day.income]))/100;
 const magnitude=10**Math.floor(Math.log10(peak));
 const step=Math.max(1,Math.ceil(peak/(magnitude*4))*magnitude);
 const ceiling=step*4;
 const date=(iso:string)=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(iso+'T00:00:00Z'));
 const positive=categories.filter(([,amount])=>amount>0);
 const total=positive.reduce((sum,[,amount])=>sum+amount,0);
 return <div className="money-charts">
  <article className="finance-panel money-chart">
   <header><span className="activity-icon"><BarChart3 size={18}/></span><div><h2>Daily cash flow</h2><small>{currency} · {active?date(active.date):'Selected month'}</small></div></header>
   <div className="chart-readout"><span><i/>Net spending <strong>{value.format((active?.spent||0)/100)}</strong></span><span><i/>Income <strong>{value.format((active?.income||0)/100)}</strong></span></div>
   <div className="chart-area">
    <div className="chart-scale" aria-hidden="true">{[4,3,2,1,0].map(i=><span key={i}>{axis.format(i*step)}</span>)}</div>
    <div className="chart-plot">
     <div className="chart-gridlines" aria-hidden="true">{[4,3,2,1,0].map(i=><i key={i}/>)}</div>
     <div className="chart-days" style={{gridTemplateColumns:'repeat('+days.length+',minmax(0,1fr))'}}>{days.map(day=><button type="button" key={day.date} className={day.date===active?.date?'selected':''} onClick={()=>setSelected(day.date)} onFocus={()=>setSelected(day.date)} onMouseEnter={()=>setSelected(day.date)} aria-label={date(day.date)+', net spending '+value.format(day.spent/100)+', income '+value.format(day.income/100)} title={date(day.date)+' · '+value.format(day.spent/100)}>
      <i className={day.spent<0?'refund':''} style={{height:Math.abs(day.spent)/ceiling+'%'}}/><i style={{height:day.income/ceiling+'%'}}/>
     </button>)}</div>
     <div className="chart-dates" aria-hidden="true">{[1,5,10,15,20,25,days.length].map(day=><span key={day}>{day}</span>)}</div>
    </div>
   </div>
  </article>
  <article className="finance-panel money-chart">
   <header><span className="activity-icon"><ChartNoAxesColumnIncreasing size={18}/></span><div><h2>Spending by category</h2><small>Top categories</small></div></header>
   <div className="chart-ranking">{positive.slice(0,5).map(([category,amount])=><div key={category}>
    <div><span>{category}</span><strong>{value.format(amount/100)}</strong></div>
    <div className="chart-track" aria-label={Math.round(amount/total*100)+' percent of positive category spending'}><i style={{width:amount/total*100+'%'}}/></div>
   </div>)}</div>
   {!positive.length&&<p>No spending recorded for this month.</p>}
  </article>
 </div>;
}
