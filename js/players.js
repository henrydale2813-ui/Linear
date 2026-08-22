// =========================
// LINEAR PLAYERS TAB
// =========================

console.log("PLAYERS.JS LOADED");

const playersBtn = document.getElementById("playersBtn");
const playersPanel = document.getElementById("playersPanel");
const playersList = document.getElementById("playersList");
const refreshPlayersBtn = document.getElementById("refreshPlayersBtn");

async function getPlayerUser() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error) {
    console.error("GET USER ERROR:", error);
    return null;
  }

  return data.user;
}

async function updateLastSeen() {

  const user = await getPlayerUser();

  if (!user) {
    console.log("No logged-in user for last_seen");
    return;
  }

  const { error } = await supabaseClient
    .from("players")
    .update({
      last_seen: new Date().toISOString()
    })
    .eq("id", user.id);

  if (error) {
    console.error("LAST SEEN ERROR:", error);
  }
}

async function loadPlayers() {

  if (!playersList) return;

  playersList.textContent = "Loading players...";

  const user = await getPlayerUser();

  if (!user) {
    playersList.textContent = "You are not logged in.";
    return;
  }

  const { data, error } = await supabaseClient
    .from("players")
    .select("id, username, last_seen")
    .order("last_seen", {
      ascending: false
    });

  if (error) {

    console.error("PLAYERS LOAD ERROR:", error);

    playersList.textContent =
      "ERROR: " + error.message;

    return;
  }

  playersList.innerHTML = "";

  const otherPlayers = data.filter(
    player => player.id !== user.id
  );

  if (otherPlayers.length === 0) {

    playersList.innerHTML =
      "<p>No other players yet.</p>";

    return;
  }

  const now = Date.now();

  otherPlayers.forEach(player => {

    const card = document.createElement("div");

    card.className = "playerCard";

    const lastSeen =
      player.last_seen
        ? new Date(player.last_seen).getTime()
        : 0;

    const online =
      lastSeen &&
      now - lastSeen < 60000;

    card.innerHTML = `
      <strong>
        ${online ? "🟢" : "⚫"}
        ${escapePlayerName(player.username)}
      </strong>

      <span class="${online ? "playerOnline" : "playerOffline"}">
        ${online ? " ONLINE" : " OFFLINE"}
      </span>

      <button
        class="tradeButton"
        disabled
      >
        TRADE
      </button>
    `;

    playersList.appendChild(card);

  });
}

function escapePlayerName(name) {

  const div = document.createElement("div");

  div.textContent = name || "Unknown";

  return div.innerHTML;
}


// PLAYERS BUTTON

if (playersBtn) {

  playersBtn.addEventListener("click", async () => {

    console.log("PLAYERS BUTTON CLICKED");

    if (
      playersPanel.style.display === "none" ||
      playersPanel.style.display === ""
    ) {

      playersPanel.style.display = "block";

      await loadPlayers();

    } else {

      playersPanel.style.display = "none";

    }

  });

} else {

  console.error("playersBtn NOT FOUND");

}


// REFRESH BUTTON

if (refreshPlayersBtn) {

  refreshPlayersBtn.addEventListener(
    "click",
    loadPlayers
  );

}


// UPDATE ONLINE STATUS

updateLastSeen();

setInterval(
  updateLastSeen,
  30000
);

console.log("PLAYERS.JS READY");
