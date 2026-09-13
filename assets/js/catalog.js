/* =========================================================
   Каталог: фильтры, сортировка, пагинация.
   Состояния: загрузка (скелетон), пустой результат, ошибка.
   Состояние хранится в URL — ссылку можно скопировать.
   ========================================================= */
(function () {
  "use strict";
  var PER_PAGE = 9;

  var state = { q: "", cats: [], brands: [], min: "", max: "", sort: "popular", page: 1 };

  var els = {};

  function readParams() {
    var sp = new URLSearchParams(location.search);
    state.q = (sp.get("q") || "").trim();
    state.cats = (sp.get("cat") || "").split(",").filter(Boolean);
    state.brands = (sp.get("brand") || "").split(",").filter(Boolean);
    state.min = sp.get("min") || "";
    state.max = sp.get("max") || "";
    state.sort = sp.get("sort") || "popular";
    state.page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
  }
  function writeParams(replace) {
    var sp = new URLSearchParams();
    if (state.q) sp.set("q", state.q);
    if (state.cats.length) sp.set("cat", state.cats.join(","));
    if (state.brands.length) sp.set("brand", state.brands.join(","));
    if (state.min) sp.set("min", state.min);
    if (state.max) sp.set("max", state.max);
    if (state.sort && state.sort !== "popular") sp.set("sort", state.sort);
    if (state.page > 1) sp.set("page", String(state.page));
    var url = location.pathname + (sp.toString() ? "?" + sp.toString() : "");
    history[replace ? "replaceState" : "pushState"]({}, "", url);
  }

  function matches(p) {
    if (state.q) {
      var hay = (p.title + " " + p.brand + " " + p.short + " " + categoryNameSafe(p.category)).toLowerCase();
      if (hay.indexOf(state.q.toLowerCase()) === -1) return false;
    }
    if (state.cats.length && state.cats.indexOf(p.category) === -1) return false;
    if (state.brands.length && state.brands.indexOf(p.brand) === -1) return false;
    if (state.min && p.price < Number(state.min)) return false;
    if (state.max && p.price > Number(state.max)) return false;
    return true;
  }
  function categoryNameSafe(id) {
    var c = (window.CATEGORIES || []).filter(function (x) { return x.id === id; })[0];
    return c ? c.name : id;
  }
  function sortList(list) {
    var l = list.slice();
    if (state.sort === "price-asc") l.sort(function (a, b) { return a.price - b.price; });
    else if (state.sort === "price-desc") l.sort(function (a, b) { return b.price - a.price; });
    else if (state.sort === "name") l.sort(function (a, b) { return a.title.localeCompare(b.title, "ru"); });
    else {
      // «популярные»: сначала в наличии, затем по наличию скидки
      l.sort(function (a, b) {
        var av = (a.availability === "in-stock" ? 0 : 1) - (b.availability === "in-stock" ? 0 : 1);
        if (av) return av;
        return (b.oldPrice ? 1 : 0) - (a.oldPrice ? 1 : 0);
      });
    }
    return l;
  }

  /* ---------- Рендер фильтров ---------- */
  function renderFilters() {
    var catBox = document.getElementById("filter-cats");
    var brandBox = document.getElementById("filter-brands");
    if (catBox) {
      catBox.innerHTML = (window.CATEGORIES || []).map(function (c) {
        var checked = state.cats.indexOf(c.id) !== -1 ? " checked" : "";
        return '<label class="check"><input type="checkbox" data-filter="cat" value="' + c.id + '"' + checked + '> ' + c.name + '</label>';
      }).join("");
    }
    if (brandBox) {
      brandBox.innerHTML = (window.BRANDS || []).map(function (b) {
        var checked = state.brands.indexOf(b) !== -1 ? " checked" : "";
        return '<label class="check"><input type="checkbox" data-filter="brand" value="' + b + '"' + checked + '> ' + b + '</label>';
      }).join("");
    }
    var minEl = document.getElementById("filter-min");
    var maxEl = document.getElementById("filter-max");
    if (minEl) minEl.value = state.min;
    if (maxEl) maxEl.value = state.max;
    var sortEl = document.getElementById("sort");
    if (sortEl) sortEl.value = state.sort;
  }

  function renderChips() {
    var box = document.getElementById("active-chips");
    if (!box) return;
    var chips = [];
    if (state.q) chips.push({ label: 'Поиск: «' + state.q + '»', kind: "q" });
    state.cats.forEach(function (c) { chips.push({ label: categoryNameSafe(c), kind: "cat", value: c }); });
    state.brands.forEach(function (b) { chips.push({ label: b, kind: "brand", value: b }); });
    if (state.min || state.max) chips.push({ label: "Цена: " + (state.min || "0") + "–" + (state.max || "∞") + " ₽", kind: "price" });
    box.innerHTML = chips.map(function (c) {
      return '<span class="chip">' + window.Shop.escapeHtml(c.label) +
        ' <button type="button" data-chip="' + c.kind + '" data-value="' + (c.value || "") + '" aria-label="Убрать фильтр">×</button></span>';
    }).join("");
  }

  /* ---------- Состояния ---------- */
  function showLoading() {
    els.status.innerHTML = "";
    var html = "";
    for (var i = 0; i < 6; i++) html += '<div class="skeleton skeleton-card"></div>';
    els.grid.innerHTML = html;
    els.grid.hidden = false;
  }
  function showError() {
    els.grid.hidden = true;
    els.pagination.innerHTML = "";
    els.status.innerHTML =
      '<div class="state-block is-error" role="alert">' +
        '<div class="state-ico">' + (window.Icons ? window.Icons.svg("clock", 28) : "") + '</div>' +
        '<h3>Не удалось загрузить каталог</h3>' +
        '<p>Похоже, данные не подгрузились из-за плохого соединения. Попробуйте ещё раз — фильтры сохранятся.</p>' +
        '<button class="btn btn-primary" type="button" id="retry-load">Повторить</button>' +
      '</div>';
    var r = document.getElementById("retry-load");
    if (r) r.addEventListener("click", function () { run(); });
  }
  function showEmpty(total) {
    els.grid.hidden = true;
    els.pagination.innerHTML = "";
    var echo = state.q ? ' по запросу «' + window.Shop.escapeHtml(state.q) + '»' : "";
    els.status.innerHTML =
      '<div class="state-block" role="status">' +
        '<div class="state-ico">' + (window.Icons ? window.Icons.svg("search", 28) : "") + '</div>' +
        '<h3>Ничего не найдено' + echo + '</h3>' +
        '<p>Попробуйте изменить фильтры, расширить диапазон цены или проверьте написание запроса.</p>' +
        '<button class="btn btn-outline" type="button" id="reset-filters">Сбросить фильтры</button>' +
      '</div>';
    var b = document.getElementById("reset-filters");
    if (b) b.addEventListener("click", resetAll);
  }

  function renderResults(list) {
    var total = list.length;
    var pages = Math.max(1, Math.ceil(total / PER_PAGE));
    state.page = Math.min(state.page, pages);
    var slice = list.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);

    els.count.textContent = total
      ? "Найдено товаров: " + total
      : "Товары не найдены";

    if (!total) { showEmpty(total); return; }

    els.grid.hidden = false;
    els.status.innerHTML = "";
    els.grid.innerHTML = slice.map(window.Shop.productCard).join("");

    // Пагинация
    if (pages <= 1) { els.pagination.innerHTML = ""; return; }
    var html = '<button type="button" data-page="' + (state.page - 1) + '"' + (state.page === 1 ? " disabled" : "") + ' aria-label="Предыдущая страница">←</button>';
    for (var i = 1; i <= pages; i++) {
      html += '<button type="button" data-page="' + i + '"' + (i === state.page ? ' aria-current="true"' : "") + '>' + i + '</button>';
    }
    html += '<button type="button" data-page="' + (state.page + 1) + '"' + (state.page === pages ? " disabled" : "") + ' aria-label="Следующая страница">→</button>';
    els.pagination.innerHTML = html;
  }

  function resetAll() {
    state = { q: "", cats: [], brands: [], min: "", max: "", sort: "popular", page: 1 };
    var minEl = document.getElementById("filter-min"), maxEl = document.getElementById("filter-max");
    if (minEl) minEl.value = ""; if (maxEl) maxEl.value = "";
    writeParams(true);
    renderFilters(); renderChips(); run();
  }

  function run() {
    showLoading();
    // Небольшая задержка имитирует загрузку данных каталога.
    setTimeout(function () {
      try {
        if (new URLSearchParams(location.search).get("simulateError") === "1") { showError(); return; }
        var list = sortList((window.PRODUCTS || []).filter(matches));
        renderResults(list);
      } catch (e) { showError(); }
    }, 450);
  }

  function bind() {
    document.addEventListener("change", function (e) {
      var t = e.target;
      if (!t || !t.getAttribute) return;
      var f = t.getAttribute("data-filter");
      if (f === "cat" || f === "brand") {
        var arr = f === "cat" ? state.cats : state.brands;
        var idx = arr.indexOf(t.value);
        if (t.checked && idx === -1) arr.push(t.value);
        if (!t.checked && idx !== -1) arr.splice(idx, 1);
        state.page = 1; writeParams(); renderChips(); run();
      }
    });
    var sortEl = document.getElementById("sort");
    if (sortEl) sortEl.addEventListener("change", function () {
      state.sort = sortEl.value; state.page = 1; writeParams(); run();
    });
    var applyBtn = document.getElementById("apply-price");
    if (applyBtn) applyBtn.addEventListener("click", function () {
      var minEl = document.getElementById("filter-min"), maxEl = document.getElementById("filter-max");
      state.min = minEl && minEl.value ? String(Math.max(0, parseInt(minEl.value, 10) || 0)) : "";
      state.max = maxEl && maxEl.value ? String(Math.max(0, parseInt(maxEl.value, 10) || 0)) : "";
      state.page = 1; writeParams(); renderChips(); run();
    });
    var resetBtn = document.getElementById("reset-filters-side");
    if (resetBtn) resetBtn.addEventListener("click", resetAll);

    // Складные фильтры на мобильных
    var ft = document.querySelector(".filters-toggle");
    var fb = document.getElementById("filters-body");
    if (ft && fb) {
      ft.addEventListener("click", function () {
        var open = fb.classList.toggle("is-open");
        ft.setAttribute("aria-expanded", open ? "true" : "false");
        var lbl = ft.querySelector("span:last-child");
        if (lbl) lbl.textContent = open ? "Скрыть фильтры" : "Показать фильтры";
      });
    }

    document.addEventListener("click", function (e) {
      var pg = e.target.closest ? e.target.closest("[data-page]") : null;
      if (pg && !pg.disabled) {
        state.page = parseInt(pg.getAttribute("data-page"), 10); writeParams(); run();
        var top = document.getElementById("catalog-top");
        if (top) top.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      var chip = e.target.closest ? e.target.closest("[data-chip]") : null;
      if (chip) {
        var kind = chip.getAttribute("data-chip"), val = chip.getAttribute("data-value");
        if (kind === "q") state.q = "";
        if (kind === "cat") state.cats = state.cats.filter(function (x) { return x !== val; });
        if (kind === "brand") state.brands = state.brands.filter(function (x) { return x !== val; });
        if (kind === "price") { state.min = ""; state.max = ""; }
        state.page = 1; writeParams(); renderFilters(); renderChips(); run();
      }
    });

    window.addEventListener("popstate", function () { readParams(); renderFilters(); renderChips(); run(); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    els.grid = document.getElementById("catalog-grid");
    els.status = document.getElementById("catalog-status");
    els.count = document.getElementById("result-count");
    els.pagination = document.getElementById("catalog-pagination");
    if (!els.grid) return;
    readParams();
    renderFilters();
    renderChips();
    bind();
    run();
  });
})();
