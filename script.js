let selectedShop = null;
let selectedCodeType = 'qr'; // Výchozí typ

// Téma přepínání
document.getElementById("theme-toggle").addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
});

// Výběr jazyka (placeholder)
document.getElementById("lang-select").addEventListener("change", () => {});

// Otevři modal výběru obchodu
document.addEventListener("click", (e) => {
  if (e.target.closest("#add-card-btn")) {
    document.getElementById("shop-modal").classList.remove("hidden");
  }
});

// Zavři modaly
document.getElementById("modal-close").onclick = () => document.getElementById("shop-modal").classList.add("hidden");
document.getElementById("scan-close").onclick = () => {
  document.getElementById("scan-modal").classList.add("hidden");
  stopScanner();
};
document.getElementById("display-close").onclick = () => document.getElementById("display-modal").classList.add("hidden");

// Výběr obchodu
document.querySelectorAll(".shop-option").forEach(btn => {
  btn.onclick = () => {
    selectedShop = btn.dataset.shop;
    document.getElementById("shop-modal").classList.add("hidden");
    document.getElementById("scan-modal").classList.remove("hidden");

    if (selectedCodeType === 'qr') startScanner();
  };
});

// Výběr typu kódu
document.querySelectorAll("input[name='code-type']").forEach(radio => {
  radio.addEventListener("change", () => {
    selectedCodeType = radio.value;
    if (selectedCodeType === "qr") {
      startScanner();
    } else {
      stopScanner();
    }
  });
});

let html5QrCode;
function startScanner() {
  if (html5QrCode) {
    html5QrCode.stop().then(() => html5QrCode.clear()).catch(() => {});
  }
  html5QrCode = new Html5Qrcode("qr-reader");
  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    (decodedText) => {
      html5QrCode.stop().then(() => {
        saveCard(selectedShop, decodedText, selectedCodeType);
        document.getElementById("scan-modal").classList.add("hidden");
      });
    },
    (error) => {}
  );
}

function stopScanner() {
  if (html5QrCode) {
    html5QrCode.stop().then(() => html5QrCode.clear()).catch(() => {});
  }
}

// Ruční zadání kódu
document.getElementById("confirm-code").onclick = () => {
  const code = document.getElementById("manual-code").value.trim();
  if (code !== "") {
    stopScanner();
    saveCard(selectedShop, code, selectedCodeType);
    document.getElementById("scan-modal").classList.add("hidden");
  }
};

function saveCard(shop, code, type) {
  const cards = JSON.parse(localStorage.getItem("cards") || "[]");
  cards.push({ shop, code, type });
  localStorage.setItem("cards", JSON.stringify(cards));
  renderCards();
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
    case "Lidl": return "bg-yellow-300";
    case "Kaufland": return "bg-red-500 text-white";
    case "Tesco": return "bg-blue-600 text-white";
    default: return "bg-gray-200";
  }
}

function renderCards() {
  const grid = document.getElementById("card-grid");
  grid.innerHTML = '';

  const cards = JSON.parse(localStorage.getItem("cards") || "[]");

  cards.forEach((card, index) => {
    const isDarkText = card.shop === "Lidl";
    const cardColor = getCardColor(card.shop);

    const div = document.createElement("div");
    div.className = `relative ${cardColor} p-4 rounded-2xl aspect-[3/2] flex flex-col justify-center items-center text-center cursor-pointer shadow hover:shadow-lg transition ${isDarkText ? 'text-black' : 'text-white'}`;

    div.onclick = () => showBarcode(card);

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

    div.append(icon, title, del);
    grid.appendChild(div);
  });

  const addBtn = document.createElement("div");
  addBtn.id = "add-card-btn";
  addBtn.className = "flex items-center justify-center border-2 border-dashed rounded-2xl aspect-[3/2] cursor-pointer bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition";
  addBtn.innerHTML = `<div class="text-4xl text-gray-400">+</div>`;
  grid.appendChild(addBtn);
}

function showBarcode(card) {
  const modal = document.getElementById("display-modal");
  const title = document.getElementById("display-title");
  const img = document.getElementById("display-code-img");
  const text = document.getElementById("display-code-text");

  title.textContent = card.shop;
  text.textContent = card.code;

  if (card.type === "qr") {
    img.src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(card.code)}&size=200x200`;
  } else {
    img.src = `https://barcodeapi.org/api/code128/${encodeURIComponent(card.code)}?width=300&height=100`;
  }

  modal.classList.remove("hidden");
}

function deleteCard(index) {
  const cards = JSON.parse(localStorage.getItem("cards") || "[]");
  cards.splice(index, 1);
  localStorage.setItem("cards", JSON.stringify(cards));
  renderCards();
}

// Inicializace
renderCards();
