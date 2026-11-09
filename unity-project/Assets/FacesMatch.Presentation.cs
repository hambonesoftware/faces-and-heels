using System;
using System.Collections.Generic;
using UnityEngine;

public sealed partial class FacesMatch
{
    const int CardsPerPage=4;
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
    readonly List<string> history=new();
    int historyPage;
    bool settingsOpen, logOpen;
    Action confirmBout;
    Rect safePixels, arena, header, dock, call;
    float pixelScale;
    bool compactDeck;

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
        bool over=rect.Contains(mouse);
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

    void RefreshLayout(bool force=false)
    {
        float scale=1;
#if UNITY_WEBGL && !UNITY_EDITOR
        scale=Mathf.Max(.5f,FacesWeb_PixelScale());
#endif
        Rect safe=Screen.safeArea;
        if(!force&&safe==safePixels&&Mathf.Approximately(scale,pixelScale))return;
        safePixels=safe;
        pixelScale=scale;
        pressed=null;
        float width=safe.width/scale,height=safe.height/scale;
        bool sideRail=width>=540&&width/height>=1.15f;
        compactDeck=!sideRail||height<490;
        const float gap=8;
        float innerWidth=width-2*gap;
        header=new Rect(gap,gap,innerWidth,62);
        float top=header.yMax+gap;
        float railWidth=sideRail?Mathf.Clamp(width*.29f,compactDeck?Mathf.Min(318,width*.48f):250,395):innerWidth;
        float railHeight=sideRail?height-top-gap:254;
        dock=new Rect(sideRail?width-gap-railWidth:gap,sideRail?top:height-gap-railHeight,railWidth,railHeight);
        float arenaWidth=sideRail?dock.x-2*gap:innerWidth;
        float arenaEnd=sideRail?height-gap:dock.y-gap;
        float callHeight=width<450?61:53;
        call=new Rect(gap,arenaEnd-callHeight,arenaWidth,callHeight);
        arena=new Rect(gap,top,arenaWidth,Mathf.Max(1,call.y-top));
        ringCamera.pixelRect=new Rect(safe.x+arena.x*scale,safe.yMax-arena.yMax*scale,arena.width*scale,arena.height*scale);
        ringCamera.aspect=arena.width/arena.height;
        SetCamera();
    }

    void OnGUI()
    {
        if(pixelScale<=0)return;
        var previous=GUI.matrix;
        var margin=new Vector3(safePixels.x,Screen.height-safePixels.yMax,0);
        GUI.matrix=Matrix4x4.TRS(margin,Quaternion.identity,new Vector3(pixelScale,pixelScale,1));
        DrawSurround();
        bool available=!busy&&match!=null;
        Choice[] choices=match==null?Array.Empty<Choice>():lab?match.previews:match.actions;
        choices??=Array.Empty<Choice>();
        int pages=Mathf.Max(1,(choices.Length+CardsPerPage-1)/CardsPerPage);
        page=Mathf.Clamp(page,0,pages-1);
        if(selectedChoice>=choices.Length)selectedChoice=-1;
        bool canAct=available&&(lab||!match.cpu);
        DrawHud(available);
        DrawCall();
        DrawDock(choices,pages,canAct,available);
        if(Event.current.type==EventType.KeyDown)
        {
            if(Event.current.keyCode==KeyCode.Escape)
            {
                if(settingsOpen||logOpen)ClosePanels();
                else settingsOpen=true;
                Event.current.Use();
            }
            else if(Event.current.keyCode==KeyCode.L)
            {
                ToggleLog();
                Event.current.Use();
            }
        }
        HandleKeys(choices,pages,canAct&&!settingsOpen&&!logOpen);
        if(Event.current.type==EventType.MouseUp)pressed=null;
        GUI.matrix=previous;
    }

    void DrawSurround()
    {
        float width=safePixels.width/pixelScale,height=safePixels.height/pixelScale;
        Draw(new Rect(0,0,width,arena.y),Texture2D.whiteTexture,Ink);
        Draw(new Rect(0,arena.y,arena.x,arena.height),Texture2D.whiteTexture,Ink);
        Draw(new Rect(arena.xMax,arena.y,width-arena.xMax,arena.height),Texture2D.whiteTexture,Ink);
        Draw(new Rect(0,arena.yMax,width,height-arena.yMax),Texture2D.whiteTexture,Ink);
    }

    void DrawHud(bool available)
    {
        float titleWidth=header.width>=710?180:0;
        float fighterWidth=(header.width-titleWidth-60)/2;
        DrawFighter(new Rect(header.x,header.y,fighterWidth,header.height),"stone",match?.stone,Red);
        DrawFighter(new Rect(header.x+fighterWidth+titleWidth+6,header.y,fighterWidth,header.height),"viper",match?.viper,Aqua);
        if(titleWidth>0)
        {
            var logo=new Rect(header.x+fighterWidth+6,header.y+5,titleWidth-6,52);
            Panel(logo,Shape.Slash,Slate,Tint(Gold,.70f));
            Type(logo,"FACES & HEELS",19,Gold,TextAnchor.MiddleCenter,true);
        }
        Chip("settings",new Rect(header.xMax-46,header.y+8,46,46),settingsOpen?"CLOSE":"MENU",Gold,true,()=>{
            bool open=!settingsOpen;
            ClosePanels();
            settingsOpen=open;
        });
    }

    void DrawFighter(Rect rect,string id,Fighter fighter,Color accent)
    {
        bool controls=!lab&&match?.control==id;
        Panel(rect,Shape.Plate,Slate,controls?Gold:Tint(accent,.65f));
        float x=rect.x+10,width=rect.width-20;
        string marker=controls?"CONTROL":mode=="solo"&&!lab?(player==id?"YOU":"CPU"):"";
        bool narrow=rect.width<140;
        float nameWidth=narrow?width-49:width;
        Type(new Rect(x,rect.y+5,nameWidth,22),id.ToUpperInvariant(),narrow?14:17,Paper,TextAnchor.MiddleLeft,true);
        float markerWidth=narrow?46:width;
        Type(new Rect(x+width-markerWidth,rect.y+7,markerWidth,16),marker,narrow?9:10,
            controls?Gold:Silver,TextAnchor.MiddleRight,true);
        if(fighter==null)return;
        var bar=new Rect(x,rect.y+(narrow?26:30),width,5);
        Draw(bar,ShapeTexture(Shape.Slash),new Color32(62,75,94,255));
        float fraction=Mathf.Clamp01(fighter.stamina/(float)Mathf.Max(1,fighter.maxStamina));
        if(fraction>0)Draw(new Rect(bar.x,bar.y,bar.width*fraction,bar.height),ShapeTexture(Shape.Slash),accent);
        string stamina=fighter.stamina+"/"+fighter.maxStamina+" STA";
        string crowd=fighter.crowdResource+" CROWD";
        Type(new Rect(x,rect.y+(narrow?31:38),width,narrow?14:18),
            narrow?stamina:stamina+"   "+crowd,11,Silver,TextAnchor.MiddleLeft,true);
        if(narrow)Type(new Rect(x,rect.y+43,width,16),crowd,10,Silver,TextAnchor.MiddleLeft,true);
    }

    void Chip(string id,Rect rect,string value,Color color,bool enabled,Action action)
    {
        bool click=ShapeButton(id,rect,Shape.Slash,color,enabled);
        Type(rect,value,11,enabled?Paper:Silver,TextAnchor.MiddleCenter,true);
        if(click)action();
    }

    void ClosePanels()
    {
        settingsOpen=false;
        logOpen=false;
        confirmBout=null;
    }

    void ToggleLog()
    {
        bool open=!logOpen;
        ClosePanels();
        logOpen=open;
    }

    void DrawCall()
    {
        Draw(call,Texture2D.whiteTexture,Slate);
        Color accent=statusError?Red:Gold;
        Draw(new Rect(call.x,call.y,3,call.height),Texture2D.whiteTexture,accent);
        float width=call.width-22;
        string label=statusError?"MATCH ERROR":lab?"MOTION LAB":"MATCH CALL";
        string line=lab&&!statusError?previewStatus:status;
        Type(new Rect(call.x+11,call.y+3,width,15),label,11,accent,TextAnchor.MiddleLeft,true);
        Type(new Rect(call.x+11,call.y+19,width,call.height-22),line,14,Paper,TextAnchor.UpperLeft,true,true);
    }

    string TurnLabel()
    {
        if(busy)return awaitingAnimation?"PREPARING EXCHANGE":"EXCHANGE IN PROGRESS";
        if(match==null)return "LOADING ARENA";
        if(lab)return "CHOOSE AN ANIMATION";
        if(!string.IsNullOrEmpty(match.winner))return match.winner.ToUpperInvariant()+" WINS";
        if(match.cpu)return match.actor.ToUpperInvariant()+" · CPU TURN";
        string prompt=match.phase switch
        {
            "NEUTRAL_ROLL"=>"ROLL FOR CONTROL",
            "REACTION"=>"CHOOSE A COUNTER",
            "GROUND_DEFENSE"=>"DEFEND ON THE MAT",
            "HOLD_ESCAPE"=>"ESCAPE THE HOLD",
            "HOLD"=>"WORK THE HOLD",
            "PIN"=>"RESOLVE THE PIN COUNT",
            "PIN_OPPORTUNITY"=>"PIN OR STAY ON OFFENSE",
            _=>"CHOOSE A MOVE"
        };
        if(match.phase=="NEUTRAL_ROLL")return prompt;
        string owner=mode=="local"?match.actor.ToUpperInvariant():"YOUR TURN";
        return owner+" · "+prompt;
    }

    void DrawDock(Choice[] choices,int pages,bool canAct,bool available)
    {
        Draw(dock,Texture2D.whiteTexture,Slate);
        float x=dock.x+8,y=dock.y+6,width=dock.width-16;
        if(settingsOpen){DrawSettings(x,y,width,available);return;}
        if(logOpen){DrawLog(x,y,width);return;}
        Type(new Rect(x+2,y,width-76,44),TurnLabel(),14,Gold,TextAnchor.MiddleLeft,true,true);
        Chip("match-log",new Rect(x+width-68,y,68,44),"LOG",Aqua,true,ToggleLog);

        float footerY=dock.yMax-62;
        int columns=compactDeck?2:1;
        int first=page*CardsPerPage,last=Mathf.Min(choices.Length,first+CardsPerPage);
        int rows=(CardsPerPage+columns-1)/columns;
        float cardTop=y+48;
        float cardWidth=(width-6*(columns-1))/columns;
        float cardHeight=Mathf.Min(compactDeck?65:84,(footerY-cardTop-8-6*(rows-1))/rows);
        for(int i=first;i<last;i++)
        {
            int slot=i-first;
            var card=new Rect(x+slot%columns*(cardWidth+6),cardTop+slot/columns*(cardHeight+6),cardWidth,cardHeight);
            if(DrawMove(card,choices[i],slot,i==selectedChoice||choices.Length==1,canAct))
                selectedChoice=i;
        }

        bool finished=!lab&&!string.IsNullOrEmpty(match?.winner);
        int chosen=choices.Length==1?0:selectedChoice;
        Choice primary=chosen>=0&&chosen<choices.Length?choices[chosen]:null;
        if(pages>1)
        {
            Chip("previous-page",new Rect(x,footerY+6,46,44),"<",Aqua,page>0&&canAct,()=>TurnPage(-1,pages));
            Type(new Rect(x+46,footerY+6,46,44),(page+1)+"/"+pages,12,Silver,TextAnchor.MiddleCenter,true);
            Chip("next-page",new Rect(x+92,footerY+6,46,44),">",Aqua,page+1<pages&&canAct,()=>TurnPage(1,pages));
        }
        else
        {
            string hint=busy?"Watch the exchange":finished?(Input.touchSupported?"Bout complete":"Enter for rematch"):
                primary==null?"Select a card":Input.touchSupported?"Ready to confirm":"Enter to confirm";
            Type(new Rect(x+4,footerY,width-137,54),hint,12,Silver,TextAnchor.MiddleLeft,false,true);
        }

        bool primaryEnabled=finished?available:canAct&&primary!=null;
        var die=new Rect(dock.xMax-134,footerY,126,54);
        if(ShapeButton("execute",die,Shape.Die,Gold,primaryEnabled,primaryEnabled))
        {
            if(finished)Restart();
            else ExecuteChoice(primary);
        }
        var badge=new Rect(die.x+17,die.y+12,29,29);
        Color accent=primaryEnabled?Gold:Silver;
        Panel(badge,Shape.Die,Ink,accent,1);
        Type(badge,"20",13,accent,TextAnchor.MiddleCenter,true);
        string label=finished?"REMATCH":busy?"WAIT":lab?"PLAY":primary?.id=="neutral-roll"?"ROLL":
            primary?.id=="pin-count"?"COUNT":"CONFIRM";
        Type(new Rect(die.x+45,die.y+3,68,48),label,11,primaryEnabled?Paper:Silver,TextAnchor.MiddleCenter,true);
    }

    void DrawSettings(float x,float y,float width,bool available)
    {
        Type(new Rect(x+4,y,width,26),confirmBout==null?"BOUT MENU":"START A NEW BOUT?",15,Gold,TextAnchor.MiddleLeft,true);
        if(confirmBout!=null)
        {
            Type(new Rect(x+4,y+28,width-8,46),"This will end the current bout.",14,Paper,TextAnchor.MiddleLeft,false,true);
            Chip("bout-confirm",new Rect(x,y+78,width,44),"START NEW BOUT",Gold,available,()=>{
                var action=confirmBout;
                ClosePanels();
                action();
            });
            Chip("bout-cancel",new Rect(x,y+126,width,44),"BACK",Silver,true,()=>confirmBout=null);
            return;
        }
        int row=0;
        Rect Next()=>new Rect(x,y+23+row++*45,width,44);
        Rect cameraRow=Next();
#if UNITY_WEBGL && !UNITY_EDITOR
        cameraRow.width=(width-6)/2;
        Chip("fullscreen",MoveRect(cameraRow,cameraRow.width+6,0),"FULLSCREEN",Silver,true,FacesWeb_ToggleFullscreen);
#endif
        Chip("camera",cameraRow,"CAMERA "+(cameraAngle+1),Aqua,true,()=>{
            cameraAngle=(cameraAngle+1)%CameraPositions.Length;
            SetCamera();
        });
        Chip("mode-lab",Next(),lab?"BACK TO MATCH":"MOTION LAB",Gold,available,()=>{
            lab=!lab;
            previewStatus="";
            ResetSelection();
            ClosePanels();
            if(!lab)Send(new Request{id="resume"});
        });
        if(lab)
        {
            Chip("preview-actor",Next(),previewActor=="stone"?"ATTACKER · STONE":"ATTACKER · VIPER",Red,available,
                ()=>previewActor=previewActor=="stone"?"viper":"stone");
            Chip("speed",Next(),halfSpeed?"HALF SPEED":"FULL SPEED",Aqua,available,()=>halfSpeed=!halfSpeed);
        }
        else
        {
            Chip("mode",Next(),mode=="solo"?"SWITCH TO PASS & PLAY":"SWITCH TO SOLO VS CPU",Aqua,available,()=>
                confirmBout=()=>{mode=mode=="solo"?"local":"solo";Restart();});
            Chip("player",Next(),player=="stone"?"SWITCH TO VIPER":"SWITCH TO STONE",Red,available&&mode=="solo",()=>
                confirmBout=()=>{player=player=="stone"?"viper":"stone";Restart();});
            Chip("reset",Next(),"NEW BOUT",Silver,available,()=>confirmBout=Restart);
        }
    }

    void DrawLog(float x,float y,float width)
    {
        Type(new Rect(x+4,y,width-78,44),"MATCH LOG",15,Gold,TextAnchor.MiddleLeft,true);
        Chip("close-log",new Rect(x+width-72,y,72,44),"CLOSE",Aqua,true,ClosePanels);
        const float lineHeight=50;
        int perPage=Mathf.Max(1,Mathf.FloorToInt((dock.height-108)/lineHeight));
        int pages=Mathf.Max(1,(history.Count+perPage-1)/perPage);
        historyPage=Mathf.Clamp(historyPage,0,pages-1);
        if(history.Count==0)Type(new Rect(x+4,y+49,width-8,44),"The first result will appear here.",14,Silver);
        for(int i=0;i<perPage&&historyPage*perPage+i<history.Count;i++)
        {
            float rowY=y+46+i*lineHeight;
            Draw(new Rect(x,rowY,width,1),Texture2D.whiteTexture,Tint(Silver,.3f));
            Type(new Rect(x+4,rowY+4,width-8,44),history[historyPage*perPage+i],13,Paper,TextAnchor.UpperLeft,false,true);
        }
        if(pages<=1)return;
        float bottom=dock.yMax-50;
        Chip("newer",new Rect(x,bottom,80,44),"NEWER",Aqua,historyPage>0,()=>historyPage--);
        Chip("older",new Rect(x+width-80,bottom,80,44),"OLDER",Aqua,historyPage+1<pages,()=>historyPage++);
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
        Type(new Rect(rect.xMax-23,rect.y+5,13,16),(slot+1).ToString(),10,Silver,TextAnchor.MiddleCenter,true);
        string name=choice.label, detail=active?"SELECTED":"";
        int cost=name.IndexOf("  [",StringComparison.Ordinal);
        if(cost>=0)
        {
            detail=name.Substring(cost+2).Replace("[","").Replace("]","");
            name=name.Substring(0,cost);
        }
        if(active&&cost>=0)detail="✓  "+detail;
        int nameSize=rect.width<180?13:15;
        var badge=new Rect(rect.x+8,rect.y+5,18,18);
        Draw(badge,ShapeTexture(Shape.Badge),Tint(accent,.20f));
        Draw(new Rect(badge.x+4,badge.y+4,10,10),Glyph(choice.kind),accent);
        Type(new Rect(rect.x+30,rect.y+5,rect.width-56,18),MoveType(choice.kind),10,accent,TextAnchor.MiddleLeft,true);
        Type(new Rect(rect.x+9,rect.y+21,rect.width-18,rect.height-22-(detail.Length>0?12:0)),
            name,nameSize,canAct?Paper:Silver,TextAnchor.UpperLeft,true,true);
        if(detail.Length>0)
            Type(new Rect(rect.x+9,rect.yMax-16,rect.width-18,14),detail,10,active?Gold:Silver,TextAnchor.MiddleLeft,true);
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
            if(!lab&&!string.IsNullOrEmpty(match?.winner))
            {
                Restart();
                current.Use();
                return;
            }
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
