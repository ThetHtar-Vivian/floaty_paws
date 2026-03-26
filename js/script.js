// =========================
// GAME SETUP
// =========================
const canvas = document.getElementById("gameCanvas");
if (!canvas) {
  console.log("Game canvas not found. Skipping game init.");
} else {
  const ctx = canvas.getContext("2d");
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // GAME STATES

  const GameState = {
    START: "start",
    PLAYING: "playing",
    PAUSED: "paused",
    GAME_OVER: "gameover",
    LEVEL_PAUSE: "levelpause",
    COUNTDOWN: "countdown",
  };
  let currentState = GameState.START;

  // GAME MODES

  const GameMode = {
    ENDLESS: "endless",
    LEVEL: "level"
  };
  let currentMode = GameMode.ENDLESS;
  let level = 1;
  let obstaclesPerLevel = 1;
  let obstaclesPassed = 0;

  // Players and Obstacles
  let player, obstacles, score, gameSpeed;
  const playerWidth = 80;
  const playerHeight = 120;
  const obstacleWidth = 100;
  let gap = 250;
  const hitboxPaddingX = 12;
  const hitboxPaddingY = 18;
  let lives = 5;
  const maxLives = 1;
  let hitCooldown = 0;
  let respawning = false;
  const respawnTargetY = 250;
  const respawnSpeed = 0.4;
  let invincible = false;
  const invincibleTime = 2000;
  let blinkInterval = null;
  let visible = true;
  let spawnDistance = 700; // distance between obstacles

  // CAT JVARIABLES
  let catScaleX = 1;
  let catScaleY = 1;
  let targetScaleX = 1;
  let targetScaleY = 1;
  const scaleLerp = 0.25;

  // Load Images

  const catImg = new Image();

  catImg.src =
    localStorage.getItem("selectedCat") || "assets/images/pixel-cat.png";
  const topObstacleImg = new Image();
  topObstacleImg.src = "assets/images/pipe-top1.png";
  const bottomObstacleImg = new Image();
  bottomObstacleImg.src = "assets/images/pipe-bottom.png";

  //bg images
  const bgMorning = new Image();
  bgMorning.src = "assets/images/game-bgm.jpeg";

  const bgEvening = new Image();
  bgEvening.src = "assets/images/game-bg1.png";

  const bgNight = new Image();
  bgNight.src = "assets/images/game-bgn.jpeg";

  const cakeImg = new Image();
  cakeImg.src = "assets/images/cake.png";

  const backgrounds = [bgMorning, bgEvening, bgNight];

  // Current background
  let currentBg = backgrounds[0];
  let nextBg = null;
  let bgFade = 0;
  let isTransitioning = false;

  let bgX = 0;
  const bgSpeed = 1.5;

  // Overlays
  const startScreen = document.createElement("div");
  startScreen.className = "overlay";
  startScreen.innerHTML = `<h2>Floaty Paws</h2><p>Press SPACE or Click to Start</p>`;
  document.querySelector(".game-card").appendChild(startScreen);

  const gameOverScreen = document.createElement("div");
  gameOverScreen.className = "overlay hidden";
  gameOverScreen.innerHTML = `<h2>Game Over</h2>
      <p id="finalScore">0</p>
      <button id="playAgainBtn">Play Again</button>`;
  document.querySelector(".game-card").appendChild(gameOverScreen);

  const finalScore = gameOverScreen.querySelector("#finalScore");
  const playAgainBtn = gameOverScreen.querySelector("#playAgainBtn");

  // MODE Select
  const modeScreen = document.createElement("div");
  modeScreen.className = "overlay";
  modeScreen.innerHTML = `
    <h2>Select Mode</h2>
    <button id="endlessModeBtn">Endless Mode</button>
    <button id="levelModeBtn">Level Mode</button>
  `;
  document.querySelector(".game-card").appendChild(modeScreen);

  const endlessModeBtn = modeScreen.querySelector("#endlessModeBtn");

  endlessModeBtn.addEventListener("click", () => {
    currentMode = GameMode.ENDLESS;
    modeScreen.classList.add("hidden");
    startGame();
  });

  // Reset and Spawn
  function resetGame() {
    player = { x: 80, y: 300, velocity: 0 };
    obstacles = [];
    score = 0;
    gameSpeed = 2;
    catScaleX = catScaleY = targetScaleX = targetScaleY = 1;

    startScreen.classList.remove("hidden");
    gameOverScreen.classList.add("hidden");
  }

  function spawnObstacle() {
    const topHeight = Math.random() * 250 + 50;
    obstacles.push({
      x: canvas.width,
      top: topHeight,
      bottom: canvas.height - topHeight - gap,
      passed: false,
    });
  }

  // UPDATE FUNCTIONS

  function updatePlayer() {
    if (currentState !== GameState.PLAYING) return;

    if (respawning) {
      const diff = respawnTargetY - player.y;
      player.y += diff * respawnSpeed;
      if (Math.abs(diff) < 1) respawning = false;
      return;
    }

    //gravity that works togeter with cat jump speed
    player.velocity += 0.3;
    player.y += player.velocity;

    if (player.y < 0) {
      player.y = 0;
      player.velocity = 2;
    } else if (player.y + playerHeight > canvas.height) {
      player.y = canvas.height - playerHeight;
      player.velocity = -2;

      handleCollision();
    }
  }

  function updateObstacles() {
    if (currentState !== GameState.PLAYING) return;

    obstacles.forEach((o) => {
      o.x -= gameSpeed;

      // LEVEL MODE: count obstacle passed

      const hit =
        player.x + hitboxPaddingX < o.x + obstacleWidth &&
        player.x + playerWidth - hitboxPaddingX > o.x &&
        (player.y + hitboxPaddingY < o.top ||
          player.y + playerHeight - hitboxPaddingY > canvas.height - o.bottom);

      if (hit && !invincible) {
        handleCollision();
        return;
      }
    });
    if (currentMode === GameMode.ENDLESS) {
      if (obstacles.length === 0 || obstacles.at(-1).x < 200) spawnObstacle();
    }
  }

  function checkScore() {
    if (currentState === GameState.PLAYING) {
      score++;
      if (currentMode === GameMode.ENDLESS) {
        if (score % 500 === 0) gameSpeed += 0.2;
      }
    }
  }
  //Game Over
  function triggerGameOver() {
    if (currentState === GameState.GAME_OVER) return;

    currentState = GameState.GAME_OVER;

    finalScore.textContent = "Score: " + score;

    const high = Math.max(
      score,
      parseInt(localStorage.getItem("highScore") || 0),
    );
    localStorage.setItem("highScore", high);

    gameOverScreen.classList.remove("hidden");
  }

  function handleCollision() {
    triggerGameOver();
  }

  function drawBackground() {
    const x = Math.floor(bgX);
    ctx.globalAlpha = 1;
    ctx.drawImage(currentBg, x, 0, canvas.width, canvas.height);
    ctx.drawImage(
      currentBg,
      x + canvas.width - 2,
      0,
      canvas.width,
      canvas.height,
    );

    ctx.globalAlpha = 1;
  }

  function drawObstacles() {
    obstacles.forEach((o) => {
      ctx.drawImage(topObstacleImg, o.x, 0, obstacleWidth, o.top);
      ctx.drawImage(
        bottomObstacleImg,
        o.x,
        canvas.height - o.bottom,
        obstacleWidth,
        o.bottom,
      );
    });
  }

  function drawPlayer() {
    catScaleX += (targetScaleX - catScaleX) * scaleLerp;
    catScaleY += (targetScaleY - catScaleY) * scaleLerp;
    targetScaleX += (1 - targetScaleX) * scaleLerp;
    targetScaleY += (1 - targetScaleY) * scaleLerp;

    ctx.save();
    ctx.translate(player.x + playerWidth / 2, player.y + playerHeight / 2);
    ctx.rotate(player.velocity * 0.05);
    ctx.scale(catScaleX, catScaleY);

    if (visible) {
      ctx.drawImage(
        catImg,
        -playerWidth / 2,
        -playerHeight / 2,
        playerWidth,
        playerHeight,
      );
    }
    ctx.restore();
  }

  function drawUI() {
    document.getElementById("scoreDisplay").textContent = "Score: " + score;

    let livesDisplay = "";

    ctx.fillStyle = "red";
    ctx.font = "20px 'Press Start 2P'";
    ctx.fillText(livesDisplay, 10, 30);
  }

  // MAIN LOOP

  function update() {
    if (hitCooldown > 0) hitCooldown--;
    if (currentState === GameState.PLAYING) {
      bgX -= bgSpeed;
      if (bgX <= -canvas.width) {
        bgX = 0;
      }
    }
    if (currentState === GameState.PLAYING) {
      updatePlayer();
      updateObstacles();
      checkScore();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawObstacles();
    drawPlayer();
    drawUI();
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      document.activeElement.blur();

      switch (currentState) {
        case GameState.START:
          startGame();
          break;

        case GameState.PLAYING:
          player.velocity = -8;
          break;

        case GameState.GAME_OVER:
          resetGame();

          break;
      }
    }
  });

  canvas.addEventListener("click", () => {
    if (currentState === GameState.START) startGame();
    else if (currentState === GameState.PLAYING) {
      player.velocity = -8;
    }
  });

  startScreen.addEventListener("click", startGame);
  playAgainBtn.addEventListener("click", resetGame);

  function startGame() {
    currentState = GameState.PLAYING;
    startScreen.classList.add("hidden");
    player.velocity = 0;
  }

  resetGame();
  loop();
}

// Nav Bar Toggle

const navbarToggle = document.querySelector(".navbar-toggle");
const navbarMenu = document.querySelector(".navbar-menu");

navbarToggle.addEventListener("click", () => {
  navbarToggle.classList.toggle("active");
  navbarMenu.classList.toggle("active");
});

let selectedCat =
  localStorage.getItem("selectedCat") || "assets/images/cats/cat-default.png";

const bigCat = document.getElementById("bigCat");
bigCat.src = selectedCat;
