console.log("PLAYERS.JS V5 - TRADING SYSTEM LOADED");


// ============================================================
// ELEMENTS
// ============================================================

const playersBtn =
  document.getElementById("playersBtn");

const playersPanel =
  document.getElementById("playersPanel");

const playersList =
  document.getElementById("playersList");

const refreshPlayersBtn =
  document.getElementById("refreshPlayersBtn");


// ============================================================
// GLOBAL TRADE STATE
// ============================================================

let activeTrade = null;

let tradePollingStarted = false;

let seenTradeRequests =
  new Set();


// ============================================================
// GET CURRENT USER
// ============================================================

async function getTradeUser() {

  const result =
    await supabaseClient.auth.getUser();

  if (result.error) {

    console.error(
      "USER ERROR:",
      result.error
    );

    return null;
  }

  return result.data.user;
}


// ============================================================
// LOAD PLAYERS
// ============================================================

async function loadPlayers() {

  if (!playersList) return;

  playersList.textContent =
    "Loading players...";

  const user =
    await getTradeUser();

  if (!user) {

    playersList.textContent =
      "Not logged in.";

    return;
  }

  const result =
    await supabaseClient
      .from("players")
      .select("id, username, last_seen")
      .order("last_seen", {
        ascending: false
      });

  if (result.error) {

    console.error(
      "PLAYERS ERROR:",
      result.error
    );

    playersList.textContent =
      "ERROR: " +
      result.error.message;

    return;
  }

  playersList.innerHTML = "";

  const others =
    result.data.filter(
      player =>
        player.id !== user.id
    );

  if (others.length === 0) {

    playersList.textContent =
      "No other players.";

    return;
  }

  const now =
    Date.now();

  others.forEach(player => {

    const card =
      document.createElement("div");

    card.style.cssText = `
      background:#222;
      border:2px solid #fff;
      padding:12px;
      margin:10px 0;
    `;

    const lastSeen =
      player.last_seen
        ? new Date(
            player.last_seen
          ).getTime()
        : 0;

    const online =
      lastSeen > 0 &&
      now - lastSeen < 300000;

    const name =
      document.createElement("strong");

    name.textContent =
      (online ? "🟢 " : "⚫ ") +
      (player.username || "Unknown");

    card.appendChild(name);

    const status =
      document.createElement("span");

    status.textContent =
      online
        ? " ONLINE"
        : " OFFLINE";

    card.appendChild(status);

    const trade =
      document.createElement("button");

    trade.textContent =
      "TRADE";

    trade.style.marginLeft =
      "15px";

    trade.disabled =
      !online;

    trade.addEventListener(
      "click",
      () => {

        sendTradeRequest(
          player.id,
          player.username
        );

      }
    );

    card.appendChild(trade);

    playersList.appendChild(card);

  });

}


// ============================================================
// SEND TRADE REQUEST
// ============================================================

async function sendTradeRequest(
  receiverId,
  receiverName
) {

  const user =
    await getTradeUser();

  if (!user) return;

  if (user.id === receiverId) {

    alert(
      "You cannot trade with yourself."
    );

    return;
  }

  if (activeTrade) {

    alert(
      "You are already in a trade."
    );

    return;
  }

  const existing =
    await supabaseClient
      .from("trade_requests")
      .select("id")
      .eq("sender_id", user.id)
      .eq("receiver_id", receiverId)
      .eq("status", "pending")
      .maybeSingle();

  if (existing.data) {

    alert(
      "You already sent a trade request to this player."
    );

    return;
  }

  const result =
    await supabaseClient
      .from("trade_requests")
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        status: "pending"
      })
      .select()
      .single();

  if (result.error) {

    console.error(
      "TRADE SEND ERROR:",
      result.error
    );

    alert(
      "Trade failed: " +
      result.error.message
    );

    return;
  }

  alert(
    "Trade request sent to " +
    receiverName +
    "!"
  );

  watchTradeRequest(
    result.data.id,
    receiverId,
    receiverName
  );
}


// ============================================================
// WATCH OUTGOING REQUEST
// ============================================================

function watchTradeRequest(
  requestId,
  receiverId,
  receiverName
) {

  const interval =
    setInterval(
      async () => {

        const result =
          await supabaseClient
            .from("trade_requests")
            .select(
              "id, sender_id, receiver_id, status"
            )
            .eq(
              "id",
              requestId
            )
            .maybeSingle();

        if (result.error) {

          console.error(
            "REQUEST WATCH ERROR:",
            result.error
          );

          return;
        }

        if (!result.data) {

          clearInterval(interval);

          return;
        }

        const status =
          result.data.status;

        if (
          status === "accepted"
        ) {

          clearInterval(interval);

          await createTradeSession(
            requestId,
            result.data.sender_id,
            result.data.receiver_id
          );

          return;
        }

        if (
          status === "declined"
        ) {

          clearInterval(interval);

          alert(
            receiverName +
            " declined the trade."
          );

          return;
        }

      },
      2000
    );

  setTimeout(
    () => clearInterval(interval),
    120000
  );
}


// ============================================================
// CHECK INCOMING REQUESTS
// ============================================================

async function checkTradeRequests() {

  const user =
    await getTradeUser();

  if (!user) return;

  const result =
    await supabaseClient
      .from("trade_requests")
      .select(
        "id, sender_id, receiver_id, created_at"
      )
      .eq(
        "receiver_id",
        user.id
      )
      .eq(
        "status",
        "pending"
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );

  if (result.error) {

    console.error(
      "TRADE REQUEST ERROR:",
      result.error
    );

    return;
  }

  if (
    !result.data ||
    result.data.length === 0
  ) {

    return;
  }

  for (
    const request of result.data
  ) {

    if (
      seenTradeRequests.has(
        request.id
      )
    ) {

      continue;

    }

    seenTradeRequests.add(
      request.id
    );

    const senderResult =
      await supabaseClient
        .from("players")
        .select("username")
        .eq(
          "id",
          request.sender_id
        )
        .maybeSingle();

    const senderName =
      senderResult.data?.username ||
      "A player";

    const accepted =
      confirm(
        senderName +
        " wants to trade with you!\n\n" +
        "OK = Accept\n" +
        "Cancel = Decline"
      );

    const newStatus =
      accepted
        ? "accepted"
        : "declined";

    const updateResult =
      await supabaseClient
        .from("trade_requests")
        .update({
          status: newStatus
        })
        .eq(
          "id",
          request.id
        );

    if (updateResult.error) {

      console.error(
        "TRADE RESPONSE ERROR:",
        updateResult.error
      );

      continue;
    }

    if (accepted) {

      await createTradeSession(
        request.id,
        request.sender_id,
        request.receiver_id
      );

    }

  }

}


// ============================================================
// CREATE TRADE SESSION
// ============================================================

async function createTradeSession(
  requestId,
  player1Id,
  player2Id
) {

  if (activeTrade) return;

  const existing =
    await supabaseClient
      .from("trade_sessions")
      .select("*")
      .eq(
        "request_id",
        requestId
      )
      .maybeSingle();

  if (existing.data) {

    openTradeWindow(
      existing.data
    );

    return;
  }

  const insertResult =
    await supabaseClient
      .from("trade_sessions")
      .insert({

        request_id:
          requestId,

        player1_id:
          player1Id,

        player2_id:
          player2Id,

        player1_money:
          0,

        player2_money:
          0,

        player1_items:
          [],

        player2_items:
          [],

        player1_pets:
          [],

        player2_pets:
          [],

        player1_ready:
          false,

        player2_ready:
          false,

        status:
          "open"

      })
      .select()
      .single();

  if (insertResult.error) {

    console.error(
      "TRADE SESSION CREATE ERROR:",
      insertResult.error
    );

    return;
  }

  openTradeWindow(
    insertResult.data
  );
}


// ============================================================
// FIND ACTIVE TRADE
// ============================================================

async function findActiveTrade() {

  const user =
    await getTradeUser();

  if (!user) return null;

  const result =
    await supabaseClient
      .from("trade_sessions")
      .select("*")
      .or(
        `player1_id.eq.${user.id},player2_id.eq.${user.id}`
      )
      .in(
        "status",
        [
          "open",
          "completed"
        ]
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      )
      .limit(1)
      .maybeSingle();

  if (result.error) {

    console.error(
      "ACTIVE TRADE ERROR:",
      result.error
    );

    return null;
  }

  return result.data;
}


// ============================================================
// CREATE TRADE UI
// ============================================================

function createTradeWindow() {

  let existing =
    document.getElementById(
      "linearTradeWindow"
    );

  if (existing) {

    existing.remove();

  }

  const overlay =
    document.createElement("div");

  overlay.id =
    "linearTradeWindow";

  overlay.style.cssText = `
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.85);
    z-index:99999;
    display:flex;
    align-items:center;
    justify-content:center;
    font-family:Arial,sans-serif;
  `;

  overlay.innerHTML = `

    <div style="
      width:min(900px,95vw);
      max-height:90vh;
      overflow:auto;
      background:#111;
      border:3px solid white;
      padding:20px;
      color:white;
      box-sizing:border-box;
    ">

      <h2 id="tradeTitle"
          style="text-align:center;">
        TRADE
      </h2>

      <div id="tradeStatus"
           style="
             text-align:center;
             margin-bottom:15px;
             font-weight:bold;
           ">
      </div>

      <div style="
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:15px;
      ">

        <div id="myTradeSide"
             style="
               border:2px solid white;
               padding:15px;
             ">
        </div>

        <div id="theirTradeSide"
             style="
               border:2px solid white;
               padding:15px;
             ">
        </div>

      </div>

      <div style="
        text-align:center;
        margin-top:20px;
      ">

        <button id="tradeReadyBtn"
                style="
                  font-size:18px;
                  padding:12px 30px;
                  cursor:pointer;
                ">
          READY
        </button>

        <button id="tradeCancelBtn"
                style="
                  font-size:18px;
                  padding:12px 30px;
                  margin-left:10px;
                  cursor:pointer;
                ">
          CANCEL
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(
    overlay
  );

  document
    .getElementById(
      "tradeCancelBtn"
    )
    .onclick =
    cancelTrade;

  document
    .getElementById(
      "tradeReadyBtn"
    )
    .onclick =
    toggleTradeReady;

  return overlay;
}


// ============================================================
// OPEN TRADE WINDOW
// ============================================================

async function openTradeWindow(
  trade
) {

  activeTrade =
    trade;

  createTradeWindow();

  await refreshTradeWindow();

  if (!tradePollingStarted) {

    tradePollingStarted = true;

    pollActiveTrade();

  }

}


// ============================================================
// REFRESH TRADE WINDOW
// ============================================================

async function refreshTradeWindow() {

  if (!activeTrade) return;

  const user =
    await getTradeUser();

  if (!user) return;

  const result =
    await supabaseClient
      .from("trade_sessions")
      .select("*")
      .eq(
        "id",
        activeTrade.id
      )
      .single();

  if (result.error) {

    console.error(
      "TRADE LOAD ERROR:",
      result.error
    );

    return;
  }

  activeTrade =
    result.data;

  const meIsPlayer1 =
    user.id ===
    activeTrade.player1_id;

  const myMoney =
    meIsPlayer1
      ? activeTrade.player1_money
      : activeTrade.player2_money;

  const theirMoney =
    meIsPlayer1
      ? activeTrade.player2_money
      : activeTrade.player1_money;

  const myItems =
    meIsPlayer1
      ? activeTrade.player1_items
      : activeTrade.player2_items;

  const theirItems =
    meIsPlayer1
      ? activeTrade.player2_items
      : activeTrade.player1_items;

  const myPets =
    meIsPlayer1
      ? activeTrade.player1_pets
      : activeTrade.player2_pets;

  const theirPets =
    meIsPlayer1
      ? activeTrade.player2_pets
      : activeTrade.player1_pets;

  const myReady =
    meIsPlayer1
      ? activeTrade.player1_ready
      : activeTrade.player2_ready;

  const theirReady =
    meIsPlayer1
      ? activeTrade.player2_ready
      : activeTrade.player1_ready;

  const title =
    document.getElementById(
      "tradeTitle"
    );

  const status =
    document.getElementById(
      "tradeStatus"
    );

  const mySide =
    document.getElementById(
      "myTradeSide"
    );

  const theirSide =
    document.getElementById(
      "theirTradeSide"
    );

  const readyButton =
    document.getElementById(
      "tradeReadyBtn"
    );

  if (title) {

    const otherId =
      meIsPlayer1
        ? activeTrade.player2_id
        : activeTrade.player1_id;

    const other =
      await supabaseClient
        .from("players")
        .select("username")
        .eq("id", otherId)
        .maybeSingle();

    title.textContent =
      "TRADE WITH " +
      (
        other.data?.username ||
        "PLAYER"
      ).toUpperCase();

  }

  if (status) {

    status.textContent =
      myReady && theirReady
        ? "Completing trade..."
        : myReady
          ? "YOU ARE READY — WAITING FOR THEM"
          : theirReady
            ? "THEY ARE READY — YOUR TURN"
            : "Choose what you want to trade.";

  }

  if (readyButton) {

    readyButton.textContent =
      myReady
        ? "UNREADY"
        : "READY";

    readyButton.disabled =
      activeTrade.status !== "open";

  }

  if (mySide) {

    mySide.innerHTML =
      "<h3>YOU</h3>" +

      renderTradeMoney(
        myMoney
      ) +

      "<h4>ITEMS</h4>" +

      renderTradeArray(
        myItems,
        "item"
      ) +

      "<h4>PETS</h4>" +

      renderTradeArray(
        myPets,
        "pet"
      );

  }

  if (theirSide) {

    theirSide.innerHTML =
      "<h3>THEM</h3>" +

      "<b>Money:</b> $" +
      formatTradeNumber(
        theirMoney
      ) +

      "<h4>ITEMS</h4>" +

      renderTradeArray(
        theirItems,
        "item"
      ) +

      "<h4>PETS</h4>" +

      renderTradeArray(
        theirPets,
        "pet"
      );

  }

}


// ============================================================
// TRADE MONEY DISPLAY
// ============================================================

function renderTradeMoney(
  money
) {

  return `
    <div>
      <b>Money offered:</b>
      $${formatTradeNumber(money)}
    </div>
  `;

}


// ============================================================
// TRADE ARRAY DISPLAY
// ============================================================

function renderTradeArray(
  array,
  type
) {

  if (
    !Array.isArray(array) ||
    array.length === 0
  ) {

    return "<div>None</div>";

  }

  return array
    .map(
      object => {

        if (type === "item") {

          return `
            <div>
              ${object.rarityName || ""} 
              ${object.name || "Item"}
              (+${object.bonus || 0}/sec)
            </div>
          `;

        }

        return `
          <div>
            ${object.rarityName || "Pet"}
            Pet (+${object.bonus || 0}/sec)
          </div>
        `;

      }
    )
    .join("");

}


// ============================================================
// NUMBER FORMAT
// ============================================================

function formatTradeNumber(
  number
) {

  const value =
    Number(number || 0);

  if (!Number.isFinite(value)) {
    return "0";
  }

  return Math.floor(value)
    .toLocaleString();

}


// ============================================================
// GET PLAYER GAME DATA
// ============================================================

async function getPlayerGameData(
  playerId
) {

  const result =
    await supabaseClient
      .from("players")
      .select("game_data")
      .eq(
        "id",
        playerId
      )
      .single();

  if (result.error) {

    throw result.error;

  }

  return result.data?.game_data || {};

}


// ============================================================
// UPDATE TRADE OFFER
// ============================================================

async function updateMyTradeOffer(
  money,
  items,
  pets
) {

  if (!activeTrade) return;

  const user =
    await getTradeUser();

  if (!user) return;

  const meIsPlayer1 =
    user.id ===
    activeTrade.player1_id;

  const update =
    meIsPlayer1
      ? {
          player1_money:
            Math.max(
              0,
              Number(money)
            ),

          player1_items:
            items,

          player1_pets:
            pets,

          player1_ready:
            false
        }

      : {
          player2_money:
            Math.max(
              0,
              Number(money)
            ),

          player2_items:
            items,

          player2_pets:
            pets,

          player2_ready:
            false
        };

  const result =
    await supabaseClient
      .from("trade_sessions")
      .update(update)
      .eq(
        "id",
        activeTrade.id
      )
      .eq(
        "status",
        "open"
      );

  if (result.error) {

    console.error(
      "TRADE OFFER ERROR:",
      result.error
    );

    alert(
      "Could not update trade offer."
    );

    return;
  }

  await refreshTradeWindow();

}


// ============================================================
// TRADE OFFER BUTTONS
// ============================================================

async function chooseTradeOffer() {

  if (!activeTrade) return;

  const user =
    await getTradeUser();

  if (!user) return;

  const gameData =
    await getPlayerGameData(
      user.id
    );

  const money =
    Number(
      gameData.money || 0
    );

  const items =
    Array.isArray(
      gameData.itemsOwned
    )
      ? gameData.itemsOwned
      : [];

  const pets =
    Array.isArray(
      gameData.petsOwned
    )
      ? gameData.petsOwned
      : [];

  const moneyInput =
    prompt(
      "How much money do you want to offer?\n\n" +
      "You have: $" +
      formatTradeNumber(money)
    );

  if (moneyInput === null) return;

  const offeredMoney =
    Number(
      moneyInput
    );

  if (
    !Number.isFinite(
      offeredMoney
    ) ||
    offeredMoney < 0 ||
    offeredMoney > money
  ) {

    alert(
      "Invalid money amount."
    );

    return;
  }

  const itemText =
    items.length
      ? items
          .map(
            (item, index) =>
              `${index + 1}. ${item.rarityName} ${item.name}`
          )
          .join("\n")
      : "No items.";

  const itemInput =
    prompt(
      "Enter item numbers to trade, separated by commas.\n\n" +
      itemText
    );

  if (itemInput === null) return;

  const itemIndexes =
    parseTradeIndexes(
      itemInput,
      items.length
    );

  const selectedItems =
    itemIndexes.map(
      index =>
        items[index]
    );

  const petText =
    pets.length
      ? pets
          .map(
            (pet, index) =>
              `${index + 1}. ${pet.rarityName} Pet`
          )
          .join("\n")
      : "No pets.";

  const petInput =
    prompt(
      "Enter pet numbers to trade, separated by commas.\n\n" +
      petText
    );

  if (petInput === null) return;

  const petIndexes =
    parseTradeIndexes(
      petInput,
      pets.length
    );

  const selectedPets =
    petIndexes.map(
      index =>
        pets[index]
    );

  await updateMyTradeOffer(
    offeredMoney,
    selectedItems,
    selectedPets
  );

}


// ============================================================
// PARSE INDEXES
// ============================================================

function parseTradeIndexes(
  text,
  max
) {

  if (
    !text ||
    !text.trim()
  ) {

    return [];

  }

  const result = [];

  text
    .split(",")
    .forEach(
      part => {

        const number =
          parseInt(
            part.trim(),
            10
          );

        const index =
          number - 1;

        if (
          Number.isInteger(index) &&
          index >= 0 &&
          index < max &&
          !result.includes(index)
        ) {

          result.push(index);

        }

      }
    );

  return result;

}


// ============================================================
// READY
// ============================================================

async function toggleTradeReady() {

  if (!activeTrade) return;

  const user =
    await getTradeUser();

  if (!user) return;

  const meIsPlayer1 =
    user.id ===
    activeTrade.player1_id;

  const currentReady =
    meIsPlayer1
      ? activeTrade.player1_ready
      : activeTrade.player2_ready;

  const update =
    meIsPlayer1
      ? {
          player1_ready:
            !currentReady
        }
      : {
          player2_ready:
            !currentReady
        };

  const result =
    await supabaseClient
      .from("trade_sessions")
      .update(update)
      .eq(
        "id",
        activeTrade.id
      )
      .eq(
        "status",
        "open"
      );

  if (result.error) {

    console.error(
      "READY ERROR:",
      result.error
    );

    return;
  }

  await refreshTradeWindow();

}


// ============================================================
// TRADE POLLING
// ============================================================

async function pollActiveTrade() {

  while (activeTrade) {

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          1500
        )
    );

    if (!activeTrade) break;

    const result =
      await supabaseClient
        .from("trade_sessions")
        .select("*")
        .eq(
          "id",
          activeTrade.id
        )
        .maybeSingle();

    if (result.error) {

      console.error(
        "TRADE POLLING ERROR:",
        result.error
      );

      continue;
    }

    if (!result.data) {

      closeTradeWindow();

      break;
    }

    activeTrade =
      result.data;

    if (
      activeTrade.status ===
      "completed"
    ) {

      await completeTrade();

      break;
    }

    if (
      activeTrade.status ===
      "cancelled"
    ) {

      alert(
        "Trade cancelled."
      );

      closeTradeWindow();

      break;
    }

    await refreshTradeWindow();

    if (
      activeTrade.player1_ready &&
      activeTrade.player2_ready
    ) {

      await completeTrade();

      break;
    }

  }

  tradePollingStarted =
    false;

}


// ============================================================
// COMPLETE TRADE
// ============================================================

async function completeTrade() {

  if (!activeTrade) return;

  const user =
    await getTradeUser();

  if (!user) return;

  const trade =
    activeTrade;

  if (
    trade.status ===
    "completed"
  ) {

    closeTradeWindow();

    return;

  }

  if (
    !trade.player1_ready ||
    !trade.player2_ready
  ) {

    return;

  }

  const p1Data =
    await getPlayerGameData(
      trade.player1_id
    );

  const p2Data =
    await getPlayerGameData(
      trade.player2_id
    );

  const p1Money =
    Number(
      p1Data.money || 0
    );

  const p2Money =
    Number(
      p2Data.money || 0
    );

  const p1OfferMoney =
    Number(
      trade.player1_money || 0
    );

  const p2OfferMoney =
    Number(
      trade.player2_money || 0
    );

  const p1Items =
    Array.isArray(
      p1Data.itemsOwned
    )
      ? p1Data.itemsOwned
      : [];

  const p2Items =
    Array.isArray(
      p2Data.itemsOwned
    )
      ? p2Data.itemsOwned
      : [];

  const p1Pets =
    Array.isArray(
      p1Data.petsOwned
    )
      ? p1Data.petsOwned
      : [];

  const p2Pets =
    Array.isArray(
      p2Data.petsOwned
    )
      ? p2Data.petsOwned
      : [];

  if (
    p1OfferMoney > p1Money ||
    p2OfferMoney > p2Money
  ) {

    alert(
      "Trade failed because one player no longer has enough money."
    );

    await cancelTrade();

    return;
  }

  const p1OfferedItems =
    trade.player1_items || [];

  const p2OfferedItems =
    trade.player2_items || [];

  const p1OfferedPets =
    trade.player1_pets || [];

  const p2OfferedPets =
    trade.player2_pets || [];

  const newP1Items =
    removeObjects(
      p1Items,
      p1OfferedItems
    ).concat(
      p2OfferedItems
    );

  const newP2Items =
    removeObjects(
      p2Items,
      p2OfferedItems
    ).concat(
      p1OfferedItems
    );

  const newP1Pets =
    removeObjects(
      p1Pets,
      p1OfferedPets
    ).concat(
      p2OfferedPets
    );

  const newP2Pets =
    removeObjects(
      p2Pets,
      p2OfferedPets
    ).concat(
      p1OfferedPets
    );

  const newP1Money =
    p1Money -
    p1OfferMoney +
    p2OfferMoney;

  const newP2Money =
    p2Money -
    p2OfferMoney +
    p1OfferMoney;

  const newP1Data = {
    ...p1Data,
    money:
      newP1Money,
    itemsOwned:
      newP1Items,
    petsOwned:
      newP1Pets
  };

  const newP2Data = {
    ...p2Data,
    money:
      newP2Money,
    itemsOwned:
      newP2Items,
    petsOwned:
      newP2Pets
  };

  const p1Update =
    await supabaseClient
      .from("players")
      .update({
        game_data:
          newP1Data
      })
      .eq(
        "id",
        trade.player1_id
      );

  if (p1Update.error) {

    console.error(
      "P1 TRADE SAVE ERROR:",
      p1Update.error
    );

    alert(
      "Trade failed saving Player 1."
    );

    return;
  }

  const p2Update =
    await supabaseClient
      .from("players")
      .update({
        game_data:
          newP2Data
      })
      .eq(
        "id",
        trade.player2_id
      );

  if (p2Update.error) {

    console.error(
      "P2 TRADE SAVE ERROR:",
      p2Update.error
    );

    alert(
      "Trade failed saving Player 2."
    );

    return;
  }

  const complete =
    await supabaseClient
      .from("trade_sessions")
      .update({
        status:
          "completed",
        updated_at:
          new Date().toISOString()
      })
      .eq(
        "id",
        trade.id
      )
      .eq(
        "status",
        "open"
      );

  if (complete.error) {

    console.error(
      "TRADE COMPLETE ERROR:",
      complete.error
    );

    return;
  }

  alert(
    "TRADE COMPLETE!"
  );

  closeTradeWindow();

  // Reload so game.js loads the newly traded data.
  setTimeout(
    () => {
      location.reload();
    },
    500
  );

}


// ============================================================
// REMOVE OBJECTS
// ============================================================

function removeObjects(
  source,
  remove
) {

  const result =
    [...source];

  for (
    const object of remove
  ) {

    const index =
      result.findIndex(
        candidate =>
          JSON.stringify(
            candidate
          ) ===
          JSON.stringify(
            object
          )
      );

    if (
      index !== -1
    ) {

      result.splice(
        index,
        1
      );

    }

  }

  return result;

}


// ============================================================
// CANCEL TRADE
// ============================================================

async function cancelTrade() {

  if (!activeTrade) {

    closeTradeWindow();

    return;
  }

  await supabaseClient
    .from("trade_sessions")
    .update({
      status:
        "cancelled",
      updated_at:
        new Date().toISOString()
    })
    .eq(
      "id",
      activeTrade.id
    )
    .eq(
      "status",
      "open"
    );

  closeTradeWindow();

}


// ============================================================
// CLOSE TRADE WINDOW
// ============================================================

function closeTradeWindow() {

  const windowElement =
    document.getElementById(
      "linearTradeWindow"
    );

  if (windowElement) {

    windowElement.remove();

  }

  activeTrade =
    null;

}


// ============================================================
// ONLINE STATUS
// ============================================================

async function updateTradeOnlineStatus() {

  const user =
    await getTradeUser();

  if (!user) return;

  const result =
    await supabaseClient
      .from("players")
      .update({
        last_seen:
          new Date().toISOString()
      })
      .eq(
        "id",
        user.id
      );

  if (result.error) {

    console.error(
      "ONLINE STATUS ERROR:",
      result.error
    );

  }

}


// ============================================================
// PLAYERS BUTTON
// ============================================================

if (playersBtn) {

  playersBtn.addEventListener(
    "click",
    async () => {

      if (
        playersPanel.style.display ===
        "block"
      ) {

        playersPanel.style.display =
          "none";

      } else {

        playersPanel.style.display =
          "block";

        await loadPlayers();

      }

    }
  );

}


// ============================================================
// REFRESH
// ============================================================

if (refreshPlayersBtn) {

  refreshPlayersBtn.addEventListener(
    "click",
    loadPlayers
  );

}


// ============================================================
// START ONLINE STATUS
// ============================================================

async function startOnlineStatus() {

  await updateTradeOnlineStatus();

  setInterval(
    async () => {

      await updateTradeOnlineStatus();

    },
    30000
  );

}

startOnlineStatus();


// ============================================================
// TRADE REQUEST POLLING
// ============================================================

setInterval(
  checkTradeRequests,
  3000
);

checkTradeRequests();


// ============================================================
// CHECK FOR EXISTING TRADE
// ============================================================

setTimeout(
  async () => {

    const trade =
      await findActiveTrade();

    if (
      trade &&
      trade.status === "open"
    ) {

      openTradeWindow(
        trade
      );

    }

  },
  1500
);


console.log(
  "PLAYERS.JS V5 READY"
);
