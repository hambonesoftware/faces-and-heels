// Reaction repertoire: only Common Moves deliberately built for short,
 // plausible reversals. A wrestler must personally know the move.
export const COUNTER_MOVE_IDS=Object.freeze(['forearm-smash','knee-lift','dropkick','hip-toss']);
export function legalCounterMoves({moves=[],reactor,opponent,state}={}){
  if(!reactor||!opponent)return [];
  return moves.filter(move=>COUNTER_MOVE_IDS.includes(move.id)
    &&reactor.commonMoves?.includes(move.id)
    &&reactor.stamina>=move.staminaCost
    &&move.requirements?.attackerPostures?.includes(reactor.posture)
    &&move.requirements?.defenderPostures?.includes(opponent.posture)
    &&move.category!=='special'&&!move.sustained);
}
