console.log("TRADE.JS LOADED");

let activeTrade = null;
let tradePollTimer = null;


// ========================================
// TRADE UI
// ========================================

function createTradeScreen() {

  if (document.getElementById("tradeScreen")) {
    return;
  }

  const screen = document.createElement("div");

  screen.id = "tradeScreen";

  screen.style.cssText = `
    display:none;
    position:fixed;
    inset:0;
    z-index:5000;
    background:rgba(0,0,0,.85);
    padding:20px;
    overflow:auto;
    box-sizing:border-box;
  `;

  screen.innerHTML = `
    <div style="
      max-width:1000px;
      margin:30px auto;
      background:#111;
      border:4px solid #fff;
      box-shadow:8px 8px 0 #000;
      padding:20px;
    ">

      <h2 id="tradeTitle">
        TRADE
      </h2>

      <div style="
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:15px;
      ">

        <div style="
          background:#222;
          border:3px solid #fff;
          padding:15px;
        ">

          <h3>YOUR OFFER</h3>

          <p>
            Money:
            $<span id="myTradeMoney">0</span>
          </p>

          <input
            id="tradeMoneyInput"
            type="number"
            min="0"
            step="1"
            placeholder="Money to offer"
            style="
              width:90%;
              padding:10px;
              font-family:inherit;
            "
          >

          <h4>ITEMS</h4>

          <div id="myTradeItems">
            None
          </div>

          <h4>PETS</h4>

          <div id="myTradePets">
            None
          </div>

        </div>


        <div style="
          background:#222;
          border:3px solid #fff;
          padding:15px;
        ">

          <h3 id="otherTradeName">
            THEIR OFFER
          </h3>

          <p>
            Money:
            $<span id="otherTradeMoney">0</span>
          </p>

          <h4>ITEMS</h4>

          <div id="otherTradeItems">
            None
          </div>

          <h4>PETS</h4>

          <div id="otherTradePets">
            None
          </div>

        </div>

      </div>


      <div style="margin-top:20px;">

        <button id="tradeConfirmBtn">
          CONFIRM TRADE
        </button>

        <button id="tradeCancelBtn">
          CANCEL
        </button>

      </div>

      <p id="tradeStatus">
        Waiting...
      </p>

    </div>
  `;

  document.body.appendChild(screen);


  document
    .getElementById("tradeMoneyInput")
    .addEventListener(
      "input",
      updateMyOffer
    );


  document
    .getElementById("tradeConfirmBtn")
    .addEventListener(
      "click",
      confirmTrade
    );


  document
    .getElementById("tradeCancelBtn")
    .addEventListener(
      "click",
      cancelTrade
    );
}


// ========================================
// OPEN TRADE
// ========================================

async function openTradeSession(sessionId) {

  createTradeScreen();

  const userResult =
    await supabaseClient.auth.getUser();

  if (
    userResult.error ||
    !userResult.data.user
  ) {
    return;
  }

  const user =
    userResult.data.user;

  const result =
    await supabaseClient
      .from("trade_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

  if (result.error || !result.data) {
    alert("Trade could not be opened.");
    return;
  }

  activeTrade = {
    session: result.data,
    userId: user.id
  };

  document
    .getElementById("tradeScreen")
    .style.display = "block";

  document
    .getElementById("tradeMoneyInput")
    .value = "";

  startTradePolling();

  renderTrade();
}


// ========================================
// RENDER TRADE
// ========================================

async function renderTrade() {

  if (!activeTrade) return;

  const session =
    activeTrade.session;

  const userId =
    activeTrade.userId;

  const mine =
    session.player1_id === userId
      ? session.player1_offer
      : session.player2_offer;

  const theirs =
    session.player1_id === userId
      ? session.player2_offer
      : session.player1_offer;

  const otherId =
    session.player1_id === userId
      ? session.player2_id
      : session.player1_id;


  document
    .getElementById("myTradeMoney")
    .textContent =
      Number(mine.money || 0)
        .toLocaleString();


  document
    .getElementById("otherTradeMoney")
    .textContent =
      Number(theirs.money || 0)
        .toLocaleString();


  const other =
    await supabaseClient
      .from("players")
      .select("username")
      .eq("id", otherId)
      .maybeSingle();


  document
    .getElementById("otherTradeName")
    .textContent =
      (other.data?.username || "PLAYER") +
      "'S OFFER";


  renderOfferList(
    "myTradeItems",
    mine.items || [],
    "item"
  );

  renderOfferList(
    "myTradePets",
    mine.pets || [],
    "pet"
  );

  renderOfferList(
    "otherTradeItems",
    theirs.items || [],
    "item"
  );

  renderOfferList(
    "otherTradePets",
    theirs.pets || [],
    "pet"
  );


  const confirmed =
    session.player1_id === userId
      ? session.player1_confirmed
      : session.player2_confirmed;


  document
    .getElementById("tradeStatus")
    .textContent =
      confirmed
        ? "YOU CONFIRMED — WAITING FOR OTHER PLAYER"
        : "Review your offer and confirm.";


  if (
    session.status === "completed"
  ) {

    document
      .getElementById("tradeStatus")
      .textContent =
        "TRADE COMPLETED!";

  }

}


// ========================================
// OFFER LIST
// ========================================

function renderOfferList(
  elementId,
  list,
  type
) {

  const element =
    document.getElementById(
      elementId
    );

  if (!element) return;

  element.innerHTML = "";

  if (!list.length) {

    element.textContent =
      "None";

    return;
  }

  list.forEach(item => {

    const div =
      document.createElement("div");

    div.style.cssText = `
      background:#333;
      border:2px solid #fff;
      padding:8px;
      margin:5px 0;
    `;

    if (type === "item") {

      div.textContent =
        `${item.name} (${item.rarityName})`;

    } else {

      div.textContent =
        `${item.rarityName} Pet`;

    }

    element.appendChild(div);

  });

}


// ========================================
// UPDATE MY MONEY OFFER
// ========================================

async function updateMyOffer() {

  if (!activeTrade) return;

  const input =
    document.getElementById(
      "tradeMoneyInput"
    );

  let amount =
    Number(input.value);

  if (!Number.isFinite(amount)) {
    amount = 0;
  }

  amount =
    Math.floor(amount);

  if (amount < 0) {
    amount = 0;
  }


  const state =
    window._linearDebug.state();

  if (amount > state.money) {

    amount =
      Math.floor(state.money);

    input.value =
      amount;

    alert(
      "You cannot offer more money than you have."
    );

  }


  const session =
    activeTrade.session;

  const userId =
    activeTrade.userId;

  const isPlayer1 =
    session.player1_id === userId;


  const currentOffer =
    isPlayer1
      ? session.player1_offer
      : session.player2_offer;


  const newOffer = {
    money: amount,
    items: currentOffer.items || [],
    pets: currentOffer.pets || []
  };


  const update =
    isPlayer1
      ? {
          player1_offer: newOffer,
          player1_confirmed: false
        }
      : {
          player2_offer: newOffer,
          player2_confirmed: false
        };


  const result =
    await supabaseClient
      .from("trade_sessions")
      .update(update)
      .eq(
        "id",
        session.id
      );


  if (result.error) {

    console.error(
      "OFFER UPDATE ERROR:",
      result.error
    );

    return;
  }


  activeTrade.session = {
    ...session,
    ...update
  };

  renderTrade();
}


// ========================================
// CONFIRM
// ========================================

async function confirmTrade() {

  if (!activeTrade) return;

  const session =
    activeTrade.session;

  const userId =
    activeTrade.userId;

  const isPlayer1 =
    session.player1_id === userId;


  const state =
    window._linearDebug.state();

  const offer =
    isPlayer1
      ? session.player1_offer
      : session.player2_offer;


  if (
    Number(offer.money || 0) >
    Number(state.money || 0)
  ) {

    alert(
      "You don't have enough money for this trade."
    );

    return;
  }


  const update =
    isPlayer1
      ? {
          player1_confirmed: true
        }
      : {
          player2_confirmed: true
        };


  const result =
    await supabaseClient
      .from("trade_sessions")
      .update(update)
      .eq(
        "id",
        session.id
      );


  if (result.error) {

    console.error(
      "CONFIRM ERROR:",
      result.error
    );

    return;
  }


  activeTrade.session = {
    ...session,
    ...update
  };

  renderTrade();

  await finishTradeIfReady();
}


// ========================================
// FINISH TRADE
// ========================================

async function finishTradeIfReady() {

  if (!activeTrade) return;

  const session =
    activeTrade.session;


  if (
    !session.player1_confirmed ||
    !session.player2_confirmed
  ) {

    return;
  }


  const state =
    window._linearDebug.state();


  const myOffer =
    session.player1_id === activeTrade.userId
      ? session.player1_offer
      : session.player2_offer;


  const theirOffer =
    session.player1_id === activeTrade.userId
      ? session.player2_offer
      : session.player1_offer;


  /*
    The actual game-state transfer is handled
    by the server-safe trade function below.
  */

  const result =
    await supabaseClient.rpc(
      "complete_trade",
      {
        p_trade_id: session.id
      }
    );


  if (result.error) {

    console.error(
      "TRADE COMPLETE ERROR:",
      result.error
    );

    document
      .getElementById("tradeStatus")
      .textContent =
        "TRADE ERROR: " +
        result.error.message;

    return;
  }


  document
    .getElementById("tradeStatus")
    .textContent =
      "TRADE COMPLETED!";


  await new Promise(
    resolve =>
      setTimeout(
        resolve,
        1200
      )
  );


  location.reload();
}


// ========================================
// CANCEL
// ========================================

async function cancelTrade() {

  if (!activeTrade) return;

  await supabaseClient
    .from("trade_sessions")
    .update({
      status: "cancelled"
    })
    .eq(
      "id",
      activeTrade.session.id
    );

  closeTradeScreen();
}


// ========================================
// CLOSE
// ========================================

function closeTradeScreen() {

  if (tradePollTimer) {

    clearInterval(
      tradePollTimer
    );

    tradePollTimer = null;

  }

  activeTrade = null;

  const screen =
    document.getElementById(
      "tradeScreen"
    );

  if (screen) {

    screen.style.display =
      "none";

  }

}


// ========================================
// POLL
// ========================================

function startTradePolling() {

  if (tradePollTimer) {

    clearInterval(
      tradePollTimer
    );

  }

  tradePollTimer =
    setInterval(
      refreshTradeSession,
      1000
    );

}


async function refreshTradeSession() {

  if (!activeTrade) return;

  const result =
    await supabaseClient
      .from("trade_sessions")
      .select("*")
      .eq(
        "id",
        activeTrade.session.id
      )
      .maybeSingle();


  if (
    result.error ||
    !result.data
  ) {

    return;

  }


  activeTrade.session =
    result.data;

  renderTrade();

  if (
    result.data.status ===
    "cancelled"
  ) {

    alert(
      "The other player cancelled the trade."
    );

    closeTradeScreen();

    return;

  }

}


// ========================================
// CREATE TRADE SESSION
// ========================================

async function createTradeSession(
  receiverId,
  receiverName
) {

  const userResult =
    await supabaseClient.auth.getUser();

  if (
    userResult.error ||
    !userResult.data.user
  ) {

    return;

  }

  const user =
    userResult.data.user;


  const result =
    await supabaseClient
      .from("trade_sessions")
      .insert({
        player1_id: user.id,
        player2_id: receiverId,
        player1_offer: {
          money: 0,
          items: [],
          pets: []
        },
        player2_offer: {
          money: 0,
          items: [],
          pets: []
        }
      })
      .select()
      .single();


  if (result.error) {

    console.error(
      "TRADE SESSION ERROR:",
      result.error
    );

    alert(
      "Could not create trade: " +
      result.error.message
    );

    return null;

  }


  return result.data;

}


window.openTradeSession =
  openTradeSession;

window.createTradeSession =
  createTradeSession;

createTradeScreen();

console.log("TRADE.JS READY");
