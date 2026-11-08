# Faces & Heels Unity project

[Play the Unity WebGL build](https://hambonesoftware.github.io/faces-and-heels/assets/unity/)

Open this folder with Unity 6000.3.28f1 and the WebGL Build Support module installed. The main scene is `Assets/Match.unity`. The editor build method `FacesBuild.Web` generates `WebBuild/`. Serve that folder over HTTP for local testing. Publish its contents under `assets/unity/` in the repository to include the player in the Pages workflow.

Unity renders the stadium, wrestlers, and match controls. A module worker runs the match rules and samples the authored wrestling choreography from `Assets/StreamingAssets/FacesRules/`. The WebGL player includes solo matches, pass-and-play, and the Motion Lab.

For Editor Play mode on Windows, place the official Node.js 22 Windows executable and its license in the rules folder as `node.exe` and `Node-LICENSE.txt`. The WebGL player runs its rules in the browser worker.
