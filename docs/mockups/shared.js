/* pvz-words 原型共享层
   这不是游戏代码，是"把设计文档里可以变成可执行断言的部分先跑起来"：
   - §4.5 status 转移表：出现文档未列的转移 → console.assert 失败
   - §4.1.1 theme 配对口径：构建期校验规则的预演
   - §6.2 干扰字母 4 级优先级 + 种子 hash(wordId, deckId)（不含日期）
   - D9 字母块按多重集合生成
   数值单位遵循 §4.2 约定：时间=秒，伤害=点，dps=持续伤害率。 */

window.Mock = (function () {
  // ---------- 画幅与坐标 ----------
  var CW = 1280;
  var CH = 720;
  var LAN = { left: 60, top: 50, w: 1200, h: 440, cols: 10, rows: 5 };
  var CELL_W = LAN.w / LAN.cols; // 112
  var CELL_H = LAN.h / LAN.rows; // 96

  function fitScale() {
    return Math.min(window.innerWidth / CW, window.innerHeight / CH);
  }
  function mountFrame() {
    var f = document.querySelector(".frame");
    var s = fitScale();
    f.style.transform = "translate(-50%, -50%) scale(" + s + ")";
    window.addEventListener("resize", function () {
      f.style.transform = "translate(-50%, -50%) scale(" + fitScale() + ")";
    });
    return f;
  }
  // x: float 0..9（§5 一维推进），转成草坪内像素
  function xToPx(x) { return x * CELL_W + CELL_W / 2; }
  function laneToPx(lane) { return lane * CELL_H + CELL_H / 2; }
  function cellToPx(col) { return col * CELL_W + CELL_W / 2; }

  // ---------- content/ 夹具（§4.1） ----------
  var PLANTS = {
    peashooter: { id: "peashooter", name: "豌豆投手", art: null, cost: 100, hp: 300, dps: 20, range: "front_lane", slot: "shooter", generic: false, unlocked_by_default: true },
    sprout: { id: "sprout", name: "中性苗木·产", art: null, cost: 50, hp: 200, dps: 0, range: "none", slot: "producer", generic: true, unlocked_by_default: true },
    bush: { id: "bush", name: "中性苗木·守", art: null, cost: 50, hp: 300, dps: 0, range: "none", slot: "defense", generic: true, unlocked_by_default: true }
  };

  var WORDS = {
    w_peashooter: { id: "w_peashooter", word: "peashooter", zh: "豌豆投手", ipa: "/ˈpiːʃuːtə/", grade: 4, unit: "Unit 3", letters: 10, distractor_overrides: null, audio_hint: null },
    w_sunflower: { id: "w_sunflower", word: "sunflower", zh: "向日葵", ipa: "/ˈsʌnflaʊə/", grade: 4, unit: "Unit 3", letters: 9, distractor_overrides: ["v"], audio_hint: null },
    w_coffee: { id: "w_coffee", word: "coffee", zh: "咖啡", ipa: "/ˈkɒfi/", grade: 4, unit: "Unit 3", letters: 6, distractor_overrides: null, audio_hint: null },
    w_yellow: { id: "w_yellow", word: "yellow", zh: "黄色", ipa: "/ˈjeləʊ/", grade: 3, unit: "Unit 2", letters: 6, distractor_overrides: null, audio_hint: null },
    w_three: { id: "w_three", word: "three", zh: "三", ipa: "/θriː/", grade: 3, unit: "Unit 2", letters: 5, distractor_overrides: null, audio_hint: null },
    w_green: { id: "w_green", word: "green", zh: "绿色", ipa: "/ɡriːn/", grade: 3, unit: "Unit 2", letters: 5, distractor_overrides: ["g", "j"], audio_hint: null },
    w_apple: { id: "w_apple", word: "apple", zh: "苹果", ipa: "/ˈæpl/", grade: 2, unit: "Unit 1", letters: 5, distractor_overrides: null, audio_hint: null },
    w_milk: { id: "w_milk", word: "milk", zh: "牛奶", ipa: "/mɪlk/", grade: 2, unit: "Unit 1", letters: 4, distractor_overrides: null, audio_hint: null }
  };

  // decks.json：植物×单词绑定 + theme（口径见 §4.1.1）
  var DECKS = [
    { wordId: "w_peashooter", plantId: "peashooter", theme: "plant" },
    { wordId: "w_sunflower", plantId: "sprout", theme: "unit" },
    { wordId: "w_coffee", plantId: "bush", theme: "unit" },
    { wordId: "w_yellow", plantId: "sprout", theme: "unit" },
    { wordId: "w_three", plantId: "bush", theme: "unit" },
    { wordId: "w_green", plantId: "sprout", theme: "review" },
    { wordId: "w_apple", plantId: "bush", theme: "unit" },
    { wordId: "w_milk", plantId: "sprout", theme: "review" }
  ];

  var ZOMBIES = {
    basic: { id: "basic", name: "普通", hp: 100, speed: 0.16, dps: 40, cls: "" },
    cone: { id: "cone", name: "路障", hp: 200, speed: 0.16, dps: 40, cls: "zombie--cone" },
    bucket: { id: "bucket", name: "铁桶", hp: 320, speed: 0.14, dps: 40, cls: "zombie--bucket" },
    flag: { id: "flag", name: "旗帜", hp: 100, speed: 0.22, dps: 40, cls: "zombie--flag" }
  };

  // waves.json：时间轴调度 {t, zombie, count, lanes[], flag}
  var WAVES = [
    { t: 8, zombie: "basic", count: 1, lanes: [2], flag: false },
    { t: 24, zombie: "basic", count: 2, lanes: [1, 3], flag: false },
    { t: 42, zombie: "cone", count: 2, lanes: [0, 4], flag: false },
    { t: 62, zombie: "basic", count: 2, lanes: [2, 2], flag: false },
    { t: 80, zombie: "bucket", count: 2, lanes: [1, 3], flag: true },
    { t: 96, zombie: "flag", count: 1, lanes: [2], flag: true }
  ];

  var ECON = { start: 75, cap: 9990, producer_interval_s: 24, producer_amount: 25 }; // §7
  var RULES = {
    tick: 1 / 30,            // D18 定步长
    panel_slowdown: 0.85,    // D17
    penalty_disable_ms: 2000,// O2 / §6.3
    hand_size: 5             // D7
  };

  // ---------- 起步可达性（原型跑出来的真问题） ----------
  // D16 规定阳光只由已激活的 producer 产出，起始 75。若焦点卡（D7 强制最左）
  // 指向 cost>75 的非 producer 植物，玩家既不能跳过也无法攒阳光 → 死锁。
  var M0_HAND = ["w_sunflower", "w_coffee", "w_peashooter", "w_yellow", "w_three", "w_green", "w_apple", "w_milk"];
  function startReachable(order) {
    order = order || M0_HAND;
    var issues = [];
    var first = DECKS.filter(function (d) { return d.wordId === order[0]; })[0];
    var firstCost = PLANTS[first.plantId].cost;
    if (firstCost > ECON.start) issues.push("首卡 " + WORDS[order[0]].word + "→" + first.plantId + " 需 " + firstCost + " > 起始 " + ECON.start + "，且无 producer 在场 → 死锁");
    var producerInFirst2 = order.slice(0, 2).some(function (wid) {
      var d = DECKS.filter(function (x) { return x.wordId === wid; })[0];
      return d && PLANTS[d.plantId].slot === "producer" && PLANTS[d.plantId].cost <= ECON.start;
    });
    if (!producerInFirst2) issues.push("前 2 张没有 cost ≤ 起始阳光的 producer → 没有阳光来源");
    return issues;
  }

  // ---------- §4.5 状态转移表（唯一合法链） ----------
  var TRANSITIONS = {
    locked: ["filling"],
    filling: ["armed", "dormant"],
    armed: ["placed", "dormant"],
    placed: [],
    dormant: []
  };
  function assertTransition(from, to, ctx) {
    var ok = TRANSITIONS[from] && TRANSITIONS[from].indexOf(to) >= 0;
    console.assert(ok, "[§4.5] 非法状态转移 " + from + " → " + to + " " + (ctx || ""));
    return ok;
  }

  // ---------- §6.2 干扰字母 ----------
  var CONFUSABLE_PAIRS = [
    ["b", "d"], ["p", "q"], ["n", "m"], ["u", "v"], ["i", "l"],
    ["f", "v"], ["s", "z"], ["c", "k"], ["g", "j"]
  ];
  var ENG_FREQ = "etaoinshrdlcumwfgypbvkjxqz"; // 兜底频率表

  // 种子：hash(wordId, deckId)，不含日期（§6.2）
  function seedHash(wordId, deckId) {
    var s = wordId + "|" + deckId;
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  // mulberry32：唯一的随机源，禁用 Math.random()（D10）
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function distractorCount(len) {
    return Math.max(2, Math.min(6, Math.round(len * 0.5))); // clamp(round(len*0.5),2,6)
  }

  // 4 级优先级，命中即停
  function pickDistractors(wordObj, deckId, opts) {
    opts = opts || {};
    var rand = rng(opts.extraSeed ? seedHash(wordObj.id, deckId) + opts.extraSeed : seedHash(wordObj.id, deckId));
    var need = distractorCount(wordObj.word.length);
    var have = {};
    wordObj.word.split("").forEach(function (c) { have[c] = true; });
    var out = [];

    // 0) 手工钉死
    if (wordObj.distractor_overrides) {
      wordObj.distractor_overrides.forEach(function (c) {
        if (out.length < need) { out.push(c); }
      });
    }
    // 1) 易混字母表的伙伴字母
    if (out.length < need) {
      var partners = [];
      Object.keys(have).forEach(function (c) {
        CONFUSABLE_PAIRS.forEach(function (pair) {
          if (pair.indexOf(c) >= 0) {
            pair.forEach(function (x) { if (x !== c) partners.push(x); });
          }
        });
      });
      while (out.length < need && partners.length) {
        out.push(partners.splice(Math.floor(rand() * partners.length), 1)[0]);
      }
    }
    // 2) 同 grade/unit 词库字母频率
    if (out.length < need) {
      var pool = {};
      Object.keys(WORDS).forEach(function (k) {
        var w = WORDS[k];
        if (w.grade === wordObj.grade && w.unit === wordObj.unit && k !== wordObj.id) {
          w.word.split("").forEach(function (c) { pool[c] = (pool[c] || 0) + 1; });
        }
      });
      var poolKeys = Object.keys(pool).sort(function (a, b) { return pool[b] - pool[a]; })
        .filter(function (c) { return !have[c]; });
      while (out.length < need && poolKeys.length) {
        out.push(poolKeys.shift());
      }
    }
    // 3) 英语字母频率表 + 种子化随机
    while (out.length < need) {
      var c = ENG_FREQ[Math.floor(rand() * ENG_FREQ.length)];
      if (!have[c]) out.push(c);
    }
    return out.slice(0, need);
  }

  // D9 多重集合：目标字母逐个出块 + 干扰块；布局每行最多 12 块
  function buildTiles(wordObj, deckId, opts) {
    var d = pickDistractors(wordObj, deckId, opts);
    var letters = wordObj.word.split("").concat(d);
    var rand = rng(seedHash(wordObj.id, deckId) ^ 0x9e3779b9);
    for (var i = letters.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = letters[i]; letters[i] = letters[j]; letters[j] = t;
    }
    return letters.map(function (c, idx) {
      return { tileId: idx, letter: c, used: false, disabledUntil: 0 };
    });
  }

  // ---------- §4.4 词表清洗（构建期硬错误预演） ----------
  function lintWord(word) {
    if (!/^[a-z]+$/.test(word)) return "字符集越界（只允许 a-z）";
    if (word.length < 3 || word.length > 10) return "长度越界（3–10）";
    return null;
  }
  var REJECTED_SAMPLES = [
    { word: "ice cream", reason: "含空格" },
    { word: "a.m.", reason: "含标点" },
    { word: "don't", reason: "含撇号" },
    { word: "TV", reason: "含大写/长度<3" }
  ];

  // ---------- §4.1.1 theme 口径校验 ----------
  function validateDeck(deck) {
    var w = WORDS[deck.wordId];
    var p = PLANTS[deck.plantId];
    if (!w || !p) return "引用不存在的 id";
    if (deck.theme === "plant" && w.word !== p.id) return 'theme:"plant" 只准指向同名植物';
    if (deck.theme !== "plant" && !p.generic) return "非植物词必须走 generic";
    if (lintWord(w.word)) return lintWord(w.word);
    if (w.letters !== w.word.length) return "letters !== word.length";
    return null;
  }

  // ---------- 卡牌工厂（§4.5 CardState） ----------
  var _iid = 1;
  function makeCard(wordId, deckId) {
    var w = WORDS[wordId];
    var d = DECKS.filter(function (x) { return x.wordId === wordId && x.plantId === deckId; })[0] ||
      DECKS.filter(function (x) { return x.wordId === wordId; })[0];
    return {
      instanceId: _iid++,
      plantId: d.plantId,
      wordId: wordId,
      theme: d.theme,
      slots: w.word.split(""),
      filled: 0,
      status: "locked",
      assisted: false,
      tiles: buildTiles(w, d.plantId),
      wrongStreak: 0,
      wrongTotal: 0,
      ladderLevel: 0
    };
  }

  // ---------- §6.1 判定纯函数 ----------
  // submit(card, tileId, now) -> { card', events }
  // Event = {type:'filled',slot} | {type:'wrong',tileId} | {type:'armed',plantId}
  //        | {type:'hint_ladder',level} | {type:'focus_advanced'}
  // 不改入参；渲染层只订阅 events（§6.1「规则层只维护数据」）。
  function submit(card, tileId, now) {
    var events = [];
    var c = cloneCard(card);
    if (c.status !== "filling") return { card: c, events: events };

    var tile = c.tiles.filter(function (t) { return t.tileId === tileId; })[0];
    if (!tile || tile.used) return { card: c, events: events };
    // §6.3 禁用期内点击不计入、不重复惩罚
    if (tile.disabledUntil > now) return { card: c, events: events };

    // §6.1：判定只看字母本身——干扰块恰好等于所需字母时算正确，不是 bug
    var target = c.slots[c.filled];
    if (tile.letter === target) {
      tile.used = true;
      c.filled += 1;
      c.wrongStreak = 0;
      events.push({ type: "filled", slot: c.filled - 1 });
      if (c.filled === c.slots.length) {
        assertTransition(c.status, "armed", c.wordId);
        c.status = "armed";
        events.push({ type: "armed", plantId: c.plantId });
      }
    } else {
      tile.disabledUntil = now + RULES.penalty_disable_ms / 1000; // O2
      c.wrongTotal += 1;
      c.wrongStreak += 1;
      events.push({ type: "wrong", tileId: tileId });
      // §6.4 求助阶梯（自用场景最高优先级：卡死 5 次就是弃玩）
      if (c.wrongStreak === 2 && c.ladderLevel < 1) {
        c.ladderLevel = 1;
        events.push({ type: "hint_ladder", level: 1 });
      } else if (c.wrongStreak === 4 && c.ladderLevel < 2) {
        c.ladderLevel = 2;
        c.assisted = true; // → streak 归零、ease 下调、本关三星不可达
        events.push({ type: "hint_ladder", level: 2 });
      }
    }
    return { card: c, events: events };
  }

  function cloneCard(card) {
    var c = {};
    Object.keys(card).forEach(function (k) { c[k] = card[k]; });
    c.slots = card.slots.slice();
    c.tiles = card.tiles.map(function (t) {
      return { tileId: t.tileId, letter: t.letter, used: t.used, disabledUntil: t.disabledUntil };
    });
    return c;
  }

  // ---------- DOM 小工具 ----------
  function el(cls, text, parent) {
    var e = document.createElement("div");
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function btn(cls, text, parent, fn) {
    var e = document.createElement("button");
    e.className = cls || "";
    if (text !== undefined && text !== null) e.textContent = text;
    if (parent) parent.appendChild(e);
    e.style.font = "inherit";
    e.style.cursor = "pointer";
    e.addEventListener("click", fn);
    return e;
  }

  function plantEl(plantId) {
    var p = PLANTS[plantId];
    var e = el("ent plant");
    if (window.MockShapes) e.innerHTML = MockShapes.plantSvg(plantId) +
      "<div class='tag'>" + p.slot + "</div><div class='hp'><i style='width:100%'></i></div>";
    else e.innerHTML = "<div class='tag'>" + p.slot + "</div><div class='hp'><i style='width:100%'></i></div>";
    e.dataset.plant = p.id;
    e.title = p.name + " cost=" + p.cost + " hp=" + p.hp + " dps=" + p.dps + " slot=" + p.slot + (p.generic ? " generic" : "");
    return e;
  }

  function zombieEl(zid) {
    var z = ZOMBIES[zid];
    var e = el("ent zombie " + z.cls);
    if (window.MockShapes) e.innerHTML = MockShapes.zombieSvg(zid) + "<div class='hp'><i style='width:100%'></i></div>";
    else { el("tag", z.name, e); el("hp", null, e).innerHTML = "<i style='width:100%'></i>"; }
    e.dataset.zombie = z.id;
    e.title = z.name + " hp=" + z.hp + " speed=" + z.speed + " lane-dps=" + z.dps;
    return e;
  }

  function setHp(node, ratio) {
    var i = node.querySelector(".hp i");
    if (i) i.style.width = Math.max(0, Math.min(1, ratio)) * 100 + "%";
  }

  return {
    CW: CW, CH: CH, LAN: LAN, CELL_W: CELL_W, CELL_H: CELL_H,
    PLANTS: PLANTS, WORDS: WORDS, DECKS: DECKS, ZOMBIES: ZOMBIES, WAVES: WAVES,
    ECON: ECON, RULES: RULES, TRANSITIONS: TRANSITIONS,
    M0_HAND: M0_HAND, startReachable: startReachable,
    xToPx: xToPx, laneToPx: laneToPx, cellToPx: cellToPx,
    fitScale: fitScale, mountFrame: mountFrame,
    seedHash: seedHash, rng: rng, distractorCount: distractorCount,
    pickDistractors: pickDistractors, buildTiles: buildTiles,
    lintWord: lintWord, REJECTED_SAMPLES: REJECTED_SAMPLES,
    validateDeck: validateDeck, makeCard: makeCard,
    submit: submit, cloneCard: cloneCard,
    assertTransition: assertTransition,
    el: el, btn: btn, plantEl: plantEl, zombieEl: zombieEl, setHp: setHp
  };
})();
