const form = document.getElementById("pi-form");
const pointInput = document.getElementById("point-count");
const resultEl = document.getElementById("result");
const responseTimeEl = document.getElementById("response-time");
const pointsPreviewEl = document.getElementById("points-preview");
const errorEl = document.getElementById("error");
const estimateBtn = document.getElementById("estimate-btn");
const rainBtn = document.getElementById("rain-btn");
const stopBtn = document.getElementById("stop-btn");
const canvas = document.getElementById("viz");
const ctx = canvas.getContext("2d");
const size = canvas.width;
const BIGINT_SHIFT = 11n;
const FLOAT_SCALE = 2 ** 53;
let rainAbortController = null;
let rainStopRequested = false;
let rainAnimationId = null;

function normalizeUint64(value) {
  return Number(value >> BIGINT_SHIFT) / FLOAT_SCALE;
}

function drawBoard() {
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, size, size);
}

function plotPoint(x, y, inside) {
  ctx.fillStyle = inside ? "#2563eb" : "#dc2626";
  const px = x * size;
  const py = y * size;
  ctx.fillRect(px, py, 2.5, 2.5);
}

function setRunning(isRunning) {
  rainBtn.disabled = isRunning;
  stopBtn.disabled = !isRunning;
  estimateBtn.disabled = isRunning;
}

async function fetchPoints(n, signal) {
  const response = await fetch(`/points?n=${n}`, { signal });
  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  return buffer;
}

async function startRain() {
  errorEl.textContent = "";
  resultEl.textContent = "Raining points…";
  responseTimeEl.textContent = "";
  pointsPreviewEl.textContent = "";
  drawBoard();

  const n = Number(pointInput.value);
  if (!Number.isFinite(n) || n <= 0) {
    errorEl.textContent = "Enter a positive number of points";
    resultEl.textContent = "";
    return;
  }

  rainStopRequested = false;
  rainAbortController = new AbortController();
  setRunning(true);

  try {
    const start = performance.now();
    const buffer = await fetchPoints(n, rainAbortController.signal);
    const durationMs = performance.now() - start;
    const view = new DataView(buffer);
    const points = [];
    let inside = 0;

    for (let offset = 0; offset < buffer.byteLength; offset += 16) {
      const x = normalizeUint64(view.getBigUint64(offset, true));
      const y = normalizeUint64(view.getBigUint64(offset + 8, true));
      const inCircle = x * x + y * y <= 1;
      if (inCircle) inside += 1;
      points.push({ x, y, inCircle });
    }

    let drawn = 0;
    function step() {
      if (rainStopRequested) {
        cancelAnimationFrame(rainAnimationId);
        setRunning(false);
        resultEl.textContent = "Rain stopped.";
        return;
      }

      let count = 0;
      while (drawn < points.length && count < 500) {
        const { x, y, inCircle } = points[drawn];
        plotPoint(x, y, inCircle);
        drawn += 1;
        count += 1;
      }

      if (drawn >= points.length) {
        const piEstimate = 4 * (inside / n);
        resultEl.textContent = `π ≈ ${piEstimate.toPrecision(12)} (inside ${inside} / total ${n})`;
        responseTimeEl.textContent = `Server response time: ${durationMs.toFixed(1)} ms`;
        pointsPreviewEl.textContent = points
          .slice(0, 5)
          .map(({ x, y }, idx) => `#${idx + 1}: (${x.toFixed(6)}, ${y.toFixed(6)})`)
          .join("\n");
        setRunning(false);
        return;
      }

      rainAnimationId = requestAnimationFrame(step);
    }

    rainAnimationId = requestAnimationFrame(step);
  } catch (err) {
    if (err.name === "AbortError") {
      resultEl.textContent = "Rain cancelled.";
    } else {
      console.error(err);
      errorEl.textContent = err.message || "Failed to rain points.";
      resultEl.textContent = "";
      responseTimeEl.textContent = "";
    }
    setRunning(false);
    drawBoard();
  }
}

function stopRain() {
  rainStopRequested = true;
  if (rainAbortController) {
    rainAbortController.abort();
    rainAbortController = null;
  }
  if (rainAnimationId) {
    cancelAnimationFrame(rainAnimationId);
    rainAnimationId = null;
  }
  setRunning(false);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorEl.textContent = "";
  resultEl.textContent = "Calculating…";
  responseTimeEl.textContent = "";
  pointsPreviewEl.textContent = "";

  const n = Number(pointInput.value);
  if (!Number.isFinite(n)) {
    errorEl.textContent = "Enter a number of points";
    resultEl.textContent = "";
    return;
  }

  try {
    const start = performance.now();
    const response = await fetch(`/points?n=${n}`);
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const durationMs = performance.now() - start;
    const view = new DataView(buffer);
    let inside = 0;
    const preview = [];

    for (let offset = 0; offset < buffer.byteLength; offset += 16) {
      const x = normalizeUint64(view.getBigUint64(offset, true));
      const y = normalizeUint64(view.getBigUint64(offset + 8, true));
      if (x * x + y * y <= 1) {
        inside += 1;
      }
      if (preview.length < 5) {
        preview.push({ x, y });
      }
    }

    const piEstimate = 4 * (inside / n);
    resultEl.textContent = `Pi ≈ ${piEstimate.toPrecision(12)} (inside ${inside} / total ${n})`;
    responseTimeEl.textContent = `Server response time: ${durationMs.toFixed(1)} ms`;
    pointsPreviewEl.textContent = preview
      .map(({ x, y }, idx) => `#${idx + 1}: (${x.toFixed(6)}, ${y.toFixed(6)})`)
      .join("\n");
  } catch (err) {
    console.error(err);
    errorEl.textContent = err.message || "Failed to estimate pi.";
    resultEl.textContent = "";
    responseTimeEl.textContent = "";
    pointsPreviewEl.textContent = "";
  }
});

rainBtn.addEventListener("click", () => {
  startRain();
});

stopBtn.addEventListener("click", () => {
  stopRain();
});

drawBoard();
