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
  let gap = 250; //gap between up and down
  const hitboxPaddingX = 12;
  const hitboxPaddingY = 18;
   const nearMissDistance = 8;
  let lives = 5;
  const maxLives = 5;
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

  //Store bg in an array for looping
  const backgrounds = [bgMorning, bgEvening, bgNight];

  // Current background
  let currentBg = backgrounds[0];
  let nextBg = null;
  let bgFade = 0;
  let isTransitioning = false;

  let bgX = 0;
  const bgSpeed = 1.5;

  //==========================
  //Load Sounds
  //==========================
const hitSound = new Audio("assets/audios/hit.mp3");
hitSound.volume = 0.1;

const cakeSound = new Audio("assets/audios/cake.mp3");
cakeSound.volume = 0.1;

const jumpSound = new Audio("assets/audios/jump.mp3");
jumpSound.volume = 0.5; 
let soundEnabled = true;

const soundToggleBtn = document.getElementById("soundBtn");
soundToggleBtn.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundToggleBtn.textContent = soundEnabled ? "Sound: ON" : "Sound: OFF";
});

//Cake Object For Level Mode
let cake = { x: 0, y: 0, width: 150, height: 150, visible: false };


  //==========================
  // Overlays
  //==========================
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

  //=====================
  // MODE Select
  //======================
  const modeScreen = document.createElement("div");
  modeScreen.className = "overlay";
  modeScreen.innerHTML = `
    <h2>Select Mode</h2>
    <button id="endlessModeBtn">Endless Mode</button>
    <button id="levelModeBtn">Level Mode</button>
  `;
  document.querySelector(".game-card").appendChild(modeScreen);

  const endlessModeBtn = modeScreen.querySelector("#endlessModeBtn");
  const levelModeBtn = modeScreen.querySelector("#levelModeBtn");

  endlessModeBtn.addEventListener("click", () => {
    currentMode = GameMode.ENDLESS;
    modeScreen.classList.add("hidden");
    startGame();
  });

  levelModeBtn.addEventListener("click", () => {
    currentMode = GameMode.LEVEL;
    modeScreen.classList.add("hidden");
    startGame();
  });

  //==========================
  // LOAD Sound Function
  //==========================

  function playJumpSound() {
  if (!soundEnabled) return;

  jumpSound.currentTime = 0;
  jumpSound.play().catch(() => {});
}

function playHitSound() {
  if (!soundEnabled) return;

  hitSound.currentTime = 0;
  hitSound.play().catch(() => {});
}

function playCakeSound() {
  if (!soundEnabled) return;
  cakeSound.currentTime = 0;
  cakeSound.play().catch(() => {});
}


//=====================
// Reset and Spawn
//=====================
  function resetGame() {
       lives = maxLives;
    player = { x: 80, y: 300, velocity: 0 };
    obstacles = [];
    score = 0;
    gameSpeed = 2;
    level = 1;
    currentBg = backgrounds[0];
    obstaclesPassed = 0;
    catScaleX = catScaleY = targetScaleX = targetScaleY = 1;
    cake.visible = false;

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

//===================
// UPDATE FUNCTIONS
//====================
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
      triggerSquash(0.2, -0.2);
    } else if (player.y + playerHeight > canvas.height) {
      player.y = canvas.height - playerHeight;
      player.velocity = -2;
      triggerSquash(0.2, -0.2);
      handleCollision();
    }
  
// =========================
// LEVEL MODE: CHECK CAKE COLLISION
// =========================
 if (currentMode === GameMode.LEVEL && cake.visible) {
      if (
        player.x + playerWidth > cake.x &&
        player.x < cake.x + cake.width &&
        player.y + playerHeight > cake.y &&
        player.y < cake.y + cake.height
      ) {
  // Player touched cake → trigger level pause
      cake.visible = false;
      playCakeSound(); //cake sound
  // showLevelPause();
        setTimeout(() => showLevelPause(), 10);
      }
    }
  }


  function updateObstacles() {
    if (currentState !== GameState.PLAYING) return;

    obstacles.forEach((o) => {
      o.x -= gameSpeed;

      // LEVEL MODE: count obstacle passed
       if (currentMode === GameMode.LEVEL) {
    if (!o.passed && o.x + obstacleWidth < player.x) {
      o.passed = true;
      obstaclesPassed++;
    }
  }
      const hit =
        player.x + hitboxPaddingX < o.x + obstacleWidth &&
        player.x + playerWidth - hitboxPaddingX > o.x &&
        (player.y + hitboxPaddingY < o.top ||
          player.y + playerHeight - hitboxPaddingY > canvas.height - o.bottom);

      if (hit && !invincible) {
        handleCollision();
        return;
      }

      //near miss effects
      const nearMiss =
        player.x + hitboxPaddingX < o.x + obstacleWidth + nearMissDistance &&
        player.x + playerWidth - hitboxPaddingX > o.x - nearMissDistance &&
        (player.y + hitboxPaddingY < o.top + nearMissDistance || player.y + playerHeight - hitboxPaddingY > canvas.height - o.bottom - nearMissDistance);

      if (nearMiss) triggerNearMissEffect();
    });
       if (cake.visible) {
  cake.x -= gameSpeed;
}

    obstacles = obstacles.filter(o => o.x + obstacleWidth > 0);


    if (currentMode === GameMode.ENDLESS) {
      if (obstacles.length === 0 || obstacles.at(-1).x < 200) spawnObstacle();
    }else if (currentMode === GameMode.LEVEL) {
      if (obstaclesPassed < obstaclesPerLevel) {
  if (
    obstacles.length === 0 ||
    obstacles.at(-1).x < canvas.width - spawnDistance
  ) {
    spawnObstacle();
  }
}

      // Dynamically place cake after last obstacle
      if (!cake.visible && obstaclesPassed >= obstaclesPerLevel) {
        cake.x = canvas.width + 100;
cake.y = canvas.height / 2 - cake.height / 2;
cake.visible = true;
      }

  
    }
  }

 function checkScore() {
    if (currentState === GameState.PLAYING) {
      score++;
      if (currentMode === GameMode.ENDLESS) {
        if (score % 500 === 0) gameSpeed += 0.2;
      } else if (currentMode === GameMode.LEVEL) {
        // obstacles.forEach(o => {
        //   if (!o.passed && o.x + obstacleWidth < player.x) {
        //     o.passed = true;
        //     obstaclesPassed++;
        //   }
        // });
      }
      animateScore();
    }
  }

function showLevelPause() {
  currentState = GameState.LEVEL_PAUSE;

  const pauseScreen = document.createElement("div");
  pauseScreen.className = "overlay";
  pauseScreen.innerHTML = `
    <h2>Rest and get ready for the next level!</h2>
    <img src="assets/images/cake.png" style="width:100px;height:100px;"/>
    <p>Click or press SPACE to continue</p>
  `;

  document.querySelector(".game-card").appendChild(pauseScreen);

  let resumed = false;

  function resumeLevel() {
    if (resumed) return;
    resumed = true;

    document.removeEventListener("keydown", handleKey);
    pauseScreen.remove();

    currentMode = GameMode.LEVEL;

    obstacles = [];
    obstaclesPassed = 0;

    obstaclesPerLevel += 1;
    gameSpeed += 0.5;
    level++;

      if (isTransitioning) {
    currentBg = nextBg;
    isTransitioning = false;
    bgFade = 0;
  }

    nextBg = backgrounds[(level - 1) % backgrounds.length];
    isTransitioning = true;
    bgFade = 0;

    cake.visible = false;

    spawnDistance = Math.max(200, spawnDistance - 20);
    gap = Math.max(100, gap - 5);

    startCountdown();
  }

  function handleKey(e) {
    if (e.code === "Space") resumeLevel();
  }

  pauseScreen.addEventListener("click", resumeLevel);
  document.addEventListener("keydown", handleKey);
}


  function animateScore() {
    const scoreDisplay = document.getElementById("scoreDisplay");
    scoreDisplay.classList.remove("score-bounce");
    void scoreDisplay.offsetWidth;
    scoreDisplay.classList.add("score-bounce");
  }


  // =========================
  // JUICE EFFECT FUNCTIONS
  // =========================
  function triggerSquash(xAmount, yAmount) {
    targetScaleX = 1 + xAmount;
    targetScaleY = 1 - yAmount;
  }

  function triggerJumpStretch() {
    targetScaleX = 0.8;
    targetScaleY = 1.2;
  }

  function triggerNearMissEffect() {
    canvas.style.boxShadow = "0 0 20px rgba(255,200,255,0.6), 0 12px 30px rgba(0,0,0,0.35)";
    setTimeout(() => {
      canvas.style.boxShadow = "inset 0 0 0 2px var(--accent-soft), 0 12px 30px rgba(0,0,0,0.35)";
    }, 150);
  }

  function triggerCollisionPuff() {
    ctx.save();
    ctx.fillStyle = "rgba(255,200,255,0.6)";
    ctx.beginPath();
    ctx.arc(player.x + playerWidth/2, player.y + playerHeight/2, 40, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
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
    playHitSound();

    if (invincible || respawning) return;

    triggerSquash(0.3, 0.3);
    triggerCollisionPuff();

    lives--;

    if (lives <= 0) {
      triggerGameOver();
    } else {
      invincible = true;
      visible = false;

      blinkInterval = setInterval(() => { visible = !visible; }, 100);

      setTimeout(() => {
        invincible = false;
        clearInterval(blinkInterval);
        visible = true;
      }, invincibleTime);

      canvas.style.border = "4px solid red";
      setTimeout(() => canvas.style.border = "2px solid var(--accent-soft)", 200);
    }
  }

 function drawBackground() {
  const x = Math.floor(bgX);

  // Draw current background
  ctx.globalAlpha = 1;
  ctx.drawImage(currentBg, x, 0, canvas.width, canvas.height);
  ctx.drawImage(currentBg, x + canvas.width - 2, 0, canvas.width, canvas.height);

  // Draw fade overlay
  if (isTransitioning && nextBg) {
    ctx.globalAlpha = bgFade;
    ctx.drawImage(nextBg, x, 0, canvas.width, canvas.height);
    ctx.drawImage(nextBg, x + canvas.width - 1, 0, canvas.width, canvas.height);
  }

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
    for (let i = 0; i < lives; i++) livesDisplay += "❤️";
    ctx.fillStyle = "red";
    ctx.font = "20px 'Press Start 2P'";
    ctx.fillText(livesDisplay, 10, 30);

    if (currentMode === GameMode.LEVEL) {
      ctx.fillStyle = "yellow";
      ctx.font = "20px 'Press Start 2P'";
      ctx.fillText("Level: " + level, canvas.width - 120, 30);

      // Draw cake on screen
      if (cake.visible) {
        ctx.drawImage(cakeImg, cake.x, cake.y, cake.width, cake.height);
      }
    }

    if (currentState === GameState.PAUSED) {
      ctx.fillStyle = "white";
      ctx.font = "16px 'Press Start 2P'";
      ctx.fillText("PAUSED", 140, 300);
    }
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
     if (isTransitioning) {
  bgFade += 0.001;  // speed of fade

  if (bgFade >= 1) {
    bgFade = 1;
    currentBg = nextBg;
    isTransitioning = false;
  }
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

     // =========================
  // Countdown Function
  // =========================
function startCountdown() {
  currentState = GameState.COUNTDOWN;

  const countdownScreen = document.createElement("div");
  countdownScreen.className = "overlay";
  document.querySelector(".game-card").appendChild(countdownScreen);

  let count = 3;
  countdownScreen.innerHTML = `<h1>${count}</h1>`;

  const interval = setInterval(() => {
    count--;

    if (count > 0) {
      countdownScreen.innerHTML = `<h1>${count}</h1>`;
    } else if (count === 0) {
      countdownScreen.innerHTML = `<h1>GO!</h1>`;
    } else {
      clearInterval(interval);
      countdownScreen.remove();

      // Reset player cleanly
      player.velocity = 0;

      currentState = GameState.PLAYING; // <-- ONLY HERE
    }
  }, 1000);
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
          playJumpSound();
          break;

        case GameState.GAME_OVER:
          resetGame();
          break;
        
        case GameState.COUNTDOWN:
          //do nothing during countdown

          break;
      }
    }

     if (e.code === "KeyP") {
    if (currentState === GameState.PLAYING) {
      currentState = GameState.PAUSED;
    } else if (currentState === GameState.PAUSED) {
      currentState = GameState.PLAYING;
    }
  }
  });

  canvas.addEventListener("click", () => {
    if (currentState === GameState.START) startGame();
    else if (currentState === GameState.PLAYING) {
      player.velocity = -8;
      triggerJumpStretch();
      playJumpSound();
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
