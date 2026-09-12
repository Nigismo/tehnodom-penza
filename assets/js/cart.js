/* =========================================================
   Корзина и оформление заявки.
   Оплаты онлайн нет — заявка уходит менеджеру (демо-режим:
   отправка имитируется, данные никуда не передаются).
   ========================================================= */
(function () {
  "use strict";
  var s = window.Shop;
  var DELIVERY_CITY = 390; // примерная стоимость доставки по городу

  function deliveryFee() {
    var sel = document.querySelector('input[name="delivery"]:checked');
    return sel && sel.value === "city" ? DELIVERY_CITY : 0;
  }

  function renderEmpty() {
    document.getElementById("cart-main").innerHTML =
      '<div class="state-block" role="status">' +
        '<div class="state-ico">' + (window.Icons ? window.Icons.svg("cart", 28) : "") + '</div>' +
        '<h3>В корзине пока пусто</h3>' +
        '<p>Добавьте товары из каталога — заявку можно оформить в один шаг, без онлайн-оплаты.</p>' +
        '<a class="btn btn-primary" href="catalog.html">Перейти в каталог</a>' +
      '</div>';
    document.getElementById("cart-summary").hidden = true;
  }

  function renderCart() {
    var t = s.cartTotals();
    if (!t.items.length) { renderEmpty(); return; }
    document.getElementById("cart-summary").hidden = false;

    document.getElementById("cart-list").innerHTML = t.items.map(function (it) {
      var p = s.findProduct(it.id);
      return '' +
        '<div class="cart-row">' +
          '<img src="' + window.imageFor(p.category) + '" alt="' + s.escapeHtml(p.title) + '" width="96" height="78">' +
          '<div>' +
            '<h4><a href="product.html?id=' + encodeURIComponent(p.id) + '">' + s.escapeHtml(p.title) + '</a></h4>' +
            '<div class="cart-row-meta">' + s.escapeHtml(p.brand) + ' · ' + s.escapeHtml(p.short) + '</div>' +
            '<div class="cart-row-meta">Цена: <b>' + s.formatPrice(p.price) + '</b></div>' +
          '</div>' +
          '<div class="cart-row-side">' +
            '<div class="qty">' +
              '<button type="button" data-dec="' + p.id + '" aria-label="Меньше">−</button>' +
              '<input type="number" min="1" max="99" value="' + it.qty + '" data-qtyid="' + p.id + '" aria-label="Количество">' +
              '<button type="button" data-inc="' + p.id + '" aria-label="Больше">+</button>' +
            '</div>' +
            '<div style="text-align:right">' +
              '<div class="price">' + s.formatPrice(p.price * it.qty) + '</div>' +
              '<button type="button" class="link-danger" data-remove="' + p.id + '" style="border:0;background:none;cursor:pointer">Удалить</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    }).join("");

    updateSummary();
  }

  function updateSummary() {
    var t = s.cartTotals();
    var fee = deliveryFee();
    document.getElementById("sum-items").textContent = t.qty + " шт. на " + s.formatPrice(t.sum);
    document.getElementById("sum-delivery").textContent = fee ? s.formatPrice(fee) : "бесплатно";
    document.getElementById("sum-total").textContent = s.formatPrice(t.sum + fee);
  }

  /* ---------- Валидация формы ---------- */
  function phoneMask(v) {
    var d = v.replace(/\D/g, "");
    if (d.startsWith("8")) d = "7" + d.slice(1);
    if (!d.startsWith("7")) d = "7" + d;
    d = d.slice(0, 11);
    var out = "+7";
    if (d.length > 1) out += " (" + d.slice(1, 4);
    if (d.length >= 5) out += ") " + d.slice(4, 7);
    if (d.length >= 8) out += "-" + d.slice(7, 9);
    if (d.length >= 10) out += "-" + d.slice(9, 11);
    return out;
  }
  function validateField(field) {
    var input = field.querySelector("input, textarea, select");
    var valid = true, msg = "";
    if (field.getAttribute("data-required") === "true") {
      if (!input.value.trim()) { valid = false; msg = "Заполните это поле"; }
    }
    if (valid && input.type === "tel") {
      var d = input.value.replace(/\D/g, "");
      if (d.length !== 11) { valid = false; msg = "Введите телефон в формате +7 (900) 000-00-00"; }
    }
    if (valid && input.getAttribute("name") === "name" && input.value.trim().length < 2) {
      valid = false; msg = "Укажите имя (минимум 2 символа)";
    }
    field.classList.toggle("has-error", !valid);
    var m = field.querySelector(".error-msg");
    if (m) m.textContent = msg;
    return valid;
  }

  function bindForm() {
    var form = document.getElementById("order-form");
    if (!form) return;

    // Маска телефона
    var tel = form.querySelector('input[type="tel"]');
    if (tel) tel.addEventListener("input", function () { tel.value = phoneMask(tel.value); });

    // Валидация на blur, снятие ошибки при исправлении
    Array.prototype.forEach.call(form.querySelectorAll(".field[data-required]"), function (field) {
      var input = field.querySelector("input, textarea, select");
      input.addEventListener("blur", function () { validateField(field); });
      input.addEventListener("input", function () {
        if (field.classList.contains("has-error")) validateField(field);
      });
    });

    // Стоимость доставки меняется сразу
    Array.prototype.forEach.call(form.querySelectorAll('input[name="delivery"]'), function (r) {
      r.addEventListener("change", updateSummary);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var banner = document.getElementById("form-errors");
      banner.classList.remove("is-visible");
      banner.textContent = "";

      var ok = true, firstBad = null;
      Array.prototype.forEach.call(form.querySelectorAll(".field[data-required], .check-field[data-required]"), function (field) {
        var input = field.querySelector("input, textarea, select");
        var valid = input.type === "checkbox" ? input.checked : validateField(field).valueOf();
        if (!valid) {
          ok = false;
          if (!firstBad) firstBad = input;
          if (input.type === "checkbox") field.classList.add("has-error");
        }
      });

      if (!ok) {
        banner.textContent = "Проверьте выделенные поля — заявка не отправлена.";
        banner.classList.add("is-visible");
        if (firstBad) firstBad.focus();
        return;
      }

      // Имитация отправки (серверной части нет — это демо)
      var btn = document.getElementById("submit-order");
      btn.classList.add("is-loading");
      btn.setAttribute("aria-disabled", "true");
      var name = form.querySelector('[name="name"]').value.trim();
      var phone = form.querySelector('[name="phone"]').value.trim();
      var comment = (form.querySelector('[name="comment"]') || {}).value || "";
      var del = (form.querySelector('input[name="delivery"]:checked') || {}).value || "pickup";
      var t = s.cartTotals();
      var fee = del === "city" ? DELIVERY_CITY : 0;
      var num = "З-" + String(Date.now()).slice(-6);

      setTimeout(function () {
        try {
          renderSuccess({ num: num, name: name, phone: phone, comment: comment.trim(), delivery: del, total: t.sum + fee, qty: t.qty });
          s.writeCart([]);
        } catch (err) {
          btn.classList.remove("is-loading");
          btn.removeAttribute("aria-disabled");
          banner.textContent = "Не удалось отправить заявку — проверьте соединение и попробуйте ещё раз. Данные сохранены.";
          banner.classList.add("is-visible");
        }
      }, 1100);
    });
  }

  function renderSuccess(o) {
    var deliv = o.delivery === "city" ? "Доставка по Пензе" : "Самовывоз";
    document.getElementById("cart-main").innerHTML =
      '<div class="form-success" role="status">' +
        '<div class="big-check">' + (window.Icons ? window.Icons.svg("check", 38) : "✓") + '</div>' +
        '<h2>Спасибо, заявка принята!</h2>' +
        '<p style="color:var(--text-soft);max-width:52ch;margin:0 auto 18px">' +
          s.escapeHtml(o.name) + ', мы позвоним на номер <b>' + s.escapeHtml(o.phone) + '</b> в рабочее время, ' +
          'подтвердим наличие и срок. Номер заявки: <b>' + o.num + '</b>.</p>' +
        '<div class="info-card" style="max-width:520px;margin:0 auto;text-align:left">' +
          '<div class="summary-row"><span>Товаров</span><span>' + o.qty + ' шт.</span></div>' +
          '<div class="summary-row"><span>Способ получения</span><span>' + deliv + '</span></div>' +
          '<div class="summary-row"><span>Сумма заявки</span><span>' + s.formatPrice(o.total) + '</span></div>' +
          (o.comment ? '<div class="summary-row"><span>Комментарий</span><span>' + s.escapeHtml(o.comment) + '</span></div>' : "") +
        '</div>' +
        '<div style="margin-top:20px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">' +
          '<a class="btn btn-primary" href="catalog.html">Вернуться в каталог</a>' +
          '<a class="btn btn-outline" href="' + window.SITE.phoneHref + '">Позвонить сейчас</a>' +
        '</div>' +
      '</div>';
    document.getElementById("cart-summary").hidden = true;
    var h = document.querySelector("h1"); if (h) h.textContent = "Заявка оформлена";
  }

  function bindList() {
    var list = document.getElementById("cart-list");
    if (!list) return;
    list.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-inc],[data-dec],[data-remove]") : null;
      if (!b) return;
      var inc = b.getAttribute("data-inc"), dec = b.getAttribute("data-dec"), rem = b.getAttribute("data-remove");
      var id = inc || dec || rem;
      var cur = (s.readCart().filter(function (x) { return x.id === id; })[0] || {}).qty || 1;
      if (inc) s.setQty(id, cur + 1);
      if (dec) s.setQty(id, cur - 1);
      if (rem) s.removeFromCart(id);
      renderCart();
    });
    list.addEventListener("change", function (e) {
      var q = e.target.closest ? e.target.closest("[data-qtyid]") : null;
      if (!q) return;
      s.setQty(q.getAttribute("data-qtyid"), parseInt(q.value, 10) || 1);
      renderCart();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.getElementById("cart-main")) return;
    renderCart();
    bindForm();
    bindList();
  });
})();
