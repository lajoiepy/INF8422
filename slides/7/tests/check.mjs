import {readFileSync,existsSync,readdirSync} from 'node:fs'
import {resolve,basename} from 'node:path'
import {load} from '@slidev/parser/fs'
const root=process.cwd(),fail=[]
const data=await load({roots:[root],userRoot:root},resolve(root,'slides.md'))
if(!readFileSync('slides.md','utf8').includes('listStyle="disc"'))fail.push('Plan numéroté implicitement')
const coverage=JSON.parse(readFileSync('coverage.json','utf8'))
if(data.slides.length!==coverage.total)fail.push(`Compte Slidev ${data.slides.length} ≠ inventaire ${coverage.total}`)
if(data.slides.length>150)fail.push('Plus de 150 diapositives')
const pattern=/(?:cours|chapitre|section|diapo(?:sitive)?)\s+(?:n[°o]\s*)?\d|(?:cours|chapitre|section|diapo(?:sitive)?)\s+(?:précédent|suivant|prochain)|(?:précédent|prochain)\s+(?:cours|chapitre|section)/i
const files=['slides.md',...readdirSync('sections').filter(x=>x.endsWith('.md')).map(x=>'sections/'+x),...readdirSync('components').filter(x=>x.endsWith('.vue')).map(x=>'components/'+x)]
let notes=0
for(const f of files){const s=readFileSync(f,'utf8');if(pattern.test(s))fail.push(`Renvoi positionnel : ${f}`);notes+=(s.match(/<!--/g)||[]).length;for(const m of s.matchAll(/src="\.\/images\/([^"]+)"/g))if(!existsSync('images/'+m[1]))fail.push(`Image absente : ${m[1]}`)}
const refs=JSON.parse(readFileSync('images/sources.json','utf8'))
for(const r of refs)if(!existsSync('images/'+r.file))fail.push(`Figure documentée absente ${r.file}`)
// Résoudre à nouveau les imports dans un ordre différent, sans modifier les sources.
const entry=resolve(root,'slides.md'),s=readFileSync(entry,'utf8'),blocks=[...s.matchAll(/---\nsrc: \.\/sections\/[^\n]+\n---\n/g)].map(x=>x[0])
const first=s.indexOf(blocks[0]);const reordered=s.slice(0,first)+[...blocks].reverse().join('\n')
const swapped=await load({roots:[root],userRoot:root},entry,async p=>p===entry?reordered:readFileSync(p,'utf8'))
if(swapped.slides.length!==data.slides.length)fail.push('Permutation des imports : compte différent')
const report={deck:basename(root),slides:data.slides.length,sections:coverage.counts,figures:refs.length,notes,permutation:'ok',failures:fail}
console.log(JSON.stringify(report,null,2));if(fail.length)process.exitCode=1
