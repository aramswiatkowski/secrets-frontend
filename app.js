let deferredPrompt = null;
let toastTimer = null;

const CONFIG = window.__CONFIG__ || {};
const DEFAULT_API_URL = (CONFIG.API_URL || "https://secrets-backend-67g2.onrender.com").replace(/\/+$/g, "");

const state = {
  tab: "Home",
  token: localStorage.getItem("token") || "",
  me: null,
  apiUrl: (localStorage.getItem("apiUrl") || DEFAULT_API_URL).replace(/\/+$/g, ""),
  shopDomain: localStorage.getItem("shopDomain") || "",
  shopToken: localStorage.getItem("shopToken") || "",
  trickSearch: localStorage.getItem("sod_trickSearch") || "",
};

// Safety: if someone saved a localhost API URL but the app is running online, reset to Render
(() => {
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  if (!isLocal && (state.apiUrl.includes('localhost') || state.apiUrl.includes('127.0.0.1'))) {
    state.apiUrl = 'https://secrets-backend-67g2.onrender.com';
    localStorage.setItem('apiUrl', state.apiUrl);
  }
})();

const tabs = [
  { key: "Home", label: "Home", icon: "🏠" },
  { key: "Tricks", label: "Tips", icon: "✨" },
  { key: "Community", label: "Community", icon: "👩‍🎨" },
  { key: "Shop", label: "Shop", icon: "🛍️" },
  { key: "Account", label: "Account", icon: "👤" },
];

const $ = (id) => document.getElementById(id);

const setStatus = (msg, cls = "") => {
  const el = $("statusBar");
  if (!el) return;

  // Clear any previous timer
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }

  const text = String(msg || "").trim();
  if (!text) {
    el.textContent = "";
    el.className = "small";
    el.classList.remove("show");
    return;
  }

  el.textContent = text;
  el.className = "small " + cls;
  el.classList.add("show");

  // Auto-hide after a moment (unless it's an error)
  const timeout = cls === "danger" ? 5500 : 2600;
  toastTimer = setTimeout(() => {
    el.classList.remove("show");
  }, timeout);
};

async function api(path, opts = {}) {
  const headers = opts.headers || {};
  headers["Content-Type"] = "application/json";
  if (state.token) headers["Authorization"] = "Bearer " + state.token;

  const base = (state.apiUrl || "").replace(/\/+$/, "");
  const res = await fetch(base + path, { ...opts, headers });

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = j.detail || JSON.stringify(j);
    } catch {}
    throw new Error(msg);
  }

  if (res.status === 204) return null;
  return res.json();
}



async function apiForm(path, formData, opts = {}) {
  const base = (state.apiUrl || "").replace(/\/+$/, "");
  const headers = Object.assign({}, opts.headers || {});
  if (state.token) headers["Authorization"] = "Bearer " + state.token;

  const res = await fetch(base + path, {
    method: opts.method || "POST",
    headers,
    body: formData,
  });

  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = (data && data.detail) ? data.detail : (typeof data === "string" ? data : "Request failed");
    throw new Error(msg);
  }
  return data;
}
async function loadMe() {
  if (!state.token) {
    state.me = null;
    return;
  }
  try {
    state.me = await api("/me");
  } catch {
    state.me = null;
    state.token = "";
    localStorage.removeItem("token");
  }
}

function tabBar() {
  const el = $("tabs");
  if (!el) return;
  el.innerHTML = "";

  for (const t of tabs) {
    const b = document.createElement("button");
    b.className = "tab" + (state.tab === t.key ? " active" : "");
    b.type = "button";
    b.setAttribute("aria-label", t.label);

    b.innerHTML = `
      <span class="ico" aria-hidden="true">${t.icon}</span>
      <span class="lbl">${t.label}</span>
    `;

    b.onclick = () => {
      state.tab = t.key;
      render();
    };

    el.appendChild(b);
  }
}

async function homeView() {
  // Load a little “dashboard” on the first screen: tip of the day, latest tips, quick actions, and community highlights.
  let tricks = [];
  let posts = [];
  let tipsErr = "";
  let postsErr = "";

  try { tricks = await api("/tricks"); } catch (e) { tipsErr = "Couldn't load tips right now."; }
  try { posts = await api("/posts"); } catch (e) { postsErr = "Couldn't load community posts right now."; }

  const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Pick a stable "Tip of the day" (same for the whole day on this device).
  let tipOfDayId = localStorage.getItem("sod_tipOfDayId");
  const storedDay = localStorage.getItem("sod_tipOfDayDate");
  if (storedDay !== todayKey) tipOfDayId = null;

  let tipOfDay = tipOfDayId ? tricks.find(t => String(t.id) === String(tipOfDayId)) : null;
  if (!tipOfDay && tricks.length) {
    const pool = tricks.slice(0, Math.min(12, tricks.length));
    tipOfDay = pool[Math.floor(Math.random() * pool.length)];
    localStorage.setItem("sod_tipOfDayDate", todayKey);
    localStorage.setItem("sod_tipOfDayId", String(tipOfDay.id));
  }

  const latestTips = tricks.slice(0, 4);
  const highlights = posts.slice(0, 2);

  const gallery = posts.filter(p => p.image_url).slice(0, 6);

  const tipPreview = (t) => escapeHtml(String(t || "")).slice(0, 160) + (String(t || "").length > 160 ? "…" : "");
  const titleOr = (t, fallback) => escapeHtml((t && t.trim()) ? t : fallback);

  const planOptions = `
    <div class="grid" style="gap:10px; margin-top:10px;">
      <div class="item" style="margin:0; padding:10px;">
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
          <div><b>VIP Digital</b> <span class="small">£9.99 / month</span></div>
          <span class="pill">10% off</span>
        </div>
        <div class="small" style="margin-top:6px;">VIP Library + VIP Club + 2 cliparts / month</div>
      </div>
      <div class="item" style="margin:0; padding:10px;">
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
          <div><b>VIP Print Pack</b> <span class="small">£14.99 / month</span></div>
          <span class="pill">4 credits</span>
        </div>
        <div class="small" style="margin-top:6px;">4 credits / month + 2 cliparts / month • 10% off</div>
      </div>
      <div class="item" style="margin:0; padding:10px;">
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
          <div><b>PRO Studio</b> <span class="small">£24.99 / month</span></div>
          <span class="pill">8 credits</span>
        </div>
        <div class="small" style="margin-top:6px;">8 credits / month + 4 cliparts / month • 12% off</div>
      </div>
    </div>
  `;

  const vipCta = !state.me
    ? `
      <div class="item">
        <div class="meta">
          <div><b>Wasze prace</b></div>
          <span class="pill">${gallery.length ? `${gallery.length} new` : "—"}</span>
        </div>
        ${postsErr ? `<p class="muted">${escapeHtml(postsErr)}</p>` : `
          ${gallery.length ? `
            <div class="grid" style="grid-template-columns:repeat(3,1fr); gap:10px; margin-top:10px;">
              ${gallery.map(p => `
                <a class="item" style="margin:0; padding:0; overflow:hidden; border-radius:16px;" target="_blank" rel="noreferrer" href="${p.image_url}">
                  <img src="${p.image_url}" alt="" style="width:100%; height:120px; object-fit:cover; display:block;">
                  <div style="padding:8px;">
                    <div class="small">${escapeHtml(p.author_display_name || "Member")}</div>
                  </div>
                </a>
              `).join("")}
            </div>
          ` : `<p class="muted">Brak zdjęć w community — bądź pierwsza i wrzuć swoją pracę 🙂</p>`}
          <div class="row" style="margin-top:10px;">
            <button class="btn" data-go="Community">Open Community</button>
          </div>
        `}
      </div>
${tipsErr ? `<p class="muted">${escapeHtml(tipsErr)}</p>` : `
          ${latestTips.length ? `
            <div class="list" style="margin-top:10px;">
              ${latestTips.map(t => `
                <div class="item" style="padding:10px;" data-open-tip="${t.id}">
                  <div style="display:flex; justify-content:space-between; gap:12px; align-items:center;">
                    <div style="min-width:0;">
                      <b>${titleOr(t.title, "Tip")}</b>
                      ${t.is_vip ? `<div class="muted" style="font-size:12px;">VIP</div>` : ``}
                    </div>
                    <span class="pill">Open</span>
                  </div>
                </div>
              `).join("")}
            </div>
          ` : `<p class="muted">No tips yet.</p>`}
          <div class="row" style="margin-top:12px;">
            <button class="btn" data-go="Tricks">See all tips</button>
            ${state.me && state.me.is_admin ? `<button class="btn primary" id="homeGoAdminTips">Add tip</button>` : ``}
          </div>
        `}
      </div>

      <div class="item">
        <div class="meta">
          <div><b>Community highlights</b></div>
          <span class="pill">${highlights.length ? "New" : "—"}</span>
        </div>
        ${postsErr ? `<p class="muted">${escapeHtml(postsErr)}</p>` : `
          ${highlights.length ? `
            <div class="list" style="margin-top:10px;">
              ${highlights.map(p => `
                <div class="item" style="padding:10px;">
                  <div class="muted" style="font-size:12px;">${escapeHtml(p.author_display_name || "Member")}</div>
                  <div style="margin-top:6px;">${tipPreview(p.text)}</div>
                  ${p.image_url ? `<div style="margin-top:8px;"><a href="${escapeHtml(p.image_url)}" target="_blank" rel="noreferrer">View image</a></div>` : ``}
                </div>
              `).join("")}
            </div>
          ` : `<p class="muted">No posts yet. Be the first to share a project!</p>`}
          <div class="row" style="margin-top:12px;">
            <button class="btn" data-go="Community">Open community</button>
            <button class="btn primary" data-go="Community">Share a photo</button>
          </div>
        `}
      </div>

      ${vipCta}
    </div>
  `;
}

function attachHomeHandlers() {
  // Simple navigation from dashboard buttons
  document.querySelectorAll("[data-go]").forEach((btn) => {
    btn.onclick = () => {
      const tab = btn.getAttribute("data-go");
      if (!tab) return;
      state.tab = tab;
      render();
    };
  });

  const vipShop = $("homeGoShopVip");
  if (vipShop) vipShop.onclick = () => { state.tab = "Shop"; render(); };

  const adminTips = $("homeGoAdminTips");
  if (adminTips) adminTips.onclick = () => {
    state.tab = "Tricks";
    render();
    setTimeout(() => {
      const b = $("newTrickBtn");
      if (b) b.click();
    }, 80);
  };

  // Refresh the daily tip (local device only)
  document.querySelectorAll("[data-refresh-tip]").forEach((btn) => {
    btn.onclick = () => {
      localStorage.removeItem("sod_tipOfDayDate");
      localStorage.removeItem("sod_tipOfDayId");
      render();
    };
  });

  // Clickable tip cards
  document.querySelectorAll("[data-open-tip]").forEach((el) => {
    el.onclick = () => {
      const id = el.getAttribute("data-open-tip");
      if (!id) return;
      state.trickFocusId = id;
      state.tab = "Tricks";
      render();
    };
  });
}



function accountView() {
  if (state.me) {
    const isAdmin = !!state.me.is_admin;
    const isVip = !!state.me.is_vip;
    const plan = state.me.plan || (isVip ? "VIP_DIGITAL" : "FREE");
    const planLabel = ({
      FREE: "Free",
      VIP_DIGITAL: "VIP Digital",
      VIP_PRINT: "VIP Print Pack",
      PRO_STUDIO: "PRO Studio",
    })[plan] || plan;
    const discount = Number(state.me.discount_percent || 0);
    const monthlyCredits = Number(state.me.monthly_credits || 0);
    const credits = Number(state.me.credits_balance || 0);

    return `
      <h2>Account</h2>
      <p>Hi <b>${escapeHtml(state.me.display_name || 'Member')}</b> 👋</p>

      <div class="item" style="margin-top:12px;">
        <div class="row" style="justify-content:space-between; gap:10px; flex-wrap:wrap;">
          <div>
            <div class="small">Your plan</div>
            <div style="font-size:20px; font-weight:800;">${escapeHtml(planLabel)}</div>
          </div>
          <div class="row" style="gap:8px; flex-wrap:wrap;">
            <span class="pill">VIP: ${isVip ? "Yes" : "No"}</span>
            <span class="pill">Discount: ${discount}%</span>
            <span class="pill">Monthly credits: ${monthlyCredits}</span>
            ${isAdmin ? `<span class="pill">Admin</span>` : ``}
          </div>
        </div>
        <p class="small" style="margin-top:10px;">
          VIP sync works by matching your <b>app email</b> with the email used on Shopify.
        </p>
        <div class="row" style="gap:10px; flex-wrap:wrap; margin-top:8px;">
          <button class="btn" id="syncVipBtn">Sync VIP from Shopify</button>
          <a class="btn" rel="noopener" href="https://www.thesecretsofdecoupage.com/pages/vip">View VIP plans</a>
        </div>
      </div>

      ${!isVip ? `
        <div class="item" style="margin-top:12px;">
          <h3>Choose a VIP plan</h3>
          <div class="grid" style="gap:10px;">
            <div class="item" style="margin:0;">
              <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
                <div><b>VIP Digital</b> <span class="small">£9.99 / month</span></div>
                <span class="pill">10% off</span>
              </div>
              <div class="small" style="margin-top:6px;">VIP Library + VIP Club + 2 cliparts / month</div>
            </div>
            <div class="item" style="margin:0;">
              <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
                <div><b>VIP Print Pack</b> <span class="small">£14.99 / month</span></div>
                <span class="pill">4 credits</span>
              </div>
              <div class="small" style="margin-top:6px;">4 credits / month + 2 cliparts / month • 10% off</div>
            </div>
            <div class="item" style="margin:0;">
              <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
                <div><b>PRO Studio</b> <span class="small">£24.99 / month</span></div>
                <span class="pill">8 credits</span>
              </div>
              <div class="small" style="margin-top:6px;">8 credits / month + 4 cliparts / month • 12% off</div>
            </div>
          </div>
          <p class="small" style="margin-top:10px;">
            After subscribing on Shopify, come back here and tap <b>Sync VIP from Shopify</b>.
          </p>
        </div>
      ` : ``}

      <div class="item" style="margin-top:12px;">
        <h3>Credits</h3>
        <div class="row" style="justify-content:space-between; align-items:flex-end; gap:10px; flex-wrap:wrap;">
          <div>
            <div class="small">Available</div>
            <div style="font-size:34px; font-weight:900; line-height:1;">${credits}</div>
          </div>
          <div class="small" style="max-width:380px;">
            <div>1 credit = A4 rice paper</div>
            <div>1 credit = A5 rice paper</div>
            <div>1 credit = Greeting Card size</div>
            <div><b>A3 = 2 credits</b></div>
          </div>
        </div>

        <details style="margin-top:10px;">
          <summary><b>Redeem credits</b> (generates a one-time discount code)</summary>
          <div style="margin-top:10px;">
            <p class="small">The code is valid for <b>30 days</b>, <b>one-time</b>, and works only for your Shopify email.</p>
            <div class="row" style="gap:10px; flex-wrap:wrap;">
              <input id="redeemCredits" type="number" min="1" step="1" placeholder="How many credits?" style="max-width:200px;">
              <button class="btn primary" id="redeemBtn">Generate code</button>
            </div>
            <div id="redeemOut" class="small" style="margin-top:10px;"></div>
          </div>
        </details>
      </div>

      <div class="item" style="margin-top:12px;">
        <h3>Change password</h3>
        <p class="small">Use at least 8 characters.</p>
        <div class="grid" style="gap:10px;">
          <input id="oldPw" placeholder="Current password" type="password" autocomplete="current-password">
          <input id="newPw" placeholder="New password (min 8 chars)" type="password" autocomplete="new-password">
          <button class="btn" id="pwBtn">Update password</button>
        </div>
      </div>

      <div class="item" style="margin-top:12px;">
        <h3>Notifications</h3>
        <p>Enable gentle updates when we add new tips and projects.</p>
        <button class="btn" id="pushBtn">Enable notifications</button>
      </div>

      <div class="row" style="margin-top:12px;">
        <button class="btn danger" id="logoutBtn">Logout</button>
      </div>

      ${isAdmin ? `
        <details class="item" style="margin-top:12px;">
          <summary><b>Admin settings</b> <span class="small">(only visible to admins)</span></summary>
          <div style="margin-top:10px;">
            <p class="small">Customers will not see these settings.</p>

            <div class="small">Backend URL</div>
            <input id="apiUrl" placeholder="http://localhost:8000" />

            <div class="small" style="margin-top:10px;">Shopify Storefront config (optional)</div>
            <input id="shopDomain" placeholder="your-shop.myshopify.com" />
            <input id="shopToken" placeholder="Storefront API Access Token" style="margin-top:8px;"/>
            <div class="small" style="margin-top:8px;">Tip: Storefront token can be used client-side.</div>

            <div class="row" style="margin-top:10px;">
              <button class="btn" id="saveCfgBtn">Save</button>
              <button class="btn" id="refreshBtn">Refresh</button>
            </div>
          </div>
        </details>
      ` : ""}
    `;
  }

  return `
    <h2>Login / Register</h2>
    <div class="grid" style="gap:10px;">
      <input id="email" placeholder="Email" autocomplete="email">
      <input id="pw" placeholder="Password (min 8 chars)" type="password" autocomplete="current-password">
      <input id="nick" placeholder="Display name (public in community)" autocomplete="nickname">
      <div class="row">
        <button class="btn primary" id="loginBtn">Login</button>
        <button class="btn" id="regBtn">Register</button>
      </div>
      <p class="small">If you are new, enter a <b>display name</b> (public), then tap <b>Register</b>. VIP accounts can see extra tips.</p>
    </div>
  `;
}


async function attachAccountHandlers() {
  const loginBtn = $("loginBtn");
  const regBtn = $("regBtn");

  if (loginBtn && regBtn) {
    loginBtn.onclick = async () => {
      try {
        const username = $("email").value.trim();
        const password = $("pw").value;
        const out = await api("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
        state.token = out.access_token;
        localStorage.setItem("token", state.token);
        await loadMe();
        setStatus("Logged in.", "success");
        render();
      } catch (e) {
        setStatus("Login failed: " + e.message, "danger");
      }
    };

    regBtn.onclick = async () => {
      try {
        const email = $("email").value.trim();
        const password = $("pw").value;
        const nickname = ($("nick")?.value || "").trim();
        if (!nickname) {
          throw new Error("Please choose a nickname (public in Community)");
        }
        const out = await api("/auth/register", { method: "POST", body: JSON.stringify({ email, password, display_name: nickname }) });
        state.token = out.access_token;
        localStorage.setItem("token", state.token);
        await loadMe();
        setStatus("Registered & logged in.", "success");
        render();
      } catch (e) {
        setStatus("Register failed: " + e.message, "danger");
      }
    };
  }

  const logoutBtn = $("logoutBtn");
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      state.token = "";
      state.me = null;
      localStorage.removeItem("token");
      setStatus("Logged out.", "success");
      render();
    };
  }

  const syncVipBtn = $("syncVipBtn");
  if (syncVipBtn) {
    syncVipBtn.onclick = async () => {
      try {
        setStatus("Syncing VIP from Shopify...", "");
        const out = await api("/shopify/sync-me", { method: "POST" });
        await loadMe();
        setStatus(out.updated ? "VIP updated!" : (out.message || "Sync complete."), "success");
        render();
      } catch (e) {
        setStatus("Sync failed: " + e.message, "danger");
      }
    };
  }

  const redeemBtn = $("redeemBtn");
  if (redeemBtn) {
    redeemBtn.onclick = async () => {
      try {
        const n = Number($("redeemCredits")?.value || 0);
        if (!n || n < 1) {
          setStatus("Enter how many credits you want to redeem.", "danger");
          return;
        }
        setStatus("Generating discount code...", "");
        const out = await api("/credits/redeem-code", {
          method: "POST",
          body: JSON.stringify({ credits: n }),
        });
        const box = $("redeemOut");
        if (box) {
          const exp = (out.expires_at || "").replace("T", " ").replace("Z", "");
          box.innerHTML = `
            <div class="item" style="margin:0;">
              <div><b>Your code:</b> <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">${escapeHtml(out.code)}</span></div>
              <div class="small">Worth approx £${escapeHtml(String(out.amount_gbp))} • Expires: ${escapeHtml(exp)}</div>
              <button class="btn" id="copyCodeBtn" style="margin-top:8px;">Copy code</button>
            </div>
          `;
          const copyBtn = $("copyCodeBtn");
          if (copyBtn) {
            copyBtn.onclick = async () => {
              try {
                await navigator.clipboard.writeText(out.code);
                setStatus("Copied! Paste it at checkout.", "success");
              } catch (e) {
                setStatus("Could not copy. Please copy manually.", "danger");
              }
            };
          }
        }
        await loadMe();
        render();
      } catch (e) {
        setStatus("Redeem failed: " + e.message, "danger");
      }
    };
  }


  const pwBtn = $("pwBtn");
  if (pwBtn) {
    pwBtn.onclick = async () => {
      const old_password = ($("oldPw")?.value || "").trim();
      const new_password = ($("newPw")?.value || "").trim();

      if (!old_password || !new_password) {
        setStatus("Please fill both password fields.", "danger");
        return;
      }
      if (new_password.length < 8) {
        setStatus("New password must be at least 8 characters.", "danger");
        return;
      }

      try {
        await api("/me/password", {
          method: "POST",
          body: JSON.stringify({ old_password, new_password }),
        });
        if ($("oldPw")) $("oldPw").value = "";
        if ($("newPw")) $("newPw").value = "";
        setStatus("Password updated.", "success");
      } catch (e) {
        setStatus("Password change failed: " + e.message, "danger");
      }
    };
  }

  const pushBtn = $("pushBtn");
  if (pushBtn) {
    pushBtn.onclick = async () => {
      setStatus("Notifications will be enabled after online deploy (HTTPS + VAPID).", "");
    };
  }

  const apiUrlInput = $("apiUrl");
  const shopDomainInput = $("shopDomain");
  const shopTokenInput = $("shopToken");

  if (apiUrlInput) apiUrlInput.value = state.apiUrl;
  if (shopDomainInput) shopDomainInput.value = state.shopDomain;
  if (shopTokenInput) shopTokenInput.value = state.shopToken;

  const saveCfgBtn = $("saveCfgBtn");
  if (saveCfgBtn) {
    saveCfgBtn.onclick = () => {
      const nextApiUrl = (apiUrlInput?.value || "").trim().replace(/\/+$/, "");
      if (nextApiUrl) state.apiUrl = nextApiUrl;

      state.shopDomain = (shopDomainInput?.value || "").trim();
      state.shopToken = (shopTokenInput?.value || "").trim();

      localStorage.setItem("apiUrl", state.apiUrl);
      localStorage.setItem("shopDomain", state.shopDomain);
      localStorage.setItem("shopToken", state.shopToken);

      setStatus("Saved admin settings.", "success");
    };
  }

  const refreshBtn = $("refreshBtn");
  if (refreshBtn) refreshBtn.onclick = () => render();

// Support ticket (private)
const supportBtn = $("supportSend");
if (supportBtn) {
  supportBtn.onclick = async () => {
    const subjectEl = $("supportSubject");
    const orderEl = $("supportOrder");
    const msgEl = $("supportMsg");
    const fileEl = $("supportFile");
    const statusEl = $("supportStatus");

    const subject = (subjectEl?.value || "").trim() || "Support";
    const order_number = (orderEl?.value || "").trim() || null;
    const message = (msgEl?.value || "").trim();

    if (!message || message.length < 3) {
      statusEl.textContent = "Please write a message.";
      return;
    }

    try {
      statusEl.textContent = "Sending…";

      let image_url = null;
      const f = fileEl?.files?.[0];
      if (f) {
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch(API_BASE + "/media/upload", {
          method: "POST",
          headers: authHeader(),
          body: fd
        });
        if (!res.ok) throw new Error("upload failed");
        const j = await res.json();
        image_url = j.url;
      }

      await api("/support/tickets", {
        method: "POST",
        body: JSON.stringify({ subject, message, order_number, image_url })
      });

      statusEl.textContent = "Sent ✅ We’ll reply as soon as we can.";
      msgEl.value = "";
      if (fileEl) fileEl.value = "";
    } catch (e) {
      statusEl.textContent = "Could not send. Please try again.";
    }
  };
}
}


async function tricksView() {
  const loggedIn = !!state.me;
  const canCreate = state.me && state.me.is_admin;

  const tricks = await api("/tricks").catch((e) => {
    setStatus("Could not load tricks: " + e.message, "danger");

  const search = (state.trickSearch || "").trim().toLowerCase();
  const shown = search ? tricks.filter(t => (String(t.title||"") + " " + String(t.body||"")).toLowerCase().includes(search)) : tricks;
    return [];
  });

  let html = `<h2>Tricks</h2>
    <p>Quick techniques, glue tips, surface prep, and "what went wrong".</p>

    <div class="item" style="margin:12px 0;">
      <h3>Q&A (search + ask)</h3>
      <input id="trick_search" placeholder="Search tips or type your question…" value="${escapeHtml(state.trickSearch || "")}">
      <div class="row" style="margin-top:8px;">
        <button class="btn" id="trick_clear">Clear</button>
        <button class="btn primary" id="trick_ask">Ask in Community</button>
      </div>
      <p class="small muted" style="margin-top:6px;">
        If you can't find an answer, click <b>Ask</b>. Your question will stay in Community so others (and we) can answer.
        Admin can save the best answer as a permanent tip.
      </p>
      ${search && !shown.length ? `<p class="muted">No matching tips. Click <b>Ask in Community</b> to post this question.</p>` : ``}
    </div>

    <div class="list">
      ${shown.map(t => `
        <div class="item ${String(state.trickFocusId)===String(t.id) ? "highlight" : ""}" id="trick-${t.id}">
          <div class="meta">
            <div><b>${escapeHtml(t.title)}</b> ${t.is_vip ? '<span class="pill">VIP</span>' : ''}</div>
            <div class="small">${new Date(t.created_at).toLocaleString()}</div>
          </div>
          <p>${escapeHtml(t.body).replace(/\n/g,"<br>")}</p>
          ${t.media_url ? `<a class="link"  rel="noreferrer" href="${t.media_url}">Open media</a>` : ""}
        </div>
      `).join("")}
    </div>
  `;

  if (canCreate) {
    html += `
      <div style="margin-top:12px; border-top:1px solid var(--line); padding-top:12px;">
        <h3>Add trick (Admin)</h3>
        <input id="t_title" placeholder="Title">
        <textarea id="t_body" placeholder="Body"></textarea>
        <input id="t_media" placeholder="Media URL (optional)">
        <div class="row">
          <label class="small"><input type="checkbox" id="t_vip"> VIP only</label>
          <button class="btn primary" id="t_add">Publish</button>
        </div>
      </div>
    `;
  } else if (!loggedIn) {
    html += `<p class="small" style="margin-top:12px;">Log in to see VIP tricks (if your account is VIP).</p>`;
  }

  return html;
}

async function attachTrickHandlers() {
  // Search + Ask (Q&A)
  const s = $("trick_search");
  if (s) {
    s.oninput = () => {
      state.trickSearch = s.value;
      localStorage.setItem("sod_trickSearch", state.trickSearch || "");
      render();
    };
  }
  const clear = $("trick_clear");
  if (clear) {
    clear.onclick = () => {
      state.trickSearch = "";
      localStorage.setItem("sod_trickSearch", "");
      render();
    };
  }
  const ask = $("trick_ask");
  if (ask) {
    ask.onclick = async () => {
      const q = (state.trickSearch || "").trim();
      if (!q) {
        setStatus("Type your question first.", "danger");
        return;
      }
      if (!state.me) {
        setStatus("Please sign in to ask in Community.", "danger");
        state.tab = "Account";
        render();
        return;
      }
      try {
        await api("/posts", { method: "POST", body: JSON.stringify({ text: `Q: ${q}`, image_url: null }) });
        setStatus("Question posted in Community.", "success");
        state.tab = "Community";
        render();
      } catch (e) {
        setStatus("Could not post: " + e.message, "danger");
      }
    };
  }
  // If Home sent us here, scroll to the focused trick
  if (state.trickFocusId) {
    const id = String(state.trickFocusId);
    setTimeout(() => {
      const el = document.getElementById(`trick-${id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    state.trickFocusId = null;
  }

  const add = $("t_add");
  if (!add) return;

add.onclick = async () => {
    try {
      const title = $("t_title").value.trim();
      const body = $("t_body").value.trim();
      const media_url = $("t_media").value.trim() || null;
      const is_vip = $("t_vip").checked;

      await api("/tricks", { method: "POST", body: JSON.stringify({ title, body, media_url, is_vip }) });
      setStatus("Trick published.", "success");
      render();
    } catch (e) {
      setStatus("Publish failed: " + e.message, "danger");
    }
  };
}

async function communityView() {
  const posts = await api("/posts").catch((e) => {
    setStatus("Could not load posts: " + e.message, "danger");
    return [];
  });

  let html = `<h2>Community</h2>
    <p>Share finished projects. Add an image from your phone (JPG/PNG) or paste a URL.</p>
  `;

  if (state.me) {
    html += `
      <div class="item" style="margin-bottom:12px;">
        <h3>New post</h3>
        <textarea id="p_text" placeholder="What did you make?"></textarea>
        <input id="p_file" type="file" accept="image/*">
          <input id="p_img" placeholder="Image URL (optional)">
        <button class="btn primary" id="p_add" style="margin-top:8px;">Post</button>
      </div>
    `;
  } else {
    html += `<p class="small">Log in to create posts and comments.</p>`;
  }

  html += `<div class="list">
    ${posts.map(p => `
      <div class="item">
        <div class="meta">
          <div><span class="pill">${escapeHtml(p.author_display_name || "Member")}</span></div>
          <div class="small">${new Date(p.created_at).toLocaleString()}</div>
        </div>
        <p>${escapeHtml(p.text).replace(/\n/g,"<br>")}</p>
        ${p.image_url ? `<a class="link"  rel="noreferrer" href="${p.image_url}">Open image</a>` : ""}
        <div style="margin-top:8px;">
          <button class="btn" data-comments="${p.id}">Comments</button>
        </div>
        <div id="comments_${p.id}" style="margin-top:8px;"></div>
      </div>
    `).join("")}
  </div>`;

  return html;
}

async function attachCommunityHandlers() {
  const add = $("p_add");
  if (add) {
    add.onclick = async () => {
      try {
        const textEl = $("p_text");
        const urlEl = $("p_img");
        const fileEl = $("p_file");

        const text = (textEl?.value || "").trim();
        if (!text) {
          setStatus("Please write something first.", "danger");
          return;
        }

        let image_url = (urlEl?.value || "").trim() || null;

        const file = fileEl?.files?.[0];
        if (file) {
          // Upload image to backend and get a URL
          const fd = new FormData();
          fd.append("file", file);
          setStatus("Uploading image…", "success");
          const up = await apiForm("/media/upload", fd);
          image_url = up.url || null;
        }

        await api("/posts", { method: "POST", body: JSON.stringify({ text, image_url }) });

        // reset inputs
        if (textEl) textEl.value = "";
        if (urlEl) urlEl.value = "";
        if (fileEl) fileEl.value = "";

        setStatus("Posted.", "success");
        render();
      } catch (e) {
        setStatus("Post failed: " + e.message, "danger");
      }
    };
  }

  document.querySelectorAll("[data-comments]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const postId = btn.getAttribute("data-comments");
      await toggleComments(parseInt(postId, 10));
    });
  });

const go = $("go_support");
if (go) {
  go.onclick = () => {
    state.tab = "Account";
    render();
  };
}
}

async function toggleComments(postId) {
  const mount = document.getElementById(`comments_${postId}`);
  if (!mount) return;

  if (mount.innerHTML.trim()) {
    mount.innerHTML = "";
    return;
  }

  const comments = await api(`/posts/${postId}/comments`).catch(() => []);
  let html = `<div class="list" style="gap:8px;">
    ${comments.map(c => `
      <div class="item" style="padding:10px;">
        <div class="meta"><span class="pill">Comment</span><span class="small">${new Date(c.created_at).toLocaleString()}</span></div>
        <p>${escapeHtml(c.text).replace(/\n/g,"<br>")}</p>
      </div>
    `).join("")}
  </div>`;

  if (state.me) {
    html += `
      <div class="item" style="padding:10px; margin-top:8px;">
        <textarea id="c_text_${postId}" placeholder="Write a comment..."></textarea>
        <button class="btn primary" id="c_add_${postId}" style="margin-top:6px;">Send</button>
      </div>
    `;
  }


  // Admin: save best answer as a permanent tip
  if (state.me && state.me.is_admin && comments && comments.length) {
    html += `
      <div class="row" style="margin-top:8px;">
        <button class="btn" id="save_tip_${postId}">Save answer as tip</button>
      </div>
      <p class="small muted" style="margin-top:6px;">This will create a new public tip in Tricks from the latest comment.</p>
    `;
  }

  mount.innerHTML = html;

  const addBtn = document.getElementById(`c_add_${postId}`);
  if (addBtn) {
    addBtn.onclick = async () => {
      try {
        const text = document.getElementById(`c_text_${postId}`).value.trim();
        await api(`/posts/${postId}/comments`, { method: "POST", body: JSON.stringify({ text }) });
        setStatus("Comment added.", "success");
        await toggleComments(postId);
        await toggleComments(postId);
      } catch (e) {
        setStatus("Comment failed: " + e.message, "danger");
      }
    };
  }
  const saveBtn = document.getElementById(`save_tip_${postId}`);
  if (saveBtn) {
    saveBtn.onclick = async () => {
      try {
        const posts = await api("/posts").catch(() => []);
        const post = posts.find(p => String(p.id) === String(postId)) || {};
        const question = String(post.text || `Community post #${postId}`).replace(/^Q:\s*/i, "").trim();
        const answer = String(comments[comments.length - 1]?.text || "").trim();
        if (!answer) {
          setStatus("No answer comment to save.", "danger");
          return;
        }
        const title = (question || "Community Q&A").slice(0, 90);
        const body = `Q: ${question}\n\nA: ${answer}`;
        const media_url = post.image_url || null;

        await api("/tricks", { method: "POST", body: JSON.stringify({ title, body, media_url, is_vip: false }) });
        setStatus("Saved as a tip in Tricks.", "success");
      } catch (e) {
        setStatus("Save failed: " + e.message, "danger");
      }
    };
  }

}

async function shopView() {
  // These are the only links you need to monetise on day 1.
  // Later you can change them in ONE place (here).
  const SOD = "https://www.thesecretsofdecoupage.com";
  const ACS = "https://www.artclipstick.com";

  // Create these in Shopify whenever you're ready:
  // - /pages/vip   (VIP sales page)
  // - /products/vip-membership  (VIP product/subscription)
  const VIP_PAGE = `${SOD}/pages/vip`;
  const VIP_PRODUCT = `${SOD}/products/vip-membership`;

  let html = `
    <h2>Shop</h2>
    <p>Open our shops (and VIP) in one tap.</p>

    <div class="list">
      <div class="item">
        <div class="meta">
          <div><b>Secrets of Decoupage</b></div>
          <span class="pill">Rice paper</span>
        </div>
        <p>Browse thousands of rice papers and new designs.</p>
        <div class="row">
          <a class="btn primary"  rel="noopener" href="${SOD}">Open shop</a>
          <a class="btn"  rel="noopener" href="${SOD}/collections/all">All designs</a>
        </div>
      </div>

      <div class="item">
        <div class="meta">
          <div><b>ArtClipStick</b></div>
          <span class="pill">Digital</span>
        </div>
        <p>Clipart bundles, stickers and digital downloads.</p>
        <div class="row">
          <a class="btn primary"  rel="noopener" href="${ACS}">Open shop</a>
          <a class="btn"  rel="noopener" href="${ACS}/collections/all">All products</a>
        </div>
      </div>

      <div class="item">
        <div class="meta">
          <div><b>VIP Membership</b></div>
          <span class="pill">VIP</span>
        </div>
        <p>Extra tutorials, tips, and members-only content inside the app.</p>
        <div class="row">
          <a class="btn primary"  rel="noopener" href="${VIP_PRODUCT}">Become VIP</a>
          <a class="btn"  rel="noopener" href="${VIP_PAGE}">What you get</a>
        </div>
        <p class="small" style="margin-top:8px;">Tip: if those pages don’t exist yet, create them in Shopify and the buttons will start working immediately.</p>
      </div>
    </div>
  `;

  // OPTIONAL: if admin configures Storefront API, we can show latest products too.
  if (state.shopDomain && state.shopToken) {
    const q = `{
      products(first: 8, sortKey: CREATED_AT, reverse: true) {
        edges { node { title handle onlineStoreUrl featuredImage { url } } }
      }
    }`;

    try {
      const res = await fetch(`https://${state.shopDomain}/api/2024-07/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": state.shopToken
        },
        body: JSON.stringify({ query: q })
      });

      if (res.ok) {
        const data = await res.json();
        const items = data?.data?.products?.edges?.map(e => e.node) || [];

        if (items.length) {
          html += `
            <div style="margin-top:14px;">
              <h3>Latest products (in-app)</h3>
              <div class="list">
                ${items.map(p => `
                  <div class="item">
                    <div class="meta">
                      <div><b>${escapeHtml(p.title)}</b></div>
                      <a class="link"  rel="noopener" href="${p.onlineStoreUrl || '#'}">Open</a>
                    </div>
                    ${p.featuredImage?.url ? `<img src="${p.featuredImage.url}" style="width:100%;border-radius:12px;border:1px solid var(--line);" />` : ""}
                  </div>
                `).join("")}
              </div>
            </div>
          `;
        }
      }
    } catch (e) {
      // silent; the static shop buttons above always work
    }
  }

  return html;
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}
function looksStoreIssue(text) {
  const t = (text || "").toLowerCase();
  const patterns = [
    /\border\b/, /\bshipping\b/, /\bdelivery\b/, /\btracking\b/,
    /\brefund\b/, /\bchargeback\b/, /\bfraud\b/, /\bscam\b/,
    /\bnot\s+received\b/, /didn\'?t\s+arrive|didnt\s+arrive/, /\bmissing\b/, /\bdamaged\b/,
    /\betsy\b/, /\bshopify\b/, /\bmy\s+order\b/, /\border\s+number\b/,
    /\bcustomer\s+service\b/, /\bcomplain\b/, /\bcomplaint\b/
  ];
  if (patterns.some(r => r.test(t))) return true;
  return /(?:order\s*#?|#)\s*\d{3,8}/i.test(text || "");
}

function extractOrderNumber(text) {
  const m = (text || "").match(/(?:order\s*#?|#)\s*(\d{3,8})/i);
  return m ? m[1] : "";
}


// -------- PWA install & Service Worker --------
// Install button appears only when the browser considers the site "installable":
// - valid manifest
// - service worker registered
// - secure context (HTTPS, or localhost)

const HOST = location.hostname;
const IS_LOCALHOST = HOST === "localhost" || HOST === "127.0.0.1";
const IS_SECURE = window.isSecureContext;

async function registerSW() {
  if (!("serviceWorker" in navigator)) return;

  // Service workers require a secure context.
  // On phone over LAN (http://192.168.x.x) this is NOT secure, so install won't appear.
  if (!IS_SECURE) {
    // Don’t spam the user — just one gentle hint.
    setStatus("Install on phone requires HTTPS. Local LAN (http://192.168...) won't show Install.", "");
    return;
  }

  try {
    if (IS_LOCALHOST) {
      // Clean old registrations/caches, then use a dev SW (no caching) to avoid "old UI" issues.
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      await navigator.serviceWorker.register("./service-worker-dev.js");
    } else {
      await navigator.serviceWorker.register("./service-worker.js");
    }
  } catch (e) {
    // silent
  }
}

registerSW();

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installBtn = $("installBtn");
  if (installBtn) installBtn.style.display = "inline-block";
});

const installBtn = $("installBtn");
if (installBtn) {
  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.style.display = "none";
  });
}

// -------- Render --------
async function render() {
  tabBar();
  await loadMe();

  let html = "";
  if (state.tab === "Home") html = await homeView();
  if (state.tab === "Account") html = accountView();
  if (state.tab === "Tricks") html = await tricksView();
  if (state.tab === "Community") html = await communityView();
  if (state.tab === "Shop") html = await shopView();

  const view = $("view");
  if (view) view.innerHTML = html;

  attachHomeHandlers();
  await attachAccountHandlers();
  await attachTrickHandlers();
  await attachCommunityHandlers();
}

// First paint
setStatus("", "");
render();
