// ── Motivational Tips ──
const TIPS = [
  "📚 Reading is dreaming with open eyes!",
  "✨ Every page turns you into a better person.",
  "🚀 One page a day keeps boredom away!",
  "💪 You're building a reading empire, one book at a time.",
  "🔥 Consistency is the key to greatness!",
  "📖 Books are windows to infinite worlds.",
  "🎯 Your reading streak is your superpower!",
  "🌟 Great readers become great thinkers.",
  "💖 Keep reading, keep growing!",
  "🏆 Every finished book is a victory!",
];

const randomTip = TIPS[Math.floor(Math.random() * TIPS.length)];

// ── Local Storage ──
const getBooks = () => JSON.parse(localStorage.getItem("bt_books") || "[]");
const saveBooks = (b) => localStorage.setItem("bt_books", JSON.stringify(b));
const getGlobal = () => JSON.parse(localStorage.getItem("bt_global") || '{"count":0,"lastCheckinDate":null}');
const saveGlobal = (g) => localStorage.setItem("bt_global", JSON.stringify(g));

// ── Firebase Cloud Sync ──
const FIREBASE_KEY = "bt_firebase_url";
const getFirebaseUrl = () => { const u = localStorage.getItem(FIREBASE_KEY); return u ? u.replace(/\/$/, "") : null; };
const setFirebaseUrl = (u) => localStorage.setItem(FIREBASE_KEY, u.replace(/\/$/, ""));
const clearFirebaseUrl = () => localStorage.removeItem(FIREBASE_KEY);

function setSyncStatus(state) {
  const btn = document.getElementById("syncBtn");
  const icon = document.getElementById("syncIcon");
  const label = document.getElementById("syncLabel");
  const states = {
    on:      ["✅", "Synced",   "synced"],
    syncing: ["🔄", "Syncing…", "syncing"],
    error:   ["⚠️", "Error",    "sync-error"],
    off:     ["☁️", "Sync",     ""],
  };
  const [ic, lb, cls] = states[state] || states.off;
  icon.textContent = ic;
  label.textContent = lb;
  btn.className = "sync-btn" + (cls ? " " + cls : "");
}

async function cloudPush() {
  const url = getFirebaseUrl();
  if (!url) return;
  setSyncStatus("syncing");
  try {
    const res = await fetch(`${url}/booktracker.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ books: getBooks(), global: getGlobal(), updatedAt: Date.now() }),
    });
    if (!res.ok) throw new Error();
    setSyncStatus("on");
  } catch { setSyncStatus("error"); }
}

async function cloudPull() {
  const url = getFirebaseUrl();
  if (!url) return null;
  setSyncStatus("syncing");
  try {
    const res = await fetch(`${url}/booktracker.json`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    if (data && data.books) { saveBooks(data.books); if (data.global) saveGlobal(data.global); }
    setSyncStatus("on");
    return data;
  } catch { setSyncStatus("error"); return null; }
}

async function cloudTest(url) {
  try { const r = await fetch(`${url.replace(/\/$/, "")}/booktracker.json`); return r.ok; }
  catch { return false; }
}

function persist(books, global) {
  if (books !== null) saveBooks(books);
  if (global !== null) saveGlobal(global);
  cloudPush();
}

// ── Streak Logic ──
function dayStart(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function calcStreak(current, lastDate) {
  if (!lastDate) return 1;
  const today = dayStart(new Date());
  const last = dayStart(new Date(lastDate));
  const diff = Math.round((today - last) / 86400000);
  if (diff === 0) return current;
  if (diff === 1) return current + 1;
  return 1;
}
function isActiveStreak(lastDate) {
  if (!lastDate) return false;
  const today = new Date();
  const last = new Date(lastDate);
  return isSameDay(today, last) ||
    isSameDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1), last);
}
function checkedToday(lastDate) {
  return lastDate && isSameDay(new Date(), new Date(lastDate));
}

// ── Check-in (auto-add daily target, same as the app) ──
function performCheckin(bookId) {
  const books = getBooks();
  const idx = books.findIndex(b => b.id === bookId);
  if (idx === -1) return null;
  const book = books[idx];
  if (book.currentPage >= book.totalPages) return null;

  const wasFinished = false;
  const pagesLeft = book.totalPages - book.currentPage;
  const pagesAdded = Math.min(book.dailyTarget, pagesLeft);
  const newPage = book.currentPage + pagesAdded;

  book.currentPage = newPage;
  book.streak = calcStreak(book.streak, book.lastCheckinDate);
  book.lastCheckinDate = new Date().toISOString();
  books[idx] = book;

  const g = getGlobal();
  const newGlobal = { count: calcStreak(g.count, g.lastCheckinDate), lastCheckinDate: new Date().toISOString() };

  persist(books, newGlobal);

  const justFinished = newPage >= book.totalPages;
  return { book, justFinished, pagesAdded };
}

// ── Confetti (same as app — from corners) ──
function fireConfetti() {
  const end = Date.now() + 1500;
  const colors = ["#f59e0b", "#f97316", "#3b82f6", "#10b981"];
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

// ── Toast ──
let toastTimer;
function showToast(title, desc) {
  const t = document.getElementById("toast");
  document.getElementById("toastTitle").textContent = title;
  document.getElementById("toastDesc").textContent = desc;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3500);
}

// ── Escape HTML ──
function esc(s) {
  return (s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── SVG Icons ──
const ICON_BOOK  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>`;
const ICON_TARGET = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`;
const ICON_MENU   = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>`;
const ICON_EDIT   = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>`;
const ICON_TRASH  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6m3,0V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2"/></svg>`;
const ICON_CHECK  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
const ICON_CLOCK  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>`;
const ICON_FLAME  = `<svg viewBox="0 0 24 24"><path d="M12.5 2c0 0-4.5 5-4.5 10a4.5 4.5 0 0 0 9 0c0-3-1.5-6-1.5-6s-1 2-2.5 2c0 0 .5-4-0.5-6z"/><path d="M12 14c-1.1 0-2-.9-2-2 0-1.5 2-4 2-4s2 2.5 2 4c0 1.1-.9 2-2 2z"/></svg>`;

// ── Build Book Card ──
function makeCard(book) {
  const pct = Math.min(100, Math.round((book.currentPage / book.totalPages) * 100));
  const isFinished = book.currentPage >= book.totalPages;
  const pagesLeft = Math.max(0, book.totalPages - book.currentPage);
  const daysLeft = pagesLeft > 0 ? Math.ceil(pagesLeft / book.dailyTarget) : 0;
  const streak = isActiveStreak(book.lastCheckinDate) ? book.streak : 0;
  const todayDone = checkedToday(book.lastCheckinDate);

  const card = document.createElement("div");
  card.className = "book-card glass-card";

  // Cover
  const coverInner = book.imageUrl
    ? `<img src="${esc(book.imageUrl)}" alt="Cover" onerror="this.style.display='none';this.parentElement.innerHTML='${ICON_BOOK.replace(/"/g,"&quot;")}';">`
    : ICON_BOOK;

  // Streak display
  const flameClass = streak > 0 ? "streak-flame active" : "streak-flame inactive";
  const flameInner = streak > 0
    ? `<svg class="${flameClass}" viewBox="0 0 24 24"><path d="M12.5 2c0 0-4.5 5-4.5 10a4.5 4.5 0 0 0 9 0c0-3-1.5-6-1.5-6s-1 2-2.5 2c0 0 .5-4-0.5-6z"/><path d="M12 14c-1.1 0-2-.9-2-2 0-1.5 2-4 2-4s2 2.5 2 4c0 1.1-.9 2-2 2z"/></svg>`
    : `<svg class="${flameClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12.5 2c0 0-4.5 5-4.5 10a4.5 4.5 0 0 0 9 0c0-3-1.5-6-1.5-6s-1 2-2.5 2c0 0 .5-4-0.5-6z"/></svg>`;

  // Check-in button
  let btnClass, btnContent;
  if (isFinished) {
    btnClass = "checkin-btn finished";
    btnContent = `${ICON_CHECK} Completed`;
  } else if (todayDone) {
    btnClass = "checkin-btn done";
    btnContent = `${ICON_CHECK} Done Today`;
  } else {
    btnClass = "checkin-btn default";
    btnContent = "Mark Daily Goal";
  }

  card.innerHTML = `
    <div class="card-header">
      <div class="card-header-left">
        <div class="book-cover-wrap">${coverInner}</div>
        <div class="card-info">
          <div class="card-title">${esc(book.title)}</div>
          ${book.author ? `<div class="card-author">by ${esc(book.author)}</div>` : ""}
          <div class="card-target">
            ${ICON_TARGET}
            ${book.dailyTarget} pages / day
          </div>
        </div>
      </div>
      <div class="menu-wrap">
        <button class="menu-btn" data-menu="${book.id}">${ICON_MENU}</button>
        <div class="dropdown" id="menu-${book.id}">
          <button class="dd-item" data-edit="${book.id}">${ICON_EDIT} Edit Book</button>
          <button class="dd-item danger" data-del="${book.id}">${ICON_TRASH} Delete</button>
        </div>
      </div>
    </div>

    <div class="progress-section">
      <div class="progress-top">
        <div class="progress-pct">${pct}%</div>
        <div class="progress-right">
          <span class="progress-pages">${book.currentPage} / ${book.totalPages} p</span>
          ${!isFinished && daysLeft > 0 ? `<span class="progress-days">${ICON_CLOCK} ${daysLeft} days left</span>` : ""}
        </div>
      </div>
      <div class="bar-track">
        <div class="bar-fill" data-pct="${pct}"></div>
      </div>
    </div>

    <div class="card-footer">
      <div class="streak-info">
        <span class="streak-lbl">Streak</span>
        <div class="streak-display">
          ${flameInner}
          <span class="streak-num ${streak > 0 ? "active" : "inactive"}">${streak}</span>
        </div>
      </div>
      <button class="${btnClass}" ${isFinished ? "disabled" : ""} data-checkin="${book.id}">
        ${btnContent}
      </button>
    </div>
  `;

  // Animate progress bar after DOM insert
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const bar = card.querySelector(".bar-fill");
    if (bar) bar.style.width = bar.dataset.pct + "%";
  }));

  return card;
}

// ── Full Render ──
function render() {
  const books = getBooks();
  const g = getGlobal();

  // Global streak
  const globalStreak = isActiveStreak(g.lastCheckinDate) ? g.count : 0;
  document.getElementById("globalStreakCount").textContent = `${globalStreak} Days`;

  const active = books.filter(b => b.currentPage < b.totalPages);
  const completed = books.filter(b => b.currentPage >= b.totalPages);

  // Empty state
  const isEmpty = books.length === 0;
  document.getElementById("emptyState").classList.toggle("show", isEmpty);
  document.getElementById("topRow").style.display = "flex";

  // Active
  const activeSection = document.getElementById("activeSection");
  const activeGrid = document.getElementById("activeGrid");
  activeSection.style.display = active.length ? "block" : "none";
  document.getElementById("activeCount").textContent = active.length;
  activeGrid.innerHTML = "";
  active.forEach((b, i) => {
    const c = makeCard(b);
    c.style.animationDelay = `${i * 0.1}s`;
    activeGrid.appendChild(c);
  });

  // Completed
  const completedSection = document.getElementById("completedSection");
  const completedGrid = document.getElementById("completedGrid");
  completedSection.style.display = completed.length ? "block" : "none";
  document.getElementById("completedCount").textContent = completed.length;
  completedGrid.innerHTML = "";
  completed.forEach((b, i) => {
    const c = makeCard(b);
    c.style.animationDelay = `${i * 0.1}s`;
    completedGrid.appendChild(c);
  });

  // Tip
  const tipCard = document.getElementById("tipCard");
  tipCard.style.display = books.length > 0 ? "flex" : "none";

  // Stats
  const statsSection = document.getElementById("statsSection");
  statsSection.style.display = books.length > 0 ? "block" : "none";
  if (books.length > 0) {
    const totalRead = books.reduce((s, b) => s + b.currentPage, 0);
    const totalPages = books.reduce((s, b) => s + b.totalPages, 0);
    const prog = totalPages > 0 ? Math.round((totalRead / totalPages) * 100) : 0;
    const avg = totalRead > 0 ? Math.round(totalRead / Math.max(1, books.length * 5)) : 0;
    document.getElementById("sPagesRead").textContent = totalRead.toLocaleString();
    document.getElementById("sPagesReadSub").textContent = `across ${books.length} book${books.length !== 1 ? "s" : ""}`;
    document.getElementById("sCompleted").textContent = completed.length;
    document.getElementById("sProgress").textContent = `${prog}%`;
    document.getElementById("sAvg").textContent = avg;
    document.getElementById("sBooksLeft").textContent = active.length;
  }
}

// ── Modal Helpers ──
function openModal(id) { document.getElementById(id).classList.add("open"); document.body.style.overflow = "hidden"; }
function closeModal(id) { document.getElementById(id).classList.remove("open"); document.body.style.overflow = ""; }
function closeAllMenus() { document.querySelectorAll(".dropdown.open").forEach(d => d.classList.remove("open")); }

// ── Global Click Delegation ──
document.addEventListener("click", e => {
  const t = e.target.closest("[data-close],[data-menu],[data-edit],[data-del],[data-checkin]") || e.target;

  if (t.dataset.close) { closeModal(t.dataset.close); return; }
  if (e.target.classList.contains("overlay")) { closeModal(e.target.id); return; }

  if (t.dataset.menu) {
    e.stopPropagation();
    const m = document.getElementById(`menu-${t.dataset.menu}`);
    const wasOpen = m.classList.contains("open");
    closeAllMenus();
    if (!wasOpen) m.classList.add("open");
    return;
  }
  if (t.dataset.edit) { openEditModal(t.dataset.edit); closeAllMenus(); return; }
  if (t.dataset.del)  { openDeleteModal(t.dataset.del); closeAllMenus(); return; }
  if (t.dataset.checkin && !t.disabled) { handleCheckin(t.dataset.checkin, t); return; }

  if (!t.closest(".menu-wrap")) closeAllMenus();
});

// ── Check-in Handler ──
function handleCheckin(bookId, btn) {
  const books = getBooks();
  const book = books.find(b => b.id === bookId);
  if (!book || book.currentPage >= book.totalPages || checkedToday(book.lastCheckinDate)) return;

  btn.classList.add("loading");
  btn.disabled = true;

  setTimeout(() => {
    const result = performCheckin(bookId);
    if (result) {
      if (result.justFinished) {
        fireConfetti();
        showToast("Congratulations! 🎉", `You've finished reading ${result.book.title}!`);
      } else {
        const newStreak = result.book.streak;
        showToast("Daily Goal Met! 🔥", `Added ${result.pagesAdded} pages. Streak: ${newStreak}`);
      }
    }
    render();
  }, 200); // slight delay for feel
}

// ── Add Book ──
document.getElementById("openAddBtn").addEventListener("click", () => { document.getElementById("addForm").reset(); openModal("addModal"); });
document.getElementById("emptyAddBtn").addEventListener("click", () => { document.getElementById("addForm").reset(); openModal("addModal"); });
document.getElementById("addForm").addEventListener("submit", e => {
  e.preventDefault();
  const btn = document.getElementById("addSubmitBtn");
  btn.textContent = "Adding Book...";
  btn.disabled = true;

  setTimeout(() => {
    const books = getBooks();
    books.push({
      id: Date.now().toString(),
      title: document.getElementById("aTitle").value.trim(),
      author: document.getElementById("aAuthor").value.trim(),
      imageUrl: document.getElementById("aImage").value.trim(),
      totalPages: parseInt(document.getElementById("aTotal").value),
      dailyTarget: parseInt(document.getElementById("aTarget").value),
      currentPage: parseInt(document.getElementById("aCurrent").value) || 0,
      streak: 0,
      lastCheckinDate: null,
      createdAt: new Date().toISOString(),
    });
    persist(books, null);
    closeModal("addModal");
    btn.textContent = "Add Book";
    btn.disabled = false;
    render();
  }, 150);
});

// ── Edit Book ──
function openEditModal(id) {
  const book = getBooks().find(b => b.id === id);
  if (!book) return;
  document.getElementById("eId").value = book.id;
  document.getElementById("eTitle").value = book.title;
  document.getElementById("eAuthor").value = book.author || "";
  document.getElementById("eImage").value = book.imageUrl || "";
  document.getElementById("eTotal").value = book.totalPages;
  document.getElementById("ePage").value = book.currentPage;
  document.getElementById("eTarget").value = book.dailyTarget;
  openModal("editModal");
}
document.getElementById("editForm").addEventListener("submit", e => {
  e.preventDefault();
  const books = getBooks();
  const idx = books.findIndex(b => b.id === document.getElementById("eId").value);
  if (idx === -1) return;
  const total = parseInt(document.getElementById("eTotal").value);
  books[idx] = {
    ...books[idx],
    title:       document.getElementById("eTitle").value.trim(),
    author:      document.getElementById("eAuthor").value.trim(),
    imageUrl:    document.getElementById("eImage").value.trim(),
    totalPages:  total,
    dailyTarget: parseInt(document.getElementById("eTarget").value),
    currentPage: Math.min(parseInt(document.getElementById("ePage").value) || 0, total),
  };
  persist(books, null);
  closeModal("editModal");
  render();
});

// ── Delete Book ──
let pendingDel = null;
function openDeleteModal(id) {
  const book = getBooks().find(b => b.id === id);
  if (!book) return;
  pendingDel = id;
  document.getElementById("dBookTitle").textContent = book.title;
  openModal("deleteModal");
}
document.getElementById("dConfirmBtn").addEventListener("click", () => {
  if (!pendingDel) return;
  const btn = document.getElementById("dConfirmBtn");
  btn.textContent = "Deleting...";
  btn.disabled = true;
  setTimeout(() => {
    persist(getBooks().filter(b => b.id !== pendingDel), null);
    pendingDel = null;
    btn.textContent = "Delete Book";
    btn.disabled = false;
    closeModal("deleteModal");
    render();
  }, 150);
});

// ── Sync Modal ──
document.getElementById("syncBtn").addEventListener("click", () => {
  const url = getFirebaseUrl();
  if (url) {
    document.getElementById("syncConnected").style.display = "block";
    document.getElementById("syncSetup").style.display = "none";
    document.getElementById("syncUrlDisplay").value = url;
  } else {
    document.getElementById("syncConnected").style.display = "none";
    document.getElementById("syncSetup").style.display = "block";
  }
  openModal("syncModal");
});

document.getElementById("connectSyncBtn").addEventListener("click", async () => {
  const raw = document.getElementById("firebaseUrlInput").value.trim();
  if (!raw) return alert("Please enter your Firebase Database URL.");
  if (!raw.startsWith("https://")) return alert("URL must start with https://");
  const btn = document.getElementById("connectSyncBtn");
  btn.textContent = "Testing…";
  btn.disabled = true;
  const ok = await cloudTest(raw);
  btn.disabled = false;
  btn.textContent = "Connect & Sync";
  if (!ok) { alert("Could not connect. Check the URL and ensure your database is in Test Mode."); return; }
  setFirebaseUrl(raw);
  const data = await cloudPull();
  if (!data || !data.books) await cloudPush();
  render();
  closeModal("syncModal");
});

document.getElementById("disconnectBtn").addEventListener("click", () => {
  if (confirm("Disconnect cloud sync? Your local data stays untouched.")) {
    clearFirebaseUrl(); setSyncStatus("off"); closeModal("syncModal");
  }
});

document.getElementById("forcePullBtn").addEventListener("click", async () => {
  if (confirm("Pull from cloud? This will overwrite local data with the cloud version.")) {
    await cloudPull(); render(); closeModal("syncModal");
  }
});

// ── Dark Mode ──
function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.getElementById("moonIcon").style.display = theme === "dark" ? "none" : "block";
  document.getElementById("sunIcon").style.display = theme === "dark" ? "block" : "none";
  localStorage.setItem("bt_theme", theme);
}
document.getElementById("themeToggle").addEventListener("click", () => {
  applyTheme(document.documentElement.classList.contains("dark") ? "light" : "dark");
});

// ── Init ──
applyTheme(localStorage.getItem("bt_theme") || "light");
document.getElementById("tipText").textContent = randomTip;

if (getFirebaseUrl()) {
  setSyncStatus("syncing");
  cloudPull().then(() => render());
} else {
  setSyncStatus("off");
  render();
}
