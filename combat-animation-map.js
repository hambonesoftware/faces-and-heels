// Central choreography manifest. Every named combat move must be represented here.
// Bespoke procedural pair tracks are rendered in 3D if no matching sprite atlas exists.
export const animationByMove = Object.freeze({
  "pick-up-opponent":Object.freeze({attacker:"idle",defender:"idle",choreography:"pick_up",kind:"setup"}),
  "pull-to-knees":Object.freeze({attacker:"idle",defender:"idle",choreography:"pull_to_knees",kind:"setup"}),
  "snap-down":Object.freeze({attacker:"idle",defender:"idle",choreography:"snap_down",kind:"setup"}),
  "knee-lift":Object.freeze({attacker:"idle",defender:"idle",choreography:"knee_lift",kind:"strike",impactFrame:6}),
  "dropkick":Object.freeze({attacker:"idle",defender:"idle",choreography:"dropkick",kind:"strike",impactFrame:6}),
  "ddt":Object.freeze({attacker:"idle",defender:"idle",choreography:"ddt",kind:"slam",impactFrame:6,hitStopMs:100}),
  "neckbreaker":Object.freeze({attacker:"idle",defender:"idle",choreography:"neckbreaker",kind:"slam",impactFrame:6,hitStopMs:100}),
  "hip-toss":Object.freeze({attacker:"idle",defender:"idle",choreography:"hip_toss",kind:"slam",impactFrame:6,hitStopMs:100}),
  "spinebuster":Object.freeze({attacker:"idle",defender:"idle",choreography:"spinebuster",kind:"slam",impactFrame:6,hitStopMs:100}),
  "elbow-drop":Object.freeze({attacker:"idle",defender:"idle",choreography:"elbow_drop",kind:"strike",impactFrame:6}),
  "stomp":Object.freeze({attacker:"idle",defender:"idle",choreography:"stomp",kind:"strike",impactFrame:6}),
  "knee-drop":Object.freeze({attacker:"idle",defender:"idle",choreography:"knee_drop",kind:"strike",impactFrame:6}),
  "leg-drop":Object.freeze({attacker:"idle",defender:"idle",choreography:"leg_drop",kind:"strike",impactFrame:6}),
  "armbar":Object.freeze({attacker:"idle",defender:"idle",choreography:"armbar",kind:"grapple",impactFrame:6}),
  "ankle-lock":Object.freeze({attacker:"idle",defender:"idle",choreography:"ankle_lock",kind:"grapple",impactFrame:6}),
  "forearm-smash":Object.freeze({attacker:"forearm",defender:"forearm_hit",choreography:"forearm",kind:"strike",impactFrame:5}),
  "running-clothesline":Object.freeze({attacker:"clothesline",defender:"clothesline_hit",choreography:"clothesline",kind:"strike",impactFrame:5}),
  "vertical-suplex":Object.freeze({attacker:"suplex",defender:"suplex_taken",choreography:"suplex",kind:"slam",impactFrame:9,hitStopMs:100}),
  "body-slam":Object.freeze({attacker:"body_slam",defender:"body_slam_taken",choreography:"body_slam",kind:"slam",impactFrame:9,hitStopMs:100}),
  "dragon-screw":Object.freeze({attacker:"dragon_screw",defender:"dragon_screw_taken",choreography:"dragon_screw",kind:"slam",impactFrame:7,hitStopMs:100}),
  "ground-headlock":Object.freeze({attacker:"headlock",defender:"headlock_taken",choreography:"headlock",kind:"grapple",impactFrame:5}),
  "flash-finisher":Object.freeze({attacker:"suplex",defender:"suplex_taken",choreography:"finisher",kind:"slam",impactFrame:9,hitStopMs:100}),
  "viper-bite":Object.freeze({attacker:"idle",defender:"idle",choreography:"viper_bite",kind:"slam",impactFrame:9,hitStopMs:120}),
  "shove-counter":Object.freeze({attacker:"idle",defender:"idle",choreography:"shove_counter",kind:"strike",impactFrame:6})
});
