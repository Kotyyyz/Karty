let selectedShop = null;

// Jazyk přepínač
document.getElementById("lang-select").addEventListener("change", () => {
  // Budoucí lokalizace
});

// Tmavý/světlý režim
document.getElementById("theme-toggle").addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
});

// Otevřít výběr obchodu
document.getElementById("add-card-btn").addEventListener("click", () => {
  document.getElementById("shop-modal").classList.remove("hidden");
});

// Zavřít modaly
document.getElementById("modal-close").addEventListener("click", () => {
  document.getElementById("shop-modal").classList.add("hidden");
});
document.getElementById("scan-close").addEventListener("click", () => {
  document.getElementById("scan-modal").classList.add("hidden");
  stopScanner();
});
document.getElementById("display-close").addEventListener("click", () => {
  document.getElementById("display-modal").classList.add("hidden");
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
      html5QrCode.stop();
      saveCard(selectedShop, decodedText);
      document.getElementById("scan-modal").classList.add("hidden");
    },
    (error) => {}
  );
}
function stopScanner() {
  if (html5QrCode) {
    html5QrCode.stop().then(() => html5QrCode.clear());
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

// Uložení a vykreslení
function saveCard(shop, code) {
  const cards = JSON.parse(localStorage.getItem("cards") || "[]");
  cards.push({ shop, code });
  localStorage.setItem("cards", JSON.stringify(cards));
  renderCards();
}

// Barva dle obchodu
function getCardColor(shop) {
  switch (shop) {
    case "Lidl": return "bg-yellow-300 dark:bg-yellow-500";
    case "Kaufland": return "bg-red-500 dark:bg-red-600";
    case "Tesco": return "bg-blue-500 dark:bg-blue-600";
    default: return "bg-gray-200 dark:bg-gray-700";
  }
}

// Ikona pro obchod
function getIcon(shop) {
  switch (shop) {
    case "Lidl": return "🛒";
    case "Kaufland": return "🏪";
    case "Tesco": return "🧾";
    default: return "📦";
  }
}

// Vykresli karty
function renderCards() {
  const grid = document.getElementById("card-grid");
  grid.innerHTML = "";

  const cards = JSON.parse(localStorage.getItem("cards") || "[]");

  cards.forEach((card, index) => {
    const div = document.createElement("div");
    div.className = `relative ${getCardColor(card.shop)} p-4 rounded-2xl aspect-[3/2] flex flex-col justify-center items-center text-center cursor-pointer shadow hover:shadow-lg transition`;

    const icon = document.createElement("div");
    icon.className = "text-4xl";
    icon.textContent = getIcon(card.shop);

    const title = document.createElement("div");
    title.className = "text-lg font-semibold mt-2";
    title.textContent = card.shop;

    const del = document.createElement("button");
    del.className = "absolute top-2 right-2 text-gray-700 dark:text-white hover:text-red-500 font-bold";
    del.textContent = "🗑";
    del.onclick = (e) => {
      e.stopPropagation();
      deleteCard(index);
    };

    div.onclick = () => showBarcode(card.code, card.shop);

    div.appendChild(icon);
    div.appendChild(title);
    div.appendChild(del);
    grid.appendChild(div);
  });

  // Plus tlačítko
  const addBtn = document.createElement("div");
  addBtn.id = "add-card-btn";
  addBtn.className = "flex items-center justify-center border-2 border-dashed rounded-2xl aspect-[3/2] cursor-pointer bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition";
  addBtn.innerHTML = `<div class="text-4xl text-gray-400">+</div>`;
  addBtn.addEventListener("click", () => {
    document.getElementById("shop-modal").classList.remove("hidden");
  });
  grid.appendChild(addBtn);
}

// Odstranění karty
function deleteCard(index) {
  const cards = JSON.parse(localStorage.getItem("cards") || "[]");
  cards.splice(index, 1);
  localStorage.setItem("cards", JSON.stringify(cards));
  renderCards();
}

// Zobrazení kódu
function showBarcode(code, shop) {
  const modal = document.getElementById("display-modal");
  const img = document.getElementById("display-code-img");
  const text = document.getElementById("display-code-text");
  const title = document.getElementById("display-title");

  const isNumeric = /^[0-9]{8,20}$/.test(code);
  const imageUrl = isNumeric
    ? `https://barcodeapi.org/api/code128/${encodeURIComponent(code)}`
    : `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(code)}&size=200x200`;

  img.src = imageUrl;
  text.textContent = code;
  title.textContent = shop;

  modal.classList.remove("hidden");
}

// Start
renderCards();
