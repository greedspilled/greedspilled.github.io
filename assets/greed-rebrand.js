const footerMessages = [
  "Stay sharp..",
  "Take care of yourself.",
  "Be kind to yourself.",
  "Keep exploring.",
];

const labelReplacements = new Map([
  ["Browser", "Greed"],
  ["G@mes", "Games"],
]);
const allowedRoutes = new Set(["browser", "settings"]);
const contextMenuFrames = new WeakSet();
const contextMenuDocuments = new WeakSet();

let footerIndex = 0;
let greedColor = "#ffffff";
let colorStorageError = "";
let contextMenu;
const addressInputs = new WeakSet();

try {
  const savedColor = window.localStorage.getItem("greed-accent-color");
  if (/^#[0-9a-f]{6}$/i.test(savedColor ?? "")) greedColor = savedColor;
} catch (error) {
  console.error("Could not read the saved Greed accent color.", error);
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
    console.error("Could not save the Greed accent color.", error);
    colorStorageError = "Color changes apply now but could not be saved.";
  }
}

function createColorPanel() {
  const panel = document.createElement("section");
  panel.className = "greed-color-panel";
  panel.setAttribute("aria-label", "Greed Unblocker accent color");

  const heading = document.createElement("div");
  const title = document.createElement("h3");
  title.className = "greed-color-panel__heading";
  title.textContent = "RGB color";
  const description = document.createElement("p");
  description.className = "greed-color-panel__description";
  description.textContent =
    "Set the color used for Greed Unblocker's highlights.";
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
  if (summary && summary.textContent !== "Choose an RGB color for Greed Unblocker's highlights.") {
    summary.textContent = "Choose an RGB color for Greed Unblocker's highlights.";
  }
  for (const name of document.querySelectorAll(".settings-nav__item-name")) {
    if (name.textContent.trim() === "Appearance") {
      const description = name.nextElementSibling;
      if (description && description.textContent !== "Greed Unblocker accent color") {
        description.textContent = "Greed Unblocker accent color";
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

function replaceLegacyBranding(node) {
  const replace = (value) => value.replaceAll("Wrath Unblocker", "Greed Unblocker");
  const replaceElementAttributes = (element) => {
    for (const name of ["aria-label", "content", "placeholder", "title"]) {
      const value = element.getAttribute(name);
      if (value?.includes("Wrath Unblocker")) {
        element.setAttribute(name, replace(value));
      }
    }
  };

  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.nodeValue ?? "";
    if (value.includes("Wrath Unblocker")) node.nodeValue = replace(value);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  replaceElementAttributes(node);
  const walker = document.createTreeWalker(
    node,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
  );
  while (walker.nextNode()) {
    const current = walker.currentNode;
    if (current.nodeType === Node.TEXT_NODE) {
      const value = current.nodeValue ?? "";
      if (value.includes("Wrath Unblocker")) current.nodeValue = replace(value);
    } else {
      replaceElementAttributes(current);
    }
  }
}

function enforceBrowserOnly() {
  const route = location.hash.replace(/^#\/?/, "").split("/")[0];
  if (!allowedRoutes.has(route)) location.hash = "#/browser";
}

function syncPrimaryNavigation() {
  for (const item of document.querySelectorAll(".greed-greed-list > li")) {
    const label = item.querySelector(".greed-greed-label")?.textContent.trim();
    item.hidden = label !== "Greed" && label !== "Games" && label !== "Settings";
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

function getWebUrl(value, baseUrl) {
  const url = new URL(value, baseUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("This action is only available for web links.");
  }
  return url.href;
}

function getDownloadFilename(url, suggestedName, disposition) {
  let filename = "";
  const encodedName = disposition?.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  const regularName = disposition?.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i);
  const headerName = encodedName?.[1] || regularName?.[1] || regularName?.[2];

  if (headerName) {
    try {
      filename = encodedName ? decodeURIComponent(headerName) : headerName.trim();
    } catch {
      filename = "";
    }
  }

  if (!filename) filename = suggestedName;
  const parsedUrl = new URL(url);
  if (!filename && (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:")) {
    const lastSegment = parsedUrl.pathname.split("/").filter(Boolean).at(-1);
    if (lastSegment) {
      try {
        filename = decodeURIComponent(lastSegment);
      } catch {
        filename = lastSegment;
      }
    }
  }

  filename = (filename || "download")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .trim();
  return filename && filename !== "." && filename !== ".." ? filename : "download";
}

async function downloadResource(url, suggestedName, pageWindow) {
  const resolvedUrl = new URL(url, pageWindow.location.href);
  let blob;
  let filename;

  if (resolvedUrl.protocol === "blob:" || resolvedUrl.protocol === "data:") {
    filename = getDownloadFilename(resolvedUrl.href, suggestedName);
    const link = document.createElement("a");
    link.href = resolvedUrl.href;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    return;
  } else {
    getWebUrl(resolvedUrl.href, pageWindow.location.href);
    const response = await pageWindow.fetch(resolvedUrl.href, {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Download failed: server returned HTTP ${response.status}.`);
    }
    blob = await response.blob();
    filename = getDownloadFilename(
      resolvedUrl.href,
      suggestedName,
      response.headers.get("content-disposition"),
    );
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

function closeContextMenu() {
  if (!contextMenu) return;
  contextMenu.hidden = true;
  contextMenu.replaceChildren();
}

function handleContextMenuKeydown(event) {
  if (!contextMenu || contextMenu.hidden) return;
  const items = [...contextMenu.querySelectorAll("button:not(:disabled)")];
  const currentIndex = items.indexOf(document.activeElement);

  if (event.key === "Escape") {
    event.preventDefault();
    closeContextMenu();
    return;
  }

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    items[(currentIndex + direction + items.length) % items.length]?.focus();
  }
}

function openContextMenu(event, frame, pageDocument) {
  const target = event.target?.nodeType === 1 ? event.target : null;
  const editable = target?.closest(
    'input, textarea, select, [contenteditable=""], [contenteditable="true"]',
  );
  if (editable) return;

  const link = target?.closest("a[href]");
  const image = target?.closest("img");
  const pageWindow = pageDocument.defaultView;
  if (!pageWindow) return;
  const activeFrame = frame || document.querySelector(".ax-frame--active .ax-frame__view");
  const navigationWindow = frame ? pageWindow : activeFrame?.contentWindow;

  const actions = [];
  const addAction = (label, action, keepOpen = false) => {
    actions.push({ label, action, keepOpen });
  };
  const addOpenAction = (label, url) => {
    try {
      const href = getWebUrl(url, pageDocument.baseURI);
      addAction(label, () => window.open(href, "_blank", "noopener,noreferrer"));
    } catch {
      return;
    }
  };

  if (link) {
    addOpenAction("Open link in new tab", link.href);
    addAction("Download linked file", () =>
      downloadResource(link.href, link.download, pageWindow), true);
    addAction("Copy link address", () =>
      navigator.clipboard.writeText(link.href));
  }

  if (image) {
    addOpenAction("Open image in new tab", image.currentSrc || image.src);
    addAction("Download image", () =>
      downloadResource(image.currentSrc || image.src, image.alt, pageWindow), true);
    addAction("Copy image address", () =>
      navigator.clipboard.writeText(image.currentSrc || image.src));
  }

  const selection = pageWindow.getSelection()?.toString().trim();
  if (selection) {
    addAction("Copy selected text", () =>
      navigator.clipboard.writeText(selection));
  }

  if (navigationWindow) {
    addAction("Back", () => navigationWindow.history.back());
    addAction("Forward", () => navigationWindow.history.forward());
    addAction("Reload page", () => navigationWindow.location.reload());
    const address = document.querySelector(
      ".ax-address__input[aria-label='Address and search']",
    );
    const currentAddress = address?.dataset.grdlAddress || address?.value.trim();
    if (currentAddress) {
      addAction("Copy current address", () =>
        navigator.clipboard.writeText(currentAddress));
    }
  } else if (!frame) {
    addAction("Reload Greed", () => window.location.reload());
    addAction("Copy page address", () =>
      navigator.clipboard.writeText(window.location.href));
  }

  if (actions.length === 0) return;

  event.preventDefault();
  if (!contextMenu) {
    contextMenu = document.createElement("div");
    contextMenu.className = "wrath-context-menu";
    contextMenu.setAttribute("role", "menu");
    contextMenu.setAttribute("aria-label", "Page actions");
    document.body.append(contextMenu);
  }

  const status = document.createElement("p");
  status.className = "wrath-context-menu__status";
  status.setAttribute("role", "status");
  status.hidden = true;
  contextMenu.replaceChildren();

  for (const { label, action, keepOpen } of actions) {
    const button = document.createElement("button");
    button.className = "wrath-context-menu__item";
    button.type = "button";
    button.setAttribute("role", "menuitem");
    button.textContent = label;
    button.addEventListener("click", async () => {
      try {
        await action();
        if (keepOpen) {
          status.textContent = "Download started.";
          status.hidden = false;
        } else {
          closeContextMenu();
        }
      } catch (error) {
        console.error(`Could not ${label.toLowerCase()}.`, error);
        status.textContent =
          error instanceof Error ? error.message : `Could not ${label.toLowerCase()}.`;
        status.hidden = false;
      }
    });
    contextMenu.append(button);
  }
  contextMenu.append(status);
  contextMenu.hidden = false;

  const frameBounds = frame?.getBoundingClientRect();
  const scaleX =
    frameBounds && frame.clientWidth ? frameBounds.width / frame.clientWidth : 1;
  const scaleY =
    frameBounds && frame.clientHeight ? frameBounds.height / frame.clientHeight : 1;
  const left = frameBounds ? frameBounds.left + event.clientX * scaleX : event.clientX;
  const top = frameBounds ? frameBounds.top + event.clientY * scaleY : event.clientY;
  contextMenu.style.left = `${Math.max(8, Math.min(left, window.innerWidth - contextMenu.offsetWidth - 8))}px`;
  contextMenu.style.top = `${Math.max(8, Math.min(top, window.innerHeight - contextMenu.offsetHeight - 8))}px`;
  contextMenu.querySelector("button")?.focus();
}

function syncContextMenu() {
  if (!contextMenuDocuments.has(document)) {
    contextMenuDocuments.add(document);
    document.addEventListener(
      "contextmenu",
      (event) => openContextMenu(event, null, document),
      true,
    );
    document.addEventListener("pointerdown", (event) => {
      if (!contextMenu?.contains(event.target)) closeContextMenu();
    });
    document.addEventListener("keydown", handleContextMenuKeydown);
  }

  for (const frame of document.querySelectorAll("iframe.ax-frame__view")) {
    if (contextMenuFrames.has(frame)) continue;
    contextMenuFrames.add(frame);
    const bindDocument = () => {
      const pageDocument = frame.contentDocument;
      if (!pageDocument || contextMenuDocuments.has(pageDocument)) return;
      contextMenuDocuments.add(pageDocument);
      pageDocument.addEventListener(
        "contextmenu",
        (event) => openContextMenu(event, frame, pageDocument),
        true,
      );
      pageDocument.addEventListener("pointerdown", (event) => {
        if (!contextMenu?.contains(event.target)) closeContextMenu();
      });
      pageDocument.addEventListener("keydown", handleContextMenuKeydown);
    };
    frame.addEventListener("load", bindDocument);
    bindDocument();
  }
}

function applyRebrand() {
  enforceBrowserOnly();
  if (document.title !== "Greed Unblocker") {
    document.title = "Greed Unblocker";
  }

  for (const wordmark of document.querySelectorAll(".wordmark-text")) {
    if (wordmark.textContent !== "Greed Unblocker") {
      wordmark.textContent = "Greed Unblocker";
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
  syncContextMenu();
  syncPrimaryNavigation();
  syncDeveloperTools();
}

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === "characterData" || mutation.type === "attributes") {
      replaceLegacyBranding(mutation.target);
    } else {
      for (const node of mutation.addedNodes) replaceLegacyBranding(node);
    }
  }
  window.requestAnimationFrame(applyRebrand);
});

observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["aria-label", "content", "placeholder", "title"],
  childList: true,
  characterData: true,
  subtree: true,
});

replaceLegacyBranding(document.documentElement);
applyRebrand();
window.addEventListener("hashchange", enforceBrowserOnly);

window.setInterval(() => {
  footerIndex = (footerIndex + 1) % footerMessages.length;
  updateFooter();
  applyRebrand();
}, 5000);

window.setInterval(syncBrowserAddressBar, 300);
