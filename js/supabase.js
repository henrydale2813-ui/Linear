const SUPABASE_URL = "https://mvimkvyyycfsyvwsqrvr.supabase.co/rest/v1/";
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

  const email = `${username.toLowerCase()}@linear.game`;

  authMessage.textContent = "Creating account...";

  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password
  });

  if (error) {
    authMessage.textContent = error.message;
    return;
  }

  if (!data.user) {
    authMessage.textContent = "Account created, but no user was returned.";
    return;
  }

  const { error: playerError } = await supabase
    .from("players")
    .insert({
      id: data.user.id,
      username: username
    });

  if (playerError) {
    authMessage.textContent = playerError.message;
    return;
  }

  authMessage.textContent = "Account created!";
});


loginBtn.addEventListener("click", async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    authMessage.textContent = "Enter a username and password.";
    return;
  }

  const email = `${username.toLowerCase()}@linear.game`;

  authMessage.textContent = "Logging in...";

  const { error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    authMessage.textContent = error.message;
    return;
  }

  authMessage.textContent = "Logged in!";
});
console.log("LINEAR SUPABASE FILE LOADED");
