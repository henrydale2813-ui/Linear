console.log("PLAYERS.JS - PLAYER REQUEST SYSTEM LOADED");

const playersBtn = document.getElementById("playersBtn");
const playersPanel = document.getElementById("playersPanel");
const playersList = document.getElementById("playersList");
const refreshPlayersBtn = document.getElementById("refreshPlayersBtn");

const seenTradeRequests = new Set();
const watchedTradeRequests = new Set();

async function getTradeUser() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error) {
    console.error("USER ERROR:", error);
    return null;
  }

  return data.user;
}

function tradeIsOpen() {
  return Boolean(document.getElementById("tradeScreen"));
}

async function loadPlayers() {
  if (!playersList) return;

  playersList.textContent = "Loading players...";
  const user = await getTradeUser();

  if (!user) {
    playersList.textContent = "Not logged in.";
    return;
  }

  const { data, error } = await supabaseClient
    .from("players")
    .select("id, username, last_seen")
    .neq("id", user.id)
    .order("last_seen", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("PLAYERS ERROR:", error);
    playersList.textContent = "ERROR: " + error.message;
    return;
  }

  playersList.innerHTML = "";

  if (!data || data.length === 0) {
    playersList.textContent = "No other players.";
    return;
  }

  const now = Date.now();

  data.forEach((player) => {
    const card = document.createElement("div");
    card.style.cssText = "background:#222;border:2px solid #fff;padding:12px;margin:10px 0;";

    const lastSeen = player.last_seen ? new Date(player.last_seen).getTime() : 0;
    const online = lastSeen > 0 && now - lastSeen < 300000;

    const name = document.createElement("strong");
    name.textContent = (online ? "🟢 " : "⚫ ") + (player.username || "Unknown");
    card.appendChild(name);

    const status = document.createElement("span");
    status.textContent = online ? " ONLINE" : " OFFLINE";
    card.appendChild(status);

    const trade = document.createElement("button");
    trade.textContent = "TRADE";
    trade.style.marginLeft = "15px";
    trade.disabled = !online;
    trade.addEventListener("click", () => sendTradeRequest(player.id, player.username));
    card.appendChild(trade);

    playersList.appendChild(card);
  });
}

async function sendTradeRequest(receiverId, receiverName) {
  const user = await getTradeUser();
  if (!user) return;

  if (user.id === receiverId) {
    alert("You cannot trade with yourself.");
    return;
  }

  if (tradeIsOpen()) {
    alert("You are already in a trade.");
    return;
  }

  // Check both directions so two players cannot create competing requests.
  const { data: existing, error: existingError } = await supabaseClient
    .from("trade_requests")
    .select("id, sender_id, receiver_id, status")
    .in("status", ["pending", "accepted"])
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("TRADE REQUEST CHECK ERROR:", existingError);
    alert("Could not check trade requests: " + existingError.message);
    return;
  }

  if (existing) {
    alert("There is already an active trade request with this player.");
    return;
  }

  const { data: request, error } = await supabaseClient
    .from("trade_requests")
    .insert({ sender_id: user.id, receiver_id: receiverId, status: "pending" })
    .select("id, sender_id, receiver_id, status")
    .single();

  if (error) {
    console.error("TRADE SEND ERROR:", error);
    alert("Trade failed: " + error.message);
    return;
  }

  alert("Trade request sent to " + receiverName + "!");
  watchTradeRequest(request.id, receiverName);
}

function watchTradeRequest(requestId, receiverName) {
  if (watchedTradeRequests.has(requestId)) return;
  watchedTradeRequests.add(requestId);

  const interval = setInterval(async () => {
    const { data, error } = await supabaseClient
      .from("trade_requests")
      .select("id, sender_id, receiver_id, status")
      .eq("id", requestId)
      .maybeSingle();

    if (error) {
      console.error("REQUEST WATCH ERROR:", error);
      return;
    }

    if (!data) {
      clearInterval(interval);
      watchedTradeRequests.delete(requestId);
      return;
    }

    if (data.status === "accepted") {
      clearInterval(interval);
      watchedTradeRequests.delete(requestId);
      await openRequestTrade(data);
    } else if (data.status === "declined") {
      clearInterval(interval);
      watchedTradeRequests.delete(requestId);
      alert(receiverName + " declined the trade.");
    }
  }, 2000);

  setTimeout(() => {
    clearInterval(interval);
    watchedTradeRequests.delete(requestId);
  }, 120000);
}

async function openRequestTrade(request) {
  const { data: session, error } = await supabaseClient
    .from("trade_sessions")
    .select("id")
    .eq("request_id", request.id)
    .maybeSingle();

  if (error) {
    console.error("TRADE SESSION LOOKUP ERROR:", error);
    return;
  }

  if (session && typeof window.openTradeSession === "function") {
    window.openTradeSession(session.id);
  }
}

async function checkTradeRequests() {
  const user = await getTradeUser();
  if (!user || tradeIsOpen()) return;

  const { data, error } = await supabaseClient
    .from("trade_requests")
    .select("id, sender_id, receiver_id, created_at")
    .eq("receiver_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("TRADE REQUEST ERROR:", error);
    return;
  }

  for (const request of data || []) {
    if (seenTradeRequests.has(request.id)) continue;
    seenTradeRequests.add(request.id);

    const { data: sender } = await supabaseClient
      .from("players")
      .select("username")
      .eq("id", request.sender_id)
      .maybeSingle();

    const accepted = confirm(
      (sender?.username || "A player") +
        " wants to trade with you!\n\nOK = Accept\nCancel = Decline"
    );

    const { error: updateError } = await supabaseClient
      .from("trade_requests")
      .update({ status: accepted ? "accepted" : "declined" })
      .eq("id", request.id)
      .eq("status", "pending");

    if (updateError) {
      console.error("TRADE RESPONSE ERROR:", updateError);
      continue;
    }

    if (accepted) await createRequestTrade(request);
  }
}

async function createRequestTrade(request) {
  const { data: existing, error: lookupError } = await supabaseClient
    .from("trade_sessions")
    .select("id")
    .eq("request_id", request.id)
    .maybeSingle();

  if (lookupError) {
    console.error("TRADE SESSION LOOKUP ERROR:", lookupError);
    return;
  }

  if (existing) {
    if (typeof window.openTradeSession === "function") window.openTradeSession(existing.id);
    return;
  }

  const { data: session, error } = await supabaseClient
    .from("trade_sessions")
    .insert({
      request_id: request.id,
      player1_id: request.sender_id,
      player2_id: request.receiver_id,
      player1_offer: { money: 0, items: [], pets: [] },
      player2_offer: { money: 0, items: [], pets: [] },
      player1_confirmed: false,
      player2_confirmed: false,
      status: "open"
    })
    .select("id")
    .single();

  if (error) {
    console.error("TRADE SESSION CREATE ERROR:", error);
    alert("The trade was accepted, but could not be opened: " + error.message);
    return;
  }

  if (typeof window.openTradeSession === "function") window.openTradeSession(session.id);
}

async function updateTradeOnlineStatus() {
  const user = await getTradeUser();
  if (!user) return;

  const { error } = await supabaseClient
    .from("players")
    .update({ last_seen: new Date().toISOString() })
    .eq("id", user.id);

  if (error) console.error("ONLINE STATUS ERROR:", error);
}

if (playersBtn) {
  playersBtn.addEventListener("click", async () => {
    playersPanel.style.display = playersPanel.style.display === "block" ? "none" : "block";
    if (playersPanel.style.display === "block") await loadPlayers();
  });
}

if (refreshPlayersBtn) refreshPlayersBtn.addEventListener("click", loadPlayers);

updateTradeOnlineStatus();
setInterval(updateTradeOnlineStatus, 30000);
setInterval(checkTradeRequests, 3000);
checkTradeRequests();

console.log("PLAYERS.JS READY");
