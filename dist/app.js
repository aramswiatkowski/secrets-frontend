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
  communityFilter: localStorage.getItem("communityFilter") || "ALL",
  openCommentsPostId: null,
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

function postTypeFromText(text) {
  const t = (text || "").trim();
  if (/^(Q:|\[Q\])/i.test(t)) return "question";
  if (/^(WORK:|\[WORK\])/i.test(t)) return "work";
  return "post";
}
function stripPostPrefix(text) {
  const t = (text || "");
  return t.replace(/^(Q:|\[Q\])\s*/i, "").replace(/^(WORK:|\[WORK\])\s*/i, "");
}
function applyPostPrefix(type, text) {
  const clean = (text || "").trim();
  if (!clean) return "";
  const already = /^(Q:|\[Q\]|WORK:|\[WORK\])/i.test(clean);
  if (already) return clean;
  if (type === "question") return `Q: ${clean}`;
  if (type === "work") return `WORK: ${clean}`;
  return clean;
}


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
  let tricks = [];
  let posts = [];
  let tipsErr = "";
  let postsErr = "";

  try { tricks = await api("/tricks"); } catch (e) { tipsErr = "Couldn't load tips right now."; }
  try { posts = await api("/posts"); } catch (e) { postsErr = "Couldn't load community posts right now."; }

  const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
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

  const works = posts.filter(p => postTypeFromText(p.text) !== "question" && !!p.image_url).slice(0, 6);
  const questions = posts.filter(p => postTypeFromText(p.text) === "question").slice(0, 5);

  const preview = (t, fallback="") => {
    const s = stripPostPrefix(String(t || "")).trim();
    const safe = escapeHtml((s || fallback));
    return safe.slice(0, 140) + (s.length > 140 ? "…" : "");
  };

  let html = `
    <h2>Home</h2>
    ${!state.me ? `
      <div class="item">
        <div class="meta">
          <div><b>Welcome</b></div>
          <span class="pill">Public</span>
        </div>
        <p class="muted">Tip of the day is public. Log in to post in the Community and join VIP features.</p>
        <div class="row">
          <button class="btn primary" data-go="Account">Log in / Register</button>
          <button class="btn" data-go="Tricks">Browse tips</button>
        </div>
      </div>
    ` : ``}

    <div class="item">
      <div class="meta">
        <div><b>Tip of the day</b></div>
        <span class="pill">Public</span>
      </div>
      ${tipsErr ? `<p class="muted">${escapeHtml(tipsErr)}</p>` : `
        ${tipOfDay ? `
          <div style="margin-top:8px;">
            <div><b>${escapeHtml(tipOfDay.title)}</b></div>
            <p class="small" style="margin-top:6px;">${escapeHtml(tipOfDay.body).slice(0, 240)}${tipOfDay.body.length>240 ? "…" : ""}</p>
          </div>
          <div class="row" style="margin-top:12px;">
            <button class="btn" data-open-tip="${tipOfDay.id}">Open this tip</button>
            <button class="btn" data-go="Tricks">All tips</button>
          </div>
        ` : `<p class="muted">No tips yet.</p>`}
      `}
    </div>

    <div class="item">
      <div class="meta">
        <div><b>Projects</b></div>
        <span class="pill">${works.length ? `${works.length} new` : "—"}</span>
      </div>
      ${postsErr ? `<p class="muted">${escapeHtml(postsErr)}</p>` : `
        ${works.length ? `
          <div class="grid" style="margin-top:10px;">
            ${works.map(p => `
              <a class="thumb" href="${p.image_url}" target="_blank" rel="noreferrer" title="${escapeHtml(stripPostPrefix(p.text)).replace(/"/g,'&quot;')}">
                <img src="${p.image_url}" alt="work" loading="lazy">
              </a>
            `).join("")}
          </div>
          <div class="row" style="margin-top:12px;">
            <button class="btn" data-go-community="work">Open community</button>
            ${state.me ? `<button class="btn primary" data-new-post="work">Add your work</button>` : ``}
          </div>
        ` : `
          <p class="muted">No works shared yet. Be the first to post a finished project!</p>
          <div class="row">
            <button class="btn" data-go="Community">Open community</button>
          </div>
        `}
      `}
    </div>

    <div class="item">
      <div class="meta">
        <div><b>Questions &amp; Answers</b></div>
        <span class="pill">${questions.length ? "Live" : "—"}</span>
      </div>
      ${postsErr ? `<p class="muted">${escapeHtml(postsErr)}</p>` : `
        ${questions.length ? `
          <div class="list" style="margin-top:10px; gap:8px;">
            ${questions.map(p => `
              <div class="item" style="padding:10px;">
                <div class="muted" style="font-size:12px;">${escapeHtml(p.author_display_name || "Member")}</div>
                <div style="margin-top:6px;">${preview(p.text, "Question")}</div>
                <div class="row" style="margin-top:10px;">
                  <button class="btn" data-open-qa="${p.id}">Open answers</button>
                </div>
              </div>
            `).join("")}
          </div>
        ` : `<p class="muted">No questions yet. Ask something and others can help — like on Facebook.</p>`}
        <div class="row" style="margin-top:12px;">
          <button class="btn" data-go-community="question">Browse questions</button>
          ${state.me ? `<button class="btn primary" data-new-post="question">Ask a question</button>` : `<button class="btn primary" data-go="Account">Log in to ask</button>`}
        </div>
      `}
    </div>
  `;

  return html;
}

function attachHomeHandlers() {
document.querySelectorAll("[data-go]").forEach((b) => {
  b.onclick = () => { state.tab = b.getAttribute("data-go"); render(); };
});

document.querySelectorAll("[data-open-tip]").forEach((b) => {
  b.onclick = () => {
    const id = b.getAttribute("data-open-tip");
    state.trickFocusId = id;
    state.tab = "Tricks";
    render();
  };
});

document.querySelectorAll("[data-go-community]").forEach((b) => {
  b.onclick = () => {
    const kind = b.getAttribute("data-go-community");
    state.communityFilter = (kind === "question") ? "QUESTIONS" : "WORKS";
    localStorage.setItem("communityFilter", state.communityFilter);
    state.tab = "Community";
    render();
  };
});

document.querySelectorAll("[data-new-post]").forEach((b) => {
  b.onclick = () => {
    const kind = b.getAttribute("data-new-post");
    state.communityFilter = (kind === "question") ? "QUESTIONS" : "WORKS";
    localStorage.setItem("communityFilter", state.communityFilter);
    state.tab = "Community";
    render();
    setTimeout(() => {
      const sel = document.getElementById("p_type");
      const txt = document.getElementById("p_text");
      if (sel) sel.value = (kind === "question") ? "question" : "work";
      if (txt) txt.focus();
    }, 120);
  };
});

document.querySelectorAll("[data-open-qa]").forEach((b) => {
  b.onclick = () => {
    const id = b.getAttribute("data-open-qa");
    state.communityFilter = "QUESTIONS";
    localStorage.setItem("communityFilter", state.communityFilter);
    state.openCommentsPostId = id;
    state.tab = "Community";
    render();
  };
});

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
                <div><b>VIP Digital</b> <span class="small"></span></div>
                <span class="pill">10% off</span>
              </div>
              <div class="small" style="margin-top:6px;">VIP Library + VIP Club + 2 cliparts / month</div>
            </div>
            <div class="item" style="margin:0;">
              <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
                <div><b>VIP Print Pack</b> <span class="small"></span></div>
                <span class="pill">4 credits</span>
              </div>
              <div class="small" style="margin-top:6px;">4 credits / month + 2 cliparts / month • 10% off</div>
            </div>
            <div class="item" style="margin:0;">
              <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
                <div><b>PRO Studio</b> <span class="small"></span></div>
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
    setStatus("Could not load tips: " + e.message, "danger");
    return [];
  });

  const qSample = loggedIn ? `
    <div class="item" style="margin-top:12px;">
      <div class="meta">
        <div><b>Ask a question</b></div>
        <span class="pill">Q&amp;A</span>
      </div>
      <p class="muted">Search tips first. If you can’t find an answer, ask the community — comments work like answers.</p>
      <input id="qa_search" placeholder="Search tips (e.g. 'bleeding', 'glass', 'Mod Podge')">
      <div class="row" style="margin-top:10px;">
        <input id="qa_text" placeholder="Type your question…" style="flex:1;">
        <button class="btn primary" id="qa_ask">Ask</button>
      </div>
      <div class="row" style="margin-top:10px;">
        <button class="btn" id="qa_browse">Browse questions</button>
      </div>
    </div>
  ` : `
    <div class="item" style="margin-top:12px;">
      <div class="meta">
        <div><b>Ask a question</b></div>
        <span class="pill">Q&amp;A</span>
      </div>
      <p class="muted">Log in to ask questions and comment answers.</p>
      <div class="row">
        <button class="btn primary" data-go="Account">Log in / Register</button>
        <button class="btn" data-go="Community">View community</button>
      </div>
    </div>
  `;

  let html = `<h2>Tips</h2>
    <p>Quick techniques, glue tips, surface prep, and "what went wrong".</p>
    ${qSample}
    <div class="item" style="margin-top:12px;">
      <div class="meta">
        <div><b>All tips</b></div>
        <span class="pill">${tricks.length ? `${tricks.length}` : "—"}</span>
      </div>
      <input id="t_search" placeholder="Filter tips by keyword…">
      <div class="list" id="tips_list" style="margin-top:10px;">
        ${tricks.map(t => `
          <div class="item ${String(state.trickFocusId)===String(t.id) ? "highlight" : ""}" id="trick-${t.id}">
            <div class="meta">
              <div><b>${escapeHtml(t.title)}</b> ${t.is_vip ? '<span class="pill">VIP</span>' : ''}</div>
              <div class="small">${new Date(t.created_at).toLocaleString()}</div>
            </div>
            <p>${escapeHtml(t.body).replace(/\n/g,"<br>")}</p>
            ${t.media_url ? `<a class="link" rel="noreferrer" href="${t.media_url}" target="_blank">Open media</a>` : ""}
            
          </div>
        `).join("")}
      </div>
    </div>
  `;

  if (canCreate) {
    html += `
      <div style="margin-top:12px; border-top:1px solid var(--line); padding-top:12px;">
        <h3>Add tip (Admin)</h3>
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
    html += `<p class="small" style="margin-top:12px;">Log in to see VIP tips (if your account is VIP).</p>`;
  }

  return html;
}

async function attachTrickHandlers() {
  if (state.trickFocusId) {
    const id = String(state.trickFocusId);
    setTimeout(() => {
      const el = document.getElementById(`trick-${id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    state.trickFocusId = null;
  }

  const add = $("t_add");
  if (add) {
    add.onclick = async () => {
      try {
        const title = $("t_title").value.trim();
        const body = $("t_body").value.trim();
        const media_url = ($("t_media").value || "").trim() || null;
        const is_vip = !!$("t_vip").checked;
        await api("/tricks", { method: "POST", body: JSON.stringify({ title, body, media_url, is_vip }) });
        setStatus("Tip published.", "success");
        render();
      } catch (e) {
        setStatus("Could not publish: " + e.message, "danger");
      }
    };
  }

  const tSearch = $("t_search");
  if (tSearch) {
    tSearch.oninput = () => {
      const q = (tSearch.value || "").trim().toLowerCase();
      document.querySelectorAll("#tips_list .item").forEach((card) => {
        const text = card.textContent.toLowerCase();
        card.style.display = !q || text.includes(q) ? "" : "none";
      });
    };
  }

  const qaSearch = $("qa_search");
  if (qaSearch && tSearch) {
    qaSearch.oninput = () => { tSearch.value = qaSearch.value; tSearch.oninput(); };
  }

  const ask = $("qa_ask");
  if (ask) {
    ask.onclick = async () => {
      try {
        const text = ($("qa_text").value || "").trim();
        if (!text) return setStatus("Type a question first.", "danger");
        await api("/posts", { method: "POST", body: JSON.stringify({ text: applyPostPrefix("question", text), image_url: null }) });
        setStatus("Question posted. Check answers in Community.", "success");
        state.communityFilter = "QUESTIONS";
        localStorage.setItem("communityFilter", state.communityFilter);
        state.tab = "Community";
        render();
      } catch (e) {
        setStatus("Could not post question: " + e.message, "danger");
      }
    };
  }

  const browse = $("qa_browse");
  if (browse) {
    browse.onclick = () => {
      state.communityFilter = "QUESTIONS";
      localStorage.setItem("communityFilter", state.communityFilter);
      state.tab = "Community";
      render();
    };
  }

  // Support generic nav buttons created in Tricks view
  document.querySelectorAll("[data-go]").forEach((b) => {
    b.onclick = () => { state.tab = b.getAttribute("data-go"); render(); };
  });
}

async function communityView() {
  const posts = await api("/posts").catch((e) => {
    setStatus("Could not load posts: " + e.message, "danger");
    return [];
  });

  const filter = state.communityFilter || "ALL";
  const filtered = posts.filter(p => {
    const type = postTypeFromText(p.text);
    if (filter === "QUESTIONS") return type === "question";
    if (filter === "WORKS") return type !== "question";
    return true;
  });

  let html = `<h2>Community</h2>
    <p>Like a Facebook group: share projects, ask questions, and answer in comments.</p>

    <div class="row" style="margin:10px 0 14px;">
  <label class="small muted" style="margin-right:8px;">View:</label>
  <select id="community_filter" style="max-width:220px;">
    <option value="ALL">All</option>
    <option value="WORKS">Projects</option>
    <option value="QUESTIONS">Questions</option>
  </select>
</div>
  `;

  if (state.me) {
    html += `
      <div class="item" style="margin-bottom:12px;">
        <h3>New post</h3>
        <div class="row">
          <label class="small">Type:</label>
          <select id="p_type">
            <option value="work">My work</option>
            <option value="question">Question</option>
          </select>
        </div>
        <textarea id="p_text" placeholder="Write your post…"></textarea>
        <input id="p_img" placeholder="Image URL (optional)">
        <button class="btn primary" id="p_add">Post</button>
        <div class="small muted" style="margin-top:8px;">Tip: Questions can be answered in comments.</div>
      </div>
    `;
  } else {
    html += `<p class="small">Log in to create posts and comments.</p>`;
  }

  html += `<div class="list">
    ${filtered.map(p => {
      const type = postTypeFromText(p.text);
      const label = type === "question" ? "Question" : "Work";
      const body = escapeHtml(stripPostPrefix(p.text)).replace(/\n/g,"<br>");
      return `
        <div class="item">
          <div class="meta">
            <div>
              <span class="pill">${label}</span>
              <span class="pill">${escapeHtml(p.author_display_name || "Member")}</span>
            </div>
            <div class="small">${new Date(p.created_at).toLocaleString()}</div>
          </div>
          <p>${body}</p>
          ${p.image_url ? `<a class="link"  rel="noreferrer" href="${p.image_url}" target="_blank">Open image</a>` : ""}
          <div class="row" style="margin-top:8px;">
            <button class="btn" data-comments="${p.id}">${type==="question" ? "Answers" : "Comments"}</button>
            ${state.me && state.me.is_admin && type==="question" ? `<button class="btn" data-convert="${p.id}">Save as tip</button>` : ``}
          </div>
          <div id="comments_${p.id}" style="margin-top:8px;"></div>
        </div>
      `;
    }).join("")}
  </div>`;

  return html;
}

async function attachCommunityHandlers() {
  const cf = $("community_filter");
if (cf) {
  cf.value = filter;
  cf.onchange = () => {
    const f = cf.value;
    state.communityFilter = f;
    localStorage.setItem("communityFilter", f);
    render();
  };
}

const add = $("p_add");
  if (add) {
    add.onclick = async () => {
      try {
        const type = ($("p_type")?.value || "work");
        const textRaw = ($("p_text").value || "").trim();
        if (!textRaw) return setStatus("Write something first.", "danger");
        const text = applyPostPrefix(type === "question" ? "question" : "work", textRaw);

        const urlEl = $("p_img");
        let image_url = (urlEl?.value || "").trim() || null;

        // Image uploads are disabled in this MVP. Use an Image URL instead.
await api("/posts", { method: "POST", body: JSON.stringify({ text, image_url }) });
        setStatus("Posted.", "success");
        render();
      } catch (e) {
        setStatus("Could not post: " + e.message, "danger");
      }
    };
  }

  document.querySelectorAll("[data-comments]").forEach((b) => {
    b.onclick = async () => {
      const id = b.getAttribute("data-comments");
      await toggleComments(id);
    };
  });

  document.querySelectorAll("[data-convert]").forEach((b) => {
    b.onclick = async () => {
      const postId = b.getAttribute("data-convert");
      try {
        const comments = await api(`/posts/${postId}/comments`).catch(() => []);
        if (!comments.length) return setStatus("No answers yet. Add an answer in comments first.", "danger");

        const postCard = b.closest(".item");
        const qText = (postCard?.querySelector("p")?.innerText || "").trim();
        const defaultTitle = (qText || "New tip").slice(0, 80);
        const title = (prompt("Tip title:", defaultTitle) || "").trim();
        if (!title) return;

        const defaultBody = (comments[0]?.text || "").trim();
        const body = (prompt("Tip body (from the best answer):", defaultBody) || "").trim();
        if (!body) return;

        await api("/tricks", { method: "POST", body: JSON.stringify({ title, body, media_url: null, is_vip: false }) });
        setStatus("Saved as tip.", "success");
        state.tab = "Tricks";
        render();
      } catch (e) {
        setStatus("Could not save tip: " + e.message, "danger");
      }
    };
  });

  if (state.openCommentsPostId) {
    const pid = state.openCommentsPostId;
    state.openCommentsPostId = null;
    setTimeout(() => toggleComments(pid), 120);
  }
}

async function shopView() {
  // These are the only links you need to monetise on day 1.
  // Later you can change them in ONE place (here).
  // Shop links — set these in dist/config.js (recommended)
const CFG = (window.__CONFIG__ || {});
const SOD = (CFG.SHOP_URL || "https://www.thesecretsofdecoupage.com");
const ACS = (CFG.CLIPSTICK_URL || "https://www.artclipstick.com");

// VIP links (Shopify)
const VIP_PAGE = (CFG.VIP_INFO_URL || `${SOD}/pages/vip`);
const VIP_PRODUCT = (CFG.VIP_SUBSCRIBE_URL || `${SOD}/products/vip-membership`);

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
        ${VIP_DIGITAL || VIP_PRINT_PACK || VIP_PRO_STUDIO ? `
  <div class="row">
    ${VIP_DIGITAL ? `<a class="btn primary" rel="noopener" href="${VIP_DIGITAL}">VIP Digital</a>` : ``}
    ${VIP_PRINT_PACK ? `<a class="btn primary" rel="noopener" href="${VIP_PRINT_PACK}">VIP Print Pack</a>` : ``}
    ${VIP_PRO_STUDIO ? `<a class="btn primary" rel="noopener" href="${VIP_PRO_STUDIO}">PRO Studio</a>` : ``}
  </div>
  <div class="row" style="margin-top:8px;">
    <a class="btn" rel="noopener" href="${VIP_PAGE}">What you get</a>
  </div>
` : `
  <div class="row">
    <a class="btn primary" rel="noopener" href="${VIP_PRODUCT}">Become VIP</a>
    <a class="btn" rel="noopener" href="${VIP_PAGE}">What you get</a>
  </div>
`}
        
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
