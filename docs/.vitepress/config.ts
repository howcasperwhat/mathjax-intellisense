import type { DefaultTheme } from 'vitepress'
import { defineConfig } from 'vitepress'

const title = 'MathJax IntelliSense'
const description = 'Documentation for MathJax IntelliSense plugins.'

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
    text: 'Guides',
    items: Guides,
    activeMatch: '^/guides/',
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

export default defineConfig({
  base: '/mathjax-intellisense/',
  lang: 'en-US',
  title,
  description,
  themeConfig: {
    logo: '/logo.svg',
    nav: Nav,
    sidebar: Sidebar,
  },
})
