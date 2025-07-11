let selectedShop = null;
let selectedScanType = "qr";
let selectedBarcodeType = "ean"; // Výchozí typ čárového kódu (EAN-13)
let html5QrCode;
let translations = {};

// Load translations from JSON
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

// Apply translations to DOM
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (translations[key]) element.textContent = translations[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    if (translations[key]) element.placeholder = translations[key];
  });
  document.title = translations['title'] || 'Moje Karty';
}

// Update scanner display based on type
function updateScannerDisplay() {
  const qrDiv = document.getElementById("qr-scanner");
  const barcodeDiv = document.getElementById("barcode-scanner");
  qrDiv.style.display = selectedScanType === "qr" ? "block" : "none";
  barcodeDiv.style.display = selectedScanType === "barcode" ? "block" : "none";
  qrDiv.classList.toggle("active-scanner", selectedScanType === "qr");
  barcodeDiv.classList.toggle("active-scanner", selectedScanType === "barcode");
}

// Event listeners
document.getElementById("theme-toggle").addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
});

document.getElementById("add-card-btn").addEventListener("click", () => {
  document.getElementById("shop-modal").classList.remove("hidden");
});

document.getElementById("modal-close").addEventListener("click", () => {
  document.getElementById("shop-modal").classList.add("hidden");
});

document.getElementById("scan-type-close").addEventListener("click", () => {
  document.getElementById("scan-type-modal").classList.add("hidden");
});

document.getElementById("barcode-type-close").addEventListener("click", () => {
  document.getElementById("barcode-type-modal").classList.add("hidden");
});

document.getElementById("scan-close").addEventListener("click", () => {
  stopScanner();
  document.getElementById("scan-modal").classList.add("hidden");
});

document.getElementById("display-close").addEventListener("click", () => {
  document.getElementById("display-modal").classList.add("hidden");
});

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
    if (selectedScanType === "barcode") {
      document.getElementById("scan-type-modal").classList.add("hidden");
      document.getElementById("barcode-type-modal").classList.remove("hidden");
    } else {
      document.getElementById("scan-type-modal").classList.add("hidden");
      document.getElementById("scan-modal").classList.remove("hidden");
      updateScannerDisplay();
      startScanner();
    }
  });
});

document.querySelectorAll(".barcode-type-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedBarcodeType = btn.dataset.type;
    document.getElementById("barcode-type-modal").classList.add("hidden");
    document.getElementById("scan-modal").classList.remove("hidden");
    updateScannerDisplay();
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

// Start scanner based on type
function startScanner() {
  const qrDiv = document.getElementById("qr-scanner");
  const barcodeDiv = document.getElementById("barcode-scanner");
  qrDiv.innerHTML = "";
  barcodeDiv.innerHTML = "";

  if (selectedScanType === "qr") {
    html5QrCode = new Html5Qrcode("qr-scanner");
    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10 },
      decodedText => {
        if (decodedText) {
          html5QrCode.stop().then(() => {
            saveCard(selectedShop, decodedText);
            document.getElementById("scan-modal").classList.add("hidden");
          }).catch(err => console.error("Stop QR scanner error:", err));
        }
      },
      error => console.error("QR scan error:", error)
    ).catch(err => {
      console.error("Failed to start QR scanner:", err);
      alert(translations['qr_scanner_error'] || "Nepodařilo se spustit skener QR kódů.");
    });
  } else {
    const barcodeDiv = document.getElementById("barcode-scanner");
    let readers = [];
    switch (selectedBarcodeType) {
      case "ean":
        readers = ["ean_reader"];
        break;
      case "code_128":
        readers = ["code_128_reader"];
        break;
      default:
        readers = ["ean_reader", "code_128_reader"]; // Fallback na oba podporované typy
        break;
    }

    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: barcodeDiv,
        constraints: {
          facingMode: { exact: "environment" },
          width: { min: 320 },
          height: { min: 240 }
        },
        singleChannel: false
      },
      locator: {
        patchSize: "medium",
        halfSample: true
      },
      decoder: {
        readers: readers
      },
      locate: true
    }, err => {
      if (err) {
        console.error("Chyba inicializace Quagga:", err);
        alert(translations['barcode_scanner_error'] || "Nepodařilo se spustit skener čárových kódů. Zkontroluj oprávnění kamery a konzoli.");
        return;
      }
      console.log("Quagga inicializováno, spouštím stream s čtečkami:", readers);
      Quagga.start();
      Quagga.onDetected(data => {
        if (data && data.codeResult && data.codeResult.code) {
          const code = cleanCode(data.codeResult.code);
          console.log("Původní kód:", data.codeResult.code, "Vyčištěný kód:", code);
          if (code.length > 6) {
            Quagga.stop();
            saveCard(selectedShop, code);
            document.getElementById("scan-modal").classList.add("hidden");
          }
        } else {
          console.warn("Neplatná detekce čárového kódu:", data);
        }
      });
    }).catch(err => {
      console.error("Chyba při spuštění Quagga:", err);
      alert("Chyba při spuštění čtečky čárových kódů. Zkuste obnovit stránku a zkontroluj konzoli.");
    });
  }
}

// Stop scanners
function stopScanner() {
  if (html5QrCode) {
    html5QrCode.stop().catch(() => {});
    html5QrCode = null;
  }
  if (Quagga && Quagga.isRunning) {
    Quagga.stop();
  }
}

// Clean code without removing trailing zeros for valid barcodes
function cleanCode(code) {
  const trimmedCode = code.trim();
  if (/^\d{12,13}$/.test(trimmedCode)) {
    return trimmedCode;
  }
  return trimmedCode.replace(/0+$/, '');
}

// Handle image upload
document.getElementById("image-upload").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function () {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (selectedScanType === "qr") {
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          stopScanner();
          document.getElementById("manual-code").value = code.data;
          document.getElementById("confirm-code").disabled = false;
        } else {
          alert(translations['qr_not_recognized'] || "QR kód nebyl rozpoznán.");
          document.getElementById("confirm-code").disabled = true;
        }
      } else {
        let readers = [];
        switch (selectedBarcodeType) {
          case "ean":
            readers = ["ean_reader"];
            break;
          case "code_128":
            readers = ["code_128_reader"];
            break;
          default:
            readers = ["ean_reader", "code_128_reader"];
            break;
        }
        Quagga.decodeSingle({
          src: reader.result,
          numOfWorkers: 0,
          decoder: {
            readers: readers
          },
          locate: true
        }, function (result) {
          if (result && result.codeResult && result.codeResult.code) {
            const code = cleanCode(result.codeResult.code);
            console.log("Původní kód z obrázku:", result.codeResult.code, "Vyčištěný kód:", code);
            stopScanner();
            document.getElementById("manual-code").value = code;
            document.getElementById("confirm-code").disabled = false;
          } else {
            alert(translations['barcode_not_recognized'] || "Čárový kód nebyl rozpoznán.");
            document.getElementById("confirm-code").disabled = true;
          }
        });
      }
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// Save card to localStorage
function saveCard(shop, code) {
  const cleanedCode = cleanCode(code);
  const cards = JSON.parse(localStorage.getItem("cards") || "[]");
  cards.push({ shop, code: cleanedCode, type: selectedScanType });
  localStorage.setItem("cards", JSON.stringify(cards));
  renderCards();
}

// Delete card
function deleteCard(index) {
  const cards = JSON.parse(localStorage.getItem("cards") || "[]");
  cards.splice(index, 1);
  localStorage.setItem("cards", JSON.stringify(cards));
  renderCards();
}

// Render cards
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

// Get shop icon
function getIcon(shop) {
  switch (shop) {
    case "Lidl": return "🛒";
    case "Kaufland": return "🏪";
    case "Tesco": return "🧾";
    case "Albert": return "🛍";
    case "Billa": return "🛑";
    case "Penny": return "🛠";
    case "Biedronka": return "🐞";
    case "beYPc": return "⛽";
    case "Mountfield": return "🌱";
    case "Metro": return "🏬";
    case "Coop Jednota": return "🏠";
    case "Dr Max Club": return "💊";
    default: return "📦";
  }
}

// Get card color
function getCardColor(shop) {
  switch (shop) {
    case "Lidl": return "bg-yellow-300 text-black";
    case "Kaufland": return "bg-red-500 text-white";
    case "Tesco": return "bg-blue-600 text-white";
    case "Albert": return "bg-teal-500 text-white";
    case "Billa": return "bg-yellow-500 text-black";
    case "Penny": return "bg-orange-600 text-white";
    case "Biedronka": return "bg-red-700 text-white";
    case "beYPc": return "bg-green-600 text-white";
    case "Mountfield": return "bg-green-400 text-white";
    case "Metro": return "bg-gray-700 text-white";
    case "Coop Jednota": return "bg-blue-400 text-white";
    case "Dr Max Club": return "bg-purple-500 text-white";
    default: return "bg-gray-200 text-black";
  }
}

// Show barcode or QR code
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
  img.src = card.type === "qr" 
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(card.code)}&size=200x200`
    : `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(card.code)}&code=${selectedBarcodeType === "code_128" ? "Code128" : "EAN13"}`;
  modal.classList.remove("hidden");
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  const savedLang = localStorage.getItem("preferredLanguage") || "cs";
  document.getElementById("lang-select").value = savedLang;
  loadTranslations(savedLang);
  renderCards();
});

document.getElementById("lang-select").addEventListener("change", (e) => {
  const lang = e.target.value;
  localStorage.setItem("preferredLanguage", lang);
  loadTranslations(lang);
});