import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const site='https://www.parrotverse.app/';
const pages=['','about/','where-pets-stay/','preparing-for-their-stay/'];
const decode=s=>s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#x27;',"'");
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>[x[1],decode(x[2])]));
function jpegSize(b){assert.equal(b.readUInt16BE(0),0xffd8,'Not a JPEG');let i=2;while(i<b.length){if(b[i++]!==255)continue;let m=b[i++];if(m===0xd9||m===0xda)break;if(m===0xd8||m===1)continue;const n=b.readUInt16BE(i);if([0xc0,0xc1,0xc2].includes(m))return [b.readUInt16BE(i+5),b.readUInt16BE(i+3)];i+=n;}throw Error('JPEG dimensions missing');}
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,url+' must load');return r;}
export async function checkSeo({directory}={}){
 const titles=new Set(),descriptions=new Set(),images=new Set();
 for(const p of pages){
  const html=directory?await fs.readFile(path.join(directory,p,'index.html'),'utf8'):await (await get(site+p)).text();
  const label=p||'home';const title=decode(html.match(/<title>(.*?)<\/title>/s)?.[1]||'');assert.ok(title.length>15&&title.length<80,label+' needs a useful title');assert.ok(!titles.has(title),'Duplicate page title');titles.add(title);
  const tags=[...html.matchAll(/<meta\b[^>]*>/g)].map(x=>attrs(x[0]));const meta=key=>tags.find(x=>x.name===key||x.property===key)?.content;
  const description=meta('description');assert.ok(description&&description.length>=80&&description.length<=180,label+' description');assert.ok(!descriptions.has(description),'Duplicate description');descriptions.add(description);
  const links=[...html.matchAll(/<link\b[^>]*>/g)].map(x=>attrs(x[0]));assert.equal(links.find(x=>x.rel==='canonical')?.href,site+p,label+' canonical');
  assert.equal(meta('og:url'),site+p);assert.equal(meta('og:title'),title);assert.equal(meta('og:description'),description);assert.equal(meta('twitter:title'),title);assert.equal(meta('twitter:description'),description);assert.equal(meta('twitter:card'),'summary_large_image');
  assert.equal(meta('og:image'),meta('twitter:image'));assert.equal(meta('og:image'),meta('og:image:secure_url'));assert.match(meta('og:image')||'',/^https:\/\//);assert.match(meta('og:image')||'',/parrotverse-social-v2\.jpg$/);assert.equal(meta('og:image:width'),'1200');assert.equal(meta('og:image:height'),'630');assert.equal(meta('og:image:type'),'image/jpeg');assert.ok(meta('og:image:alt')&&meta('twitter:image:alt'));images.add(meta('og:image'));
  assert.ok(!/noindex/.test(meta('robots')||''));assert.match(meta('robots')||'',/max-image-preview:large/);assert.equal((html.match(/<h1\b/g)||[]).length,1);assert.match(html,/<html[^>]+lang="en-GB"/);
  const graphs=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(x=>JSON.parse(x[1]));const nodes=graphs.flatMap(x=>x['@graph']||[x]);
  assert.ok(nodes.some(x=>x['@type']==='LocalBusiness'),label+' business schema');assert.ok(nodes.some(x=>['WebPage','AboutPage'].includes(x['@type'])&&x.url===site+p),label+' page schema');if(p)assert.ok(nodes.some(x=>x['@type']==='BreadcrumbList'),label+' breadcrumbs');
  for(const tag of html.matchAll(/<img\b[^>]*>/g)){const a=attrs(tag[0]);assert.ok(a.alt&&a.width&&a.height,label+' image accessibility and dimensions');}
 }
 for(const url of images){let b;try{b=await fs.readFile(path.join('public/images',new URL(url).pathname.split('/').at(-1)));}catch{const r=await get(url);assert.match(r.headers.get('content-type')||'',/image\/jpeg/);b=Buffer.from(await r.arrayBuffer());}assert.deepEqual(jpegSize(b),[1200,630]);assert.ok(b.length<300000,'Social image should stay small');}
 const sitemap=directory?await fs.readFile(path.join(directory,'sitemap.xml'),'utf8'):await (await get(site+'sitemap.xml')).text();for(const p of pages)assert.ok(sitemap.includes('<loc>'+site+p+'</loc>'));
 const robots=directory?await fs.readFile(path.join(directory,'robots.txt'),'utf8'):await (await get(site+'robots.txt')).text();assert.ok(robots.includes('Sitemap: '+site+'sitemap.xml'));assert.ok(!/Disallow:\s*\/\s*$/m.test(robots));
 console.log('PASS: four unique page titles/descriptions, canonicals, indexing, social tags, new 1200×630 JPEG, page/business schemas, breadcrumbs, image descriptions and sitemap.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const i=process.argv.indexOf('--directory');await checkSeo({directory:i>=0?process.argv[i+1]:undefined});}
