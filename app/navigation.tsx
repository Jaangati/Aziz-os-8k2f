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
 return <nav aria-label="Main navigation" className="grouped-navigation"><button className={'nav-item today-link '+(page==='today'?'active':'')} aria-current={page==='today'?'page':undefined} onClick={()=>navigate('today')}><LayoutDashboard/>Today</button><div className="navigation-sections">{navigationGroups.map(group=>{const Icon=group.icon,active=group.modules.some(m=>m.id===page);return <section className={'navigation-group '+(active?'contains-current':'')} key={group.id}><div className="navigation-group-heading"><Icon size={13}/><span>{group.label}</span></div><div id={'navigation-'+group.id} className="navigation-modules">{group.modules.map(module=>{const ModuleIcon=module.icon;return <button key={module.id} className={'nav-item '+(page===module.id?'active':'')} aria-current={page===module.id?'page':undefined} onClick={()=>navigate(module.id)}><ModuleIcon/>{module.label}</button>;})}</div></section>;})}</div></nav>;
}
