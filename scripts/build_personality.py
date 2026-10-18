"""A local-only, original entertainment questionnaire, separate from calculators."""
from disclaimers import notice

PERSONALITY_TOOL={'id':'mbti','name':'MBTI趣味测试'}

def build_personality(page):
    body='''<link rel="stylesheet" href="/assets/personality.css">
<div class="personality-shell"><a class="back-link" href="/">← 返回工具大厅</a>
<header class="personality-header"><div class="tool-icon" aria-hidden="true">✦</div><div><h1>MBTI趣味测试</h1><p>16型性格探索 · 自编情境问卷，非官方MBTI测评</p></div></header>
<div id="personality-app"><section class="personality-welcome"><div class="personality-welcome-copy"><h2>认识日常里，有趣的自己</h2><p>48道原创生活与职场情境题，四个主题章节，三个可跳过的小剧场；完成后查看四维偏好倾向与趣味性格卡。</p><p>无需注册，答案与进度留在当前浏览器。可选择保存到我的工作台或下载卡片。</p></div></section></div>
<noscript><p>请启用JavaScript开始测试；答题和计分在当前浏览器完成。</p></noscript>
<details class="personality-method"><summary>这份趣味测试怎样得到结果？</summary><p>题目与趣味解读均为本站自编，围绕向外连接或向内充电、具体线索或可能性联想、逻辑权衡或感受与价值、先有计划或保留弹性四组偏好设计。每组12题，含两种方向的表述；五级选择按方向加总，映射为0—100的倾向值，不是能力分数、准确率或人群百分位。两边相同时显示X，不强行归类。</p><p>章节间的小剧场不计分，只将你主动选择的小彩蛋加在结果页。答题题目、计分与性格结果不发送给服务器，进度仅保存在当前浏览器；你可以选择把结果另存到工作台或下载趣味卡片。清除网站数据或换设备无法自动恢复。公开吐槽与答题分别处理，提交吐槽后他人可见。</p><p>此工具没有经过心理测量学验证，不是官方Myers-Briggs Type Indicator®测评；不使用其官方题库、报告或16Personalities的形象。不作临床诊断，不用于招聘录用、绩效评价或岗位适配判断。</p></details>
<section class="panel feedback-panel" id="tool-feedback"><div class="section-heading"><h2>吐槽一下这个测试</h2><span class="panel-subtitle">提交后公开可见</span></div><p>题目、操作或趣味卡片，有什么想法？请勿公开个人答案、联系方式或员工资料。</p><form id="feedback-form"><label class="field"><span class="field-label">你的吐槽</span><textarea name="message" required minlength="2" maxlength="1000" rows="3" placeholder="例如：想再多一点日常生活里的小场景。"></textarea></label><button class="button primary" type="submit">匿名提交</button><p id="feedback-status" role="status"></p></form><div id="feedback-list"></div></section>
'''+notice('personality','测试使用说明')+'''</div><script type="module" src="/assets/personality.js"></script>'''
    page('/tools/mbti/','MBTI趣味测试','48道原创情境题，探索16型性格偏好：四章生活与职场场景、三个趣味彩蛋，免费查看结果并保存性格卡。自编问卷，非官方MBTI测评。',body,'personality',tool='mbti')
