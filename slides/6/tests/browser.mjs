import {createServer} from 'node:http'
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises'
import {resolve,extname,basename} from 'node:path'
import {chromium} from 'playwright-chromium'
const root=process.cwd(),out=process.env.SLIDE_QA_DIR||'/tmp/inf8422-build/qa'+basename(root)
await mkdir(out,{recursive:true})
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf','.woff':'font/woff','.woff2':'font/woff2','.json':'application/json'}
const server=createServer(async(req,res)=>{try{const path=resolve(root,'dist','.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!path.startsWith(resolve(root,'dist')+'/')&&path!==resolve(root,'dist'))throw Error('path');const file=(await stat(path)).isDirectory()?resolve(path,'index.html'):path;res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(await readFile(file))}catch{res.statusCode=404;res.end('not found')}})
await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r)});const base=`http://127.0.0.1:${server.address().port}`
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']})
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1})
await page.addInitScript(()=>localStorage.setItem('slidev-wake-lock','false'))
const errors=[],requests=[],overflows=[],pages=[]
page.on('pageerror',e=>errors.push({slide:page.url(),error:e.message}));page.on('console',m=>{if(m.type()==='error')errors.push({slide:page.url(),error:m.text()})})
await page.route('**/*',r=>{if(r.request().url().startsWith(base)||r.request().url().startsWith('data:'))r.continue();else{requests.push(r.request().url());r.abort()}})
const coverage=JSON.parse(await readFile(resolve(root,'coverage.json'),'utf8'))
const limit=Number(process.env.SLIDE_QA_LIMIT||coverage.total)
await page.goto(base+'/#/1');await page.waitForSelector('.slidev-layout');await page.evaluate(()=>document.fonts.ready)
for(let i=1;i<=limit;i++){
 await page.goto(base+'/#/'+i);await page.waitForTimeout(100)
 const layout=page.locator('.slidev-page:not(.slidev-page-inactive) .slidev-layout').first()
 // Slidev renders neighbouring pages too. Choose the page matching the route.
 const info=await page.evaluate((i)=>{
  const candidates=[...document.querySelectorAll('.slidev-layout')];
  const el=candidates.find(e=>e.closest('.slidev-page')?.getAttribute('data-slidev-no')===String(i))||candidates.find(e=>e.getBoundingClientRect().left>=-1&&e.getBoundingClientRect().left<50)||candidates[0];
  const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT); const rawMath=[];
  while(walker.nextNode()){const node=walker.currentNode;if(!node.parentElement?.closest('pre,code,textarea,script,style,.katex')&&/\$[^$\n]+\$/.test(node.textContent))rawMath.push(node.textContent.slice(0,100));}
  const r=el.getBoundingClientRect();
  const outside=[...el.querySelectorAll('p,li,table,pre,img,svg,button,label,h1,h2,h3')].filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&(b.right>r.right+3||b.bottom>r.bottom-18||b.left<r.left-3)}).map(e=>({tag:e.tagName,text:(e.textContent||e.getAttribute('alt')||'').slice(0,90),bottom:Math.round(e.getBoundingClientRect().bottom-r.bottom),right:Math.round(e.getBoundingClientRect().right-r.right)}));
  for(const t of el.querySelectorAll('.demo-frame svg text')) { const b=t.getBoundingClientRect(),v=t.closest('svg').getBoundingClientRect(); if(b.left<v.left-4||b.right>v.right+4||b.top<v.top-4||b.bottom>v.bottom+4) outside.push({tag:'SVG_TEXT',text:t.textContent.slice(0,100)}); }
  for(const c of el.querySelectorAll('.lesson-columns > div')) if(c.scrollWidth>c.clientWidth+3) outside.push({tag:'COLUMN',text:c.textContent.slice(0,100),overflow:c.scrollWidth-c.clientWidth});
  return {rawMath,title:el.querySelector('h1')?.textContent,slide:i,rect:{width:r.width,height:r.height},outside,broken:[...el.querySelectorAll('img')].filter(x=>!x.complete||x.naturalWidth===0).map(x=>x.src),katex:el.querySelectorAll('.katex-error').length,interactive:el.querySelectorAll('input,button,select').length,html:i===1?el.parentElement.outerHTML.slice(0,1000):undefined}
 },i)
 if(info.rawMath.length)errors.push({slide:i,error:'Notation mathématique non rendue',text:info.rawMath});
 const host=page.locator(`[data-slidev-no="${i}"] .slidev-layout`)
 const assertText=async(regex,label)=>{if(!regex.test(await host.innerText()))errors.push({slide:i,error:'Interaction : '+label,observed:await host.innerText()})}
 if(info.title==='Cartes de points dans un repère commun'){
  const points=host.locator('.dust-svg g circle');
  if(await points.count()!==60)errors.push({slide:i,error:'Deux cartes de trente points attendues'});
  const opacity=await points.first().evaluate(c=>Number(getComputedStyle(c).opacity));
  if(Math.abs(opacity-.7)>1e-6)errors.push({slide:i,error:'Opacité des points incorrecte',observed:opacity});
 }
 if(info.title==='Hiérarchie d’un graphe de scène'){
  const points=host.locator('.sg-svg circle');
  if(await points.count()!==18)errors.push({slide:i,error:'Dix-huit points attendus'});
  const opacity=await points.first().evaluate(c=>Number(getComputedStyle(c).opacity));
  if(Math.abs(opacity-.9)>1e-6)errors.push({slide:i,error:'Opacité du graphe incorrecte',observed:opacity});
  for(let j=0;j<3;j++)await host.locator('.sg-btn-main').click();
  await assertText(/1 nœud\(s\) à ce niveau/,'abstraction du graphe');
 }
 if(info.title==='Appariement de coût total minimal'){
  for(let step=0;step<5;step++)await host.getByRole('button',{name:'Étape',exact:true}).click()
  if(await host.locator('td.chosen').count()!==3)errors.push({slide:i,error:'Appariement : trois paires attendues'})
  await assertText(/Coût original : 2 \+ 1 \+ 2 = 5/,'coût optimal')
 }
 if(info.title==='Température et poids contrastifs')await assertText(/0\.511/,'perte InfoNCE initiale')
 if(info.title==='Scores et poids d’attention')await assertText(/2\.364/,'moyenne pondérée initiale')
 if(info.title==='Échantillonnage bilinéaire différentiable')await assertText(/Intensité interpolée : 0\.450/,'interpolation bilinéaire')
 if(info.title==='Taux de masquage et cibles de reconstruction')await assertText(/16 tokens visibles/,'nombre de patchs visibles')
 if(info.title==='Régions parcourues et régions non étiquetées'){
  await host.getByRole('button',{name:'Révéler le terrain caché',exact:true}).click()
  await assertText(/praticable non visité/,'positifs et inconnus')
 }
 if(info.title==='Nombre d’hypothèses et métriques oracle'){
  await assertText(/minADE = 0\.000/,'couverture des deux modes')
  await host.getByLabel('Nombre de futurs').fill('1')
  if(/minADE = 0\.000/.test(await host.innerText()))errors.push({slide:i,error:'Une seule hypothèse doit manquer le mode inférieur'})
 }
 if(await host.locator('.demo-frame').count()){
  await host.getByRole('button',{name:'Réinitialiser la démonstration',exact:true}).click()
  await page.waitForTimeout(40)
 }
 const listStyles=await host.locator('.slidev-toc ol').evaluateAll(xs=>xs.map(e=>getComputedStyle(e).listStyleType))
 if(listStyles.some(s=>s!=='disc'))errors.push({slide:i,error:'Plan avec numérotation visible'})

 pages.push(info);if(info.outside.length||info.broken.length||info.katex)overflows.push(info)
 if(info.interactive){
  const inputs=page.locator(`[data-slidev-no="${i}"] .slidev-layout input[type="range"]`);for(let j=0;j<await inputs.count();j++)for(const edge of ['min','max'])await inputs.nth(j).evaluate((e,edge)=>{e.value=e[edge]||'1';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},edge)
 }
 if(true)await page.screenshot({path:resolve(out,String(i).padStart(3,'0')+'.png')})
}
await writeFile(resolve(out,'report.json'),JSON.stringify({deck:basename(root),slides:pages.length,errors,externalRequests:requests,overflows,pages},null,2))
console.log(JSON.stringify({deck:basename(root),slides:pages.length,errors,externalRequests:requests,overflows:overflows.map(x=>({slide:x.slide,title:x.title,outside:x.outside,broken:x.broken,katex:x.katex}))},null,2))
await browser.close();await new Promise(r=>server.close(r))
if(errors.length||requests.length||overflows.length)process.exitCode=1
