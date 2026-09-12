/* Набор линейных SVG-иконок (stroke 1.7, currentColor).
   Заменяет emoji в интерфейсе. Использование: Icons.svg("cart", 20). */
(function () {
  "use strict";
  var P = {
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    cart: '<path d="M4 5h2l2 11h10l2-7H6.6"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17.5" cy="19" r="1.4"/>',
    phone: '<path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5z"/>',
    truck: '<path d="M2.5 6.5h11v9h-11z"/><path d="M13.5 9.5h4l3 3v3h-7z"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
    shield: '<path d="M12 3l7 3v5.5c0 4-3 7.3-7 9-4-1.7-7-5-7-9V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
    wallet: '<path d="M3.5 6.5h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-15z"/><path d="M3.5 6.5a2 2 0 0 1 2-2h11"/><circle cx="16.5" cy="12.5" r="1.2"/>',
    box: '<path d="M12 3l8 4.2v9.6L12 21l-8-4.2V7.2z"/><path d="M4 7.2l8 4.3 8-4.3"/><path d="M12 11.5V21"/>',
    check: '<path d="M4.5 12.5l5 5L19.5 7"/>',
    arrow: '<path d="M5 12h13"/><path d="M12.5 6l6 6-6 6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    pin: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
    star: '<path d="M12 4l2.4 5 5.6.8-4 4 1 5.6-5-2.7-5 2.7 1-5.6-4-4 5.6-.8z"/>',
    chat: '<path d="M4 5.5h16v11H9l-5 4z"/>',
    leaf: '<path d="M19 5c-8 0-13 4-13 10v4"/><path d="M19 5c0 7-4 11-11 11"/>',
    spark: '<path d="M12 3v6M12 15v6M3 12h6M15 12h6"/><path d="M6.5 6.5l3 3M14.5 14.5l3 3M17.5 6.5l-3 3M9.5 14.5l-3 3"/>'
  };
  function svg(name, size) {
    var s = size || 20;
    var d = P[name] || P.box;
    return '<svg class="ico" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" focusable="false">' + d + '</svg>';
  }
  window.Icons = { svg: svg, has: function (n) { return !!P[n]; } };
})();
