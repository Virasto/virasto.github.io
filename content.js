const API_URL = "https://virasto-server.onrender.com/spellcheck";
let bubble, activeSelection, currentResults = [], currentWordIndex = 0;
let isBubbleLocked = false;

// Normalize Persian punctuation
function normalizeText(text) {
    return text.replace(/\u200c|،|\./g, ' ');
}

// Create the suggestion bubble
function createSuggestionBubble() {
    if (bubble) return;

    bubble = document.createElement("div");
    bubble.id = "virasto-bubble";
    bubble.innerHTML = `
        <p id="virasto-status">برای بررسی کلیک کنید</p>
        <div id="virasto-suggestions"></div>
        <div id="virasto-actions">
            <button id="virasto-check">بررسی</button>
            <button id="virasto-close">بستن</button>
        </div>
    `;
    document.body.appendChild(bubble);

    // Make draggable
    let isDragging = false, offsetX, offsetY;
    bubble.addEventListener("mousedown", (e) => {
        if (e.target.tagName === "BUTTON") return;
        isDragging = true;
        offsetX = e.clientX - bubble.offsetLeft;
        offsetY = e.clientY - bubble.offsetTop;
    });
    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        let x = e.clientX - offsetX;
        let y = e.clientY - offsetY;
        x = Math.max(0, Math.min(window.innerWidth - bubble.offsetWidth, x));
        y = Math.max(0, Math.min(window.innerHeight - bubble.offsetHeight, y));
        bubble.style.left = x + "px";
        bubble.style.top = y + "px";
    });
    document.addEventListener("mouseup", () => isDragging = false);

    // Close button
    bubble.querySelector("#virasto-close").addEventListener("click", () => {
        bubble.remove();
        bubble = null;
        isBubbleLocked = false;
    });

    // بررسی button
    bubble.querySelector("#virasto-check").addEventListener("click", async () => {
        if (!activeSelection || activeSelection.toString().trim() === "") return;

        bubble.querySelector("#virasto-status").innerText = "در حال بررسی...";
        bubble.querySelector("#virasto-suggestions").innerHTML = "";

        const text = normalizeText(activeSelection.toString());
        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text })
            });
            currentResults = await res.json();
            currentWordIndex = 0;
            showSuggestions();
        } catch (e) {
            bubble.querySelector("#virasto-status").innerText = "خطا در ارتباط با سرور";
        }
    });
}

// Position bubble inside viewport
function positionBubble(x, y) {
    if (!bubble) return;
    const padding = 10;
    const maxLeft = window.innerWidth - bubble.offsetWidth - padding;
    const maxTop = window.innerHeight - bubble.offsetHeight - padding;
    bubble.style.left = Math.min(x, maxLeft) + "px";
    bubble.style.top = Math.min(y, maxTop) + "px";
}

// Show suggestions
function showSuggestions() {
    const suggestionArea = bubble.querySelector("#virasto-suggestions");
    suggestionArea.innerHTML = "";

    if (!currentResults || currentResults.length === 0) {
        bubble.querySelector("#virasto-status").innerText = "همه چیز درست است.";
        return;
    }

    const { word, suggestions } = currentResults[currentWordIndex];
    bubble.querySelector("#virasto-status").innerText = `پیشنهاد برای: "${word}"`;

    suggestions.forEach(s => {
        const btn = document.createElement("button");
        btn.className = "virasto-suggestion";
        btn.innerText = s;
        btn.addEventListener("click", () => applySuggestion(word, s));
        suggestionArea.appendChild(btn);
    });
}

// Replace incorrect word only
function applySuggestion(wrong, suggestion) {
    const sel = activeSelection;
    if (!sel || sel.rangeCount === 0) return;

    const originalText = sel.toString();
    const wordIndex = originalText.indexOf(wrong);
    if (wordIndex === -1) return;

    const updatedText =
        originalText.slice(0, wordIndex) +
        suggestion +
        originalText.slice(wordIndex + wrong.length);

    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(updatedText));

    // Update result list
    currentResults.splice(currentWordIndex, 1);
    if (currentResults.length === 0) {
        bubble.querySelector("#virasto-status").innerText = "همه چیز درست است.";
        bubble.querySelector("#virasto-suggestions").innerHTML = "";
    } else {
        showSuggestions();
    }
}

// Only trigger once per selection
document.addEventListener("mouseup", () => {
    if (isBubbleLocked || window.getSelection().toString().trim() === "") return;

    const selection = window.getSelection();
    if (!selection || selection.toString().trim() === "") return;

    activeSelection = selection;
    isBubbleLocked = true;

    createSuggestionBubble();
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    positionBubble(rect.left + window.scrollX, rect.top + window.scrollY - 40);
});
