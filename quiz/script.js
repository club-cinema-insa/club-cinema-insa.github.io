const QUESTIONS_PER_GAME = 10;

const quizContainer = document.getElementById("quiz-container");
const feedbackEl = document.getElementById("feedback");
const resultsEl = document.getElementById("results");
const scoreText = document.getElementById("score-text");
const toggleAnswersBtn = document.getElementById("toggle-answers");
const submitBtn = document.getElementById("submit-answers");
const newGameBtn = document.getElementById("new-game");
const themeToggleBtn = document.getElementById("theme-toggle");
const popupEl = document.getElementById("win-popup");
const popupCloseBtn = document.getElementById("popup-close");
const confettiContainer = document.getElementById("confetti-container");

const THEME_KEY = "clubcine-theme";

let allQuestions = [];
let currentQuestions = [];
let selections = {};
let revealAnswers = false;
let gameLocked = false;
let currentIndex = 0;      // Indice de la question affichée
let singleMode = true;     // Active le mode 1 question à la fois


function setSubmitMode(mode) {
  if (!submitBtn) return;
  if (mode === "restart") {
    submitBtn.textContent = "Nouvelle partie";
    submitBtn.dataset.mode = "restart";
    if (newGameBtn) newGameBtn.classList.add("hidden");
  } else {
    submitBtn.textContent = "Soumettre";
    submitBtn.dataset.mode = "submit";
    if (newGameBtn) newGameBtn.classList.remove("hidden");
  }
}

async function loadQuestions() {
  setFeedback("Chargement des questions...");
  try {
    const res = await fetch("data.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Aucune question trouvée.");
    }
    allQuestions = data;
    showDifficultySelection();
  } catch (err) {
    setFeedback(`Impossible de charger les questions (${err.message}).`);
  }
}

function showDifficultySelection() {
  // On nettoie l'interface
  quizContainer.innerHTML = "";
  resultsEl.classList.add("hidden");
  setFeedback(""); // On vide le feedback, le titre suffit
  if (submitBtn) submitBtn.classList.add("hidden");

  // --- AJOUT DU TITRE ---
  const title = document.createElement("h2");
  title.textContent = "Choisis ta difficulté";
  title.className = "difficulty-title";
  quizContainer.appendChild(title);
  // ---------------------

  // Conteneur pour les choix (Code existant)
  const container = document.createElement("div");
  container.className = "difficulty-container";

  const levels = [
    { level: 1, title: "Neophyte", desc: "Fan d'Interstellar", class: "diff-1" },
    { level: 2, title: "Amateur", desc: "Admirateur de Kubrick", class: "diff-2" },
    { level: 3, title: "Cinéphile", desc: "Plus de 2000 critiques sur Letterboxd", class: "diff-3" }
  ];

  levels.forEach(lvl => {
    const btn = document.createElement("button");
    btn.className = `difficulty-card ${lvl.class}`;
    btn.innerHTML = `
      <h3>${lvl.title}</h3>
      <p>${lvl.desc}</p>
    `;
    
    btn.addEventListener("click", () => {
      startNewGame(lvl.level);
    });

    container.appendChild(btn);
  });

  quizContainer.appendChild(container);
}

// On ajoute le paramètre difficultyLevel
function startNewGame(difficultyLevel = 1) {
  if (!allQuestions.length) return;

  // 1. FILTRAGE DES QUESTIONS
  // On ne garde que celles qui correspondent au niveau choisi
  // Si une question n'a pas de "difficulty" dans le JSON, on la considère niveau 1 par défaut
  const filteredQuestions = allQuestions.filter(q => (q.difficulty || 1) === difficultyLevel);

  if (filteredQuestions.length === 0) {
    setFeedback(`Aucune question trouvée pour le niveau ${difficultyLevel}.`);
    return;
  }

  // 2. Initialisation standard (le reste ne change pas beaucoup)
  setSubmitMode("submit");
  
  // On pioche dans la liste FILTRÉE
  currentQuestions = pickRandomQuestions(filteredQuestions, QUESTIONS_PER_GAME);
  
  selections = {};
  revealAnswers = false;
  gameLocked = false;
  currentIndex = 0;

  quizContainer.innerHTML = "";
  resultsEl.classList.add("hidden");
  
  // Si tu utilises le système de boutons de la fin de partie, vide le feedback ici
  const feedbackEl = document.getElementById("feedback");
  if(feedbackEl) feedbackEl.innerHTML = ""; 
  setFeedback("Selectionnez votre réponse");

  // On génère TOUTES les cartes (code de l'étape précédente)
  currentQuestions.forEach((question, index) => {
    const card = createQuestionCard(question, index);
    if (index !== 0) {
      card.classList.add("hidden-card");
    }
    quizContainer.appendChild(card);
  });
}


function pickRandomQuestions(list, count) {
  const shuffled = shuffleArray(list);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function shuffleArray(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createQuestionCard(question, index) {
  const card = document.createElement("article");
  card.className = "card";
  card.dataset.index = index;

  const header = document.createElement("div");
  header.className = "card-header";

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = typeLabel(question.type);

  const title = document.createElement("p");
  title.className = "card-title";
  title.innerHTML = `<strong>Question ${index + 1}.</strong> ${question.question}`;

  header.appendChild(badge);
  header.appendChild(title);
  card.appendChild(header);

  if (question.type === "image" && question.image) {
    const media = document.createElement("div");
    media.className = "media";
    const img = document.createElement("img");
    img.src = question.image;
    img.alt = "Indice visuel";
    media.appendChild(img);
    card.appendChild(media);
  }

  if (question.type === "audio" && question.audio) {
    const media = document.createElement("div");
    media.className = "media";
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = question.audio;
    media.appendChild(audio);
    card.appendChild(media);
  }

  const choicesWrapper = document.createElement("div");
  choicesWrapper.className = "choices";
  const choices = shuffleArray(question.choices);
  choices.forEach((choiceText) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.type = "button";
    btn.textContent = choiceText;
    btn.dataset.correct = String(choiceText === question.answer);
    btn.addEventListener("click", (e) => handleChoiceSelect(index, btn, e));
    choicesWrapper.appendChild(btn);
  });

  card.appendChild(choicesWrapper);
  return card;
}

function handleChoiceSelect(questionIndex, button, event) {
  if (gameLocked) return;
  gameLocked = true;

  const currentCard = button.closest(".card");

  // 1. Position ripple
  const rect = button.getBoundingClientRect();
  button.style.setProperty('--x', `${event.clientX - rect.left}px`);
  button.style.setProperty('--y', `${event.clientY - rect.top}px`);

  // 2. Enregistrement
  selections[questionIndex] = button.textContent;

  // 3. Animation de sortie
  setTimeout(() => {
    button.classList.add("animate-popout");
    currentCard.classList.add("fade-siblings"); 
  }, 0);

  setTimeout(() => {
    // --- CORRECTION ICI ---
    // On retire l'animation d'entrée pour qu'elle ne bloque pas la sortie
    currentCard.classList.remove("card-fade-in");
    
    // On lance l'animation de sortie (maintenant en @keyframes)
    currentCard.classList.add("card-fade-out");
  }, 600); 

  // 4. Passage à la suite
  setTimeout(() => {
    currentCard.classList.add("hidden-card");
    // Nettoyage complet des classes pour le futur (restart)
    currentCard.classList.remove("card-fade-out", "fade-siblings");
    button.classList.remove("animate-popout");

    currentIndex++;
    gameLocked = false;

    if (currentIndex < currentQuestions.length) {
      const nextCard = quizContainer.children[currentIndex];
      
      if (nextCard) {
        nextCard.classList.remove("hidden-card");
        void nextCard.offsetWidth; // Le hack de reflow (toujours nécessaire)
        nextCard.classList.add("card-fade-in");
        
        // Scroll mobile
        setTimeout(() => {
             nextCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    } else {
      showCountdownCard();
    }
  }, 1100); // 600 (attente) + 500 (durée anim CSS)
}

function handleSubmit() {
  if (gameLocked) {
    setFeedback("Partie déjà soumise. Lancez une nouvelle partie pour rejouer.");
    return;
  }

  // Vérifier que tout est répondu
  const unanswered = currentQuestions.filter(
    (_, idx) => !Object.prototype.hasOwnProperty.call(selections, idx)
  );
  if (unanswered.length) {
    setFeedback("Veuillez répondre à toutes les questions avant de soumettre.");
    return;
  }

  // 🔥 Nouveau calcul du score basé sur selections[]
  let score = 0;
  currentQuestions.forEach((q, i) => {
    if (selections[i] === q.answer) score++;
  });

  // Affichage du score
  resultsEl.classList.remove("hidden");
  scoreText.textContent = `Score : ${score} / ${currentQuestions.length}`;
  setFeedback("Réponses soumises. Cliquez sur « Voir les réponses » pour afficher les bonnes.");

  gameLocked = true;

  // Si score parfait → popup + confettis
  if (score === currentQuestions.length) {
    showWinPopup();
    fireEmojiConfetti();
  }

  setSubmitMode("restart");
}


function handleSubmitClick() {
  const mode = submitBtn?.dataset.mode || "submit";
  if (mode === "restart") {
    startNewGame();
    return;
  }
  handleSubmit();
}

function toggleAnswers() {
  if (!gameLocked) {
    setFeedback("Soumettez d'abord vos réponses.");
    return;
  }
  revealAnswers = !revealAnswers;
  document.querySelectorAll(".choice").forEach((btn) => {
    const isCorrect = btn.dataset.correct === "true";
    if (isCorrect && revealAnswers) {
      btn.classList.add("correct");
    } else if (!btn.classList.contains("incorrect")) {
      btn.classList.remove("correct");
    }
  });
  toggleAnswersBtn.textContent = revealAnswers ? "Masquer les réponses" : "Voir les réponses";
}

function typeLabel(type) {
  if (type === "image") return "Image";
  if (type === "audio") return "Audio";
  return "Texte";
}

function setFeedback(message) {
  if (feedbackEl) feedbackEl.textContent = message;
}

function applyTheme(mode) {
  const isDark = mode === "dark";
  document.body.classList.toggle("theme-dark", isDark);
  if (themeToggleBtn) {
    themeToggleBtn.textContent = isDark ? "☀️ Mode clair" : "🌙 Mode sombre";
    themeToggleBtn.setAttribute(
      "aria-label",
      isDark ? "Passer en mode clair" : "Passer en mode sombre"
    );
  }
}

function detectPreferredTheme() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function initTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  const mode = stored === "light" || stored === "dark" ? stored : detectPreferredTheme();
  applyTheme(mode);
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("theme-dark");
    const mode = isDark ? "dark" : "light";
    localStorage.setItem(THEME_KEY, mode);
    applyTheme(mode);
  });
}

submitBtn.addEventListener("click", handleSubmitClick);
toggleAnswersBtn.addEventListener("click", toggleAnswers);
if (newGameBtn) {
  newGameBtn.addEventListener("click", startNewGame);
}

if (popupCloseBtn) {
  popupCloseBtn.addEventListener("click", hideWinPopup);
}

if (popupEl) {
  popupEl.addEventListener("click", (event) => {
    if (event.target === popupEl) hideWinPopup();
  });
}

initTheme();
loadQuestions();

function showWinPopup() {
  if (!popupEl) return;
  const stampEl = document.getElementById("popup-timestamp");
  if (stampEl) {
    const now = new Date();
    stampEl.textContent = `Date et heure : ${now.toLocaleString("fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })}`;
  }
  popupEl.classList.remove("hidden");
}

function hideWinPopup() {
  if (!popupEl) return;
  popupEl.classList.add("hidden");
}

function fireEmojiConfetti() {
  if (!confettiContainer) return;
  const emojis = ["🍿", "✨", "🎬", "⭐", "🍿", "✨"];
  const amount = 28;
  for (let i = 0; i < amount; i += 1) {
    const span = document.createElement("span");
    span.className = "confetti";
    span.textContent = emojis[Math.floor(Math.random() * emojis.length)];

    const startX = Math.random() * 100;
    const startY = Math.random() * 15; // lancer depuis le haut
    const drift = (Math.random() - 0.5) * 240;
    const spin = 540 + Math.random() * 540; // 540 à 1080 deg
    const duration = 1.3 + Math.random() * 0.9; // 1.3s à 2.2s
    const size = 22 + Math.random() * 12;

    span.style.left = `${startX}vw`;
    span.style.top = `${startY}vh`;
    span.style.fontSize = `${size}px`;
    span.style.setProperty("--drift", `${drift}px`);
    span.style.setProperty("--spin", `${spin}deg`);
    span.style.setProperty("--duration", `${duration}s`);

    confettiContainer.appendChild(span);
    setTimeout(() => span.remove(), duration * 1000 + 200);
  }
}

// --- NOUVELLE FONCTION ---
// Génère des petites particules qui explosent depuis un bouton
function spawnParticles(targetButton) {
    // Couleurs possibles pour les particules (tes variables CSS)
    const colors = ['var(--color-primary)', 'var(--color-accent)', 'var(--color-accent-2)', 'var(--color-accent-3)'];

    // On crée 12 particules
    for (let i = 0; i < 12; i++) {
      const particle = document.createElement('span');
      particle.className = 'burst-particle';

      // Mathématiques pour une direction aléatoire :
      // Angle aléatoire autour du cercle (0 à 2*PI radians)
      const angle = Math.random() * Math.PI * 2;
      // Distance aléatoire entre 40px et 90px
      const distance = 40 + Math.random() * 50;

      // Calcul des coordonnées cibles (trigonométrie de base)
      const tx = Math.cos(angle) * distance + 'px';
      const ty = Math.sin(angle) * distance + 'px';

      // On injecte ces valeurs dans des variables CSS pour que l'animation les utilise
      particle.style.setProperty('--tx', tx);
      particle.style.setProperty('--ty', ty);
      // Couleur aléatoire parmi notre liste
      particle.style.setProperty('--p-color', colors[Math.floor(Math.random() * colors.length)]);

      // On ajoute la particule DANS le bouton cliqué
      targetButton.appendChild(particle);

      // Nettoyage : on supprime l'élément du DOM une fois l'animation finie
      setTimeout(() => {
        particle.remove();
      }, 700);
    }
}

function showCountdownCard() {
  setFeedback("Attention, grand suspens...");
  // 1. Création de la carte de décompte
  const card = document.createElement("article");
  card.className = "card countdown-card hidden-card"; // On commence caché pour le fade-in
  
  // Construction du contenu HTML interne (SVG + Textes)
  // Note : pathLength="1" permet de gérer l'animation de 0 à 1 en CSS sans calculer la longueur en pixels
  card.innerHTML = `
    <svg class="countdown-svg" width="100%" height="100%">
      <rect class="timer-rect" x="0" y="0" width="100%" height="100%" rx="14" ry="14" pathLength="1"></rect>
    </svg>
    <div class="countdown-content" style="position: relative; z-index: 1;">
      <p class="countdown-label">Résultat dans</p>
      <div id="countdown-timer" class="countdown-number">3</div>
    </div>
  `;

  quizContainer.appendChild(card);

  // 2. Animation d'entrée (Fade In comme les autres)
  // On force le reflow pour que l'animation se lance bien
  card.classList.remove("hidden-card");
  void card.offsetWidth;
  card.classList.add("card-fade-in");

// 3. Gestion du décompte (3, 2, 1...)
  let timeLeft = 3;
  const timerEl = card.querySelector("#countdown-timer");
  
  const interval = setInterval(() => {
    timeLeft--;
    if (timeLeft > 0) {
      timerEl.textContent = timeLeft;
    } else {
      clearInterval(interval);
      
      // --- CHANGEMENT ICI ---
      // Le temps est écoulé : on déclenche le remplissage du fond
      card.classList.add("card-filled");
      // ----------------------
      
      // Puis on affiche le score (le texte changera pendant la transition de couleur)
      showFinalScore(card);
    }
  }, 1000);
}

function showFinalScore(card) {
  let score = 0;
  currentQuestions.forEach((q, i) => {
    if (selections[i] === q.answer) score++;
  });

  const contentDiv = card.querySelector(".countdown-content");
  contentDiv.style.opacity = 0;
  contentDiv.style.transition = "opacity 0.3s ease";

  setTimeout(() => {
    // 1. Mise à jour du contenu de la carte
    contentDiv.innerHTML = `
      <div class="score-display">Score : ${score} / ${currentQuestions.length}</div>
      <p class="score-details">${getScoreMessage(score, currentQuestions.length)}</p>
    `;
    contentDiv.style.opacity = 1;

    // 2. Gestion des boutons dans la zone de feedback
    const feedbackEl = document.getElementById("feedback");
    feedbackEl.innerHTML = ""; // On nettoie
    
    // Bouton "Voir les réponses" (Style secondaire/outline)
    const btnAnswers = document.createElement("button");
    btnAnswers.textContent = "Voir les réponses";
    btnAnswers.className = "btn outline"; // 'outline' pour qu'il soit moins prioritaire visuellement
    btnAnswers.onclick = () => revealAllAnswers();

    // Bouton "Nouvelle partie" (Style primaire/fort)
    const btnRestart = document.createElement("button");
    btnRestart.textContent = "Nouvelle partie";
    btnRestart.className = "btn primary";
    btnRestart.onclick = () => showDifficultySelection();

    // Animation d'entrée pour les boutons
    btnAnswers.style.animation = "fadeIn 0.5s ease forwards";
    btnRestart.style.animation = "fadeIn 0.5s ease 0.1s forwards"; // Petit décalage sympa

    feedbackEl.appendChild(btnAnswers);
    feedbackEl.appendChild(btnRestart);

    if (score === currentQuestions.length) {
      fireEmojiConfetti();
      showWinPopup();
    }
  }, 300);
}

function getScoreMessage(score, total) {
  const ratio = score / total;
  if (ratio === 1) return "Incroyable ! Tu es un véritable expert ! 🎬";
  if (ratio >= 0.7) return "Beau travail ! Très belle culture ciné. 🍿";
  if (ratio >= 0.4) return "Pas mal, mais tu peux encore réviser tes classiques. 📺";
  return "Oups... Une petite séance de rattrapage s'impose ? 🎞️";
}

function revealAllAnswers() {
  quizContainer.innerHTML = "";
  
  // Définition des icônes SVG (Check et Croix)
  const iconCheck = `
    <svg class="answer-icon check" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6L9 17L4 12" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    
  const iconCross = `
    <svg class="answer-icon cross" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6L6 18M6 6L18 18" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  // On boucle sur toutes les questions pour créer les cartes de rapport
  currentQuestions.forEach((question, index) => {
    const userChoice = selections[index];
    const isCorrect = userChoice === question.answer;

    // Création de la carte
    const card = document.createElement("article");
    card.className = "result-card";

    // Titre de la question
    // Note : On retire le "Question X." pour aller à l'essentiel, ou on le garde selon ton goût
    let htmlContent = `<h3 class="result-question">${index + 1}. ${question.question}</h3>`;
    
    htmlContent += `<div class="result-answers-list">`;

    if (isCorrect) {
      // CAS 1 : C'était juste -> Une seule ligne verte avec le check
      htmlContent += `
        <div class="answer-row correct">
          ${iconCheck}
          <span>${userChoice}</span>
        </div>
      `;
    } else {
      // CAS 2 : C'était faux -> Une ligne rouge (choix utilisateur) + Une ligne verte (bonne réponse)
      htmlContent += `
        <div class="answer-row incorrect">
          ${iconCross}
          <span>${userChoice}</span>
        </div>
        <div class="answer-row correct">
          ${iconCheck}
          <span>${question.answer}</span>
        </div>
      `;
    }

    htmlContent += `</div>`; // Fin de la liste
    card.innerHTML = htmlContent;
    
    // On ajoute la carte au conteneur (avec un petit délai pour une animation cascade sympa si tu veux, sinon direct)
    quizContainer.appendChild(card);
  });

  // --- RECONSTRUCTION DE LA ZONE DE FEEDBACK (BOUTONS) ---
  const feedbackEl = document.getElementById("feedback");
  feedbackEl.innerHTML = ""; 

  const btnRestart = document.createElement("button");
  btnRestart.textContent = "Nouvelle partie";
  btnRestart.className = "btn primary";
  btnRestart.onclick = () => showDifficultySelection();
  
  feedbackEl.appendChild(btnRestart);
  
  // On remonte doucement vers le haut pour voir le début de la correction
  quizContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
