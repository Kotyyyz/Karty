let selectedShop = null;
let selectedScanType = "qr";
let html5QrCode;

// Přepínač tématu
const themeToggle = document.getElementById("theme-toggle");
themeToggle.addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
});

// Přidání karty
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
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (decodedText) => {
      html5QrCode.stop().then(() => {
        saveCard(selectedShop, decodedText);
        document.getElementById("scan-modal").classList.add("hidden");
      });
    });
  } else {
    qrDiv.style.display = "none";
    barcodeDiv.style.display = "block";
    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: barcodeDiv,
      },
      decoder: {
        readers: ["ean_reader", "code_128_reader"]
      }
    }, function (err) {
      if (!err) {
        Quagga.start();
        Quagga.onDetected(data => {
          const code = data.codeResult.code;
          Quagga.stop();
          saveCard(selectedShop, code);
          document.getElementById("scan-modal").classList.add("hidden");
        });
      }
    });
  }
}

function stopScanner() {
  if (html5QrCode) html5QrCode.stop().catch(() => {});
  if (Quagga) Quagga.stop();
}

function saveCard(shop, code) {
  const cards = JSON.parse(localStorage.getItem("cards") || "[]");
  cards.push({ shop, code });
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
  add.innerHTML = `<div class="text-4xl text-gray-400">+</div>`;
  add.addEventListener("click", () => document.getElementById("shop-modal").classList.remove("hidden"));
  grid.appendChild(add);
}

function getIcon(shop) {
  switch (shop) {
    case "Lidl": return "🛒";
    case "Kaufland": return "🏪";
    case "Tesco": return "🧾";
    default: return "📦";
  }
}

function getCardColor(shop) {
  switch (shop) {
    case "Lidl": return "bg-yellow-300 text-black";
    case "Kaufland": return "bg-red-500 text-white";
    case "Tesco": return "bg-blue-600 text-white";
    default: return "bg-gray-200 text-black";
  }
}

function showBarcode(code) {
  const win = window.open("", "barcode", "width=400,height=400");
  win.document.write(`
    <html><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;">
      <div style="text-align:center;">
        <p style="font-size: 1.2em; margin-bottom: 1em;">${code}</p>
        <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(code)}&size=200x200" alt="QR Code" />
      </div>
    </body></html>
  `);
  win.document.close();
}

renderCards();
