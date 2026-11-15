const catalogUrl = "https://selenite.cc/resources/games.json";
const safePathSegment = /^[a-zA-Z0-9._-]+$/;
let catalog;
let catalogRequest;
let previousActiveButton;

const panel = document.createElement("section");
panel.className = "greed-games-panel";
panel.id = "greed-games-panel";
panel.hidden = true;
panel.setAttribute("aria-label", "Games");
panel.tabIndex = -1;

const content = document.createElement("div");
content.className = "greed-games-panel__content";

const header = document.createElement("header");
header.className = "greed-games-panel__header";
const heading = document.createElement("h1");
heading.className = "greed-games-panel__heading";
heading.textContent = "Games";
const backButton = document.createElement("button");
backButton.className = "greed-games-panel__back";
backButton.type = "button";
backButton.textContent = "Back to Greed";
header.append(heading, backButton);

const search = document.createElement("input");
search.className = "greed-games-panel__search";
search.type = "search";
search.placeholder = "Search games";
search.setAttribute("aria-label", "Search games");
search.autocomplete = "off";
search.disabled = true;

const status = document.createElement("p");
status.className = "greed-games-panel__status";
status.setAttribute("role", "status");
status.setAttribute("aria-live", "polite");

const retryButton = document.createElement("button");
retryButton.className = "greed-games-panel__retry";
retryButton.type = "button";
retryButton.textContent = "Retry";
retryButton.hidden = true;

const catalogView = document.createElement("section");
catalogView.className = "greed-games-catalog";

const grid = document.createElement("div");
grid.className = "greed-games-panel__grid";

const credit = document.createElement("p");
credit.className = "greed-games-panel__credit";
credit.textContent =
  "Choose a game to load it in Greed's browser through the relay.";

catalogView.append(search, status, retryButton, grid);
content.append(header, catalogView, credit);
panel.append(content);
document.body.append(panel);

function parseCatalog(payload) {
  if (!Array.isArray(payload)) {
    throw new Error("The games source returned an invalid catalog.");
  }

  const gamesByDirectory = new Map();
  for (const entry of payload) {
    if (!entry || typeof entry !== "object") continue;
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    const directory =
      typeof entry.directory === "string" ? entry.directory.trim() : "";
    if (
      !name ||
      !safePathSegment.test(directory) ||
      directory === "." ||
      directory === ".." ||
      gamesByDirectory.has(directory)
    ) {
      continue;
    }

    const gameUrl = new URL(
      `/resources/semag/${encodeURIComponent(directory)}/`,
      catalogUrl,
    ).href;
    const image =
      typeof entry.image === "string" &&
      safePathSegment.test(entry.image) &&
      entry.image !== "." &&
      entry.image !== ".."
        ? new URL(
            `/resources/semag/${encodeURIComponent(directory)}/${encodeURIComponent(entry.image)}`,
            catalogUrl,
          ).href
        : "";
    gamesByDirectory.set(directory, { name, gameUrl, image });
  }

  const games = [...gamesByDirectory.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  if (games.length === 0) {
    throw new Error("The games source returned no playable games.");
  }
  return games;
}

function renderGames() {
  const query = search.value.trim().toLocaleLowerCase();
  const matches = catalog.filter((game) =>
    game.name.toLocaleLowerCase().includes(query),
  );
  grid.replaceChildren();

  for (const game of matches) {
    const card = document.createElement("button");
    card.className = "greed-games-card";
    card.type = "button";
    card.setAttribute("aria-label", `Play ${game.name}`);
    card.addEventListener("click", () => openGame(game));

    if (game.image) {
      const cover = document.createElement("img");
      cover.className = "greed-games-card__cover";
      cover.src = game.image;
      cover.alt = "";
      cover.loading = "lazy";
      cover.referrerPolicy = "no-referrer";
      cover.addEventListener("error", () => cover.remove(), { once: true });
      card.append(cover);
    }

    const title = document.createElement("span");
    title.className = "greed-games-card__name";
    title.textContent = game.name;
    card.append(title);
    grid.append(card);
  }

  status.textContent = matches.length
    ? `${matches.length} of ${catalog.length} games`
    : "No games match your search.";
}

function openGame(game, attempt = 0) {
  const address = document.querySelector(
    ".ax-address__input[aria-label='Address and search']",
  );
  const form = address?.closest("form");
  if (
    !(address instanceof HTMLInputElement) ||
    !(form instanceof HTMLFormElement)
  ) {
    if (attempt < 20) {
      status.textContent = `Opening ${game.name} in Greed's browser...`;
      if (location.hash !== "#/browser") location.hash = "#/browser";
      window.requestAnimationFrame(() => openGame(game, attempt + 1));
      return;
    }

    console.error(
      "Could not open a game because the Greed browser is unavailable.",
    );
    status.textContent = "The Greed browser is not ready. Try again shortly.";
    return;
  }

  address.value = game.gameUrl;
  address.dispatchEvent(new Event("input", { bubbles: true }));
  queueMicrotask(() => {
    try {
      form.requestSubmit();
      closePanel();
    } catch (error) {
      console.error(`Could not load ${game.name} in the Greed browser.`, error);
      status.textContent = `Could not load ${game.name}. Try again shortly.`;
    }
  });
}

async function loadCatalog() {
  retryButton.hidden = true;
  search.disabled = true;
  status.textContent = "Loading games...";

  try {
    catalogRequest ??= fetch(catalogUrl, {
      headers: { Accept: "application/json" },
      credentials: "omit",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`The games source returned HTTP ${response.status}.`);
        }
        return response.json();
      })
      .then(parseCatalog)
      .catch((error) => {
        catalogRequest = undefined;
        throw error;
      });

    catalog = await catalogRequest;
    search.disabled = false;
    renderGames();
  } catch (error) {
    console.error("Could not load the Greed games catalog.", error);
    status.textContent = "Could not load games. Check your connection and retry.";
    retryButton.hidden = false;
  }
}

function closePanel() {
  panel.hidden = true;
  document.body.classList.remove("greed-games-open");
  document.querySelector("#greed-root")?.removeAttribute("aria-hidden");

  const activeButton = document.querySelector(
    ".greed-greed-item[aria-controls='greed-games-panel']",
  );
  activeButton?.classList.remove("is-active");
  activeButton?.removeAttribute("aria-current");
  activeButton?.setAttribute("aria-expanded", "false");
  previousActiveButton?.classList.add("is-active");
  previousActiveButton?.setAttribute("aria-current", "page");
  previousActiveButton = undefined;
  activeButton?.focus();
}

function openPanel(button) {
  if (!panel.hidden) return;
  previousActiveButton = document.querySelector(
    ".greed-greed-item.is-active",
  );
  panel.hidden = false;
  document.body.classList.add("greed-games-open");
  document.querySelector("#greed-root")?.setAttribute("aria-hidden", "true");
  button.classList.add("is-active");
  button.setAttribute("aria-current", "page");
  button.setAttribute("aria-controls", panel.id);
  button.setAttribute("aria-expanded", "true");
  if (!catalog) {
    panel.focus();
    void loadCatalog();
  } else {
    search.focus();
    renderGames();
  }
}

document.addEventListener(
  "click",
  (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest(".greed-greed-item");
    if (
      !button ||
      button.querySelector(".greed-greed-label")?.textContent.trim() !== "Games"
    ) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    openPanel(button);
  },
  true,
);

backButton.addEventListener("click", closePanel);
retryButton.addEventListener("click", () => void loadCatalog());
search.addEventListener("input", renderGames);
panel.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  closePanel();
});
