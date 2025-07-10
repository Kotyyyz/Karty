// 📦 Přepínání jazyka
const langSelect = document.getElementById('lang-select');
let currentLang = 'cs';
let translations = {};

// Načti jazyk z localStorage (pokud je), jinak cs
let savedLang = localStorage.getItem('lang');
currentLang = savedLang || 'cs';
langSelect.value = currentLang;

function loadLang(lang) {
  fetch(`lang/${lang}.json`)
    .then(res => res.json())
    .then(data => {
      translations = data;
      applyTranslations();
    });
}

function applyTranslations() {
  document.getElementById("title").textContent = translations.title || "Moje Karty";
  document.getElementById("add-card-label").textContent = translations.add_card || "+";
  document.getElementById("select-store-label").textContent = translations.select_store || "Vyber obchod";
}

langSelect.addEventListener('change', (e) => {
  const newLang = e.target.value;
  localStorage.setItem('lang', newLang);
  location.reload();  // refresh pro aplikaci nového jazyka
});

loadLang(currentLang);

// 🌙 Přepínání tématu
const themeToggle = document.getElementById('theme-toggle');
if (localStorage.getItem('theme') === 'dark') {
  document.documentElement.classList.add('dark');
}
themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// ➕ Přidání karty
const modal = document.getElementById('shop-modal');
const shopButtons = document.querySelectorAll('.shop-btn');

document.getElementById('add-card-btn').addEventListener('click', () => {
  modal.classList.remove('hidden');
});

shopButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const shop = btn.dataset.shop;
    modal.classList.add('hidden');
    createNewCard(shop);
  });
});

// 📸 Skener
const scannerModal = document.getElementById("scanner-modal");
const scannerElement = document.getElementById("scanner");
const closeScannerBtn = document.getElementById("close-scanner");

function startScanner(cardId, updateBarcodeText) {
  scannerModal.classList.remove("hidden");

  Quagga.init({
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: scannerElement
    },
    decoder: {
      readers: ["ean_reader", "ean_13_reader", "code_128_reader"]
    }
  }, function(err) {
    if (err) {
      console.error(err);
      return;
    }
    Quagga.start();
  });

  Quagga.onDetected(data => {
    const code = data.codeResult.code;
    Quagga.stop();
    scannerModal.classList.add("hidden");
    updateBarcodeText(code);
    saveBarcode(cardId, code);
  });
}

closeScannerBtn.addEventListener("click", () => {
  Quagga.stop();
  scannerModal.classList.add("hidden");
});

// 💾 Ukládání a vykreslování karet

// Vykreslí kartu bez ukládání (pro načítání z localStorage)
function renderCard(card) {
  const grid = document.getElementById('card-grid');

  const cardDiv = document.createElement('div');
  cardDiv.className = "relative border rounded-2xl aspect-[3/2] bg-white dark:bg-gray-700 p-4 shadow flex flex-col justify-between";
  cardDiv.dataset.id = card.id;

  cardDiv.innerHTML = `
    <div class="text-lg font-bold capitalize">${card.shop}</div>
    <div class="barcode-text text-sm mb-2">${card.barcode || "(žádný kód)"}</div>
    <button class="scan-btn bg-gray-200 dark:bg-gray-600 px-4 py-2 rounded mt-auto" data-shop="${card.shop}">📷 Skenovat</button>
    <button class="manual-btn text-xs mt-1 underline">✍️ Zadat ručně</button>
    <button class="delete-btn text-xs mt-2 text-red-600 underline">🗑️ Smazat</button>
  `;

  cardDiv.querySelector(".scan-btn").addEventListener("click", () => {
    startScanner(card.id, (code) => {
      cardDiv.querySelector(".barcode-text").textContent = code;
      saveBarcode(card.id, code);
    });
  });

  cardDiv.querySelector(".manual-btn").addEventListener("click", () => {
    const manual = prompt("Zadej číslo kódu:");
    if (manual) {
      cardDiv.querySelector(".barcode-text").textContent = manual;
      saveBarcode(card.id, manual);
    }
  });

  cardDiv.querySelector(".delete-btn").addEventListener("click", () => {
    if (confirm("Opravdu chceš kartu smazat?")) {
      deleteCard(card.id);
      cardDiv.remove();
    }
  });

  grid.appendChild(cardDiv);
}

// Vytvoří novou kartu, uloží ji a vykreslí
function createNewCard(shop) {
  const card = { id: Date.now().toString(), shop, barcode: "" };
  saveNewCard(card);
  renderCard(card);
}

// Uloží novou kartu do localStorage
function saveNewCard(card) {
  let cards = JSON.parse(localStorage.getItem("cards") || "[]");
  cards.push(card);
  localStorage.setItem("cards", JSON.stringify(cards));
}

// Aktualizuje barcode konkrétní karty podle ID
function saveBarcode(cardId, barcode) {
  let cards = JSON.parse(localStorage.getItem("cards") || "[]");
  cards = cards.map(c => c.id === cardId ? {...c, barcode} : c);
  localStorage.setItem("cards", JSON.stringify(cards));
}

// Smaže kartu z localStorage podle ID
function deleteCard(cardId) {
  let cards = JSON.parse(localStorage.getItem("cards") || "[]");
  cards = cards.filter(c => c.id !== cardId);
  localStorage.setItem("cards", JSON.stringify(cards));
}

// Načte všechny uložené karty a vykreslí je
function loadCards() {
  const cards = JSON.parse(localStorage.getItem("cards") || "[]");
  cards.forEach(card => renderCard(card));
}

loadCards();
