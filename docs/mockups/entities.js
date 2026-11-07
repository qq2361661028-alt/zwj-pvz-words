/* 实体剪影库（形状语言，非最终美术）
   原则：功能靠轮廓不靠颜色；颜色只做阵营（植物冷绿/黄绿，僵尸暖灰紫）；
   全部带深色描边，因为草坪是绿条纹底，无描边会糊进背景。
   viewBox 固定 88×88（植物）/ 64×88（僵尸），对应场上 88px 素材预算。
   同一份轮廓描述就是 M4 ImageGen 的 prompt 骨架，占位不是沉没成本。 */

window.MockShapes = (function () {
  var P = {
    leaf: "#7fae63", leafDark: "#4e7a45",
    stem: "#6f9c53",
    fruit: "#f0d06a", fruitDark: "#b98a22",
    tube: "#8dbd80",
    defense: "#b6c4d8", defenseDark: "#6d7f96",
    special: "#d6b8dc", specialDark: "#8f6a96"
  };
  var Z = {
    skin: "#9aa0a8", skinDark: "#6d737c",
    cone: "#b0895a", coneDark: "#82643e",
    bucket: "#8f97a1", bucketDark: "#5f6772",
    flag: "#a88f96", flagDark: "#7c666d"
  };

  function wrap(inner, vb) {
    return '<svg class="sil" viewBox="' + vb + '" preserveAspectRatio="xMidYMax meet">' + inner + "</svg>";
  }

  // ---------- 植物 ----------
  var plants = {
    // producer：圆头 + 短茎 + 顶部果苞，无朝向（不暗示攻击方向）
    producer: function () {
      return wrap(
        '<path d="M44 82 L44 54" stroke="' + P.stem + '" stroke-width="7" stroke-linecap="round"/>' +
        '<path d="M44 68 C30 66 24 58 22 50 C34 50 42 58 44 66 Z" fill="' + P.leaf + '" stroke="' + P.leafDark + '" stroke-width="2.5"/>' +
        '<path d="M44 68 C58 66 64 58 66 50 C54 50 46 58 44 66 Z" fill="' + P.leaf + '" stroke="' + P.leafDark + '" stroke-width="2.5"/>' +
        '<circle cx="44" cy="38" r="16" fill="' + P.fruit + '" stroke="' + P.fruitDark + '" stroke-width="3"/>' +
        '<circle cx="44" cy="20" r="6" fill="' + P.fruit + '" stroke="' + P.fruitDark + '" stroke-width="2.5"/>'
        , "0 0 88 88");
    },
    // shooter：管口朝右 = 攻击方向 = 面朝僵尸，天然可读，不需要额外图标
    shooter: function () {
      return wrap(
        '<path d="M38 82 L38 58" stroke="' + P.stem + '" stroke-width="7" stroke-linecap="round"/>' +
        '<path d="M38 72 C26 70 20 64 18 56 C30 56 36 64 38 70 Z" fill="' + P.leaf + '" stroke="' + P.leafDark + '" stroke-width="2.5"/>' +
        '<circle cx="38" cy="42" r="18" fill="' + P.tube + '" stroke="' + P.leafDark + '" stroke-width="3"/>' +
        '<rect x="52" y="34" width="28" height="17" rx="8" fill="' + P.tube + '" stroke="' + P.leafDark + '" stroke-width="3"/>' +
        '<circle cx="78" cy="42" r="5.5" fill="' + P.leafDark + '"/>'
        , "0 0 88 88");
    },
    // defense：矮、宽、重心低、无突出物 —— "挡"的形状直觉
    defense: function () {
      return wrap(
        '<path d="M44 82 L44 74" stroke="' + P.stem + '" stroke-width="8" stroke-linecap="round"/>' +
        '<circle cx="24" cy="62" r="17" fill="' + P.defense + '" stroke="' + P.defenseDark + '" stroke-width="3"/>' +
        '<circle cx="62" cy="60" r="18" fill="' + P.defense + '" stroke="' + P.defenseDark + '" stroke-width="3"/>' +
        '<circle cx="44" cy="50" r="21" fill="' + P.defense + '" stroke="' + P.defenseDark + '" stroke-width="3"/>'
        , "0 0 88 88");
    },
    // special：非对称 + 第二器官（M0 不实现，只占形状位）
    special: function () {
      return wrap(
        '<path d="M46 82 L46 56" stroke="' + P.stem + '" stroke-width="7" stroke-linecap="round"/>' +
        '<circle cx="48" cy="46" r="19" fill="' + P.special + '" stroke="' + P.specialDark + '" stroke-width="3"/>' +
        '<path d="M34 30 L22 14" stroke="' + P.specialDark + '" stroke-width="6" stroke-linecap="round"/>' +
        '<circle cx="20" cy="12" r="7" fill="' + P.fruit + '" stroke="' + P.fruitDark + '" stroke-width="2.5"/>'
        , "0 0 88 88");
    }
  };

  // ---------- 僵尸 ----------
  // 差异全部落在"体积出现在哪里"：普通=基准 / 路障=头顶锥形 / 铁桶=方块头+宽肩 / 旗帜=细长旗杆+更大前倾
  function zombieBody(extra, head, tilt, skin, skinDark) {
    return wrap(
      '<g transform="rotate(' + tilt + ' 28 60)">' +
      '<rect x="15" y="34" width="26" height="44" rx="7" fill="' + skin + '" stroke="' + skinDark + '" stroke-width="3"/>' +
      '<path d="M40 44 L54 50" stroke="' + skin + '" stroke-width="8" stroke-linecap="round"/>' +
      '<path d="M40 50 L52 58" stroke="' + skin + '" stroke-width="7" stroke-linecap="round"/>' +
      '<circle cx="28" cy="22" r="13" fill="' + skin + '" stroke="' + skinDark + '" stroke-width="3"/>' +
      (head || "") + (extra || "") +
      "</g>", "0 0 64 88");
  }

  var zombies = {
    basic: function () { return zombieBody("", "", 5, Z.skin, Z.skinDark); },
    cone: function () {
      return zombieBody(
        '<path d="M28 2 L16 20 L40 20 Z" fill="' + Z.cone + '" stroke="' + Z.coneDark + '" stroke-width="3"/>',
        "", 5, Z.skin, Z.skinDark);
    },
    bucket: function () {
      return zombieBody(
        '<rect x="12" y="6" width="32" height="26" rx="4" fill="' + Z.bucket + '" stroke="' + Z.bucketDark + '" stroke-width="3"/>' +
        '<rect x="10" y="34" width="36" height="8" rx="4" fill="' + Z.bucket + '" stroke="' + Z.bucketDark + '" stroke-width="2.5"/>',
        "", 5, Z.skin, Z.skinDark);
    },
    flag: function () {
      return zombieBody(
        '<path d="M50 4 L50 62" stroke="' + Z.flagDark + '" stroke-width="4" stroke-linecap="round"/>' +
        '<path d="M50 6 L64 12 L50 20 Z" fill="' + Z.flag + '" stroke="' + Z.flagDark + '" stroke-width="2.5"/>',
        "", 11, Z.skin, Z.skinDark);
    }
  };

  // ---------- 状态叠加层（不重画，省一半素材量） ----------
  var states = {
    buff: '<div class="ov ov--buff" title="§8.4 朗读通过后 dps×1.25，10s"></div>',
    dormant: '<div class="ov ov--dormant" title="§6.5 布局溢出降级"></div>',
    cracks: function (n) {
      var d = ["", "M8 20 L18 30 L12 40", "M8 20 L18 30 L12 40 M26 12 L20 26 L30 34", "M8 20 L18 30 L12 40 M26 12 L20 26 L30 34 M22 44 L30 56 L24 66"];
      return '<svg class="ov ov--crack" viewBox="0 0 44 80">' +
        '<path d="' + d[Math.max(0, Math.min(3, n))] + '" fill="none" stroke="#3a3f46" stroke-width="2.5" stroke-linecap="round"/></svg>';
    }
  };

  function plantSvg(plantId) {
    var p = Mock.PLANTS[plantId];
    // generic 苗木用抽象芽/灌木团：不出现具象果实或武器，否则承载非植物词时 §4.1.1 的语义又散了
    var key = p.generic && p.slot === "defense" ? "defense" : p.slot;
    return (plants[key] || plants.defense)();
  }
  function zombieSvg(zid) { return (zombies[zid] || zombies.basic)(); }

  return { plantSvg: plantSvg, zombieSvg: zombieSvg, states: states, plants: plants, zombies: zombies };
})();
