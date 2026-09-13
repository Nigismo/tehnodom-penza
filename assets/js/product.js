/* =========================================================
   Страница товара: данные из ?id=, галерея, характеристики,
   добавление в корзину, похожие товары.
   ========================================================= */
(function () {
  "use strict";

  function renderNotFound() {
    document.getElementById("product-root").innerHTML =
      '<div class="state-block is-error" role="alert">' +
        '<div class="state-ico">!</div>' +
        '<h3>Товар не найден</h3>' +
        '<p>Возможно, ссылка устарела или товар больше не продаётся. Вернитесь в каталог — там есть все позиции.</p>' +
        '<a class="btn btn-primary" href="catalog.html">Перейти в каталог</a>' +
      '</div>';
  }

  function renderProduct(p) {
    var s = window.Shop;
    var av = s.availabilityInfo(p);
    var img = window.imageFor(p.category);

    document.title = p.title + " — купить в Пензе | " + window.SITE.brand;

    var specsRows = Object.keys(p.specs).map(function (k) {
      return '<tr><th scope="row">' + s.escapeHtml(k) + '</th><td>' + s.escapeHtml(p.specs[k]) + '</td></tr>';
    }).join("");

    var related = (window.PRODUCTS || []).filter(function (x) {
      return x.category === p.category && x.id !== p.id;
    }).slice(0, 4);

    var relatedHtml = related.length
      ? '<section class="section"><div class="section-head"><div><p class="eyebrow">Похожие товары</p><h2>Из этой же категории</h2></div></div>' +
        '<div class="product-grid">' + related.map(s.productCard).join("") + '</div></section>'
      : "";

    document.getElementById("product-root").innerHTML = '' +
      '<nav class="breadcrumbs" aria-label="Хлебные крошки"><ol>' +
        '<li><a href="index.html">Главная</a></li>' +
        '<li><a href="catalog.html">Каталог</a></li>' +
        '<li><a href="catalog.html?cat=' + p.category + '">' + s.escapeHtml(s.categoryName(p.category)) + '</a></li>' +
        '<li aria-current="page">' + s.escapeHtml(p.title) + '</li>' +
      '</ol></nav>' +
      '<div class="product-detail" style="margin-top:22px">' +
        '<div>' +
          '<div class="gallery-main"><img id="gallery-img" src="' + img + '" alt="' + s.escapeHtml(p.title) + '" width="600" height="450"></div>' +
          '<p class="gallery-note">Фото — изображение-заглушка. Замените на реальные снимки товара в формате 4:3.</p>' +
        '</div>' +
        '<div>' +
          '<span class="product-brand">' + s.escapeHtml(p.brand) + '</span>' +
          '<h1>' + s.escapeHtml(p.title) + '</h1>' +
          '<p><span class="badge ' + av.cls + '"><span class="dot"></span>' + av.text + '</span></p>' +
          '<div class="detail-price">' + s.formatPrice(p.price) +
            (p.oldPrice ? '<span class="price-old">' + s.formatPrice(p.oldPrice) + '</span>' : "") + '</div>' +
          '<p style="margin-top:14px;color:var(--text-soft)">' + s.escapeHtml(p.desc) + '</p>' +

          '<p class="detail-cart-note" id="detail-cart-note" role="status" aria-live="polite"></p>' +
          '<div class="detail-actions">' +
            '<div class="qty" role="group" aria-label="Количество">' +
              '<button type="button" data-qty="-1" aria-label="Меньше">−</button>' +
              '<input id="qty-input" type="text" inputmode="numeric" value="1" aria-label="Количество">' +
              '<button type="button" data-qty="1" aria-label="Больше">+</button>' +
            '</div>' +
            '<button class="btn btn-primary btn-lg" type="button" id="detail-add">Оформить заявку</button>' +
            '<a class="btn btn-outline btn-lg" href="' + window.SITE.phoneHref + '">' + (window.Icons ? window.Icons.svg("phone", 18) : "") + '<span>Позвонить</span></a>' +
          '</div>' +

          '<ul class="trust-list">' +
            '<li>' + (window.Icons ? window.Icons.svg("truck", 18) : "") + '<span>Самовывоз и доставка по Пензе — сроки уточним при подтверждении</span></li>' +
            '<li>' + (window.Icons ? window.Icons.svg("shield", 18) : "") + '<span>Гарантия производителя, чек и документы на товар</span></li>' +
            '<li>' + (window.Icons ? window.Icons.svg("wallet", 18) : "") + '<span>Оплата при получении или по счёту — без предоплаты онлайн</span></li>' +
          '</ul>' +

          '<h3 style="margin-top:26px">Характеристики</h3>' +
          '<table class="spec-table"><tbody>' + specsRows + '</tbody></table>' +
        '</div>' +
      '</div>' +
      relatedHtml;

    // Количество
    var input = document.getElementById("qty-input");
    document.querySelectorAll("[data-qty]").forEach(function (b) {
      b.addEventListener("click", function () {
        var v = parseInt(input.value, 10) || 1;
        v += parseInt(b.getAttribute("data-qty"), 10);
        input.value = String(Math.max(1, Math.min(99, v)));
      });
    });
    input.addEventListener("change", function () {
      var v = parseInt(input.value, 10) || 1;
      input.value = String(Math.max(1, Math.min(99, v)));
    });

    var note = document.getElementById("detail-cart-note");
    function updateNote() {
      var inCart = (window.Shop.readCart().filter(function (x) { return x.id === p.id; })[0] || {}).qty || 0;
      note.textContent = inCart ? "Уже в корзине: " + inCart + " шт. Можно добавить ещё." : "";
    }
    updateNote();
    document.addEventListener("cart:change", updateNote);

    document.getElementById("detail-add").addEventListener("click", function () {
      window.Shop.addToCart(p.id, parseInt(input.value, 10) || 1);
      window.location.href = "cart.html";
    });

    // Schema.org Product/Offer
    var ld = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": p.title,
      "brand": { "@type": "Brand", "name": p.brand },
      "description": p.desc,
      "offers": {
        "@type": "Offer",
        "priceCurrency": "RUB",
        "price": p.price,
        "availability": p.availability === "in-stock" ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
        "areaServed": "Пенза"
      }
    };
    var s1 = document.createElement("script");
    s1.type = "application/ld+json";
    s1.textContent = JSON.stringify(ld);
    document.head.appendChild(s1);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var id = new URLSearchParams(location.search).get("id");
    var p = id ? window.Shop.findProduct(id) : null;
    if (!p) { renderNotFound(); return; }
    renderProduct(p);
  });
})();
