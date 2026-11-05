import {defineConfig,devices} from "@playwright/test";
export default defineConfig({
  testDir:"./tests/browser",timeout:60000,expect:{timeout:16000},workers:1,retries:process.env.CI?1:0,reporter:"list",
  use:{baseURL:"http://127.0.0.1:4173",trace:"retain-on-failure",launchOptions:{args:["--enable-webgl","--use-gl=angle","--use-angle=swiftshader"]}},
  projects:[{name:"iphone-portrait",use:{...devices["iPhone 13"],browserName:"chromium"}},
            {name:"phone-landscape",use:{browserName:"chromium",viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:2}}],
  webServer:{command:"python3 -m http.server 4173 --bind 127.0.0.1",url:"http://127.0.0.1:4173",reuseExistingServer:!process.env.CI,timeout:20000}
});
