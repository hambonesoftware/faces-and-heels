import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PLAY_VERSION, calculateSafeRect } from "./vendor/hambone-play/hambone-play.js";
const app = readFileSync("app.js", "utf8");
const css = readFileSync("play-broadcast.css", "utf8");
test("shared HUD version and match controls are retained", () => {
  assert.equal(PLAY_VERSION, "1.0.0");
  assert.match(app, /playHud\?\.destroy\(\)/);
  assert.match(app, /hud\.placeControl\(menuButton,"utilities"\)/);
  assert.match(app, /renderDecisionDock\(\)/);
  assert.match(app, /new IsoStage\(canvas\)/);
  assert.match(css, /arena-combat-zone \.tactical-menu-anchor\{z-index:19\}/);
});
test("safe frame remains valid on phone",()=>{
  const r=calculateSafeRect(390,844,[{left:0,top:0,right:315,bottom:52},{left:0,top:690,right:390,bottom:844}]);
  assert.ok(r.width>0&&r.height>0&&r.y>52);
});
