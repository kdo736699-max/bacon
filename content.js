/* Image ownership is explicit. Do not infer projects from filenames or display order. */
const ASSETS = Object.freeze({
  summer: {src:'assets/summer-wallpapers.jpg', title:'乐道的夏天 · 车友照片的 AI 壁纸集锦'},
  sunset: {src:'assets/summer-sunset.jpg', title:'乐道的夏天 · 海边日落壁纸'},
  roadTitle: {src:'assets/roadbook-title.png', title:'乐道的远方 · 有吸引力的标题'},
  roadBody: {src:'assets/roadbook-body.png', title:'乐道的远方 · 对他人有帮助的正文'},
  roadCover: {src:'assets/roadbook-cover.png', title:'乐道的远方 · 让人一眼就想出发的封面'},
  coconut: {src:'assets/coconut.png', title:'Coconut 3.1.0 · 版本升级传播'},
  autumn: {src:'assets/autumn.png', title:'从中秋乐道国庆 · 花式请假互动'},
  portrait: {src:'assets/portrait-work.jpg', title:'赵培涵 · 工作中的我'},
  flowers: {src:'assets/portrait-flowers.jpg', title:'赵培涵 · 花丛中的我'},
  coffee: {src:'assets/portrait-coffee.jpg', title:'赵培涵 · 日常的一杯咖啡'},
  greenDiagram: {src:'assets/green-mechanism.png', title:'绿主妇研究 · 合作生产与公共价值机制图'},
  narrativeMaterial: {src:'assets/experiment-1.png', title:'政策叙事调查实验 · 责任归属 × 结果意识原始材料'},
  interview: {src:'assets/original-01.jpg', title:'田新宇：灵台无计逃神矢'},
  greenland: {src:'assets/original-15.jpg', title:'宇霏：世界比烦恼大得多'},
  xhs: {src:'assets/original-05.jpg', title:'外企逼我开始上班读书了……'},
  mail: {src:'assets/original-10.jpg', title:'外企邮件有时候是真的抽象……'},
  food: {src:'assets/original-12.jpg', title:'你有忌口吗用英语怎么说'},
  john1: {src:'assets/original-13.jpg', title:'当你的外国考官听到地道英语回答'},
  john2: {src:'assets/original-14.jpg', title:'恭喜你引起了外国考官的注意'},
  christmas: {src:'assets/original-11.jpg', title:'坐标上海，外企圣诞放假两周'}
});
const ROOMS = [
  {id:'living',name:'客厅',no:'01',z:1100,side:'left',color:'#b5864c',sub:'关于我'},
  {id:'work',name:'工作间',no:'02',z:2050,side:'right',color:'#436657',sub:'实习经历'},
  {id:'archive',name:'档案室',no:'03',z:3000,side:'left',color:'#a44431',sub:'内容作品'},
  {id:'shop',name:'创意工坊',no:'04',z:3950,side:'right',color:'#456ab1',sub:'动手做点什么'},
  {id:'lab',name:'研究室',no:'05',z:4900,side:'left',color:'#55776f',sub:'研究与追问'},
  {id:'field',name:'门外的田野',no:'06',z:5850,side:'right',color:'#849153',sub:'走进真实的生活'},
  {id:'fire',name:'壁炉边',no:'07',z:6800,side:'left',color:'#aa5535',sub:'运营心得'},
  {id:'window',name:'飘窗',no:'08',z:7650,side:'end',color:'#7094ad',sub:'还有一些我'}
];
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const artwork = (key,cls='',caption='') => `<figure class="artwork ${cls}"><button data-image="${key}" aria-label="放大：${esc(ASSETS[key].title)}"><img src="${ASSETS[key].src}" alt="${esc(ASSETS[key].title)}" loading="lazy" decoding="async"><span class="image-open" aria-hidden="true">↗</span></button>${caption?`<figcaption>${caption}</figcaption>`:''}</figure>`;
const head = (name,line,no) => `<div class="room-title reveal"><span class="room-number latin">${no}</span><h1>${name}</h1><p>${line}</p></div>`;
const drawer = (title,body,meta='',open=false) => `<details class="drawer" ${open?'open':''}><summary><span>${title}</span>${meta?`<small>${meta}</small>`:''}<i aria-hidden="true">＋</i></summary><div class="drawer-body">${body}</div></details>`;
const metric = (n,label) => `<div><strong>${n}</strong><span>${label}</span></div>`;
const link = (url,title) => `<a class="text-link" href="${url}" target="_blank" rel="noopener noreferrer">${title} ↗</a>`;
const INSIGHTS = {
  '说人话': [
    ['学会和用户说话，不要端着。','让对方感到你在现场和他聊天。'],
    ['先想清楚，用户在什么状态下看到这句话。','Push、聊天和长图文，各有自己的字数逻辑。'],
    ['每一次发声，都是品牌之声。','文字和视觉，出街前再读一遍。'],
    ['规则写清楚，是对参与者的体谅。','把容易误解的地方，提前讲明白。'],
    ['和不同的人，说适合他们的话。','从兴趣、场景和行为出发，而不只是群发。']
  ],
  '做人事': [
    ['设计活动时，多想一步。','有趣，也要让人看得懂、参与得了。'],
    ['每一个动作，都应当知道自己要去哪里。','目标想清楚，取舍才有依据。'],
    ['复盘要留下下一次能用的东西。','拆开数量、质量和节奏，再调整动作。'],
    ['时间留一点余地，细节早一点测试。','给协作和意外，都留出空间。'],
    ['先问诉求，再决定是否需要 AI。','工具可以加速，判断不能省略。'],
    ['把基本功练好，少在小事上返工。','文案、排版、表格，都值得认真。'],
    ['看热点和友商，要带着自己的问题。','看过之后，留下能转化的想法。']
  ],
  '讲人情': [
    ['胆大心细，严肃活泼。','真正上手之后，才知道一件小事有多少细节。'],
    ['和伙伴沟通，一次把事情说清楚。','讲清背景、诉求和节点，也站稳自己的立场。'],
    ['有同理心，也有分寸。','认真回应用户，同时守住规则的一致。'],
    ['看见活跃的人，也记得沉默的大多数。','把参与机会设计在规则里，而不是临时改变规则。'],
    ['认同价值观，才能把关系做长。','愿意主动关注用户正在经历什么。']
  ]
};
const PORTRAIT_NOTES = [
  ['一个热爱品鉴美食的<br>非美食家。','有些快乐，只是因为好吃。'],
  ['一个喜欢听落叶沙沙声的<br>观察者。','对不负责提供效率的小事，也保持兴趣。'],
  ['一个喜欢露营徒步的<br>短暂出逃者。','偶尔走远一点，再回来把手边的事做好。'],
  ['一个写过人物，<br>也琢磨过流量的人。','希望文字让人点开，也值得人停留。'],
  ['一个用 AI 做小工具的<br>社会科学学生。','一边把事情做快，一边想，哪里仍然需要有人听。'],
  ['一个思考如何与用户<br>产生联结的运营。','愿意把问题问具体，也愿意把事情做完整。']
];
