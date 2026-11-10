import {useEffect,useState} from 'react';
import {LayoutDashboard,CheckCircle2,Target,Wallet,Users,Brain,BookOpen,FolderLock,Sparkles,Settings,ChevronDown,Compass,HeartHandshake,Library,Shield,Orbit} from 'lucide-react';
export const navigationGroups=[
 {id:'command',label:'Command',icon:Compass,modules:[{id:'task',label:'Tasks',icon:CheckCircle2},{id:'goal',label:'Goals',icon:Target}]},
 {id:'finance',label:'Finance',icon:Wallet,modules:[{id:'transaction',label:'Money',icon:Wallet}]},
 {id:'relationships',label:'Relationships',icon:HeartHandshake,modules:[{id:'person',label:'Connections',icon:Users}]},
 {id:'knowledge',label:'Knowledge & Memory',icon:Library,modules:[{id:'note',label:'Journal',icon:BookOpen},{id:'memory',label:'Atlas Memory',icon:Brain}]},
 {id:'vault',label:'Vault',icon:Shield,modules:[{id:'document',label:'Documents',icon:FolderLock}]},
 {id:'atlas',label:'Atlas',icon:Orbit,modules:[{id:'assistant',label:'Assistant',icon:Sparkles},{id:'settings',label:'Settings & Security',icon:Settings}]}
];
export const sectionFor=(page:string)=>navigationGroups.find(g=>g.modules.some(m=>m.id===page));
export default function Navigation({page,navigate}:{page:string;navigate:(page:string)=>void}){
 const [collapsed,setCollapsed]=useState<string[]>([]);
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem('atlas-navigation-collapsed')||'[]');if(Array.isArray(saved))setCollapsed(saved.filter(id=>navigationGroups.some(g=>g.id===id)));}catch{}},[]);
 useEffect(()=>{const group=sectionFor(page);if(group)setCollapsed(old=>old.filter(id=>id!==group.id));},[page]);
 function toggle(id:string){setCollapsed(old=>{const next=old.includes(id)?old.filter(x=>x!==id):[...old,id];try{localStorage.setItem('atlas-navigation-collapsed',JSON.stringify(next));}catch{}return next;});}
 return <nav aria-label="Main navigation" className="grouped-navigation"><button className={'nav-item today-link '+(page==='today'?'active':'')} aria-current={page==='today'?'page':undefined} onClick={()=>navigate('today')}><LayoutDashboard/>Today</button><div className="navigation-sections">{navigationGroups.map(group=>{const Icon=group.icon,open=!collapsed.includes(group.id),active=group.modules.some(m=>m.id===page);return <section className={'navigation-group '+(active?'contains-current':'')} key={group.id}><button className="navigation-group-toggle" aria-expanded={open} aria-controls={'navigation-'+group.id} onClick={()=>toggle(group.id)}><Icon size={15}/><span>{group.label}</span><ChevronDown className={open?'expanded':''} size={13}/></button><div id={'navigation-'+group.id} hidden={!open} className="navigation-modules">{group.modules.map(module=>{const ModuleIcon=module.icon;return <button key={module.id} className={'nav-item '+(page===module.id?'active':'')} aria-current={page===module.id?'page':undefined} onClick={()=>navigate(module.id)}><ModuleIcon/>{module.label}</button>;})}</div></section>;})}</div></nav>;
}
