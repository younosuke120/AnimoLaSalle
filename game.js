// game.js - トレーディングカードゲームロジック

// カード定義リスト
const cardDefs = [
  {
    id: "教皇ドミンゴ",
    cost: 6,
    power: 5000,
    type: "unit",
    img: "images/教皇ドミンゴ.png",
    unlimited: false,
    text: "召喚時: 自分のライフを2回復",
    effect: (game, player, opponent) => {
      player.life = Math.min(player.life + 2, 5);
      game.log(`${player.name}のライフが2回復した！`);
    },
  },
  {
    id: "鉄の拳骨テツオ",
    cost: 4,
    power: 5000,
    type: "unit",
    img: "images/鉄の拳骨テツオ.png",
    unlimited: false,
    text: "召喚時: 疲労状態の相手キャラ1体を破壊",
    effect: (game, player, opponent) => {
      const target = opponent.field.find((c) => c.type === "unit" && c.tired);
      if (target) {
        opponent.moveToTrash(target);
        game.log(`${player.name}の鉄の拳骨テツオの効果で疲労状態の${target.id}を破壊した！`);
      }
    },
  },
  {
    id: "ビーンズMK",
    cost: 3,
    power: 2000,
    type: "unit",
    img: "images/ビーンズMK.png",
    unlimited: false,
    text: "召喚時: デッキの上から2枚を公開し、1枚を手札に加える。残りはトラッシュへ",
    effect: (game, player, opponent) => {
      const top2 = player.deck.splice(0, 2);
      if (top2.length === 0) return;
      game.log(`${player.name}はデッキの上から2枚を公開した。`);
      if (top2.length === 1) {
        player.hand.push(top2[0]);
        game.log(`${top2[0].id}を手札に加えた。`);
      } else {
        player.hand.push(top2[0]);
        game.log(`${top2[0].id}を手札に加え、残りはトラッシュに置いた。`);
        player.moveToTrash(top2[1]);
      }
    },
  },
  {
    id: "進撃の松山",
    cost: 9,
    power: 15000,
    type: "unit",
    img: "images/進撃の松山.png",
    unlimited: false,
    text: "アタック時: 相手のパワー5000以下をすべて破壊",
    effect: (game, player, opponent) => {
      const toDestroy = opponent.field.filter((c) => c.type === "unit" && c.power <= 5000);
      toDestroy.forEach((c) => opponent.moveToTrash(c));
      if (toDestroy.length)
        game.log(`${player.name}の進撃の松山の効果で相手のパワー5000以下のキャラをすべて破壊！`);
    },
  },
  {
    id: "函館のエンリコ",
    cost: 5,
    power: 10000,
    type: "unit",
    img: "images/函館のエンリコ.png",
    unlimited: true,
    text: "ターン終了時破壊。ただし場に『函館のフェイクスクール』がある場合破壊されない",
    effect: (game, player, opponent) => {
      // ターン終了時に処理
    },
  },
  {
    id: "函館のフェイクスクール",
    cost: 4,
    power: 0,
    type: "nexus",
    img: "images/函館のフェイクスクール.png",
    unlimited: false,
    text: "場にあると『函館のエンリコ』のパワーを+5000",
  },
];

// プレイヤークラス
class Player {
  constructor(name) {
    this.name = name;
    this.life = 5;
    this.manaMax = 4;
    this.mana = 4;
    this.deck = [];
    this.hand = [];
    this.field = [];
    this.trash = [];
  }

  draw() {
    if (this.deck.length === 0) return null;
    const card = this.deck.shift();
    this.hand.push(card);
    return card;
  }

  moveToTrash(card) {
    [this.field, this.hand].forEach((arr) => {
      const idx = arr.indexOf(card);
      if (idx >= 0) arr.splice(idx, 1);
    });
    this.trash.push(card);
  }

  hasNexus(name) {
    return this.field.some((c) => c.type === "nexus" && c.id === name);
  }
}

// ゲームクラス本体
class Game {
  constructor() {
    this.players = [new Player("あなた"), new Player("敵")];
    this.turnPlayerIndex = 0;
    this.phase = "deckbuild"; // deckbuild / play / end
    this.selectedCard = null; // 手札選択用
    this.selectedAttacker = null; // 攻撃キャラ選択用
    this.isGameOver = false;
    this.deckSelected = [];
  }

  log(msg) {
    const logDiv = document.getElementById("log");
    logDiv.innerHTML += msg + "<br>";
    logDiv.scrollTop = logDiv.scrollHeight;
  }

  shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  shuffleAndCloneDeck(deck) {
    const copy = deck.map((c) => Object.assign({}, c));
    this.shuffleDeck(copy);
    return copy;
  }

  startDeckBuild() {
    this.phase = "deckbuild";
    document.getElementById("modeSelect").style.display = "none";
    document.getElementById("deckBuilder").style.display = "block";
    document.getElementById("gameArea").style.display = "none";
    this.deckSelected = [];
    this.initCardPool();
  }

  initCardPool() {
    const poolDiv = document.getElementById("cardPool");
    poolDiv.innerHTML = "";
    cardDefs.forEach((card) => {
      const el = this.createCardElement(card);
      el.onclick = () => this.addCardToDeck(card);
      poolDiv.appendChild(el);
    });
    this.updateDeckCount();
    this.renderSelectedDeck();
  }

  createCardElement(card) {
    const el = document.createElement("div");
    el.className = "card";
    el.title = card.text;
    el.innerHTML = `<div class="cost">${card.cost}</div>
      <img src="${card.img}" alt="${card.id}" />
      <div class="name">${card.id}</div>`;
    return el;
  }

  addCardToDeck(card) {
    const count = this.deckSelected.filter((c) => c.id === card.id).length;
    if (!card.unlimited && count >= 3) {
      alert("同じカードは3枚までです");
      return;
    }
    this.deckSelected.push(card);
    this.updateDeckCount();
    this.renderSelectedDeck();
    document.getElementById("btnStartGame").disabled = this.deckSelected.length < 40;
  }

  updateDeckCount() {
    document.getElementById("deckCount").textContent = this.deckSelected.length;
  }

  renderSelectedDeck() {
    const selectedDiv = document.getElementById("deckSelected");
    selectedDiv.innerHTML = "";
    this.deckSelected.forEach((card, i) => {
      const el = this.createCardElement(card);
      el.onclick = () => {
        this.deckSelected.splice(i, 1);
        this.updateDeckCount();
        this.renderSelectedDeck();
        document.getElementById("btnStartGame").disabled = this.deckSelected.length < 40;
      };
      selectedDiv.appendChild(el);
    });
  }
  // 続く...
  startGame() {
    if (this.deckSelected.length < 40) {
      alert("デッキは40枚以上必要です");
      return;
    }
    this.phase = "play";
    this.isGameOver = false;
    document.getElementById("deckBuilder").style.display = "none";
    document.getElementById("gameArea").style.display = "block";

    // デッキをシャッフルしてセット
    this.players[0].deck = this.shuffleAndCloneDeck(this.deckSelected);
    this.players[1].deck = this.shuffleAndCloneDeck(this.deckSelected);

    // 初期化
    this.players.forEach((p) => {
      p.life = 5;
      p.manaMax = 4;
      p.mana = 4;
      p.hand = [];
      p.field = [];
      p.trash = [];
    });

    this.turnPlayerIndex = 0;
    this.currentPlayer = this.players[this.turnPlayerIndex];
    this.opponent = this.players[1 - this.turnPlayerIndex];

    // 初期手札4枚引く
    for (let i = 0; i < 4; i++) {
      this.players[0].draw();
      this.players[1].draw();
    }

    this.updateUI();
    this.log("ゲーム開始！");
    this.promptPlay();
  }

  updateUI() {
    this.updateStatus();
    this.renderField();
    this.renderHand();
  }

  updateStatus() {
    document.getElementById("playerStatus").textContent = `${this.players[0].name} - ライフ: ${this.players[0].life} / マナ: ${this.players[0].mana}`;
    document.getElementById("enemyStatus").textContent = `${this.players[1].name} - ライフ: ${this.players[1].life} / マナ: ${this.players[1].mana}`;
  }

  renderField() {
    const pf = document.getElementById("playerField");
    const ef = document.getElementById("enemyField");
    pf.innerHTML = "<h3>自分の場</h3>";
    ef.innerHTML = "<h3>敵の場</h3>";

    // エンリコのパワー＋5000効果の適用
    const playerHasFakeSchool = this.players[0].hasNexus("函館のフェイクスクール");
    const enemyHasFakeSchool = this.players[1].hasNexus("函館のフェイクスクール");

    this.players[0].field.forEach((card) => {
      let power = card.power;
      if (card.id === "函館のエンリコ" && playerHasFakeSchool) {
        power += 5000;
      }
      const el = this.createUnitElement(card, true, power);
      pf.appendChild(el);
    });

    this.players[1].field.forEach((card) => {
      let power = card.power;
      if (card.id === "函館のエンリコ" && enemyHasFakeSchool) {
        power += 5000;
      }
      const el = this.createUnitElement(card, false, power);
      ef.appendChild(el);
    });
  }

  createUnitElement(card, isPlayer, displayPower) {
    const el = document.createElement("div");
    el.className = card.type === "nexus" ? "nexus" : "unit";
    el.title = card.text;
    if (card.tired) el.classList.add("tired");
    el.innerHTML = `
      <div class="cost">${card.cost}</div>
      <img src="${card.img}" alt="${card.id}">
      <div class="name">${card.id}</div>
      ${card.type === "unit" ? `<div class="power">${displayPower !== undefined ? displayPower : card.power}</div>` : ""}
    `;
    if (isPlayer && card.type === "unit" && !card.tired) {
      el.style.cursor = "pointer";
      el.onclick = () => this.selectAttacker(card, el);
    }
    return el;
  }

  renderHand() {
    const handDiv = document.getElementById("playerHand");
    handDiv.innerHTML = "";
    this.players[0].hand.forEach((card) => {
      const el = this.createCardElement(card);
      if (card.cost <= this.players[0].mana) {
        el.style.cursor = "pointer";
        el.onclick = () => this.playCard(card);
      }
      handDiv.appendChild(el);
    });
  }

  selectAttacker(card, el) {
    if (this.phase !== "play") return;
    if (card.tired) return;
    if (this.selectedAttacker) {
      this.selectedAttacker = null;
      this.clearSelection();
      this.log("攻撃対象の選択をキャンセルしました。");
    } else {
      this.selectedAttacker = card;
      el.classList.add("selected");
      this.log(card.id + "を攻撃に選択しました。敵プレイヤーをクリックしてください。");
    }
  }

  clearSelection() {
    document.querySelectorAll(".selected").forEach((el) => el.classList.remove("selected"));
  }

  playCard(card) {
    if (this.players[0].mana < card.cost) {
      alert("マナが足りません");
      return;
    }
    if (card.type !== "unit" && card.type !== "nexus") {
      alert("このカードはまだプレイできません");
      return;
    }
    this.players[0].mana -= card.cost;
    this.players[0].hand.splice(this.players[0].hand.indexOf(card), 1);
    this.players[0].field.push(card);
    this.log(card.id + "を召喚しました。");
    if (card.effect) {
      card.effect(this, this.players[0], this.players[1]);
    }
    this.updateUI();
  }

  attackEnemyPlayer() {
    if (!this.selectedAttacker) {
      alert("まず攻撃するキャラを選択してください");
      return;
    }
    const attacker = this.selectedAttacker;
    this.selectedAttacker = null;
    this.clearSelection();
    this.log(attacker.id + "が敵プレイヤーに攻撃！");
    attacker.tired = true;
    this.players[1].life -= 1;
    this.checkGameOver();
    this.updateUI();
  }

  checkGameOver() {
    if (this.players[0].life <= 0) {
      alert("あなたの負けです");
      this.isGameOver = true;
    } else if (this.players[1].life <= 0) {
      alert("あなたの勝ちです！");
      this.isGameOver = true;
    }
  }

  promptPlay() {
    this.updateUI();
    this.log(this.currentPlayer.name + "のターンです。");
  }

  endTurn() {
    if (this.isGameOver) return;

    // 疲労解除＆ターン入れ替え＆マナ回復＆カードドロー

    // 疲労解除（アタック・ブロックで疲労）
    this.currentPlayer.field.forEach((c) => (c.tired = false));

    // ターン交代
    this.turnPlayerIndex = 1 - this.turnPlayerIndex;
    this.currentPlayer = this.players[this.turnPlayerIndex];
    this.opponent = this.players[1 - this.turnPlayerIndex];

    // マナ全回復 +1増加
    this.currentPlayer.manaMax += 1;
    this.currentPlayer.mana = this.currentPlayer.manaMax;

    // カードドロー
    const drawn = this.currentPlayer.draw();
    if (!drawn) {
      alert(this.currentPlayer.name + "はデッキ切れで敗北しました。");
      this.isGameOver = true;
      return;
    }

    // エンリコの終了時破壊処理
    // 場に「函館のフェイクスクール」がある場合は破壊されない
    this.currentPlayer.field = this.currentPlayer.field.filter((card) => {
      if (card.id === "函館のエンリコ") {
        const hasFakeSchool = this.currentPlayer.hasNexus("函館のフェイクスクール");
        if (!hasFakeSchool) {
          this.moveToTrash(card);
          this.log(card.id + "はターン終了時に破壊されました。");
          return false;
        }
      }
      return true;
    });

    this.updateUI();
    this.log(this.currentPlayer.name + "のターン開始。カードを引きました。");
  }

  moveToTrash(card) {
    const owner = this.players.find((p) => p.field.includes(card) || p.hand.includes(card));
    if (owner) {
      owner.moveToTrash(card);
    }
  }
}

// グローバル変数 game を作成
let game = new Game();

// モード選択ボタン
document.getElementById("btnAi").onclick = () => {
  alert("AI戦はまだ実装されていません。2人対戦を使ってください。");
};
document.getElementById("btn2p").onclick = () => {
  game.startDeckBuild();
};

// デッキ構築画面のカード選択・解除はGameクラス内の関数が使われている想定

document.getElementById("btnStartGame").onclick = () => {
  game.startGame();
};

document.getElementById("btnEndTurn").onclick = () => {
  game.endTurn();
};

// 敵プレイヤーへの攻撃クリック
document.getElementById("enemyPlayer").onclick = () => {
  if (game.phase !== "play") return;
  game.attackEnemyPlayer();
};
})();
