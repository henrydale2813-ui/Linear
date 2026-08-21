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

/* =========================
   CREATE ACCOUNT
   ========================= */

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

  signupBtn.disabled = true;
  loginBtn.disabled = true;

  authMessage.textContent = "Creating account...";

  const email = username.toLowerCase() + "@linear.game";

  try {

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          username: username
        }
      }
    });

    console.log("SIGNUP:", data, error);

    if (error) {
      authMessage.textContent = "ERROR: " + error.message;
      signupBtn.disabled = false;
      loginBtn.disabled = false;
      return;
    }

    if (!data.user) {
      authMessage.textContent = "Account could not be created.";
      signupBtn.disabled = false;
      loginBtn.disabled = false;
      return;
    }

    /*
      If Supabase automatically logged us in,
      go straight into the game.
    */

    if (data.session) {

      authMessage.textContent = "ACCOUNT CREATED!";

      showGame();

      signupBtn.disabled = false;
      loginBtn.disabled = false;

      return;
    }

    /*
      If email confirmation is enabled,
      Supabase will not give us a session yet.
    */

    authMessage.textContent =
      "ACCOUNT CREATED! Check your email to confirm it, then log in.";

  } catch (err) {

    console.error(err);

    authMessage.textContent =
      "ERROR: " + err.message;

  }

  signupBtn.disabled = false;
  loginBtn.disabled = false;

});


/* =========================
   LOG IN
   ========================= */

loginBtn.addEventListener("click", async () => {

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    authMessage.textContent = "Enter a username and password.";
    return;
  }

  loginBtn.disabled = true;
  signupBtn.disabled = true;

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

      authMessage.textContent =
        "ERROR: " + error.message;

      loginBtn.disabled = false;
      signupBtn.disabled = false;

      return;
    }

    authMessage.textContent = "LOGGED IN!";

    showGame();

  } catch (err) {

    console.error(err);

    authMessage.textContent =
      "ERROR: " + err.message;

  }

  loginBtn.disabled = false;
  signupBtn.disabled = false;

});


/* =========================
   CHECK EXISTING LOGIN
   ========================= */

async function checkLogin() {

  const { data } = await supabase.auth.getSession();

  if (data && data.session) {
    showGame();
  }

}

checkLogin();

console.log("LINEAR SUPABASE.JS LOADED");
