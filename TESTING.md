# 桌宠自动化测试与 Playground 验收

## 1. 运行与覆盖率门禁

要求 Node ≥22.12（建议 Node 24）。测试依赖均为 devDependencies：Vitest 3.2.x、jsdom 26、`@testing-library/dom`、与 Vitest 配套的 `@vitest/coverage-v8`。

```sh
npm ci
npm run check
npm test
npm run test:coverage
npm run test:watch
npm run format:check
npm run build:playground
npm run docs:build
# 可选：验证用例不依赖执行顺序
npm test -- --sequence.shuffle --sequence.seed=42
```

`vitest.config.ts` 同时收集新增 `test/**/*.spec.ts` 和保留的 `tests/**/*.test.ts`。测试不会请求真实外网；一言与主题响应均由每个用例显式 stub。

覆盖率使用 V8，HTML 报告为 `coverage/index.html`，还输出 lcov 和 JSON summary。**逐文件**最低门禁：语句/行/函数 90%，分支 80%。统计核心可执行逻辑、Node 入口和客户端选项映射；排除纯类型、纯导出 barrel、CSS 字符串。Vue 的生命周期组件与 `config.ts` 不纳入 jsdom 覆盖率，由真实 VuePress SSR 构建和浏览器冒烟验收；因此该指标不是整个应用的 E2E 覆盖率。

CI 保留 Windows/Linux + Node 24 矩阵，执行覆盖率门禁并上传报告；本地通过不等于远端 CI 已运行。

## 2. 完整可执行测试源码

| 文件                                                     | 主要断言                                                                                        |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [vitest.config.ts](vitest.config.ts)                     | jsdom、URL、测试收集、mock 恢复、V8 逐文件门禁                                                  |
| [test/setup.ts](test/setup.ts)                           | 每例恢复视口/滚动属性，matchMedia EventTarget，鼠标型 PointerEvent shim，默认禁止网络           |
| [test/support.ts](test/support.ts)                       | 共享主题、Shadow DOM 查询、由真实 inline style 推导的 jsdom 几何、RAF 推进、实例清理            |
| [test/parser.spec.ts](test/parser.spec.ts)               | viewBox、帧数/跨行索引、Clawd 备选图片、严格拒绝坏配置、初始默认帧降级、换宠失败保留、15 秒超时 |
| [test/state-machine.spec.ts](test/state-machine.spec.ts) | 初始 idle、duration−1/duration 边界、重复合并、优先级、锁、抢占、夜间待机、重入销毁             |
| [test/interaction.spec.ts](test/interaction.spec.ts)     | click、aria-live、安全纯文本、0/50/100 阅读去重、滚动批处理、暗色、复制防抖、工具栏、可见性暂停 |
| [test/drag.spec.ts](test/drag.spec.ts)                   | 鼠标指针流、delta、负/超限坐标、阈值、多指针过滤、capture/cancel、点击抑制、禁用、resize        |
| [test/destroy.spec.ts](test/destroy.spec.ts)             | DOM 移除、全局事件 AbortSignal、Observer、定时器/RAF、进行中请求、重复生命周期、实例隔离        |

所有文件都是完整测试，不含伪实现/待补断言。保留 `tests/` 中的 Codex V1/V2、不等长帧、SVG 关键帧、协议安全、SSR 及 VuePress base 测试，避免用新测试替换已有覆盖。

### 重要验收约定

- **坏配置处理分层**：`normalizeTheme()` 严格抛错，保留诊断能力；首次挂载失败报告 `onError`，改用内置 192×208 的 `[0]` 待机帧；后续主动换宠失败保留旧主题并拒绝 Promise。不会默默把无效协议当成合法资产。
- **调度**：`priority` 默认 0；`interruptible: false` 丢弃同级/低级，不排队，更高优先级可抢占。同一动作重复触发不延长时限。`duration: 0` 一直保持到替换/reset。夜间休眠与显式 reset 的规则详见 README。
- **拖拽**：生产代码是 Pointer Events + CSS `translate3d`，不是 legacy mouse listeners 或 `left/top`。真实浏览器中的鼠标手势会发出这些 pointer 事件；jsdom 的合成 `mousedown` 不会自动转成 pointer 流。测试因此直接模拟 `pointerType: 'mouse'` 的 down/move/up，并验证 transform 的 x/y；不为测试额外引入重复鼠标监听器。
- **jsdom 不计算布局**：`getBoundingClientRect` shim 从组件写入的 transform、宽高与 toolbar 可见性构造矩形，不写死预期位置。真实 CSS 视口裁切、指针捕获及手感仍需浏览器检查。
- **事件注销**：实现通过 `{ signal }` 注册监听。断言 signal 已 abort 且旧事件无副作用，不要求 `removeEventListener` spy 必须有调用（浏览器的 AbortSignal 注销不经过 JS spy）。
- **零计时器**：先销毁，再检查 `vi.getTimerCount() === 0`，最后恢复真实时钟；不先清空时钟掩盖泄漏。pending fetch 在 abort 时也同步取消其超时器。
- **内存结论边界**：这些断言证明所检查资源已释放，不能证明所有浏览器/第三方素材下绝对没有内存泄漏。真实 GC、解码内存和 GPU 合成要单独测。

## 3. Playground 人工 Check-list

启动开发预览：

```sh
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

打开 `http://127.0.0.1:5173/`。如果已有该端口预览在运行，直接使用它，勿重复启动。另做一次生产产物验收：

```sh
npm run build:playground
npx vite preview --config playground/vite.config.ts --host 127.0.0.1 --port 4173 --strictPort
```

打开 `http://127.0.0.1:4173/`。记录浏览器/系统、窗口尺寸、缩放、截图和 Console/Network 错误。至少覆盖 Chromium 与 Firefox；Safari/WebKit、真机触屏为发布前扩展矩阵，不因 jsdom 通过而自动标记通过。

### A. 初次加载与动画

- [ ] 页面加载后仅一个 `.codex-clawd-pet`，默认右下角；欢迎气泡可读，资源无 404，Console 无异常。
- [ ] 点击 idle/thinking/working/juggling/sleeping/drag/happy：对应帧变化，画面不串行、不露相邻格、不在循环末尾闪白。
- [ ] 单次动作结束自动回到 idle；快速切换到另一动作，旧计时器不能提前重置新动作。
- [ ] 同一个动作连续点击不会无限延长截止时间；键盘 Enter/Space 能触发按钮。
- [ ] 默认中央与右下角均显示水豚噜噜（南瓜帽、绿色小包）。切换噜噜 / 柚子，形态、名称、缩略图选中态和动作文案同步；工具栏换宠同样同步，不产生第二个挂件。内置月白 SVG 可在 VuePress 示例中另测。
- [ ] 噜噜原图请求仅一份（1536×1872 WebP，约 1.53 MB），无桌面路径或外链 SVG；左右拖拽使用对应方向跑步帧。暖黄/橙/绿日间与森林绿夜间，气泡和工具栏颜色跟随。
- [ ] 点击预览大水豚，气泡是可读中文而不是问号占位文本。

### B. 交互、阅读与复制

- [ ] 点击浮动宠物触发 happy 和戳一戳提示；持续时间后隐藏。
- [ ] 输入长中文/换行/`<img src=x onerror=alert(1)>`，只显示文本，不执行 HTML，不撑破视口。
- [ ] 气泡开关关闭后，点击、阅读、复制均不显示气泡；恢复后重新可用。
- [ ] 点击“模拟翻到新的一页”，出现 0% 消息；滚到约 50% 和底部各提示一次；来回滚动不重复；再次模拟路由后可重新触发。
- [ ] 允许 0.5 个百分点的进度容差；直接从顶部跳到底部仅显示最终撒花，不依次刷屏；不可滚动的短页面不虚报 100%。
- [ ] 复制示例代码/选中 code 后 Ctrl+C，出现欢呼；复制正文普通文本不欢呼；快速重复不会刷屏。
- [ ] 返回顶部有效；收起后只剩恢复按钮，展开恢复宠物，不创建重复实例。

### C. 拖拽、边界与运动偏好

- [ ] 主鼠标按住宠物，拖动跟手且进入 drag；松手吸附到最近底角，动画自然，无逐帧 JS 物理循环。
- [ ] 向左上负坐标、右下极限方向拖拽：宠物不能完全跑出视口；拖拽期间 resize 也不会丢失挂件。
- [ ] 移动小于 4px 仍视为点击；拖动松手后的合成 click 不额外戳一戳；右键不拖动。
- [ ] 拖到按钮外仍可跟踪（真实 pointer capture）；触屏拖拽、系统中断/pointercancel 后不永久停留 drag。
- [ ] 使用 390×844、180px 窄视口以及横屏短视口，宠物/工具栏可恢复，页面无新增横向溢出。极端小于工具栏/恢复按钮的视口不是支持目标。
- [ ] DevTools 开启 prefers-reduced-motion：受控图集暂停，停靠不做过渡；切后台或最小化时受控图集暂停。

### D. 暗色与高级配置

- [ ] 点击夜间模式，根元素变暗且挂件 `data-dark=true`。默认 `darkBehavior: 'dim'`，验证滤镜而不是要求 sleeping。
- [ ] 单独验收 `class='dark'` 时，先清除根节点 `data-theme`/`data-color-mode`，避免显式 light 覆盖系统/类名判断。
- [ ] 临时把 `playground/main.ts` 初始化参数改成 `darkBehavior: 'sleep'`，刷新后夜间进入 sleeping；单次动作结束回 sleeping，恢复白天回 idle。验收后还原改动。
- [ ] 临时设置 `draggable: false`，不能拖动；设置 `dock: false`，松手保留落点；`position: 'bottom-left'` 初始在左下。
- [ ] 优先级人工复验：临时把传入主题的 juggling 设为 `{ frames: [18,19], duration: 3000, priority: 10, interruptible: false }`。点击 juggling 后点 working：应保留 juggling 直到 3 秒到期；低级动作不能在之后被补播。设置 working.priority=20 后才允许抢占。验收后还原。
- [ ] 初始 `theme` 临时设为一个不存在的清单 URL：记录诊断，仍显示默认待机首帧；之后换到坏主题应保留当前宠物。缺图但 JSON 合法是另一类图像加载错误，当前仅报告，不属于清单降级保证。
- [ ] 一言默认不访问第三方；仅临时 opt-in 后测试成功/离线/超时，以及关闭提示、收起、后台时不发起新请求。

### E. 生命周期与性能

- [ ] 修改代码触发 HMR 后仍仅一个挂件；路由与挂载/销毁重复 20 次不累积全局监听或 RAF/interval 活动。
- [ ] DevTools Memory 对比重复操作前后快照，主动 GC；不应出现持续增加且由监听/闭包保留的已销毁 PetWidgetUI/节点。排除 Console 自己持有对象、图像缓存造成的误判。
- [ ] CPU 4× 降速拖动并录制 Performance：无持续 JS 切帧循环、无高频布局抖动。原画为 6–10fps；合成刷新率不等于原画帧率，不据此宣称所有设备恒定 60fps。
- [ ] 键盘 Tab 能进入工具栏，焦点可见，收起/展开焦点合理；气泡使用 polite live region。自动 axe 通过仍需人工检查对比度/遮挡。

## 4. VuePress 2 生产 E2E 方案

```sh
npm run docs:build
npx vite preview --outDir tests/vuepress/.vuepress/dist --base /pet-docs/ --host 127.0.0.1 --port 4174 --strictPort
```

访问 `http://127.0.0.1:4174/pet-docs/`：

- [ ] SSR 构建通过（含 NotFound），运行时无 hydration 警告、无 `window/document is not defined`。
- [ ] 首页仅一个挂件，图集 URL 包含 `/pet-docs/assets/`，不误请求域名根部 `/assets/`。
- [ ] 点击 Next page 到 `/pet-docs/next.html`，仍只有一个挂件，出现“新的一页，出发！”；回退/前进仍正常。
- [ ] 对 next.html 直接刷新，资源与挂件仍正常。
- [ ] 主题清单放入 public/pets 后，验证 manifest 与内嵌资源的 base 路径；使用 CDN 清单时相对资源跟随最终响应 URL。

## 5. 本轮实际执行结果（2026-10-09）

- 108 项 Vitest 测试通过（新增五类测试 58 项，原有 48 项保留，另补 2 项客户端路径用例）。
- V8：语句/行 98.94%，分支 88.61%，函数 98.90%；口径见第 1 节。
- TypeScript 严格检查、Playground 生产构建、插件构建、VuePress 3 页静态构建通过。
- 本轮 Chromium 154 浏览器冒烟：juggling→idle、真实鼠标拖拽→drag→左下吸附 x=24、SVG 换宠、收起/恢复、暗色滤镜、390×844 无横向溢出、VuePress 子路径资源/SPA 路由单实例均通过，未观察到页面异常。
- Firefox/Safari、真机触屏、长时间堆快照与网络故障人工验收本轮未执行；上面的复选框是可复用验收表，不是全部已签收。

### Lulu 展示主题更新（2026-10-09）

- 新增 `tests/playground-theme.test.ts` 的 5 项回归：默认展示配置、原图 SHA-256/透明通道/几何尺寸、动作映射、左右跑步行、840ms 单次跳跃。总计 113 项测试。
- Chromium 154：中央与挂件默认噜噜、真实图集加载、juggling→idle、控制室/工具栏双向换宠、真实鼠标 drag-left / drag-right 与松手回 idle、收起/恢复、日夜皮肤均验证。
- 390×844 视口无横向溢出，预览图集完整落在舞台内，帽子不裁切、名称与脚部不重叠；页面与挂件日夜配色截图位于 `.artifacts/lulu-*.png`。
- axe WCAG 2 A/AA 未报告确定违规；图像/背景相关的色彩对比度仍有 incomplete 项，不等于完整无障碍认证。
- 原图与用户提供文件 SHA-256 相同；仅用于 Playground，插件默认主题及 npm 包主题列表不变。
