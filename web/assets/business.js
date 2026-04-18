/* global document, window, HTMLInputElement, requestAnimationFrame, IntersectionObserver */

const BUSINESS_STORAGE_KEY = "stallpass-business-dashboard-v1";

const DEFAULT_DASHBOARD_STATE = {
  theme: "signal",
  density: "comfortable",
  widgets: {
    checklist: true,
    operations: true,
    support: true,
    playbook: true,
    notes: true,
  },
  checklist: {
    claimLocation: false,
    setHours: false,
    publishAmenities: false,
    uploadHero: false,
    reviewPolicy: false,
  },
  operations: {
    changingTable: false,
    accessibleRouting: false,
    customerOnly: false,
    featuredPlacement: false,
  },
  support: {
    supportEmail: "support@stallpass.org",
    privacyUrl: "/privacy/",
    termsUrl: "/terms/",
    supportUrl: "/support/",
    appStoreUrl: "",
    playStoreUrl: "",
  },
  playbook: {
    customerPromise: "Clean restrooms, honest hours, and a warm welcome — every time you stop in.",
    replyTemplate:
      "Thanks for letting us know. We looked into it, updated the listing, and made sure the team on the ground saw your note.",
  },
  notes:
    "Jot down reminders for the team — featured-placement timing, cleaning rotations, anything you want the next shift to see.",
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeStoredState(raw) {
  return {
    ...clone(DEFAULT_DASHBOARD_STATE),
    ...raw,
    widgets: {
      ...DEFAULT_DASHBOARD_STATE.widgets,
      ...(raw.widgets || {}),
    },
    checklist: {
      ...DEFAULT_DASHBOARD_STATE.checklist,
      ...(raw.checklist || {}),
    },
    operations: {
      ...DEFAULT_DASHBOARD_STATE.operations,
      ...(raw.operations || {}),
    },
    support: {
      ...DEFAULT_DASHBOARD_STATE.support,
      ...(raw.support || {}),
    },
    playbook: {
      ...DEFAULT_DASHBOARD_STATE.playbook,
      ...(raw.playbook || {}),
    },
  };
}

function loadState() {
  try {
    const stored = window.localStorage.getItem(BUSINESS_STORAGE_KEY);
    if (!stored) {
      return clone(DEFAULT_DASHBOARD_STATE);
    }

    return mergeStoredState(JSON.parse(stored));
  } catch (_error) {
    return clone(DEFAULT_DASHBOARD_STATE);
  }
}

let state = loadState();

function persistState() {
  window.localStorage.setItem(BUSINESS_STORAGE_KEY, JSON.stringify(state));
}

function countCompletedChecklist() {
  return Object.values(state.checklist).filter(Boolean).length;
}

function countLiveSupportSurfaces() {
  return Object.values(state.support).filter((value) => typeof value === "string" && value.trim().length > 0).length;
}

function applyVisualState() {
  document.body.dataset.theme = state.theme;
  document.body.dataset.density = state.density;

  document.querySelectorAll("[data-theme-choice]").forEach((node) => {
    node.classList.toggle("is-selected", node.getAttribute("data-theme-choice") === state.theme);
  });

  document.querySelectorAll("[data-density-choice]").forEach((node) => {
    node.classList.toggle("is-selected", node.getAttribute("data-density-choice") === state.density);
  });
}

// --- Animated counter helper ---
let prevMetrics = { setup: 0, locations: 0, links: 0, tasks: 0 };

function animateValue(element, start, end, suffix, duration) {
  if (!element) return;
  const startTime = performance.now();
  const diff = end - start;

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + diff * eased);
    element.textContent = current + suffix;

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

function renderMetrics() {
  const checklistComplete = countCompletedChecklist();
  const checklistTotal = Object.keys(state.checklist).length;
  const setupScore = Math.round((checklistComplete / checklistTotal) * 100);
  const pendingTasks = checklistTotal - checklistComplete;
  const liveLinks = countLiveSupportSurfaces();
  const locations = state.checklist.claimLocation ? 1 : 0;

  animateValue(document.querySelector("[data-metric-setup]"), prevMetrics.setup, setupScore, "%", 600);
  animateValue(document.querySelector("[data-metric-locations]"), prevMetrics.locations, locations, "", 400);
  animateValue(document.querySelector("[data-metric-links]"), prevMetrics.links, liveLinks, "", 400);
  animateValue(document.querySelector("[data-metric-tasks]"), prevMetrics.tasks, pendingTasks, "", 400);

  prevMetrics = { setup: setupScore, locations, links: liveLinks, tasks: pendingTasks };

  document.querySelector("[data-progress-text]").textContent = checklistComplete + " of " + checklistTotal + " complete";
  document.querySelector("[data-progress-bar]").style.width = setupScore + "%";
}

// --- Smooth widget toggle with hiding animation ---
function renderWidgets() {
  document.querySelectorAll("[data-widget]").forEach((widget) => {
    const key = widget.getAttribute("data-widget");
    const shouldShow = Boolean(state.widgets[key]);
    const isCurrentlyHidden = widget.classList.contains("is-hidden");

    if (shouldShow && isCurrentlyHidden) {
      widget.classList.remove("is-hidden");
      widget.classList.remove("is-hiding");
      // Trigger reflow for animation
      void widget.offsetHeight;
      widget.classList.add("is-visible");
    } else if (!shouldShow && !isCurrentlyHidden) {
      widget.classList.add("is-hiding");
      setTimeout(() => {
        widget.classList.add("is-hidden");
        widget.classList.remove("is-hiding");
      }, 350);
    }
  });

  document.querySelectorAll("[data-widget-toggle]").forEach((checkbox) => {
    const key = checkbox.getAttribute("data-widget-toggle");
    checkbox.checked = Boolean(state.widgets[key]);
  });
}

// --- Checklist completion celebration ---
function updateCompletionBanner() {
  const banner = document.querySelector("[data-checklist-banner]");
  if (!banner) return;

  const allComplete = Object.values(state.checklist).every(Boolean);

  if (allComplete) {
    banner.classList.remove("is-hidden");
    // Add a brief scale-pulse to all metric cards
    document.querySelectorAll(".metric-card").forEach((card) => {
      card.style.animation = "scaleIn 400ms ease";
      setTimeout(() => { card.style.animation = ""; }, 400);
    });
  } else {
    banner.classList.add("is-hidden");
  }
}

function renderChecklist() {
  document.querySelectorAll("[data-checklist-item]").forEach((checkbox) => {
    const key = checkbox.getAttribute("data-checklist-item");
    checkbox.checked = Boolean(state.checklist[key]);
  });

  updateCompletionBanner();
}

function renderOperations() {
  document.querySelectorAll("[data-operation-flag]").forEach((checkbox) => {
    const key = checkbox.getAttribute("data-operation-flag");
    checkbox.checked = Boolean(state.operations[key]);
  });

  const summary = document.querySelector("[data-operation-summary]");
  summary.innerHTML = [
    {
      title: "Baby changing",
      pill: state.operations.changingTable ? "Live" : "Add it",
      copy: state.operations.changingTable
        ? "Parents can see you offer a changing table when they pick a spot."
        : "Turn this on to show parents that your spot is family-friendly.",
    },
    {
      title: "Accessibility",
      pill: state.operations.accessibleRouting ? "Live" : "Add it",
      copy: state.operations.accessibleRouting
        ? "Guests can see your accessible entrance and route notes."
        : "Share door width, step-free route, or any helpful notes for guests.",
    },
    {
      title: "Access policy",
      pill: state.operations.customerOnly ? "Customer only" : "Open access",
      copy: state.operations.customerOnly
        ? "Guests know a purchase or staff interaction is required — no surprises."
        : "Anyone can stop in without needing to buy something.",
    },
    {
      title: "Featured placement",
      pill: state.operations.featuredPlacement ? "Boosted" : "Off",
      copy: state.operations.featuredPlacement
        ? "Your spot is set to appear at the top of the map in your area."
        : "Turn this on to boost your listing above nearby competitors.",
    },
  ]
    .map(
      (item) => `
        <article class="status-card">
          <span class="status-pill">${item.pill}</span>
          <strong class="status-title">${item.title}</strong>
          <p class="status-copy">${item.copy}</p>
        </article>
      `,
    )
    .join("");
}

function renderSupport() {
  const form = document.querySelector("[data-support-form]");
  Object.entries(state.support).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field) {
      field.value = value;
    }
  });
}

function renderTextAreas() {
  document.querySelector("[data-customer-promise]").value = state.playbook.customerPromise;
  document.querySelector("[data-reply-template]").value = state.playbook.replyTemplate;
  document.querySelector("[data-team-notes]").value = state.notes;
}

function render() {
  applyVisualState();
  renderMetrics();
  renderWidgets();
  renderChecklist();
  renderOperations();
  renderSupport();
  renderTextAreas();
  updateCompletionBanner();
}

// --- Event listeners ---

document.querySelectorAll("[data-theme-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    state.theme = button.getAttribute("data-theme-choice");
    persistState();
    render();
  });
});

document.querySelectorAll("[data-density-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    state.density = button.getAttribute("data-density-choice");
    persistState();
    render();
  });
});

// Widget toggle with scroll-to-widget on enable
document.querySelectorAll("[data-widget-toggle]").forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    const key = checkbox.getAttribute("data-widget-toggle");
    state.widgets[key] = checkbox.checked;
    persistState();
    render();

    // If toggling on, scroll to the widget
    if (checkbox.checked) {
      const widget = document.querySelector('[data-widget="' + key + '"]');
      if (widget) {
        setTimeout(() => {
          widget.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    }
  });
});

document.querySelectorAll("[data-checklist-item]").forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    state.checklist[checkbox.getAttribute("data-checklist-item")] = checkbox.checked;
    persistState();
    render();
  });
});

document.querySelectorAll("[data-operation-flag]").forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    state.operations[checkbox.getAttribute("data-operation-flag")] = checkbox.checked;
    persistState();
    render();
  });
});

const supportForm = document.querySelector("[data-support-form]");
supportForm.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  state.support[target.name] = target.value;
  persistState();
  renderMetrics();
});

document.querySelector("[data-customer-promise]").addEventListener("input", (event) => {
  state.playbook.customerPromise = event.target.value;
  persistState();
});

document.querySelector("[data-reply-template]").addEventListener("input", (event) => {
  state.playbook.replyTemplate = event.target.value;
  persistState();
});

document.querySelector("[data-team-notes]").addEventListener("input", (event) => {
  state.notes = event.target.value;
  persistState();
});

// Reset with confirmation dialog
document.querySelector("[data-reset-dashboard]").addEventListener("click", () => {
  const confirmed = window.confirm("Reset all dashboard state? This will clear your checklist, operations, notes, and support settings.");
  if (!confirmed) return;

  state = clone(DEFAULT_DASHBOARD_STATE);
  prevMetrics = { setup: 0, locations: 0, links: 0, tasks: 0 };
  persistState();
  render();
});

// Keyboard accessibility for checklist items and control cards
document.querySelectorAll(".checklist-item, .control-card").forEach((label) => {
  label.setAttribute("tabindex", "0");
  label.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const checkbox = label.querySelector("input[type='checkbox']");
      if (checkbox) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  });
});

// Initial render
render();

// Add contextual tooltips to metric values
function applyMetricTooltips() {
  const setupEl = document.querySelector("[data-metric-setup]");
  const locEl = document.querySelector("[data-metric-locations]");
  const linksEl = document.querySelector("[data-metric-links]");
  const tasksEl = document.querySelector("[data-metric-tasks]");

  if (setupEl) setupEl.title = "Percentage of listing checklist items completed";
  if (locEl) locEl.title = "Number of claimed locations in your checklist";
  if (linksEl) linksEl.title = "Number of support URLs and emails configured";
  if (tasksEl) tasksEl.title = "Remaining checklist items for this location";
}
applyMetricTooltips();

// Scroll-reveal observer
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
);

document.querySelectorAll("[data-reveal]").forEach((el) => {
  revealObserver.observe(el);
});

/* ========================================================
   Enhancements
   ======================================================== */

// --- Toast notifications ---
function toast(message, variant) {
  const stack = document.querySelector("[data-toast-stack]");
  if (!stack) return;
  const node = document.createElement("div");
  node.className = "toast toast-" + (variant || "info");
  node.textContent = message;
  stack.appendChild(node);
  setTimeout(() => {
    node.classList.add("is-leaving");
    setTimeout(() => node.remove(), 260);
  }, 2600);
}

// --- Scrollspy section jumper ---
const jumperLinks = Array.from(document.querySelectorAll("[data-jump]"));
const sectionIds = jumperLinks.map((a) => a.getAttribute("href").slice(1));
const sectionEls = sectionIds
  .map((id) => document.getElementById(id))
  .filter(Boolean);

const spyObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      jumperLinks.forEach((a) => {
        a.classList.toggle("is-active", a.getAttribute("href") === "#" + id);
      });
    });
  },
  { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
);
sectionEls.forEach((el) => spyObserver.observe(el));

jumperLinks.forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const id = a.getAttribute("href").slice(1);
    const target = document.getElementById(id);
    if (target) {
      // account for sticky nav (~56px)
      const y = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  });
});

// --- Confetti (lightweight, zero-dep) ---
function fireConfetti() {
  const canvas = document.querySelector("[data-confetti]");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const colors = ["#1d5cf2", "#18725a", "#a855f7", "#06b6d4", "#f59e0b"];
  const pieces = Array.from({ length: 140 }, () => ({
    x: window.innerWidth / 2,
    y: window.innerHeight / 3,
    vx: (Math.random() - 0.5) * 14,
    vy: Math.random() * -14 - 4,
    g: 0.35,
    size: Math.random() * 8 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    life: 0,
  }));
  let frame = 0;
  const maxFrames = 180;
  function tick() {
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((p) => {
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - frame / maxFrames);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
      ctx.restore();
    });
    if (frame < maxFrames) {
      requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  tick();
}

// Fire confetti when checklist hits 100% (but only on transitions)
let wasAllComplete = Object.values(state.checklist).every(Boolean);
const _origUpdateBanner = updateCompletionBanner;
updateCompletionBanner = function () {
  _origUpdateBanner();
  const allComplete = Object.values(state.checklist).every(Boolean);
  if (allComplete && !wasAllComplete) {
    fireConfetti();
    toast("Launch checklist complete — you're review-ready!", "success");
  }
  wasAllComplete = allComplete;
};

// --- Command palette ---
const cmdkOverlay = document.querySelector("[data-cmdk-overlay]");
const cmdkInput = document.querySelector("[data-cmdk-input]");
const cmdkList = document.querySelector("[data-cmdk-list]");
const cmdkTrigger = document.querySelector("[data-open-cmdk]");

const commands = [
  { id: "jump-pitch", title: "Jump to: Why join", sub: "Scroll to pitch section", tag: "Nav", glyph: "→", run: () => scrollToId("pitch") },
  { id: "jump-metrics", title: "Jump to: Metrics", sub: "Scroll to dashboard summary", tag: "Nav", glyph: "→", run: () => scrollToId("metrics") },
  { id: "jump-checklist", title: "Jump to: Launch checklist", sub: "Scroll to checklist widget", tag: "Nav", glyph: "→", run: () => scrollToId("checklist") },
  { id: "jump-operations", title: "Jump to: Operations", sub: "Scroll to operations controls", tag: "Nav", glyph: "→", run: () => scrollToId("operations") },
  { id: "jump-support", title: "Jump to: Support links", sub: "Scroll to support URLs", tag: "Nav", glyph: "→", run: () => scrollToId("support") },
  { id: "jump-playbook", title: "Jump to: Reputation playbook", sub: "Scroll to playbook", tag: "Nav", glyph: "→", run: () => scrollToId("playbook") },
  { id: "jump-notes", title: "Jump to: Team notes", sub: "Scroll to notes widget", tag: "Nav", glyph: "→", run: () => scrollToId("notes") },
  { id: "theme-signal", title: "Theme: Signal", sub: "Apply the blue signal palette", tag: "Theme", glyph: "◐", run: () => setTheme("signal") },
  { id: "theme-stone", title: "Theme: Stone", sub: "Apply the warm stone palette", tag: "Theme", glyph: "◐", run: () => setTheme("stone") },
  { id: "theme-verdant", title: "Theme: Verdant", sub: "Apply the green verdant palette", tag: "Theme", glyph: "◐", run: () => setTheme("verdant") },
  { id: "density-comfortable", title: "Density: Comfortable", sub: "Roomier spacing", tag: "Layout", glyph: "▦", run: () => setDensity("comfortable") },
  { id: "density-compact", title: "Density: Compact", sub: "Tighter spacing", tag: "Layout", glyph: "▦", run: () => setDensity("compact") },
  { id: "export", title: "Export dashboard as JSON", sub: "Copy current state to clipboard", tag: "Data", glyph: "↗", run: exportState },
  { id: "reset", title: "Reset dashboard", sub: "Clear all local state", tag: "Data", glyph: "↺", run: confirmReset },
  { id: "toggle-checklist", title: "Toggle widget: Launch checklist", sub: "", tag: "Widget", glyph: "◨", run: () => toggleWidget("checklist") },
  { id: "toggle-operations", title: "Toggle widget: Operations", sub: "", tag: "Widget", glyph: "◨", run: () => toggleWidget("operations") },
  { id: "toggle-support", title: "Toggle widget: Support", sub: "", tag: "Widget", glyph: "◨", run: () => toggleWidget("support") },
  { id: "toggle-playbook", title: "Toggle widget: Playbook", sub: "", tag: "Widget", glyph: "◨", run: () => toggleWidget("playbook") },
  { id: "toggle-notes", title: "Toggle widget: Notes", sub: "", tag: "Widget", glyph: "◨", run: () => toggleWidget("notes") },
];

let cmdkActive = 0;

function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 80;
  window.scrollTo({ top: y, behavior: "smooth" });
}

function setTheme(name) {
  state.theme = name;
  persistState();
  render();
  toast("Theme set to " + name);
}

function setDensity(name) {
  state.density = name;
  persistState();
  render();
  toast("Density: " + name);
}

function toggleWidget(key) {
  state.widgets[key] = !state.widgets[key];
  persistState();
  render();
  toast((state.widgets[key] ? "Shown: " : "Hidden: ") + key);
}

function exportState() {
  const json = JSON.stringify(state, null, 2);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(json).then(
      () => toast("Dashboard state copied to clipboard", "success"),
      () => toast("Clipboard unavailable — check console"),
    );
  }
  // Also log for fallback
  console.log("[StallPass Business] dashboard state:\n" + json);
}

function confirmReset() {
  if (!window.confirm("Reset all dashboard state?")) return;
  state = clone(DEFAULT_DASHBOARD_STATE);
  prevMetrics = { setup: 0, locations: 0, links: 0, tasks: 0 };
  persistState();
  render();
  toast("Dashboard reset", "info");
}

function renderCmdkList(filter) {
  const q = (filter || "").toLowerCase().trim();
  const filtered = q
    ? commands.filter((c) => (c.title + " " + c.sub + " " + c.tag).toLowerCase().includes(q))
    : commands;

  if (filtered.length === 0) {
    cmdkList.innerHTML = '<li class="cmdk-empty">No matching commands</li>';
    return;
  }

  cmdkActive = Math.min(cmdkActive, filtered.length - 1);
  cmdkList.innerHTML = filtered
    .map(
      (c, i) => `
        <li class="cmdk-item ${i === cmdkActive ? "is-active" : ""}" role="option" data-cmdk-id="${c.id}">
          <span class="cmdk-item-glyph" aria-hidden="true">${c.glyph}</span>
          <span class="cmdk-item-body">
            <span class="cmdk-item-title">${c.title}</span>
            ${c.sub ? `<span class="cmdk-item-sub">${c.sub}</span>` : ""}
          </span>
          <span class="cmdk-item-tag">${c.tag}</span>
        </li>
      `,
    )
    .join("");

  cmdkList.querySelectorAll(".cmdk-item").forEach((node) => {
    node.addEventListener("click", () => {
      const cmd = commands.find((c) => c.id === node.getAttribute("data-cmdk-id"));
      if (cmd) {
        closeCmdk();
        cmd.run();
      }
    });
  });
}

function getFilteredCommands() {
  const q = (cmdkInput.value || "").toLowerCase().trim();
  return q
    ? commands.filter((c) => (c.title + " " + c.sub + " " + c.tag).toLowerCase().includes(q))
    : commands;
}

function openCmdk() {
  cmdkOverlay.hidden = false;
  cmdkInput.value = "";
  cmdkActive = 0;
  renderCmdkList("");
  setTimeout(() => cmdkInput.focus(), 30);
}

function closeCmdk() {
  cmdkOverlay.hidden = true;
}

if (cmdkTrigger) cmdkTrigger.addEventListener("click", openCmdk);

if (cmdkOverlay) {
  cmdkOverlay.addEventListener("click", (e) => {
    if (e.target === cmdkOverlay) closeCmdk();
  });
}

if (cmdkInput) {
  cmdkInput.addEventListener("input", () => {
    cmdkActive = 0;
    renderCmdkList(cmdkInput.value);
  });

  cmdkInput.addEventListener("keydown", (e) => {
    const list = getFilteredCommands();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      cmdkActive = (cmdkActive + 1) % Math.max(list.length, 1);
      renderCmdkList(cmdkInput.value);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      cmdkActive = (cmdkActive - 1 + list.length) % Math.max(list.length, 1);
      renderCmdkList(cmdkInput.value);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = list[cmdkActive];
      if (cmd) {
        closeCmdk();
        cmd.run();
      }
    } else if (e.key === "Escape") {
      closeCmdk();
    }
  });
}

// Global keybindings
document.addEventListener("keydown", (e) => {
  const isTyping = /^(INPUT|TEXTAREA)$/.test((e.target && e.target.tagName) || "");
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    openCmdk();
    return;
  }
  if (e.key === "Escape" && !cmdkOverlay.hidden) {
    closeCmdk();
    return;
  }
  if (!isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const map = { 1: "pitch", 2: "metrics", 3: "checklist", 4: "operations", 5: "support", 6: "playbook", 7: "notes" };
    if (map[e.key]) {
      e.preventDefault();
      scrollToId(map[e.key]);
    }
  }
});

// Greet on first load
setTimeout(() => {
  toast("Press Ctrl+K to open the command palette", "info");
}, 800);
