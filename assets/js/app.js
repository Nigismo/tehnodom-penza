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

  /* ---------- Блок действий в карточке: «В корзину» или счётчик ---------- */
  function actionsMarkup(p) {
    var it = readCart().filter(function (x) { return x.id === p.id; })[0];
    var ico = window.Icons ? window.Icons.svg("cart", 18) : "";
    if (!it) {
      return '<button class="btn btn-primary" type="button" data-add="' + escapeHtml(p.id) + '">' +
        ico + '<span>В корзину</span></button>';
    }
    return '' +
      '<div class="qty qty-sm">' +
        '<button type="button" data-card-dec="' + escapeHtml(p.id) + '" aria-label="Убрать одну штуку">−</button>' +
        '<input type="number" min="1" max="99" value="' + it.qty + '" data-card-qty="' + escapeHtml(p.id) + '" aria-label="В корзине, шт.">' +
        '<button type="button" data-card-inc="' + escapeHtml(p.id) + '" aria-label="Добавить ещё одну штуку">+</button>' +
      '</div>' +
      '<a class="btn btn-ghost btn-compact" href="cart.html">В корзине</a>';
  }

  function refreshActions() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-actions]"), function (box) {
      var p = findProduct(box.getAttribute("data-actions"));
      if (!p) return;
      var inCart = readCart().some(function (x) { return x.id === p.id; });
      box.classList.toggle("is-in-cart", inCart);
      box.innerHTML = actionsMarkup(p);
    });
  }

  /* ---------- Карточка товара ---------- */
  function discountPercent(price, oldPrice) {
    if (!oldPrice || oldPrice <= price) return "";
    var pct = Math.round((1 - price / oldPrice) * 100);
    return '<span class="price-discount">−' + pct + '%</span>';
  }

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
              (p.oldPrice ? '<span class="price-old">' + formatPrice(p.oldPrice) + '</span>' + discountPercent(p.price, p.oldPrice) : "") +
            '</div>' +
            '<div class="product-actions" data-actions="' + escapeHtml(p.id) + '">' + actionsMarkup(p) + '</div>' +
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

  /* ---------- Делегирование кнопок в карточках ---------- */
  function initAddButtons() {
    document.addEventListener("click", function (e) {
      if (!e.target.closest) return;
      var add = e.target.closest("[data-add]");
      if (add) { e.preventDefault(); addToCart(add.getAttribute("data-add"), 1); return; }
      var inc = e.target.closest("[data-card-inc]");
      if (inc) {
        var idI = inc.getAttribute("data-card-inc");
        var curI = (readCart().filter(function (x) { return x.id === idI; })[0] || {}).qty || 0;
        setQty(idI, curI + 1);
        return;
      }
      var dec = e.target.closest("[data-card-dec]");
      if (dec) {
        var idD = dec.getAttribute("data-card-dec");
        var curD = (readCart().filter(function (x) { return x.id === idD; })[0] || {}).qty || 1;
        if (curD <= 1) removeFromCart(idD); else setQty(idD, curD - 1);
      }
    });
    document.addEventListener("change", function (e) {
      var q = e.target.closest ? e.target.closest("[data-card-qty]") : null;
      if (!q) return;
      setQty(q.getAttribute("data-card-qty"), parseInt(q.value, 10) || 1);
    });
    document.addEventListener("cart:change", refreshActions);
  }

  /* ---------- Анимация появления карточек при прокрутке ---------- */
  function initCardReveal() {
    if (!('IntersectionObserver' in window)) {
      // Фолбэк: показать всё сразу
      Array.prototype.forEach.call(document.querySelectorAll('.product-card'), function (c) { c.classList.add('is-visible'); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    Array.prototype.forEach.call(document.querySelectorAll('.product-card'), function (c) { obs.observe(c); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    updateCartBadge();
    hydrateIcons();
    initHeaderScroll();
    initNav();
    initCookie();
    initAddButtons();
    initCardReveal();
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
    refreshActions: refreshActions,
    setQty: setQty,
    removeFromCart: removeFromCart,
    cartCount: cartCount,
    cartTotals: cartTotals,
    updateCartBadge: updateCartBadge,
    initCardReveal: initCardReveal
  };
})();
