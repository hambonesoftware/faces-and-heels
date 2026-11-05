import { test, expect } from "@playwright/test";
async function enterMatch(page) {
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/?demo=selected");
  await expect(page.locator(".game-shell")).toBeVisible({timeout:30000});
  const enter=page.locator("[data-start-match]");
  if (await enter.isVisible()) await enter.click();
  await expect(page.locator(".hb-play--broadcast")).toBeVisible({timeout:30000});
  expect(errors).toEqual([]);
}
test("wrestling ring, move dock, HUD and portraits fit a phone",async({page},testInfo)=>{
  await enterMatch(page);
  await expect(page.locator(".game-header")).toBeHidden();
  await expect(page.locator(".fighter-strip")).toBeVisible();
  await expect(page.locator(".arena-shell")).toBeVisible();
  await expect(page.locator(".hb-play__readout")).toHaveCount(3);
  await expect(page.locator(".tactical-menu-anchor")).toBeVisible();
  const m=await page.evaluate(()=>({w:document.documentElement.scrollWidth,v:window.innerWidth,h:document.querySelector(".arena-shell").getBoundingClientRect().height}));
  expect(m.w).toBeLessThanOrEqual(m.v+4);
  expect(m.h).toBeGreaterThan(190);
  await page.screenshot({path:"test-results/faces-play-"+testInfo.project.name+".png"});
});
test("actual match menu works in the new HUD",async({page})=>{
  await enterMatch(page);
  const menu=page.locator('.hb-play [data-drawer="menu"]');
  await menu.click();
  await expect(page.locator(".drawer")).toBeVisible();
  await page.locator(".drawer [data-close-drawer]").first().click();
  await expect(page.locator(".drawer")).toHaveCount(0);
  await expect(menu).toBeVisible();
});
