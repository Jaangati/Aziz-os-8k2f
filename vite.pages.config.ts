import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({root:'pages',base:'/Aziz-os-8k2f/',plugins:[react()],define:{'import.meta.env.VITE_ATLAS_PAGES':JSON.stringify('true')},build:{assetsDir:'pages-assets',outDir:'../pages-dist',emptyOutDir:true}});
