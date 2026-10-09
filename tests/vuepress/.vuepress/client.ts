import { defineClientConfig, Content, RouteLink } from '@vuepress/client';
import { defineComponent, h } from 'vue';
export default defineClientConfig({
  layouts: {
    NotFound: defineComponent({ setup: () => () => h('p', 'Page not found') }),
    Layout: defineComponent({
      setup: () => () =>
        h('main', { style: 'padding:32px;min-height:180vh;font-family:system-ui' }, [
          h('h1', 'VuePress pet smoke test'),
          h(RouteLink, { to: '/' }, () => 'Home'),
          ' · ',
          h(RouteLink, { to: '/next.html' }, () => 'Next page'),
          h(Content),
        ]),
    }),
  },
});
