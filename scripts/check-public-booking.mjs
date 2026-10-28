import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const origins=['https://www.parrotverse.app','https://parrotverse.app'];
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Europe/London'});
async function request(url,init={}){
  let error;for(let i=0;i<3;i++){try{return await fetch(url,{...init,redirect:'manual',signal:AbortSignal.timeout(12000)});}catch(e){error=e;}}
  throw error;
}
export async function checkPublicBooking({serviceOrigin,html}={}){
  if(!html&&!serviceOrigin){const r=await request(origins[0]+'/?health='+Date.now());assert.equal(r.status,200,'Website must load');html=await r.text();}
  if(html){const origin=html.match(/<meta name="parrotverse-service-origin" content="([^"]+)"/)?.[1];assert.ok(origin,'Missing public service address');if(serviceOrigin)assert.equal(origin,serviceOrigin);serviceOrigin=origin;assert.ok(!html.includes('agileskunk11'),'Retired service address in published HTML');}
  assert.ok(/^https:\/\/[a-z0-9.-]+\.chatgpt\.site$/.test(serviceOrigin),'Invalid service address');
  const start=today();const end=new Date(Date.parse(start)+366*86400000).toISOString().slice(0,10);
  for(const origin of origins){
    const r=await request(serviceOrigin+`/api/availability?start=${start}&end=${end}`,{headers:{Origin:origin}});
    assert.equal(r.status,200,'Availability must respond directly, without a redirect');
    assert.equal(r.headers.get('access-control-allow-origin'),origin,'Browser calendar access is missing');
    assert.match(r.headers.get('content-type')||'',/application\/json/);
    assert.match(r.headers.get('cache-control')||'',/no-store/,'Availability must not be cached');
    const d=await r.json();assert.equal(typeof d.enabled,'boolean');assert.equal(d.days.length,367,'Incomplete calendar');
    for(let i=0;i<d.days.length;i++){assert.equal(d.days[i].date,new Date(Date.parse(start)+i*86400000).toISOString().slice(0,10));assert.ok(Number.isInteger(d.days[i].remaining)&&d.days[i].remaining>=0);}
    assert.equal(typeof d.settings?.enabled,'boolean');
    for(const endpoint of ['/api/reservations','/api/guest-request']){
      const p=await request(serviceOrigin+endpoint,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}});
      assert.equal(p.status,204,'Booking preflight must not redirect');assert.equal(p.headers.get('access-control-allow-origin'),origin);assert.match(p.headers.get('access-control-allow-methods')||'',/POST/);assert.match(p.headers.get('access-control-allow-headers')||'',/content-type/i);
    }
  }
  console.log('PASS: live calendar, complete dates, direct service URL, both public origins, no cache and booking preflight.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const local=process.argv.indexOf('--html');const origin=process.argv.indexOf('--service');
 await checkPublicBooking({html:local>=0?await fs.readFile(process.argv[local+1],'utf8'):undefined,serviceOrigin:origin>=0?process.argv[origin+1]:undefined});
}
