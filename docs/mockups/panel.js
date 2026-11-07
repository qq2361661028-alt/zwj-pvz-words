/* 底部抽屉：焦点卡头 + 槽 + 字母块（D7 焦点卡 + D8 点选顺序填）——02 / 03 / 05 共用
   注意：面板不显示目标词形，只显示中文 + 音标 + 词长 + 已填字母。
   词形一旦显示，填词就退化成抄写；这条口径需要复核（IPA 会泄漏部分拼写）。 */

window.MockPanel = (function () {
  function create(host, opts) {
    opts = opts || {};
    var ladderOn = opts.ladder !== false;
    var now = opts.now || function () { return 0; };
    var onSubmit = opts.onSubmit || function () {};
    var onClose = opts.onClose || function () {};
    var frameEl = host.closest(".frame") || document.body;

    host.classList.add("drawer");
    // 保留页面自带的"手牌行"，只重建填词相关的三行
    var handRow = host.querySelector(".drawer__hand");
    host.innerHTML = "";
    if (handRow) host.appendChild(handRow);

    var head = Mock.el("drawer__head", null, host);
    var maskEl = Mock.el("mask", "", head);
    var zhEl = Mock.el("zh", "", head);
    var ipaEl = Mock.el("ipa", "", head);
    var goalEl = Mock.el("goal", "", head);
    var closeEl = Mock.btn("panel__close", "收起 ✕", head, onClose);
    closeEl.style.cssText = "margin-left:auto;border:1px solid #c9cfd8;background:#fff;border-radius:4px;font:inherit;font-size:11px;padding:2px 9px;cursor:pointer";

    var rowSlots = Mock.el("drawer__row", null, host);
    Mock.el("cap", "填写顺序 · 当前槽高亮 (D8)", rowSlots);
    var slotsEl = Mock.el("slots", null, rowSlots);
    var statEl = Mock.el("stat-strip", null, rowSlots);

    var rowTiles = Mock.el("drawer__row", null, host);
    Mock.el("cap", "字母块 目标 + 干扰（多重集合 D9）", rowTiles);
    var tilesEl = Mock.el("tiles", null, rowTiles);

    var ladderEl = Mock.el("ladder", null, frameEl);
    ladderEl.style.display = "none";

    var card = null;

    function setCard(c) { card = c; render(); }
    function setVisible(v) {
      host.classList.toggle("drawer--idle", !v);
      head.style.visibility = v ? "visible" : "hidden";
      rowSlots.style.visibility = v ? "visible" : "hidden";
      rowTiles.style.visibility = v ? "visible" : "hidden";
      if (!v) ladderEl.style.display = "none";
      else render();
    }

    function render() {
      if (!card) return;
      var w = Mock.WORDS[card.wordId], p = Mock.PLANTS[card.plantId];
      maskEl.textContent = masked();
      zhEl.textContent = "「" + w.zh + "」";
      ipaEl.textContent = w.ipa + " · " + card.slots.length + " 字母";
      goalEl.innerHTML = "→ <b>" + p.name + "</b> " + p.cost + "☀ · theme=" + card.theme +
        (card.assisted ? " · <span class='assisted-flag'>assisted</span>" : "");
      closeEl.style.display = card.status === "filling" ? "" : "none";

      slotsEl.innerHTML = "";
      card.slots.forEach(function (ch, i) {
        var s = Mock.el("slot", null, slotsEl);
        if (i < card.filled) { s.classList.add("slot--filled"); s.textContent = ch; }
        else { s.textContent = "·"; if (i === card.filled) s.classList.add("slot--active"); }
      });

      var t = now();
      tilesEl.innerHTML = "";
      card.tiles.forEach(function (tile) {
        var b = Mock.btn("tile", tile.letter, tilesEl, function () { onSubmit(tile.tileId); });
        b.disabled = tile.used;
        if (tile.used) b.classList.add("tile--used");
        else if (tile.disabledUntil > t) {
          b.classList.add("tile--disabled");
          b.title = "§6.3 惩罚禁用，剩余 " + Math.ceil(tile.disabledUntil - t) + "s（不毁卡、不倒退）";
        }
        if (ladderOn && card.ladderLevel >= 2 && tile.letter === card.slots[card.filled] && !tile.used) {
          b.classList.add("tile--ladder");
        }
      });

      statEl.innerHTML =
        "连错 <b>" + card.wrongStreak + "</b> · 累计错 <b>" + card.wrongTotal +
        "</b> · status <b>" + card.status + "</b>";

      if (ladderOn && card.ladderLevel >= 1 && card.status === "filling") {
        ladderEl.style.display = "";
        if (card.ladderLevel === 1) {
          ladderEl.innerHTML = "<b>连错 2 次 · 阶梯 L1</b>（M1）：播一次标准发音 + 显示音标，不消耗任何资源。" +
            " 自用场景下这是最重要的机制：孩子独自玩时卡死 5 次就是弃玩。" +
            " <button id='pk-speak' style='font:inherit;font-size:11px;border:1px solid #d9b45c;background:#fff;border-radius:4px;padding:1px 8px;cursor:pointer'>🔊 朗读</button>";
          ladderEl.querySelector("#pk-speak").addEventListener("click", function () { speak(w.word); });
        } else {
          ladderEl.innerHTML = "<b>连错 4 次 · 阶梯 L2</b>（M1）：已直接高亮正确字母块 → " +
            "<span class='assisted-flag'>assisted=true</span> streak 归零、ease 下调、<b>本关三星不可达</b>（D13）";
        }
      } else {
        ladderEl.style.display = "none";
      }
    }

    function masked() {
      var out = "";
      card.slots.forEach(function (ch, i) { out += (i < card.filled ? ch : "_"); });
      return out;
    }

    function speak(word) {
      if (!("speechSynthesis" in window)) { alert("此浏览器不支持 SpeechSynthesis"); return; }
      var u = new SpeechSynthesisUtterance(word);
      u.lang = "en-US";
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }

    setVisible(false);
    return { setCard: setCard, render: render, setVisible: setVisible, el: host };
  }

  return { create: create };
})();
