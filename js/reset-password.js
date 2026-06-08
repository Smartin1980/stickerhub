import { store } from "./store.js?v=20260608-2";
import { setLoading, toast } from "./ui.js";

const form = document.querySelector("#reset-form");
const copy = document.querySelector("#reset-copy");
const backLink = document.querySelector("#back-to-login");
const submitButton = document.querySelector("#reset-submit");

function showInvalidLink() {
  copy.textContent =
    "Dieser Link ist ungültig oder abgelaufen. Fordere auf der Loginseite einen neuen Link an.";
  form.hidden = true;
  backLink.hidden = false;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = document.querySelector("#new-password").value;
  const confirmation = document.querySelector("#confirm-password").value;

  if (password !== confirmation) {
    toast("Die beiden Passwörter stimmen nicht überein.", "error");
    return;
  }

  setLoading(submitButton, true, "Wird gespeichert...");
  try {
    await store.updatePassword(password);
    copy.textContent = "Dein Passwort wurde geändert. Du kannst dich jetzt damit anmelden.";
    form.hidden = true;
    backLink.hidden = false;
    toast("Passwort erfolgreich gespeichert.");
  } catch (error) {
    const message = String(error?.message || "");
    if (message.toLowerCase().includes("password")) {
      toast("Das Passwort erfüllt die Sicherheitsanforderungen nicht.", "error");
    } else {
      toast(message || "Das Passwort konnte nicht gespeichert werden.", "error");
    }
  } finally {
    setLoading(submitButton, false);
  }
});

async function initializeRecovery() {
  if (store.demoMode) {
    copy.textContent = "Demo-Modus: Du kannst ein neues Passwort festlegen.";
    form.hidden = false;
    return;
  }

  try {
    const session = await store.getRecoverySession();
    if (!session?.user) {
      showInvalidLink();
      return;
    }
    copy.textContent = "Wähle ein neues Passwort mit mindestens acht Zeichen.";
    form.hidden = false;
  } catch {
    showInvalidLink();
  }
}

initializeRecovery();
