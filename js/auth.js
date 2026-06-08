import { store } from "./store.js";
import { setLoading, toast } from "./ui.js";

const form = document.querySelector("#auth-form");
const tabs = document.querySelectorAll(".auth-tab");
const nameField = document.querySelector("#name-field");
const submitButton = document.querySelector("#submit-button");
const magicButton = document.querySelector("#magic-link");
let mode = "login";

document.querySelector("#demo-note").hidden = !store.demoMode;

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
        toast("Bestätigungslink wurde per E-Mail gesendet.");
        return;
      }
    } else {
      await store.signIn(email, password);
    }
    location.href = "dashboard.html";
  } catch (error) {
    toast(error.message, "error");
  } finally {
    setLoading(submitButton, false);
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
    else toast("Magic Link wurde versendet.");
  } catch (error) {
    toast(error.message, "error");
  } finally {
    setLoading(magicButton, false);
  }
});

