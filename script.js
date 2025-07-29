const RAILWAY_API_URL = "https://virasto-server.onrender.com/spellcheck";
const userInput = document.getElementById("userInput");
const submitBtn = document.getElementById("submitBtn");
const correctionArea = document.getElementById("correction-area");

let spellcheckResults = [];
let currentWordIndex = 0;
let currentText = "";

// Highlight container
let highlightContainer;
if (!document.getElementById("highlightContainer")) {
  highlightContainer = document.createElement("div");
  highlightContainer.id = "highlightContainer";
  highlightContainer.style.marginTop = "10px";
  correctionArea.parentNode.insertBefore(highlightContainer, correctionArea);
} else {
  highlightContainer = document.getElementById("highlightContainer");
}

// Auto-load selected text
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get("selectedText", async (data) => {
    if (data.selectedText) {
      userInput.value = data.selectedText;
      currentText = data.selectedText;
      spellcheckResults = await checkSpelling(currentText);
      highlightMistakes();
      updateSuggestions();
    }
  });
});

submitBtn.addEventListener("click", async () => {
  currentText = userInput.value;
  correctionArea.innerHTML = "در حال بررسی...";
  currentWordIndex = 0;
  spellcheckResults = await checkSpelling(currentText);
  highlightMistakes();
  updateSuggestions();
});

async function checkSpelling(text) {
  try {
    const resp = await fetch(RAILWAY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    if (!resp.ok) throw new Error("API error");
    return await resp.json();
  } catch (err) {
    correctionArea.innerHTML = "خطا در ارتباط با سرور.";
    return [];
  }
}

function highlightMistakes() {
  let highlightedText = currentText;

  if (!spellcheckResults || spellcheckResults.length === 0) {
    highlightContainer.innerHTML = "";
    return;
  }

  spellcheckResults.forEach(({ word }) => {
    const escapedWord = escapeRegExp(word);
    const regex = new RegExp(escapedWord, 'g');
    highlightedText = highlightedText.replace(regex, `<span class="highlight-mistake">${word}</span>`);
  });

  highlightContainer.innerHTML = highlightedText;
}

function updateSuggestions() {
  correctionArea.innerHTML = "";
  if (!spellcheckResults || spellcheckResults.length === 0) {
    correctionArea.innerHTML = '<p class="all-correct">همه‌چیز درست است!</p>';
    highlightContainer.innerHTML = "";
    return;
  }

  if (currentWordIndex >= spellcheckResults.length) currentWordIndex = 0;
  const wrongWordObj = spellcheckResults[currentWordIndex];
  if (!wrongWordObj) return;

  const { word, suggestions } = wrongWordObj;
  const info = document.createElement("p");
  info.textContent = `اصلاح برای: "${word}"`;
  correctionArea.appendChild(info);

  suggestions.forEach(suggestion => {
    const btn = document.createElement("button");
    btn.textContent = suggestion;
    btn.className = "suggestion-btn";
    btn.onclick = () => applyCorrection(word, suggestion);
    correctionArea.appendChild(btn);
  });
}

function applyCorrection(wrongWord, chosenSuggestion) {
  const regex = new RegExp(escapeRegExp(wrongWord));
  currentText = currentText.replace(regex, chosenSuggestion);
  userInput.value = currentText;

  spellcheckResults.splice(currentWordIndex, 1);

  if (spellcheckResults.length > 0) {
    checkSpelling(currentText).then(results => {
      spellcheckResults = results;
      currentWordIndex = 0;
      highlightMistakes();
      updateSuggestions();
    });
  } else {
    highlightMistakes();
    updateSuggestions();
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}