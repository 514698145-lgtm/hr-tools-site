def build_relax(page):
    body='''<link rel="stylesheet" href="/assets/relax.css">
<div class="relax-heading"><div><div class="eyebrow">A LITTLE BREAK</div><h1>放松一下<span>HR 待办消消乐</span></h1><p>整理小小待办，留一点空间给自己。</p></div><a class="button" id="relax-exit" href="/">回到工具大厅 <kbd>Esc</kbd></a></div>
<div class="relax-layout" id="relax-app">
 <section class="relax-game" aria-label="HR待办消消乐">
  <div class="relax-stats"><div><small>本局得分</small><strong id="game-score">0</strong></div><div><small>已清待办线</small><strong id="game-lines">0</strong></div><div><small>挑战等级</small><strong id="game-level">01</strong></div><button id="game-pause" type="button" aria-label="暂停游戏">Ⅱ</button></div>
  <div class="relax-event"><span id="game-event">每一局，都是新的安排</span><span id="game-combo"></span></div>
  <div class="relax-board-wrap"><div id="game-board" role="group" aria-label="8乘8待办棋盘"></div><div class="relax-overlay" id="game-overlay"><span class="relax-emblem">✦</span><h2>给待办，腾个位置</h2><p>摆放方块，填满一行或一列即可消除。<br>每局随机 · 无尽挑战 · 随时暂停</p><button class="button primary" id="game-start">开始放松</button></div></div>
  <div class="relax-tray"><div><div class="relax-tray-label">本组待办 <small>选一个，再点棋盘放置</small></div><div id="game-rack"></div></div><div class="relax-hold"><div class="relax-tray-label">暂存位</div><div id="game-held"></div><button id="game-hold" type="button">暂存所选</button></div></div>
  <p id="game-status" role="status">拖动方块，或点选后放置；方块左上角对准落点。</p>
  <div class="relax-toolbar"><button id="game-finish" type="button">结束并结算</button><button id="game-sound" type="button" aria-pressed="false">声音：关</button><button id="game-tip-toggle" type="button">收起小贴士</button></div>
  <div class="relax-tip" id="game-tip"><span>摸鱼小贴士</span><p id="game-tip-text"></p></div>
 </section>
 <aside class="relax-leaderboard"><div class="eyebrow">DAILY LEADERBOARD</div><h2>今日 TOP 20 <span>✦</span></h2><p class="relax-board-date" id="board-date">北京时间每日 00:00 换榜</p><div id="game-mine" class="relax-mine">完成一局，留下今天的好成绩。</div><details open id="game-rank-details"><summary>查看今日排行榜</summary><ol id="game-ranking"><li class="rank-empty">正在连接排行榜…</li></ol></details><p class="relax-live" id="board-live" role="status">连接中</p><p class="relax-fine">每人保留今日最高分 · 同分并列<br>仅展示真实成绩，不足 20 人按实际人数显示</p><a class="relax-identity" href="/feedback/" id="game-identity">匿名参与 · 可在我的反馈修改昵称</a></aside>
</div>
<details class="relax-rules"><summary>怎么玩 · 计分与榜单规则</summary><div><p>每组三块，摆完后获得新的一组。填满行或列即可消除，所有颜色都可以一起凑满。大块会逐渐增多；招聘旺季提前一组提示。每组可暂存或交换一次，也可直接取出暂存块摆放。</p><p>每格 1 分；一次消除 k 条线得 100 × k² 分，连续消除另加奖励（每次递增 20 分，最多额外 100 分），清空桌面加 300 分。没有时间分，暂停不扣分。键盘：先选待办块，再用方向键移动棋盘落点，Enter 放置。</p><p>每局独立随机，运气也会影响成绩。结算后经服务器核验进入日榜；同分按首次取得成绩的先后展示，榜单最多展示 20 人。跨日旧局可继续练习，不补入已封榜的昨日。超过 7 天的未完对局可能被清理。</p><p>匿名身份仅在当前浏览器保留，清除网站数据或换设备会产生新身份。联网对局会提交摆放操作和得分用于校验与排名；离线练习不上榜。此游戏仅供休闲娱乐，分数不代表 HR 专业能力。</p></div></details>
<script type="module" src="/assets/relax.js"></script>'''
    body+='''<section class="panel feedback-panel" id="tool-feedback"><div class="section-heading"><h2>吐槽一下这个游戏</h2><span class="panel-subtitle">提交后公开可见</span></div><form id="feedback-form"><label class="field"><span class="field-label">你的吐槽</span><textarea name="message" required minlength="2" maxlength="1000" rows="3" placeholder="难度、操作、玩法，有什么想法？"></textarea></label><button class="button primary" type="submit">匿名提交</button><p id="feedback-status" role="status"></p></form><div id="feedback-list"></div></section>'''
    page('/relax/','放松一下','HR待办消消乐：每局随机的方块消除小游戏，支持暂停续玩与每日TOP20。',body,'relax',tool='relax')
    page('/admin/game/','游戏成绩管理','管理员查看和处理游戏成绩。','''<link rel="stylesheet" href="/assets/relax.css"><a class="back-link" href="/admin/">← 网站管理</a><div class="page-intro"><h1>游戏成绩管理</h1><p>查看最近 200 局结算记录，撤销或恢复异常成绩。</p></div><div id="game-admin"></div><script type="module" src="/assets/relax-admin.js"></script>''','admin')
