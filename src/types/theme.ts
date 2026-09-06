export type ThemeId = 'vintage-berry' | 'jungle-teal' | 'brick-ember' | 'vivid-royal' | 'argentina';

export type RouletteMode = 'classic' | 'slot' | 'instant';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  primaryColor: string;
  surfaceColor: string;
  accentColor: string;
  textColor: string;
  wheelShades: string[];
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'vintage-berry',
    name: 'Vintage Berry',
    primaryColor: '#c82d77',
    surfaceColor: '#170c14',
    accentColor: '#7a2267',
    textColor: '#e8f7f1',
    wheelShades: [
      '#3a0c24', '#260c32', '#521234', '#39124a',
      '#6f1947', '#4f1966', '#8d205a', '#662085',
      '#ab276e', '#7e27a4', '#c82d77', '#9431bf',
      '#7b1c4e', '#591a73', '#9c2364', '#702293',
    ],
  },
  {
    id: 'jungle-teal',
    name: 'Jungle Teal',
    primaryColor: '#1ca188',
    surfaceColor: '#131915',
    accentColor: '#4ea884',
    textColor: '#e6f7ef',
    wheelShades: [
      '#092b23', '#0e2b1f', '#0d3f34', '#153f2d',
      '#125446', '#1c543c', '#176c5a', '#246b4c',
      '#1c8872', '#2f865f', '#1ca188', '#3ea577',
      '#146050', '#205f44', '#197a66', '#2b7856',
    ],
  },
  {
    id: 'brick-ember',
    name: 'Brick Ember',
    primaryColor: '#e64a19',
    surfaceColor: '#181414',
    accentColor: '#8a4030',
    textColor: '#f5f5f7',
    wheelShades: [
      '#331006', '#291410', '#4f190a', '#3e1e17',
      '#6f230e', '#552a20', '#942f13', '#6f362a',
      '#ba3c18', '#8a4030', '#e64a19', '#a44e3b',
      '#802911', '#5f2f25', '#a73516', '#7c3b2f',
    ],
  },
  {
    id: 'vivid-royal',
    name: 'Vivid Royal',
    primaryColor: '#7b3fe4',
    surfaceColor: '#0e0e1a',
    accentColor: '#5332b8',
    textColor: '#e8fbf3',
    wheelShades: [
      '#1b0c36', '#130c2b', '#2a1354', '#1f1344',
      '#3c1b78', '#2d1b61', '#5124a2', '#3e2586',
      '#682ed0', '#4f2fad', '#7b3fe4', '#643ecf',
      '#46208c', '#361e75', '#5d2bb9', '#46289d',
    ],
  },
  {
    id: 'argentina',
    name: 'Argentina',
    primaryColor: '#5da5f8',
    surfaceColor: '#0e1626',
    accentColor: '#f5af19',
    textColor: '#f0f6ff',
    wheelShades: [
      '#0c223c', '#332405', '#13355e', '#4c3508',
      '#1a4982', '#694a0b', '#2260ab', '#89610e',
      '#307bdc', '#ad7b12', '#5da5f8', '#d69617',
      '#1d5395', '#75530c', '#3e88e8', '#f5af19',
    ],
  }
];
