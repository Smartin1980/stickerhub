import { store } from "./store.js?v=20260610-4";
import { collectionStats, initials, initShell, setLoading, toast } from "./ui.js?v=20260610-4";

const form = document.querySelector("#profile-form");
const logoutButton = document.querySelector("#logout");
const deleteDialog = document.querySelector("#delete-dialog");
const deleteForm = document.querySelector("#delete-account-form");
let profile;

function setAvatar() {
  const avatar = document.querySelector("#profile-avatar");
  avatar.replaceChildren();
  if (profile.avatar_url) {
    const image = document.createElement("img");
    image.src = profile.avatar_url;
    image.alt = "";
    image.addEventListener("error", () => {
      avatar.replaceChildren(document.createTextNode(initials(profile.display_name)));
    }, { once: true });
    avatar.append(image);
  } else {
    avatar.textContent = initials(profile.display_name);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector('[type="submit"]');
  setLoading(button, true);
  try {
    profile = await store.updateProfile({
      display_name: document.querySelector("#display-name").value.trim(),
      avatar_url: document.querySelector("#avatar-url").value.trim() || null,
      pdf_number_font_size: Number(document.querySelector("#pdf-number-font-size").value)
    });
    document.querySelector("#profile-name").textContent = profile.display_name;
    setAvatar();
    toast("Profil wurde gespeichert.");
  } catch (error) {
    toast(error.message, "error");
  } finally {
    setLoading(button, false);
  }
});

logoutButton.addEventListener("click", async () => {
  await store.signOut();
  location.href = "login.html";
});

document.querySelector("#open-delete-dialog").addEventListener("click", () => {
  document.querySelector("#delete-confirmation").value = "";
  deleteDialog.showModal();
});

document.querySelector("#cancel-delete").addEventListener("click", () => {
  deleteDialog.close();
});

deleteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (document.querySelector("#delete-confirmation").value.trim().toUpperCase() !== "LÖSCHEN") {
    toast("Bitte gib LÖSCHEN vollständig ein.", "error");
    return;
  }
  const button = document.querySelector("#confirm-delete");
  setLoading(button, true, "Wird gelöscht...");
  try {
    await store.deleteAccount();
    location.href = "index.html";
  } catch (error) {
    toast(error.message, "error");
    setLoading(button, false);
  }
});

async function loadProfile() {
  try {
    profile = await initShell("profile");
    if (!profile) return;
    const { stickers } = await store.getCollection();
    const stats = collectionStats(stickers);
    document.querySelector("#profile-name").textContent = profile.display_name;
    document.querySelector("#profile-email").textContent = profile.email;
    document.querySelector("#display-name").value = profile.display_name;
    document.querySelector("#avatar-url").value = profile.avatar_url || "";
    document.querySelector("#pdf-number-font-size").value =
      String(profile.pdf_number_font_size || 9);
    document.querySelector("#completion").textContent = `${stats.completion}%`;
    document.querySelector("#progress").style.width = `${stats.completion}%`;
    document.querySelector("#missing").textContent = stats.missing;
    document.querySelector("#duplicate").textContent = stats.duplicate;
    setAvatar();
  } catch (error) {
    toast(error.message, "error");
  }
}

loadProfile();
