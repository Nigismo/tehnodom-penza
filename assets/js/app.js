/* =========================================================
   Общие утилиты: корзина (localStorage), карточки товаров,
   шапка, уведомления, cookie-плашка.
   Работает без сервера: при открытии файла напрямую тоже.
   ========================================================= */
(function () {
  "use strict";

  var CART_KEY = "tehnodom_cart_v1";

  /* ---------- Утилиты ---------- */
  function formatPrice(n) {
    return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function findProduct(id) {
    return (window.PRODUCTS || []).filter(function (p) { return p.id === id; })[0] || null;
  }
  function categoryName(id) {
    var c = (window.CATEGORIES || []).filter(function (x) { return x.id === id; })[0];
    return c ? c.name : id;
  }
  function availabilityInfo(p) {
    if (p.availability === "in-stock") return { cls: "badge-instock", text: "В наличии" };
    return { cls: "badge-preorder", text: "Под заказ" };
  }

  /* ---------- Корзина ---------- */
  function readCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      var data = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(data)) return [];
      return data.filter(function (it) { return it && findProduct(it.id) && it.qty > 0; });
    } catch (e) { return []; }
  }
  function writeCart(items) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) {}
    updateCartBadge();
    document.dispatchEvent(new CustomEvent("cart:change", { detail: { items: items } }));
  }
  function addToCart(id, qty) {
    qty = qty || 1;
    var items = readCart();
    var found = items.filter(function (it) { return it.id === id; })[0];
    if (found) { found.qty += qty; } else { items.push({ id: id, qty: qty }); }
    writeCart(items);
    var p = findProduct(id);
    toast("Добавлено в корзину: " + (p ? p.title : id), true);
  }
  function setQty(id, qty) {
    var items = readCart();
    var it = items.filter(function (x) { return x.id === id; })[0];
    if (!it) return;
    it.qty = Math.max(1, Math.min(99, qty));
    writeCart(items);
  }
  function removeFromCart(id) {
    writeCart(readCart().filter(function (x) { return x.id !== id; }));
  }
  function cartCount() {
    return readCart().reduce(function (s, it) { return s + it.qty; }, 0);
  }
  function cartTotals() {
    var items = readCart();
    var sum = 0, qty = 0;
    items.forEach(function (it) {
      var p = findProduct(it.id);
      if (p) { sum += p.price * it.qty; qty += it.qty; }
    });
    return { sum: sum, qty: qty, items: items };
  }
  function updateCartBadge() {
    var n = cartCount();
    Array.prototype.forEach.call(document.querySelectorAll("[data-cart-count]"), function (el) {
      el.textContent = n;
      el.setAttribute("aria-label", "Товаров в корзине: " + n);
    });
  }

  /* ---------- Карточка товара ---------- */
  function productCard(p) {
    var av = availabilityInfo(p);
    var sale = p.oldPrice ? '<span class="badge badge-sale">Скидка</span>' : "";
    return '' +
      '<article class="product-card">' +
        '<div class="product-media">' +
          '<a href="product.html?id=' + encodeURIComponent(p.id) + '" aria-label="' + escapeHtml(p.title) + '">' +
            '<img src="' + window.imageFor(p.category) + '" alt="' + escapeHtml(p.title) + '" loading="lazy" width="400" height="300">' +
          '</a>' +
          '<div class="product-badges">' +
            '<span class="badge ' + av.cls + '"><span class="dot"></span>' + av.text + '</span>' + sale +
          '</div>' +
        '</div>' +
        '<div class="product-body">' +
          '<span class="product-brand">' + escapeHtml(p.brand) + '</span>' +
          '<h3 class="product-title"><a href="product.html?id=' + encodeURIComponent(p.id) + '">' + escapeHtml(p.title) + '</a></h3>' +
          '<p class="product-specs">' + escapeHtml(p.short) + '</p>' +
          '<div class="product-foot">' +
            '<div class="price-row"><span class="price">' + formatPrice(p.price) + '</span>' +
              (p.oldPrice ? '<span class="price-old">' + formatPrice(p.oldPrice) + '</span>' : "") +
            '</div>' +
            '<div class="product-actions">' +
              '<button class="btn btn-primary" type="button" data-add="' + escapeHtml(p.id) + '">' +
                (window.Icons ? window.Icons.svg("cart", 18) : "") + '<span>В корзину</span></button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  /* ---------- Уведомления ---------- */
  function toast(message, ok) {
    var wrap = document.querySelector(".toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    var el = document.createElement("div");
    el.className = "toast" + (ok ? " is-ok" : "");
    el.setAttribute("role", "status");
    el.textContent = message;
    wrap.appendChild(el);
    setTimeout(function () { el.remove(); }, 2600);
  }

  /* ---------- Шапка: тень при прокрутке ---------- */
  function initHeaderScroll() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Шапка: мобильное меню ---------- */
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.querySelector(".main-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ---------- Заполнение [data-icon] ---------- */
  function hydrateIcons() {
    if (!window.Icons) return;
    Array.prototype.forEach.call(document.querySelectorAll("[data-icon]"), function (el) {
      el.innerHTML = window.Icons.svg(el.getAttribute("data-icon"), Number(el.getAttribute("data-icon-size")) || 18);
    });
  }

  /* ---------- Cookie-плашка ---------- */
  function initCookie() {
    var bar = document.querySelector(".cookie-bar");
    if (!bar) return;
    var KEY = "tehnodom_cookie_ok";
    try { if (localStorage.getItem(KEY) === "1") { bar.hidden = true; } } catch (e) {}
    var btn = bar.querySelector("[data-cookie-ok]");
    if (btn) btn.addEventListener("click", function () {
      try { localStorage.setItem(KEY, "1"); } catch (e) {}
      bar.hidden = true;
    });
  }

  /* ---------- Делегирование кнопки «В корзину» ---------- */
  function initAddButtons() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest("[data-add]") : null;
      if (!btn) return;
      e.preventDefault();
      addToCart(btn.getAttribute("data-add"), 1);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    updateCartBadge();
    hydrateIcons();
    initHeaderScroll();
    initNav();
    initCookie();
    initAddButtons();
  });

  /* ---------- Экспорт ---------- */
  window.Shop = {
    formatPrice: formatPrice,
    escapeHtml: escapeHtml,
    findProduct: findProduct,
    categoryName: categoryName,
    availabilityInfo: availabilityInfo,
    productCard: productCard,
    toast: toast,
    readCart: readCart,
    writeCart: writeCart,
    addToCart: addToCart,
    setQty: setQty,
    removeFromCart: removeFromCart,
    cartCount: cartCount,
    cartTotals: cartTotals,
    updateCartBadge: updateCartBadge
  };
})();
