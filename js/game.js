// js/game.js
// Core game logic for Linear (keeps Easter egg)
(() => {
  // Game state
  let money = 10;
  let autoIncome = 0;
  let multiplier = 1;
  let tickInterval = 1000; // ms
  let tickBoostCost = 1000000;
  let boostActiveUntil = null;

  let shopCountdown = 120;
  let petShopCountdown = 120;

  // Data
  const itemNames = ['Sword','Shield','Helmet','Armor','Boots','Amulet','Ring'];
  const rarities = [
    { name: 'Common',    bonus: 1,     cost: 10,       color: 'white',   chance: 40 },
    { name: 'Uncommon',  bonus: 5,     cost: 100,      color: 'lime',    chance: 20 },
    { name: 'Rare',      bonus: 15,    cost: 1000,     color: 'aqua',    chance: 15 },
    { name: 'Epic',      bonus: 25,    cost: 10000,    color: 'violet',  chance: 10 },
    { name: 'Legendary', bonus: 50,    cost: 50000,    color: 'orange',  chance: 5 },
    { name: 'Mythic',    bonus: 100,   cost: 75000,    color: 'magenta', chance: 3 },
    { name: 'Insane',    bonus: 300,   cost: 100000,   color: 'red',     chance: 1 },
    { name: 'Godly',     bonus: 500,   cost: 500000,   color: 'gold',    chance: 0.4 },
    { name: 'Crazy',     bonus: 1000,  cost: 1000000,  color: 'cyan',    chance: 0.09 },
    // Easter egg (kept)
    { name: 'If you see this tell Henry Dale', bonus: 1000000000, cost: 1, color: 'magenta', chance: 0.01 }
  ];

  // Runtime collections
  let itemsOwned = [];
  let petsOwned = [];
  let currentItemSlots = [];
  let currentPetSlots = [];

  // DOM elements (assumes these IDs exist in index.html)
  const moneyEl = document.getElementById('money');
  const incomeEl = document.getElementById('income');
  const boostStatusEl = document.getElementById('boostStatus');
  const tickBoostStatusEl = document.getElementById('tickBoostStatus');
  const tickIntervalDisplayEl = document.getElementById('tickIntervalDisplay');
  const itemSlotsEl = document.getElementById('itemSlots');
  const petSlotsEl = document.getElementById('petSlots');
  const itemsListEl = document.getElementById('itemsList');
  const petsListEl = document.getElementById('petsList');
  const itemTimerEl = document.getElementById('itemTimer');
  const petTimerEl = document.getElementById('petTimer');
  const notificationsEl = document.getElementById('notifications');

  // Utilities
  function showNotification(text, ms = 3000) {
    if (!notificationsEl) return;
    const note = document.createElement('div');
    note.className = 'notification';
    note.textContent = text;
    notificationsEl.appendChild(note);
    setTimeout(() => note.remove(), ms);
  }

  function formatNumber(n) {
    if (typeof n !== 'number') return n;
    if (!isFinite(n)) return n.toString();
    return Math.floor(n).toLocaleString();
  }

  // Rarity selection using total chance (respects given chance values)
  function getRandomRarity() {
    const total = rarities.reduce((s, r) => s + (r.chance || 0), 0);
    const roll = Math.random() * total;
    let sum = 0;
    for (const r of rarities) {
      sum += (r.chance || 0);
      if (roll <= sum) return r;
    }
    // fallback
    return rarities.find(r => r.name === 'Common') || rarities[0];
  }

  // Shops
  function fillItemSlots() {
    currentItemSlots = [];
    for (let i = 0; i < 4; i++) {
      const r = getRandomRarity();
      const name = itemNames[Math.floor(Math.random() * itemNames.length)];
      currentItemSlots.push({ name, rarityName: r.name, bonus: r.bonus, cost: r.cost, color: r.color, bought: false });
    }
  }

  function fillPetSlots() {
    currentPetSlots = [];
    for (let i = 0; i < 3; i++) {
      const r = getRandomRarity();
      currentPetSlots.push({ rarityName: r.name, bonus: r.bonus, cost: r.cost, color: r.color, bought: false });
    }
  }

  function renderShops() {
    if (itemSlotsEl) itemSlotsEl.innerHTML = '';
    if (petSlotsEl) petSlotsEl.innerHTML = '';

    currentItemSlots.forEach(slot => {
      const div = document.createElement('div');
      div.className = 'slot';
      div.innerHTML = `<b style="color:${slot.color}">${slot.rarityName} ${slot.name}</b> (+${slot.bonus}/sec) - $${formatNumber(slot.cost)}`;
      const btn = document.createElement('button');
      btn.textContent = slot.bought ? 'Bought' : 'Buy';
      btn.disabled = slot.bought;
      btn.onclick = () => {
        if (slot.bought) return;
        if (money < slot.cost) return alert('Cannot buy: insufficient funds');
        money -= slot.cost;
        autoIncome += slot.bonus;
        slot.bought = true;
        itemsOwned.push({ name: slot.name, rarityName: slot.rarityName, bonus: slot.bonus, color: slot.color });
        renderItemsOwned();
        showNotification(`Bought ${slot.rarityName} ${slot.name}`);
        updateDisplay();
        renderShops();
      };
      div.appendChild(btn);
      if (itemSlotsEl) itemSlotsEl.appendChild(div);
    });

    currentPetSlots.forEach(slot => {
      const div = document.createElement('div');
      div.className = 'slot';
      div.innerHTML = `<b style="color:${slot.color}">${slot.rarityName} Egg</b> - $${formatNumber(slot.cost)}`;
      const btn = document.createElement('button');
      btn.textContent = slot.bought ? 'Hatched' : 'Hatch';
      btn.disabled = slot.bought;
      btn.onclick = () => {
        if (slot.bought) return;
        if (money < slot.cost) return alert('Cannot hatch: insufficient funds');
        money -= slot.cost;
        const r = rarities.find(rr => rr.name === slot.rarityName) || rarities[0];
        const pet = { rarityName: r.name, bonus: r.bonus, color: r.color };
        petsOwned.push(pet);
        autoIncome += pet.bonus;
        slot.bought = true;
        renderPetsOwned();
        showNotification(`Hatched a ${pet.rarityName} Pet (+${pet.bonus}/sec)`);
        updateDisplay();
        renderShops();
      };
      div.appendChild(btn);
      if (petSlotsEl) petSlotsEl.appendChild(div);
    });
  }

  // Owned lists
  function renderItemsOwned() {
    if (!itemsListEl) return;
    itemsListEl.innerHTML = '';
    itemsOwned.forEach(it => {
      const li = document.createElement('li');
      li.textContent = `${it.name} (${it.rarityName}) +${it.bonus}/sec`;
      li.style.color = it.color || 'white';
      itemsListEl.appendChild(li);
    });
  }

  function renderPetsOwned() {
    if (!petsListEl) return;
    petsListEl.innerHTML = '';
    petsOwned.forEach(p => {
      const li = document.createElement('li');
      li.textContent = `${p.rarityName} Pet (+${p.bonus}/sec)`;
      li.style.color = p.color || 'white';
      petsListEl.appendChild(li);
    });
  }

  // Tick / income
  let lastTick = Date.now();
  function tick() {
    const now = Date.now();
    if (now - lastTick >= tickInterval) {
      money += autoIncome * multiplier;
      lastTick = now;
      updateDisplay();
    }
  }
  setInterval(tick, 50);

  // Display updates
  function updateDisplay() {
    if (moneyEl) moneyEl.textContent = formatNumber(money);
    if (incomeEl) incomeEl.textContent = formatNumber(autoIncome * multiplier);
    if (tickIntervalDisplayEl) tickIntervalDisplayEl.textContent = (tickInterval / 1000).toFixed(2) + 's';
    if (tickBoostStatusEl) tickBoostStatusEl.textContent = tickInterval < 1000 ? 'Fast' : 'Normal';
    if (boostStatusEl) boostStatusEl.textContent = (boostActiveUntil && Date.now() < boostActiveUntil) ? 'Active' : 'None';
  }

  // Boosts
  let boostCooldown = 0;
  let boostTimer = 0;
  function updateBoostButtonsText() {
    const buyBoostBtn = document.getElementById('buyBoost');
    const buyTickBtn = document.getElementById('buyTickBoost');
    if (buyBoostBtn) buyBoostBtn.textContent = `Buy 2x Income Boost ($1000)${boostCooldown > 0 ? ' - cooldown: ' + boostCooldown + 's' : ''}`;
    if (buyTickBtn) buyTickBtn.textContent = `Buy Tick Boost ($${formatNumber(tickBoostCost)})`;
  }
  setInterval(() => {
    if (boostCooldown > 0) boostCooldown--;
    if (boostTimer > 0) boostTimer--;
    updateBoostButtonsText();
  }, 1000);

  document.getElementById('buyBoost')?.addEventListener('click', () => {
    if (boostCooldown > 0) return alert('Boost on cooldown');
    if (money < 1000) return alert('Insufficient funds');
    money -= 1000;
    multiplier *= 2;
    boostActiveUntil = Date.now() + 5 * 60 * 1000;
    boostCooldown = 15 * 60;
    boostTimer = 5 * 60;
    showNotification('2x Income Boost activated for 5 minutes!');
    updateDisplay();
  });

  document.getElementById('buyTickBoost')?.addEventListener('click', () => {
    if (money < tickBoostCost) return alert('Not enough money');
    money -= tickBoostCost;
    tickBoostCost += 1000000;
    tickInterval = Math.max(100, tickInterval - 100);
    showNotification('Tick speed boosted!');
    updateDisplay();
    updateBoostButtonsText();
  });

  // Admin
  document.getElementById('openAdmin')?.addEventListener('click', () => {
    const code = prompt('Enter admin password:');
    if (code === 'AllMyDiddys123$') {
      const adminArea = document.getElementById('adminArea');
      if (adminArea) adminArea.style.display = 'block';
    } else {
      alert('Wrong password');
    }
  });

  document.getElementById('runAdmin')?.addEventListener('click', () => {
    const input = document.getElementById('adminCmdInput');
    if (!input) return alert('No admin input element found');
    const parts = input.value.trim().split(/\s+/);
    if (!parts.length) return alert('Enter a command');
    const cmd = parts[0].toLowerCase();

    if (cmd === 'givemoney' || cmd === 'addmoney') {
      const amt = parseInt(parts[1], 10);
      if (isNaN(amt)) return alert('Invalid amount');
      money += amt;
      showNotification(`Added $${formatNumber(amt)}`);
      updateDisplay();
    } else if (cmd === 'forceitem') {
      const rarityName = parts[1];
      if (!rarityName) return alert('Specify rarity name');
      const r = rarities.find(x => x.name.toLowerCase() === rarityName.toLowerCase());
      if (!r) return alert('Invalid rarity');
      const name = itemNames[Math.floor(Math.random() * itemNames.length)];
      itemsOwned.push({ name, rarityName: r.name, bonus: r.bonus, color: r.color });
      autoIncome += r.bonus;
      renderItemsOwned();
      showNotification(`Forced give: ${r.name} ${name}`);
      updateDisplay();
    } else if (cmd === 'forceegg') {
      const rarityName = parts[1];
      if (!rarityName) return alert('Specify rarity name');
      const r = rarities.find(x => x.name.toLowerCase() === rarityName.toLowerCase());
      if (!r) return alert('Invalid rarity');
      petsOwned.push({ rarityName: r.name, bonus: r.bonus, color: r.color });
      autoIncome += r.bonus;
      renderPetsOwned();
      showNotification(`Forced egg hatched: ${r.name} Pet`);
      updateDisplay();
    } else {
      alert('Unknown command');
    }
  });

  // Report bug
  document.getElementById('reportBug')?.addEventListener('click', () => {
    const msg = prompt('Describe the bug:');
    if (!msg) return;
    const email = 'henrydale2813@student.lvusd.org';
    const subject = encodeURIComponent('Bug Report: Linear');
    const body = encodeURIComponent(msg + '\n\n---\nUser agent: ' + navigator.userAgent);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    showNotification('Opened mail client to report bug');
  });

  // Save / Load
  function saveGame() {
    const data = { money, autoIncome, multiplier, tickInterval, itemsOwned, petsOwned, currentItemSlots, currentPetSlots, boostActiveUntil };
    localStorage.setItem('linear_save', JSON.stringify(data));
    const lastSavedEl = document.getElementById('lastSaved');
    if (lastSavedEl) lastSavedEl.textContent = 'Saved at ' + new Date().toLocaleTimeString();
    showNotification('Game saved');
  }
  function loadGame() {
    const raw = localStorage.getItem('linear_save');
    if (!raw) return alert('No save found');
    try {
      const data = JSON.parse(raw);
      money = Number(data.money) || money;
      autoIncome = Number(data.autoIncome) || autoIncome;
      multiplier = Number(data.multiplier) || multiplier;
      tickInterval = Number(data.tickInterval) || tickInterval;
      itemsOwned = data.itemsOwned || [];
      petsOwned = data.petsOwned || [];
      currentItemSlots = data.currentItemSlots || [];
      currentPetSlots = data.currentPetSlots || [];
      boostActiveUntil = data.boostActiveUntil || null;
      renderItemsOwned();
      renderPetsOwned();
      renderShops();
      updateDisplay();
      showNotification('Game loaded');
    } catch (e) {
      alert('Failed to load save: ' + e.message);
    }
  }
  document.getElementById('saveBtn')?.addEventListener('click', saveGame);
  document.getElementById('loadBtn')?.addEventListener('click', loadGame);

  // Spotify button
  document.getElementById('playMusicBtn')?.addEventListener('click', () => {
    const player = document.getElementById('spotifyPlayer');
    if (player) player.style.display = 'block';
    showNotification('Scroll down and press Play in Spotify player!');
  });

  // Shop timers
  setInterval(() => {
    shopCountdown--;
    petShopCountdown--;
    if (itemTimerEl) itemTimerEl.textContent = Math.max(0, shopCountdown);
    if (petTimerEl) petTimerEl.textContent = Math.max(0, petShopCountdown);
    if (shopCountdown <= 0) {
      shopCountdown = 120;
      fillItemSlots();
      renderShops();
    }
    if (petShopCountdown <= 0) {
      petShopCountdown = 120;
      fillPetSlots();
      renderShops();
    }
  }, 1000);

  // Init
  fillItemSlots();
  fillPetSlots();
  renderShops();
  renderItemsOwned();
  renderPetsOwned();
  updateDisplay();
  updateBoostButtonsText();

  // Expose a small debug helper in console if needed
  window._linearDebug = {
    rarities,
    forceGiveRarity: (name) => {
      const r = rarities.find(rr => rr.name.toLowerCase().includes(name.toLowerCase()));
      if (!r) return null;
      petsOwned.push({ rarityName: r.name, bonus: r.bonus, color: r.color });
      autoIncome += r.bonus;
      renderPetsOwned();
      updateDisplay();
      return r;
    },
    state: () => ({ money, autoIncome, multiplier, tickInterval })
  };
})();
