// js/game.js
// LINEAR - Game + Supabase Cloud Saves

(() => {

  // =========================
  // GAME STATE
  // =========================

  let money = 10;
  let autoIncome = 0;
  let multiplier = 1;
  let tickInterval = 1000;

  let tickBoostCost = 1000000;
  let boostActiveUntil = null;

  let shopCountdown = 120;
  let petShopCountdown = 120;

  let boostCooldown = 0;
  let boostTimer = 0;

  // =========================
  // DATA
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
    { name: "Common", bonus: 1, cost: 10, color: "white", chance: 40 },
    { name: "Uncommon", bonus: 5, cost: 100, color: "lime", chance: 20 },
    { name: "Rare", bonus: 15, cost: 1000, color: "aqua", chance: 15 },
    { name: "Epic", bonus: 25, cost: 10000, color: "violet", chance: 10 },
    { name: "Legendary", bonus: 50, cost: 50000, color: "orange", chance: 5 },
    { name: "Mythic", bonus: 100, cost: 75000, color: "magenta", chance: 3 },
    { name: "Insane", bonus: 300, cost: 100000, color: "red", chance: 1 },
    { name: "Godly", bonus: 500, cost: 500000, color: "gold", chance: 0.4 },
    { name: "Crazy", bonus: 1000, cost: 1000000, color: "cyan", chance: 0.09 },

    // Easter egg
    {
      name: "If you see this tell Henry Dale",
      bonus: 1000000000,
      cost: 1,
      color: "magenta",
      chance: 0.01
    }
  ];

  // =========================
  // INVENTORY / SHOPS
  // =========================

  let itemsOwned = [];
  let petsOwned = [];

  let currentItemSlots = [];
  let currentPetSlots = [];

  // =========================
  // DOM
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
  // NOTIFICATIONS
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

  // =========================
  // NUMBER FORMAT
  // =========================

  function formatNumber(n) {

    if (typeof n !== "number") {
      return n;
    }

    if (!isFinite(n)) {
      return n.toString();
    }

    return Math.floor(n).toLocaleString();
  }

  // =========================
  // RARITY
  // =========================

  function getRandomRarity() {

    const total = rarities.reduce(
      (sum, rarity) => sum + rarity.chance,
      0
    );

    const roll = Math.random() * total;

    let sum = 0;

    for (const rarity of rarities) {

      sum += rarity.chance;

      if (roll <= sum) {
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

      const name =
        itemNames[
          Math.floor(Math.random() * itemNames.length)
        ];

      currentItemSlots.push({
        name: name,
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

    currentItemSlots.forEach(slot => {

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

      button.onclick = () => {

        if (slot.bought) return;

        if (money < slot.cost) {

          alert("Cannot buy: insufficient funds");

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

        saveGame(false);
      };

      div.appendChild(button);

      if (itemSlotsEl) {
        itemSlotsEl.appendChild(div);
      }
    });

    // PETS

    currentPetSlots.forEach(slot => {

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

      button.onclick = () => {

        if (slot.bought) return;

        if (money < slot.cost) {

          alert("Cannot hatch: insufficient funds");

          return;
        }

        money -= slot.cost;

        const rarity =
          rarities.find(
            r => r.name === slot.rarityName
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

        saveGame(false);
      };

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

    itemsOwned.forEach(item => {

      const li =
        document.createElement("li");

      li.textContent =
        `${item.name} (${item.rarityName}) +${item.bonus}/sec`;

      li.style.color =
        item.color || "white";

      itemsListEl.appendChild(li);
    });
  }

  // =========================
  // OWNED PETS
  // =========================

  function renderPetsOwned() {

    if (!petsListEl) return;

    petsListEl.innerHTML = "";

    petsOwned.forEach(pet => {

      const li =
        document.createElement("li");

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
        formatNumber(
          autoIncome * multiplier
        );
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

      boostStatusEl.textContent =
        boostActiveUntil &&
        Date.now() < boostActiveUntil
          ? "Active"
          : "None";
    }
  }

  // =========================
  // INCOME TICK
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
  // BOOST BUTTON TEXT
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

  // =========================
  // BOOST TIMER
  // =========================

  setInterval(() => {

    if (boostCooldown > 0) {
      boostCooldown--;
    }

    if (boostTimer > 0) {
      boostTimer--;
    }

    if (
      boostActiveUntil &&
      Date.now() >= boostActiveUntil
    ) {

      multiplier = 1;
      boostActiveUntil = null;
    }

    updateBoostButtonsText();
    updateDisplay();

  }, 1000);

  // =========================
  // 2X BOOST
  // =========================

  document
    .getElementById("buyBoost")
    ?.addEventListener("click", () => {

      if (boostCooldown > 0) {

        alert("Boost on cooldown");

        return;
      }

      if (money < 1000) {

        alert("Insufficient funds");

        return;
      }

      money -= 1000;

      multiplier = 2;

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

      saveGame(false);
    });

  // =========================
  // TICK BOOST
  // =========================

  document
    .getElementById("buyTickBoost")
    ?.addEventListener("click", () => {

      if (money < tickBoostCost) {

        alert("Not enough money");

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

      saveGame(false);
    });

  // =========================
  // ADMIN
  // =========================

  document
    .getElementById("openAdmin")
    ?.addEventListener("click", () => {

      const code =
        prompt("Enter admin password:");

      if (code === "AllMyDiddys123$") {

        const adminArea =
          document.getElementById("adminArea");

        if (adminArea) {
          adminArea.style.display = "block";
        }

      } else {

        alert("Wrong password");
      }
    });

  document
    .getElementById("runAdmin")
    ?.addEventListener("click", () => {

      const input =
        document.getElementById("adminCmdInput");

      if (!input) {

        alert(
          "No admin input element found"
        );

        return;
      }

      const parts =
        input.value.trim().split(/\s+/);

      if (!parts.length) {

        alert("Enter a command");

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

        if (isNaN(amount)) {

          alert("Invalid amount");

          return;
        }

        money += amount;

        showNotification(
          `Added $${formatNumber(amount)}`
        );

        updateDisplay();

        saveGame(false);
      }

      // FORCE ITEM

      else if (command === "forceitem") {

        const rarityName =
          parts[1];

        if (!rarityName) {

          alert(
            "Specify rarity name"
          );

          return;
        }

        const rarity =
          rarities.find(
            r =>
              r.name.toLowerCase() ===
              rarityName.toLowerCase()
          );

        if (!rarity) {

          alert("Invalid rarity");

          return;
        }

        const name =
          itemNames[
            Math.floor(
              Math.random() *
              itemNames.length
            )
          ];

        itemsOwned.push({
          name: name,
          rarityName: rarity.name,
          bonus: rarity.bonus,
          color: rarity.color
        });

        autoIncome += rarity.bonus;

        renderItemsOwned();

        showNotification(
          `Forced give: ${rarity.name} ${name}`
        );

        updateDisplay();

        saveGame(false);
      }

      // FORCE EGG

      else if (command === "forceegg") {

        const rarityName =
          parts[1];

        if (!rarityName) {

          alert(
            "Specify rarity name"
          );

          return;
        }

        const rarity =
          rarities.find(
            r =>
              r.name.toLowerCase() ===
              rarityName.toLowerCase()
          );

        if (!rarity) {

          alert("Invalid rarity");

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

        saveGame(false);

      } else {

        alert("Unknown command");
      }
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

      showNotification(
        "Opened mail client to report bug"
      );
    });

  // ============================================================
  // SUPABASE CLOUD SAVING
  // ============================================================

  async function getCurrentUser() {

    if (
      typeof supabaseClient ===
      "undefined"
    ) {

      console.error(
        "supabaseClient is not available."
      );

      return null;
    }

    const {
      data,
      error
    } =
      await supabaseClient.auth.getUser();

    if (error) {

      console.error(
        "Could not get current user:",
        error
      );

      return null;
    }

    return data.user;
  }

  // =========================
  // CREATE SAVE DATA
  // =========================

  function getSaveData() {

    return {

      money: money,

      autoIncome: autoIncome,

      multiplier: multiplier,

      tickInterval: tickInterval,

      tickBoostCost: tickBoostCost,

      boostActiveUntil: boostActiveUntil,

      boostCooldown: boostCooldown,

      boostTimer: boostTimer,

      shopCountdown: shopCountdown,

      petShopCountdown: petShopCountdown,

      itemsOwned: itemsOwned,

      petsOwned: petsOwned,

      currentItemSlots: currentItemSlots,

      currentPetSlots: currentPetSlots
    };
  }

  // =========================
  // SAVE TO SUPABASE
  // =========================

  async function saveGame(showMessage = true) {

    try {

      const user =
        await getCurrentUser();

      if (!user) {

        console.log(
          "No logged-in user. Cloud save skipped."
        );

        return;
      }

      const saveData =
        getSaveData();

      const {
        error
      } =
        await supabaseClient
          .from("players")
          .update({
            game_data: saveData
          })
          .eq("id", user.id);

      if (error) {

        console.error(
          "CLOUD SAVE ERROR:",
          error
        );

        if (showMessage) {

          showNotification(
            "Cloud save failed: " +
            error.message
          );
        }

        return;
      }

      console.log(
        "GAME SAVED TO SUPABASE"
      );

      const lastSavedEl =
        document.getElementById(
          "lastSaved"
        );

      if (lastSavedEl) {

        lastSavedEl.textContent =
          "Cloud saved at " +
          new Date().toLocaleTimeString();
      }

      if (showMessage) {

        showNotification(
          "Game saved to cloud!"
        );
      }

    } catch (error) {

      console.error(
        "SAVE ERROR:",
        error
      );
    }
  }

  // =========================
  // LOAD FROM SUPABASE
  // =========================

  async function loadGame(showMessage = true) {

    try {

      const user =
        await getCurrentUser();

      if (!user) {

        console.log(
          "No logged-in user."
        );

        return;
      }

      const {
        data,
        error
      } =
        await supabaseClient
          .from("players")
          .select("game_data")
          .eq("id", user.id)
          .single();

      if (error) {

        console.error(
          "CLOUD LOAD ERROR:",
          error
        );

        if (showMessage) {

          showNotification(
            "Cloud load failed: " +
            error.message
          );
        }

        return;
      }

      const save =
        data?.game_data;

      if (
        !save ||
        Object.keys(save).length === 0
      ) {

        console.log(
          "No cloud save exists yet."
        );

        return;
      }

      money =
        Number(save.money ?? money);

      autoIncome =
        Number(
          save.autoIncome ??
          autoIncome
        );

      multiplier =
        Number(
          save.multiplier ??
          multiplier
        );

      tickInterval =
        Number(
          save.tickInterval ??
          tickInterval
        );

      tickBoostCost =
        Number(
          save.tickBoostCost ??
          tickBoostCost
        );

      boostActiveUntil =
        save.boostActiveUntil ??
        null;

      boostCooldown =
        Number(
          save.boostCooldown ??
          0
        );

      boostTimer =
        Number(
          save.boostTimer ??
          0
        );

      shopCountdown =
        Number(
          save.shopCountdown ??
          120
        );

      petShopCountdown =
        Number(
          save.petShopCountdown ??
          120
        );

      itemsOwned =
        Array.isArray(save.itemsOwned)
          ? save.itemsOwned
          : [];

      petsOwned =
        Array.isArray(save.petsOwned)
          ? save.petsOwned
          : [];

      currentItemSlots =
        Array.isArray(
          save.currentItemSlots
        )
          ? save.currentItemSlots
          : [];

      currentPetSlots =
        Array.isArray(
          save.currentPetSlots
        )
          ? save.currentPetSlots
          : [];

      // If shops weren't saved yet
      if (
        currentItemSlots.length === 0
      ) {

        fillItemSlots();
      }

      if (
        currentPetSlots.length === 0
      ) {

        fillPetSlots();
      }

      renderItemsOwned();

      renderPetsOwned();

      renderShops();

      updateDisplay();

      updateBoostButtonsText();

      console.log(
        "GAME LOADED FROM SUPABASE"
      );

      if (showMessage) {

        showNotification(
          "Game loaded from cloud!"
        );
      }

    } catch (error) {

      console.error(
        "LOAD ERROR:",
        error
      );
    }
  }

  // =========================
  // SAVE BUTTON
  // =========================

  document
    .getElementById("saveBtn")
    ?.addEventListener(
      "click",
      () => saveGame(true)
    );

  // =========================
  // LOAD BUTTON
  // =========================

  document
    .getElementById("loadBtn")
    ?.addEventListener(
      "click",
      () => loadGame(true)
    );

  // =========================
  // AUTO SAVE
  // =========================

  setInterval(() => {

    saveGame(false);

  }, 10000);

  // =========================
  // SAVE WHEN LEAVING
  // =========================

  window.addEventListener(
    "beforeunload",
    () => {

      // Normal autosave handles most cases.
      // This is intentionally not awaited because
      // browsers can cancel normal async requests
      // during page unload.

      saveGame(false);
    }
  );

  // =========================
  // SPOTIFY
  // =========================

  document
    .getElementById("playMusicBtn")
    ?.addEventListener(
      "click",
      () => {

        const player =
          document.getElementById(
            "spotifyPlayer"
          );

        if (player) {

          player.style.display =
            "block";
        }

        showNotification(
          "Scroll down and press Play in Spotify player!"
        );
      }
    );

  // =========================
  // SHOP TIMERS
  // =========================

  setInterval(() => {

    shopCountdown--;
    petShopCountdown--;

    if (itemTimerEl) {

      itemTimerEl.textContent =
        Math.max(
          0,
          shopCountdown
        );
    }

    if (petTimerEl) {

      petTimerEl.textContent =
        Math.max(
          0,
          petShopCountdown
        );
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
  // INITIALIZE
  // =========================

  fillItemSlots();

  fillPetSlots();

  renderShops();

  renderItemsOwned();

  renderPetsOwned();

  updateDisplay();

  updateBoostButtonsText();

  // =========================
  // LOAD CLOUD SAVE
  // =========================

  // Wait a little so Supabase authentication
  // has time to restore the session.

  setTimeout(() => {

    loadGame(false);

  }, 1000);

  // =========================
  // DEBUG
  // =========================

  window._linearDebug = {

    rarities,

    forceGiveRarity: (name) => {

      const rarity =
        rarities.find(
          r =>
            r.name
              .toLowerCase()
              .includes(
                name.toLowerCase()
              )
        );

      if (!rarity) {
        return null;
      }

      petsOwned.push({
        rarityName: rarity.name,
        bonus: rarity.bonus,
        color: rarity.color
      });

      autoIncome += rarity.bonus;

      renderPetsOwned();

      updateDisplay();

      saveGame(false);

      return rarity;
    },

    state: () => ({
      money,
      autoIncome,
      multiplier,
      tickInterval,
      itemsOwned,
      petsOwned
    })
  };

  console.log(
    "LINEAR GAME.JS WITH CLOUD SAVES LOADED"
  );

})();
