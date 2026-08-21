const SUPABASE_URL = "https://mvimkvyyycfsyvwsqrvr.supabase.co";
const SUPABASE_KEY = "sb_publishable_IXxv555lJWj6CnGRITlDiw_U1K06ahG";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const authMessage = document.getElementById("authMessage");

function showGame() {
  document.getElementById("authScreen").style.display = "none";
  document.getElementById("gameScreen").style.display = "block";
}

signupBtn.addEventListener("click", async () => {

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

  try {

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password
    });

    console.log("SIGNUP:", data, error);

    if (error) {
      authMessage.textContent = "ERROR: " + error.message;
      return;
    }

    if (!data.user) {
      authMessage.textContent = "Account creation failed.";
      return;
    }

    const { error: playerError } = await supabase
      .from("players")
      .insert({
        id: data.user.id,
        username: username
      });

    console.log("PLAYER:", playerError);

    if (playerError) {
      authMessage.textContent =
        "Account created, but player setup failed: " +
        playerError.message;
      return;
    }

    authMessage.textContent = "ACCOUNT CREATED!";

    if (data.session) {
      showGame();
    }

  } catch (err) {

    console.error(err);
    authMessage.textContent = "ERROR: " + err.message;

  }

});


loginBtn.addEventListener("click", async () => {

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
      await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

    console.log("LOGIN:", data, error);

    if (error) {
      authMessage.textContent = "ERROR: " + error.message;
      return;
    }

    authMessage.textContent = "LOGGED IN!";

    showGame();

  } catch (err) {

    console.error(err);
    authMessage.textContent = "ERROR: " + err.message;

  }

});


async function checkLogin() {

  const { data } = await supabase.auth.getSession();

  if (data.session) {
    showGame();
  }

}

checkLogin();

console.log("SUPABASE.JS LOADED");
