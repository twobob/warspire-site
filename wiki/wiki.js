(function () {
  "use strict";
  var root = document.body.getAttribute("data-root") || "";

  // section menu
  var menu = document.getElementById("menu");
  var sections = document.getElementById("sections");
  if (menu && sections) {
    menu.addEventListener("click", function () {
      var open = sections.classList.toggle("open");
      menu.setAttribute("aria-expanded", String(open));
    });
  }

  // search
  var input = document.getElementById("q");
  var box = document.getElementById("results");
  var index = window.WIKI_INDEX || [];
  var active = -1;
  function score(entry, words) {
    var title = entry.t.toLowerCase();
    var rest = (entry.s + " " + (entry.x || "") + " " + entry.k).toLowerCase();
    var total = 0;
    for (var i = 0; i < words.length; i += 1) {
      var word = words[i];
      var at = title.indexOf(word);
      if (at === 0) { total += 100; } else if (at > 0 && title.charAt(at - 1) === " ") { total += 60; } else if (at > 0) { total += 30; } else if (rest.indexOf(word) >= 0) { total += 8; } else { return 0; }
    }
    return total - title.length * 0.1;
  }
  function search() {
    var words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    box.textContent = "";
    active = -1;
    if (!words.length) { box.hidden = true; return; }
    var hits = [];
    index.forEach(function (entry) {
      var value = score(entry, words);
      if (value > 0) { hits.push([value, entry]); }
    });
    hits.sort(function (a, b) { return b[0] - a[0]; });
    hits.slice(0, 14).forEach(function (hit) {
      var entry = hit[1];
      var link = document.createElement("a");
      link.href = root + entry.u;
      var name = document.createElement("b");
      name.textContent = entry.t;
      var kind = document.createElement("i");
      kind.textContent = entry.k;
      var summary = document.createElement("span");
      summary.textContent = entry.s;
      link.appendChild(name);
      link.appendChild(kind);
      link.appendChild(summary);
      box.appendChild(link);
    });
    if (!hits.length) {
      var none = document.createElement("div");
      none.className = "none";
      none.textContent = "Nothing found.";
      box.appendChild(none);
    }
    box.hidden = false;
  }
  function move(step) {
    var links = box.querySelectorAll("a");
    if (!links.length) { return; }
    if (active >= 0) { links[active].classList.remove("on"); }
    active = (active + step + links.length) % links.length;
    links[active].classList.add("on");
    links[active].scrollIntoView({ block: "nearest" });
  }
  if (input && box) {
    input.addEventListener("input", search);
    input.addEventListener("focus", search);
    input.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") { event.preventDefault(); move(1); }
      else if (event.key === "ArrowUp") { event.preventDefault(); move(-1); }
      else if (event.key === "Enter") {
        var links = box.querySelectorAll("a");
        var pick = links[active >= 0 ? active : 0];
        if (pick) { location.href = pick.href; }
      } else if (event.key === "Escape") { box.hidden = true; input.blur(); }
    });
    document.addEventListener("click", function (event) {
      if (!event.target.closest(".search")) { box.hidden = true; }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { event.preventDefault(); input.focus(); }
    });
  }

  // sortable tables
  function cellValue(row, column) {
    var cell = row.cells[column];
    if (!cell) { return ""; }
    var raw = cell.getAttribute("data-sort");
    if (raw === null) { raw = cell.textContent; }
    raw = raw.trim();
    var number = parseFloat(raw.replace(/,/g, ""));
    return /^[-+]?[\d,]*\.?\d+%?$/.test(raw) && !isNaN(number) ? number : raw.toLowerCase();
  }
  Array.prototype.forEach.call(document.querySelectorAll("table.sortable"), function (table) {
    var heads = table.tHead ? table.tHead.rows[0].cells : [];
    Array.prototype.forEach.call(heads, function (head, column) {
      head.tabIndex = 0;
      function sort() {
        var descending = head.getAttribute("aria-sort") === "ascending";
        Array.prototype.forEach.call(heads, function (other) { other.removeAttribute("aria-sort"); });
        head.setAttribute("aria-sort", descending ? "descending" : "ascending");
        var body = table.tBodies[0];
        var rows = Array.prototype.slice.call(body.rows);
        rows.sort(function (a, b) {
          var x = cellValue(a, column);
          var y = cellValue(b, column);
          var result = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
          return descending ? -result : result;
        });
        rows.forEach(function (row) { body.appendChild(row); });
      }
      head.addEventListener("click", sort);
      head.addEventListener("keydown", function (event) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); sort(); } });
    });
  });

  // filters
  Array.prototype.forEach.call(document.querySelectorAll(".filters[data-target]"), function (bar) {
    var target = document.querySelector(bar.getAttribute("data-target"));
    if (!target) { return; }
    var items = target.tagName === "TABLE" ? target.tBodies[0].rows : target.children;
    var chosen = {};
    var text = "";
    function apply() {
      var shown = 0;
      Array.prototype.forEach.call(items, function (item) {
        var ok = true;
        for (var key in chosen) {
          if (!chosen[key]) { continue; }
          var have = (item.getAttribute("data-" + key) || "").split(/\s+/);
          if (have.indexOf(chosen[key]) < 0) { ok = false; }
        }
        if (ok && text && item.textContent.toLowerCase().indexOf(text) < 0) { ok = false; }
        item.hidden = !ok;
        shown += ok ? 1 : 0;
      });
      var count = bar.querySelector("[data-count]");
      if (count) { count.textContent = shown + " shown"; }
    }
    Array.prototype.forEach.call(bar.querySelectorAll("button[data-filter]"), function (button) {
      button.addEventListener("click", function () {
        var parts = button.getAttribute("data-filter").split("=");
        var key = parts[0];
        var value = parts[1] || "";
        chosen[key] = chosen[key] === value ? "" : value;
        Array.prototype.forEach.call(bar.querySelectorAll('button[data-filter^="' + key + '="]'), function (other) {
          other.setAttribute("aria-pressed", String(chosen[key] !== "" && other.getAttribute("data-filter") === key + "=" + chosen[key]));
        });
        apply();
      });
    });
    Array.prototype.forEach.call(bar.querySelectorAll("select[data-filter-key]"), function (select) {
      select.addEventListener("change", function () { chosen[select.getAttribute("data-filter-key")] = select.value; apply(); });
    });
    var box2 = bar.querySelector("input[data-search]");
    if (box2) { box2.addEventListener("input", function () { text = box2.value.trim().toLowerCase(); apply(); }); }
    apply();
  });
})();
