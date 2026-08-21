// js/game.js
// Core game logic for Linear

(() => {
  "use strict";

  // =========================
  // GAME STATE
  // =========================

  let money = 10;
  let autoIncome = 0;
  let multiplier = 1;

  let tickInterval = 1000;
  let tickBoostCost = 1000000;

  let boostActiveUntil = null;
  let boostCooldown = 0;
  let boostTimer = 0;

  let shopCountdown = 120;
  let petShopCountdown = 120;

  // =========================
  // GAME DATA
  // =========================

  const itemNames = [
    "Sword",
    "Shield",
    "Helmet",
    "Armor",
    "Boots",
    "Amulet",
    "Ring"
  ];

  const rarities = [
    {
      name: "Common",
      bonus: 1,
      cost: 10,
      color: "white",
      chance: 40
    },
    {
      name: "Uncommon",
      bonus: 5,
      cost: 100,
      color: "lime",
      chance: 20
    },
    {
      name: "Rare",
      bonus: 15,
      cost: 1000,
      color: "aqua",
      chance: 15
    },
    {
      name: "Epic",
      bonus: 25,
      cost: 10000,
      color: "violet",
      chance: 10
    },
    {
      name: "Legendary",
      bonus: 50,
      cost: 50000,
      color: "orange",
      chance: 5
    },
    {
      name: "Mythic",
      bonus: 100,
      cost: 75000,
      color: "magenta",
      chance: 3
    },
    {
      name: "Insane",
      bonus: 300,
      cost: 100000,
      color: "red",
      chance: 1
    },
    {
      name: "Godly",
      bonus: 500,
      cost: 500000,
      color: "gold",
      chance: 0.4
    },
    {
      name: "Crazy",
      bonus: 1000,
      cost: 1000000,
      color: "cyan",
      chance: 0.09
    },

    // Easter egg
    {
      name: "If you see this tell Henry Dale",
      bonus: 1000000000,
      cost: 1,
      color: "magenta",
      chance: 0.01
    }
  ];

  let itemsOwned = [];
  let petsOwned = [];

  let currentItemSlots = [];
  let currentPetSlots = [];

  // =========================
  // DOM ELEMENTS
  // =========================

  const moneyEl = document.getElementById("money");
  const incomeEl = document.getElementById("income");

  const boostStatusEl =
    document.getElementById("boostStatus");

  const tickBoostStatusEl =
    document.getElementById("tickBoostStatus");

  const tickIntervalDisplayEl =
    document.getElementById("tickIntervalDisplay");

  const itemSlotsEl =
    document.getElementById("itemSlots");

  const petSlotsEl =
    document.getElementById("petSlots");

  const itemsListEl =
    document.getElementById("itemsList");

  const petsListEl =
    document.getElementById("petsList");

  const itemTimerEl =
    document.getElementById("itemTimer");

  const petTimerEl =
    document.getElementById("petTimer");

  const notificationsEl =
    document.getElementById("notifications");

  // =========================
  // UTILITIES
  // =========================

  function showNotification(text, ms = 3000) {
    if (!notificationsEl) return;

    const note = document.createElement("div");

    note.className = "notification";
    note.textContent = text;

    notificationsEl.appendChild(note);

    setTimeout(() => {
      note.remove();
    }, ms);
  }

  function formatNumber(number) {
    if (typeof number !== "number") {
      return number;
    }

    if (!Number.isFinite(number)) {
      return number.toString();
    }

    return Math.floor(number).toLocaleString();
  }

  // =========================
  // RANDOM RARITY
  // =========================

  function getRandomRarity() {
    const totalChance = rarities.reduce(
      (total, rarity) => total + rarity.chance,
      0
    );

    const roll = Math.random() * totalChance;

    let current = 0;

    for (const rarity of rarities) {
      current += rarity.chance;

      if (roll <= current) {
        return rarity;
      }
    }

    return rarities[0];
  }

  // =========================
  // SHOPS
  // =========================

  function fillItemSlots() {
    currentItemSlots = [];

    for (let i = 0; i < 4; i++) {
      const rarity = getRandomRarity();

      const itemName =
        itemNames[
          Math.floor(Math.random() * itemNames.length)
        ];

      currentItemSlots.push({
        name: itemName,
        rarityName: rarity.name,
        bonus: rarity.bonus,
        cost: rarity.cost,
        color: rarity.color,
        bought: false
      });
    }
  }

  function fillPetSlots() {
    currentPetSlots = [];

    for (let i = 0; i < 3; i++) {
      const rarity = getRandomRarity();

      currentPetSlots.push({
        rarityName: rarity.name,
        bonus: rarity.bonus,
        cost: rarity.cost,
        color: rarity.color,
        bought: false
      });
    }
  }

  function renderShops() {

    if (itemSlotsEl) {
      itemSlotsEl.innerHTML = "";
    }

    if (petSlotsEl) {
      petSlotsEl.innerHTML = "";
    }

    // ITEMS

    currentItemSlots.forEach((slot) => {

      const div = document.createElement("div");

      div.className = "slot";

      div.innerHTML =
        `<b style="color:${slot.color}">
          ${slot.rarityName} ${slot.name}
        </b>
        (+${slot.bonus}/sec)
        - $${formatNumber(slot.cost)}`;

      const button =
        document.createElement("button");

      button.textContent =
        slot.bought ? "Bought" : "Buy";

      button.disabled = slot.bought;

      button.addEventListener("click", () => {

        if (slot.bought) return;

        if (money < slot.cost) {
          alert("Cannot buy: insufficient funds.");
          return;
        }

        money -= slot.cost;

        autoIncome += slot.bonus;

        slot.bought = true;

        itemsOwned.push({
          name: slot.name,
          rarityName: slot.rarityName,
          bonus: slot.bonus,
          color: slot.color
        });

        renderItemsOwned();

        showNotification(
          `Bought ${slot.rarityName} ${slot.name}`
        );

        updateDisplay();
        renderShops();
      });

      div.appendChild(button);

      if (itemSlotsEl) {
        itemSlotsEl.appendChild(div);
      }
    });

    // PETS

    currentPetSlots.forEach((slot) => {

      const div = document.createElement("div");

      div.className = "slot";

      div.innerHTML =
        `<b style="color:${slot.color}">
          ${slot.rarityName} Egg
        </b>
        - $${formatNumber(slot.cost)}`;

      const button =
        document.createElement("button");

      button.textContent =
        slot.bought ? "Hatched" : "Hatch";

      button.disabled = slot.bought;

      button.addEventListener("click", () => {

        if (slot.bought) return;

        if (money < slot.cost) {
          alert("Cannot hatch: insufficient funds.");
          return;
        }

        money -= slot.cost;

        const rarity =
          rarities.find(
            (r) => r.name === slot.rarityName
          ) || rarities[0];

        const pet = {
          rarityName: rarity.name,
          bonus: rarity.bonus,
          color: rarity.color
        };

        petsOwned.push(pet);

        autoIncome += pet.bonus;

        slot.bought = true;

        renderPetsOwned();

        showNotification(
          `Hatched a ${pet.rarityName} Pet (+${pet.bonus}/sec)`
        );

        updateDisplay();
        renderShops();
      });

      div.appendChild(button);

      if (petSlotsEl) {
        petSlotsEl.appendChild(div);
      }
    });
  }

  // =========================
  // OWNED ITEMS
  // =========================

  function renderItemsOwned() {

    if (!itemsListEl) return;

    itemsListEl.innerHTML = "";

    itemsOwned.forEach((item) => {

      const li = document.createElement("li");

      li.textContent =
        `${item.name} (${item.rarityName}) +${item.bonus}/sec`;

      li.style.color =
        item.color || "white";

      itemsListEl.appendChild(li);
    });
  }

  function renderPetsOwned() {

    if (!petsListEl) return;

    petsListEl.innerHTML = "";

    petsOwned.forEach((pet) => {

      const li = document.createElement("li");

      li.textContent =
        `${pet.rarityName} Pet (+${pet.bonus}/sec)`;

      li.style.color =
        pet.color || "white";

      petsListEl.appendChild(li);
    });
  }

  // =========================
  // DISPLAY
  // =========================

  function updateDisplay() {

    if (moneyEl) {
      moneyEl.textContent =
        formatNumber(money);
    }

    if (incomeEl) {
      incomeEl.textContent =
        formatNumber(autoIncome * multiplier);
    }

    if (tickIntervalDisplayEl) {
      tickIntervalDisplayEl.textContent =
        (tickInterval / 1000).toFixed(2) + "s";
    }

    if (tickBoostStatusEl) {
      tickBoostStatusEl.textContent =
        tickInterval < 1000
          ? "Fast"
          : "Normal";
    }

    if (boostStatusEl) {

      if (
        boostActiveUntil &&
        Date.now() < boostActiveUntil
      ) {
        boostStatusEl.textContent = "Active";
      } else {
        boostStatusEl.textContent = "None";
      }
    }
  }

  // =========================
  // INCOME
  // =========================

  let lastTick = Date.now();

  function tick() {

    const now = Date.now();

    if (now - lastTick >= tickInterval) {

      money +=
        autoIncome * multiplier;

      lastTick = now;

      updateDisplay();
    }
  }

  setInterval(tick, 50);

  // =========================
  // BOOST BUTTONS
  // =========================

  function updateBoostButtonsText() {

    const buyBoostBtn =
      document.getElementById("buyBoost");

    const buyTickBtn =
      document.getElementById("buyTickBoost");

    if (buyBoostBtn) {

      buyBoostBtn.textContent =
        `Buy 2x Income Boost ($1000)` +
        (
          boostCooldown > 0
            ? ` - cooldown: ${boostCooldown}s`
            : ""
        );
    }

    if (buyTickBtn) {

      buyTickBtn.textContent =
        `Buy Tick Boost ($${formatNumber(tickBoostCost)})`;
    }
  }

  // BOOST

  document
    .getElementById("buyBoost")
    ?.addEventListener("click", () => {

      if (boostCooldown > 0) {
        alert("Boost on cooldown.");
        return;
      }

      if (money < 1000) {
        alert("Insufficient funds.");
        return;
      }

      money -= 1000;

      multiplier *= 2;

      boostActiveUntil =
        Date.now() + 5 * 60 * 1000;

      boostCooldown =
        15 * 60;

      boostTimer =
        5 * 60;

      showNotification(
        "2x Income Boost activated for 5 minutes!"
      );

      updateDisplay();
    });

  // TICK BOOST

  document
    .getElementById("buyTickBoost")
    ?.addEventListener("click", () => {

      if (money < tickBoostCost) {
        alert("Not enough money.");
        return;
      }

      money -= tickBoostCost;

      tickBoostCost += 1000000;

      tickInterval =
        Math.max(
          100,
          tickInterval - 100
        );

      showNotification(
        "Tick speed boosted!"
      );

      updateDisplay();
      updateBoostButtonsText();
    });

  // BOOST TIMER

  setInterval(() => {

    if (boostCooldown > 0) {
      boostCooldown--;
    }

    if (boostTimer > 0) {
      boostTimer--;
    }

    // Turn multiplier back to normal after 5 minutes.
    if (
      boostActiveUntil &&
      Date.now() >= boostActiveUntil
    ) {

      if (multiplier > 1) {
        multiplier = 1;
      }

      boostActiveUntil = null;
      boostTimer = 0;

      showNotification(
        "2x Income Boost ended."
      );

      updateDisplay();
    }

    updateBoostButtonsText();

  }, 1000);

  // =========================
  // ADMIN
  // =========================

  document
    .getElementById("openAdmin")
    ?.addEventListener("click", () => {

      const password =
        prompt("Enter admin password:");

      if (password === "AllMyDiddys123$") {

        const adminArea =
          document.getElementById("adminArea");

        if (adminArea) {
          adminArea.style.display = "block";
        }

      } else {

        alert("Wrong password.");
      }
    });

  document
    .getElementById("runAdmin")
    ?.addEventListener("click", () => {

      const input =
        document.getElementById("adminCmdInput");

      if (!input) return;

      const parts =
        input.value.trim().split(/\s+/);

      if (!parts[0]) {
        alert("Enter a command.");
        return;
      }

      const command =
        parts[0].toLowerCase();

      // GIVE MONEY

      if (
        command === "givemoney" ||
        command === "addmoney"
      ) {

        const amount =
          parseInt(parts[1], 10);

        if (Number.isNaN(amount)) {
          alert("Invalid amount.");
          return;
        }

        money += amount;

        showNotification(
          `Added $${formatNumber(amount)}`
        );

        updateDisplay();

        return;
      }

      // FORCE ITEM

      if (command === "forceitem") {

        const rarityName = parts[1];

        if (!rarityName) {
          alert("Specify a rarity.");
          return;
        }

        const rarity =
          rarities.find(
            (r) =>
              r.name.toLowerCase() ===
              rarityName.toLowerCase()
          );

        if (!rarity) {
          alert("Invalid rarity.");
          return;
        }

        const itemName =
          itemNames[
            Math.floor(
              Math.random() * itemNames.length
            )
          ];

        itemsOwned.push({
          name: itemName,
          rarityName: rarity.name,
          bonus: rarity.bonus,
          color: rarity.color
        });

        autoIncome += rarity.bonus;

        renderItemsOwned();

        showNotification(
          `Forced give: ${rarity.name} ${itemName}`
        );

        updateDisplay();

        return;
      }

      // FORCE PET

      if (command === "forceegg") {

        const rarityName = parts[1];

        if (!rarityName) {
          alert("Specify a rarity.");
          return;
        }

        const rarity =
          rarities.find(
            (r) =>
              r.name.toLowerCase() ===
              rarityName.toLowerCase()
          );

        if (!rarity) {
          alert("Invalid rarity.");
          return;
        }

        petsOwned.push({
          rarityName: rarity.name,
          bonus: rarity.bonus,
          color: rarity.color
        });

        autoIncome += rarity.bonus;

        renderPetsOwned();

        showNotification(
          `Forced egg hatched: ${rarity.name} Pet`
        );

        updateDisplay();

        return;
      }

      alert("Unknown command.");
    });

  // =========================
  // REPORT BUG
  // =========================

  document
    .getElementById("reportBug")
    ?.addEventListener("click", () => {

      const message =
        prompt("Describe the bug:");

      if (!message) return;

      const email =
        "henrydale2813@student.lvusd.org";

      const subject =
        encodeURIComponent(
          "Bug Report: Linear"
        );

      const body =
        encodeURIComponent(
          message +
          "\n\n---\nUser agent: " +
          navigator.userAgent
        );

      window.location.href =
        `mailto:${email}?subject=${subject}&body=${body}`;
    });

  // =========================
  // SAVE
  // =========================

  function saveGame() {

    const data = {
      money,
      autoIncome,
      multiplier,
      tickInterval,
      tickBoostCost,
      itemsOwned,
      petsOwned,
      currentItemSlots,
      currentPetSlots,
      boostActiveUntil
    };

    localStorage.setItem(
      "linear_save",
      JSON.stringify(data)
    );

    const lastSaved =
      document.getElementById("lastSaved");

    if (lastSaved) {

      lastSaved.textContent =
        "Saved at " +
        new Date().toLocaleTimeString();
    }

    showNotification("Game saved.");
  }

  // =========================
  // LOAD
  // =========================

  function loadGame() {

    const raw =
      localStorage.getItem("linear_save");

    if (!raw) {
      alert("No save found.");
      return;
    }

    try {

      const data =
        JSON.parse(raw);

      money =
        Number(data.money) || money;

      autoIncome =
        Number(data.autoIncome) || autoIncome;

      multiplier =
        Number(data.multiplier) || multiplier;

      tickInterval =
        Number(data.tickInterval) || tickInterval;

      tickBoostCost =
        Number(data.tickBoostCost) || tickBoostCost;

      itemsOwned =
        Array.isArray(data.itemsOwned)
          ? data.itemsOwned
          : [];

      petsOwned =
        Array.isArray(data.petsOwned)
          ? data.petsOwned
          : [];

      currentItemSlots =
        Array.isArray(data.currentItemSlots)
          ? data.currentItemSlots
          : [];

      currentPetSlots =
        Array.isArray(data.currentPetSlots)
          ? data.currentPetSlots
          : [];

      boostActiveUntil =
        data.boostActiveUntil || null;

      renderItemsOwned();
      renderPetsOwned();
      renderShops();
      updateDisplay();
      updateBoostButtonsText();

      showNotification(
        "Game loaded."
      );

    } catch (error) {

      alert(
        "Failed to load save: " +
        error.message
      );
    }
  }

  document
    .getElementById("saveBtn")
    ?.addEventListener(
      "click",
      saveGame
    );

  document
    .getElementById("loadBtn")
    ?.addEventListener(
      "click",
      loadGame
    );

  // =========================
  // MUSIC
  // =========================

  document
    .getElementById("playMusicBtn")
    ?.addEventListener("click", () => {

      const player =
        document.getElementById(
          "spotifyPlayer"
        );

      if (player) {
        player.style.display = "block";
      }

      showNotification(
        "Scroll down and press Play in Spotify!"
      );
    });

  // =========================
  // SHOP TIMERS
  // =========================

  setInterval(() => {

    shopCountdown--;
    petShopCountdown--;

    if (itemTimerEl) {
      itemTimerEl.textContent =
        Math.max(0, shopCountdown);
    }

    if (petTimerEl) {
      petTimerEl.textContent =
        Math.max(0, petShopCountdown);
    }

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

  // =========================
  // START GAME
  // =========================

  fillItemSlots();
  fillPetSlots();

  renderShops();
  renderItemsOwned();
  renderPetsOwned();

  updateDisplay();
  updateBoostButtonsText();

  console.log("LINEAR GAME FILE LOADED");

})();
