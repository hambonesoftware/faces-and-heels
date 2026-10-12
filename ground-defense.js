/** Low-control recovery window after High declines an immediate pin.
 * Position (prone) differs from advantage (H/L). The defender may still act.
 * Both choices finish the defense window; High only attacks afterwards.
 */
export const GROUND_SCRAMBLE_COST=2;
export const GROUND_GUARD_VALUE=3;
export function groundDefenseWindow(state){
  if(state?.phase!=='GROUND_DEFENSE'||!state.groundDefense)return null;
  const {defenderId,controllerId}=state.groundDefense;
  const defender=state.wrestlers?.[defenderId],holder=state.wrestlers?.[controllerId];
  if(!defender||!holder||defender.posture!=='prone'||defenderId===controllerId)return null;
  return {defenderId,controllerId,posture:defender.posture,cost:Math.min(GROUND_SCRAMBLE_COST,defender.stamina)};
}
export function groundScrambleTarget(controller,defender){
  const power=Math.floor((Number(controller?.stats?.Power||10)-10)/2);
  const fatigue=defender?.stamina===0?2:0;
  return 10+power+fatigue;
}
