using System;
using System.Collections.Generic;
using UnityEngine;

public sealed partial class FacesMatch
{
    const int CardsPerPage=4;
    const float DesignWidth=960, DesignHeight=600;
    static readonly Color Ink=new Color32(10,17,31,255);
    static readonly Color Slate=new Color32(25,38,58,255);
    static readonly Color Silver=new Color32(177,193,213,255);
    static readonly Color Paper=new Color32(243,247,252,255);
    static readonly Color Gold=new Color32(255,203,93,255);
    static readonly Color Red=new Color32(238,92,99,255);
    static readonly Color Aqua=new Color32(103,218,215,255);

    enum Shape { Slash, Plate, Badge, Die, Chevron }
    readonly Dictionary<Shape,Texture2D> shapes=new();
    readonly Dictionary<string,Texture2D> glyphs=new();
    readonly Dictionary<(int,TextAnchor,bool,bool),GUIStyle> labels=new();
    int selectedChoice=-1, page;
    string pressed;
    bool awaitingAnimation;
    Texture2D dockShade;

    static Vector2[] Polygon(params float[] coordinates)
    {
        var points=new Vector2[coordinates.Length/2];
        for(int i=0;i<points.Length;i++)points[i]=new Vector2(coordinates[i*2],coordinates[i*2+1]);
        return points;
    }

    static readonly Dictionary<Shape,Vector2[]> Outlines=new()
    {
        [Shape.Slash]=Polygon(.10f,0, 1,0, .90f,1, 0,1),
        [Shape.Plate]=Polygon(.07f,0, .94f,0, 1,.19f, 1,.79f, .92f,1, .05f,1, 0,.78f, 0,.22f),
        [Shape.Badge]=Polygon(.27f,0, .73f,0, 1,.27f, 1,.73f, .73f,1, .27f,1, 0,.73f, 0,.27f),
        [Shape.Die]=Polygon(.50f,0, .94f,.25f, .94f,.75f, .50f,1, .06f,.75f, .06f,.25f),
        [Shape.Chevron]=Polygon(0,0, .65f,0, 1,.50f, .65f,1, 0,1, .29f,.50f)
    };

    static bool Inside(Vector2 point,Vector2[] polygon)
    {
        bool inside=false;
        for(int i=0,j=polygon.Length-1;i<polygon.Length;j=i++)
        {
            Vector2 a=polygon[i],b=polygon[j];
            if((a.y>point.y)!=(b.y>point.y) &&
               point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
        }
        return inside;
    }

    static Texture2D Raster(Vector2[] polygon,int width=128,int height=80)
    {
        var texture=new Texture2D(width,height,TextureFormat.RGBA32,false);
        var pixels=new Color32[width*height];
        for(int y=0;y<height;y++)for(int x=0;x<width;x++)
        {
            int samples=0;
            for(int sy=0;sy<2;sy++)for(int sx=0;sx<2;sx++)
                if(Inside(new Vector2((x+.25f+sx*.5f)/width,1-(y+.25f+sy*.5f)/height),polygon))samples++;
            pixels[y*width+x]=new Color32(255,255,255,(byte)(samples*255/4));
        }
        texture.SetPixels32(pixels);
        texture.Apply(false,true);
        texture.wrapMode=TextureWrapMode.Clamp;
        return texture;
    }

    Texture2D ShapeTexture(Shape shape)
    {
        if(!shapes.TryGetValue(shape,out var texture))
            shapes.Add(shape,texture=Raster(Outlines[shape]));
        return texture;
    }

    Texture2D Glyph(string kind)
    {
        kind=kind??"setup";
        if(glyphs.TryGetValue(kind,out var texture))return texture;
        Vector2[] points=kind switch
        {
            "strike"=>Polygon(.60f,.03f, .13f,.56f, .44f,.56f, .29f,.97f, .88f,.35f, .55f,.35f),
            "slam"=>Polygon(.33f,.05f, .67f,.05f, .67f,.54f, .91f,.54f, .50f,.96f, .09f,.54f, .33f,.54f),
            "grapple"=>Polygon(.15f,.05f, .47f,.05f, .47f,.29f, .36f,.29f, .36f,.52f, .65f,.52f, .65f,.27f, .87f,.27f, .87f,.82f, .59f,.96f, .24f,.96f, .15f,.72f),
            "defense"=>Polygon(.50f,.03f, .89f,.20f, .83f,.65f, .50f,.97f, .17f,.65f, .11f,.20f),
            "pin"=>Polygon(.50f,.03f, .95f,.50f, .50f,.97f, .05f,.50f),
            _=>Polygon(.08f,.14f, .46f,.14f, .91f,.50f, .46f,.86f, .08f,.86f, .51f,.50f)
        };
        glyphs.Add(kind,texture=Raster(points,32,32));
        return texture;
    }

    void Draw(Rect rect,Texture2D texture,Color color)
    {
        if(Event.current.type!=EventType.Repaint)return;
        var previous=GUI.color;
        GUI.color=color;
        GUI.DrawTexture(rect,texture,ScaleMode.StretchToFill,true);
        GUI.color=previous;
    }

    void Panel(Rect rect,Shape shape,Color fill,Color edge,float border=2)
    {
        var texture=ShapeTexture(shape);
        Draw(rect,texture,edge);
        var inner=new Rect(rect.x+border,rect.y+border,rect.width-border*2,rect.height-border*2);
        Draw(inner,texture,fill);
    }

    void Type(Rect rect,string value,int size,Color color,TextAnchor anchor=TextAnchor.MiddleLeft,bool bold=false,bool wrap=false)
    {
        if(Event.current.type!=EventType.Repaint)return;
        var key=(size,anchor,bold,wrap);
        if(!labels.TryGetValue(key,out var label))
        {
            label=new GUIStyle(GUI.skin.label)
            {
                fontSize=size,alignment=anchor,clipping=TextClipping.Clip,wordWrap=wrap,
                fontStyle=bold?FontStyle.Bold:FontStyle.Normal,
                padding=new RectOffset(0,0,0,0)
            };
            labels.Add(key,label);
        }
        label.normal.textColor=color;
        GUI.Label(rect,value??"",label);
    }

    static Color Tint(Color color,float alpha)=>new(color.r,color.g,color.b,alpha);
    static Rect MoveRect(Rect rect,float x,float y)=>new(rect.x+x,rect.y+y,rect.width,rect.height);

    bool ShapeButton(string key,Rect rect,Shape shape,Color accent,bool enabled,bool active=false)
    {
        Event current=Event.current;
        Vector2 mouse=current.mousePosition;
        bool over=rect.Contains(mouse)&&Inside(new Vector2((mouse.x-rect.x)/rect.width,(mouse.y-rect.y)/rect.height),Outlines[shape]);
        bool held=pressed==key;
        Color border=enabled?Tint(accent,active||over?1:.67f):Tint(Silver,.27f);
        Color fill=enabled
            ? (held?Color.Lerp(Ink,accent,.43f):active||over?Color.Lerp(Ink,accent,.25f):Slate)
            : new Color32(26,32,44,255);
        Panel(MoveRect(rect,0,4),shape,Tint(Color.black,.48f),Tint(Color.black,.48f),0);
        Panel(rect,shape,fill,border,active?2.6f:1.6f);
        if(enabled&&over&&current.type==EventType.MouseDown&&current.button==0)
        {
            pressed=key;
            current.Use();
        }
        else if(held&&current.type==EventType.MouseUp&&current.button==0)
        {
            pressed=null;
            current.Use();
            return enabled&&over;
        }
        return false;
    }

    void ResetSelection()
    {
        page=0;
        selectedChoice=-1;
        pressed=null;
    }

    void OnGUI()
    {
        var previous=GUI.matrix;
        float scale=Mathf.Min(Screen.width/DesignWidth,Screen.height/DesignHeight);
        var margin=new Vector3((Screen.width-DesignWidth*scale)*.5f,(Screen.height-DesignHeight*scale)*.5f,0);
        GUI.matrix=Matrix4x4.TRS(margin,Quaternion.identity,new Vector3(scale,scale,1));
        bool available=!busy&&match!=null;
        Choice[] choices=match==null?Array.Empty<Choice>():lab?match.previews:match.actions;
        choices??=Array.Empty<Choice>();
        int pages=Mathf.Max(1,(choices.Length+CardsPerPage-1)/CardsPerPage);
        page=Mathf.Clamp(page,0,pages-1);
        if(selectedChoice>=choices.Length)selectedChoice=-1;
        bool canAct=available&&(lab||!match.cpu);
        string context=match==null?"LOADING ARENA":
            lab?"MOTION LAB":
            !string.IsNullOrEmpty(match.winner)?match.winner.ToUpperInvariant()+" WINS":
            match.phase=="NEUTRAL_ROLL"?"CONTEST FOR HIGH CONTROL":
            ((match.cpu?"CPU  /  ":"")+(string.IsNullOrEmpty(match.actor)?"":match.actor.ToUpperInvariant()+"  /  ")+match.phase.Replace('_',' '));
        DrawHud();
        DrawToolbar(available);
        DrawDock(context,choices,pages,canAct);
        HandleKeys(choices,pages,canAct);
        if(Event.current.type==EventType.MouseUp)pressed=null;
        GUI.matrix=previous;
    }

    void DrawHud()
    {
        DrawFighter(new Rect(21,16,270,72),"STONE","S","POWERHOUSE",match?.stone,Red,false);
        DrawFighter(new Rect(669,16,270,72),"VIPER","V","DAREDEVIL",match?.viper,Aqua,true);
        var logo=new Rect(331,10,298,62);
        Panel(logo,Shape.Slash,Tint(Ink,.94f),Tint(Gold,.75f));
        Type(new Rect(347,14,266,28),"FACES & HEELS",25,Gold,TextAnchor.MiddleCenter,true);
        Type(new Rect(347,43,266,16),lab?"TRAINING FLOOR":"THE MAIN EVENT",11,Paper,TextAnchor.MiddleCenter,true);
    }

    void DrawFighter(Rect rect,string name,string initial,string style,Fighter fighter,Color accent,bool right)
    {
        Panel(MoveRect(rect,0,4),Shape.Plate,Tint(Color.black,.52f),Tint(Color.black,.52f),0);
        Panel(rect,Shape.Plate,Tint(Ink,.94f),Tint(accent,.84f));
        float x=right?rect.x+13:rect.x+70;
        var crest=new Rect(right?rect.xMax-60:rect.x+10,rect.y+10,49,49);
        Panel(crest,Shape.Badge,Color.Lerp(Ink,accent,.31f),accent,2);
        Type(crest,initial,26,accent,TextAnchor.MiddleCenter,true);
        Type(new Rect(x,rect.y+6,122,24),name,22,Paper,TextAnchor.MiddleLeft,true);
        Type(new Rect(x+119,rect.y+10,73,18),style,8,accent,TextAnchor.MiddleRight,true);
        if(fighter==null)return;
        var bar=new Rect(x,rect.y+34,185,8);
        Draw(bar,ShapeTexture(Shape.Slash),new Color32(62,75,94,255));
        float fraction=Mathf.Clamp01(fighter.stamina/(float)fighter.maxStamina);
        if(fraction>0)Draw(new Rect(bar.x,bar.y,bar.width*fraction,bar.height),ShapeTexture(Shape.Slash),accent);
        string score=fighter.stamina+" / "+fighter.maxStamina+" STA   |   "+fighter.crowdResource+" CROWD";
        Type(new Rect(x,rect.y+46,185,15),score,10,Silver,TextAnchor.MiddleLeft,true);
    }

    void Chip(string id,Rect rect,string value,Color color,bool enabled,Action action)
    {
        bool click=ShapeButton(id,rect,Shape.Slash,color,enabled);
        Type(rect,value,11,enabled?Paper:Silver,TextAnchor.MiddleCenter,true);
        if(click)action();
    }

    void DrawToolbar(bool available)
    {
        Chip("mode-lab",new Rect(279,89,107,28),lab?"BACK TO MATCH":"MOTION LAB",Gold,available,()=>{
            lab=!lab;
            ResetSelection();
            if(!lab)Send(new Request{id="resume"});
        });
        Chip("camera",new Rect(384,89,88,28),"CAM 0"+(cameraAngle+1),Aqua,true,()=>{
            cameraAngle=(cameraAngle+1)%CameraPositions.Length;
            SetCamera();
        });
        if(lab)
        {
            Chip("preview-actor",new Rect(470,89,111,28),previewActor=="stone"?"ATTACKER  S":"ATTACKER  V",Red,available,
                ()=>previewActor=previewActor=="stone"?"viper":"stone");
            Chip("speed",new Rect(579,89,106,28),halfSpeed?"HALF SPEED":"FULL SPEED",Aqua,available,()=>halfSpeed=!halfSpeed);
        }
        else
        {
            Chip("mode",new Rect(470,89,111,28),mode=="solo"?"SOLO vs CPU":"PASS & PLAY",Aqua,available,()=>{
                mode=mode=="solo"?"local":"solo";
                Restart();
            });
            Chip("player",new Rect(579,89,106,28),player=="stone"?"PLAY AS STONE":"PLAY AS VIPER",Red,available&&mode=="solo",()=>{
                player=player=="stone"?"viper":"stone";
                Restart();
            });
            Chip("reset",new Rect(684,89,76,28),"NEW BOUT",Silver,available,Restart);
        }
    }

    Texture2D DockShade()
    {
        if(dockShade!=null)return dockShade;
        dockShade=new Texture2D(1,80,TextureFormat.RGBA32,false);
        for(int y=0;y<80;y++)
        {
            float alpha=Mathf.SmoothStep(.99f,.08f,y/79f);
            dockShade.SetPixel(0,y,new Color(1,1,1,alpha));
        }
        dockShade.Apply(false,true);
        return dockShade;
    }

    void DrawDock(string context,Choice[] choices,int pages,bool canAct)
    {
        Draw(new Rect(0,399,960,201),DockShade(),Ink);
        Draw(new Rect(21,451,917,1),Texture2D.whiteTexture,Tint(Silver,.40f));
        Type(new Rect(22,415,365,28),context,19,Gold,TextAnchor.MiddleLeft,true);
        Type(new Rect(390,417,544,24),busy&&awaitingAnimation?"PREPARING MOVE...":status,13,Paper,TextAnchor.MiddleRight,true);
        int first=page*CardsPerPage,last=Mathf.Min(choices.Length,first+CardsPerPage);
        int count=last-first;
        if(count==0)
            Type(new Rect(38,477,710,74),match?.winner?.Length>0?"NEW BOUT IS AVAILABLE ABOVE":"WAITING FOR THE NEXT EXCHANGE",16,Silver,TextAnchor.MiddleCenter,true);
        else
        {
            float tileWidth=count==1?296:count==2?253:171;
            float tileStart=count==1?198:count==2?99:31;
            for(int i=first;i<last;i++)
            {
                var tile=new Rect(tileStart+(i-first)*(tileWidth+7),466,tileWidth,88);
                var choice=choices[i];
                if(DrawMove(tile,choice,i-first,i==selectedChoice||choices.Length==1,canAct))
                    selectedChoice=i;
            }
        }

        if(pages>1)
        {
            Chip("previous-page",new Rect(27,560,69,25),"< PREV",Aqua,page>0&&canAct,()=>TurnPage(-1,pages));
            Type(new Rect(104,560,100,25),(page+1)+" / "+pages,11,Silver,TextAnchor.MiddleLeft,true);
            Chip("next-page",new Rect(203,560,69,25),"NEXT >",Aqua,page+1<pages&&canAct,()=>TurnPage(1,pages));
        }
        Type(new Rect(317,559,417,24),"SELECT A MOVE   /   1-4 SELECT   /   ENTER CONFIRMS",10,Silver,TextAnchor.MiddleRight,true);

        int chosen=choices.Length==1?0:selectedChoice;
        Choice primary=chosen>=0&&chosen<choices.Length?choices[chosen]:null;
        bool primaryEnabled=canAct&&primary!=null;
        var die=new Rect(793,442,137,136);
        if(ShapeButton("execute",die,Shape.Die,Gold,primaryEnabled,primaryEnabled))
            ExecuteChoice(primary);
        DrawDie(die,primaryEnabled);
        string call=lab?"PLAY":primary?.id=="neutral-roll"?"ROLL":
            primary?.id=="select-move"||primary?.id=="react"?"EXECUTE":"CONFIRM";
        if(busy)call=awaitingAnimation?"LOAD":"LIVE";
        Type(new Rect(die.x+15,die.y+63,die.width-30,24),call,17,primaryEnabled?Paper:Silver,TextAnchor.MiddleCenter,true);
        Type(new Rect(die.x+16,die.y+87,die.width-32,17),primaryEnabled?"ENTER":busy?"IN PROGRESS":"SELECT MOVE",8,primaryEnabled?Gold:Silver,TextAnchor.MiddleCenter,true);
    }

    void DrawDie(Rect die,bool enabled)
    {
        Color color=enabled?Gold:Tint(Silver,.45f);
        var frame=new Rect(die.center.x-24,die.y+13,48,48);
        Panel(frame,Shape.Die,Tint(Ink,.85f),color,1.7f);
        Draw(new Rect(frame.x+8,frame.y+8,32,32),ShapeTexture(Shape.Die),Tint(color,.16f));
        Type(frame,"20",22,color,TextAnchor.MiddleCenter,true);
    }

    static Color MoveColor(string kind)=>kind switch
    {
        "strike"=>Red,"slam"=>Gold,"grapple"=>Aqua,"defense"=>new Color32(158,152,251,255),
        "pin"=>new Color32(248,152,125,255),_=>Silver
    };

    static string MoveType(string kind)=>kind switch
    {
        "strike"=>"STRIKE","slam"=>"THROW","grapple"=>"HOLD","defense"=>"DEFENSE","pin"=>"PIN",_=>"SETUP"
    };

    bool DrawMove(Rect rect,Choice choice,int slot,bool active,bool canAct)
    {
        Color accent=MoveColor(choice.kind);
        bool click=ShapeButton("move-"+slot,rect,Shape.Plate,accent,canAct,active&&canAct);
        var icon=new Rect(rect.x+12,rect.y+11,24,24);
        Draw(icon,ShapeTexture(Shape.Badge),Tint(accent,canAct ? .20f : .10f));
        Draw(new Rect(icon.x+5,icon.y+5,14,14),Glyph(choice.kind),canAct?accent:Silver);
        Type(new Rect(rect.x+42,rect.y+11,rect.width-68,21),MoveType(choice.kind),10,accent,TextAnchor.MiddleLeft,true);
        Type(new Rect(rect.xMax-23,rect.y+9,13,18),(slot+1).ToString(),10,Silver,TextAnchor.MiddleCenter,true);
        string name=choice.label, detail=active?"READY":"SELECT";
        int cost=name.IndexOf("  [",StringComparison.Ordinal);
        if(cost>=0){detail=name.Substring(cost+2).Replace("[","").Replace("]","").Replace("crowd ","");name=name.Substring(0,cost);}
        if(choice.boost)detail="BOOST  /  "+detail;
        int nameSize=name.Length>28?11:name.Length>17?13:15;
        Type(new Rect(rect.x+12,rect.y+36,rect.width-24,34),name,nameSize,canAct?Paper:Silver,TextAnchor.UpperLeft,true,true);
        Type(new Rect(rect.x+12,rect.y+70,rect.width-24,13),detail,10,active?accent:Silver,TextAnchor.MiddleLeft,true);
        return click;
    }

    void TurnPage(int step,int pages)
    {
        page=Mathf.Clamp(page+step,0,pages-1);
        selectedChoice=-1;
    }

    void HandleKeys(Choice[] choices,int pages,bool canAct)
    {
        Event current=Event.current;
        if(!canAct||current.type!=EventType.KeyDown)return;
        int slot=current.keyCode switch
        {
            KeyCode.Alpha1 or KeyCode.Keypad1=>0, KeyCode.Alpha2 or KeyCode.Keypad2=>1,
            KeyCode.Alpha3 or KeyCode.Keypad3=>2, KeyCode.Alpha4 or KeyCode.Keypad4=>3,_=>-1
        };
        int index=page*CardsPerPage+slot;
        if(slot>=0&&index<choices.Length){selectedChoice=index;current.Use();}
        else if(current.keyCode==KeyCode.LeftArrow){TurnPage(-1,pages);current.Use();}
        else if(current.keyCode==KeyCode.RightArrow){TurnPage(1,pages);current.Use();}
        else if(current.keyCode==KeyCode.Return||current.keyCode==KeyCode.KeypadEnter)
        {
            int chosen=choices.Length==1?0:selectedChoice;
            if(chosen>=0&&chosen<choices.Length){ExecuteChoice(choices[chosen]);current.Use();}
        }
    }

    void ExecuteChoice(Choice choice)
    {
        if(choice==null||busy)return;
        awaitingAnimation=true;
        if(lab)Send(new Request{id="preview",moveId=choice.id,actor=previewActor});
        else
        {
            ResetSelection();
            Send(new Request{id=choice.id,moveId=choice.moveId,target=choice.target,boost=choice.boost});
        }
    }
}
