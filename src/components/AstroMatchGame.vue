<template>
  <div class="starfield"></div>
  <main class="app">
    <div class="top">
      <div>
        <h1>AstroMatch 天文三消</h1>
        <p class="sub">图片均为本地 NASA 真实天体素材，离线也能显示</p>
      </div>
      <div class="chips">
        <div class="chip">分数 {{ score }}</div>
        <div class="chip">连击 {{ combo }}</div>
        <div class="chip">步数 {{ moves }}</div>
      </div>
    </div>

    <div class="tools">
      <button
        :class="{ active: activeTool === 'supernova' }"
        :disabled="busy || moves <= 0 || tools.supernova <= 0"
        @click="toggleTool('supernova')"
      >
        超新星 x{{ tools.supernova }}
      </button>
      <button
        :class="{ active: activeTool === 'blackhole' }"
        :disabled="busy || moves <= 0 || tools.blackhole <= 0"
        @click="toggleTool('blackhole')"
      >
        黑洞 x{{ tools.blackhole }}
      </button>
      <button @click="restart">重新开局</button>
      <button :class="{ active: soundEnabled }" @click="toggleSound">
        {{ soundEnabled ? '音效：开' : '音效：关' }}
      </button>
    </div>

    <div class="msg">{{ message }}</div>

    <div :class="['board-wrap', appFx]" ref="boardWrapRef">
      <section :class="['board', boardFx]" aria-label="三消棋盘" @click="onBoardClick">
        <template v-for="(row, r) in board" :key="`row-${r}`">
          <div
            v-for="(tile, c) in row"
            :key="tile.id"
            class="cell"
            :class="cellClasses(tile, r, c)"
            :data-r="r"
            :data-c="c"
            :style="{ '--img': `url(${tile.image})`, '--tile-filter': tile.filter, '--tile-glow': tile.color }"
          ></div>
        </template>
      </section>
      <div :class="['shockwave', shockFx]"></div>

      <div class="particle-layer">
        <div
          v-for="p in particles"
          :key="p.id"
          class="particle"
          :class="p.kind"
          :style="{
            '--x': `${p.x}px`,
            '--y': `${p.y}px`,
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`,
            '--dur': `${p.dur}ms`,
            '--color': p.color,
          }"
        ></div>
      </div>
    </div>

    <div class="legend">
      <div><b>玩法：</b>点击两个相邻格子交换，连成 3 个及以上相同天体即可消除。</div>
      <div><b>超新星：</b>点任意格，炸 3x3 区域。</div>
      <div><b>黑洞：</b>点任意格，吸收十字范围（中心 + 上下左右各两格）。</div>
      <div><b>奖励：</b>一次消除 4 个奖励黑洞，5 个及以上奖励超新星。</div>
    </div>

    <div class="sources">
      图片来源：NASA（本地化资源）
      <span v-for="item in cosmos" :key="item.key"> | {{ item.source }}</span>
    </div>
  </main>
</template>

<script setup>
import { ref } from 'vue';
import { COSMOS } from '../data/cosmos';

const SIZE = 8;
const START_MOVES = 30;

const board = ref([]);
const selected = ref(null);
const score = ref(0);
const combo = ref(0);
const moves = ref(START_MOVES);
const busy = ref(false);
const activeTool = ref(null);
const message = ref('点击两个相邻天体交换，凑齐三个即可消除。');
const tools = ref({ supernova: 2, blackhole: 2 });
const particles = ref([]);
const boardWrapRef = ref(null);
const boardFx = ref('');
const appFx = ref('');
const shockFx = ref('');
const soundEnabled = ref(true);
const cosmos = COSMOS;

let uid = 1;
let particleId = 1;
let audioCtx = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rand(n) {
  return Math.floor(Math.random() * n);
}

function createTile(type, spawned = false) {
  return {
    id: uid++,
    type: type.key,
    image: type.image,
    filter: type.filter || 'saturate(1.1) contrast(1.08)',
    color: type.color,
    clearing: '',
    warp: false,
    chroma: false,
    spawned,
  };
}

function randomTile(spawned = false) {
  return createTile(cosmos[rand(cosmos.length)], spawned);
}

function inBoard(r, c) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function makeBoard() {
  const arr = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => null));
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      let tile = randomTile();
      while (
        (c >= 2 && arr[r][c - 1]?.type === tile.type && arr[r][c - 2]?.type === tile.type) ||
        (r >= 2 && arr[r - 1][c]?.type === tile.type && arr[r - 2][c]?.type === tile.type)
      ) {
        tile = randomTile();
      }
      arr[r][c] = tile;
    }
  }
  return arr;
}

function clearSpawnFlags() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      board.value[r][c].spawned = false;
    }
  }
}

function findMatches() {
  const marked = new Set();

  for (let r = 0; r < SIZE; r++) {
    let streak = 1;
    for (let c = 1; c <= SIZE; c++) {
      const same =
        c < SIZE &&
        board.value[r][c] &&
        board.value[r][c - 1] &&
        board.value[r][c].type === board.value[r][c - 1].type;
      if (same) {
        streak++;
      } else {
        if (streak >= 3) {
          for (let k = c - streak; k < c; k++) marked.add(`${r},${k}`);
        }
        streak = 1;
      }
    }
  }

  for (let c = 0; c < SIZE; c++) {
    let streak = 1;
    for (let r = 1; r <= SIZE; r++) {
      const same =
        r < SIZE &&
        board.value[r][c] &&
        board.value[r - 1][c] &&
        board.value[r][c].type === board.value[r - 1][c].type;
      if (same) {
        streak++;
      } else {
        if (streak >= 3) {
          for (let k = r - streak; k < r; k++) marked.add(`${k},${c}`);
        }
        streak = 1;
      }
    }
  }

  return Array.from(marked, (str) => {
    const [r, c] = str.split(',').map(Number);
    return { r, c };
  });
}

function swap(a, b) {
  const temp = board.value[a.r][a.c];
  board.value[a.r][a.c] = board.value[b.r][b.c];
  board.value[b.r][b.c] = temp;
}

function isAdjacent(a, b) {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

function collectSupernovaArea(center) {
  const targets = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = center.r + dr;
      const c = center.c + dc;
      if (inBoard(r, c)) targets.push({ r, c });
    }
  }
  return targets;
}

function collectBlackholeArea(center) {
  const dirs = [
    [0, 0],
    [1, 0],
    [2, 0],
    [-1, 0],
    [-2, 0],
    [0, 1],
    [0, 2],
    [0, -1],
    [0, -2],
  ];
  const targets = [];
  for (const [dr, dc] of dirs) {
    const r = center.r + dr;
    const c = center.c + dc;
    if (inBoard(r, c)) targets.push({ r, c });
  }
  return targets;
}

function ensureAudio() {
  if (!soundEnabled.value) return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone({ freq, duration = 0.12, type = 'sine', gain = 0.07, slide = 0, delay = 0 }) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), now + duration);
  g.gain.setValueAtTime(0.001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playMatchSound(count, chain) {
  const base = 220 + Math.min(chain * 16, 90);
  playTone({ freq: base, duration: 0.12, type: 'sine', gain: 0.045 });
  playTone({ freq: base * 1.5, duration: 0.15, type: 'triangle', gain: 0.038, delay: 0.05 });
  playTone({ freq: base * 2, duration: 0.2, type: 'sine', gain: 0.02, delay: 0.11 });
  if (count >= 4) {
    playTone({ freq: base * 0.75, duration: 0.35, type: 'sawtooth', gain: 0.02, slide: -35, delay: 0.04 });
  }
}

function playToolChargeSound(kind) {
  if (kind === 'supernova') {
    playTone({ freq: 240, duration: 0.4, type: 'triangle', gain: 0.035, slide: 120 });
    playTone({ freq: 320, duration: 0.38, type: 'sine', gain: 0.028, delay: 0.07, slide: 260 });
  } else {
    playTone({ freq: 168, duration: 0.5, type: 'sawtooth', gain: 0.03, slide: -90 });
    playTone({ freq: 96, duration: 0.52, type: 'triangle', gain: 0.026, delay: 0.06, slide: -35 });
  }
}

function playToolReleaseSound(kind) {
  if (kind === 'supernova') {
    playTone({ freq: 320, duration: 0.12, type: 'square', gain: 0.05 });
    playTone({ freq: 520, duration: 0.2, type: 'sawtooth', gain: 0.055, delay: 0.03, slide: 680 });
    playTone({ freq: 780, duration: 0.24, type: 'sine', gain: 0.03, delay: 0.09 });
  } else {
    playTone({ freq: 220, duration: 0.16, type: 'triangle', gain: 0.036, slide: -40 });
    playTone({ freq: 140, duration: 0.34, type: 'sawtooth', gain: 0.05, delay: 0.02, slide: -120 });
    playTone({ freq: 90, duration: 0.42, type: 'triangle', gain: 0.032, delay: 0.06, slide: -25 });
  }
}

function playSwapSound(valid) {
  if (valid) {
    playTone({ freq: 360, duration: 0.07, type: 'sine', gain: 0.02 });
    playTone({ freq: 510, duration: 0.08, type: 'triangle', gain: 0.014, delay: 0.03 });
  } else {
    playTone({ freq: 180, duration: 0.1, type: 'sawtooth', gain: 0.024, slide: -40 });
  }
}

function clearMarks() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      board.value[r][c].clearing = '';
      board.value[r][c].warp = false;
      board.value[r][c].chroma = false;
    }
  }
}

function setTileFx(positions, fx, enabled) {
  for (const { r, c } of positions) {
    const tile = board.value[r][c];
    if (!tile) continue;
    if (fx === 'warp') tile.warp = enabled;
    if (fx === 'chroma') tile.chroma = enabled;
  }
}

function triggerScreenShake(ms = 420) {
  appFx.value = 'screen-shake';
  setTimeout(() => {
    appFx.value = '';
  }, ms);
}

function triggerShockwave(kind, ms = 680) {
  shockFx.value = kind;
  setTimeout(() => {
    shockFx.value = '';
  }, ms);
}

function getCellCenter(pos) {
  const root = boardWrapRef.value;
  if (!root) return null;
  const cell = root.querySelector(`.cell[data-r="${pos.r}"][data-c="${pos.c}"]`);
  if (!cell) return null;
  const rect = cell.getBoundingClientRect();
  const host = root.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2 - host.left,
    y: rect.top + rect.height / 2 - host.top,
  };
}

function addParticles(
  positions,
  {
    countPerCell = 6,
    spread = 54,
    durBase = 360,
    durJitter = 220,
    kind = '',
    colorOverride = null,
  } = {},
) {
  if (!boardWrapRef.value) return;

  const list = [];
  for (const pos of positions) {
    const center = getCellCenter(pos);
    if (!center) continue;
    const color = colorOverride || board.value[pos.r][pos.c]?.color || '#9de5ff';

    for (let i = 0; i < countPerCell; i++) {
      list.push({
        id: particleId++,
        x: center.x,
        y: center.y,
        dx: (Math.random() - 0.5) * spread,
        dy: (Math.random() - 0.5) * spread,
        dur: durBase + Math.floor(Math.random() * durJitter),
        kind,
        color,
      });
    }
  }

  particles.value.push(...list);
  setTimeout(() => {
    const ids = new Set(list.map((p) => p.id));
    particles.value = particles.value.filter((p) => !ids.has(p.id));
  }, durBase + durJitter + 120);
}

async function playToolCharge(kind, pos, targets) {
  boardFx.value = kind === 'supernova' ? 'tool-charge-supernova' : 'tool-charge-blackhole';
  playToolChargeSound(kind);
  message.value = kind === 'supernova' ? '超新星蓄力中...' : '黑洞引力井成形中...';
  if (kind === 'blackhole') {
    setTileFx(targets, 'warp', true);
  }

  const waveColor = kind === 'supernova' ? '#ffb36b' : '#ab8fff';
  for (let wave = 0; wave < 3; wave++) {
    addParticles([pos], {
      countPerCell: 16 + wave * 8,
      spread: 28 + wave * 22,
      durBase: 380,
      durJitter: 180,
      kind: 'charge',
      colorOverride: waveColor,
    });
    if (wave > 0) {
      addParticles(targets, {
        countPerCell: 3 + wave,
        spread: 26,
        durBase: 300,
        durJitter: 120,
        kind: 'charge',
        colorOverride: waveColor,
      });
    }
    await sleep(170);
  }
}

function collapseAndRefill() {
  for (let c = 0; c < SIZE; c++) {
    let write = SIZE - 1;
    for (let r = SIZE - 1; r >= 0; r--) {
      if (board.value[r][c]) {
        board.value[write][c] = board.value[r][c];
        write--;
      }
    }
    while (write >= 0) {
      board.value[write][c] = randomTile(true);
      write--;
    }
  }
}

async function resolveBoard(multiplier = 1) {
  let chain = 0;
  while (true) {
    const matches = findMatches();
    if (!matches.length) {
      combo.value = chain ? chain : 0;
      await sleep(90);
      clearSpawnFlags();
      return;
    }

    chain += 1;
    combo.value = chain;
    const gain = matches.length * 10 * chain * multiplier;
    score.value += gain;

    if (matches.length >= 5) {
      tools.value.supernova += 1;
      message.value = `星系共振！消除 ${matches.length} 个，奖励 1 个超新星。`;
    } else if (matches.length >= 4) {
      tools.value.blackhole += 1;
      message.value = `引力增强！消除 ${matches.length} 个，奖励 1 个黑洞。`;
    } else {
      message.value = `消除了 ${matches.length} 个天体，连击 x${chain}。`;
    }

    playMatchSound(matches.length, chain);
    addParticles(matches);

    for (const { r, c } of matches) {
      board.value[r][c].clearing = 'clearing';
    }

    await sleep(240);

    for (const { r, c } of matches) {
      board.value[r][c] = null;
    }

    collapseAndRefill();
    await sleep(170);
    clearMarks();
  }
}

function resetSelection() {
  selected.value = null;
}

async function doSwap(a, b) {
  if (busy.value || moves.value <= 0) return;
  busy.value = true;
  swap(a, b);
  await sleep(120);

  const valid = findMatches().length > 0;
  playSwapSound(valid);

  if (!valid) {
    swap(a, b);
    message.value = '这次交换无法形成三消，已回退。';
    resetSelection();
    busy.value = false;
    return;
  }

  moves.value -= 1;
  resetSelection();
  await resolveBoard(1);
  busy.value = false;

  if (moves.value <= 0) {
    activeTool.value = null;
    message.value = `观测结束，最终得分 ${score.value}。点击“重新开局”继续。`;
  }
}

async function useToolAt(pos) {
  if (busy.value || !activeTool.value || moves.value <= 0) return;
  busy.value = true;

  const kind = activeTool.value;
  let targets = [];
  let cls = '';
  if (kind === 'supernova') {
    if (tools.value.supernova <= 0) {
      activeTool.value = null;
      busy.value = false;
      return;
    }
    tools.value.supernova -= 1;
    targets = collectSupernovaArea(pos);
    cls = 'nova';
    message.value = '超新星爆发，周围区域被瞬间清空。';
  } else {
    if (tools.value.blackhole <= 0) {
      activeTool.value = null;
      busy.value = false;
      return;
    }
    tools.value.blackhole -= 1;
    targets = collectBlackholeArea(pos);
    cls = 'hole';
    message.value = '黑洞吞噬，十字范围天体被吸收。';
  }

  await playToolCharge(kind, pos, targets);
  boardFx.value = kind === 'supernova' ? 'tool-release-supernova' : 'tool-release-blackhole';
  message.value = kind === 'supernova' ? '超新星爆发！' : '黑洞吞噬启动！';
  if (kind === 'supernova') {
    setTileFx(targets, 'chroma', true);
    triggerShockwave('shock-supernova', 860);
    triggerScreenShake(540);
  } else {
    setTileFx(targets, 'warp', true);
    triggerShockwave('shock-blackhole', 920);
    triggerScreenShake(420);
  }
  playToolReleaseSound(kind);
  addParticles(targets, {
    countPerCell: kind === 'supernova' ? 18 : 14,
    spread: kind === 'supernova' ? 108 : 82,
    durBase: kind === 'supernova' ? 760 : 820,
    durJitter: 260,
    kind: kind === 'supernova' ? 'supernova' : 'blackhole',
  });

  for (const { r, c } of targets) {
    if (board.value[r][c]) board.value[r][c].clearing = cls;
  }

  moves.value -= 1;
  activeTool.value = null;
  await sleep(kind === 'supernova' ? 620 : 680);

  for (const { r, c } of targets) {
    board.value[r][c] = null;
  }

  collapseAndRefill();
  await sleep(240);
  clearMarks();
  boardFx.value = '';
  await resolveBoard(2);

  busy.value = false;
  if (moves.value <= 0) {
    message.value = `观测结束，最终得分 ${score.value}。点击“重新开局”继续。`;
  }
}

async function onBoardClick(e) {
  ensureAudio();
  if (busy.value || moves.value <= 0) return;

  const cell = e.target.closest('.cell');
  if (!cell) return;
  const pos = { r: Number(cell.dataset.r), c: Number(cell.dataset.c) };

  if (activeTool.value) {
    await useToolAt(pos);
    return;
  }

  if (!selected.value) {
    selected.value = pos;
    message.value = '已选择第一个天体，请点相邻格交换。';
    return;
  }

  if (selected.value.r === pos.r && selected.value.c === pos.c) {
    selected.value = null;
    message.value = '已取消选择。';
    return;
  }

  if (!isAdjacent(selected.value, pos)) {
    selected.value = pos;
    message.value = '只能交换相邻格子，已更新选中目标。';
    return;
  }

  await doSwap(selected.value, pos);
}

function toggleTool(tool) {
  ensureAudio();
  if (busy.value || moves.value <= 0) return;
  resetSelection();
  activeTool.value = activeTool.value === tool ? null : tool;
  if (activeTool.value === 'supernova') {
    message.value = '超新星已激活：点击棋盘后会先蓄力再引爆。';
  } else if (activeTool.value === 'blackhole') {
    message.value = '黑洞已激活：点击棋盘后会先聚能再吞噬。';
  } else {
    message.value = '已取消道具。';
  }
}

function toggleSound() {
  soundEnabled.value = !soundEnabled.value;
  if (!soundEnabled.value && audioCtx && audioCtx.state !== 'closed') {
    audioCtx.suspend();
  }
  if (soundEnabled.value) {
    ensureAudio();
    playTone({ freq: 460, duration: 0.08, type: 'sine', gain: 0.03 });
  }
}

function restart() {
  board.value = makeBoard();
  selected.value = null;
  score.value = 0;
  combo.value = 0;
  moves.value = START_MOVES;
  tools.value.supernova = 2;
  tools.value.blackhole = 2;
  activeTool.value = null;
  boardFx.value = '';
  appFx.value = '';
  shockFx.value = '';
  particles.value = [];
  busy.value = false;
  message.value = '点击两个相邻天体交换，凑齐三个即可消除。';
}

function cellClasses(tile, r, c) {
  return {
    selected: selected.value && selected.value.r === r && selected.value.c === c,
    clearing: tile.clearing === 'clearing',
    nova: tile.clearing === 'nova',
    hole: tile.clearing === 'hole',
    warp: tile.warp,
    chroma: tile.chroma,
    spawn: tile.spawned,
  };
}

board.value = makeBoard();
</script>
