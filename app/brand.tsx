import logo from '../assets/atlas-logo.png';
export const atlasLogo:string=typeof logo==='string'?logo:logo.src;
export default function Brand(){return <img className="atlas-logo" src={atlasLogo} alt="Atlas Aziz" width="2048" height="680"/>;}
