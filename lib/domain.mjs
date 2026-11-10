export function parseMinor(value) {
 const s=String(value).trim();
 if(!/^\d{1,10}(\.\d{1,2})?$/.test(s))throw new Error('Enter a positive amount with up to two decimal places.');
 const [whole,fraction='']=s.split('.');const n=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(n)||n<=0)throw new Error('Amount must be greater than zero.');return n;
}
export function monthKey(date=new Date(),timezone='Asia/Qatar'){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit'}).formatToParts(date);
 return parts.find(p=>p.type==='year').value+'-'+parts.find(p=>p.type==='month').value;
}
export function totals(entries,currency,month){
 const result={income:0,expense:0};
 for(const e of entries){if(e.kind==='transaction'&&e.data.currency===currency&&e.data.date.startsWith(month))result[e.data.direction]+=e.data.amount_minor;}
 return {...result,net:result.income-result.expense};
}
export function rankTasks(entries,now=Date.now()){
 return entries.filter(e=>e.kind==='task'&&e.data.status==='open').sort((a,b)=>{
 const score=e=>[e.data.due&&Date.parse(e.data.due)<=now?0:1,{high:0,normal:1,low:2}[e.data.priority],e.data.due?Date.parse(e.data.due):Infinity];
 const x=score(a),y=score(b);return (x[0]-y[0])||(x[1]-y[1])||(x[2]-y[2])||a.created_at.localeCompare(b.created_at);
 });
}
