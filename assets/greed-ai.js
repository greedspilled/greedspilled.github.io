const personaStorageKey = "greed-ai-persona-v1";
const customPersonaStorageKey = "greed-ai-custom-persona-v1";
const personas = {
  balanced: {
    label: "Balanced",
    instruction:
      "You are GREEDGPT, a helpful and thoughtful assistant. Be clear, accurate, and adapt your detail to the user's needs.",
  },
  tutor: {
    label: "Tutor",
    instruction:
      "You are GREEDGPT in tutor mode. Explain ideas in approachable steps, ask brief questions when useful, and help the user learn instead of simply doing their work for them.",
  },
  concise: {
    label: "Concise",
    instruction:
      "You are GREEDGPT in concise mode. Lead with the answer, use plain language, and avoid unnecessary detail.",
  },
  creative: {
    label: "Creative",
    instruction:
      "You are GREEDGPT in creative mode. Offer imaginative options, make your assumptions clear, and help the user develop their ideas.",
  },
  coding: {
    label: "Coding coach",
    instruction:
      "You are GREEDGPT in coding-coach mode. Explain the reasoning behind suggestions, prefer small reliable changes, and include code only when it helps.",
  },
  socratic: {
    label: "Socratic",
    instruction:
      "You are GREEDGPT in Socratic mode. Guide the user with focused questions and hints, revealing a direct answer when they ask for one.",
  },
  custom: {
    label: "Custom",
    instruction: "",
  },
};
const promptStarters = [
  "Explain [topic] in simple steps.",
  "Quiz me on [topic], one question at a time.",
  "Help me brainstorm ideas for [project].",
  "Walk me through this problem without giving away the answer: [problem].",
  "Turn this goal into a realistic step-by-step plan: [goal].",
  "Review this and suggest improvements: [paste text or code].",
];

let selectedPersona = loadPreference(personaStorageKey, "balanced");
let customPersona = loadPreference(customPersonaStorageKey, "").slice(0, 500);

if (!Object.prototype.hasOwnProperty.call(personas, selectedPersona)) {
  selectedPersona = "balanced";
}

function loadPreference(key, fallback) {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch (error) {
    console.error(`Could not read the GREEDGPT preference "${key}".`, error);
    return fallback;
  }
}

function savePreference(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Could not save the GREEDGPT preference "${key}".`, error);
  }
}

function personaInstruction() {
  const persona = personas[selectedPersona];
  if (!persona) return personas.balanced.instruction;
  if (selectedPersona !== "custom") return persona.instruction;

  const custom = customPersona.trim().slice(0, 500);
  return custom
    ? `${personas.balanced.instruction} Follow these additional style preferences when appropriate: ${custom}`
    : personas.balanced.instruction;
}

function installPersonaContext() {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    let requestUrl = null;
    if (typeof input === "string" || input instanceof URL) {
      requestUrl = new URL(input, window.location.href);
    } else if (input instanceof Request) {
      requestUrl = new URL(input.url);
    }

    if (
      requestUrl?.pathname.endsWith("/api/ai") &&
      init?.method === "POST"
    ) {
      if (typeof init.body !== "string") {
        throw new Error("GREEDGPT could not apply the selected persona.");
      }

      const payload = JSON.parse(init.body);
      if (!Array.isArray(payload.messages)) {
        throw new Error("GREEDGPT received an invalid conversation.");
      }

      payload.messages = [
        { role: "system", content: personaInstruction() },
        ...payload.messages.filter((message) => message?.role !== "system"),
      ];
      init = { ...init, body: JSON.stringify(payload) };
    }

    return nativeFetch(input, init);
  };
}

function makePersonaTools(surface) {
  const controls = document.createElement("section");
  controls.className = "greed-ai-tools";
  controls.setAttribute("aria-label", "AI preferences and prompts");

  const personaLabel = document.createElement("label");
  personaLabel.className = "greed-ai-persona-label";
  personaLabel.textContent = "Personality";

  const personaSelect = document.createElement("select");
  personaSelect.className = "greed-ai-persona";
  personaSelect.setAttribute("aria-label", "AI personality");
  for (const [value, persona] of Object.entries(personas)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = persona.label;
    option.selected = selectedPersona === value;
    personaSelect.append(option);
  }
  personaSelect.value = selectedPersona;
  personaLabel.append(personaSelect);

  const customInput = document.createElement("input");
  customInput.className = "greed-ai-custom-persona";
  customInput.type = "text";
  customInput.maxLength = 500;
  customInput.placeholder = "Describe a style for GREEDGPT";
  customInput.setAttribute("aria-label", "Custom AI personality");
  customInput.value = customPersona;
  customInput.hidden = selectedPersona !== "custom";

  const promptsToggle = document.createElement("button");
  promptsToggle.className = "greed-ai-prompts-toggle";
  promptsToggle.type = "button";
  promptsToggle.textContent = "Prompt starters";
  promptsToggle.setAttribute("aria-expanded", "false");

  const promptsPanel = document.createElement("section");
  promptsPanel.className = "greed-ai-prompts";
  promptsPanel.id = "greed-ai-prompts";
  promptsToggle.setAttribute("aria-controls", promptsPanel.id);
  promptsPanel.hidden = true;
  const promptsTitle = document.createElement("h2");
  promptsTitle.textContent = "Try a prompt";
  const promptsList = document.createElement("div");
  promptsList.className = "greed-ai-prompt-list";

  for (const prompt of promptStarters) {
    const button = document.createElement("button");
    button.className = "greed-ai-prompt";
    button.type = "button";
    button.textContent = prompt;
    button.addEventListener("click", () => {
      const input = surface.querySelector(".ai-input");
      if (!input || input.disabled) return;

      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      if (!setter) {
        throw new Error("GREEDGPT could not fill the prompt field.");
      }
      setter.call(input, prompt);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
      promptsPanel.hidden = true;
      promptsToggle.setAttribute("aria-expanded", "false");
    });
    promptsList.append(button);
  }

  promptsPanel.append(promptsTitle, promptsList);
  personaSelect.addEventListener("change", () => {
    selectedPersona = personaSelect.value;
    customInput.hidden = selectedPersona !== "custom";
    savePreference(personaStorageKey, selectedPersona);
    if (!customInput.hidden) customInput.focus();
  });
  customInput.addEventListener("input", () => {
    customPersona = customInput.value.slice(0, 500);
    savePreference(customPersonaStorageKey, customPersona);
  });
  promptsToggle.addEventListener("click", () => {
    promptsPanel.hidden = !promptsPanel.hidden;
    promptsToggle.setAttribute("aria-expanded", String(!promptsPanel.hidden));
  });

  controls.append(personaLabel, customInput, promptsToggle, promptsPanel);
  return controls;
}

function enhanceAiTab() {
  const surface = document.querySelector(".ai-surface");
  const head = surface?.querySelector(".ai-head");
  if (!surface || !head || surface.querySelector(".greed-ai-tools")) return;

  head.insertAdjacentElement("afterend", makePersonaTools(surface));
}

installPersonaContext();

const observer = new MutationObserver(enhanceAiTab);
observer.observe(document.documentElement, { childList: true, subtree: true });
enhanceAiTab();
