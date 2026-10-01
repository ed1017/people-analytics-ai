import test from "node:test";
import assert from "node:assert/strict";
import { PageBriefingCache } from "../lib/page-briefing-cache.ts";

test("unchanged context shares one request; different contexts serialize", async()=>{
 const c=new PageBriefingCache();let calls=0,active=0,max=0;const load=async()=>{calls++;active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,5));active--;return{text:"ok",error:null}};
 const a=c.get("page=workforce;country=AU",load),b=c.get("page=workforce;country=AU",load),d=c.get("page=skills;country=AU",load);assert.equal(a,b);await Promise.all([a,b,d]);assert.equal(calls,2);assert.equal(max,1);
});
test("errors do not auto-retry; explicit retry and expiration refresh",async()=>{
 let now=0,calls=0;const c=new PageBriefingCache(10,2,()=>now),load=async()=>{calls++;return{text:"",error:"Unavailable"}};
 await c.get("scope",load);await c.get("scope",load);assert.equal(calls,1);await c.get("scope",load,true);assert.equal(calls,2);now=11;await c.get("scope",load);assert.equal(calls,3);
});
test("cache evicts old contexts at its bound",async()=>{let calls=0;const c=new PageBriefingCache(1000,2),load=async()=>{calls++;return{text:"ok",error:null}};for(const key of ["a","b","c","a"])await c.get(key,load);assert.equal(calls,4)});

test("superseded queued work is not retained as a completed briefing",async()=>{const c=new PageBriefingCache();assert.equal(await c.get("old",async()=>null),null);assert.deepEqual(await c.get("old",async()=>({text:"fresh",error:null})),{text:"fresh",error:null})});
