export const template = `
<header class="site-header"><a class="brand" href="#"><span class="brand-mark">p<span>•</span></span><span>pet observatory<small>桌宠观察台</small></span></a><div class="header-right"><span class="version">VUEPRESS 2 / v0.1.0</span><button id="dark" class="quiet-button" aria-pressed="false">☾ <span>夜间模式</span></button></div></header>
<main>
<section class="intro"><div><p class="eyebrow">A LITTLE COMPANY, A LIGHTER WEB.</p><h1>认真工作，<br>也要有<span class="headline-pet">豚</span>陪。</h1><p class="intro-copy">一只住在网页角落的小伙伴。没有图形引擎，<br class="desktop-break">只有几帧小小的快乐，和刚刚好的陪伴。</p></div><div class="intro-note"><span class="note-dot"></span>观察记录 / CAPYBARA<br><strong id="intro-pet-note">噜噜带着小南瓜来陪你了。</strong><span>试试戳它，或者把右下角的它拖走 ↘</span></div></section>
<section class="lab" aria-label="桌宠调试台">
<div class="stage"><div class="stage-heading"><span><i class="live-dot"></i> LIVE HABITAT</span><span id="asset-format">WEBP / 192 × 208</span></div><div class="stage-grid"><span class="axis-label axis-y">208</span><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="ground"></div><button id="portrait" aria-label="戳一戳预览水豚"></button><div class="specimen-tag"><span id="specimen-name">水豚噜噜</span><small id="specimen-sub">C. capybara / pumpkin &amp; leaf</small></div><span class="axis-label axis-x">192</span><span class="stage-caption">南瓜帽戴好，慢慢来也很好。</span></div><div class="stage-footer"><span id="status"><i class="live-dot"></i> idle · 自在发呆</span><span>SVG VIEWPORT + CSS STEP-END</span></div></div>
<aside class="controls"><div class="control-heading"><h2>陪伴控制室</h2><span>CONTROL ROOM</span></div><div class="control-section"><div class="field-label">当前住客 <span>02 AVAILABLE</span></div><div class="theme-options"><button class="theme-choice selected" data-theme="0" aria-pressed="true"><span class="swatch" data-preview="0" aria-hidden="true"></span><span>噜噜<small>南瓜帽小伙伴</small></span><span class="theme-check">✓</span></button><button class="theme-choice" data-theme="1" aria-pressed="false"><span class="swatch" data-preview="1" aria-hidden="true"></span><span>柚子<small>内置原创水豚</small></span><span class="theme-check">✓</span></button></div></div><div class="control-section"><div class="field-label">给它一点事情做 <span>ACTIONS</span></div><div class="action-grid">${[
  ['idle', '发呆'],
  ['thinking', '思考'],
  ['working', '敲代码'],
  ['juggling', '挥挥手'],
  ['sleeping', '打瞌睡'],
  ['drag', '小跑步'],
  ['happy', '好耶！'],
]
  .map(
    ([state, label]) =>
      `<button data-state="${state}" class="action ${state === 'idle' ? 'active' : ''}"><span>${label}</span><small>${state}</small></button>`,
  )
  .join(
    '',
  )}</div></div><div class="control-section"><div class="field-label">打个招呼 <span>TIPS</span></div><form id="message-form"><input id="message" aria-label="对桌宠说的话" placeholder="今天也要慢慢来…" maxlength="120"><button aria-label="发送气泡消息" type="submit">↗</button></form><label class="switch-row"><span>显示对话气泡</span><input id="tips-toggle" type="checkbox" checked><span class="switch" aria-hidden="true"></span></label></div><p class="control-footnote">临时动作结束后，自动回到发呆。<br>右下角是真正可以带走的桌宠。</p></aside>
</section>
<section class="under-lab"><div class="principle"><span class="principle-symbol">↳</span><div><h3>轻一点，陪久一点。</h3><p>原生 TypeScript · 零图形引擎依赖 · 尊重减少动态效果设置</p></div></div><div class="event-stream" aria-live="polite"><span>EVENT LOG</span><code id="event-log">系统就绪，正在等待一只水豚…</code></div></section>
<section class="reading" id="reading"><div class="reading-heading"><p class="eyebrow">FIELD NOTES / 使用手记</p><h2>让每一页，都有一个小伙伴。</h2><p>继续往下读，看看它会在什么时候和你打招呼。</p></div><div class="reading-layout"><article><span class="article-index">01 / 住进你的站点</span><h3>两行配置，一个新邻居。</h3><p>插件为 VuePress 2 而生。自动跟随路由、感知阅读进度，在复制代码时为你欢呼。也可以脱离 Vue，直接用原生 JavaScript 挂载。下方配置使用内置柚子；观察台的噜噜单独加载本地主题。</p><div class="code-block"><div><span>.vuepress/config.ts</span><button id="copy-code">复制代码 ↗</button></div><pre><code id="example-code">import { codexClawdPetPlugin } from
  'vuepress-plugin-codex-clawd-pet';

export default {
  plugins: [codexClawdPetPlugin({
    size: 160,
    position: 'bottom-right',
  })],
};</code></pre></div><span class="article-index">02 / 保留你的个性</span><h3>换一套主题，不换一整套引擎。</h3><p>Codex 的 WebP 图集，或 Clawd 的 SVG 状态文件，都可以交给同一个轻量核心。透明背景、精确帧时序、自适应缩放，角色本来的模样，一个也不少。噜噜保留原始 WebP 画质（约 1.53 MB），仅用于本地预览，不计入插件发布包。</p><div class="format-note"><span>pet.json</span><b>→</b><span>轻量适配层</span><b>→</b><span>一只新伙伴</span></div><span class="article-index">03 / 给网页留一点呼吸</span><h3>需要时在场，安静时不打扰。</h3><p>不请求第三方服务，除非你主动开启一言。页面隐藏或挂件收起时，图集动画会暂停。所有监听、请求与定时器，都在卸载时清理。</p><p>现在，你已经读到这页的尾声了。再往下滚动一点，收下来自桌宠的阅读小奖励吧。</p></article><aside class="reading-aside"><span class="mini-mark">🎃</span><h4>观察员小贴士</h4><p>拖动右下角的小伙伴，<br>松手后它会回到最近的底角。</p><hr><p>点工具栏里的减号收起；<br>点恢复按钮，就能再见面。</p><button id="route-test" class="quiet-button">模拟翻到新的一页 ↗</button></aside></div></section>
</main><footer><a class="brand" href="#">pet observatory<span class="footer-dot">•</span></a><span>小小的体积。长长的陪伴。</span><span>MADE FOR THE QUIET MOMENTS.</span></footer>`;
