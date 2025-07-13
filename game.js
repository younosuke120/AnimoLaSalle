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
      el.innerHTML = `
        <div class="cost">${card.cost}</div>
        <img src="${card.img}" alt="${card.id}">
        <div class="name">${card.id}</div>
        ${card.type==="unit" ? `<div class="power">${card.power}</div>` : ""}
      `;
      if(isPlayer && card.type==="unit" && !card.tired){
        el.style.cursor = "pointer";
        el.onclick = () => this.selectAttacker(card, el);
      }
      return el;
    }
    renderHand(){
      const handDiv = document.getElementById("playerHand");
      handDiv.innerHTML = "";
      this.players[0].hand.forEach(card => {
        const el = this.createCardElement(card);
        if(card.cost <= this.players[0].mana){
          el.style.cursor = "pointer";
          el.onclick = () => this.playCard(card);
        }
        handDiv.appendChild(el);
      });
    }
    selectAttacker(card, el){
      if(this.phase !== "play") return;
      if(card.tired) return;
      if(this.selectedAttacker){
        this.selectedAttacker = null;
        this.clearSelection();
        this.log("攻撃対象の選択をキャンセルしました。");
      } else {
        this.selectedAttacker = card;
        el.classList.add("selected");
        this.log(card.id + "を攻撃に選択しました。敵プレイヤーをクリックしてください。");
      }
    }
    clearSelection(){
      document.querySelectorAll(".selected").forEach(el => el.classList.remove("selected"));
    }
    playCard(card){
      if(this.players[0].mana < card.cost) {
        alert("マナが足りません");
        return;
      }
      if(card.type !== "unit" && card.type !== "nexus") {
        alert("このカードはまだプレイできません");
        return;
      }
      this.players[0].mana -= card.cost;
      this.players[0].hand.splice(this.players[0].hand.indexOf(card),1);
      this.players[0].field.push(card);
      this.log(card.id + "を召喚しました。");
      if(card.effect){
        card.effect(this, this.players[0], this.players[1]);
      }
      this.updateUI();
    }
    attackEnemyPlayer(){
      if(!this.selectedAttacker) {
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
    checkGameOver(){
      if(this.players[0].life <= 0){
        alert("あなたの負けです");
        this.isGameOver = true;
      } else if(this.players[1].life <= 0){
        alert("あなたの勝ちです！");
        this.isGameOver = true;
      }
    }
    promptPlay(){
      this.updateUI();
      this.log(this.currentPlayer.name + "のターンです。");
    }
    endTurn(){
      if(this.isGameOver) return;
      // 疲労解除＆ターン入れ替え＆マナ回復＆カードドロー
      this.currentPlayer.field.forEach(c => c.tired = false);
      this.turnPlayerIndex = 1 - this.turnPlayerIndex;
      this.currentPlayer = this.players[this.turnPlayerIndex];
      this.opponent = this.players[1 - this.turnPlayerIndex];

      this.currentPlayer.manaMax += 1;
      this.currentPlayer.mana = this.currentPlayer.manaMax;

      const drawn = this.currentPlayer.draw();
      if(!drawn){
        alert(this.currentPlayer.name + "はデッキ切れで敗北しました。");
        this.isGameOver = true;
        return;
      }

      // エンリコ破壊処理
      this
