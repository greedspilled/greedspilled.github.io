if (location.hash.replace(/^#\/?/, "").split("/")[0] === "chat") {
  location.hash = "#/home";
}

const migrationKey = "greed_adult_filter_default_disabled_v1";
const settingsKey = "greed_settings_v1";

try {
  if (localStorage.getItem(migrationKey) !== "1") {
    const savedSettings = localStorage.getItem(settingsKey);
    const settings = savedSettings
      ? JSON.parse(savedSettings)
      : { version: 1 };

    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      throw new Error("Saved Greed settings have an invalid format.");
    }

    settings.relay =
      settings.relay && typeof settings.relay === "object" && !Array.isArray(settings.relay)
        ? settings.relay
        : {};
    settings.relay.blockAdult = false;
    localStorage.setItem(settingsKey, JSON.stringify(settings));
    localStorage.setItem(migrationKey, "1");
  }
} catch (error) {
  console.error("Could not disable the default adult-content filter.", error);
}
