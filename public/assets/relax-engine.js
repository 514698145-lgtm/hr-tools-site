// Shared deterministic rules: the server replays the same actions as the browser.
export const VERSION = 1;
export const LABELS = ['招聘','入职','考勤','薪资','培训','档案'];
const SHAPES = [
 [[0,0]], [[0,0],[1,0]], [[0,0],[1,0],[2,0]], [[0,0],[0,1],[1,1]],
 [[0,0],[1,0],[0,1],[1,1]], [[0,0],[1,0],[2,0],[3,0]],
 [[0,0],[0,1],[0,2],[1,2]], [[0,0],[1,0],[2,0],[1,1]],
 [[0,0],[1,0],[1,1],[2,1]], [[0,0],[1,0],[2,0],[3,0],[4,0]],
 [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]],
 [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]],
 [[0,0],[0,1],[0,2],[1,2],[2,2]]
];
function random(s) { let x=s.rng; x^=x<<13; x^=x>>>17; x^=x<<5; s.rng=x>>>0; return s.rng/4294967296; }
function piece(s) {
 const difficult=Math.min(.62,.16+(s.level-1)*.075+(s.rush?.25:0));
 const pool=random(s)<difficult?SHAPES.slice(5):SHAPES.slice(0,9);
 let cells=pool[Math.floor(random(s)*pool.length)].map(p=>[...p]);
 const turns=Math.floor(random(s)*4);
 for(let i=0;i<turns;i++) cells=cells.map(([x,y])=>[-y,x]);
 const minX=Math.min(...cells.map(c=>c[0])),minY=Math.min(...cells.map(c=>c[1]));
 return {cells:cells.map(([x,y])=>[x-minX,y-minY]),color:1+Math.floor(random(s)*6)};
}
function deal(s) {
 s.group++; s.level=Math.min(7,1+Math.floor((s.group-1)/10));
 s.rush=s.group===s.nextRush;
 if(s.rush)s.nextRush=s.group+4+Math.floor(random(s)*3);
 s.rack=[piece(s),piece(s),piece(s)];s.holdUsed=false;
}
export function createGame(seed) {
 const s={version:VERSION,rng:(seed>>>0)||1,board:Array(64).fill(0),rack:[],hold:null,holdUsed:false,group:0,level:1,nextRush:4,score:0,combo:0,lines:0,moves:0,over:false,lastClear:[],lastGain:0};
 s.nextRush=4+Math.floor(random(s)*3);deal(s);return s;
}
export const getPiece=(s,slot)=>slot===3?s.hold:s.rack[slot];
export function fits(s,p,x,y) {
 return !!p&&Number.isInteger(x)&&Number.isInteger(y)&&p.cells.every(([dx,dy])=>x+dx>=0&&x+dx<8&&y+dy>=0&&y+dy<8&&!s.board[(y+dy)*8+x+dx]);
}
export function placements(s,p) {const out=[];for(let y=0;y<8;y++)for(let x=0;x<8;x++)if(fits(s,p,x,y))out.push([x,y]);return out;}
export function fullLines(board) {
 const cells=new Set();let count=0;
 for(let i=0;i<8;i++){
  const row=Array.from({length:8},(_,j)=>i*8+j),col=Array.from({length:8},(_,j)=>j*8+i);
  for(const line of [row,col])if(line.every(n=>board[n])){count++;line.forEach(n=>cells.add(n));}
 }return {count,cells:[...cells]};
}
export function applyAction(state,a) {
 if(state.over)throw Error('这一局已经结束');
 const s=structuredClone(state);s.lastClear=[];s.lastGain=0;
 if(!a||!Number.isInteger(a.slot)||a.slot<0||a.slot>3)throw Error('请选择一个待办块');
 const p=getPiece(s,a.slot);if(!p)throw Error('这个位置没有待办块');
 if(a.type==='hold'){
  if(a.slot===3||s.holdUsed)throw Error('每组只能暂存或交换一次');
  [s.rack[a.slot],s.hold]=[s.hold,p];s.holdUsed=true;
 }else if(a.type==='place'){
  if(!fits(s,p,a.x,a.y))throw Error('这里放不下，换个位置试试');
  for(const [dx,dy]of p.cells)s.board[(a.y+dy)*8+a.x+dx]=p.color;
  if(a.slot===3)s.hold=null;else s.rack[a.slot]=null;
  const clear=fullLines(s.board);s.lastClear=clear.cells;clear.cells.forEach(n=>s.board[n]=0);
  s.combo=clear.count?s.combo+1:0;s.lines+=clear.count;s.moves++;
  s.lastGain=p.cells.length+100*clear.count**2+(clear.count?20*Math.min(s.combo-1,5):0)+(s.board.every(x=>!x)?300:0);s.score+=s.lastGain;
 }else throw Error('操作无效');
 if(s.rack.every(x=>!x))deal(s);
 s.over=![...s.rack,s.hold].some(p=>placements(s,p).length);
 return s;
}
