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
    customerPromise: "Verified hours, clearer access details, and less guesswork for every guest.",
    replyTemplate:
      "Thanks for the report. We reviewed the location details, updated the listing where needed, and logged the issue for the location team.",
  },
  notes:
    "Use this space for operations notes, featured-placement timing, or staff handoff instructions.",
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
      title: "Amenities",
      pill: state.operations.changingTable ? "Published" : "Missing",
      copy: state.operations.changingTable
        ? "Changing table availability has been marked for the location."
        : "Family-friendly amenity details have not been confirmed for this location.",
    },
    {
      title: "Accessibility",
      pill: state.operations.accessibleRouting ? "Ready" : "Review",
      copy: state.operations.accessibleRouting
        ? "Accessibility route notes are published on this listing."
        : "Door width, route notes, or accessibility details still need a pass.",
    },
    {
      title: "Access policy",
      pill: state.operations.customerOnly ? "Controlled" : "Open",
      copy: state.operations.customerOnly
        ? "Customer-only access is documented so guest expectations stay clear."
        : "No customer-only access policy has been flagged in this browser state.",
    },
    {
      title: "Featured intent",
      pill: state.operations.featuredPlacement ? "Planned" : "Off",
      copy: state.operations.featuredPlacement
        ? "The team intends to run a featured placement campaign for this location."
        : "No featured placement has been marked in this dashboard yet.",
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
