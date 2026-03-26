/* global document, window, HTMLInputElement */

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
    supportEmail: "support@stallpass.app",
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
    "Use this space for launch notes, reviewer talking points, featured-placement timing, or staff handoff instructions.",
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

function renderMetrics() {
  const checklistComplete = countCompletedChecklist();
  const checklistTotal = Object.keys(state.checklist).length;
  const setupScore = Math.round((checklistComplete / checklistTotal) * 100);
  const pendingTasks = checklistTotal - checklistComplete;

  document.querySelector("[data-metric-setup]").textContent = `${setupScore}%`;
  document.querySelector("[data-metric-locations]").textContent = state.checklist.claimLocation ? "1" : "0";
  document.querySelector("[data-metric-links]").textContent = String(countLiveSupportSurfaces());
  document.querySelector("[data-metric-tasks]").textContent = String(pendingTasks);
  document.querySelector("[data-progress-text]").textContent = `${checklistComplete} of ${checklistTotal} complete`;
  document.querySelector("[data-progress-bar]").style.width = `${setupScore}%`;
}

function renderWidgets() {
  document.querySelectorAll("[data-widget]").forEach((widget) => {
    const key = widget.getAttribute("data-widget");
    widget.classList.toggle("is-hidden", !state.widgets[key]);
  });

  document.querySelectorAll("[data-widget-toggle]").forEach((checkbox) => {
    const key = checkbox.getAttribute("data-widget-toggle");
    checkbox.checked = Boolean(state.widgets[key]);
  });
}

function renderChecklist() {
  document.querySelectorAll("[data-checklist-item]").forEach((checkbox) => {
    const key = checkbox.getAttribute("data-checklist-item");
    checkbox.checked = Boolean(state.checklist[key]);
  });
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
        : "Family-friendly amenity details are still missing from this dashboard state.",
    },
    {
      title: "Accessibility",
      pill: state.operations.accessibleRouting ? "Ready" : "Review",
      copy: state.operations.accessibleRouting
        ? "Accessibility route notes are accounted for before launch."
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
        ? "The team intends to request a featured placement after launch."
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
}

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

document.querySelectorAll("[data-widget-toggle]").forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    state.widgets[checkbox.getAttribute("data-widget-toggle")] = checkbox.checked;
    persistState();
    render();
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

document.querySelector("[data-reset-dashboard]").addEventListener("click", () => {
  state = clone(DEFAULT_DASHBOARD_STATE);
  persistState();
  render();
});

render();
