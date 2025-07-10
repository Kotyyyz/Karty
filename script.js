let selectedShop = null;

// Jazyk přepínač (placeholder)
document.getElementById("lang-select").addEventListener("change", () => {
  // později doplníme
});

// Téma přepínání
document.getElementById("theme-toggle").addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
});

// Otevřít výběr obchodu
document.getElementById("add-card-btn").addEventListener("click", () => {
  document.getElementById("shop-modal").classList.remove("hidden");
});

// Zavřít výběr obchodu
document.getElementById("modal-close").addEventListener("click", () => {
  document.getElementById("shop-modal").classList.add("hidden");
});

// Zavřít scan modal
document.getElementById("scan-close").addEventListener("click", () => {
  document.getElementById("scan-modal").classList.add("hidden");
  stopScanner();
});

// Výběr obchodu
document.querySelectorAll(".shop-option").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedShop = btn.dataset.shop;
    document.getElementById("shop-modal").classList.add("hidden");
    document.getElementById("scan-modal").classList.remove("hidden");
    startScanner();
  });
});

// QR/Barcode scanner
let html5QrCode;
function startScanner() {
  html5QrCode = new Html5Qrcode("qr-reader");
  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    (decodedText) => {
      html5QrCode.stop().then(() => {
        saveCard(selectedShop, decodedText);
        document.getElementById("scan-modal").classList.add("hidden");
      });
    },
    (error) => { /* ignorujeme chyby */ }
  );
}

function stopScanner() {
  if (html5QrCode) {
    html5QrCode.stop().then(() => html5QrCode.clear()).catch(() => {});
  }
}

// Ruční zadání
document.getElementById("confirm-code").addEventListener("click", () => {
  const code = document.getElementById("manual-code").value.trim();
  if (code !== "") {
    stopScanner();
    saveCard(selectedShop, code);
    document.getElementById("scan-modal").classList.add("hidden");
  }
});

// Uložení karty
function saveCard(shop, code) {
  const cards = JSON.parse(localStorage.getItem("cards") || "[]");
  cards.push({ shop, code });
  localStorage.setItem("cards", JSON.stringify(cards));
  renderCards();
}

// Ikona obchodu
function getIcon(shop) {
  switch (shop) {
    case "Lidl": return "🛒";
    case "Kaufland": return "🏪";
    case "Tesco": return "🧾";
    default: return "📦";
  }
}

// Barva pozadí podle obchodu
function getCardColor(shop) {
  switch (shop) {
    case "Lidl": return "bg-yellow-300";
    case "Kaufland": return "bg-red-500 text-white";
    case "Tesco": return "bg-blue-600 text-white";
    default: return "bg-gray-200";
  }
}

// Vykreslení karet
function renderCards() {
  const grid = document.getElementById("card-grid");
  grid.innerHTML = '';

  const cards = JSON.parse(localStorage.getItem("cards") || "[]");

  cards.forEach((card, index) => {
    const isDarkText = card.shop === "Lidl";
    const cardColor = getCardColor(card.shop);

    const div = document.createElement("div");
    div.className = `relative ${cardColor} p-4 rounded-2xl aspect-[3/2] flex flex-col justify-center items-center text-center cursor-pointer shadow hover:shadow-lg transition ${isDarkText ? 'text-black' : 'text-white'}`;

    const icon = document.createElement("div");
    icon.className = "text-4xl pointer-events-none";
    icon.textContent = getIcon(card.shop);

    const title = document.createElement("div");
    title.className = "text-lg font-semibold mt-2 pointer-events-none";
    title.textContent = card.shop;

    const del = document.createElement("button");
    del.className = `absolute top-2 right-2 font-bold ${isDarkText ? 'text-black/60' : 'text-white/70'} hover:text-red-500`;
    del.textContent = "🗑";
    del.onclick = (e) => {
      e.stopPropagation();
      deleteCard(index);
    };

    div.onclick = () => showBarcode(card.code);

    div.appendChild(icon);
    div.appendChild(title);
    div.appendChild(del);
    grid.appendChild(div);
  });

  // Přidat tlačítko
  const addBtn = document.createElement("div");
  addBtn.id = "add-card-btn";
  addBtn.className = "flex items-center justify-center border-2 border-dashed rounded-2xl aspect-[3/2] cursor-pointer bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition";
  addBtn.innerHTML = `<div class="text-4xl text-gray-400">+</div>`;
  addBtn.addEventListener("click", () => {
    document.getElementById("shop-modal").classList.remove("hidden");
  });
  grid.appendChild(addBtn);
}

// Smazání karty
function deleteCard(index) {
  const cards = JSON.parse(localStorage.getItem("cards") || "[]");
  cards.splice(index, 1);
  localStorage.setItem("cards", JSON.stringify(cards));
  renderCards();
}

// Zobrazení kódu
function showBarcode(code) {
  const win = window.open("", "barcode", "width=400,height=400");
  win.document.write(`
    <html>
      <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;">
        <div style="text-align:center;">
          <p style="font-size: 1.2em; margin-bottom: 1em;">${code}</p>
          <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(code)}&size=200x200" alt="QR Code" />
        </div>
      </body>
    </html>`);
  win.document.close();
}

// Načti karty
renderCards();
