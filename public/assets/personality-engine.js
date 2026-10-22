// Original entertainment questionnaire. Not the official MBTI instrument.
export const EDITION='hr-personality-2';
export const PAGE_SIZE=4;
export const AXES=[
 {id:'EI',left:'E',right:'I',title:'能量从哪里来',leftLabel:'向外连接',rightLabel:'向内充电'},
 {id:'SN',left:'S',right:'N',title:'信息怎样入脑',leftLabel:'具体线索',rightLabel:'可能性联想'},
 {id:'TF',left:'T',right:'F',title:'决定怎样形成',leftLabel:'逻辑权衡',rightLabel:'感受与价值'},
 {id:'JP',left:'J',right:'P',title:'节奏怎样安排',leftLabel:'先有计划',rightLabel:'保留弹性'}
];
export const CHAPTERS=[
 {name:'周一开机',line:'从早高峰到茶水间，看看你怎么进入状态。',mark:'01'},
 {name:'灵感营业',line:'新任务来了，你先抓住细节，还是先看到可能？',mark:'02'},
 {name:'协作现场',line:'意见不一样的时候，你的自然反应是什么？',mark:'03'},
 {name:'周末出逃',line:'把工作放一边，听听自己的真实偏好。',mark:'04'}
];
// Four chapters of eight items; retain stable IDs so earlier answers can migrate safely.
const rows=[
 ['q1','EI',1,'新同事加入午餐局，我通常会主动找话题，让大家聊起来。'],
 ['q2','SN',1,'接到陌生任务，我先找一个具体样例，看看成品应该长什么样。'],
 ['q3','TF',1,'两个方案都不错时，我习惯先列标准，再比较各自的收益和代价。'],
 ['q4','JP',1,'周一开始前，我喜欢先把本周重要的事排进日历。'],
 ['q5','EI',-1,'一场热闹的聚会之后，我想先独处一会儿，把电充回来。'],
 ['q6','SN',-1,'听到一个新点子，我的脑海常会接着冒出好几个“还可以这样”。'],
 ['q7','TF',-1,'做决定时，这件事是否符合我重视的价值，对我很重要。'],
 ['q8','JP',-1,'一天里空出一段没安排的时间，我会觉得很自在。'],
 ['q13','EI',-1,'有了新想法，我通常先在心里或纸上理清，再说给别人听。'],
 ['q14','SN',-1,'看到零散的信息，我很自然地会联想它们背后有没有共同规律。'],
 ['q15','TF',-1,'讨论团队安排时，我会先留意这个决定对每个人的感受有什么影响。'],
 ['q16','JP',-1,'临时发现更有吸引力的路线，我愿意改变原来的游玩计划。'],
 ['q17','EI',1,'边和别人讨论边想，往往比一个人闷头想更能让我进入状态。'],
 ['q18','SN',1,'参加培训时，能直接照着操作的步骤会让我更快理解内容。'],
 ['q19','TF',1,'评价一个提议时，我通常先检查前提、证据和推理能否对得上。'],
 ['q20','JP',1,'事情一多，我会先分清顺序，把待办一项项安排好。'],
 ['q25','EI',1,'在不太熟悉的讨论里，我也愿意先开口，把交流带起来。'],
 ['q26','SN',1,'核对资料时，我更容易注意到日期、数字和步骤有没有对应上。'],
 ['q27','TF',1,'遇到分歧，我希望先约定一个大家都能检验的判断标准。'],
 ['q28','JP',1,'约好一件事的时间和方式后，我更愿意尽早确定下来。'],
 ['q29','EI',-1,'一对一深入聊天，比连续认识很多新朋友更让我放松。'],
 ['q30','SN',-1,'别人讲一个实际问题时，我常会想到它未来还可能怎样发展。'],
 ['q31','TF',-1,'团队出现分歧时，我会先试着理解双方各自在意什么。'],
 ['q32','JP',-1,'我喜欢先试一小步，再根据现场反馈调整下一步。'],
 ['q37','EI',-1,'突然多出一整天空闲，我很享受自己安排、不用持续交流的时光。'],
 ['q38','SN',-1,'看到一件普通的小物件，我也可能给它想出全新的用途。'],
 ['q39','TF',-1,'替自己作选择时，我很在意这个选择是否贴合内心真正看重的东西。'],
 ['q40','JP',-1,'即使没有详细行程，我也愿意先出发，路上再发现有意思的地方。'],
 ['q41','EI',1,'忙完一天后，和合拍的人聊聊天，常能让我重新有精神。'],
 ['q42','SN',1,'购买不熟悉的东西，我更依赖具体参数和实际使用体验来理解它。'],
 ['q43','TF',1,'改变原来的判断时，新的证据和更有说服力的理由最能打动我。'],
 ['q44','JP',1,'比起事情一直悬着，我更喜欢在信息足够时作出决定。'],
];
export const QUESTIONS=rows.map(([id,axis,direction,text])=>({id,axis,direction,text}));
export const SCENES=[
 {title:'茶水间突然有了空档',story:'原定的会议取消了，你多出半小时。此刻最想拿到哪张小卡？',choices:[['散步卡','去窗边走走，顺便接收一点阳光。'],['闲聊卡','找位熟悉的同事，聊点工作以外的事。'],['清空卡','把桌面的小待办收好，享受一下清爽。']]},
 {title:'你领到了一间小小办公室',story:'预算只够先添一件东西，你想先把什么搬进去？',choices:[['绿植角','让每次抬头，都遇见一点绿色。'],['灵感墙','把随手冒出的点子都贴起来。'],['零食站','留一点补给，也留一个聊天的理由。']]},
 {title:'周五下班的传送门',story:'关上电脑，门后有三个目的地。今晚你想去哪儿？',choices:[['城市漫游','走一条没走过的路，看看会遇见什么。'],['熟悉小店','点一份喜欢的食物，安心坐下来。'],['居家充电','换上舒服的衣服，把时间交还给自己。']]}
];
const types={
 INTJ:['路线规划师','脑海里有一张地图，连转弯都想过第二种走法。','先理清方向，再把想法慢慢落地。'],
 INTP:['灵感解码员','别人看到一个问题，你看到一串值得拆开的问号。','给自己一点安静时间，线索就开始连起来。'],
 ENTJ:['推进队长','当大家还在看地图，你已经想好第一站怎么到达。','目标清楚、边界明确的时候，行动就有了节奏。'],
 ENTP:['点子发动机','你的“要不试试”后面，常常藏着一个新入口。','和人碰撞想法，再给可能性留一扇窗。'],
 INFJ:['安静导航员','话不一定很多，但你常在认真听见故事的另一面。','在独处中整理思绪，在交流中寻找意义。'],
 INFP:['故事收藏家','普通的一天，也能被你收进很特别的一页。','真正在意的事情，会让你愿意投入很久。'],
 ENFJ:['氛围引路人','让人愿意说话，也让想法有机会被听见。','和人连接、看见共同方向，是你的舒适区。'],
 ENFP:['灵感连接员','一个话题接着一个话题，人与点子在你这里碰头。','有交流、有新鲜感，生活就有更多入口。'],
 ISTJ:['秩序收藏家','把零散的小事收好，也把承诺放在心上。','熟悉的信息、明确的安排，让你更容易安心推进。'],
 ISFJ:['细节照看员','你记得的那件小事，可能正好让别人觉得暖。','安静、具体、照顾得到，是你舒服的相处节奏。'],
 ESTJ:['执行调度员','把“我们来做吧”，接成一张能开始的行动表。','聊清楚分工，再把每一段安排接起来。'],
 ESFJ:['团队补给官','进度需要照看，大家的状态也值得被记住。','熟悉的人与确定的安排，让协作更有温度。'],
 ISTP:['现场拆解员','碰到新东西，你很想看看它到底怎样运转。','观察、试一下，再按真实反馈调整。'],
 ISFP:['日常调色师','你给生活留的位置，常常刚好装得下小小的美好。','舒服的节奏与真实体验，会让你更自在。'],
 ESTP:['行动探路员','先走到现场看看，答案也许就在下一步里。','交流、体验、即时反馈，给你带来行动的能量。'],
 ESFP:['快乐召集人','你让“今天做点什么”，听起来就值得出门。','具体的体验与身边的人，让平常日子也鲜活。']
};
export const TYPES=Object.fromEntries(Object.entries(types).map(([code,[name,line,detail]])=>[code,{name,line,detail}]));
function scoreTotals(sums,itemsPerAxis){
 const axes=AXES.map(axis=>{
  const sum=sums[axis.id],max=itemsPerAxis*2;
  if(!Number.isInteger(sum)||Math.abs(sum)>max)throw Error('保存的结果无效');
  const left=Math.round(50+sum/max*50);
  return {...axis,sum,leftPercent:left,rightPercent:100-left,letter:sum===0?'X':sum>0?axis.left:axis.right,close:Math.abs(sum)/max<=1/6};
 });
 const code=axes.map(a=>a.letter).join('');
 const profile=TYPES[code]||{name:'多面探索家',line:'有些偏好还在中间，也可以保留不急着定义的自己。',detail:'X表示这组回答刚好平衡；本次不强行替你选边。'};
 return {code,axes,...profile};
}
export function scoreAnswers(answers){
 if(!answers||typeof answers!=='object')throw Error('请先完成全部题目');
 const sums=Object.fromEntries(AXES.map(axis=>{
  const qs=QUESTIONS.filter(q=>q.axis===axis.id);
  if(qs.some(q=>!Number.isInteger(answers[q.id])||Math.abs(answers[q.id])>2))throw Error('还有题目未完成，请按自己的习惯选择');
  return [axis.id,qs.reduce((sum,q)=>sum+answers[q.id]*q.direction,0)];
 }));
 return scoreTotals(sums,QUESTIONS.length/AXES.length);
}
export function restoreResult(record){
 const edition=record?.result?.version,stored=record?.personality;
 if(![EDITION,'hr-personality-1'].includes(edition)||!Array.isArray(stored?.axes)||stored.axes.length!==AXES.length)throw Error('保存的结果无效');
 if(new Set(stored.axes.map(a=>a.id)).size!==AXES.length)throw Error('保存的结果无效');
 const result=scoreTotals(Object.fromEntries(stored.axes.map(a=>[a.id,a.sum])),edition==='hr-personality-1'?12:8);
 if(result.code!==stored.code)throw Error('保存的结果无效');
 return result;
}
export function funDetails(result){
 const [energy,info,decision,pace]=result.axes.map(a=>a.letter);
 return [
  ['补能方式',energy==='E'?'找合拍的人聊一会儿':energy==='I'?'留一段不被打扰的时间':'独处与交流，按当天电量切换'],
  ['开会画风',info==='N'?'“这个想法还能接到哪里？”':info==='S'?'“能给我看一个具体例子吗？”':'一边抓细节，一边看新可能'],
  ['常用台词',decision==='T'?'“我们把依据和标准放一起看看。”':decision==='F'?'“我想先听听大家在意什么。”':'“把依据和彼此的关注点都说清楚。”'],
  ['理想节奏',pace==='J'?'日历有安排，心里就有空位':pace==='P'?'留点空白，给临时灵感一张票':'重要的先约好，其他的留点弹性']
 ];
}
export function restoreDraft(raw){
 if(!raw||![EDITION,'hr-personality-1'].includes(raw.edition)||!raw.answers||typeof raw.answers!=='object')return null;
 const answers=Object.fromEntries(QUESTIONS.filter(q=>Number.isInteger(raw.answers[q.id])&&Math.abs(raw.answers[q.id])<=2).map(q=>[q.id,raw.answers[q.id]]));
 const scenes={};SCENES.forEach((s,i)=>{const choice=raw.scenes?.[i];if(Number.isInteger(choice)&&choice>=0&&choice<s.choices.length)scenes[i]=choice;});
 const firstMissing=QUESTIONS.findIndex(q=>!(q.id in answers));
 const migrated=raw.edition!==EDITION;
 const page=migrated?(firstMissing<0?7:Math.floor(firstMissing/PAGE_SIZE)):(Number.isInteger(raw.page)?Math.max(0,Math.min(7,raw.page)):0);
 return {edition:EDITION,answers,scenes,page,finished:raw.finished===true&&Object.keys(answers).length===QUESTIONS.length};
}
