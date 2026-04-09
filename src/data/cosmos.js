const IMG_BASE = '/images/cosmos';

// 命名规范:
// 1) 恒星: cosmos_star_01.jpg, cosmos_star_02.jpg ...
// 2) 星云: cosmos_nebula_01.jpg, cosmos_nebula_02.jpg ...
// 手动添加图片时，按序号新增文件并在此数组增加一项。
export const COSMOS = [
  {
    key: 'star_01',
    name: '恒星核心',
    image: `${IMG_BASE}/cosmos_star_01.jpg`,
    filter: 'saturate(1.35) contrast(1.12) hue-rotate(-8deg)',
    color: '#ffc66e',
    source: 'Derived from NASA GSFC_20171208_Archive_e001861',
  },
  {
    key: 'star_02',
    name: '耀斑恒星',
    image: `${IMG_BASE}/cosmos_star_02.jpg`,
    filter: 'saturate(1.45) contrast(1.14) hue-rotate(10deg)',
    color: '#ff8b6f',
    source: 'Derived from NASA GSFC_20171208_Archive_e001861',
  },
  {
    key: 'star_03',
    name: '日冕恒星',
    image: `${IMG_BASE}/cosmos_star_03.jpg`,
    filter: 'saturate(1.25) contrast(1.16) hue-rotate(-18deg)',
    color: '#ffe292',
    source: 'Derived from NASA GSFC_20171208_Archive_e001861',
  },
  {
    key: 'nebula_01',
    name: '薄纱星云',
    image: `${IMG_BASE}/cosmos_nebula_01.jpg`,
    filter: 'saturate(1.28) contrast(1.1) hue-rotate(6deg)',
    color: '#79e0ff',
    source: 'Derived from NASA PIA01322',
  },
  {
    key: 'nebula_02',
    name: '紫幕星云',
    image: `${IMG_BASE}/cosmos_nebula_02.jpg`,
    filter: 'saturate(1.42) contrast(1.06) hue-rotate(24deg)',
    color: '#b89bff',
    source: 'Derived from NASA PIA01322',
  },
  {
    key: 'nebula_03',
    name: '虹环星云',
    image: `${IMG_BASE}/cosmos_nebula_03.jpg`,
    filter: 'saturate(1.32) contrast(1.1) hue-rotate(-26deg)',
    color: '#8bf7e1',
    source: 'Derived from NASA PIA01322',
  },
];
