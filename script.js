// 📦 Přepínání jazyka
const langSelect = document.getElementById('lang-select');
let currentLang = 'cs';
let translations = {};

document.addEventListener("DOMContentLoaded", () => {
  let savedLang = localStorage.getItem('lang');
  currentLang = savedLang || 'cs';
  langSelect.value = currentLang;
  loadLang(currentLang);
  loadCards();
});

function loadLang(lang) {
  fetch(`lang/${lang}.json`)
    .then(res => res.json())
    .then(data => {
      translations = data;
      setTimeout(applyTranslations, 0);
    });
}

function applyTranslations() {
  document.getElementById("title").textContent = translations.title || "Moje Karty";
  document.getElementById("add-card-label").textContent = translations.add_card || "+";
  document.getElementById("select-store-label").textContent = translations.select_store || "Vyber obchod";
}

langSelect.addEventListener('change', (e) => {
  localStorage.setItem('lang', e.target.value);
  location.reload();
});

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
document.getElementById("close-shop-modal")?.addEventListener("click", () => {
  modal.classList.add("hidden");
});
shopButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const shop = btn.dataset.shop;
    modal.classList.add('hidden');
    createNewCard(shop);
  });
});

// 🧾 Skener modal
const scannerModal = document.getElementById("scanner-modal");
const scannerElement = document.getElementById("scanner");
const closeScannerBtn = document.getElementById("close-scanner");
let html5QrCode;

function startScanner(cardId, shop, onScanComplete) {
  scannerModal.classList.remove("hidden");
  scannerElement.innerHTML = "";

  if (shop === "kaufland") {
    html5QrCode = new Html5Qrcode("scanner");
    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      (decodedText, decodedResult) => {
        html5QrCode.stop();
        scannerModal.classList.add("hidden");
        onScanComplete(decodedText);
        saveBarcode(cardId, decodedText);
      },
      (err) => {}
    );
  } else {
    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: scannerElement
      },
      decoder: {
        readers: ["ean_reader", "ean_13_reader", "code_128_reader"]
      }
    }, function (err) {
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
      onScanComplete(code);
      saveBarcode(cardId, code);
    });
  }
}

closeScannerBtn.addEventListener("click", () => {
  Quagga.stop && Quagga.stop();
  html5QrCode && html5QrCode.stop();
  scannerModal.classList.add("hidden");
});

// 💾 Ukládání a vykreslování
function renderCard(card) {
  const grid = document.getElementById('card-grid');
  const cardDiv = document.createElement('div');
  cardDiv.className = `relative border rounded-2xl aspect-[3/2] p-4 shadow flex flex-col justify-between text-white ${card.shop === 'kaufland' ? 'bg-red-700' : card.shop === 'lidl' ? 'bg-blue-700' : card.shop === 'tesco' ? 'bg-green-700' : 'bg-gray-700'}`;
  cardDiv.dataset.id = card.id;

  cardDiv.innerHTML = `
    <div class="text-lg font-bold capitalize">${card.shop}</div>
    <div class="barcode-text text-sm mb-2 break-words">${card.barcode || "(žádný kód)"}</div>
    <button class="scan-btn bg-white/20 px-4 py-2 rounded mt-auto">📷 Skenovat</button>
    <button class="manual-btn text-xs mt-1 underline">✍️ Zadat ručně</button>
    <button class="delete-btn text-xs mt-2 text-red-200 underline">🗑️ Smazat</button>
  `;

  cardDiv.querySelector(".scan-btn").addEventListener("click", () => {
    startScanner(card.id, card.shop, (code) => {
      cardDiv.querySelector(".barcode-text").textContent = code;
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

function createNewCard(shop) {
  const cards = JSON.parse(localStorage.getItem("cards") || "[]");
  const existing = cards.find(c => c.shop === shop);
  if (existing) return; // zabrání duplikaci

  const card = { id: Date.now().toString(), shop, barcode: "" };
  saveNewCard(card);
  renderCard(card);
}

function saveNewCard(card) {
  let cards = JSON.parse(localStorage.getItem("cards") || "[]");
  cards.push(card);
  localStorage.setItem("cards", JSON.stringify(cards));
}

function saveBarcode(cardId, barcode) {
  let cards = JSON.parse(localStorage.getItem("cards") || "[]");
  cards = cards.map(c => c.id === cardId ? { ...c, barcode } : c);
  localStorage.setItem("cards", JSON.stringify(cards));
}

function deleteCard(cardId) {
  let cards = JSON.parse(localStorage.getItem("cards") || "[]");
  cards = cards.filter(c => c.id !== cardId);
  localStorage.setItem("cards", JSON.stringify(cards));
}

function loadCards() {
  const cards = JSON.parse(localStorage.getItem("cards") || "[]");
  cards.forEach(card => renderCard(card));
}
