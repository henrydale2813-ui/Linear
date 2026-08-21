// ===============================
// LINEAR SUPABASE AUTH
// ===============================

const SUPABASE_URL = "https://mvimkvyyycfsyvwsqrvr.supabase.co";
const SUPABASE_KEY = "sb_publishable_IXxv555lJWj6CnGRITlDiw_U1K06ahG";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

console.log("SUPABASE.JS LOADED");

const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const authMessage = document.getElementById("authMessage");
const authScreen = document.getElementById("authScreen");
const gameScreen = document.getElementById("gameScreen");


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

  console.log("Signing up:", email);

  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password
  });

  console.log("SIGNUP RESULT:", data, error);

  if (error) {
    authMessage.textContent = "ERROR: " + error.message;
    return;
  }

  if (!data.user) {
    authMessage.textContent = "Account creation failed.";
    return;
  }

  // Create player record
  const { error: playerError } = await supabase
    .from("players")
    .insert({
      id: data.user.id,
      username: username
    });

  console.log("PLAYER RESULT:", playerError);

  if (playerError) {
    authMessage.textContent =
      "Account created, but player setup failed: " +
      playerError.message;

    return;
  }

  authMessage.textContent = "ACCOUNT CREATED!";

  // If Supabase automatically logged them in,
  // immediately open the game.
  if (data.session) {
    authScreen.style.display = "none";
    gameScreen.style.display = "block";
  } else {
    authMessage.textContent =
      "ACCOUNT CREATED! You can now log in.";
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
    authMessage.textContent = "Enter a username and password.";
    return;
  }

  const email = username.toLowerCase() + "@linear.game";

  authMessage.textContent = "Logging in...";

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

  console.log("LOGIN RESULT:", data, error);

  if (error) {
    authMessage.textContent = "ERROR: " + error.message;
    return;
  }

  authMessage.textContent = "LOGGED IN!";

  authScreen.style.display = "none";
  gameScreen.style.display = "block";

});


// ===============================
// CHECK EXISTING LOGIN
// ===============================

async function checkLogin() {

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    console.log("ALREADY LOGGED IN");

    authScreen.style.display = "none";
    gameScreen.style.display = "block";
  }

}

checkLogin();
