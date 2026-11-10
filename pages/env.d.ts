interface ImportMetaEnv { readonly VITE_ATLAS_PAGES?: string; }

declare module '*.png' { const src:string; export default src; }
