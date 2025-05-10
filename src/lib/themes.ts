import type { HugoTheme } from './types';

export const predefinedThemes: HugoTheme[] = [
  {
    id: 'ananke',
    name: 'Ananke',
    gitUrl: 'https://github.com/theNewDynamic/gohugo-theme-ananke.git',
    imageUrl: 'https://picsum.photos/seed/ananke-theme/300/200',
    description: 'A clean, accessible theme with a focus on readability.',
    tags: ['blog', 'accessible', 'minimal'],
    dataAiHint: 'minimal tech',
  },
  {
    id: 'hermit',
    name: 'Hermit',
    gitUrl: 'https://github.com/Track3/hermit.git',
    imageUrl: 'https://picsum.photos/seed/hermit-theme/300/200',
    description: 'A minimal and fast theme for personal blogs.',
    tags: ['minimal', 'fast', 'personal'],
    dataAiHint: 'modern code',
  },
  {
    id: 'clarity',
    name: 'Clarity',
    gitUrl: 'https://github.com/chipzoller/hugo-clarity.git',
    imageUrl: 'https://picsum.photos/seed/clarity-theme/300/200',
    description: 'A theme designed for documentation and blogs with a clean UI.',
    tags: ['documentation', 'blog', 'clean'],
    dataAiHint: 'sleek design',
  },
  {
    id: 'beautifulhugo',
    name: 'Beautiful Hugo',
    gitUrl: 'https://github.com/halogenica/beautifulhugo.git',
    imageUrl: 'https://picsum.photos/seed/beautiful-hugo/300/200',
    description: 'A visually appealing theme for Hugo blogs.',
    tags: ['blog', 'portfolio', 'responsive'],
    dataAiHint: 'creative design',
  },
  {
    id: 'academic',
    name: 'Academic / Wowchemy',
    gitUrl: 'https://github.com/wowchemy/starter-hugo-academic.git',
    imageUrl: 'https://picsum.photos/seed/academic-wowchemy/300/200',
    description: 'A feature-rich theme for personal websites, portfolios, and blogs.',
    tags: ['portfolio', 'academic', 'blog', 'feature-rich'],
    dataAiHint: 'professional resume',
  },
];
