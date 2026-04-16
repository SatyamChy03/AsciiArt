const ASCII_WIDTH = 96;
const ASCII_HEIGHT = 54;
const TARGET_FPS = 12;
const FRAME_TIME = 1000 / TARGET_FPS;
const RECORD_CHAR_WIDTH = 8;
const RECORD_CHAR_HEIGHT = 12;
const NOISE_TABLE_SIZE = 2048;

const MODES = {
  normal: "normal",
  binary: "binary",
  cyberpunk: "cyberpunk",
  portrait: "portrait"
};

const NORMAL_CHARS = " .:-=+*#%@";
const CYBERPUNK_CHARSETS = {
  bright: "@#█",
  mid: "01",
  dark: " ."
};
const PORTRAIT_CHARSETS = {
  core: "██▓▓##@@",
  mid: "0110oo",
  back: "010101..  "
};

const NOISE_TABLE = (() => {
  const values = new Float32Array(NOISE_TABLE_SIZE);
  let seed = 1337;

  for (let i = 0; i < NOISE_TABLE_SIZE; i += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    values[i] = seed / 4294967295;
  }

  return values;
})();

const state = {
  mode: MODES.normal,
  brightness: 0,
  contrast: 0,
  color: "#00ff9f",
  lastAsciiFrame: "",
  frameHandle: null,
  lastFrameTime: 0,
  frameCount: 0,
  isRecording: false,
  mediaRecorder: null,
  recordedChunks: []
};

const elements = {
  cameraFeed: document.getElementById("cameraFeed"),
  sourceCanvas: document.getElementById("sourceCanvas"),
  recordCanvas: document.getElementById("recordCanvas"),
  asciiOutput: document.getElementById("asciiOutput"),
  modeSelect: document.getElementById("modeSelect"),
  brightnessRange: document.getElementById("brightnessRange"),
  contrastRange: document.getElementById("contrastRange"),
  brightnessValue: document.getElementById("brightnessValue"),
  contrastValue: document.getElementById("contrastValue"),
  themeButtons: Array.from(document.querySelectorAll(".theme-btn")),
  downloadBtn: document.getElementById("downloadBtn"),
  startRecordBtn: document.getElementById("startRecordBtn"),
  stopRecordBtn: document.getElementById("stopRecordBtn"),
  statusText: document.getElementById("statusText")
};

const sourceCtx = elements.sourceCanvas.getContext("2d", { willReadFrequently: true });
const recordCtx = elements.recordCanvas.getContext("2d");

async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: "user"
      },
      audio: false
    });

    elements.cameraFeed.srcObject = stream;
    await elements.cameraFeed.play().catch(() => {});

    await new Promise((resolve) => {
      if (elements.cameraFeed.readyState >= HTMLMediaElement.HAVE_METADATA) {
        resolve();
        return;
      }

      elements.cameraFeed.addEventListener("loadedmetadata", resolve, { once: true });
    });

    elements.sourceCanvas.width = ASCII_WIDTH;
    elements.sourceCanvas.height = ASCII_HEIGHT;

    // Render a larger ASCII frame for recording quality while keeping processing at 96x54.
    elements.recordCanvas.width = ASCII_WIDTH * RECORD_CHAR_WIDTH;
    elements.recordCanvas.height = ASCII_HEIGHT * RECORD_CHAR_HEIGHT;
    recordCtx.font = `${RECORD_CHAR_HEIGHT}px Courier New`;
    recordCtx.textBaseline = "top";

    elements.statusText.textContent = "Camera active. Rendering ASCII stream...";
    state.frameHandle = requestAnimationFrame(processFrame);
  } catch (error) {
    elements.statusText.textContent = "Camera access failed. Allow webcam permission and reload.";
    console.error("Camera initialization error:", error);
  }
}

function applyBrightnessContrast(imageData, brightness, contrast) {
  const data = imageData.data;
  const brightnessShift = brightness;
  const scaledContrast = contrast * 2.55;
  const factor = (259 * (scaledContrast + 255)) / (255 * (259 - scaledContrast));

  for (let i = 0; i < data.length; i += 4) {
    data[i] = clampColor(factor * (data[i] - 128) + 128 + brightnessShift);
    data[i + 1] = clampColor(factor * (data[i + 1] - 128) + 128 + brightnessShift);
    data[i + 2] = clampColor(factor * (data[i + 2] - 128) + 128 + brightnessShift);
  }

  return imageData;
}

function clampColor(value) {
  return Math.max(0, Math.min(255, value));
}

function sampleNoise(x, y, frame, salt) {
  const hash = (x * 92821 + y * 68917 + frame * 131 + salt * 199) & (NOISE_TABLE_SIZE - 1);
  return NOISE_TABLE[hash];
}

function mapToAscii(gray, mode, x, y) {
  if (mode === MODES.binary) {
    // Dense binary ink for shadows, sparse bits for highlights.
    return gray < 132 ? "1" : "0";
  }

  if (mode === MODES.cyberpunk) {
    // Deterministic noise avoids random stalls while keeping glitch texture alive.
    const jitter = ((x * 13 + y * 7 + state.frameCount * 3) % 21) - 10;
    const noise = (sampleNoise(x, y, state.frameCount, 11) - 0.5) * 22;
    const glitchGray = Math.max(0, Math.min(255, gray + jitter + noise));

    let charset;
    if (glitchGray >= 170) {
      charset = CYBERPUNK_CHARSETS.bright;
    } else if (glitchGray >= 85) {
      charset = CYBERPUNK_CHARSETS.mid;
    } else {
      charset = CYBERPUNK_CHARSETS.dark;
    }

    const charIndex = Math.floor(sampleNoise(x, y, state.frameCount, 19) * charset.length);
    return charset[charIndex];
  }

  if (mode === MODES.portrait) {
    // Image-inspired style: bright portrait core over binary textured background.
    const phaseA = ((x * 17 + y * 11 + state.frameCount * 2) % 19) - 9;
    const phaseB = ((x * 7 + y * 13 + state.frameCount) % 15) - 7;
    const sculpted = Math.max(0, Math.min(255, gray + phaseA + phaseB * 0.7));

    if (sculpted >= 188) {
      const set = PORTRAIT_CHARSETS.core;
      const charIndex = Math.floor(sampleNoise(x, y, state.frameCount, 23) * set.length);
      return set[charIndex];
    }

    if (sculpted >= 112) {
      const set = PORTRAIT_CHARSETS.mid;
      const charIndex = Math.floor(sampleNoise(x, y, state.frameCount, 29) * set.length);
      return set[charIndex];
    }

    const scanline = (y + state.frameCount) % 4 === 0;
    if (scanline && sculpted < 90) {
      return " ";
    }

    const backSet = PORTRAIT_CHARSETS.back;
    return backSet[(x + y + state.frameCount) % backSet.length];
  }

  // Invert luminance so darker areas use denser symbols.
  const normalized = (255 - gray) / 255;
  const index = Math.min(
    NORMAL_CHARS.length - 1,
    Math.floor(normalized * (NORMAL_CHARS.length - 1))
  );
  return NORMAL_CHARS[index];
}

function renderAscii(asciiFrame) {
  if (asciiFrame !== state.lastAsciiFrame) {
    elements.asciiOutput.textContent = asciiFrame;
    state.lastAsciiFrame = asciiFrame;
  }

  if (!state.isRecording) {
    return;
  }

  const lines = asciiFrame.split("\n");

  recordCtx.fillStyle = "#000000";
  recordCtx.fillRect(0, 0, elements.recordCanvas.width, elements.recordCanvas.height);
  recordCtx.fillStyle = state.color;
  recordCtx.shadowColor = state.color;
  recordCtx.shadowBlur = 6;
  recordCtx.font = `${RECORD_CHAR_HEIGHT}px Courier New`;

  for (let y = 0; y < lines.length; y += 1) {
    recordCtx.fillText(lines[y], 0, y * RECORD_CHAR_HEIGHT);
  }

  recordCtx.shadowBlur = 0;
}

function processFrame(timestamp) {
  state.frameHandle = requestAnimationFrame(processFrame);

  if (document.hidden) {
    return;
  }

  if (timestamp - state.lastFrameTime < FRAME_TIME) {
    return;
  }

  // Keep pacing steady after tab throttling or brief frame drops.
  state.lastFrameTime = timestamp - ((timestamp - state.lastFrameTime) % FRAME_TIME);

  if (elements.cameraFeed.readyState < 2) {
    return;
  }

  sourceCtx.drawImage(elements.cameraFeed, 0, 0, ASCII_WIDTH, ASCII_HEIGHT);
  const frame = sourceCtx.getImageData(0, 0, ASCII_WIDTH, ASCII_HEIGHT);
  const adjustedFrame = applyBrightnessContrast(frame, state.brightness, state.contrast);
  state.frameCount += 1;

  const lines = new Array(ASCII_HEIGHT);
  const pixelData = adjustedFrame.data;

  for (let y = 0; y < ASCII_HEIGHT; y += 1) {
    const rowStart = y * ASCII_WIDTH * 4;
    const rowChars = new Array(ASCII_WIDTH);

    for (let x = 0; x < ASCII_WIDTH; x += 1) {
      const index = rowStart + x * 4;
      const r = pixelData[index];
      const g = pixelData[index + 1];
      const b = pixelData[index + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      rowChars[x] = mapToAscii(gray, state.mode, x, y);
    }

    lines[y] = rowChars.join("");
  }

  const ascii = lines.join("\n");
  renderAscii(ascii);
}

function handleRecording(action) {
  if (action === "start") {
    if (state.isRecording) {
      return;
    }

    const stream = elements.recordCanvas.captureStream(TARGET_FPS);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    state.recordedChunks = [];
    state.mediaRecorder = new MediaRecorder(stream, { mimeType });

    state.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        state.recordedChunks.push(event.data);
      }
    };

    state.mediaRecorder.onstop = () => {
      const blob = new Blob(state.recordedChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ascii-recording-${Date.now()}.webm`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      state.recordedChunks = [];
      state.mediaRecorder = null;
      state.isRecording = false;
      elements.startRecordBtn.disabled = false;
      elements.stopRecordBtn.disabled = true;
      elements.statusText.textContent = "Recording saved.";
    };

    state.mediaRecorder.start(200);
    state.isRecording = true;
    elements.startRecordBtn.disabled = true;
    elements.stopRecordBtn.disabled = false;
    elements.statusText.textContent = "Recording ASCII video...";
    return;
  }

  if (action === "stop" && state.mediaRecorder && state.isRecording) {
    state.mediaRecorder.stop();
  }
}

function toSoftHexColor(hexColor, intensity) {
  const safeIntensity = Math.max(0, Math.min(1, intensity));
  const hex = hexColor.replace("#", "");
  const expanded = hex.length === 3
    ? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
    : hex;

  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);

  const soften = (channel) => Math.max(0, Math.min(255, Math.round(channel * safeIntensity)));
  const toHex = (value) => value.toString(16).padStart(2, "0");

  return `#${toHex(soften(r))}${toHex(soften(g))}${toHex(soften(b))}`;
}

function applyThemeColor(hexColor) {
  state.color = hexColor;

  const displayColor = toSoftHexColor(hexColor, 0.74);
  document.documentElement.style.setProperty("--text", displayColor);
  document.documentElement.style.setProperty("--edge", `${displayColor}66`);
}

function bindUI() {
  state.mode = MODES[elements.modeSelect.value] ? elements.modeSelect.value : MODES.normal;

  const initialTheme = elements.themeButtons.find((btn) => btn.classList.contains("active"));
  if (initialTheme) {
    applyThemeColor(initialTheme.dataset.color);
  }

  const updateMode = (event) => {
    const nextMode = event.target.value;
    state.mode = MODES[nextMode] ? nextMode : MODES.normal;
    state.lastAsciiFrame = "";
    state.lastFrameTime = 0;
    state.frameCount = 0;
    elements.statusText.textContent = `Mode: ${state.mode}`;
  };

  elements.modeSelect.addEventListener("change", updateMode);
  elements.modeSelect.addEventListener("input", updateMode);

  elements.brightnessRange.addEventListener("input", (event) => {
    state.brightness = Number(event.target.value);
    elements.brightnessValue.textContent = String(state.brightness);
  });

  elements.contrastRange.addEventListener("input", (event) => {
    state.contrast = Number(event.target.value);
    elements.contrastValue.textContent = String(state.contrast);
  });

  elements.themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyThemeColor(button.dataset.color);

      elements.themeButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
    });
  });

  elements.downloadBtn.addEventListener("click", () => {
    const asciiText = state.lastAsciiFrame || "";
    const blob = new Blob([asciiText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ascii-frame-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  elements.startRecordBtn.addEventListener("click", () => handleRecording("start"));
  elements.stopRecordBtn.addEventListener("click", () => handleRecording("stop"));

  window.addEventListener("beforeunload", () => {
    if (state.frameHandle) {
      cancelAnimationFrame(state.frameHandle);
    }

    if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
      state.mediaRecorder.stop();
    }

    const stream = elements.cameraFeed.srcObject;
    if (stream && stream.getTracks) {
      stream.getTracks().forEach((track) => track.stop());
    }
  });
}

bindUI();
initCamera();
