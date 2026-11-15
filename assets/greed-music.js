const audioExtensions = /\.(aac|flac|m4a|mp3|oga|ogg|wav|weba|webm)$/i;

let nextTrackId = 0;
let tracks = [];
let currentTrackId = null;
let shuffleEnabled = false;
let repeatMode = "off";
let activeFilter = "";
let priorSurfaceState = [];
let audio;
let musicSurface;
let musicButton;
let fileInput;
let urlInput;
let searchInput;
let playlist;
let status;
let playButton;
let seekInput;
let currentTime;
let duration;
let nowPlayingTitle;
let volumeInput;
let shuffleButton;
let repeatButton;
let downloadButton;

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function makeButton(className, label, text) {
  const button = makeElement("button", className, text);
  button.type = "button";
  button.setAttribute("aria-label", label);
  return button;
}

function currentTrack() {
  return tracks.find((track) => track.id === currentTrackId) ?? null;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function setStatus(message) {
  status.textContent = message;
}

function renderPlaylist() {
  const query = activeFilter.trim().toLocaleLowerCase();
  const visibleTracks = tracks.filter((track) =>
    track.title.toLocaleLowerCase().includes(query),
  );
  playlist.replaceChildren();

  if (visibleTracks.length === 0) {
    const empty = makeElement(
      "p",
      "greedified-empty",
      tracks.length
        ? "No tracks match your search."
        : "Drop audio files here or choose files to build your playlist.",
    );
    playlist.append(empty);
    return;
  }

  for (const [index, track] of visibleTracks.entries()) {
    const row = makeElement("article", "greedified-track");
    row.setAttribute("role", "listitem");
    if (track.id === currentTrackId) row.dataset.current = "";

    const play = makeButton(
      "greedified-track__play",
      `Play ${track.title}`,
      track.id === currentTrackId && !audio.paused ? "Ⅱ" : "▶",
    );
    play.addEventListener("click", () => selectTrack(track.id, true));

    const metadata = makeElement("div", "greedified-track__metadata");
    metadata.append(
      makeElement("span", "greedified-track__title", track.title),
      makeElement(
        "span",
        "greedified-track__subtitle",
        track.file ? "Local audio" : "Direct audio link",
      ),
    );

    const number = makeElement(
      "span",
      "greedified-track__number",
      String(index + 1).padStart(2, "0"),
    );
    const download = makeButton(
      "greedified-track__action",
      `Download ${track.title}`,
      "↓",
    );
    download.addEventListener("click", () => downloadTrack(track));

    const remove = makeButton(
      "greedified-track__action",
      `Remove ${track.title}`,
      "×",
    );
    remove.addEventListener("click", () => removeTrack(track.id));

    row.append(number, play, metadata, download, remove);
    playlist.append(row);
  }
}

function updatePlayer() {
  const track = currentTrack();
  const playing = Boolean(track && !audio.paused);
  playButton.textContent = playing ? "Ⅱ" : "▶";
  playButton.setAttribute("aria-label", playing ? "Pause" : "Play");
  downloadButton.disabled = !track;
  seekInput.disabled = !track || !Number.isFinite(audio.duration);
  currentTime.textContent = formatTime(audio.currentTime);
  duration.textContent = formatTime(audio.duration);
  nowPlayingTitle.textContent = track?.title ?? "Nothing playing";
  seekInput.value =
    Number.isFinite(audio.duration) && audio.duration > 0
      ? String(Math.round((audio.currentTime / audio.duration) * 1000))
      : "0";
}

function selectTrack(trackId, startPlayback) {
  const track = tracks.find((item) => item.id === trackId);
  if (!track) return;

  const changed = track.id !== currentTrackId;
  currentTrackId = track.id;
  if (changed) {
    audio.pause();
    audio.src = track.url;
    audio.load();
  }
  updatePlayer();
  renderPlaylist();
  setStatus(`Selected “${track.title}”.`);

  if (startPlayback) {
    audio.play().catch((error) => {
      console.error(`Could not play “${track.title}”.`, error);
      setStatus("This audio file could not be played in this browser.");
    });
  }
}

function addFiles(fileList) {
  const selectedFiles = Array.from(fileList);
  const validFiles = selectedFiles.filter(
    (file) =>
      file.type.startsWith("audio/") ||
      audioExtensions.test(file.name),
  );

  let addedCount = 0;
  for (const file of validFiles) {
    const duplicate = tracks.some(
      (track) =>
        track.file &&
        track.file.name === file.name &&
        track.file.size === file.size &&
        track.file.lastModified === file.lastModified,
    );
    if (duplicate) continue;

    tracks.push({
      id: String(++nextTrackId),
      title: file.name.replace(/\.[^.]+$/, "") || file.name,
      file,
      url: URL.createObjectURL(file),
    });
    addedCount += 1;
  }

  const rejectedCount = selectedFiles.length - validFiles.length;
  if (rejectedCount > 0) {
    setStatus(
      `${rejectedCount} unsupported file${rejectedCount === 1 ? " was" : "s were"} skipped.`,
    );
  } else if (addedCount > 0) {
    setStatus(
      `${addedCount} audio file${addedCount === 1 ? "" : "s"} added.`,
    );
  }

  if (!currentTrackId && tracks.length > 0) {
    selectTrack(tracks[0].id, false);
  } else {
    renderPlaylist();
  }
}

function addAudioUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    setStatus("Enter a valid direct audio URL.");
    return;
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    setStatus("Audio URLs must use HTTP or HTTPS.");
    return;
  }
  if (!audioExtensions.test(url.pathname)) {
    setStatus("Use a direct link to an MP3, M4A, OGG, WAV, or similar audio file.");
    return;
  }

  if (tracks.some((track) => track.url === url.href)) {
    setStatus("That audio link is already in your playlist.");
    return;
  }

  const fileName = url.pathname.split("/").pop() || "Audio track";
  const track = {
    id: String(++nextTrackId),
    title: fileName.replace(audioExtensions, "") || fileName,
    file: null,
    fileName,
    url: url.href,
  };
  tracks.push(track);
  urlInput.value = "";
  if (!currentTrackId) selectTrack(track.id, false);
  else renderPlaylist();
  setStatus(`Added “${track.title}” to your playlist.`);
}

function removeTrack(trackId) {
  const index = tracks.findIndex((track) => track.id === trackId);
  if (index < 0) return;

  const [removed] = tracks.splice(index, 1);
  if (removed.file) URL.revokeObjectURL(removed.url);
  if (removed.id === currentTrackId) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    currentTrackId = null;
    if (tracks.length > 0) selectTrack(tracks[Math.min(index, tracks.length - 1)].id, false);
  }
  renderPlaylist();
  updatePlayer();
  setStatus(`Removed “${removed.title}” from the playlist.`);
}

async function downloadTrack(track) {
  let temporaryUrl = "";
  try {
    let downloadUrl = track.url;
    if (!track.file) {
      setStatus(`Preparing “${track.title}” for download…`);
      const response = await fetch(track.url, { mode: "cors" });
      if (!response.ok) {
        throw new Error(`Audio server returned ${response.status}.`);
      }

      const blob = await response.blob();
      if (
        blob.type &&
        !blob.type.startsWith("audio/") &&
        blob.type !== "application/octet-stream"
      ) {
        throw new Error("The audio link did not return an audio file.");
      }
      temporaryUrl = URL.createObjectURL(blob);
      downloadUrl = temporaryUrl;
    }

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = track.file?.name ?? track.fileName;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    setStatus(`Downloading “${track.title}”.`);
  } catch (error) {
    console.error(`Could not download “${track.title}”.`, error);
    setStatus(
      "Download failed. This host may block downloads; try a local file or a CORS-enabled direct link.",
    );
  } finally {
    if (temporaryUrl) URL.revokeObjectURL(temporaryUrl);
  }
}

function selectAdjacentTrack(direction) {
  if (tracks.length === 0) return;
  const currentIndex = tracks.findIndex((track) => track.id === currentTrackId);
  let nextIndex = currentIndex < 0 ? 0 : currentIndex + direction;

  if (shuffleEnabled && tracks.length > 1) {
    const choices = tracks
      .map((_, index) => index)
      .filter((index) => index !== currentIndex);
    nextIndex = choices[Math.floor(Math.random() * choices.length)];
  } else if (nextIndex < 0 || nextIndex >= tracks.length) {
    if (repeatMode !== "all") {
      audio.pause();
      return;
    }
    nextIndex = (nextIndex + tracks.length) % tracks.length;
  }

  selectTrack(tracks[nextIndex].id, true);
}

function closeMusic() {
  if (!musicSurface || musicSurface.hidden) return;
  musicSurface.hidden = true;
  musicButton.classList.remove("is-active");
  musicButton.removeAttribute("aria-current");
  for (const [surface, wasHidden] of priorSurfaceState) {
    surface.hidden = wasHidden;
  }
  priorSurfaceState = [];
}

function openMusic() {
  if (!musicSurface.hidden) return;
  priorSurfaceState = Array.from(
    document.querySelectorAll(".greed-main > .greed-surface:not(.greed-music-surface)"),
    (surface) => {
      const wasHidden = surface.hidden;
      surface.hidden = true;
      return [surface, wasHidden];
    },
  );
  musicSurface.hidden = false;
  for (const button of document.querySelectorAll(".greed-greed-item")) {
    button.classList.remove("is-active");
    button.removeAttribute("aria-current");
  }
  musicButton.classList.add("is-active");
  musicButton.setAttribute("aria-current", "page");
}

function createMusicPage() {
  const page = makeElement("section", "greed-surface greed-music-surface");
  page.hidden = true;
  page.setAttribute("aria-label", "Greedified music player");
  const layout = makeElement("div", "greedified");
  const header = makeElement("header", "greedified-header");
  const titleBlock = makeElement("div", "greedified-heading");
  const logo = makeElement("img", "greedified-logo");
  logo.src = new URL("./icons/greed%20assets/music.jpg", import.meta.url);
  logo.alt = "";
  const title = makeElement("h1", "", "Greedified");
  const subtitle = makeElement(
    "p",
    "",
    "Your music, your device. Add audio files to start listening.",
  );
  titleBlock.append(title, subtitle);
  const addButton = makeButton(
    "greedified-add",
    "Add audio files",
    "Add music",
  );
  header.append(logo, titleBlock, addButton);

  fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "audio/*,.aac,.flac,.m4a,.mp3,.ogg,.wav,.webm";
  fileInput.multiple = true;
  fileInput.hidden = true;

  const urlForm = makeElement("form", "greedified-url-form");
  urlInput = document.createElement("input");
  urlInput.className = "greedified-url-input";
  urlInput.type = "url";
  urlInput.placeholder = "Paste a direct audio file URL";
  urlInput.setAttribute("aria-label", "Direct audio file URL");
  const addUrlButton = makeButton(
    "greedified-add-url",
    "Add audio URL",
    "Add URL",
  );
  addUrlButton.type = "submit";
  urlForm.append(urlInput, addUrlButton);

  const content = makeElement("div", "greedified-content");
  const collection = makeElement("section", "greedified-library");
  const libraryHeader = makeElement("div", "greedified-library__header");
  const libraryTitle = makeElement("div", "greedified-library__title");
  libraryTitle.append(
    makeElement("h2", "", "Your library"),
    makeElement(
      "span",
      "",
      "Add local audio or direct links you have permission to use.",
    ),
  );
  searchInput = document.createElement("input");
  searchInput.className = "greedified-search";
  searchInput.type = "search";
  searchInput.placeholder = "Find a track";
  searchInput.setAttribute("aria-label", "Search your music library");
  libraryHeader.append(libraryTitle, searchInput);

  playlist = makeElement("div", "greedified-playlist");
  playlist.setAttribute("role", "list");
  collection.append(libraryHeader, playlist);

  const player = makeElement("section", "greedified-player");
  const playerArt = makeElement("img", "greedified-player__art");
  playerArt.src = logo.src;
  playerArt.alt = "";
  const trackDetails = makeElement("div", "greedified-player__details");
  const nowPlaying = makeElement("span", "", "Now playing");
  nowPlayingTitle = makeElement(
    "strong",
    "greedified-player__title",
    "Nothing playing",
  );
  trackDetails.append(nowPlaying, nowPlayingTitle);

  const controls = makeElement("div", "greedified-controls");
  shuffleButton = makeButton("greedified-toggle", "Shuffle", "⤨");
  shuffleButton.setAttribute("aria-pressed", "false");
  const previousButton = makeButton("greedified-control", "Previous track", "|◀");
  playButton = makeButton("greedified-play", "Play", "▶");
  const nextButton = makeButton("greedified-control", "Next track", "▶|");
  repeatButton = makeButton("greedified-toggle", "Repeat off", "↻");
  repeatButton.setAttribute("aria-pressed", "false");
  controls.append(
    shuffleButton,
    previousButton,
    playButton,
    nextButton,
    repeatButton,
  );

  const downloadGroup = makeElement("div", "greedified-player__download");
  downloadButton = makeButton(
    "greedified-download",
    "Download current track",
    "Download",
  );
  downloadGroup.append(downloadButton);

  const timeline = makeElement("div", "greedified-timeline");
  currentTime = makeElement("time", "", "0:00");
  seekInput = document.createElement("input");
  seekInput.type = "range";
  seekInput.min = "0";
  seekInput.max = "1000";
  seekInput.value = "0";
  seekInput.setAttribute("aria-label", "Seek in track");
  duration = makeElement("time", "", "0:00");
  timeline.append(currentTime, seekInput, duration);

  const volumeControl = makeElement("label", "greedified-volume");
  volumeControl.append(makeElement("span", "", "Volume"));
  volumeInput = document.createElement("input");
  volumeInput.type = "range";
  volumeInput.min = "0";
  volumeInput.max = "1";
  volumeInput.step = "0.01";
  volumeInput.value = "0.8";
  volumeInput.setAttribute("aria-label", "Volume");
  volumeControl.append(volumeInput);

  const playerMain = makeElement("div", "greedified-player__main");
  playerMain.append(controls, timeline);
  player.append(playerArt, trackDetails, playerMain, volumeControl, downloadGroup);

  status = makeElement("p", "greedified-status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  content.append(collection);
  layout.append(header, urlForm, content, player, status, fileInput);
  page.append(layout);

  audio = new Audio();
  audio.preload = "metadata";
  audio.volume = Number(volumeInput.value);
  addButton.addEventListener("click", () => fileInput.click());
  urlForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addAudioUrl(urlInput.value.trim());
  });
  fileInput.addEventListener("change", () => {
    addFiles(fileInput.files ?? []);
    fileInput.value = "";
  });
  searchInput.addEventListener("input", () => {
    activeFilter = searchInput.value;
    renderPlaylist();
  });
  playButton.addEventListener("click", () => {
    if (!currentTrack()) {
      fileInput.click();
      setStatus("Choose audio files to build your playlist.");
      return;
    }
    if (audio.paused) {
      audio.play().catch((error) => {
        console.error("Could not start Greedified playback.", error);
        setStatus("Playback could not start. Try another audio file.");
      });
    } else {
      audio.pause();
    }
  });
  previousButton.addEventListener("click", () => {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    selectAdjacentTrack(-1);
  });
  nextButton.addEventListener("click", () => selectAdjacentTrack(1));
  shuffleButton.addEventListener("click", () => {
    shuffleEnabled = !shuffleEnabled;
    shuffleButton.setAttribute("aria-pressed", String(shuffleEnabled));
    setStatus(`Shuffle ${shuffleEnabled ? "on" : "off"}.`);
  });
  repeatButton.addEventListener("click", () => {
    repeatMode =
      repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off";
    repeatButton.setAttribute("aria-pressed", String(repeatMode !== "off"));
    repeatButton.setAttribute("aria-label", `Repeat ${repeatMode}`);
    setStatus(`Repeat ${repeatMode}.`);
  });
  downloadButton.addEventListener("click", () => {
    const track = currentTrack();
    if (track) downloadTrack(track);
  });
  seekInput.addEventListener("input", () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = (Number(seekInput.value) / 1000) * audio.duration;
    }
  });
  volumeInput.addEventListener("input", () => {
    audio.volume = Number(volumeInput.value);
  });
  for (const eventName of ["durationchange", "loadedmetadata", "timeupdate"]) {
    audio.addEventListener(eventName, updatePlayer);
  }
  for (const eventName of ["play", "pause"]) {
    audio.addEventListener(eventName, () => {
      updatePlayer();
      renderPlaylist();
    });
  }
  audio.addEventListener("ended", () => {
    if (repeatMode === "one" || (repeatMode === "all" && tracks.length === 1)) {
      audio.currentTime = 0;
      audio.play().catch((error) => {
        console.error("Could not repeat the current Greedified track.", error);
        setStatus("Playback could not restart.");
      });
    } else if (repeatMode === "all" || tracks.findIndex((track) => track.id === currentTrackId) < tracks.length - 1) {
      selectAdjacentTrack(1);
    } else {
      updatePlayer();
      renderPlaylist();
    }
  });
  audio.addEventListener("error", () => {
    if (currentTrack()) {
      setStatus("This audio file could not be played in this browser.");
    }
  });

  for (const eventName of ["dragenter", "dragover"]) {
    playlist.addEventListener(eventName, (event) => {
      event.preventDefault();
      playlist.dataset.dragging = "";
    });
  }
  for (const eventName of ["dragleave", "drop"]) {
    playlist.addEventListener(eventName, (event) => {
      event.preventDefault();
      delete playlist.dataset.dragging;
      if (eventName === "drop") addFiles(event.dataTransfer?.files ?? []);
    });
  }

  renderPlaylist();
  updatePlayer();
  return page;
}

function mountMusicTab() {
  if (musicSurface) return;
  const navigation = document.querySelector(".greed-greed-list");
  const main = document.querySelector(".greed-main");
  if (!navigation || !main) return;

  musicButton = makeButton("greed-greed-item greed-music-nav", "Greedified", "");
  const icon = makeElement("span", "greed-music-nav__icon");
  icon.setAttribute("aria-hidden", "true");
  const label = makeElement("span", "greed-greed-label", "Greedified");
  musicButton.append(icon, label);
  const listItem = makeElement("li", "greed-music-nav__item");
  listItem.append(musicButton);
  const settingsItem = Array.from(navigation.children).find((item) =>
    item.querySelector(".greed-greed-label")?.textContent.trim() === "Settings",
  );
  navigation.insertBefore(listItem, settingsItem ?? null);

  musicSurface = createMusicPage();
  main.append(musicSurface);
  musicButton.addEventListener("click", () => {
    if (musicSurface && !musicSurface.hidden) {
      closeMusic();
    } else {
      openMusic();
    }
  });
  navigation.addEventListener(
    "click",
    (event) => {
      if (!musicButton.contains(event.target)) closeMusic();
    },
    true,
  );
  mountObserver.disconnect();
}

const mountObserver = new MutationObserver(mountMusicTab);
mountObserver.observe(document.documentElement, {
  childList: true,
  subtree: true,
});
mountMusicTab();
