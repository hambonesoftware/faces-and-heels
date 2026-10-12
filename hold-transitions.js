/** Small, audited hold-to-hold chains for live combat. A transition is a
 * movement/change of grip, not an unrelated instant attack or a new finisher.
 * Defender remains prone and receives an immediate escape roll afterward.
 */
export const HOLD_TRANSITION_COST=3;
export const HOLD_TRANSITION_DAMAGE=4;
const allowed=new Set(['armbar','ankle-lock','ground-headlock']);
export function getHoldTransitionOptions(state,moves=[]){
 const hold=state?.activeHold;
 if(!hold||state.phase!=='HOLD')return [];
 const attacker=state.wrestlers?.[hold.holderId],target=state.wrestlers?.[hold.defenderId];
 if(!attacker||!target||target.posture!=='prone'||!['standing','kneeling'].includes(attacker.posture))return [];
 return moves.filter(move=>allowed.has(move.id)&&move.id!==hold.moveId
   &&move.sustained
   &&attacker.commonMoves?.includes(move.id)
   &&move.requirements?.attackerPostures?.includes(attacker.posture)
   &&move.requirements?.defenderPostures?.includes(target.posture)
   &&attacker.stamina>=HOLD_TRANSITION_COST
 ).map(move=>({id:move.id,name:move.name,cost:HOLD_TRANSITION_COST,damage:HOLD_TRANSITION_DAMAGE}));
}
