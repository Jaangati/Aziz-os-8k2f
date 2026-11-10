// Bounded, inspectable retrieval. Saved content is data, never executable instructions.
export function selectContext(entries,query,limit=40,maxCharacters=24000){
 const words=[...new Set(query.toLowerCase().split(/\W+/).filter(w=>w.length>2))];
 const eligible=entries.filter(e=>['memory','task','goal','note','transaction'].includes(e.kind));
 const ranked=eligible.map(e=>{const text=JSON.stringify(e.data).toLowerCase();return {e,score:words.reduce((n,w)=>n+(text.includes(w)?2:0),0)+(e.kind==='memory'?2:0)+(e.kind==='task'&&e.data.status==='open'?3:0)};}).sort((a,b)=>b.score-a.score||b.e.updated_at.localeCompare(a.e.updated_at));
 const records=[];let size=0;
 for(const {e} of ranked){const record={id:e.id,kind:e.kind,updated_at:e.updated_at,data:{...e.data,...(e.data.body?{body:e.data.body.slice(0,1500)}:{})}};const length=JSON.stringify(record).length;if(size+length>maxCharacters)continue;records.push(record);size+=length;if(records.length>=limit)break;}
 return {records,omitted:eligible.length-records.length};
}
