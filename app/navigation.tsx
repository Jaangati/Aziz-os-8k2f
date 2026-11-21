import {LayoutDashboard,CheckCircle2,Target,Wallet,Users,Brain,BookOpen,FolderLock,Sparkles,Settings,ChevronDown,Compass,HeartHandshake,Library,Shield,Orbit} from 'lucide-react';
export const navigationGroups=[
 {id:'daily',label:'Daily',icon:Compass,modules:[{id:'transaction',label:'Money',icon:Wallet},{id:'task',label:'Tasks',icon:CheckCircle2},{id:'assistant',label:'Assistant',icon:Sparkles}]},
 {id:'workspace',label:'Workspace',icon:Library,modules:[{id:'goal',label:'Goals',icon:Target},{id:'guardian',label:'Guardian',icon:Shield},{id:'person',label:'Connections',icon:Users},{id:'note',label:'Journal',icon:BookOpen},{id:'memory',label:'Atlas Memory',icon:Brain},{id:'document',label:'Documents',icon:FolderLock}]},
 {id:'account',label:'Account',icon:Settings,modules:[{id:'settings',label:'Settings & Security',icon:Settings}]}
];
export const sectionFor=(page:string)=>navigationGroups.find(g=>g.modules.some(m=>m.id===(page==='receipt'?'transaction':page)));
export default function Navigation({page,navigate}:{page:string;navigate:(page:string)=>void}){
 const activePage=page==='receipt'?'transaction':page;
 return <nav aria-label="Main navigation" className="grouped-navigation"><button className={'nav-item today-link '+(page==='today'?'active':'')} aria-current={page==='today'?'page':undefined} onClick={()=>navigate('today')}><LayoutDashboard/>Today</button><div className="navigation-sections">{navigationGroups.map(group=>{const Icon=group.icon,active=group.modules.some(m=>m.id===activePage);return <section className={'navigation-group '+(active?'contains-current':'')} key={group.id}><div className="navigation-group-heading"><Icon size={13}/><span>{group.label}</span></div><div id={'navigation-'+group.id} className="navigation-modules">{group.modules.map(module=>{const ModuleIcon=module.icon;return <button key={module.id} className={'nav-item '+(activePage===module.id?'active':'')} aria-current={activePage===module.id?'page':undefined} onClick={()=>navigate(module.id)}><ModuleIcon/>{module.label}</button>;})}</div></section>;})}</div></nav>;
}
