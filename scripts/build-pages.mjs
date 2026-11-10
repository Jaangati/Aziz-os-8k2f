import {execFileSync} from 'node:child_process';
import {cpSync,rmSync,writeFileSync} from 'node:fs';
execFileSync(process.execPath,['node_modules/vite/bin/vite.js','build','--config','vite.pages.config.ts'],{stdio:'inherit'});
rmSync('pages-assets',{recursive:true,force:true});
cpSync('pages-dist/pages-assets','pages-assets',{recursive:true});
cpSync('pages-dist/index.html','index.html');
writeFileSync('.nojekyll','');
