console.log("PLAYERS.JS V3 LOADED");

const playersBtn = document.getElementById("playersBtn");
const playersPanel = document.getElementById("playersPanel");
const playersList = document.getElementById("playersList");
const refreshPlayersBtn = document.getElementById("refreshPlayersBtn");


// =========================
// GET USER
// =========================

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


// =========================
// LOAD PLAYERS
// =========================

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

  const now = Date.now();

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
      lastSeen &&
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


// =========================
// SEND TRADE REQUEST
// =========================

async function sendTradeRequest(
  receiverId,
  receiverName
) {

  const user =
    await getTradeUser();

  if (!user) return;

  const result =
    await supabaseClient
      .from("trade_requests")
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        status: "pending"
      });

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
    receiverName + "!"
  );

}


// =========================
// CHECK TRADE REQUESTS
// =========================

async function checkTradeRequests() {

  const user =
    await getTradeUser();

  if (!user) return;

  const result =
    await supabaseClient
      .from("trade_requests")
      .select(
        "id, sender_id, created_at"
      )
      .eq(
        "receiver_id",
        user.id
      )
      .eq(
        "status",
        "pending"
      );

  if (result.error) {

    console.error(
      "TRADE REQUEST ERROR:",
      result.error
    );

    return;
  }

  if (!result.data.length) return;

  for (
    const request of result.data
  ) {

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

    await supabaseClient
      .from("trade_requests")
      .update({
        status:
          accepted
            ? "accepted"
            : "declined"
      })
      .eq(
        "id",
        request.id
      );

  }

}


// =========================
// UPDATE ONLINE STATUS
// =========================

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


// =========================
// PLAYERS BUTTON
// =========================

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


// =========================
// REFRESH
// =========================

if (refreshPlayersBtn) {

  refreshPlayersBtn.addEventListener(
    "click",
    loadPlayers
  );

}


// =========================
// START
// =========================

updateTradeOnlineStatus();

setInterval(
  updateTradeOnlineStatus,
  30000
);

setInterval(
  checkTradeRequests,
  3000
);

checkTradeRequests();

console.log(
  "PLAYERS.JS V3 READY"
);
