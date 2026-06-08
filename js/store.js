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
      options: { data: { display_name: displayName } }
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
          profiles: { display_name: index % 2 ? "Nina Goal" : "Marco Cards" }
        }));
      return generated.filter((trade) =>
        (!filters.country || trade.stickers.countries.code === filters.country) &&
        (!filters.number || String(trade.stickers.sticker_number) === String(filters.number))
      );
    }
    let query = db
      .from("trades")
      .select("*, stickers(*, countries(*)), profiles!trades_owner_user_id_fkey(display_name)")
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
