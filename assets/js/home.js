/* Главная: плитка категорий, блок «хиты», разметка магазина. */
(function () {
  "use strict";
  var s = window.Shop;

  var CAT_ICON = {
    washing: "washer",
    fridges: "fridge",
    climate: "snow",
    vacuum: "vacuum",
    small: "kettle",
    home: "house"
  };

  function renderCategories() {
    var box = document.getElementById("home-categories");
    if (!box) return;
    box.innerHTML = (window.CATEGORIES || []).map(function (c) {
      var count = (window.PRODUCTS || []).filter(function (p) { return p.category === c.id; }).length;
      var ico = window.Icons ? window.Icons.svg(CAT_ICON[c.id] || "box", 24) : "";
      return '<a class="cat-tile" href="catalog.html?cat=' + c.id + '">' +
        '<span class="cat-ico">' + ico + '</span>' +
        '<b>' + s.escapeHtml(c.name) + '</b>' +
        '<span class="cat-note">' + s.escapeHtml(c.note) + '</span>' +
        '<span class="cat-count">' + count + ' товаров →</span>' +
      '</a>';
    }).join("");
  }

  function renderHits() {
    var box = document.getElementById("home-hits");
    if (!box) return;
    var list = (window.PRODUCTS || []).slice().sort(function (a, b) {
      var av = (a.availability === "in-stock" ? 0 : 1) - (b.availability === "in-stock" ? 0 : 1);
      if (av) return av;
      return (b.oldPrice ? 1 : 0) - (a.oldPrice ? 1 : 0);
    }).slice(0, 8);
    box.innerHTML = list.map(s.productCard).join("");
    s.initCardReveal();
  }

  function addStructuredData() {
    var ld = {
      "@context": "https://schema.org",
      "@type": "Store",
      "name": "ТехноДом",
      "areaServed": "Пенза",
      "telephone": window.SITE.phone,
      "address": { "@type": "PostalAddress", "addressLocality": "Пенза", "streetAddress": "ул. Примерная, д. 1" },
      "priceRange": "₽₽"
    };
    var el = document.createElement("script");
    el.type = "application/ld+json";
    el.textContent = JSON.stringify(ld);
    document.head.appendChild(el);
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderCategories();
    renderHits();
    addStructuredData();
  });
})();
