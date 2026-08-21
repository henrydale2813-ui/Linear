console.log("SUPABASE.JS LOADED");

const SUPABASE_URL = "https://mvimkvyyycfsyvwsqrvr.supabase.co";
const SUPABASE_KEY = "sb_publishable_IXxv555lJWj6CnGRITlDiw_U1K06ahG";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

console.log("SUPABASE CLIENT CREATED");

const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const authMessage = document.getElementById("authMessage");

console.log("SIGNUP BUTTON:", signupBtn);
console.log("LOGIN BUTTON:", loginBtn);

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

  authMessage.textContent = "Creating account...";

  const email = username.toLowerCase() + "@linear.game";

  console.log("SIGNING UP:", email);

  try {

    const { data, error } = await supabaseClient.auth.signUp({
      email: email,
      password: password
    });

    console.log("SIGNUP RESULT:", data, error);

    if (error) {
      authMessage.textContent = "ERROR: " + error.message;
      return;
    }

    if (!data.user) {
      authMessage.textContent = "No user was returned.";
      return;
    }

    const { error: playerError } = await supabaseClient
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

    document.getElementById("authScreen").style.display = "none";
    document.getElementById("gameScreen").style.display = "block";

  } catch (err) {

    console.error("SIGNUP CRASH:", err);
    authMessage.textContent = "ERROR: " + err.message;

  }

});


loginBtn.addEventListener("click", async () => {

  console.log("LOGIN CLICKED");

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    authMessage.textContent = "Enter a username and password.";
    return;
  }

  authMessage.textContent = "Logging in...";

  const email = username.toLowerCase() + "@linear.game";

  try {

    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

    console.log("LOGIN RESULT:", data, error);

    if (error) {
      authMessage.textContent = "ERROR: " + error.message;
      return;
    }

    authMessage.textContent = "LOGGED IN!";

    document.getElementById("authScreen").style.display = "none";
    document.getElementById("gameScreen").style.display = "block";

  } catch (err) {

    console.error("LOGIN CRASH:", err);
    authMessage.textContent = "ERROR: " + err.message;

  }

});

console.log("SUPABASE.JS READY");
