"use strict";

(() => {
  const TAU = Math.PI * 2;
  const SPIN_DURATION = 5000;
  const COLORS = ["#087c7b", "#0b5591", "#00a86b", "#123e78", "#12a88a", "#075c6f", "#0870ae", "#13805b"];

  const canvas = document.querySelector("#wheel");
  const context = canvas.getContext("2d");
  const fileInput = document.querySelector("#file-input");
  const manualNamesInput = document.querySelector("#manual-names");
  const manualLoadButton = document.querySelector("#manual-load-button");
  const wheelCenterLabel = document.querySelector("#wheel-center-label");
  const uploadArea = document.querySelector("#upload-area");
  const spinButton = document.querySelector("#spin-button");
  const removeWinnerButton = document.querySelector("#remove-winner-button");
  const clearButton = document.querySelector("#clear-button");
  const message = document.querySelector("#message");
  const participantSection = document.querySelector("#participants-section");
  const participantCount = document.querySelector("#participant-count");
  const participantList = document.querySelector("#participant-list");
  const resultCard = document.querySelector("#result-card");
  const winnerName = document.querySelector("#winner-name");
  const wheelHint = document.querySelector("#wheel-hint");
  const celebrationCanvas = document.querySelector("#celebration-canvas");
  const celebrationContext = celebrationCanvas.getContext("2d");
  const winnerOverlay = document.querySelector("#winner-overlay");
  const confettiLayer = document.querySelector("#confetti-layer");
  const winnerAnnouncement = document.querySelector("#winner-announcement");
  const winnerMessage = document.querySelector(".winner-message");
  const winnerRemove = document.querySelector("#winner-remove");
  const winnerKeep = document.querySelector("#winner-keep");
  let participants = [];
  let rotation = 0;
  let isSpinning = false;
  let winnerIndex = -1;
  let animationFrame = 0;
  let canvasSize = 0;
  let celebrationFrame = 0;
  let celebrationParticles = [];
  let celebrationStartedAt = 0;
  let lastCelebrationFrame = 0;

  function resizeCelebrationCanvas() {
    const scale = window.devicePixelRatio || 1;
    celebrationCanvas.width = Math.round(window.innerWidth * scale);
    celebrationCanvas.height = Math.round(window.innerHeight * scale);
    celebrationContext.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function addFireworkBurst(x, y) {
    const colors = ["#00c779", "#ffd21c", "#ffffff", "#22a8ff", "#ff7194"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    for (let index = 0; index < 38; index += 1) {
      const angle = (TAU * index) / 38;
      const speed = 1.5 + Math.random() * 3.5;
      celebrationParticles.push({
        kind: "spark",
        x,
        y,
        vx: Math.cos(angle) * speed * 60,
        vy: Math.sin(angle) * speed * 60,
        life: 1,
        decay: (0.012 + Math.random() * 0.012) * 60,
        gravity: 0.035 * 60 * 60,
        color,
        size: 2 + Math.random() * 2
      });
    }
  }

  function createConfetti() {
    const piece = document.createElement("span");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const size = 5 + Math.random() * 7;
    piece.className = "falling-confetti";
    piece.style.setProperty("--confetti-left", `${Math.random() * 100}%`);
    piece.style.setProperty("--confetti-width", `${size}px`);
    piece.style.setProperty("--confetti-height", `${size * 0.65}px`);
    piece.style.setProperty("--confetti-color", ["#00c779", "#ffd21c", "#ffffff", "#22a8ff", "#ff7194"][Math.floor(Math.random() * 5)]);
    piece.style.setProperty("--confetti-duration", `${(prefersReducedMotion ? 15 : 7) + Math.random() * 6}s`);
    piece.style.setProperty("--confetti-delay", `${-Math.random() * 12}s`);
    piece.style.setProperty("--confetti-drift", `${(Math.random() - 0.5) * 180}px`);
    return piece;
  }

  function startCelebration(name) {
    winnerAnnouncement.textContent = name;
    winnerMessage.textContent = "Parabéns! Você é o vencedor! 🎉";
    winnerOverlay.hidden = false;
    resizeCelebrationCanvas();
    celebrationParticles = [];
    celebrationStartedAt = performance.now();
    lastCelebrationFrame = celebrationStartedAt;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    confettiLayer.replaceChildren(...Array.from(
      { length: prefersReducedMotion ? 36 : 90 },
      createConfetti
    ));

    if (!prefersReducedMotion) {
      addFireworkBurst(window.innerWidth * 0.22, window.innerHeight * 0.3);
      addFireworkBurst(window.innerWidth * 0.78, window.innerHeight * 0.25);
    }
    cancelAnimationFrame(celebrationFrame);
    celebrationFrame = requestAnimationFrame(animateCelebration);
  }

  function animateCelebration(now) {
    if (winnerOverlay.hidden) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const delta = Math.min((now - lastCelebrationFrame) / 1000, 0.05);
    lastCelebrationFrame = now;
    const elapsed = now - celebrationStartedAt;
    celebrationContext.clearRect(0, 0, width, height);

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && Math.random() < 0.055 && elapsed < 4200) {
      addFireworkBurst(width * (0.15 + Math.random() * 0.7), height * (0.12 + Math.random() * 0.42));
    }

    celebrationParticles = celebrationParticles.filter((particle) => particle.life > 0);

    for (const particle of celebrationParticles) {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;

      particle.vy += particle.gravity * delta;
      particle.life -= particle.decay * delta;
      celebrationContext.globalAlpha = Math.max(0, particle.life);
      celebrationContext.fillStyle = particle.color;
      celebrationContext.beginPath();
      celebrationContext.arc(particle.x, particle.y, particle.size * particle.life, 0, TAU);
      celebrationContext.fill();
    }
    celebrationContext.globalAlpha = 1;

    celebrationFrame = requestAnimationFrame(animateCelebration);
  }

  function closeCelebration() {
    winnerOverlay.hidden = true;
    cancelAnimationFrame(celebrationFrame);
    celebrationContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
    celebrationParticles = [];
    confettiLayer.replaceChildren();
  }

  function removeAnnouncedWinner() {
    if (winnerIndex < 0 || winnerIndex >= participants.length) {
      closeCelebration();
      return;
    }

    participants.splice(winnerIndex, 1);
    winnerIndex = -1;
    removeWinnerButton.hidden = true;
    updateParticipants();
    closeCelebration();
    setMessage("O vencedor foi removido da lista.", false);
  }

  function drawWheel() {
    if (!canvasSize) return;

    const scale = window.devicePixelRatio || 1;
    const radius = canvasSize / 2;
    const slice = participants.length ? TAU / participants.length : TAU;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, canvasSize, canvasSize);

    if (!participants.length) {
      context.beginPath();
      context.arc(radius, radius, radius - 4, 0, TAU);
      context.fillStyle = "#0c2b54";
      context.fill();
      context.strokeStyle = "rgba(255,255,255,.2)";
      context.lineWidth = 2;
      context.stroke();
      return;
    }

    context.save();
    context.translate(radius, radius);
    for (let index = 0; index < participants.length; index += 1) {
      const start = rotation - Math.PI / 2 + index * slice;
      const end = start + slice;
      const middle = start + slice / 2;

      context.beginPath();
      context.moveTo(0, 0);
      context.arc(0, 0, radius - 3, start, end);
      context.closePath();
      context.fillStyle = COLORS[index % COLORS.length];
      context.fill();
      context.strokeStyle = "rgba(255,255,255,.72)";
      context.lineWidth = participants.length > 50 ? 0.6 : 1.2;
      context.stroke();

      drawLabel(participants[index], middle, slice, radius);
    }
    context.restore();

    context.beginPath();
    context.arc(radius, radius, radius - 3, 0, TAU);
    context.strokeStyle = "rgba(255,255,255,.85)";
    context.lineWidth = 2;
    context.stroke();
  }

  function drawLabel(name, middle, slice, radius) {
    const readableAngle = Math.atan2(Math.sin(middle), Math.cos(middle));
    const upsideDown = readableAngle > Math.PI / 2 || readableAngle < -Math.PI / 2;
    const labelRadius = radius * 0.66;
    const maxWidth = Math.max(12, labelRadius * slice * 0.86);
    const baseSize = participants.length > 50 ? 8 : participants.length > 30 ? 9 : 12;

    context.save();
    context.rotate(middle);
    context.translate(labelRadius, 0);
    if (upsideDown) context.rotate(Math.PI);
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `700 ${baseSize}px 'DM Sans', sans-serif`;
    context.shadowColor = "rgba(0,0,0,.28)";
    context.shadowBlur = 2;
    context.fillText(name, 0, 0, maxWidth);
    context.restore();
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    canvasSize = rect.width;
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvasSize * scale);
    canvas.height = Math.round(canvasSize * scale);
    drawWheel();
  }

  function updateParticipants() {
    participantList.replaceChildren();
    for (const name of participants) {
      const item = document.createElement("li");
      item.textContent = name;
      participantList.append(item);
    }

    participantCount.textContent = `${participants.length} ${participants.length === 1 ? "participante" : "participantes"}`;
    participantSection.hidden = participants.length === 0;
    spinButton.disabled = participants.length === 0 || isSpinning;
    wheelCenterLabel.textContent = participants.length ? "GIRAR" : "SORTEIO";
    canvas.setAttribute("aria-label", participants.length
      ? `Roleta com ${participants.length} ${participants.length === 1 ? "participante" : "participantes"}. Clique para girar.`
      : "Roleta. Carregue uma planilha para começar o sorteio.");
    drawWheel();
  }

  function setMessage(text, isError = true) {
    message.textContent = text;
    message.classList.toggle("is-success", !isError && Boolean(text));
  }

  function normalizeName(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function isHeader(value) {
    const header = normalizeName(value).replace(/^\uFEFF/, "").toLocaleLowerCase("pt-BR");
    return ["nome", "nome completo", "nome do participante", "participante", "participantes", "name"].includes(header);
  }

  function getNamesFromWorkbook(workbook) {
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new Error("A planilha não contém nenhuma aba.");
    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
    const firstColumn = rows.map((row) => normalizeName(row[0]));
    if (firstColumn.length && isHeader(firstColumn[0])) firstColumn.shift();
    return firstColumn.filter(Boolean);
  }

  function loadManualNames() {
    if (isSpinning) {
      setMessage("Aguarde a roleta parar antes de alterar os participantes.");
      return;
    }

    const names = manualNamesInput.value
      .split(/\r?\n/)
      .map(normalizeName)
      .filter(Boolean);

    if (names.length && isHeader(names[0])) names.shift();
    if (!names.length) {
      setMessage("Digite pelo menos um nome, com um participante por linha.");
      return;
    }

    participants = names;
    rotation = 0;
    winnerIndex = -1;
    resultCard.hidden = true;
    removeWinnerButton.hidden = true;
    closeCelebration();
    updateParticipants();
    setMessage(`${names.length} ${names.length === 1 ? "participante carregado" : "participantes carregados"} com sucesso.`, false);
    wheelHint.textContent = "Clique na roleta ou no botão para sortear.";
    clearButton.hidden = false;
  }

  async function loadFile(file) {
    if (!file) return;
    if (isSpinning) {
      fileInput.value = "";
      setMessage("Aguarde a roleta parar antes de carregar outra planilha.");
      return;
    }
    setMessage("");
    resultCard.hidden = true;
    removeWinnerButton.hidden = true;

    const extension = file.name.split(".").pop().toLocaleLowerCase("pt-BR");
    if (!["xlsx", "xls", "csv"].includes(extension)) {
      setMessage("Formato inválido. Escolha um arquivo .xlsx, .xls ou .csv.");
      fileInput.value = "";
      return;
    }
    if (typeof XLSX === "undefined") {
      setMessage("Não foi possível carregar o leitor de planilhas. Verifique sua conexão com a internet e tente novamente.");
      fileInput.value = "";
      return;
    }

    try {
      const workbook = extension === "csv"
        ? XLSX.read(await file.text(), { type: "string" })
        : XLSX.read(await file.arrayBuffer(), { type: "array" });
      const names = getNamesFromWorkbook(workbook);
      if (!names.length) {
        participants = [];
        rotation = 0;
        winnerIndex = -1;
        updateParticipants();
        setMessage("Nenhum nome foi encontrado na primeira coluna da primeira aba.");
        fileInput.value = "";
        clearButton.hidden = false;
        return;
      }

      participants = names;
      rotation = 0;
      winnerIndex = -1;
      updateParticipants();
      setMessage(`${names.length} ${names.length === 1 ? "participante carregado" : "participantes carregados"} com sucesso.`, false);
      wheelHint.textContent = "Clique na roleta ou no botão para sortear.";
      clearButton.hidden = false;
    } catch (error) {
      participants = [];
      rotation = 0;
      winnerIndex = -1;
      updateParticipants();
      setMessage(`Não foi possível ler essa planilha. ${error instanceof Error ? error.message : "Confira se o arquivo não está corrompido."}`);
      clearButton.hidden = false;
    }
  }

  function randomIndex(max) {
    const range = 0x100000000;
    const limit = Math.floor(range / max) * max;
    const randomValues = new Uint32Array(1);
    do {
      crypto.getRandomValues(randomValues);
    } while (randomValues[0] >= limit);
    return randomValues[0] % max;
  }

  function spin() {
    if (isSpinning || participants.length === 0) return;
    if (!globalThis.crypto?.getRandomValues) {
      setMessage("Seu navegador não oferece sorteio seguro. Atualize o navegador e tente novamente.");
      return;
    }

    winnerIndex = randomIndex(participants.length);
    const targetRotation = -(winnerIndex + 0.5) * (TAU / participants.length);
    const remainingTurn = ((targetRotation - rotation) % TAU + TAU) % TAU;
    const startRotation = rotation;
    const endRotation = rotation + TAU * 6 + remainingTurn;
    const startTime = performance.now();

    isSpinning = true;
    spinButton.disabled = true;
    removeWinnerButton.disabled = true;
    removeWinnerButton.hidden = true;
    clearButton.disabled = true;
    setMessage("");
    resultCard.hidden = true;
    wheelHint.textContent = "Boa sorte! Estamos escolhendo o vencedor...";

    function animate(now) {
      const progress = Math.min((now - startTime) / SPIN_DURATION, 1);
      const eased = 1 - (1 - progress) ** 4;
      rotation = startRotation + (endRotation - startRotation) * eased;
      drawWheel();

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
        return;
      }

      rotation = endRotation % TAU;
      isSpinning = false;
      drawWheel();
      announceWinner();
    }

    animationFrame = requestAnimationFrame(animate);
  }

  function announceWinner() {
    if (winnerIndex < 0 || winnerIndex >= participants.length) return;
    winnerName.textContent = participants[winnerIndex];
    resultCard.hidden = false;
    startCelebration(participants[winnerIndex]);
    removeWinnerButton.hidden = false;
    removeWinnerButton.disabled = participants.length <= 1;
    spinButton.disabled = false;
    clearButton.disabled = false;
    wheelHint.textContent = "Parabéns ao vencedor! Quer sortear outro prêmio?";
    if (participants.length <= 1) setMessage("Esse foi o último participante da lista.");
  }

  function removeWinnerAndSpinAgain() {
    if (isSpinning || winnerIndex < 0 || participants.length <= 1) return;
    closeCelebration();
    participants.splice(winnerIndex, 1);
    winnerIndex = -1;
    resultCard.hidden = true;
    removeWinnerButton.hidden = true;
    setMessage("");
    updateParticipants();
    spin();
  }

  function clearAll() {
    if (isSpinning) return;
    cancelAnimationFrame(animationFrame);
    closeCelebration();
    participants = [];
    rotation = 0;
    winnerIndex = -1;
    fileInput.value = "";
    manualNamesInput.value = "";
    resultCard.hidden = true;
    removeWinnerButton.hidden = true;
    clearButton.hidden = true;
    wheelHint.textContent = "Sua próxima surpresa está a um giro de distância.";
    setMessage("");
    updateParticipants();
  }

  fileInput.addEventListener("change", (event) => loadFile(event.currentTarget.files[0]));
  manualLoadButton.addEventListener("click", loadManualNames);
  spinButton.addEventListener("click", spin);
  removeWinnerButton.addEventListener("click", removeWinnerAndSpinAgain);
  clearButton.addEventListener("click", clearAll);
  winnerRemove.addEventListener("click", removeAnnouncedWinner);
  winnerKeep.addEventListener("click", closeCelebration);
  winnerOverlay.addEventListener("click", (event) => {
    if (event.target === winnerOverlay) closeCelebration();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !winnerOverlay.hidden) closeCelebration();
  });
  canvas.addEventListener("click", spin);
  canvas.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      spin();
    }
  });

  uploadArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    uploadArea.classList.add("is-dragging");
  });
  uploadArea.addEventListener("dragleave", () => uploadArea.classList.remove("is-dragging"));
  uploadArea.addEventListener("drop", (event) => {
    event.preventDefault();
    uploadArea.classList.remove("is-dragging");
    loadFile(event.dataTransfer.files[0]);
  });

  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("resize", resizeCelebrationCanvas);
  if ("ResizeObserver" in window) {
    new ResizeObserver(resizeCanvas).observe(canvas);
  }
  resizeCanvas();
  resizeCelebrationCanvas();
})();