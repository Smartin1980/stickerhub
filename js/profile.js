import { store } from "./store.js";
import { collectionStats, initials, initShell, setLoading, toast } from "./ui.js";

const form = document.querySelector("#profile-form");
const logoutButton = document.querySelector("#logout");
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
      avatar_url: document.querySelector("#avatar-url").value.trim() || null
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
