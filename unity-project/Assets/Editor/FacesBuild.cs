using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEditor.Build.Reporting;
using UnityEngine;

public static class FacesBuild
{
    public static void Windows()=>Build(BuildTarget.StandaloneWindows64,"Build/Faces and Heels.exe");

    public static void Web()=>Build(BuildTarget.WebGL,"WebBuild");

    static void Build(BuildTarget target,string location)
    {
        try
        {
            var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene);
            new GameObject("Faces & Heels").AddComponent<FacesMatch>();
            const string scenePath="Assets/Match.unity";
            EditorSceneManager.SaveScene(scene,scenePath);
            EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene(scenePath,true)};
            PlayerSettings.companyName="Hambone Software";
            PlayerSettings.productName="Faces and Heels";
            PlayerSettings.defaultScreenWidth=1280;
            PlayerSettings.defaultScreenHeight=800;
            PlayerSettings.fullScreenMode=FullScreenMode.Windowed;
            if(target==BuildTarget.WebGL)
            {
                PlayerSettings.WebGL.compressionFormat=WebGLCompressionFormat.Gzip;
                PlayerSettings.WebGL.decompressionFallback=true;
                PlayerSettings.WebGL.template="PROJECT:Faces";
            }
            Directory.CreateDirectory(target==BuildTarget.WebGL ? location : Path.GetDirectoryName(location));
            var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{
                scenes=new[]{scenePath},
                locationPathName=location,
                target=target,
                options=BuildOptions.None
            });
            if(report.summary.result!=BuildResult.Succeeded)
                throw new InvalidOperationException(target+" build "+report.summary.result);
            if(target==BuildTarget.WebGL)
                foreach(string file in new[]{"node.exe","Node-LICENSE.txt","bridge.mjs"})
                    File.Delete(Path.Combine(location,"StreamingAssets","FacesRules",file));
            Debug.Log("FACES_BUILD_SUCCEEDED");
            EditorApplication.Exit(0);
        }
        catch(Exception error)
        {
            Debug.LogException(error);
            EditorApplication.Exit(1);
        }
    }
}
