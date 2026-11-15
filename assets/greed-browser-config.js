if (location.hash.replace(/^#\/?/, "").split("/")[0] === "chat") {
  location.hash = "#/browser";
}

const migrationKey = "greed_browser_content_filters_disabled_v1";
const adultFilterRemovalKey = "greed_adult_content_filter_removed_v1";
const settingsKey = "greed_settings_v1";

try {
  const disableDefaultAds = localStorage.getItem(migrationKey) !== "1";
  const removeAdultFilter =
    localStorage.getItem(adultFilterRemovalKey) !== "1";

  if (disableDefaultAds || removeAdultFilter) {
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
    if (disableDefaultAds) {
      settings.relay.blockAds = false;
    }
    delete settings.relay.blockAdult;
    localStorage.setItem(settingsKey, JSON.stringify(settings));
    if (disableDefaultAds) {
      localStorage.setItem(migrationKey, "1");
    }
    localStorage.setItem(adultFilterRemovalKey, "1");
  }
} catch (error) {
  console.error("Could not migrate browser content-filter settings.", error);
}
