(() => {
  const cardDefs = [
    { id: "教皇ドミンゴ", cost: 6, power: 5000, type: "unit", img: "images/教皇ドミンゴ.png", effect: (game, player) => {
      player.life = Math.min(player.life + 2, 5);
      game.log(player.name + "のライフが2回復した！");
    }, unlimited: false, text: "召喚時: 自分のライフを2回復" },
    { id: "鉄の拳骨テツオ", cost: 4, power: 5000, type: "unit", img: "images/鉄の拳骨テツオ.png", effect: (game, player, opponent) => {
      const target = opponent.field.find(c => c.type==="unit" && c.tired);
      if(target){
        opponent.moveToTrash(target);
        game.log(player.name + "の鉄の拳骨テツオの効果で疲労状態の" + target.id + "を破壊した！");
      }
    }, unlimited: false, text: "召喚時: 疲労状態の相手キャラ1体を破壊" },
    { id: "ビーンズMK", cost: 3, power: 2000, type: "unit", img: "images/ビーンズMK.png", effect: (game, player) => {
      const top2 = player.deck.splice(0,2);
      if(top2.length===0) return;
      game.log(player.name + "はデッキの上から2枚を公開した。");
      if(top2.length===1){
        player.hand.push(top2[0]);
        game.log(top2[0].id + "を手札に加えた。");
      } else {
        player.hand.push(top2[0]);
        game.log(top2[0].id + "を手札に加え、残りはトラッシュに置いた。");
        player.moveToTrash(top2[1]);
      }
    }, unlimited: false, text: "召喚時: デッキの上から2枚を公開し1枚を手札に加える。残りはトラッシュへ" },
    { id: "進撃の松山", cost: 9, power: 15000, type: "unit", img: "images/進撃の松山.png", effect: (game, player, opponent) => {
      const toDestroy = opponent.field.filter(c => c.type==="unit" && c.power <= 5000);
      toDestroy.forEach(c => opponent.moveToTrash(c));
      if(toDestroy.length) game.log(player.name + "の進撃の松山の効果で相手のパワー5000以下のキャラをすべて破壊！");
    }, unlimited: false, text: "アタック時: 相手のパワー5000以下をすべて破壊" },
    { id: "函館のエンリコ", cost: 5, power: 10000, type: "unit", img: "images/函館のエンリコ.png", effect: (game, player, opponent) => {
      // 終了時破壊処理はターン終了時に別途呼ぶ
    }, unlimited: true, text: "ターン終了時破壊。ただし場に『函館のフェイクスクール』がある場合破壊されない" },
    { id: "函館のフェイクスクール", cost: 4, power: 0, type: "nexus", img: "images/函館のフェイクスクール.png", effect: (game, player, opponent) => {
      // エンリコのパワー+5000はrenderField内で適用
    }, unlimited: false, text: "場にあると『函館のエンリコ』のパワーを+5000" },
  ];

  class Player {
    constructor(name){
      this.name = name;
      this.life = 5;
      this.manaMax = 4;
      this.mana = 4;
      this.deck = [];
      this.hand = [];
      this.field = [];
      this.trash = [];
    }
    draw(){
      if(this.deck.length===0) return null;
      const card = this.deck.shift();
      this.hand.push(card);
      return card;
    }
    moveToTrash(card){
      [this.field,this.hand].forEach(arr=>{
        const idx = arr.indexOf(card);
        if(idx>=0) arr.splice(idx,1);
      });
      this.trash.push(card);
    }
    hasNexus(name){
      return this.field.some(c=>c.type==='nexus' && c.id===name);
    }
  }

  class Game {
    constructor(){
      this.players = [new Player("あなた"), new Player("敵")];
      this.turnPlayerIndex = 0;
      this.phase = "deckbuild";
      this.selectedCard = null;
      this.selectedAttacker = null;
      this.isGameOver = false;
    }
    log(msg){
      const logDiv = document.getElementById("log");
      logDiv.innerHTML += msg + "<br>";
      logDiv.scrollTop = logDiv.scrollHeight;
    }
    shuffleDeck(deck){
      for(let i=deck.length-1; i>0; i--){
        const j = Math.floor(Math.random()*(i+1));
        [deck[i],deck[j]] = [deck[j],deck[i]];
      }
    }
    startDeckBuild(){
      this.phase = "deckbuild";
      document.getElementById("modeSelect").style.display = "none";
      document.getElementById("deckBuilder").style.display = "block";
      document.getElementById("gameArea").style.display = "none";
      this.initCardPool();
    }
    initCardPool(){
      const poolDiv = document.getElementById("cardPool");
      poolDiv.innerHTML = "";
      cardDefs.forEach(card=>{
        const el = this.createCardElement(card);
        el.onclick = () => this.addCardToDeck(card);
        poolDiv.appendChild(el);
      });
      this.deckSelected = [];
      this.updateDeckCount();
    }
    createCardElement(card){
      const el = document.createElement("div");
      el.className = "card";
      el.title = card.text;
      el.innerHTML = `<div class="cost">${card.cost}</div>
        <img src="${card.img}" alt="${card.id}" />
        <div class="name">${card.id}</div>`;
      return el;
    }
    addCardToDeck(card){
      const count = this.deckSelected.filter(c=>c.id===card.id).length;
      if(!card.unlimited && count >= 3){
        alert("同じカードは3枚までです");
        return;
      }
      this.deckSelected.push(card);
      this.updateDeckCount();
      this.renderSelectedDeck();
      document.getElementById("btnStartGame").disabled = this.deckSelected.length < 40;
    }
    updateDeckCount(){
      document.getElementById("deckCount").textContent = this.deckSelected.length;
    }
    renderSelectedDeck(){
      const selectedDiv = document.getElementById("deckSelected");
      selectedDiv.innerHTML = "";
      this.deckSelected.forEach((card, i) => {
        const el = this.createCardElement(card);
        el.onclick = () => {
          this.deckSelected.splice(i,1);
          this.updateDeckCount();
          this.renderSelectedDeck();
          document.getElementById("btnStartGame").disabled = this.deckSelected.length < 40;
        };
        selectedDiv.appendChild(el);
      });
    }
    startGame(){
      if(this.deckSelected.length < 40){
        alert("デッキは40枚以上必要です");
        return;
      }
      this.phase = "play";
      this.isGameOver = false;
      document.getElementById("deckBuilder").style.display = "none";
      document.getElementById("gameArea").style.display = "block";

      this.players[0].deck = this.shuffleAndCloneDeck(this.deckSelected);
      this.players[1].deck = this.shuffleAndCloneDeck(this.deckSelected);

      this.players.forEach(p => {
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

      for(let i=0; i<4; i++) {
        this.players[0].draw();
        this.players[1].draw();
      }
      this.updateUI();
      this.log("ゲーム開始！");
      this.promptPlay();
    }
    shuffleAndCloneDeck(deck){
      const copy = deck.map(c => Object.assign({}, c));
      this.shuffleDeck(copy);
      return copy;
    }
    updateUI(){
      this.updateStatus();
      this.renderField();
      this.renderHand();
    }
    updateStatus(){
      document.getElementById("playerStatus").textContent = `${this.players[0].name} - ライフ: ${this.players[0].life} / マナ: ${this.players[0].mana}`;
      document.getElementById("enemyStatus").textContent = `${this.players[1].name} - ライフ: ${this.players[1].life} / マナ: ${this.players[1].mana}`;
    }
    renderField(){
      const pf = document.getElementById("playerField");
      const ef = document.getElementById("enemyField");
      pf.innerHTML = "<h3>自分の場</h3>";
      ef.innerHTML = "<h3>敵の場</h3>";
      this.players[0].field.forEach(card => {
        const el = this.createUnitElement(card, true);
        pf.appendChild(el);
      });
      this.players[1].field.forEach(card => {
        const el = this.createUnitElement(card, false);
        ef.appendChild(el);
      });
    }
    createUnitElement(card, isPlayer){
      const el = document.createElement("div");
      el.className = card.type === "nexus" ? "nexus" : "unit";
      el.title = card.text;
      if(card.tired) el.classList.add("tired");

      // エンリコのパワー＋5000判定
      let powerDisplay = "";
      if(card.type === "unit") {
        let power = card.power;
        if(card.id === "函館のエンリコ" && isPlayer){
          if(this.players[0].hasNexus("函館のフェイクスクール")) power += 5000;
        } else if(card.id === "函館のエンリコ" && !isPlayer){
          if(this.players[1].hasNexus("函館のフェイクスクール")) power += 5000;
        }
        powerDisplay = `<div class="power">${power}</div>`;
      }

      el.innerHTML = `
        <div class="cost">${card.cost}</div>
        <img src="${card.img}" alt="${card.id}">
        <divel.innerHTML = `
        <div class="cost">${card.cost}</div>
        <img src="${card.img}" alt="${card.id}">
        <div class="name">${card.id}</div>
        ${powerDisplay}
      `;
      if(card.type === "unit" && isPlayer && !card.tired){
        el.style.cursor = "pointer";
        el.onclick = () => this.selectAttacker(card, el);
      }
      return el;
    }

    renderHand(){
      const handDiv = document.getElementById("playerHand");
      handDiv.innerHTML = "";
      this.players[0].hand.forEach((card, idx) => {
        const el = this.createCardElement(card);
        if(card.cost <= this.players[0].mana){
          el.style.borderColor = "#1976d2";
          el.style.cursor = "pointer";
          el.onclick = () => this.playCard(idx);
        } else {
          el.style.opacity = "0.5";
        }
        handDiv.appendChild(el);
      });
    }

    selectAttacker(card, element){
      if(this.selectedAttacker){
        this.selectedAttackerElement.classList.remove("selected");
      }
      this.selectedAttacker = card;
      this.selectedAttackerElement = element;
      element.classList.add("selected");
      this.log(card.id + " が攻撃対象を選択中...");
    }

    playCard(handIndex){
      if(this.phase !== "play") return;
      const player = this.players[0];
      const card = player.hand[handIndex];
      if(card.cost > player.mana){
        alert("マナが足りません");
        return;
      }
      if(player.field.length >= 5){
        alert("場に出せるキャラは5体までです");
        return;
      }
      player.mana -= card.cost;
      player.hand.splice(handIndex,1);
      player.field.push(card);
      this.log(player.name + "が「" + card.id + "」を召喚した！");
      if(card.effect) card.effect(this, player, this.players[1]);
      this.updateUI();
    }

    attackTarget(target){
      if(!this.selectedAttacker){
        alert("まず攻撃するキャラを選んでください");
        return;
      }
      if(this.selectedAttacker.tired){
        alert("疲労状態のキャラは攻撃できません");
        return;
      }
      const attacker = this.selectedAttacker;
      const opponent = this.players[1];
      if(target === opponent){
        opponent.life -= 1;
        this.log(attacker.id + "が直接攻撃！敵のライフが1減った");
        attacker.tired = true;
      } else {
        // ブロック処理
        if(target.tired){
          alert("疲労状態のキャラはブロックできません");
          return;
        }
        this.log(attacker.id + "が" + target.id + "を攻撃した！");
        if(attacker.power > target.power){
          this.log(target.id + "は破壊された！");
          opponent.moveToTrash(target);
          attacker.tired = true;
        } else if(attacker.power < target.power){
          this.log(attacker.id + "は破壊された！");
          this.players[0].moveToTrash(attacker);
          attacker.tired = true;
        } else {
          this.log("同じパワーのため両者破壊！");
          this.players[0].moveToTrash(attacker);
          opponent.moveToTrash(target);
        }
      }
      this.selectedAttackerElement.classList.remove("selected");
      this.selectedAttacker = null;
      this.selectedAttackerElement = null;
      this.updateUI();
      this.checkGameEnd();
    }

    checkGameEnd(){
      if(this.players[0].life <= 0){
        alert("あなたの負けです");
        this.isGameOver = true;
      } else if(this.players[1].life <= 0){
        alert("あなたの勝ちです！");
        this.isGameOver = true;
      }
      if(this.isGameOver){
        this.phase = "end";
        document.getElementById("btnEndTurn").disabled = true;
      }
    }

    promptPlay(){
      // 敵ターンは簡略AIで自動処理
      if(this.turnPlayerIndex === 1){
        this.enemyTurn();
      } else {
        this.log("あなたのターンです。カードをプレイして、攻撃してください。");
      }
    }

    endTurn(){
      if(this.isGameOver) return;
      const player = this.players[this.turnPlayerIndex];
      player.manaMax++;
      player.mana = player.manaMax;
      this.log(player.name + "のターン終了。マナが" + player.manaMax + "に増加し全回復。");
      player.field.forEach(card => card.tired = false);

      if(this.turnPlayerIndex === 0){
        this.turnPlayerIndex = 1;
        this.currentPlayer = this.players[1];
        this.opponent = this.players[0];
        // 敵は自動処理
        this.currentPlayer.draw();
        this.updateUI();
        this.promptPlay();
      } else {
        this.turnPlayerIndex = 0;
        this.currentPlayer = this.players[0];
        this.opponent = this.players[1];
        this.currentPlayer.draw();
        this.updateUI();
        this.promptPlay();
      }
    }

    enemyTurn(){
      this.log("敵のターン開始");
      const enemy = this.players[1];
      const player = this.players[0];

      // 敵は1枚でも出せるなら出す
      enemy.hand.forEach((card, idx) => {
        if(card.cost <= enemy.mana && enemy.field.length < 5){
          enemy.mana -= card.cost;
          enemy.field.push(card);
          enemy.hand.splice(idx,1);
          this.log("敵が「" + card.id + "」を召喚した！");
          if(card.effect) card.effect(this, enemy, player);
          return;
        }
      });
      this.updateUI();

      // 敵が攻撃可能なキャラで攻撃
      enemy.field.forEach(card => {
        if(card.tired) return;
        if(player.field.length > 0){
          // ブロックは最初の味方キャラで
          const blocker = player.field[0];
          this.log(card.id + "が" + blocker.id + "を攻撃！");
          if(card.power > blocker.power){
            this.log(blocker.id + "は破壊された！");
            player.moveToTrash(blocker);
          } else if(card.power < blocker.power){
            this.log(card.id + "は破壊された！");
            enemy.moveToTrash(card);
          } else {
            this.log("同じパワーのため両者破壊！");
            enemy.moveToTrash(card);
            player.moveToTrash(blocker);
          }
          card.tired = true;
        } else {
          player.life -= 1;
          this.log(card.id + "が直接攻撃！あなたのライフが1減った！");
          card.tired = true;
        }
      });
      this.updateUI();
      this.checkGameEnd();
      if(!this.isGameOver){
        this.endTurn();
      }
    }
  }

  const game = new Game();

  document.getElementById("btnStartGame").onclick = () => game.startGame();
  document.getElementById("btnEndTurn").onclick = () => game.endTurn();

  document.getElementById("enemyPlayer").onclick = () => {
    if(game.selectedAttacker){
      game.attackTarget(game.players[1]);
    } else {
      alert("まず攻撃するキャラを選んでください");
    }
  };

  // 対戦モード選択からデッキ構築へ
  document.getElementById("btnAi").onclick = () => game.startDeckBuild();
  document.getElementById("btn2p").onclick = () => alert("2人対戦は未実装です。AI対戦を選んでください。");

})();
