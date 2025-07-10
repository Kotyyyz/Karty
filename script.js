// 🌐 Přepínání jazyka
const langSelect = document.getElementById('lang-select');
let currentLang = 'cs';
let translations = {};

function loadLang(lang) {
  fetch(`lang/${lang}.json`)
    .then(res => res.json())
    .then(data => {
      translations = data;
      applyTranslations();
    });
}

function applyTranslations() {
  // Zde můžeš doplnit překlady např. textContent podle ID elementů
  // (budeme rozšiřovat později)
}

// Změna jazyka
langSelect.addEventListener('change', (e) => {
  currentLang = e.target.value;
  loadLang(currentLang);
});

loadLang(currentLang);

// 🌙 Přepínač tématu
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
});

// ➕ Kliknutí na „+“ kartu
document.getElementById('add-card-btn').addEventListener('click', () => {
  alert('Zde bude výběr obchodů (Lidl, Kaufland, Tesco)...');
});
