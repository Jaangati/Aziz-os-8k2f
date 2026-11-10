import { AsyncLocalStorage } from 'node:async_hooks';
export type Runtime = { ATLAS_BRIDGE_KEY?: string; SUPABASE_URL?: string; SUPABASE_PUBLISHABLE_KEY?: string; OPENAI_API_KEY?: string; OPENAI_MODEL?: string };
const runtime = new AsyncLocalStorage<Runtime>();
export const withRuntime = <T,>(env: Runtime, callback: () => T) => runtime.run(env, callback);
export const getRuntime = () => runtime.getStore() || {};
