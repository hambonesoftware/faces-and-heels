using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.Rendering;
using Debug = UnityEngine.Debug;

public sealed partial class FacesMatch : MonoBehaviour
{
    [Serializable] sealed class Request
    {
        public string id, moveId, target, actor, mode;
        public bool boost;
    }

    [Serializable] sealed class Choice { public string id, label, moveId, target, kind; public bool boost; }
    [Serializable] sealed class Fighter { public string posture; public int stamina, maxStamina, crowdResource; }
    [Serializable] sealed class Reply
    {
        public string error, clip, message, phase, actor, winner;
        public bool cpu;
        public Fighter stone, viper;
        public Choice[] actions, previews;
    }

    sealed class Segment
    {
        public int frames;
        public float duration;
        public int[] colors, counts;
        public short[] data;
        public int stride;
    }

    sealed class WrestlerPart
    {
        public GameObject actor;
        public Mesh mesh;
        public Vector3[] vertices;
    }

    readonly ConcurrentQueue<string> incoming = new();
    readonly System.Collections.Generic.Dictionary<int, Material> materials = new();
#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")] static extern void FacesWeb_Connect();
    [DllImport("__Internal")] static extern void FacesWeb_Send(string json);
    [DllImport("__Internal")] static extern IntPtr FacesWeb_Receive();
    [DllImport("__Internal")] static extern int FacesWeb_ClipSize();
    [DllImport("__Internal")] static extern IntPtr FacesWeb_TakeClip();
    [DllImport("__Internal")] static extern void FacesWeb_Free(IntPtr pointer);
    [DllImport("__Internal")] static extern void FacesWeb_Disconnect();
#else
    Process bridge;
#endif
    Camera ringCamera;
    Reply match;
    Segment[] clip;
    WrestlerPart[] parts = Array.Empty<WrestlerPart>();
    float elapsed, cpuAfter;
    int playing, cameraAngle;
    float lastFrame = -1;
    bool busy, lab, halfSpeed;
    string player = "stone", mode = "solo", previewActor = "stone";
    string status = "Loading arena...";

    static readonly Vector3[] CameraPositions =
    {
        new Vector3(-4.1f, 8.4f, 16.8f),
        new Vector3(7.1f, 8.8f, 15.5f),
        new Vector3(-1.1f, 7.2f, 16.6f)
    };

    void Start()
    {
        Application.targetFrameRate = 60;
        QualitySettings.vSyncCount = 0;
        #if !UNITY_WEBGL || UNITY_EDITOR
        Screen.SetResolution(1280, 800, FullScreenMode.Windowed);
        #endif
        MakeRing();
        LightScene();
        ringCamera = new GameObject("Ringside camera").AddComponent<Camera>();
        ringCamera.clearFlags = CameraClearFlags.SolidColor;
        ringCamera.backgroundColor = new Color(.045f,.055f,.10f);
        ringCamera.fieldOfView = 36;
        SetCamera();
        Connect();
    }

    void SetCamera()
    {
        ringCamera.transform.position = CameraPositions[cameraAngle];
        ringCamera.transform.LookAt(new Vector3(0,.65f,0));
    }

    void Connect()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        FacesWeb_Connect();
        Restart();
#else
        try
        {
            string folder = Path.Combine(Application.streamingAssetsPath,"FacesRules");
            bridge = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = Path.Combine(folder,"node.exe"),
                    Arguments = "bridge.mjs",
                    WorkingDirectory = folder,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardInput = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                },
                EnableRaisingEvents = true
            };
            bridge.OutputDataReceived += (_, e) => { if(e.Data != null) incoming.Enqueue(e.Data); };
            bridge.ErrorDataReceived += (_, e) => { if(e.Data != null) Debug.LogWarning(e.Data); };
            bridge.Exited += (_, _) => incoming.Enqueue("{\"error\":\"The match engine exited. Restart the game.\"}");
            if (!bridge.Start()) throw new InvalidOperationException("Could not start the match engine.");
            bridge.BeginOutputReadLine();
            bridge.BeginErrorReadLine();
            Restart();
        }
        catch(Exception error)
        {
            status = error.Message;
            Debug.LogException(error);
        }
#endif
    }

    void Send(Request request)
    {
        if(busy) return;
#if UNITY_WEBGL && !UNITY_EDITOR
        FacesWeb_Send(JsonUtility.ToJson(request));
        busy=true;
#else
        if(bridge == null || bridge.HasExited) return;
        try
        {
            bridge.StandardInput.WriteLine(JsonUtility.ToJson(request));
            busy = true;
        }
        catch(Exception error) { status = error.Message; }
#endif
    }

    void Restart()
    {
        ResetSelection();
        Send(new Request{id="start",actor=player,mode=mode});
    }

    void Update()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        IntPtr message=FacesWeb_Receive();
        if(message!=IntPtr.Zero)
        {
            try { incoming.Enqueue(Marshal.PtrToStringUTF8(message)); }
            finally { FacesWeb_Free(message); }
        }
#endif
        while(incoming.TryDequeue(out string line))
        {
            try
            {
                var reply = JsonUtility.FromJson<Reply>(line);
                if(!string.IsNullOrEmpty(reply.error))
                {
                    status=reply.error;
                    busy=false;
                    continue;
                }
                match=reply;
                awaitingAnimation=false;
                status=reply.message;
#if UNITY_WEBGL && !UNITY_EDITOR
                int size=FacesWeb_ClipSize();
                IntPtr bytes=FacesWeb_TakeClip();
                if(bytes==IntPtr.Zero || size<=0) throw new EndOfStreamException("No animation clip was returned.");
                var buffer=new byte[size];
                try { Marshal.Copy(bytes,buffer,0,size); }
                finally { FacesWeb_Free(bytes); }
                LoadClip(new MemoryStream(buffer,false));
#else
                LoadClip(File.OpenRead(reply.clip));
#endif
            }
            catch(Exception error)
            {
                status=error.Message;
                busy=false;
                Debug.LogException(error);
            }
        }

        if(clip!=null)
        {
            var segment=clip[playing];
            elapsed+=Time.unscaledDeltaTime*(lab && halfSpeed ? .5f : 1f);
            float t=segment.duration>0?Mathf.Min(elapsed/segment.duration,1):1;
            DrawFrame(segment,t);
            if(t>=1 && ++playing>=clip.Length)
            {
                clip=null;
                busy=false;
                awaitingAnimation=false;
                cpuAfter=Time.unscaledTime+.85f;
            }
            else if(t>=1)
            {
                elapsed=0;
                Prepare(clip[playing]);
            }
        }
        if(!lab && !busy && match!=null && match.cpu && Time.unscaledTime>=cpuAfter)
            Send(new Request{id="cpu"});
    }

    void LoadClip(Stream stream)
    {
        using var reader=new BinaryReader(stream);
        clip=new Segment[reader.ReadInt32()];
        for(int i=0;i<clip.Length;i++)
        {
            var s=new Segment{frames=reader.ReadInt32(),duration=reader.ReadSingle()};
            int groups=reader.ReadInt32();
            s.colors=new int[groups];
            s.counts=new int[groups];
            for(int j=0;j<groups;j++)
            {
                s.colors[j]=reader.ReadInt32();
                s.counts[j]=reader.ReadInt32();
                s.stride+=s.counts[j]*3;
            }
            byte[] bytes=reader.ReadBytes(s.frames*s.stride*2);
            if(bytes.Length!=s.frames*s.stride*2) throw new EndOfStreamException("Incomplete animation clip.");
            s.data=new short[s.frames*s.stride];
            Buffer.BlockCopy(bytes,0,s.data,0,bytes.Length);
            clip[i]=s;
        }
        elapsed=0;
        playing=0;
        Prepare(clip[0]);
        DrawFrame(clip[0],0);
    }

    void Prepare(Segment segment)
    {
        lastFrame=-1;
        if(parts.Length!=segment.colors.Length)
        {
            foreach(var part in parts)
            {
                Destroy(part.mesh);
                Destroy(part.actor);
            }
            parts=new WrestlerPart[segment.colors.Length];
        }
        for(int i=0;i<parts.Length;i++)
        {
            var part=parts[i];
            if(part==null)
            {
                var actor=new GameObject("Wrestlers / material "+i);
                var mesh=new Mesh();
                mesh.MarkDynamic();
                actor.AddComponent<MeshFilter>().sharedMesh=mesh;
                actor.AddComponent<MeshRenderer>();
                part=parts[i]=new WrestlerPart{actor=actor,mesh=mesh};
            }
            if(!materials.TryGetValue(segment.colors[i],out var material))
            {
                material=Surface(segment.colors[i]);
                materials.Add(segment.colors[i],material);
            }
            part.actor.GetComponent<MeshRenderer>().sharedMaterial=material;
            int vertices=segment.counts[i];
            if(part.vertices?.Length==vertices)continue;
            part.vertices=new Vector3[vertices];
            int[] triangles=new int[vertices];
            for(int v=0;v<vertices;v++)triangles[v]=v;
            part.mesh.Clear();
            part.mesh.vertices=part.vertices;
            part.mesh.triangles=triangles;
        }
    }

    void DrawFrame(Segment segment,float t)
    {
        float frame=t*(segment.frames-1);
        if(frame==lastFrame)return;
        lastFrame=frame;
        int lower=Mathf.FloorToInt(frame);
        int upper=Mathf.Min(lower+1,segment.frames-1);
        int a=lower*segment.stride,b=upper*segment.stride;
        float blend=frame-lower;
        const float scale=.00130f;
        foreach(var part in parts)
        {
            for(int i=0;i<part.vertices.Length;i++)
            {
                part.vertices[i]=new Vector3(
                    (segment.data[a]+(segment.data[b]-segment.data[a])*blend)*scale,
                    (segment.data[a+1]+(segment.data[b+1]-segment.data[a+1])*blend)*scale,
                    (segment.data[a+2]+(segment.data[b+2]-segment.data[a+2])*blend)*scale);
                a+=3;b+=3;
            }
            part.mesh.vertices=part.vertices;
            part.mesh.RecalculateNormals();
            part.mesh.RecalculateBounds();
        }
    }

    void OnDestroy()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        FacesWeb_Disconnect();
#else
        if(bridge==null)return;
        try
        {
            if(!bridge.HasExited)
            {
                bridge.StandardInput.Close();
                if(!bridge.WaitForExit(1000))bridge.Kill();
            }
        }
        catch(InvalidOperationException) {}
        bridge.Dispose();
#endif
    }

    static Material Surface(int rgb, float gloss = 0.16f)
    {
        var material = new Material(Resources.Load<Shader>("WrestlerLit"));
        material.color = new Color32((byte)(rgb >> 16), (byte)(rgb >> 8), (byte)rgb, 255);
        material.SetFloat("_Glossiness", gloss);
        return material;
    }

    static Mesh arenaCube;

    static Mesh ArenaCube()
    {
        if (arenaCube != null) return arenaCube;
        var corners = new[]
        {
            new Vector3(-.5f,-.5f,-.5f),new Vector3(.5f,-.5f,-.5f),
            new Vector3(-.5f,.5f,-.5f),new Vector3(.5f,.5f,-.5f),
            new Vector3(-.5f,-.5f,.5f),new Vector3(.5f,-.5f,.5f),
            new Vector3(-.5f,.5f,.5f),new Vector3(.5f,.5f,.5f)
        };
        int[] faces={0,2,3,1, 4,5,7,6, 0,1,5,4, 2,6,7,3, 0,4,6,2, 1,3,7,5};
        var vertices=new Vector3[24];
        var triangles=new int[36];
        for(int face=0;face<6;face++)
        {
            int v=face*4,t=face*6;
            for(int corner=0;corner<4;corner++)vertices[v+corner]=corners[faces[v+corner]];
            triangles[t]=v;triangles[t+1]=v+1;triangles[t+2]=v+2;
            triangles[t+3]=v;triangles[t+4]=v+2;triangles[t+5]=v+3;
        }
        arenaCube=new Mesh{name="Arena block",vertices=vertices,triangles=triangles};
        arenaCube.RecalculateNormals();
        arenaCube.RecalculateBounds();
        return arenaCube;
    }

    static GameObject Block(string name, Vector3 position, Vector3 size, Material material)
    {
        var block = new GameObject(name);
        block.transform.position = position;
        block.transform.localScale = size;
        block.AddComponent<MeshFilter>().sharedMesh = ArenaCube();
        block.AddComponent<MeshRenderer>().sharedMaterial = material;
        return block;
    }

    static void Rope(Vector3 a, Vector3 b, Material material)
    {
        var rope=Block("Ring rope",(a+b)*.5f,new Vector3(.045f,(a-b).magnitude,.045f),material);
        rope.transform.up=(b-a).normalized;
    }

    static void MakeRing()
    {
        var mat = Surface(0x7185a5);
        var apron = Surface(0x242d54);
        var post = Surface(0x202637);
        var red = Surface(0xb82435, .38f);
        var white = Surface(0xd9d5cf, .38f);
        var blue = Surface(0x334b99, .38f);
        Block("Arena floor", new Vector3(0, -.75f, 0), new Vector3(55, .2f, 55), Surface(0x121627));
        Block("Ring apron", new Vector3(0, -.34f, 0), new Vector3(12.35f, .6f, 11.55f), apron);
        Block("Canvas", new Vector3(0, -.06f, 0), new Vector3(12.15f, .12f, 11.40f), mat);
        var corners = new[] { new Vector3(-5.95f, 0, -5.60f), new Vector3(-5.95f, 0, 5.60f),
                              new Vector3(5.95f, 0, 5.60f), new Vector3(5.95f, 0, -5.60f) };
        var ropeHeights = new[] { 1.02f, 2.02f, 3.02f };
        foreach (var c in corners)
        {
            Block("Ring post", c + Vector3.up * 1.53f, new Vector3(.24f, 3.48f, .24f), post);
            foreach (float y in ropeHeights)
                Block("Turnbuckle", c * .96f + Vector3.up * y, new Vector3(.37f, .23f, .37f), post);
        }
        for (int i = 0; i < corners.Length; i++)
        {
            for (int lane = 0; lane < ropeHeights.Length; lane++)
            {
                var y = Vector3.up * ropeHeights[lane];
                Rope(corners[i] + y, corners[(i + 1) % corners.Length] + y,
                    lane == 0 ? blue : lane == 1 ? white : red);
            }
        }
        var stand = Surface(0x232a47);
        var crowd = new[] { Surface(0x3b4262), Surface(0x343756), Surface(0x4b3f58), Surface(0x3c4b66) };
        var random = new System.Random(31);
        for (int row = 0; row < 6; row++)
        {
            float z = -8.05f - row * 1.18f;
            float y = -.35f + row * .49f;
            Block("Bleachers", new Vector3(0, y - .35f, z), new Vector3(29, .6f, 1.13f), stand);
            for (int i = -20; i <= 20; i++)
            {
                float x = i * .65f + (row % 2) * .29f;
                float height = .6f + (float)random.NextDouble() * .23f;
                var shirt = crowd[random.Next(crowd.Length)];
                Block("Spectator", new Vector3(x, y + height * .5f, z), new Vector3(.35f, height, .32f), shirt);
                Block("Spectator head", new Vector3(x, y + height + .10f, z), new Vector3(.22f, .24f, .22f), shirt);
            }
        }
    }

    static void LightScene()
    {
        RenderSettings.ambientMode = AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(.42f, .44f, .57f);
        var key = new GameObject("Warm overhead key").AddComponent<Light>();
        key.type = LightType.Directional;
        key.transform.rotation = Quaternion.Euler(57, -32, 0);
        key.color = new Color(1f, .86f, .70f);
        key.intensity = 1.19f;
        key.shadows = LightShadows.Soft;
        QualitySettings.shadowDistance = 45;
        QualitySettings.shadows = ShadowQuality.All;
        var fill = new GameObject("Cool arena fill").AddComponent<Light>();
        fill.type = LightType.Directional;
        fill.transform.rotation = Quaternion.Euler(38, 148, 0);
        fill.color = new Color(.53f, .68f, 1f);
        fill.intensity = .60f;
    }


}
