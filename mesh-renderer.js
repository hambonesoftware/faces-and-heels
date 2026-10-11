// Small local WebGL depth renderer. Canvas 2D still owns the game HUD and
// preserved sprite fallback; this offscreen surface renders the procedural mesh.
export class MeshRenderer {
  constructor(){
    this.canvas=document.createElement('canvas');this.gl=this.canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true,premultipliedAlpha:false});
    if(!this.gl)return;const gl=this.gl;
    const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
    const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec3 position;attribute vec4 color;uniform vec2 size;varying vec4 tint;void main(){gl_Position=vec4(position.x/size.x*2.0-1.0,1.0-position.y/size.y*2.0,-position.z/20.0,1.0);tint=color;}'));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec4 tint;void main(){gl_FragColor=tint;}'));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    this.program=program;this.buffer=gl.createBuffer();this.position=gl.getAttribLocation(program,'position');this.color=gl.getAttribLocation(program,'color');this.size=gl.getUniformLocation(program,'size');
  }
  paint(faces,width,height,dpr=1){const gl=this.gl;if(!gl||gl.isContextLost())return null;
    const w=Math.round(width*dpr),h=Math.round(height*dpr);if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
    gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.useProgram(this.program);gl.uniform2f(this.size,width,height);
    gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.enableVertexAttribArray(this.position);gl.vertexAttribPointer(this.position,3,gl.FLOAT,false,28,0);gl.enableVertexAttribArray(this.color);gl.vertexAttribPointer(this.color,4,gl.FLOAT,false,28,12);
    const draw=(transparent)=>{const data=[];for(const face of faces){const values=face.color.match(/[\d.]+/g)?.map(Number);if(!values)continue;const alpha=values[3]??1;if((alpha<1)!==transparent)continue;const color=[values[0]/255,values[1]/255,values[2]/255,alpha];for(let i=1;i<face.p.length-1;i++)for(const p of [face.p[0],face.p[i],face.p[i+1]])data.push(p[0],p[1],p[2],...color);}
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,data.length/7);};
    gl.disable(gl.BLEND);gl.depthMask(true);draw(false);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);draw(true);gl.depthMask(true);return this.canvas;
  }
}
