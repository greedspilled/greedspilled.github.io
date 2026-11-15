function loadCursorImage(source, removeBlack) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = image.naturalWidth;
      sourceCanvas.height = image.naturalHeight;
      const sourceContext = sourceCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      if (!sourceContext) {
        reject(new Error("Could not prepare the Greed cursor image."));
        return;
      }

      sourceContext.drawImage(image, 0, 0);
      const pixels = sourceContext.getImageData(
        0,
        0,
        sourceCanvas.width,
        sourceCanvas.height,
      );
      let left = sourceCanvas.width;
      let top = sourceCanvas.height;
      let right = -1;
      let bottom = -1;

      for (let index = 0; index < pixels.data.length; index += 4) {
        const red = pixels.data[index];
        const green = pixels.data[index + 1];
        const blue = pixels.data[index + 2];
        if (
          pixels.data[index + 3] < 16 ||
          (removeBlack && Math.max(red, green, blue) < 14)
        ) {
          pixels.data[index + 3] = 0;
          continue;
        }

        const pixel = index / 4;
        const x = pixel % sourceCanvas.width;
        const y = Math.floor(pixel / sourceCanvas.width);
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }

      if (right < left || bottom < top) {
        reject(new Error("The Greed cursor image is empty."));
        return;
      }

      sourceContext.putImageData(pixels, 0, 0);
      const cropWidth = right - left + 1;
      const cropHeight = bottom - top + 1;
      const scale = Math.min(48 / cropWidth, 48 / cropHeight);
      const width = Math.max(1, Math.round(cropWidth * scale));
      const height = Math.max(1, Math.round(cropHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Could not resize the Greed cursor image."));
        return;
      }
      context.drawImage(
        sourceCanvas,
        left,
        top,
        cropWidth,
        cropHeight,
        0,
        0,
        width,
        height,
      );

      resolve({
        url: canvas.toDataURL("image/png"),
        hotspotX: removeBlack ? 0 : Math.round(width * 0.68),
        hotspotY: removeBlack ? 0 : Math.round(height * 0.08),
      });
    };
    image.onerror = () => reject(new Error(`Could not load ${source}.`));
    image.src = source;
  });
}

async function installGreedCursor() {
  const [idle, clicking] = await Promise.all([
    loadCursorImage(
      new URL("./icons/greed%20assets/cursor.jpg", import.meta.url),
      true,
    ),
    loadCursorImage(
      new URL("./icons/greed%20assets/cursor-click.png", import.meta.url),
      false,
    ),
  ]);
  const style = document.createElement("style");
  style.textContent = `
    html[data-greed-cursor] *,
    html[data-greed-cursor] *::before,
    html[data-greed-cursor] *::after {
      cursor: url("${idle.url}") ${idle.hotspotX} ${idle.hotspotY}, auto !important;
    }
    html[data-greed-cursor-down] *,
    html[data-greed-cursor-down] *::before,
    html[data-greed-cursor-down] *::after {
      cursor: url("${clicking.url}") ${clicking.hotspotX} ${clicking.hotspotY}, auto !important;
    }
  `;
  document.head.append(style);
  document.documentElement.dataset.greedCursor = "";

  const release = () => {
    delete document.documentElement.dataset.greedCursorDown;
  };
  window.addEventListener("pointerdown", () => {
    document.documentElement.dataset.greedCursorDown = "";
  });
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
  window.addEventListener("blur", release);
}

installGreedCursor().catch((error) => {
  console.error("Could not install the custom Greed cursor.", error);
});
