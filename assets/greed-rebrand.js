const footerMessages = [
  "Stay sharp..",
  "Take care of yourself.",
  "Be kind to yourself.",
  "Keep exploring.",
];

const labelReplacements = new Map([
  ["Browser", "Wrath"],
]);
const allowedRoutes = new Set(["browser", "settings"]);

let footerIndex = 0;
let greedColor = "#ffffff";
let colorStorageError = "";
const addressInputs = new WeakSet();

try {
  const savedColor = window.localStorage.getItem("greed-accent-color");
  if (/^#[0-9a-f]{6}$/i.test(savedColor ?? "")) greedColor = savedColor;
} catch (error) {
  console.error("Could not read the saved Wrath accent color.", error);
  colorStorageError = "Color changes may not be saved in this browser.";
}

document.documentElement.style.setProperty("--greed-color", greedColor);

function applyColor(red, green, blue, preview, output) {
  const channels = [red, green, blue].map((input) =>
    Math.min(255, Math.max(0, Number(input.value))),
  );
  for (const [index, input] of [red, green, blue].entries()) {
    input.value = String(channels[index]);
    input.nextElementSibling.textContent = String(channels[index]);
  }

  greedColor = `#${channels.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
  document.documentElement.style.setProperty("--greed-color", greedColor);
  preview.style.backgroundColor = greedColor;
  output.textContent = `RGB(${channels.join(", ")})  ${greedColor.toUpperCase()}`;

  try {
    window.localStorage.setItem("greed-accent-color", greedColor);
    colorStorageError = "";
  } catch (error) {
    console.error("Could not save the Wrath accent color.", error);
    colorStorageError = "Color changes apply now but could not be saved.";
  }
}

function createColorPanel() {
  const panel = document.createElement("section");
  panel.className = "greed-color-panel";
  panel.setAttribute("aria-label", "Wrath Unblocker accent color");

  const heading = document.createElement("div");
  const title = document.createElement("h3");
  title.className = "greed-color-panel__heading";
  title.textContent = "RGB color";
  const description = document.createElement("p");
  description.className = "greed-color-panel__description";
  description.textContent =
    "Set the color used for Wrath Unblocker's highlights.";
  heading.append(title, description);
  panel.append(heading);

  const previewRow = document.createElement("div");
  previewRow.className = "greed-color-panel__preview";
  const preview = document.createElement("span");
  preview.className = "greed-color-panel__swatch";
  preview.setAttribute("aria-hidden", "true");
  const output = document.createElement("output");
  output.className = "greed-color-panel__value";
  output.setAttribute("aria-live", "polite");
  previewRow.append(preview, output);
  panel.append(previewRow);

  const sliders = ["Red", "Green", "Blue"].map((channel, index) => {
    const label = document.createElement("label");
    label.className = "greed-color-channel";
    label.append(document.createTextNode(channel));

    const input = document.createElement("input");
    input.className = "greed-color-channel__slider";
    input.type = "range";
    input.min = "0";
    input.max = "255";
    input.step = "1";
    input.value = String(
      Number.parseInt(greedColor.slice(1 + index * 2, 3 + index * 2), 16),
    );
    input.setAttribute("aria-label", channel);

    const value = document.createElement("output");
    value.className = "greed-color-channel__value";
    label.append(input, value);
    input.addEventListener("input", () => {
      applyColor(...sliders.map((slider) => slider.input), preview, output);
      error.textContent = colorStorageError;
    });

    return { input, value };
  });

  const error = document.createElement("p");
  error.className = "greed-color-panel__error";
  error.setAttribute("role", "status");

  const reset = document.createElement("button");
  reset.className = "greed-color-panel__reset";
  reset.type = "button";
  reset.textContent = "Reset to white";
  reset.addEventListener("click", () => {
    for (const slider of sliders) slider.input.value = "255";
    applyColor(...sliders.map((slider) => slider.input), preview, output);
    error.textContent = colorStorageError;
  });

  panel.append(...sliders.map((slider) => slider.input.parentElement));
  panel.append(reset, error);
  applyColor(...sliders.map((slider) => slider.input), preview, output);
  error.textContent = colorStorageError;
  return panel;
}

function syncAppearancePanel() {
  const heading = document.querySelector(".settings-panel-head__title");
  const content = heading?.closest(".settings-content__inner");
  const summary = document.querySelector(".settings-panel-head__summary");
  if (!content || heading.textContent.trim() !== "Appearance") {
    document
      .querySelector(".settings-content__inner[data-greed-appearance]")
      ?.removeAttribute("data-greed-appearance");
    document.querySelector(".greed-color-panel")?.remove();
    return;
  }

  content.setAttribute("data-greed-appearance", "");
  if (summary && summary.textContent !== "Choose an RGB color for Wrath Unblocker's highlights.") {
    summary.textContent = "Choose an RGB color for Wrath Unblocker's highlights.";
  }
  for (const name of document.querySelectorAll(".settings-nav__item-name")) {
    if (name.textContent.trim() === "Appearance") {
      const description = name.nextElementSibling;
      if (description && description.textContent !== "Wrath Unblocker accent color") {
        description.textContent = "Wrath Unblocker accent color";
      }
    }
  }

  let panel = content.querySelector(":scope > .greed-color-panel");
  if (!panel) {
    panel = createColorPanel();
  }
  if (heading.parentElement.parentElement.nextElementSibling !== panel) {
    heading.parentElement.parentElement.insertAdjacentElement("afterend", panel);
  }
}

function updateFooter() {
  const footer = document.querySelector(".omni-motd");
  if (!footer) return;

  const message = footerMessages[footerIndex];
  if (footer.textContent.trim() === message) return;

  footer.classList.add("is-changing");
  window.setTimeout(() => {
    footer.textContent = message;
    footer.classList.remove("is-changing");
  }, 180);
}

function enforceBrowserOnly() {
  const route = location.hash.replace(/^#\/?/, "").split("/")[0];
  if (!allowedRoutes.has(route)) location.hash = "#/browser";
}

function syncPrimaryNavigation() {
  for (const item of document.querySelectorAll(".greed-greed-list > li")) {
    const label = item.querySelector(".greed-greed-label")?.textContent.trim();
    item.hidden = label !== "Wrath" && label !== "Settings";
  }
}

function updateDeveloperTools(panel) {
  const activeTab = document.querySelector('.ax-tab[aria-selected="true"]');
  const addressInput = document.querySelector(
    ".ax-address__input[aria-label='Address and search']",
  );
  const activeFrame = document.querySelector(
    ".ax-frame--active .ax-frame__view",
  );
  const frameStatus = document.querySelector(
    ".ax-frame--active .ax-frame__phase",
  );
  const values = {
    title:
      activeTab?.querySelector(".ax-tab__label")?.textContent.trim() ||
      activeTab?.getAttribute("title") ||
      "New tab",
    address:
      addressInput?.dataset.grdlAddress ||
      addressInput?.value.trim() ||
      "about:blank",
    status:
      frameStatus?.textContent.trim() ||
      (activeFrame?.getAttribute("src") ? "Frame active" : "Idle"),
  };

  for (const [key, value] of Object.entries(values)) {
    const output = panel.querySelector(`[data-wrath-value="${key}"]`);
    if (output && output.textContent !== value) output.textContent = value;
  }
}

function setDeveloperToolsOpen(open) {
  const panel = document.querySelector("#wrath-devtools-panel");
  if (!panel) return;

  panel.hidden = !open;
  document
    .querySelector("[data-wrath-devtools-toggle]")
    ?.setAttribute("aria-expanded", String(open));
  if (open) updateDeveloperTools(panel);
}

function createDeveloperToolsPanel() {
  const panel = document.createElement("section");
  panel.id = "wrath-devtools-panel";
  panel.className = "wrath-devtools";
  panel.hidden = true;
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-label", "Developer tools");

  const header = document.createElement("header");
  header.className = "wrath-devtools__header";
  const title = document.createElement("h2");
  title.textContent = "Developer tools";
  const close = document.createElement("button");
  close.className = "wrath-devtools__close";
  close.type = "button";
  close.setAttribute("aria-label", "Close developer tools");
  close.textContent = "×";
  close.addEventListener("click", () => setDeveloperToolsOpen(false));
  header.append(title, close);

  const details = document.createElement("dl");
  details.className = "wrath-devtools__details";
  for (const [key, label] of [
    ["title", "Active tab"],
    ["address", "Address"],
    ["status", "Frame status"],
  ]) {
    const row = document.createElement("div");
    row.className = "wrath-devtools__row";
    const term = document.createElement("dt");
    term.textContent = label;
    const value = document.createElement("dd");
    value.dataset.wrathValue = key;
    row.append(term, value);
    details.append(row);
  }

  const note = document.createElement("p");
  note.className = "wrath-devtools__note";
  note.textContent =
    "Web pages run in isolated frames. This panel shows browser-visible tab information only.";
  panel.append(header, details, note);
  return panel;
}

function syncDeveloperTools() {
  const menu = document.querySelector(".ax-address__menu-wrap");
  if (!menu) return;

  let panel = document.querySelector("#wrath-devtools-panel");
  if (!panel) {
    panel = createDeveloperToolsPanel();
    document.body.append(panel);
  }

  let toggle = menu.querySelector("[data-wrath-devtools-toggle]");
  if (!toggle) {
    toggle = document.createElement("button");
    toggle.className = "ax-address__icon-btn wrath-devtools__toggle";
    toggle.type = "button";
    toggle.dataset.wrathDevtoolsToggle = "true";
    toggle.setAttribute("aria-label", "Developer tools");
    toggle.setAttribute("aria-controls", panel.id);
    toggle.setAttribute("aria-expanded", String(!panel.hidden));
    toggle.title = "Developer tools";
    toggle.textContent = "";
    toggle.addEventListener("click", () =>
      setDeveloperToolsOpen(panel.hidden),
    );
    const moreActions = menu.querySelector('[aria-label="More actions"]');
    menu.insertBefore(toggle, moreActions ?? null);
  }

  if (!panel.hidden) updateDeveloperTools(panel);
}

function displayAddress(input) {
  if (document.activeElement === input) return;

  if (input.dataset.grdlDisplay === "true") {
    const displayedAddress = input.dataset.grdlAddress.replace(
      /^https:\/\//i,
      "grdl://",
    );
    if (input.value === displayedAddress) return;
    input.dataset.grdlDisplay = "";
  }

  const address = input.value.trim();
  if (!/^https:\/\//i.test(address)) return;

  input.dataset.grdlAddress = address;
  input.value = address.replace(/^https:\/\//i, "grdl://");
  input.dataset.grdlDisplay = "true";
}

function syncBrowserAddressBar() {
  for (const input of document.querySelectorAll(
    ".ax-address__input[aria-label='Address and search']",
  )) {
    if (!addressInputs.has(input)) {
      input.addEventListener("input", () => {
        input.dataset.grdlDisplay = "";
        input.dataset.grdlAddress = input.value;
      });
      input.addEventListener("focus", () => {
        if (input.dataset.grdlDisplay !== "true") return;
        input.value = input.dataset.grdlAddress;
        input.dataset.grdlDisplay = "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.setSelectionRange(0, input.value.length);
      });
      input.addEventListener("blur", () => displayAddress(input));
      addressInputs.add(input);
    }

    displayAddress(input);
  }
}

function openAddressDirectly() {
  const input = document.querySelector(
    ".ax-address__input[aria-label='Address and search']",
  );
  let address = input?.dataset.grdlAddress || input?.value.trim() || "";
  if (/^grdl:\/\//i.test(address)) {
    address = address.replace(/^grdl:/i, "https:");
  }

  try {
    const url = new URL(address);
    if (
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password
    ) {
      window.open(url.href, "_blank", "noopener,noreferrer");
    }
  } catch {
    return;
  }
}

function syncBrowserDirectOpen() {
  const errorActions = document.querySelector(".ax-error__actions");
  const addressMenu = document.querySelector(".ax-address__menu");

  if (errorActions && !errorActions.querySelector("[data-greed-direct-open]")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ax-error__btn";
    button.dataset.greedDirectOpen = "true";
    button.textContent = "Open site in a new tab";
    button.addEventListener("click", openAddressDirectly);
    errorActions.append(button);
  }

  if (addressMenu && !addressMenu.querySelector("[data-greed-direct-open]")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ax-address__menu-item";
    button.dataset.greedDirectOpen = "true";
    button.setAttribute("role", "menuitem");
    button.textContent = "Open current site directly";
    button.addEventListener("click", openAddressDirectly);
    addressMenu.append(button);
  }
}

function applyRebrand() {
  enforceBrowserOnly();
  if (document.title !== "Wrath Unblocker") {
    document.title = "Wrath Unblocker";
  }

  for (const wordmark of document.querySelectorAll(".wordmark-text")) {
    if (wordmark.textContent !== "Wrath Unblocker") {
      wordmark.textContent = "Wrath Unblocker";
    }
  }

  for (const label of document.querySelectorAll(".greed-greed-label")) {
    const replacement = labelReplacements.get(label.textContent.trim());
    if (replacement && label.textContent !== replacement) {
      label.textContent = replacement;
    }
  }

  const clock = document.querySelector(".omni-clock");
  if (clock) {
    const date = new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(new Date());
    if (clock.getAttribute("data-greed-date") !== date) {
      clock.setAttribute("data-greed-date", date);
    }
  }

  updateFooter();
  syncAppearancePanel();
  syncBrowserAddressBar();
  syncBrowserDirectOpen();
  syncPrimaryNavigation();
  syncDeveloperTools();
}

const observer = new MutationObserver(() => {
  window.requestAnimationFrame(applyRebrand);
});

observer.observe(document.documentElement, {
  childList: true,
  characterData: true,
  subtree: true,
});

applyRebrand();
window.addEventListener("hashchange", enforceBrowserOnly);

window.setInterval(() => {
  footerIndex = (footerIndex + 1) % footerMessages.length;
  updateFooter();
  applyRebrand();
}, 5000);

window.setInterval(syncBrowserAddressBar, 300);
