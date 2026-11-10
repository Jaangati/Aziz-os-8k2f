import Dashboard from './dashboard';
import {atlasUser} from '../lib/atlas-auth';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Home(){if(!await atlasUser())redirect('/login');return <Dashboard/>;}
