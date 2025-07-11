let selectedShop = null;
let selectedScanType = "qr";
let html5QrCode;
let translations = {};

// Funkce pro načtení překladů z JSON
async function loadTranslations(lang) {
  try {
    const response = await fetch(`./${lang}.json`);
    translations = await response.json();
    applyTranslations();
  } catch (error) {
    console.error(`Nepodařilo se načíst překlady pro jazyk ${lang}:`, error);
    alert(`Nepodařilo se načíst překlady pro jazyk ${lang}.`);
  }
}

// Funkce pro aplikaci překladů na DOM
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (translations[key]) {
      element.textContent = translations[key];
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    if (translations[key]) {
      element.placeholder = translations[key];
    }
  });
  document.title = translations['title'] || 'Moje Karty';
}

const themeToggle = document.getElementById("theme-toggle");
themeToggle.addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
});

const addCardBtn = document.getElementById("add-card-btn");
addCardBtn.addEventListener("click", () => {
  document.getElementById("shop-modal").classList.remove("hidden");
});

document.getElementById("modal-close").onclick = () => {
  document.getElementById("shop-modal").classList.add("hidden");
};

document.getElementById("scan-type-close").onclick = () => {
  document.getElementById("scan-type-modal").classList.add("hidden");
};

document.getElementById("scan-close").onclick = () => {
  stopScanner();
  document.getElementById("scan-modal").classList.add("hidden");
};

document.getElementById("display-close").onclick = () => {
  document.getElementById("display-modal").classList.add("hidden");
};

document.querySelectorAll(".shop-option").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedShop = btn.dataset.shop;
    document.getElementById("shop-modal").classList.add("hidden");
    document.getElementById("scan-type-modal").classList.remove("hidden");
  });
});

document.querySelectorAll(".scan-type-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedScanType = btn.dataset.type;
    document.getElementById("scan-type-modal").classList.add("hidden");
    document.getElementById("scan-modal").classList.remove("hidden");
    startScanner();
  });
});

document.getElementById("confirm-code").addEventListener("click", () => {
  const code = document.getElementById("manual-code").value.trim();
  if (code) {
    stopScanner();
    saveCard(selectedShop, code);
    document.getElementById("scan-modal").classList.add("hidden");
  }
});

function startScanner() {
  const qrDiv = document.getElementById("qr-reader");
  const barcodeDiv = document.getElementById("barcode-reader");
  qrDiv.innerHTML = "";
  barcodeDiv.innerHTML = "";

  if (selectedScanType === "qr") {
    qrDiv.style.display = "block";
    barcodeDiv.style.display = "none";

    html5QrCode = new Html5Qrcode("qr-reader");
    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      decodedText => {
        html5QrCode.stop().then(() => {
          saveCard(selectedShop, decodedText);
          document.getElementById("scan-modal").classList.add("hidden");
        });
      },
      error => {
        console.error("QR scan error:", error);
      }
    ).catch(err => {
      console.error("Failed to start QR scanner:", err);
      alert(translations['qr_scanner_error'] || "Nepodařilo se spustit skener QR kódů. Zkontroluj oprávnění kamery.");
    });
  } else {
    qrDiv.style.display = "none";
    barcodeDiv.style.display = "block";

    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: barcodeDiv,
        constraints: {
          facingMode: "environment" // Prefer rear camera
        }
      },
      locator: {
        patchSize: "medium",
        halfSample: true
      },
      decoder: {
        readers: ["ean_reader", "code_128_reader", "code_39_reader", "code_93_reader", "upc_reader", "upc_e_reader"]
      },
      locate: true
    }, err => {
      if (err) {
        console.error("Failed to initialize Quagga:", err);
        alert(translations['barcode_scanner_error'] || "Nepodařilo se spustit skener čárových kódů. Zkontroluj oprávnění kamery.");
        return;
      }
      Quagga.start();
      Quagga.onDetected(data => {
        const code = cleanCode(data.codeResult.code);
        Quagga.stop();
        saveCard(selectedShop, code);
        document.getElementById("scan-modal").classList.add("hidden");
      });
    });
  }
}

function stopScanner() {
  if (html5QrCode) {
    html5QrCode.stop().catch(() => {});
    html5QrCode = null;
  }
  if (Quagga && Quagga.isRunning) {
    Quagga.stop();
  }
}

function cleanCode(code) {
  return code.trim().replace(/0+$/, '');
}

document.getElementById("image-upload").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function () {
    Quagga.decodeSingle({
      decoder: {
        readers: ["ean_reader", "code_128_reader", "code_39_reader", "code_93_reader", "upc_reader", "upc_e_reader"]
      },
      locate: true,
      src: reader.result
    }, function (result) {
      if (result && result.codeResult) {
        const code = cleanCode(result.codeResult.code);
        stopScanner();
        document.getElementById("manual-code").value = code;
        document.getElementById("confirm-code").disabled = false;
      } else {
        alert(translations['barcode_not_recognized'] || "Čárový kód nebyl rozpoznán. Zkontroluj kvalitu obrázku a formát.");
        console.log("Quagga decode result:", result);
      }
    });
  };
  reader.readAsDataURL(file);
});

function saveCard(shop, code) {
  const cleanedCode = cleanCode(code);
  const cards = JSON.parse(localStorage.getItem("cards") || "[]");
  cards.push({ shop, code: cleanedCode, type: selectedScanType });
  localStorage.setItem("cards", JSON.stringify(cards));
  renderCards();
}

function deleteCard(index) {
  const cards = JSON.parse(localStorage.getItem("cards") || "[]");
  cards.splice(index, 1);
  localStorage.setItem("cards", JSON.stringify(cards));
  renderCards();
}

function renderCards() {
  const grid = document.getElementById("card-grid");
  grid.innerHTML = "";

  const cards = JSON.parse(localStorage.getItem("cards") || "[]");
  cards.forEach((card, index) => {
    const div = document.createElement("div");
    const bg = getCardColor(card.shop);
    const isDark = bg.includes("text-white");

    div.className = `relative ${bg} p-4 rounded-2xl aspect-[3/2] flex flex-col justify-center items-center text-center cursor-pointer shadow hover:shadow-lg transition ${isDark ? '' : 'text-black'}`;
    div.innerHTML = `
      <div class="text-4xl">${getIcon(card.shop)}</div>
      <div class="text-lg font-semibold mt-2">${card.shop}</div>
      <button class="absolute top-2 right-2 ${isDark ? 'text-white/70' : 'text-black/60'} hover:text-red-500">🗑</button>
    `;

    div.querySelector("button").onclick = (e) => {
      e.stopPropagation();
      deleteCard(index);
    };

    div.onclick = () => showBarcode(card.code);

    grid.appendChild(div);
  });

  const add = document.createElement("div");
  add.id = "add-card-btn";
  add.className = "flex items-center justify-center border-2 border-dashed rounded-2xl aspect-[3/2] cursor-pointer bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition";
  add.innerHTML = `<div class="text-4xl text-gray-400" data-i18n="add_card">${translations['add_card'] || '+'}</div>`;
  add.addEventListener("click", () => document.getElementById("shop-modal").classList.remove("hidden"));
  grid.appendChild(add);
}

function getIcon(shop) {
  switch (shop) {
    case "Lidl": return "🛒";
    case "Kaufland": return "🏪";
    case "Tesco": return "🧾";
    case "Albert": return "🛍";
    case "Billa": return "🛑";
    case "Penny": return "🛠";
    case "Biedronka": return "🐞";
    case "beYPc": return "⛽"; // Přidán beYPc
    default: return "📦";
  }
}

function getCardColor(shop) {
  switch (shop) {
    case "Lidl": return "bg-yellow-300 text-black";
    case "Kaufland": return "bg-red-500 text-white";
    case "Tesco": return "bg-blue-600 text-white";
    case "Albert": return "bg-teal-500 text-white";
    case "Billa": return "bg-yellow-500 text-black";
    case "Penny": return "bg-orange-600 text-white";
    case "Biedronka": return "bg-red-700 text-white";
    case "beYPc": return "bg-green-600 text-white"; // Přidán beYPc
    default: return "bg-gray-200 text-black";
  }
}

function showBarcode(code) {
  const cards = JSON.parse(localStorage.getItem("cards") || "[]");
  const card = cards.find(c => c.code === code);
  if (!card) return;

  const modal = document.getElementById("display-modal");
  const title = document.getElementById("display-title");
  const img = document.getElementById("display-code-img");
  const text = document.getElementById("display-code-text");

  title.textContent = card.shop;
  text.textContent = card.code;

  if (card.type === "qr") {
    img.src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(card.code)}&size=200x200`;
  } else {
    img.src = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(card.code)}&code=Code128&multiplebarcodes=false`;
  }

  modal.classList.remove("hidden");
}

// Inicializace jazyka při načtení stránky
document.addEventListener("DOMContentLoaded", () => {
  const savedLang = localStorage.getItem("preferredLanguage") || "cs";
  document.getElementById("lang-select").value = savedLang;
  loadTranslations(savedLang);
});

document.getElementById("lang-select").addEventListener("change", (e) => {
  const lang = e.target.value;
  localStorage.setItem("preferredLanguage", lang);
  loadTranslations(lang);
});

renderCards();