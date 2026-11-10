import logo from '../assets/atlas-logo.png';
const image=logo as unknown as string|{src:string};
export const atlasLogo:string=typeof image==='string'?image:image.src;
export default function Brand(){return <img className="atlas-logo" src={atlasLogo} alt="Atlas Aziz" width="2048" height="680"/>;}
