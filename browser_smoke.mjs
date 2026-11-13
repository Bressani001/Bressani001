import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const browser = await chromium.launch({headless:true});
const page = await browser.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',msg=>{ if(msg.type()==='error') errors.push(msg.text()); });

const url=pathToFileURL(path.resolve('index.html')).href;
await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
await page.waitForSelector('#page-home.active',{timeout:5000});

// Critical regression: UI must respond before the heavy embedded base finishes.
const clickStarted=Date.now();
await page.click('[data-page="search"]',{timeout:2500});
await page.waitForSelector('#page-search.active',{timeout:2500});
const firstClickMs=Date.now()-clickStarted;
if(firstClickMs>2500) throw new Error('UI blocked during startup: '+firstClickMs+'ms');

await page.click('[data-page="home"]');
await page.waitForFunction(()=>window.PrismaCore?.isReady?.('catalog')===true,{timeout:90000});
const counts=await page.evaluate(()=>window.PrismaCore.stats());
if(counts.points!==95520) throw new Error('Expected 95520 points after catalog ready, got '+counts.points);
if(counts.machines!==42431) throw new Error('Expected 42431 machines after catalog ready, got '+counts.machines);

// Search should work as soon as the primary index is ready.
await page.click('[data-page="search"]');
await page.fill('#globalSearch','78670');
await page.click('#doSearch');
await page.waitForFunction(()=>document.querySelectorAll('#searchOutput .result').length>0,{timeout:15000});

// Map waits for point details, but the rest of the UI remains responsive.
await page.click('[data-page="map"]');
await page.waitForFunction(()=>window.PrismaCore?.isReady?.('pointDetails')===true,{timeout:90000});
await page.waitForSelector('#mapCanvas',{timeout:10000});
await page.waitForFunction(()=>document.querySelector('#mapTotalCount')?.textContent?.length>0,{timeout:10000});

// WhatsApp-dependent page unlocks later.
await page.waitForFunction(()=>window.PrismaCore?.isReady?.('whatsapp')===true,{timeout:90000});
await page.click('[data-page="groups"]');
await page.waitForSelector('#page-groups.active',{timeout:10000});

if(errors.length) throw new Error('Browser errors: '+errors.slice(0,5).join(' | '));
console.log('FIRST_CLICK_MS='+firstClickMs);
console.log('COUNTS='+JSON.stringify(counts));
console.log('PRISMA V13.1 BROWSER SMOKE: OK');
await browser.close();
