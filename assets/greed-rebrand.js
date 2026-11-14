const footerMessages = [
  "Stay sharp..",
  "Talk to people about your mental health",
  "Be kind to yourself.",
  "Anti Securly Squad (:",
  "Lowk I think the AI is a little too smart for its own good.",
];

const labelReplacements = new Map([
  ["AI", "A!"],
  ["Browser", "Br0ws3r"],
  ["Chat", "Ch@t"],
]);

let footerIndex = 0;
let greedColor = "#ffffff";
let colorStorageError = "";

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
  panel.setAttribute("aria-label", "Greed RGB color");

  const heading = document.createElement("div");
  const title = document.createElement("h3");
  title.className = "greed-color-panel__heading";
  title.textContent = "RGB color";
  const description = document.createElement("p");
  description.className = "greed-color-panel__description";
  description.textContent =
    "Set the color used for Greed's white text and highlights.";
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
  if (summary && summary.textContent !== "Choose an RGB color for Greed's white highlights.") {
    summary.textContent = "Choose an RGB color for Greed's white highlights.";
  }
  for (const name of document.querySelectorAll(".settings-nav__item-name")) {
    if (name.textContent.trim() === "Appearance") {
      const description = name.nextElementSibling;
      if (description && description.textContent !== "RGB accent color") {
        description.textContent = "RGB accent color";
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

function applyRebrand() {
  if (document.title !== "Greed") document.title = "Greed";

  for (const wordmark of document.querySelectorAll(".wordmark-text")) {
    if (wordmark.textContent !== "Greed") wordmark.textContent = "Greed";
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

window.setInterval(() => {
  footerIndex = (footerIndex + 1) % footerMessages.length;
  updateFooter();
  applyRebrand();
}, 5000);
