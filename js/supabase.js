// ===============================
// LINEAR SUPABASE AUTH
// ===============================

const SUPABASE_URL = "https://mvimkvyyycfsyvwsqrvr.supabase.co";
const SUPABASE_KEY = "sb_publishable_IXxv555lJWj6CnGRITlDiw_U1K06ahG";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

console.log("SUPABASE.JS LOADED");

const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const authMessage = document.getElementById("authMessage");

function showGame() {
  const authScreen = document.getElementById("authScreen");
  const gameScreen = document.getElementById("gameScreen");

  if (authScreen) authScreen.style.display = "none";
  if (gameScreen) gameScreen.style.display = "block";
}

// ===============================
// CREATE ACCOUNT
// ===============================

signupBtn.addEventListener("click", async () => {

  console.log("CREATE ACCOUNT CLICKED");

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    authMessage.textContent = "Enter a username and password.";
    return;
  }

  if (username.length < 3) {
    authMessage.textContent = "Username must be at least 3 characters.";
    return;
  }

  if (password.length < 6) {
    authMessage.textContent = "Password must be at least 6 characters.";
    return;
  }

  const email = username.toLowerCase() + "@linear.game";

  authMessage.textContent = "Creating account...";

  try {

    const { data, error } =
      await supabaseClient.auth.signUp({
        email: email,
        password: password
      });

    console.log("SIGNUP:", data, error);

    if (error) {
      authMessage.textContent = "ERROR: " + error.message;
      return;
    }

    if (!data.user) {
      authMessage.textContent = "Account could not be created.";
      return;
    }

    // Try to create the player
    const { error: playerError } =
      await supabaseClient
        .from("players")
        .insert({
          id: data.user.id,
          username: username
        });

    console.log("PLAYER:", playerError);

    if (playerError) {

      // Username may already exist
      if (playerError.code === "23505") {
        authMessage.textContent =
          "That username is already taken.";
        return;
      }

      console.error(playerError);

      authMessage.textContent =
        "Account created, but player setup failed: " +
        playerError.message;

      return;
    }

    authMessage.textContent =
      "ACCOUNT CREATED! Logging you in...";

    // If Supabase returned a session, enter the game
    if (data.session) {
      showGame();
    } else {
      authMessage.textContent =
        "Account created! If email confirmation is enabled in Supabase, confirm the email first.";
    }

  } catch (err) {

    console.error(err);

    authMessage.textContent =
      "ERROR: " + err.message;
  }
});


// ===============================
// LOG IN
// ===============================

loginBtn.addEventListener("click", async () => {

  console.log("LOGIN CLICKED");

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    authMessage.textContent =
      "Enter a username and password.";
    return;
  }

  const email = username.toLowerCase() + "@linear.game";

  authMessage.textContent = "Logging in...";

  try {

    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

    console.log("LOGIN:", data, error);

    if (error) {
      authMessage.textContent =
        "ERROR: " + error.message;
      return;
    }

    authMessage.textContent = "LOGGED IN!";

    showGame();

  } catch (err) {

    console.error(err);

    authMessage.textContent =
      "ERROR: " + err.message;
  }
});


// ===============================
// CHECK EXISTING LOGIN
// ===============================

async function checkLogin() {

  const { data } =
    await supabaseClient.auth.getSession();

  if (data.session) {
    console.log("ALREADY LOGGED IN");
    showGame();
  }
}

checkLogin();
