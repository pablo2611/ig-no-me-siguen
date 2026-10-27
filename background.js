// background.js
// v2.6 - Exacto sin descargar seguidores.
// Lee solo las cuentas que seguís y verifica reciprocidad por cuenta cuando el endpoint por tandas no sirve.
// Muestra y exporta únicamente usuarios confirmados como: "yo lo sigo, esa cuenta no me sigue".
// Exporta TXT y HTML clickeable para revisión manual.

const IG_APP_ID = "936619743392459";
const BASE = "https://www.instagram.com";
const PAGE_SIZE = 50;
const CHECK_BATCH_SIZE = 50;
const RELATION_PAGE_DELAY = [900, 2200];
const CHECK_BATCH_DELAY = [1200, 2600];
const SINGLE_CHECK_DELAY = [650, 1400];
const SINGLE_LONG_PAUSE_EVERY = 90;
const SINGLE_LONG_PAUSE = [9000, 17000];
const RATE_LIMIT_COOLDOWN = [60000, 120000];
const DEFAULT_RETRIES = 2;
const STATE_KEY = "ig_analysis_state_v26";
const PENDING_EXPORT_KEY = "ig_pending_export_v26";
const ANALYSIS_CHECKPOINT_KEY = "ig_analysis_checkpoint_v29";
const UNFOLLOW_JOB_KEY = "ig_unfollow_job_v283";
const UNFOLLOW_LOG_KEY = "ig_unfollow_log_v27";
const UNFOLLOW_ALARM_PREFIX = "ig_unfollow_next_v283";
const SAFETY_LOCK_KEY = "ig_safety_lock_v284";
const UNFOLLOW_WINDOW_MS = 24 * 60 * 60 * 1000;
const UNFOLLOW_WINDOW_LIMIT = 12;
const UNFOLLOW_RECOMMENDED_LIMIT = 5;
const UNFOLLOW_DELAY = [6 * 60 * 1000, 12 * 60 * 1000];
const SAFETY_LOCK_MS = 48 * 60 * 60 * 1000;
const CONTACT_EMAIL = "soporte@example.invalid";

let activeRun = null;
let activeCookieStoreId = null;
let currentCookieStoreId = null;
let stateCacheByKey = new Map();

class CancelledError extends Error {
  constructor(message = "Análisis detenido por el usuario.") {
    super(message);
    this.name = "CancelledError";
  }
}

function now() {
  return Date.now();
}

function emptyState(message = "Listo.") {
  return {
    version: 26,
    status: "idle",
    phase: "idle",
    message,
    account: null,
    progress: null,
    counts: null,
    result: null,
    error: null,
    startedAt: null,
    updatedAt: now(),
  };
}

function getActiveStoreId() {
  return activeCookieStoreId || currentCookieStoreId || "0";
}

function scopedKey(base) {
  return `${base}:${getActiveStoreId()}`;
}

function scopedKeyForStore(base, storeId) {
  return `${base}:${storeId || "0"}`;
}

async function resolveCookieStoreId(context = {}, sender = {}) {
  const tabId = Number(context?.tabId ?? sender?.tab?.id);
  if (Number.isFinite(tabId) && chrome.cookies?.getAllCookieStores) {
    try {
      const stores = await chrome.cookies.getAllCookieStores();
      const match = stores.find((store) => Array.isArray(store.tabIds) && store.tabIds.includes(tabId));
      if (match?.id) return match.id;
    } catch (_) {}
  }
  if (context?.incognito && chrome.cookies?.getAllCookieStores) {
    try {
      const stores = await chrome.cookies.getAllCookieStores();
      const incognitoStore = stores.find((store) => store.id && store.id !== "0");
      if (incognitoStore?.id) return incognitoStore.id;
    } catch (_) {}
  }
  return "0";
}

async function withMessageContext(msg, sender, fn) {
  currentCookieStoreId = await resolveCookieStoreId(msg?.context, sender);
  return fn();
}

function safeSendMessage(payload) {
  try {
    chrome.runtime.sendMessage(payload, () => void chrome.runtime.lastError);
  } catch (_) {}
}

function notify(title, message) {
  if (!chrome.notifications) return;
  try {
    chrome.notifications.create(
      { type: "basic", iconUrl: "icon128.png", title, message, priority: 0 },
      () => void chrome.runtime.lastError
    );
  } catch (_) {}
}

async function readState() {
  const key = scopedKey(STATE_KEY);
  if (stateCacheByKey.has(key)) return stateCacheByKey.get(key);
  const data = await chrome.storage.session.get(key);
  const state = data[key] || emptyState();
  stateCacheByKey.set(key, state);
  return state;
}

async function writeState(state) {
  const key = scopedKey(STATE_KEY);
  const next = { ...state, contextStoreId: getActiveStoreId(), updatedAt: now() };
  stateCacheByKey.set(key, next);
  await chrome.storage.session.set({ [key]: next });
  safeSendMessage({ type: "STATE", state: next });
  return next;
}

async function patchState(patch) {
  const current = await readState();
  return writeState({ ...current, ...patch });
}

async function clearTempState(reason = "manual") {
  if (activeRun) stopActiveRun();
  activeRun = null;
  const keys = [scopedKey(STATE_KEY), scopedKey(PENDING_EXPORT_KEY), scopedKey(ANALYSIS_CHECKPOINT_KEY)];
  stateCacheByKey.delete(scopedKey(STATE_KEY));
  await chrome.storage.session.remove(keys);
  safeSendMessage({ type: "CLEARED", reason });
}

async function readAnalysisCheckpoint() {
  const key = scopedKey(ANALYSIS_CHECKPOINT_KEY);
  const data = await chrome.storage.session.get(key);
  return data[key] || null;
}

async function writeAnalysisCheckpoint(checkpoint) {
  const key = scopedKey(ANALYSIS_CHECKPOINT_KEY);
  await chrome.storage.session.set({ [key]: { ...checkpoint, contextStoreId: getActiveStoreId(), updatedAt: now() } });
}

async function clearAnalysisCheckpoint() {
  await chrome.storage.session.remove(scopedKey(ANALYSIS_CHECKPOINT_KEY));
}

async function readSafetyLock(storeId = getActiveStoreId()) {
  const key = scopedKeyForStore(SAFETY_LOCK_KEY, storeId);
  const data = await chrome.storage.local.get(key);
  const lock = data[key] || null;
  if (!lock?.until || Number(lock.until) <= now()) {
    if (lock) await chrome.storage.local.remove(key);
    return null;
  }
  return lock;
}

async function writeSafetyLock(reason, guard = "manual", durationMs = SAFETY_LOCK_MS, storeId = getActiveStoreId()) {
  const key = scopedKeyForStore(SAFETY_LOCK_KEY, storeId);
  const lock = { reason: reason || "Pausa de seguridad activa.", guard, until: now() + durationMs, createdAt: now(), storeId };
  await chrome.storage.local.set({ [key]: lock });
  const state = await readState().catch(() => null);
  if (state) {
    await writeState({
      ...state,
      safety: { locked: true, lockedUntil: lock.until, reason: lock.reason, guard },
      message: reason || "Pausa de seguridad activa.",
    });
  }
  return lock;
}

async function clearSafetyLock(storeId = getActiveStoreId()) {
  await chrome.storage.local.remove(scopedKeyForStore(SAFETY_LOCK_KEY, storeId));
}

async function stateWithSafety(state) {
  const lock = await readSafetyLock();
  return {
    ...state,
    safety: lock
      ? { locked: true, lockedUntil: lock.until, reason: lock.reason, guard: lock.guard }
      : { locked: false },
  };
}

function createRun(kind) {
  return {
    kind,
    cookieStoreId: getActiveStoreId(),
    cancelled: false,
    controller: typeof AbortController !== "undefined" ? new AbortController() : null,
  };
}

function stopActiveRun() {
  if (!activeRun) return false;
  activeRun.cancelled = true;
  try {
    activeRun.controller?.abort();
  } catch (_) {}
  return true;
}

function throwIfCancelled(run) {
  if (run?.cancelled) throw new CancelledError();
}

function sleep(ms, run) {
  return new Promise((resolve, reject) => {
    if (run?.cancelled) {
      reject(new CancelledError());
      return;
    }
    let elapsed = 0;
    const step = 250;
    const timer = setInterval(() => {
      if (run?.cancelled) {
        clearInterval(timer);
        reject(new CancelledError());
        return;
      }
      elapsed += step;
      if (elapsed >= ms) {
        clearInterval(timer);
        resolve();
      }
    }, step);
  });
}

function randomMs(minMs, maxMs) {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

function randomDelay(minMs, maxMs, run) {
  return sleep(randomMs(minMs, maxMs), run);
}

async function getCookie(name) {
  try {
    const cookie = await chrome.cookies.get({ url: BASE, name, storeId: getActiveStoreId() });
    return cookie ? cookie.value : null;
  } catch (_) {
    throw new Error("No se pudieron leer las cookies de instagram.com.");
  }
}

async function getAuthHeaders(extra = {}) {
  const csrftoken = await getCookie("csrftoken");
  const sessionid = await getCookie("sessionid");
  if (!csrftoken || !sessionid) {
    throw new Error("No hay sesión activa. Abrí instagram.com, iniciá sesión y reintentá.");
  }
  return {
    "x-ig-app-id": IG_APP_ID,
    "x-csrftoken": csrftoken,
    "x-requested-with": "XMLHttpRequest",
    accept: "*/*",
    ...extra,
  };
}

async function getOwnUserId() {
  const dsUserId = await getCookie("ds_user_id");
  if (!dsUserId) throw new Error("No se pudo identificar la cuenta activa.");
  return String(dsUserId);
}

function bodyTextFromPayload(payload) {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  try {
    return JSON.stringify(payload);
  } catch (_) {
    return String(payload);
  }
}

function detectInstagramGuard(status, payload) {
  // Inspect only error metadata, never usernames, biographies or other normal response data.
  const failed = status >= 400 || (payload && typeof payload === "object" && ["fail", "error"].includes(payload.status));
  const fields = payload && typeof payload === "object"
    ? [payload.error_type, payload.error_code, ...(failed ? [payload.message, payload.error_title, payload.error_body] : [])]
    : (status >= 400 ? [payload] : []);
  const text = fields.filter(value => typeof value === "string").join(" ").toLowerCase();
  if (status === 429 || text.includes("rate_limit") || text.includes("too many requests")) {
    return {
      type: "rate_limit",
      retryable: true,
      message: "Instagram pidió bajar la frecuencia. La extensión pausó antes de reintentar.",
    };
  }
  if (
    text.includes("challenge_required") ||
    text.includes("checkpoint_required")
  ) {
    return {
      type: "challenge",
      retryable: false,
      message: "Instagram pidió una verificación. La extensión se detuvo; completá la verificación manualmente en Instagram.",
    };
  }
  if (text.includes("login_required") || text.includes("require_login") || status === 401) {
    return {
      type: "login_required",
      retryable: false,
      message: "Instagram pidió iniciar sesión de nuevo. Recargá Instagram, verificá la sesión y reintentá.",
    };
  }
  if (
    status === 403 ||
    text.includes("feedback_required") ||
    text.includes("sentry_block") ||
    text.includes("please wait") ||
    text.includes("temporarily blocked") ||
    text.includes("try again later")
  ) {
    return {
      type: "soft_block",
      retryable: false,
      message: "Instagram limitó la consulta. La extensión se detuvo para no insistir.",
    };
  }
  return null;
}

function statusMessage(status, payload) {
  const guard = detectInstagramGuard(status, payload);
  if (guard) return guard.message;
  if (status === 404) return "Instagram no encontró el recurso. Puede haber cambiado un endpoint interno.";
  if (status === 405) return "Instagram rechazó el método de consulta. Se intentará otro método si está disponible.";
  return `Instagram respondió con estado inesperado: ${status}`;
}

async function readResponsePayload(res) {
  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  try {
    if (contentType.includes("application/json")) return await res.json();
    return await res.text();
  } catch (_) {
    return "";
  }
}

async function requestJsonWithRetry(url, options, run, retries = DEFAULT_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    throwIfCancelled(run);
    let res;
    try {
      res = await fetch(url, {
        credentials: "include",
        signal: run?.controller?.signal,
        ...options,
      });
    } catch (err) {
      if (run?.cancelled || err?.name === "AbortError") throw new CancelledError();
      throw new Error("No se pudo conectar a Instagram.");
    }

    throwIfCancelled(run);
    const payload = await readResponsePayload(res);
    const guard = detectInstagramGuard(res.status, payload);
    const apiFailure = payload && typeof payload === "object" && (payload.status === "fail" || payload.status === "error");
    if (res.ok && !guard && !apiFailure) {
      if (payload && typeof payload === "object") return payload;
      throw new Error("Instagram devolvió una respuesta inesperada. Inicia sesión y vuelve a intentarlo.");
    }

    if (guard) {
      await writeSafetyLock(guard.message, guard.type);
      await clearUnfollowJob(getActiveStoreId());
      const previous = await readState().catch(() => null);
      if (previous) {
        await writeState({
          ...previous,
          status: "error",
          phase: "safety_lock",
          error: guard.message,
          message: "Pausa de seguridad activa. Automatico bloqueado 48h.",
          unfollow: { ...(previous.unfollow || {}), running: false, safetyStopped: true, updatedAt: now() },
        });
      }
    }

    const endpoint = (() => { try { return new URL(url).pathname.replace(/\/\d+\//g, "/[id]/"); } catch (_) { return "consulta"; } })();
    const err = new Error((apiFailure && !guard ? "Instagram rechazó la solicitud." : statusMessage(res.status, payload)) + ` (${res.status}, ${endpoint})`);
    err.status = res.status;
    err.guard = guard?.type || null;
    throw err;
  }
  throw new Error("Instagram mantuvo el límite. Detenido por seguridad; reintentá más tarde.");
}

function fetchJsonWithRetry(url, headers, run, retries = DEFAULT_RETRIES) {
  return requestJsonWithRetry(url, { method: "GET", headers }, run, retries);
}

async function postFormJsonWithRetry(url, headers, form, run, retries = DEFAULT_RETRIES) {
  const body = new URLSearchParams(form);
  return requestJsonWithRetry(
    url,
    {
      method: "POST",
      headers: { ...headers, "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: body.toString(),
    },
    run,
    retries
  );
}

function firstNumber(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}


function normalizeImageUrl(value) {
  if (!value) return "";
  let s = String(value).trim();
  try { s = JSON.parse(`"${s.replace(/"/g, '\\"')}"`); } catch (_) {}
  return s
    .replace(/\\\//g, "/")
    .replace(/\\u0026/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, "")
    .trim();
}

function firstString(...values) {
  for (const value of values) {
    const s = normalizeImageUrl(value);
    if (s) return s;
  }
  return "";
}

function extractJsonString(text, key) {
  if (!text || !key) return "";
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`"${escaped}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, "i"),
    new RegExp(`&quot;${escaped}&quot;\\s*:\\s*&quot;([^&]+)&quot;`, "i"),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return normalizeImageUrl(match[1]);
  }
  return "";
}

function extractMetaContent(text, property) {
  if (!text || !property) return "";
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return normalizeImageUrl(match[1]);
  }
  return "";
}

async function requestTextWithRetry(url, options, run, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    throwIfCancelled(run);
    let res;
    try {
      res = await fetch(url, {
        credentials: "include",
        signal: run?.controller?.signal,
        ...options,
      });
    } catch (err) {
      if (run?.cancelled || err?.name === "AbortError") throw new CancelledError();
      if (attempt < retries) continue;
      throw new Error("No se pudo conectar a Instagram.");
    }
    const text = await res.text().catch(() => "");
    if (res.ok) return text;
    const guard = detectInstagramGuard(res.status, text);
    if (guard) {
      await writeSafetyLock(guard.message, guard.type);
      const err = new Error(guard.message);
      err.status = res.status;
      err.guard = guard.type;
      throw err;
    }
    if (attempt >= retries) {
      const err = new Error(statusMessage(res.status, text));
      err.status = res.status;
      err.guard = guard?.type || null;
      throw err;
    }
  }
  return "";
}

async function fetchProfilePageInfo(username, headers, run) {
  const clean = String(username || "").replace(/^@+/, "").trim();
  if (!clean) return null;
  const text = await requestTextWithRetry(`${BASE}/${encodeURIComponent(clean)}/`, {
    method: "GET",
    headers: {
      ...headers,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  }, run, 1);
  const profilePic = firstString(
    extractJsonString(text, "profile_pic_url_hd"),
    extractJsonString(text, "profile_pic_url"),
    extractMetaContent(text, "og:image")
  );
  const fullName = "";
  return profilePic ? { profilePic, fullName } : null;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function fetchImageAsDataUrl(url, run) {
  const clean = normalizeImageUrl(url);
  if (!/^https:\/\//i.test(clean)) return "";
  throwIfCancelled(run);
  try {
    const res = await fetch(clean, {
      method: "GET",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: run?.controller?.signal,
      cache: "force-cache",
    });
    if (!res.ok) return "";
    const contentType = (res.headers.get("content-type") || "image/jpeg").split(";")[0].trim() || "image/jpeg";
    if (!contentType.startsWith("image/")) return "";
    const buffer = await res.arrayBuffer();
    if (!buffer || buffer.byteLength > 180000) return "";
    return `data:${contentType};base64,${arrayBufferToBase64(buffer)}`;
  } catch (err) {
    if (run?.cancelled || err?.name === "AbortError") throw new CancelledError();
    return "";
  }
}

async function hydrateAccountProfilePhoto(account, run) {
  const url = normalizeImageUrl(account?.profilePic || "");
  if (!url || account?.profilePicData) return account;
  const dataUrl = await fetchImageAsDataUrl(url, run);
  return dataUrl ? { ...account, profilePic: url, profilePicData: dataUrl } : { ...account, profilePic: url };
}

async function hydrateUserProfilePhoto(user, run) {
  const url = normalizeImageUrl(user?.profilePic || "");
  if (!url || user?.profilePicData) return user;
  const dataUrl = await fetchImageAsDataUrl(url, run);
  return dataUrl ? { ...user, profilePic: url, profilePicData: dataUrl } : { ...user, profilePic: url };
}

function parseAccountPayload(data, fallbackId) {
  const candidates = [data?.user, data?.data?.user, data?.form_data, data].filter(Boolean);
  for (const u of candidates) {
    const username = u.username || u.user_name || "";
    const followingCount = firstNumber(u.following_count, u.follow_count, u.follows_count, u.edge_follow?.count);
    const followerCount = firstNumber(u.follower_count, u.followers_count, u.edge_followed_by?.count);
    if (username || followingCount !== null || followerCount !== null) {
      return {
        id: String(u.pk || u.id || fallbackId),
        username,
        fullName: u.full_name || u.first_name || "",
        profilePic: u.profile_pic_url_hd || u.profile_pic_url || u.hd_profile_pic_url_info?.url || u.profile_pic_url_info?.url || "",
        followingCount,
        followerCount,
      };
    }
  }
  return null;
}

function mergeAccountInfo(base, extra = {}) {
  const merged = { ...base };
  if (extra.id && (!merged.id || merged.id === "desconocido")) merged.id = String(extra.id);
  if (extra.username) merged.username = String(extra.username).replace(/^@+/, "").trim();
  if (extra.fullName) merged.fullName = extra.fullName;
  if (extra.profilePic) merged.profilePic = normalizeImageUrl(extra.profilePic);
  if (extra.profilePicData) merged.profilePicData = String(extra.profilePicData);
  if (extra.followingCount !== null && extra.followingCount !== undefined) merged.followingCount = extra.followingCount;
  if (extra.followerCount !== null && extra.followerCount !== undefined) merged.followerCount = extra.followerCount;
  return merged;
}

async function getOwnProfileInfo(userId, headers, run) {
  let account = { id: String(userId), username: "", fullName: "", profilePic: "", profilePicData: "", followingCount: null, followerCount: null };
  const urls = [
    `${BASE}/api/v1/users/${encodeURIComponent(userId)}/info/`,
    `${BASE}/api/v1/accounts/current_user/?edit=true`,
  ];

  for (const url of urls) {
    throwIfCancelled(run);
    try {
      const data = await fetchJsonWithRetry(url, headers, run, 1);
      const parsed = parseAccountPayload(data, userId);
      if (parsed) account = mergeAccountInfo(account, parsed);
    } catch (err) {
      if (err instanceof CancelledError) throw err;
      if (err?.guard || [401, 403, 429].includes(err?.status)) throw err;
    }
  }

  // Refuerzo para la foto del perfil: algunos endpoints devuelven conteos sin imagen.
  if (account.username) {
    try {
      const web = await fetchWebProfileInfoStatus(account.username, headers, run);
      account = mergeAccountInfo(account, {
        id: web?.id || web?.pk || account.id,
        username: web?.username || account.username,
        fullName: web?.full_name || account.fullName,
        profilePic: web?.profile_pic_url_hd || web?.profile_pic_url || web?.hd_profile_pic_url_info?.url || account.profilePic,
        followingCount: firstNumber(web?.edge_follow?.count, account.followingCount),
        followerCount: firstNumber(web?.edge_followed_by?.count, account.followerCount),
      });
    } catch (err) {
      if (err instanceof CancelledError) throw err;
      if (err?.guard || [401, 403, 429].includes(err?.status)) throw err;
      // La foto no es crítica; se conserva el resto de la cuenta.
    }
  }

  if (account.username) {
    try {
      const page = await fetchProfilePageInfo(account.username, headers, run);
      if (page?.profilePic) account = mergeAccountInfo(account, page);
    } catch (err) {
      if (err instanceof CancelledError) throw err;
      if (err?.guard || [401, 403, 429].includes(err?.status)) throw err;
    }
  }

  account = await hydrateAccountProfilePhoto(account, run);
  return account;
}

function compactUser(u) {
  const username = String(u.username || "").replace(/^@+/, "").trim();
  return {
    id: String(u.pk || u.id || ""),
    username,
    fullName: u.full_name || u.fullName || "",
    profilePic: u.profile_pic_url_hd || u.profile_pic_url || u.hd_profile_pic_url_info?.url || u.profile_pic_url_info?.url || u.profilePic || "",
    profileUrl: username ? `${BASE}/${username}/` : "",
  };
}

function mergeUserProfile(user, extra = {}) {
  const username = String(extra.username || user.username || "").replace(/^@+/, "").trim();
  return {
    ...user,
    username,
    fullName: extra.fullName || user.fullName || "",
    profilePic: extra.profilePic || user.profilePic || "",
    profilePicData: extra.profilePicData || user.profilePicData || "",
    profileUrl: user.profileUrl || (username ? `${BASE}/${username}/` : ""),
  };
}

function uniqueUsers(users) {
  const map = new Map();
  for (const user of users || []) {
    const key = user.id || user.username;
    if (!key || map.has(key)) continue;
    map.set(key, user);
  }
  return [...map.values()];
}

async function fetchAllRelations(userId, kind, headers, run, onProgress, options = {}) {
  let results = uniqueUsers(options.initialResults || []);
  let maxId = options.initialMaxId || "";
  let hasMore = true;
  let page = Number(options.initialPage || 0);
  const seenCursors = new Set(maxId ? [String(maxId)] : []);

  while (hasMore) {
    throwIfCancelled(run);
    const url = `${BASE}/api/v1/friendships/${encodeURIComponent(userId)}/${kind}/?count=${PAGE_SIZE}${
      maxId ? `&max_id=${encodeURIComponent(maxId)}` : ""
    }`;
    const data = await fetchJsonWithRetry(url, headers, run);
    if (!Array.isArray(data.users)) throw new Error("Instagram devolvió una lista incompleta o cambió su respuesta. El análisis se pausó sin dar resultados por completos.");
    const users = data.users;
    const nextCursor = data.next_max_id ? String(data.next_max_id) : "";
    if ((nextCursor && (!users.length || seenCursors.has(nextCursor))) || (data.more_available === true && !nextCursor)) {
      throw new Error("Instagram devolvió una paginación incompleta. El análisis se pausó; vuelve a intentarlo más tarde.");
    }
    if (nextCursor) seenCursors.add(nextCursor);
    results = uniqueUsers(results.concat(users.map(compactUser)));
    page += 1;
    maxId = nextCursor;
    hasMore = Boolean(maxId);
    await onProgress({ kind, page, count: results.length, users: [...results], maxId, hasMore });
    if (hasMore) await randomDelay(...RELATION_PAGE_DELAY, run);
  }

  return results;
}

function readStatusesMap(data) {
  const candidates = [data?.friendship_statuses, data?.friendship_status, data?.relationships, data?.users, data];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) return candidate;
  }
  return {};
}

function findStatusForUser(statuses, userId) {
  const id = String(userId || "");
  if (!id) return null;
  return statuses[id] || statuses[Number(id)] || null;
}

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.toLowerCase().trim();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }
  return null;
}

// Significado buscado: ESA cuenta sigue al viewer.
// No usar "following" ni "followed_by_viewer": esos suelen indicar que el viewer sigue a esa cuenta.
function parseTargetFollowsViewer(status) {
  if (!status || typeof status !== "object") return null;
  const candidates = [
    status.followed_by,
    status.follows_viewer,
    status.friendship_status?.followed_by,
    status.friendship_status?.follows_viewer,
    status.relationship?.followed_by,
    status.relationship?.follows_viewer,
    status.user?.follows_viewer,
    status.data?.user?.follows_viewer,
  ];
  for (const value of candidates) {
    const parsed = parseBoolean(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

async function fetchFriendshipStatuses(userIds, headers, run) {
  const ids = userIds.map((id) => String(id || "").trim()).filter(Boolean);
  if (!ids.length) return {};
  const csrftoken = await getCookie("csrftoken");
  const url = `${BASE}/api/v1/friendships/show_many/`;
  const data = await postFormJsonWithRetry(
    url,
    headers,
    { user_ids: ids.join(","), _csrftoken: csrftoken || "" },
    run,
    1
  );
  return readStatusesMap(data);
}

function readSingleFriendshipStatus(data) {
  const candidates = [data?.friendship_status, data?.relationship, data?.data?.friendship_status, data];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) return candidate;
  }
  return null;
}

async function fetchFriendshipStatusSingle(userId, headers, run) {
  const id = String(userId || "").trim();
  if (!id) return null;
  const url = `${BASE}/api/v1/friendships/show/${encodeURIComponent(id)}/`;
  const data = await fetchJsonWithRetry(url, headers, run, 1);
  return readSingleFriendshipStatus(data);
}

async function fetchWebProfileInfoStatus(username, headers, run) {
  const clean = String(username || "").replace(/^@+/, "").trim();
  if (!clean) return null;
  const url = `${BASE}/api/v1/users/web_profile_info/?username=${encodeURIComponent(clean)}`;
  const data = await fetchJsonWithRetry(url, headers, run, 1);
  return data?.data?.user || data?.user || data;
}

async function fetchExactFollowsViewer(user, headers, run, preferredStrategy = "auto") {
  let lastError = null;

  async function tryFriendshipShow() {
    const status = await fetchFriendshipStatusSingle(user.id, headers, run);
    const followsYou = parseTargetFollowsViewer(status);
    if (followsYou !== null) return { followsYou, strategy: "friendship_show" };
    return { followsYou: null, strategy: "friendship_show" };
  }

  async function tryWebProfile() {
    const status = await fetchWebProfileInfoStatus(user.username, headers, run);
    const followsYou = parseTargetFollowsViewer(status);
    const profile = {
      username: status?.username || user.username || "",
      fullName: status?.full_name || status?.fullName || user.fullName || "",
      profilePic: status?.profile_pic_url_hd || status?.profile_pic_url || status?.hd_profile_pic_url_info?.url || user.profilePic || "",
    };
    if (followsYou !== null) return { followsYou, strategy: "web_profile_info", ...profile };
    return { followsYou: null, strategy: "web_profile_info", ...profile };
  }

  const order = preferredStrategy === "web_profile_info"
    ? [tryWebProfile, tryFriendshipShow]
    : preferredStrategy === "friendship_show"
      ? [tryFriendshipShow, tryWebProfile]
      : [tryFriendshipShow, tryWebProfile];

  for (const fn of order) {
    try {
      const result = await fn();
      if (result.followsYou !== null) return result;
    } catch (err) {
      if (err instanceof CancelledError) throw err;
      if (err?.guard || [401, 403, 429].includes(err?.status)) throw err;
      lastError = err;
    }
  }

  if (lastError) return { followsYou: null, strategy: preferredStrategy, error: lastError.message };
  return { followsYou: null, strategy: preferredStrategy };
}

function countText(count, total) {
  return total ? `${count}/${total}` : `${count}`;
}

function profileUrlForUsername(username) {
  const clean = String(username || "").replace(/^@+/, "").trim();
  return clean ? `${BASE}/${clean}/` : "";
}

function withProfileUrls(users) {
  return uniqueUsers(users).map((user) => ({
    ...user,
    profileUrl: user.profileUrl || profileUrlForUsername(user.username),
  }));
}

function makeResult({ notFollowingBack = [], method = "", note = "", checked = 0, unresolved = 0 } = {}) {
  return {
    notFollowingBack: withProfileUrls(notFollowingBack),
    method,
    note,
    checked,
    unresolved,
  };
}

function hasExportableResult(result) {
  return Boolean(result && Array.isArray(result.notFollowingBack) && result.notFollowingBack.length > 0);
}

async function patchLiveResult({ account, total, checked, notFollowingBack, unresolved = 0, method, note, message, phase = "checking" }) {
  const result = makeResult({ notFollowingBack, method, note, checked, unresolved });
  await patchState({
    phase,
    progress: { phase: "checking", page: checked, count: checked, total },
    counts: {
      following: account?.followingCount || total || 0,
      followers: account?.followerCount,
      notFollowingBack: result.notFollowingBack.length,
      unresolved,
      checked,
    },
    result,
    message,
  });
  return result;
}

async function checkFollowingBackSingleExact(following, headers, account, run, options = {}) {
  const notFollowingBack = [...(options.initialNotFollowingBack || [])];
  const total = following.length;
  let unresolved = options.initialUnresolved || 0;
  let preferredStrategy = options.preferredStrategy || "auto";
  const startIndex = Math.max(0, Math.min(total, Number(options.startIndex || 0)));
  let lastPatchAt = -1;

  await patchLiveResult({
    account,
    total,
    checked: startIndex,
    notFollowingBack,
    unresolved,
    method: "single_exact_start",
    note: "Verificación exacta sin descargar seguidores. Solo aparecen confirmados.",
    message: "Verificación exacta 1x1 sin leer seguidores...",
    phase: "checking_single",
  });
  await writeAnalysisCheckpoint({
    stage: "checking_single",
    account,
    following,
    checked: startIndex,
    notFollowingBack,
    unresolved,
    preferredStrategy,
  });

  for (let i = startIndex; i < total; i++) {
    throwIfCancelled(run);
    const user = following[i];
    const username = user.username ? `@${user.username}` : `ID ${user.id}`;
    let foundNew = false;

    const exact = await fetchExactFollowsViewer(user, headers, run, preferredStrategy);
    if (exact.strategy && exact.followsYou !== null) preferredStrategy = exact.strategy;

    if (exact.followsYou === false) {
      const confirmedUser = await hydrateUserProfilePhoto(mergeUserProfile(user, exact), run);
      notFollowingBack.push(confirmedUser);
      foundNew = true;
    } else if (exact.followsYou === null) {
      unresolved += 1;
    }

    const checked = i + 1;
    const shouldPatch = foundNew || checked - lastPatchAt >= 4 || checked === total;
    if (shouldPatch) {
      lastPatchAt = checked;
      await patchLiveResult({
        account,
        total,
        checked,
        notFollowingBack,
        unresolved,
        method: `single_exact_${preferredStrategy}`,
        note: "No se descargó tu lista de seguidores. La lista muestra solo usuarios confirmados que no te siguen.",
        message: `Verificando ${username}: ${countText(checked, total)}. No te siguen: ${notFollowingBack.length}`,
        phase: "checking_single",
      });
      await writeAnalysisCheckpoint({
        stage: "checking_single",
        account,
        following,
        checked,
        notFollowingBack,
        unresolved,
        preferredStrategy,
      });
    }

    if (checked < total) {
      await randomDelay(...SINGLE_CHECK_DELAY, run);
      if (checked % SINGLE_LONG_PAUSE_EVERY === 0) {
        await patchState({ message: `Pausa prudente. Confirmados: ${notFollowingBack.length}. Revisados: ${countText(checked, total)}.` });
        await randomDelay(...SINGLE_LONG_PAUSE, run);
      }
    }
  }

  return makeResult({
    notFollowingBack,
    method: `single_exact_complete_${preferredStrategy}`,
    note: unresolved
      ? `Completado con ${unresolved} cuentas sin dato devuelto por Instagram. No se muestran como No te siguen.`
      : "Verificación exacta completada sin descargar seguidores.",
    checked: total,
    unresolved,
  });
}

async function checkFollowingBackHybrid(following, headers, account, run, options = {}) {
  const notFollowingBack = [...(options.initialNotFollowingBack || [])];
  const unknown = [...(options.initialUnknown || [])];
  const total = following.length;
  let checked = Math.max(0, Math.min(total, Number(options.startIndex || 0)));
  let firstBatchResolved = checked > 0 ? 1 : null;

  await patchLiveResult({
    account,
    total,
    checked,
    notFollowingBack,
    unresolved: 0,
    method: "start_no_followers_download",
    note: "No se descargan seguidores. Se intenta tandas; si Instagram no devuelve reciprocidad, cambia a exacto 1x1.",
    message: "Verificando sin leer seguidores...",
  });
  await writeAnalysisCheckpoint({
    stage: "checking_hybrid",
    account,
    following,
    checked,
    notFollowingBack,
    unknown,
  });

  for (let i = checked; i < total; i += CHECK_BATCH_SIZE) {
    throwIfCancelled(run);
    const batch = following.slice(i, i + CHECK_BATCH_SIZE);
    let statuses;
    try {
      statuses = await fetchFriendshipStatuses(batch.map((user) => user.id), headers, run);
    } catch (err) {
      if (err instanceof CancelledError || err?.guard || ![400, 404, 405].includes(err?.status)) throw err;
      // The batch endpoint can disappear or reject its format; fall back only on explicit non-safety failures.
      statuses = {};
    }
    let batchResolved = 0;

    for (const user of batch) {
      const status = findStatusForUser(statuses, user.id);
      const followsYou = parseTargetFollowsViewer(status);
      if (followsYou === true) {
        batchResolved += 1;
      } else if (followsYou === false) {
        batchResolved += 1;
        const confirmedUser = await hydrateUserProfilePhoto(mergeUserProfile(user), run);
        notFollowingBack.push(confirmedUser);
      } else {
        unknown.push(user);
      }
    }

    checked = Math.min(i + CHECK_BATCH_SIZE, total);
    if (firstBatchResolved === null) firstBatchResolved = batchResolved;

    await patchLiveResult({
      account,
      total,
      checked,
      notFollowingBack,
      unresolved: unknown.length,
      method: "batch_then_exact_no_followers_download",
      note: "La lista muestra solo confirmados. Las cuentas sin dato se verificarán 1x1 sin descargar seguidores.",
      message: `Tandas: ${countText(checked, total)}. No te siguen: ${notFollowingBack.length}`,
    });

    await writeAnalysisCheckpoint({
      stage: "checking_hybrid",
      account,
      following,
      checked,
      notFollowingBack,
      unknown,
    });

    if (firstBatchResolved === 0) {
      const remaining = following;
      await patchState({ message: "Instagram no dio reciprocidad por tandas. Cambio a verificación exacta 1x1 sin leer seguidores." });
      await randomDelay(800, 1400, run);
      await writeAnalysisCheckpoint({
        stage: "checking_single",
        account,
        following: remaining,
        checked: 0,
        notFollowingBack: [],
        unresolved: 0,
        preferredStrategy: "auto",
      });
      return checkFollowingBackSingleExact(remaining, headers, account, run, {
        initialNotFollowingBack: [],
        initialUnresolved: 0,
        preferredStrategy: "auto",
      });
    }

    if (checked < total) await randomDelay(...CHECK_BATCH_DELAY, run);
  }

  if (unknown.length) {
    await patchState({ message: `${unknown.length} cuentas sin dato por tandas. Verificación exacta de pendientes sin leer seguidores...` });
    await randomDelay(800, 1400, run);
    await writeAnalysisCheckpoint({
      stage: "checking_single",
      account,
      following: unknown,
      checked: 0,
      notFollowingBack,
      unresolved: 0,
      preferredStrategy: "auto",
    });
    return checkFollowingBackSingleExact(unknown, headers, account, run, {
      initialNotFollowingBack: notFollowingBack,
      initialUnresolved: 0,
      preferredStrategy: "auto",
    });
  }

  return makeResult({
    notFollowingBack,
    method: "batch_complete_no_followers_download",
    note: "Verificación por tandas completada sin descargar seguidores.",
    checked: total,
    unresolved: 0,
  });
}

async function detectAccountJob(run, options = {}) {
  activeCookieStoreId = run.cookieStoreId;
  try {
    const safetyLock = await readSafetyLock(run.cookieStoreId);
    // A manually requested pause applies to automatic unfollow, not read-only analysis.
    if (safetyLock && safetyLock.guard !== "manual") throw new Error((safetyLock.reason || "Pausa de seguridad activa.") + " Hasta " + new Date(safetyLock.until).toLocaleString() + ".");
    await chrome.storage.session.remove(PENDING_EXPORT_KEY);
    await clearAnalysisCheckpoint();
    await writeState({ ...emptyState("Detectando cuenta..."), status: "detecting", phase: "identifying", startedAt: now() });
    const headers = await getAuthHeaders();
    const userId = await getOwnUserId();
    const account = await getOwnProfileInfo(userId, headers, run);
    const label = account.username ? `@${account.username}` : `ID ${account.id}`;
    await writeState({
      ...emptyState(`Cuenta detectada: ${label}`),
      status: "awaiting_confirm",
      phase: "awaiting_confirm",
      account,
      counts: { following: account.followingCount, followers: account.followerCount, notFollowingBack: null },
      startedAt: now(),
    });
    if (options.autoStart) {
      throwIfCancelled(run);
      await runAnalysisJob(run);
    } else {
      notify("Cuenta detectada", `${label}. Confirmá en la extensión para analizar.`);
    }
  } catch (err) {
    if (err instanceof CancelledError) {
      await writeState({ ...emptyState("Detenido."), status: "cancelled", phase: "cancelled", message: "Detenido." });
      return;
    }
    const message = err?.message || "Proceso pausado.";
    await patchState({ status: "error", phase: "error", error: message, message });
    notify("Proceso pausado", `Reportar: ${CONTACT_EMAIL}`);
  } finally {
    if (activeRun === run) activeRun = null;
    if (activeCookieStoreId === run.cookieStoreId) activeCookieStoreId = null;
  }
}

async function runAnalysisJob(run, options = {}) {
  activeCookieStoreId = run.cookieStoreId;
  try {
    await chrome.storage.session.remove(PENDING_EXPORT_KEY);
    const safetyLock = await readSafetyLock(run.cookieStoreId);
    // A manually requested pause applies to automatic unfollow, not read-only analysis.
    if (safetyLock && safetyLock.guard !== "manual") throw new Error((safetyLock.reason || "Pausa de seguridad activa.") + " Hasta " + new Date(safetyLock.until).toLocaleString() + ".");
    if (!options.resume) await clearAnalysisCheckpoint();
    const previous = await readState();
    const checkpoint = options.resume ? await readAnalysisCheckpoint() : null;
    let account = checkpoint?.account || previous.account;
    if (!account?.id) {
      const headersForDetect = await getAuthHeaders();
      const userIdForDetect = await getOwnUserId();
      account = await getOwnProfileInfo(userIdForDetect, headersForDetect, run);
    }

    const userId = String(account.id);
    const activeUserId = await getOwnUserId();
    if (activeUserId !== userId) throw new Error("La cuenta activa cambió. Detecta y confirma la cuenta nuevamente antes de continuar.");
    const accountName = account.username ? '@' + account.username : 'ID ' + account.id;
    const headers = await getAuthHeaders();

    let following = Array.isArray(checkpoint?.following) ? checkpoint.following : [];
    if (!checkpoint || checkpoint.stage === "following") {
      await writeState({
        ...emptyState(options.resume ? "Continuando analisis..." : "Analizando..."),
        status: "running",
        phase: "following",
        account,
        counts: { following: following.length || account.followingCount, followers: account.followerCount, notFollowingBack: 0, checked: 0 },
        result: makeResult({ notFollowingBack: [], method: "starting", note: "No se descargan seguidores." }),
        progress: { phase: "following", page: checkpoint?.page || 0, count: following.length || 0, total: account.followingCount },
        startedAt: previous.startedAt || now(),
        message: options.resume ? "Continuando lectura de seguidos..." : "Leyendo solo las cuentas que sigues...",
      });

      notify(options.resume ? "Analisis reanudado" : "Analisis iniciado", accountName + ". Exacto sin descargar seguidores; resultados en vivo.");

      if (!(checkpoint && checkpoint.stage === "following" && checkpoint.hasMore === false)) following = await fetchAllRelations(userId, "following", headers, run, async (p) => {
        const total = account.followingCount;
        await writeAnalysisCheckpoint({
          stage: "following",
          account,
          following: p.users,
          maxId: p.maxId,
          hasMore: p.hasMore,
          page: p.page,
        });
        await patchState({
          phase: "following",
          resumeAvailable: true,
          progress: { phase: "following", page: p.page, count: p.count, total },
          counts: { following: p.count, followers: account.followerCount, notFollowingBack: 0, checked: 0 },
          result: makeResult({
            notFollowingBack: [],
            method: "following_list_partial",
            note: "Leyendo seguidos. Todavia no se muestran resultados hasta confirmar reciprocidad.",
            checked: 0,
          }),
          message: "Leyendo seguidos... " + countText(p.count, total) + ". No se leen seguidores.",
        });
      }, {
        initialResults: following,
        initialMaxId: checkpoint?.maxId || "",
        initialPage: checkpoint?.page || 0,
      });
    } else {
      notify("Analisis reanudado", accountName + ". Continuando desde el ultimo punto guardado.");
      await patchState({
        status: "running",
        phase: checkpoint.stage === "checking_single" ? "checking_single" : "checking",
        resumeAvailable: true,
        account,
        progress: { phase: "checking", page: checkpoint.checked || 0, count: checkpoint.checked || 0, total: following.length },
        counts: {
          following: following.length,
          followers: account.followerCount,
          notFollowingBack: (checkpoint.notFollowingBack || []).length,
          checked: checkpoint.checked || 0,
          unresolved: checkpoint.unresolved || 0,
        },
        result: makeResult({
          notFollowingBack: checkpoint.notFollowingBack || [],
          method: checkpoint.stage,
          note: "Analisis reanudado desde el punto guardado.",
          checked: checkpoint.checked || 0,
          unresolved: checkpoint.unresolved || 0,
        }),
        message: "Continuando desde el punto guardado...",
      });
    }

    if (!following.length && Number(account.followingCount) > 0) throw new Error("Instagram devolvió una lista vacía aunque la cuenta informa seguidos. El análisis se pausó para evitar un resultado incorrecto.");
    account = { ...account, followingCount: following.length };
    if (!checkpoint || checkpoint.stage === "following") {
      await writeAnalysisCheckpoint({ stage: "checking_hybrid", account, following, checked: 0, notFollowingBack: [], unknown: [] });
      await patchState({
        status: "running",
        phase: "checking",
        resumeAvailable: true,
        account,
        counts: { following: following.length, followers: account.followerCount, notFollowingBack: 0, checked: 0 },
        progress: { phase: "checking", page: 0, count: 0, total: following.length },
        result: makeResult({ notFollowingBack: [], method: "following_loaded", note: "Seguidos cargados. Comienza verificacion." }),
        message: "Verificando quien no te sigue; apareceran en vivo con URL oficial...",
      });
    }

    await randomDelay(800, 1600, run);
    let result;
    if (checkpoint?.stage === "checking_single") {
      result = await checkFollowingBackSingleExact(following, headers, account, run, {
        startIndex: checkpoint.checked || 0,
        initialNotFollowingBack: checkpoint.notFollowingBack || [],
        initialUnresolved: checkpoint.unresolved || 0,
        preferredStrategy: checkpoint.preferredStrategy || "auto",
      });
    } else {
      result = await checkFollowingBackHybrid(following, headers, account, run, {
        startIndex: checkpoint?.stage === "checking_hybrid" ? checkpoint.checked || 0 : 0,
        initialNotFollowingBack: checkpoint?.stage === "checking_hybrid" ? checkpoint.notFollowingBack || [] : [],
        initialUnknown: checkpoint?.stage === "checking_hybrid" ? checkpoint.unknown || [] : [],
      });
    }

    const doneMessage = result.notFollowingBack.length
      ? "Listo: " + result.notFollowingBack.length + " no te siguen, con URLs oficiales."
      : result.unresolved
        ? "Listo: 0 confirmados. Instagram dejo " + result.unresolved + " sin dato."
        : "Listo: 0 no te siguen confirmados.";

    await writeState({
      ...emptyState(doneMessage),
      status: "done",
      phase: "done",
      resumeAvailable: false,
      account,
      counts: {
        following: following.length,
        followers: account.followerCount,
        notFollowingBack: result.notFollowingBack.length,
        checked: result.checked || following.length,
        unresolved: result.unresolved || 0,
      },
      progress: { phase: "done", page: null, count: 100, total: 100 },
      result,
      startedAt: previous.startedAt || now(),
    });
    await clearAnalysisCheckpoint();

    notify("Analisis finalizado", doneMessage);
  } catch (err) {
    if (err instanceof CancelledError || err?.name === "AbortError") {
      const previous = await readState();
      const checkpoint = await readAnalysisCheckpoint();
      const hasResult = hasExportableResult(previous.result);
      await writeState({
        ...previous,
        status: "cancelled",
        phase: "cancelled",
        resumeAvailable: Boolean(checkpoint),
        message: hasResult ? "Analisis detenido. Puedes continuar o exportar confirmados." : "Analisis detenido. Puedes continuar desde el punto guardado.",
        error: null,
      });
      notify("Analisis detenido", checkpoint ? "Puedes continuar desde la extension." : "No habia checkpoint disponible.");
      return;
    }

    const previous = await readState();
    const checkpoint = await readAnalysisCheckpoint();
    const message = err?.message || "Proceso pausado.";
    const hasResult = hasExportableResult(previous.result);
    await writeState({
      ...previous,
      status: "error",
      phase: "error",
      resumeAvailable: Boolean(checkpoint),
      error: message,
      message: message,
    });
    notify("Proceso pausado", hasResult ? "Confirmados disponibles. Reportar: " + CONTACT_EMAIL : "Reportar: " + CONTACT_EMAIL);
  } finally {
    if (activeRun === run) activeRun = null;
    if (activeCookieStoreId === run.cookieStoreId) activeCookieStoreId = null;
  }
}

function sanitizeFilePart(value) {
  return String(value || "cuenta")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "cuenta";
}

function buildTxt(state) {
  const account = state.account || {};
  const counts = state.counts || {};
  const result = state.result || {};
  const confirmed = Array.isArray(result.notFollowingBack) ? result.notFollowingBack : [];
  const accountLabel = account.username ? `@${account.username}` : `ID ${account.id || "desconocido"}`;
  const lines = [
    "IG - Cuentas que sigo y no me siguen de vuelta",
    `Cuenta analizada: ${accountLabel}`,
    account.fullName ? `Nombre: ${account.fullName}` : null,
    account.id ? `ID: ${account.id}` : null,
    `Fecha de exportación: ${new Date().toISOString()}`,
    `Estado del análisis: ${state.status || "desconocido"}`,
    "",
        `Sigues: ${counts.following ?? account.followingCount ?? "no disponible"}`,
        `Seguidores informados por perfil: ${counts.followers ?? account.followerCount ?? "no disponible"}`,
        `Cuentas revisadas: ${counts.checked ?? result.checked ?? "no disponible"}`,
    `Confirmados que no te siguen: ${confirmed.length}`,
    result.unresolved ? `Sin dato devuelto por Instagram: ${result.unresolved}` : null,
    "",
    "CONFIRMADOS — YO LOS SIGO, ELLOS NO ME SIGUEN:",
  ].filter((line) => line !== null);

  if (!confirmed.length) {
    lines.push("No hay confirmados en este análisis.");
  } else {
    for (const u of confirmed) {
      const username = String(u.username || "usuario_sin_username").replace(/^@+/, "");
      const url = u.profileUrl || profileUrlForUsername(username);
      lines.push(`@${username} - ${url}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getConfirmedUsers(state) {
  const result = state?.result || {};
  const confirmed = Array.isArray(result.notFollowingBack) ? result.notFollowingBack : [];
  return withProfileUrls(confirmed)
    .map((u) => ({
      ...u,
      username: String(u.username || "usuario_sin_username").replace(/^@+/, ""),
      fullName: u.fullName || "",
    }))
    .sort((a, b) => a.username.localeCompare(b.username, "es", { sensitivity: "base" }));
}

function buildHtml(state) {
  const account = state.account || {};
  const counts = state.counts || {};
  const result = state.result || {};
  const confirmed = getConfirmedUsers(state);
  const accountLabel = account.username ? `@${account.username}` : `ID ${account.id || "desconocido"}`;
  const exportedAt = new Date().toLocaleString("es-ES");
  const rows = confirmed.map((u, index) => {
    const username = escapeHtml(u.username);
    const fullName = escapeHtml(u.fullName || "");
    const url = escapeHtml(profileUrlForUsername(u.username));
    const imageValue = String(u.profilePicData || u.profilePic || "");
    const pic = escapeHtml(/^(data:image\/(?:png|jpeg|webp|gif);base64,|https:\/\/)/i.test(imageValue) ? imageValue : "");
    const avatar = pic
      ? `<img class="avatar" src="${pic}" alt="@${username}" loading="lazy" referrerpolicy="no-referrer">`
      : `<div class="num" aria-hidden="true">${escapeHtml(u.username.slice(0, 1).toUpperCase())}</div>`;
    return `<article class="card" data-user="${username.toLowerCase()} ${fullName.toLowerCase()}">
      ${avatar}
      <div class="content">
        <a class="user" href="${url}" target="_blank" rel="noopener noreferrer">@${username}</a>
        <a class="url" href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>
        ${fullName ? `<div class="name">${fullName}</div>` : ""}
      </div>
    </article>`;
  }).join("\n");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>IG - No me siguen confirmados</title>
<style>
  :root{--bg:#0b1117;--panel:#101822;--card:#152030;--border:#263447;--text:#eef5ff;--muted:#91a4b8;--accent:#38bdf8;--ok:#22c55e;--url:#93c5fd;}
  *{box-sizing:border-box} body{margin:0;background:radial-gradient(circle at 20% 0%,rgba(56,189,248,.14),transparent 32%),var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;}
  .wrap{max-width:1040px;margin:0 auto;padding:24px 16px 40px}.head{position:sticky;top:0;z-index:2;background:rgba(11,17,23,.92);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:16px;margin-bottom:14px;box-shadow:0 12px 30px rgba(0,0,0,.22)}
  h1{font-size:22px;margin:0 0 6px}.sub{color:var(--muted);font-size:13px;line-height:1.45}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0}.stat{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:10px}.stat b{display:block;font-size:18px}.stat span{font-size:11px;color:var(--muted)}
  .tools{display:flex;gap:10px;align-items:center}input{width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--border);background:#08111a;color:var(--text);font-size:14px;outline:none}input:focus{border-color:var(--accent)}button{border:1px solid var(--border);background:var(--card);color:var(--text);border-radius:12px;padding:12px 14px;font-weight:800;cursor:pointer;white-space:nowrap}button:hover{border-color:var(--accent)}
  .list{display:grid;gap:8px}.card[hidden]{display:none}.card{display:flex;gap:12px;align-items:flex-start;background:linear-gradient(180deg,rgba(21,32,48,.98),rgba(16,24,34,.98));border:1px solid var(--border);border-radius:15px;padding:12px}.num,.avatar{width:38px;height:38px;border-radius:50%;background:#1c2938;color:#7dd3fc;display:grid;place-items:center;font-size:12px;font-weight:900;flex:0 0 auto;object-fit:cover}.content{min-width:0}.user{display:block;color:var(--text);font-weight:900;text-decoration:none;font-size:15px}.user:hover{color:#7dd3fc}.url{display:block;margin-top:3px;color:var(--url);text-decoration:none;overflow-wrap:anywhere;font-size:13px;font-weight:700}.url:hover{text-decoration:underline;color:#bfdbfe}.name{color:var(--muted);font-size:12px;margin-top:4px}.empty{padding:26px;text-align:center;color:var(--muted);border:1px dashed var(--border);border-radius:16px}.foot{margin-top:18px;color:var(--muted);font-size:12px;line-height:1.45}
  .head{position:static;background:var(--panel);box-shadow:none;border-radius:16px;padding:24px}
  h1{font-size:28px;letter-spacing:-.03em}.sub{font-size:14px}.stats{margin:22px 0}.stat{padding:14px}.stat b{font-size:22px}.stat span{font-size:12px}.list{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.card{background:var(--panel);padding:16px;align-items:center}.avatar,.num{width:52px;height:52px}.name{font-size:13px}.notice{color:var(--muted);font-size:13px;line-height:1.5;margin:0 0 16px}.notice strong{color:var(--text)}input:focus-visible,button:focus-visible,a:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.result-count{font-size:13px;color:var(--muted);margin:16px 0 10px}
  @media(max-width:640px){.list{grid-template-columns:1fr}.head{padding:18px}h1{font-size:24px}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.tools{flex-direction:column;align-items:stretch}.wrap{padding:12px}.head{border-radius:14px}}
</style>
</head>
<body>
  <main class="wrap">
    <section class="head">
      <h1>No te siguen</h1>
      <div class="sub"><b>${escapeHtml(accountLabel)}</b> &middot; ${escapeHtml(exportedAt)} &middot; Confirmados</div>
      <div class="stats">
        <div class="stat"><b>${escapeHtml(counts.following ?? account.followingCount ?? "&mdash;")}</b><span>Sigues</span></div>
        <div class="stat"><b>${escapeHtml(counts.followers ?? account.followerCount ?? "&mdash;")}</b><span>Seguidores informados</span></div>
        <div class="stat"><b>${escapeHtml(counts.checked ?? result.checked ?? "&mdash;")}</b><span>Revisados</span></div>
        <div class="stat"><b>${confirmed.length}</b><span>No te siguen</span></div>
      </div>
      <p class="notice">${state.status === "done" ? "Análisis finalizado." : "Análisis incompleto: se muestran solo los resultados confirmados hasta ahora."} ${result.unresolved ? `Instagram no devolvió datos para <strong>${escapeHtml(result.unresolved)}</strong> cuentas; no aparecen como confirmadas.` : "Los resultados reflejan el momento del análisis."} Las fotos externas pueden dejar de estar disponibles.</p>
      <div class="tools">
        <input id="q" type="search" aria-label="Buscar usuario o nombre" placeholder="Buscar usuario o nombre..." autocomplete="off">
        <button id="copy">Copiar URLs</button>
      </div>
    </section>
    <div class="result-count" id="resultCount" aria-live="polite">${confirmed.length} perfiles confirmados</div>
    <section class="list" id="list">
      ${rows || `<div class="empty">No hay usuarios confirmados en esta exportación.</div>`}
    </section>
    <div class="foot">Contacto: ${CONTACT_EMAIL}</div>
  </main>
<script>
  const q = document.getElementById('q');
  const cards = [...document.querySelectorAll('.card')];
  const urls = [...document.querySelectorAll('.url')].map(a => a.href);
  q?.addEventListener('input', () => {
    const term = q.value.trim().toLowerCase();
    let visible = 0;
    for (const card of cards) { const match = !term || card.dataset.user.includes(term); card.hidden = !match; if (match) visible++; }
    document.getElementById('resultCount').textContent = visible + ' perfiles visibles';
  });
  document.getElementById('copy')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(urls.join('\\n'));
      document.getElementById('copy').textContent = 'Copiado';
      setTimeout(() => document.getElementById('copy').textContent = 'Copiar URLs', 1200);
    } catch (_) {
      alert(urls.join('\\n'));
    }
  });
</script>
</body>
</html>`;
}

function downloadAsync(options) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(options, (downloadId) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      resolve(downloadId);
    });
  });
}

function pruneUnfollowLog(entries, at = now()) {
  const windowStart = at - UNFOLLOW_WINDOW_MS;
  return (entries || []).filter((entry) => Number(entry?.at || 0) >= windowStart);
}

async function readUnfollowLog() {
  const data = await chrome.storage.local.get(UNFOLLOW_LOG_KEY);
  const storeId = getActiveStoreId();
  return pruneUnfollowLog(data[UNFOLLOW_LOG_KEY] || []).filter((entry) => {
    if (entry?.storeId) return entry.storeId === storeId;
    return storeId === "0";
  });
}

async function writeUnfollowLog(entries) {
  const storeId = getActiveStoreId();
  const data = await chrome.storage.local.get(UNFOLLOW_LOG_KEY);
  const others = pruneUnfollowLog(data[UNFOLLOW_LOG_KEY] || []).filter((entry) => {
    if (entry?.storeId) return entry.storeId !== storeId;
    return storeId !== "0";
  });
  const next = pruneUnfollowLog([...(others || []), ...(entries || []).map((entry) => ({ ...entry, storeId }))]);
  await chrome.storage.local.set({ [UNFOLLOW_LOG_KEY]: next });
}

async function readUnfollowJob(storeId = getActiveStoreId()) {
  const key = scopedKeyForStore(UNFOLLOW_JOB_KEY, storeId);
  const data = await chrome.storage.session.get(key);
  return data[key] || null;
}

async function writeUnfollowJob(job, storeId = getActiveStoreId()) {
  const key = scopedKeyForStore(UNFOLLOW_JOB_KEY, storeId);
  await chrome.storage.session.set({ [key]: { ...job, storeId, updatedAt: now() } });
}

async function clearUnfollowJob(storeId = getActiveStoreId()) {
  const key = scopedKeyForStore(UNFOLLOW_JOB_KEY, storeId);
  await chrome.storage.session.remove(key);
  try {
    await chrome.alarms?.clear(`${UNFOLLOW_ALARM_PREFIX}:${storeId}`);
  } catch (_) {}
}

function scheduleNextUnfollowStep(storeId = getActiveStoreId()) {
  const delayMs = randomMs(...UNFOLLOW_DELAY);
  try {
    chrome.alarms.create(`${UNFOLLOW_ALARM_PREFIX}:${storeId}`, { when: Date.now() + delayMs });
  } catch (_) {}
  return delayMs;
}

function getUnfollowQuota(entries, at = now()) {
  const clean = pruneUnfollowLog(entries, at);
  const windowCount = clean.length;
  const oldestAt = clean.reduce((oldest, entry) => Math.min(oldest, Number(entry?.at || at)), at);
  const resetAt = windowCount ? oldestAt + UNFOLLOW_WINDOW_MS : at;
  return {
    windowCount,
    windowLimit: UNFOLLOW_WINDOW_LIMIT,
    windowHours: 3,
    resetAt,
    remainingWindow: Math.max(0, UNFOLLOW_WINDOW_LIMIT - windowCount),
  };
}

function userKey(user) {
  return String(user?.id || user?.username || "").trim();
}

function updateConfirmedUser(state, target, patch) {
  const result = state.result || {};
  const users = Array.isArray(result.notFollowingBack) ? result.notFollowingBack : [];
  const key = userKey(target);
  return {
    ...state,
    result: {
      ...result,
      notFollowingBack: users.map((user) => (userKey(user) === key ? { ...user, ...patch } : user)),
    },
  };
}

async function patchUnfollowUser(target, patch, message) {
  const current = await readState();
  await writeState({
    ...updateConfirmedUser(current, target, patch),
    message: message || current.message,
    unfollow: {
      ...(current.unfollow || {}),
      updatedAt: now(),
    },
  });
}

async function unfollowUser(user, headers, run) {
  const id = String(user?.id || "").trim();
  if (!id) throw new Error("Ese usuario no tiene ID interno para dejar de seguir.");
  const csrftoken = await getCookie("csrftoken");
  const url = `${BASE}/api/v1/friendships/destroy/${encodeURIComponent(id)}/`;
  await postFormJsonWithRetry(url, headers, { _csrftoken: csrftoken || "" }, run, 1);
}

async function finishUnfollowJob(job, storeId) {
  activeCookieStoreId = storeId;
  const finalState = await readState();
  const finalQuota = getUnfollowQuota(await readUnfollowLog());
  await writeState({
    ...finalState,
    status: "done",
    phase: "done",
    message: job.failed ? "Unfollow terminado: " + job.done + " completados, " + job.failed + " con error." : "Unfollow terminado: " + job.done + " completados.",
    unfollow: { running: false, total: job.allowed, done: job.done, failed: job.failed, quota: finalQuota, updatedAt: now() },
  });
  await clearUnfollowJob(storeId);
  notify("Unfollow terminado", job.failed ? job.done + " completados, " + job.failed + " con error." : job.done + " completados.");
}

async function processUnfollowJobStep(storeId = getActiveStoreId()) {
  const previousStore = activeCookieStoreId;
  activeCookieStoreId = storeId;
  const run = createRun("unfollow_step");
  run.cookieStoreId = storeId;
  try {
    const safetyLock = await readSafetyLock(storeId);
    if (safetyLock) {
      await clearUnfollowJob(storeId);
      return;
    }
    const job = await readUnfollowJob(storeId);
    if (!job || !Array.isArray(job.candidates)) return;
    if (job.index >= job.allowed) {
      await finishUnfollowJob(job, storeId);
      return;
    }

    const headers = await getAuthHeaders();
    const user = job.candidates[job.index];
    const username = user.username ? "@" + user.username : "ID " + user.id;
    await patchUnfollowUser(user, { unfollowStatus: "pending", unfollowError: "" }, "Dejando de seguir " + username + "... " + job.done + "/" + job.allowed);

    let done = Number(job.done || 0);
    let failed = Number(job.failed || 0);
    try {
      await unfollowUser(user, headers, run);
      const at = now();
      const nextLog = pruneUnfollowLog([...(await readUnfollowLog()), { id: user.id, username: user.username || "", at, storeId }], at);
      await writeUnfollowLog(nextLog);
      done += 1;
      const nextQuota = getUnfollowQuota(nextLog);
      const current = await readState();
      await writeState({
        ...updateConfirmedUser(current, user, { unfollowStatus: "done", unfollowedAt: at, unfollowError: "" }),
        message: "Listo " + username + ". Unfollow: " + done + "/" + job.allowed + ".",
        unfollow: { running: true, total: job.allowed, done, failed, quota: nextQuota, updatedAt: at, nextRunAt: null },
      });
    } catch (err) {
      if (err instanceof CancelledError) throw err;
      failed += 1;
      await patchUnfollowUser(user, { unfollowStatus: "error", unfollowError: err?.message || "No se pudo dejar de seguir." }, "No se pudo con " + username + ". Continua con pausa.");
    }

    const nextJob = { ...job, index: job.index + 1, done, failed };
    await writeUnfollowJob(nextJob, storeId);
    if (nextJob.index < nextJob.allowed) {
      const delayMs = scheduleNextUnfollowStep(storeId);
      const state = await readState();
      await writeState({
        ...state,
        status: "unfollowing",
        phase: "unfollowing",
        message: "Pausa segura. Siguiente unfollow en " + Math.ceil(delayMs / 1000) + "s. Progreso: " + done + "/" + nextJob.allowed + ".",
        unfollow: { ...(state.unfollow || {}), running: true, total: nextJob.allowed, done, failed, nextRunAt: Date.now() + delayMs, updatedAt: now() },
      });
    } else {
      await finishUnfollowJob(nextJob, storeId);
    }
  } catch (err) {
    if (err instanceof CancelledError || err?.name === "AbortError") return;
    const previous = await readState();
    await writeState({
      ...previous,
      status: "error",
      phase: "error",
      error: err?.message || "No se pudo ejecutar unfollow.",
      message: err?.message || "No se pudo ejecutar unfollow.",
      unfollow: { ...(previous.unfollow || {}), running: false, updatedAt: now() },
    });
    await clearUnfollowJob(storeId);
  } finally {
    activeCookieStoreId = previousStore;
  }
}

async function runUnfollowJob(run, options = {}) {
  const storeId = run.cookieStoreId || getActiveStoreId();
  activeCookieStoreId = storeId;
  try {
    const safetyLock = await readSafetyLock(storeId);
    if (safetyLock) {
      throw new Error("Automatico bloqueado por seguridad hasta " + new Date(safetyLock.until).toLocaleString() + ".");
    }
    const initial = await readState();
    const confirmed = Array.isArray(initial.result?.notFollowingBack) ? initial.result.notFollowingBack : [];
    const targetKey = userKey(options.target);
    const pool = targetKey ? confirmed.filter((user) => userKey(user) === targetKey) : confirmed;
    const candidates = pool.filter((user) => user?.id && !user.unfollowedAt && user.unfollowStatus !== "done");
    if (!candidates.length) throw new Error("No hay usuarios pendientes para dejar de seguir.");

    const log = await readUnfollowLog();
    const quota = getUnfollowQuota(log);
    const requestedLimit = Math.floor(Number(options.limit || 0));
    const wantsCustomLimit = Number.isFinite(requestedLimit) && requestedLimit > 0;
    const targetLimit = wantsCustomLimit ? requestedLimit : quota.remainingWindow;
    const allowedByRisk = options.overrideRisk ? targetLimit : Math.min(targetLimit, quota.remainingWindow);
    const allowed = Math.min(candidates.length, allowedByRisk);
    if (allowed <= 0) throw new Error("Limite alcanzado. Usados: " + quota.windowCount + "/" + quota.windowLimit + " en 3 horas.");

    const job = {
      storeId,
      candidates: candidates.slice(0, allowed),
      allowed,
      index: 0,
      done: 0,
      failed: 0,
      overrideRisk: Boolean(options.overrideRisk),
      createdAt: now(),
    };
    await writeUnfollowJob(job, storeId);
    await writeState({
      ...initial,
      status: "unfollowing",
      phase: "unfollowing",
      message: options.overrideRisk && allowed > quota.remainingWindow ? "Unfollow iniciado con cantidad personalizada: 0/" + allowed + "." : "Dejando de seguir con limites: 0/" + allowed + ".",
      unfollow: { running: true, total: allowed, done: 0, failed: 0, quota, requestedLimit: allowed, overrideRisk: Boolean(options.overrideRisk) },
    });
    await processUnfollowJobStep(storeId);
  } catch (err) {
    const previous = await readState();
    await writeState({
      ...previous,
      status: "error",
      phase: "error",
      error: err?.message || "No se pudo ejecutar unfollow.",
      message: err?.message || "No se pudo ejecutar unfollow.",
      unfollow: { ...(previous.unfollow || {}), running: false, updatedAt: now() },
    });
  } finally {
    if (activeRun === run) activeRun = null;
    if (activeCookieStoreId === storeId) activeCookieStoreId = null;
  }
}

async function hydrateResultProfilePhotosForExport(state, run) {
  const result = state?.result || {};
  const users = Array.isArray(result.notFollowingBack) ? result.notFollowingBack : [];
  if (!users.length) return state;

  let changed = false;
  const hydrated = [];
  for (const user of users) {
    throwIfCancelled(run);
    if (user.profilePic && !user.profilePicData) {
      const next = await hydrateUserProfilePhoto(user, run);
      changed = changed || Boolean(next.profilePicData && next.profilePicData !== user.profilePicData);
      hydrated.push(next);
    } else {
      hydrated.push(user);
    }
  }

  if (!changed) return state;
  const nextState = {
    ...state,
    result: {
      ...result,
      notFollowingBack: hydrated,
    },
  };
  await writeState(nextState);
  return nextState;
}

async function exportCurrentResult(format = "txt") {
  let state = await readState();
  if (!hasExportableResult(state.result)) {
    throw new Error("No hay confirmados para exportar todavía.");
  }
  if (format === "html") {
    const run = createRun("export_html");
    state = await hydrateResultProfilePhotosForExport(state, run);
  }

  const date = new Date().toISOString().slice(0, 10);
  const username = sanitizeFilePart(state.account?.username || state.account?.id || "cuenta");
  const isHtml = format === "html";
  const content = isHtml ? buildHtml(state) : buildTxt(state);
  const mime = isHtml ? "text/html" : "text/plain";
  const ext = isHtml ? "html" : "txt";
  const filename = `ig_no_me_siguen_confirmados_${username}_${date}.${ext}`;
  const dataUrl = `data:${mime};charset=utf-8,${encodeURIComponent(content)}`;

  let downloadId;
  try {
    downloadId = await downloadAsync({ url: dataUrl, filename, saveAs: true });
  } catch (err) {
    await patchState({ message: "Exportación cancelada. Resultado disponible." });
    throw err;
  }

  await chrome.storage.session.set({ [PENDING_EXPORT_KEY]: { downloadId, createdAt: now(), format } });
  await patchState({ message: isHtml ? "HTML generado. Resultado disponible." : "TXT generado. Resultado disponible." });
  notify(isHtml ? "HTML exportado" : "TXT exportado", "El análisis y los resultados siguen disponibles.");
  return { downloadId, filename, format };
}

chrome.downloads.onChanged.addListener((delta) => {
  if (!delta.state) return;
  (async () => {
    const data = await chrome.storage.session.get(PENDING_EXPORT_KEY);
    const pending = data[PENDING_EXPORT_KEY];
    if (!pending || pending.downloadId !== delta.id) return;

    if (delta.state.current === "complete" || delta.state.current === "interrupted") {
      await chrome.storage.session.remove(PENDING_EXPORT_KEY);
      if (delta.state.current === "interrupted") notify("Descarga interrumpida", "El resultado sigue disponible.");
    }
  })().catch(() => {});
});

chrome.alarms?.onAlarm.addListener((alarm) => {
  if (!alarm?.name?.startsWith(`${UNFOLLOW_ALARM_PREFIX}:`)) return;
  const storeId = alarm.name.slice(`${UNFOLLOW_ALARM_PREFIX}:`.length) || "0";
  processUnfollowJobStep(storeId).catch(() => {});
});

function handleRuntimeMessage(msg, sender, sendResponse) {
  if (!msg || !msg.type) return false;

  if (msg.type === "GET_STATE") {
    readState()
      .then(async (state) => {
        // MV3 may terminate a worker between requests; never leave a stale spinner forever.
        if (!activeRun && ["running", "detecting"].includes(state.status)) {
          const checkpoint = await readAnalysisCheckpoint();
          state = await writeState({ ...state, status: "cancelled", phase: "cancelled", resumeAvailable: Boolean(checkpoint),
            message: checkpoint ? "El navegador pausó el análisis. Pulsa Continuar para retomarlo." : "El navegador interrumpió el análisis. Pulsa Analizar cuenta para comenzar de nuevo.", error: null });
        }
        return stateWithSafety(state);
      })
      .then((state) => sendResponse({ ok: true, state }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "CLEAR_SAFETY_LOCK") {
    clearSafetyLock().then(() => patchState({ status: "idle", phase: "idle", error: null, message: "Pausa eliminada. Puedes volver a analizar." }))
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "SAFETY_PAUSE") {
    writeSafetyLock("Pausa manual de seguridad activada por el usuario.", "manual")
      .then((lock) => sendResponse({ ok: true, lock }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "DETECT_ACCOUNT") {
    if (activeRun) {
      sendResponse({ ok: true, alreadyRunning: true });
      return false;
    }
    const run = createRun("detect");
    activeRun = run;
    detectAccountJob(run, { autoStart: Boolean(msg.autoStart) });
    sendResponse({ ok: true, started: true });
    return false;
  }

  if (msg.type === "START_ANALYSIS") {
    if (activeRun) {
      sendResponse({ ok: true, alreadyRunning: true });
      return false;
    }
    const run = createRun("analysis");
    activeRun = run;
    runAnalysisJob(run);
    sendResponse({ ok: true, started: true });
    return false;
  }

  if (msg.type === "RESUME_ANALYSIS") {
    if (activeRun) {
      sendResponse({ ok: true, alreadyRunning: true });
      return false;
    }
    readAnalysisCheckpoint()
      .then((checkpoint) => {
        if (!checkpoint) {
          sendResponse({ ok: false, error: "No hay progreso guardado para continuar." });
          return;
        }
        const run = createRun("analysis");
        activeRun = run;
        runAnalysisJob(run, { resume: true });
        sendResponse({ ok: true, started: true, resumed: true });
      })
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "STOP_ANALYSIS") {
    const stopped = stopActiveRun();
    if (!stopped) {
      Promise.all([readState(), readAnalysisCheckpoint()])
        .then(async ([state, checkpoint]) => {
          if (state.status === "unfollowing") await clearUnfollowJob(getActiveStoreId());
          return writeState({
            ...state,
            status: "cancelled",
            phase: "cancelled",
            resumeAvailable: state.status === "unfollowing" ? false : Boolean(checkpoint),
            message: state.status === "unfollowing"
              ? "Unfollow detenido. Resultados conservados."
              : hasExportableResult(state.result) ? "Detenido. Puedes continuar o exportar confirmados." : "Detenido. Puedes continuar desde el punto guardado.",
            unfollow: state.status === "unfollowing" ? { ...(state.unfollow || {}), running: false, stopped: true, updatedAt: now() } : state.unfollow,
          });
        })
        .then(() => sendResponse({ ok: true, stopped: false }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }
    sendResponse({ ok: true, stopped: true });
    return false;
  }

  if (msg.type === "START_UNFOLLOW") {
    if (activeRun) {
      sendResponse({ ok: true, alreadyRunning: true });
      return false;
    }
    const run = createRun("unfollow");
    activeRun = run;
    runUnfollowJob(run, { limit: msg.limit, target: msg.target, overrideRisk: Boolean(msg.overrideRisk) });
    sendResponse({ ok: true, started: true });
    return false;
  }

  if (msg.type === "MARK_MANUAL_REVIEWED") {
    readState()
      .then((state) => {
        const target = { id: msg.id, username: msg.username };
        return writeState(updateConfirmedUser(state, target, { manualReviewedAt: now(), manualReviewed: true }));
      })
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "EXPORT") {
    exportCurrentResult("txt")
      .then((data) => sendResponse({ ok: true, ...data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "EXPORT_HTML") {
    exportCurrentResult("html")
      .then((data) => sendResponse({ ok: true, ...data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "CLEAR_STATE") {
    clearTempState("manual")
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  return false;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  withMessageContext(msg, sender, () => handleRuntimeMessage(msg, sender, sendResponse))
    .catch((err) => sendResponse({ ok: false, error: err.message }));
  return true;
});
