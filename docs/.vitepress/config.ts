import type { DefaultTheme } from 'vitepress'
import { defineConfig } from 'vitepress'
import { version } from '../package.json'

const title = 'MathJax IntelliSense'
const description = 'Documentation for MathJax IntelliSense extensions.'

const Guides: DefaultTheme.NavItemWithLink[] = [
  { text: 'Getting Started', link: '/guides/' },
]

const Extensions: DefaultTheme.NavItemWithLink[] = [
  { text: 'IntelliSense for C/C++', link: '/extensions/mathjax-intellisense-ccpp' },
  { text: 'IntelliSense for Python', link: '/extensions/mathjax-intellisense-python' },
  { text: 'Comment Formula', link: '/extensions/comment-formula' },
  { text: 'MathJax Highlight', link: '/extensions/mathjax-highlight' },
]

const Configurations: DefaultTheme.NavItemWithLink[] = [
  { text: 'interval', link: '/configs/interval' },
  { text: 'color', link: '/configs/color' },
  { text: 'scale', link: '/configs/scale' },
  { text: 'code', link: '/configs/code' },
  { text: 'preview', link: '/configs/preview' },
  { text: 'preload', link: '/configs/preload' },
  { text: 'mode', link: '/configs/mode' },
]

const Commands: DefaultTheme.NavItemWithLink[] = [
  { text: 'mode', link: '/commands/mode' },
]

const Nav: DefaultTheme.NavItem[] = [
  {
    text: 'Playground',
    link: 'https://howcasperwhat.github.io/mathjax-playground/',
  },
  {
    text: 'Extensions',
    items: Extensions,
    activeMatch: '^/extensions/',
  },
  {
    text: 'Configurations',
    items: Configurations,
    activeMatch: '^/configs/',
  },
  {
    text: 'Commands',
    items: Commands,
    activeMatch: '^/commands/',
  },
  {
    text: `v${version}`,
    items: [
      {
        text: 'Release Notes',
        link: 'https://github.com/howcasperwhat/mathjax-intellisense/releases',
      },
      {
        text: 'Contributing',
        link: 'https://github.com/howcasperwhat/mathjax-intellisense/blob/main/.github/CONTRIBUTING.md',
      },
    ],
  },
]

const SidebarGuides: DefaultTheme.SidebarItem[] = [
  {
    text: 'Guides',
    items: Guides,
  },
]

const SidebarExtensions: DefaultTheme.SidebarItem[] = [
  {
    text: 'Extensions',
    items: Extensions,
  },
]

const SidebarConfigs: DefaultTheme.SidebarItem[] = [
  {
    text: 'Configurations',
    items: Configurations,
  },
]

const SidebarCommands: DefaultTheme.SidebarItem[] = [
  {
    text: 'Commands',
    items: Commands,
  },
]

const SidebarItems = [
  ...SidebarGuides,
  ...SidebarExtensions,
  ...SidebarConfigs,
  ...SidebarCommands,
]

const Sidebar: DefaultTheme.Sidebar = {
  '/guides/': SidebarItems,
  '/extensions/': SidebarItems,
  '/configs/': SidebarItems,
  '/commands/': SidebarItems,
}

const base = '/mathjax-intellisense/'
export default defineConfig({
  base,
  lang: 'en-US',
  title,
  titleTemplate: title,
  description,
  lastUpdated: true,
  cleanUrls: true,
  themeConfig: {
    search: {
      provider: 'local',
    },
    logo: '/favicon.svg',
    nav: Nav,
    sidebar: Sidebar,
    outline: 'deep',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/howcasperwhat/mathjax-intellisense' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025-PRESENT Casper Huang',
    },
  },
  head: [
    ['link', { rel: 'icon', href: `${base}favicon.svg`, type: 'image/svg+xml' }],
    ['link', { rel: 'alternate icon', href: `${base}favicon.ico`, type: 'image/png', sizes: '16x16' }],
    ['meta', { name: 'author', content: 'Casper Huang' }],
  ],
})
