import { COUNTRY_CODES, COUNTRY_NAMES } from "./data.js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config.js";

const STORAGE_KEY = "stickerhub-demo";
const DEMO_USER = {
  id: "demo-user",
  email: "demo@stickerhub.ch",
  display_name: "Demo Sammler",
  role: "admin",
  avatar_url: ""
};

let supabaseClient = null;

function initialDemoState() {
  const countries = COUNTRY_CODES.map((code, index) => ({
    id: index + 1,
    code,
    name: COUNTRY_NAMES[code] || code
  }));
  const stickers = countries.flatMap((country) =>
    Array.from({ length: 20 }, (_, index) => ({
      id: `${country.code}-${index + 1}`,
      country_id: country.id,
      sticker_number: index + 1,
      countries: country
    }))
  );
  const statuses = {};
  stickers.forEach((sticker, index) => {
    if (index % 7 === 0) statuses[sticker.id] = "duplicate";
    else if (index % 3 !== 0) statuses[sticker.id] = "owned";
    else statuses[sticker.id] = "missing";
  });
  return { user: DEMO_USER, countries, stickers, statuses, trades: [] };
}

function readDemo() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  const state = initialDemoState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

function writeDemo(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function client() {
  if (!isSupabaseConfigured) return null;
  if (supabaseClient) return supabaseClient;
  if (!window.supabase) throw new Error("Supabase SDK wurde nicht geladen.");
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseClient;
}

export const store = {
  get demoMode() {
    return !isSupabaseConfigured;
  },

  async getSession() {
    const db = await client();
    if (!db) return { user: readDemo().user };
    const { data, error } = await db.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async signUp(email, password, displayName) {
    const db = await client();
    if (!db) {
      const state = readDemo();
      state.user = { ...DEMO_USER, email, display_name: displayName || "Sammler" };
      writeDemo(state);
      return { user: state.user };
    }
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: new URL("login.html", location.href).href
      }
    });
    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    const db = await client();
    if (!db) return { user: readDemo().user };
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async sendMagicLink(email) {
    const db = await client();
    if (!db) return { user: readDemo().user };
    const { data, error } = await db.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: new URL("dashboard.html", location.href).href }
    });
    if (error) throw error;
    return data;
  },

  async sendPasswordReset(email) {
    const db = await client();
    if (!db) return;
    const { data, error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: new URL("reset-password.html", location.href).href
    });
    if (error) throw error;
    return data;
  },

  async getRecoverySession() {
    const db = await client();
    if (!db) return { user: readDemo().user };

    const code = new URLSearchParams(location.search).get("code");
    if (code) {
      const { error } = await db.auth.exchangeCodeForSession(code);
      if (error) throw error;
      history.replaceState({}, document.title, location.pathname);
    }

    const { data, error } = await db.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async updatePassword(password) {
    const db = await client();
    if (!db) return;
    const { data, error } = await db.auth.updateUser({ password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const db = await client();
    if (db) await db.auth.signOut();
  },

  async getProfile() {
    const db = await client();
    if (!db) return readDemo().user;
    const session = await this.getSession();
    if (!session?.user) return null;
    const { data, error } = await db
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    if (error) throw error;
    return data;
  },

  async getFeatureFlags() {
    const db = await client();
    if (!db) return { collection_import: true, missing_list_export: true };
    const { data, error } = await db.rpc("get_my_feature_flags");
    if (error) throw error;
    return Object.fromEntries(data.map((flag) => [flag.key, flag.enabled]));
  },

  async isFeatureEnabled(featureKey) {
    const flags = await this.getFeatureFlags();
    return Boolean(flags[featureKey]);
  },

  async getAdminUsers() {
    const db = await client();
    if (!db) return [readDemo().user];
    const { data, error } = await db.rpc("admin_list_users");
    if (error) throw error;
    return data;
  },

  async setAdminUserAccess(userId, friendsFamily, role) {
    const db = await client();
    if (!db) return;
    const { error } = await db.rpc("admin_set_user_access", {
      target_user_id: userId,
      friends_family: friendsFamily,
      target_role: role
    });
    if (error) throw error;
  },

  async deleteAdminUser(userId) {
    const db = await client();
    if (!db) throw new Error("Die Benutzerverwaltung benötigt eine Supabase-Konfiguration.");
    const { error } = await db.rpc("admin_delete_user", { target_user_id: userId });
    if (error) throw error;
  },

  async getAdminFeatureFlags() {
    const db = await client();
    if (!db) {
      return [
        {
          key: "collection_import",
          name: "Sammlungsimport",
          description: "CSV-Import und mobile Fotoerkennung.",
          enabled_friends_family: true,
          enabled_public: true
        },
        {
          key: "missing_list_export",
          name: "Fehllisten-Export",
          description: "Fehlende Sticker als PDF exportieren oder über WhatsApp teilen.",
          enabled_friends_family: true,
          enabled_public: false
        }
      ];
    }
    const { data, error } = await db.rpc("admin_list_feature_flags");
    if (error) throw error;
    return data;
  },

  async updateAdminFeatureFlag(featureKey, friendsFamilyEnabled, publicEnabled) {
    const db = await client();
    if (!db) return;
    const { error } = await db.rpc("admin_update_feature_flag", {
      feature_key: featureKey,
      friends_family_enabled: friendsFamilyEnabled,
      public_enabled: publicEnabled
    });
    if (error) throw error;
  },

  async getAdminCatalog() {
    const db = await client();
    if (!db) {
      const state = readDemo();
      return { countries: state.countries, stickers: state.stickers };
    }
    const [{ data: countries, error: countriesError }, { data: stickers, error: stickersError }] =
      await Promise.all([
        db.from("countries").select("*").order("name"),
        db.from("stickers").select("*").order("sticker_number")
      ]);
    if (countriesError) throw countriesError;
    if (stickersError) throw stickersError;
    return { countries, stickers };
  },

  async createCountry(code, name) {
    const db = await client();
    if (!db) throw new Error("Die Katalogpflege benötigt eine Supabase-Konfiguration.");
    const { data, error } = await db
      .from("countries")
      .insert({ code: code.toUpperCase(), name })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateCountry(countryId, code, name) {
    const db = await client();
    if (!db) throw new Error("Die Katalogpflege benötigt eine Supabase-Konfiguration.");
    const { data, error } = await db
      .from("countries")
      .update({ code: code.toUpperCase(), name })
      .eq("id", countryId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteCountry(countryId) {
    const db = await client();
    if (!db) throw new Error("Die Katalogpflege benötigt eine Supabase-Konfiguration.");
    const { error } = await db.from("countries").delete().eq("id", countryId);
    if (error) throw error;
  },

  async createSticker(countryId, stickerNumber) {
    const db = await client();
    if (!db) throw new Error("Die Katalogpflege benötigt eine Supabase-Konfiguration.");
    const { data, error } = await db
      .from("stickers")
      .insert({ country_id: countryId, sticker_number: stickerNumber })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateSticker(stickerId, stickerNumber) {
    const db = await client();
    if (!db) throw new Error("Die Katalogpflege benötigt eine Supabase-Konfiguration.");
    const { data, error } = await db
      .from("stickers")
      .update({ sticker_number: stickerNumber })
      .eq("id", stickerId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteSticker(stickerId) {
    const db = await client();
    if (!db) throw new Error("Die Katalogpflege benötigt eine Supabase-Konfiguration.");
    const { error } = await db.from("stickers").delete().eq("id", stickerId);
    if (error) throw error;
  },

  async updateProfile(changes) {
    const db = await client();
    if (!db) {
      const state = readDemo();
      state.user = { ...state.user, ...changes };
      writeDemo(state);
      return state.user;
    }
    const session = await this.getSession();
    const { data, error } = await db
      .from("profiles")
      .update(changes)
      .eq("id", session.user.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteAccount() {
    const db = await client();
    if (!db) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const { error } = await db.rpc("delete_own_account");
    if (error) throw error;
    await db.auth.signOut({ scope: "local" });
  },

  async getCollection() {
    const db = await client();
    if (!db) {
      const state = readDemo();
      return {
        countries: state.countries,
        stickers: state.stickers.map((sticker) => ({
          ...sticker,
          status: state.statuses[sticker.id] || "missing"
        }))
      };
    }
    const session = await this.getSession();
    const [{ data: countries, error: countriesError }, { data: stickers, error: stickersError }] =
      await Promise.all([
        db.from("countries").select("*").order("name"),
        db.from("stickers").select("*, countries(*)").order("sticker_number")
      ]);
    if (countriesError) throw countriesError;
    if (stickersError) throw stickersError;
    const { data: userStickers, error } = await db
      .from("user_stickers")
      .select("sticker_id,status")
      .eq("user_id", session.user.id);
    if (error) throw error;
    const statuses = Object.fromEntries(userStickers.map((item) => [item.sticker_id, item.status]));
    return {
      countries,
      stickers: stickers.map((sticker) => ({
        ...sticker,
        status: statuses[sticker.id] || "missing"
      }))
    };
  },

  async getCountryFavorites() {
    const db = await client();
    if (!db) {
      const saved = JSON.parse(localStorage.getItem(`${STORAGE_KEY}-country-favorites`) || "[]");
      return saved;
    }
    const session = await this.getSession();
    const { data, error } = await db
      .from("user_country_favorites")
      .select("country_id")
      .eq("user_id", session.user.id);
    if (error) throw error;
    return data.map((item) => item.country_id);
  },

  async setCountryFavorite(countryId, favorite) {
    const db = await client();
    if (!db) {
      const key = `${STORAGE_KEY}-country-favorites`;
      const saved = new Set(JSON.parse(localStorage.getItem(key) || "[]").map(String));
      if (favorite) saved.add(String(countryId));
      else saved.delete(String(countryId));
      localStorage.setItem(key, JSON.stringify([...saved]));
      return;
    }
    const session = await this.getSession();
    if (favorite) {
      const { error } = await db.from("user_country_favorites").upsert(
        { user_id: session.user.id, country_id: countryId },
        { onConflict: "user_id,country_id" }
      );
      if (error) throw error;
      return;
    }
    const { error } = await db
      .from("user_country_favorites")
      .delete()
      .eq("user_id", session.user.id)
      .eq("country_id", countryId);
    if (error) throw error;
  },

  async setStickerStatus(stickerId, status) {
    const db = await client();
    if (!db) {
      const state = readDemo();
      state.statuses[stickerId] = status;
      writeDemo(state);
      return;
    }
    const session = await this.getSession();
    const { error } = await db.from("user_stickers").upsert(
      { user_id: session.user.id, sticker_id: stickerId, status },
      { onConflict: "user_id,sticker_id" }
    );
    if (error) throw error;
  },

  async getTrades(filters = {}) {
    const db = await client();
    if (!db) {
      const state = readDemo();
      const generated = state.stickers
        .filter((sticker) => state.statuses[sticker.id] === "duplicate")
        .slice(0, 24)
        .map((sticker, index) => ({
          id: `demo-trade-${index}`,
          owner_user_id: "demo-user",
          sticker_id: sticker.id,
          status: "available",
          stickers: sticker,
          profiles: {
            display_name: index % 2 ? "Nina Goal" : state.user.display_name,
            avatar_url: index % 2 ? "" : state.user.avatar_url
          }
        }));
      return generated.filter((trade) =>
        (!filters.country || trade.stickers.countries.code === filters.country) &&
        (!filters.number || String(trade.stickers.sticker_number) === String(filters.number))
      );
    }
    let query = db
      .from("trades")
      .select("*, stickers(*, countries(*)), profiles!trades_owner_user_id_fkey(display_name,avatar_url)")
      .eq("status", "available");
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return data.filter((trade) =>
      (!filters.country || trade.stickers.countries.code === filters.country) &&
      (!filters.number || String(trade.stickers.sticker_number) === String(filters.number))
    );
  },

  async publishTrade(stickerId) {
    const db = await client();
    if (!db) return;
    const session = await this.getSession();
    const { error } = await db.from("trades").upsert(
      { owner_user_id: session.user.id, sticker_id: stickerId, status: "available" },
      { onConflict: "owner_user_id,sticker_id" }
    );
    if (error) throw error;
  },

  async removeTrade(stickerId) {
    const db = await client();
    if (!db) return;
    const session = await this.getSession();
    const { error } = await db
      .from("trades")
      .delete()
      .eq("owner_user_id", session.user.id)
      .eq("sticker_id", stickerId);
    if (error) throw error;
  },

  async importRows(rows) {
    const db = await client();
    if (!db) throw new Error("Der CSV-Import benötigt eine Supabase-Konfiguration.");
    const { data, error } = await db.rpc("import_stickers", { rows });
    if (error) throw error;
    return data;
  },

  async importUserCollection(rows, importMode) {
    const db = await client();
    if (!db) {
      const state = readDemo();
      if (importMode === "missing_replace") {
        state.stickers.forEach((sticker) => {
          state.statuses[sticker.id] = "owned";
        });
      }
      rows.forEach((row) => {
        const sticker = state.stickers.find((item) =>
          item.countries.code === row.country_code &&
          item.sticker_number === row.sticker_number
        );
        if (sticker) {
          state.statuses[sticker.id] =
            importMode === "missing_replace" ? "missing" : row.status;
        }
      });
      writeDemo(state);
      return { imported: rows.length, mode: importMode };
    }
    const { data, error } = await db.rpc("import_user_collection", {
      rows,
      import_mode: importMode
    });
    if (error) throw error;
    return data;
  },

  async getStatistics() {
    const db = await client();
    if (!db) {
      return [
        { display_name: "Alex Sticker", completion: 96, duplicates: 21, missing: 40 },
        { display_name: "Nina Goal", completion: 91, duplicates: 34, missing: 55 },
        { display_name: "Marco Cards", completion: 87, duplicates: 18, missing: 65 },
        { display_name: "Demo Sammler", completion: 67, duplicates: 143, missing: 334 }
      ];
    }
    const { data, error } = await db.rpc("get_user_statistics");
    if (error) throw error;
    return data;
  }
};
