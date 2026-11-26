import {defaultDestinations} from '../shared/destinations.js';
import test from 'node:test';import assert from 'node:assert/strict';import worker from '../worker/index.js';
const valid={brand:'Pathway',heroTitle:'Hello',heroAccent:'World',heroDescription:'Welcome',address:'Bima Towers',email:'',phone:'',whatsapp:'',instagram:'',tiktok:'',testimonials:[],destinations:defaultDestinations};
let stored=null;const env={ADMIN_EMAIL:'owner@example.com',DB:{prepare(){return{first:async()=>stored?{content:stored}:null,bind(value){return{run:async()=>{stored=value}}}}}}};
const request=(data,email='owner@example.com',origin='https://site.test')=>new Request('https://site.test/api/content',{method:'PUT',headers:{'content-type':'application/json','origin':origin,'oai-authenticated-user-email':email},body:JSON.stringify(data)});
test('anonymous and other users cannot publish',async()=>{for(const email of['','viewer@example.com'])assert.equal((await worker.fetch(request(valid,email),env)).status,403)});
test('cross-origin writes are blocked',async()=>assert.equal((await worker.fetch(request(valid,undefined,'https://other.test'),env)).status,403));
test('owner changes persist and are publicly readable',async()=>{assert.equal((await worker.fetch(request(valid),env)).status,200);const r=await worker.fetch(new Request('https://site.test/api/content'),env);assert.deepEqual(await r.json(),valid)});
test('invalid group links and oversized testimonial lists are rejected',async()=>{assert.equal((await worker.fetch(request({...valid,whatsapp:'javascript:alert(1)'}),env)).status,400);assert.equal((await worker.fetch(request({...valid,testimonials:Array(21).fill({})}),env)).status,400)});

test('destination edits persist and empty lists can be published',async()=>{
 const destinations=[{name:'Japan',region:'Asia',tag:'Explore new ideas',text:'Study in Japan.',image:'https://example.com/japan.jpg'}];
 assert.equal((await worker.fetch(request({...valid,destinations}),env)).status,200);
 assert.deepEqual(JSON.parse(stored).destinations,destinations);
 assert.equal((await worker.fetch(request({...valid,destinations:[]}),env)).status,200);
 assert.deepEqual(JSON.parse(stored).destinations,[]);
});
test('invalid destination images and incomplete records are rejected',async()=>{
 for(const destinations of [[{...defaultDestinations[0],image:'javascript:alert(1)'}],[{...defaultDestinations[0],name:''}],Array(31).fill(defaultDestinations[0])])assert.equal((await worker.fetch(request({...valid,destinations}),env)).status,400);
});
