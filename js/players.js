// =========================
// LINEAR PLAYERS + TRADING
// =========================

console.log("PLAYERS.JS LOADED");

const playersBtn = document.getElementById("playersBtn");
const playersPanel = document.getElementById("playersPanel");
const playersList = document.getElementById("playersList");
const refreshPlayersBtn = document.getElementById("refreshPlayersBtn");


// =========================
// GET CURRENT USER
// =========================

async function getPlayerUser() {

  const { data, error } =
    await supabaseClient.auth.getUser();

  if (error) {

    console.error(
      "GET USER ERROR:",
      error
    );

    return null;
  }

  return data.user;
}


// =========================
// UPDATE LAST SEEN
// =========================

async function updateLastSeen() {

  const user = await getPlayerUser();

  if (!user) return;

  const { error } =
    await supabaseClient
      .from("players")
      .update({
        last_seen:
          new Date().toISOString()
      })
      .eq("id", user.id);

  if (error) {

    console.error(
      "LAST SEEN ERROR:",
      error
    );

  }
}


// =========================
// LOAD PLAYERS
// =========================

async function loadPlayers() {

  if (!playersList) return;

  playersList.textContent =
    "Loading players...";

  const user =
    await getPlayerUser();

  if (!user) {

    playersList.textContent =
      "You are not logged in.";

    return;
  }

  const { data, error } =
    await supabaseClient
      .from("players")
      .select(
        "id, username, last_seen"
      )
      .order(
        "last_seen",
        {
          ascending: false
        }
      );

  if (error) {

    console.error(
      "PLAYERS LOAD ERROR:",
      error
    );

    playersList.textContent =
      "ERROR: " + error.message;

    return;
  }

  playersList.innerHTML = "";

  const otherPlayers =
    data.filter(
      player =>
        player.id !== user.id
    );

  if (otherPlayers.length === 0) {

    playersList.innerHTML =
      "<p>No other players yet.</p>";

    return;
  }

  const now = Date.now();

  otherPlayers.forEach(player => {

    const card =
      document.createElement("div");

    card.className =
      "playerCard";

    const lastSeen =
      player.last_seen
        ? new Date(
            player.last_seen
          ).getTime()
        : 0;

    const online =
      lastSeen &&
      now - lastSeen < 60000;

    card.innerHTML = `
      <strong>
        ${online ? "🟢" : "⚫"}
        ${escapePlayerName(
          player.username
        )}
      </strong>

      <span class="${
        online
          ? "playerOnline"
          : "playerOffline"
      }">
        ${online ? " ONLINE" : " OFFLINE"}
      </span>

      <button
        class="tradeButton"
        data-player-id="${player.id}"
        data-player-name="${escapePlayerName(
          player.username
        )}"
      >
        TRADE
      </button>
    `;

    playersList.appendChild(card);

  });

  // Add trade button listeners

  document
    .querySelectorAll(".tradeButton")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          sendTradeRequest(
            button.dataset.playerId,
            button.dataset.playerName
          );

        }
      );

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
    await getPlayerUser();

  if (!user) {

    alert(
      "You are not logged in."
    );

    return;
  }

  if (
    receiverId === user.id
  ) {

    return;
  }

  // Check for existing pending request

  const {
    data: existing,
    error: checkError
  } =
    await supabaseClient
      .from("trade_requests")
      .select("id")
      .eq("sender_id", user.id)
      .eq(
        "receiver_id",
        receiverId
      )
      .eq(
        "status",
        "pending"
      )
      .maybeSingle();

  if (checkError) {

    console.error(
      "TRADE CHECK ERROR:",
      checkError
    );

    alert(
      "Could not check trade request."
    );

    return;
  }

  if (existing) {

    alert(
      "You already sent a trade request to " +
      receiverName
    );

    return;
  }

  const {
    error
  } =
    await supabaseClient
      .from("trade_requests")
      .insert({

        sender_id:
          user.id,

        receiver_id:
          receiverId,

        status:
          "pending"

      });

  if (error) {

    console.error(
      "TRADE REQUEST ERROR:",
      error
    );

    alert(
      "Trade request failed: " +
      error.message
    );

    return;
  }

  alert(
    "Trade request sent to " +
    receiverName + "!"
  );

}


// =========================
// ESCAPE USERNAME
// =========================

function escapePlayerName(
  name
) {

  const div =
    document.createElement("div");

  div.textContent =
    name || "Unknown";

  return div.innerHTML;
}


// =========================
// PLAYERS BUTTON
// =========================

if (playersBtn) {

  playersBtn.addEventListener(
    "click",
    async () => {

      console.log(
        "PLAYERS BUTTON CLICKED"
      );

      if (
        playersPanel.style.display ===
          "none" ||
        playersPanel.style.display ===
          ""
      ) {

        playersPanel.style.display =
          "block";

        await loadPlayers();

      } else {

        playersPanel.style.display =
          "none";

      }

    }
  );

}


// =========================
// REFRESH BUTTON
// =========================

if (refreshPlayersBtn) {

  refreshPlayersBtn.addEventListener(
    "click",
    loadPlayers
  );

}


// =========================
// ONLINE STATUS
// =========================

updateLastSeen();

setInterval(
  updateLastSeen,
  30000
);


console.log(
  "PLAYERS.JS READY"
);
// =========================
// INCOMING TRADE REQUESTS
// =========================

async function checkTradeRequests() {

  const user = await getPlayerUser();

  if (!user) return;

  const { data, error } = await supabaseClient
    .from("trade_requests")
    .select(`
      id,
      sender_id,
      created_at,
      players!trade_requests_sender_id_fkey (
        username
      )
    `)
    .eq("receiver_id", user.id)
    .eq("status", "pending")
    .order("created_at", {
      ascending: false
    });

  if (error) {

    console.error(
      "TRADE REQUEST CHECK ERROR:",
      error
    );

    return;
  }

  if (!data || data.length === 0) return;

  data.forEach(request => {

    const senderName =
      request.players?.username ||
      "A player";

    const accept =
      confirm(
        senderName +
        " wants to trade with you!\n\n" +
        "Press OK to accept or Cancel to decline."
      );

    respondToTradeRequest(
      request.id,
      accept
    );

  });

}


async function respondToTradeRequest(
  requestId,
  accepted
) {

  const newStatus =
    accepted
      ? "accepted"
      : "declined";

  const { error } =
    await supabaseClient
      .from("trade_requests")
      .update({
        status: newStatus
      })
      .eq("id", requestId);

  if (error) {

    console.error(
      "TRADE RESPONSE ERROR:",
      error
    );

    return;
  }

  if (accepted) {

    alert(
      "Trade accepted! We'll build the trade window next."
    );

  } else {

    alert(
      "Trade request declined."
    );

  }

}


// Check for requests every 3 seconds

setInterval(
  checkTradeRequests,
  3000
);

checkTradeRequests();
