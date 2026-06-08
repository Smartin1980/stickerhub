import { store } from "./store.js?v=20260608-1";
import { setLoading, toast } from "./ui.js";

const form = document.querySelector("#auth-form");
const tabs = document.querySelectorAll(".auth-tab");
const nameField = document.querySelector("#name-field");
const submitButton = document.querySelector("#submit-button");
const magicButton = document.querySelector("#magic-link");
const AUTH_COOLDOWN_SECONDS = 60;
let mode = "login";
let cooldownTimer;

document.querySelector("#demo-note").hidden = !store.demoMode;

function authErrorMessage(error) {
  const message = String(error?.message || "").toLowerCase();
  const status = Number(error?.status || 0);

  if (status === 429 || message.includes("rate limit") || message.includes("too many")) {
    return "Zu viele E-Mails wurden angefordert. Bitte warte mindestens eine Stunde oder versuche es später erneut.";
  }
  if (message.includes("already registered") || message.includes("already been registered")) {
    return "Für diese E-Mail besteht bereits ein Konto. Bitte einloggen.";
  }
  if (message.includes("invalid login credentials")) {
    return "E-Mail oder Passwort ist nicht korrekt.";
  }
  if (message.includes("email not confirmed")) {
    return "Bitte bestätige zuerst deine E-Mail-Adresse.";
  }
  if (message.includes("password")) {
    return "Das Passwort erfüllt die Sicherheitsanforderungen nicht.";
  }
  return error?.message || "Die Anfrage konnte nicht verarbeitet werden.";
}

function startCooldown(button) {
  clearInterval(cooldownTimer);
  let remaining = AUTH_COOLDOWN_SECONDS;
  const originalLabel = button.dataset.label || button.textContent;
  button.disabled = true;
  button.textContent = `Erneut in ${remaining}s`;
  cooldownTimer = setInterval(() => {
    remaining -= 1;
    button.textContent = `Erneut in ${remaining}s`;
    if (remaining <= 0) {
      clearInterval(cooldownTimer);
      button.textContent = originalLabel;
      button.disabled = false;
    }
  }, 1000);
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    mode = tab.dataset.mode;
    tabs.forEach((item) => item.classList.toggle("active", item === tab));
    const registering = mode === "register";
    nameField.hidden = !registering;
    document.querySelector("#display-name").required = registering;
    document.querySelector("#auth-eyebrow").textContent =
      registering ? "Neu bei StickerHub" : "Willkommen zurück";
    document.querySelector("#auth-title").textContent =
      registering ? "Konto erstellen" : "Einloggen";
    submitButton.textContent = registering ? "Registrieren" : "Einloggen";
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoading(submitButton, true);
  try {
    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;
    if (mode === "register") {
      const name = document.querySelector("#display-name").value.trim();
      const result = await store.signUp(email, password, name);
      if (!result.session && !store.demoMode) {
        toast("Bestätigungslink wurde gesendet. Bitte prüfe auch den Spam-Ordner.");
        setLoading(submitButton, false);
        startCooldown(submitButton);
        return;
      }
    } else {
      await store.signIn(email, password);
    }
    location.href = "dashboard.html";
  } catch (error) {
    const isRateLimit =
      Number(error?.status || 0) === 429 ||
      String(error?.message || "").toLowerCase().includes("rate limit");
    toast(authErrorMessage(error), "error");
    if (isRateLimit) {
      setLoading(submitButton, false);
      startCooldown(submitButton);
    }
  } finally {
    if (!submitButton.disabled || submitButton.textContent === "Wird geladen...") {
      setLoading(submitButton, false);
    }
  }
});

magicButton.addEventListener("click", async () => {
  const email = document.querySelector("#email").value.trim();
  if (!email) {
    toast("Bitte zuerst deine E-Mail eingeben.", "error");
    return;
  }
  setLoading(magicButton, true);
  try {
    await store.sendMagicLink(email);
    if (store.demoMode) location.href = "dashboard.html";
    else {
      toast("Magic Link wurde versendet. Bitte prüfe auch den Spam-Ordner.");
      setLoading(magicButton, false);
      startCooldown(magicButton);
    }
  } catch (error) {
    const isRateLimit =
      Number(error?.status || 0) === 429 ||
      String(error?.message || "").toLowerCase().includes("rate limit");
    toast(authErrorMessage(error), "error");
    if (isRateLimit) {
      setLoading(magicButton, false);
      startCooldown(magicButton);
    }
  } finally {
    if (!magicButton.disabled || magicButton.textContent === "Wird geladen...") {
      setLoading(magicButton, false);
    }
  }
});
