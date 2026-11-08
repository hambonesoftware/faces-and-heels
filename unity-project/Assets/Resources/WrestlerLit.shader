Shader "FacesAndHeels/WrestlerLit" {
    Properties {
        _Color ("Color", Color) = (1,1,1,1)
        _Glossiness ("Smoothness", Range(0,1)) = 0.16
    }
    SubShader {
        Tags { "RenderType"="Opaque" }
        LOD 200
        CGPROGRAM
        #pragma surface surf Standard fullforwardshadows
        #pragma target 3.0
        fixed4 _Color;
        half _Glossiness;
        struct Input { float3 worldPos; };
        void surf(Input IN, inout SurfaceOutputStandard o) {
            o.Albedo = _Color.rgb;
            o.Smoothness = _Glossiness;
            o.Alpha = 1;
        }
        ENDCG
    }
    FallBack "Diffuse"
}
