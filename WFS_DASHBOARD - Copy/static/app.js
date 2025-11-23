let tableData = [];
let sortState = { key: null, asc: true };
let activeMaps = {};
let currentView = "data"; // 'data' or 'report'

window.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initProj4();
  initDropdowns();
  initDateInputs();

  document
    .getElementById("btn-load")
    .addEventListener("click", () => loadData(false));
  document
    .getElementById("btn-refresh")
    .addEventListener("click", () => loadData(true));
  document
    .getElementById("btn-excel")
    .addEventListener("click", exportReportToExcel);
  document
    .getElementById("tab-data")
    .addEventListener("click", () => switchView("data"));
  document
    .getElementById("tab-report")
    .addEventListener("click", () => switchView("report"));
  document.querySelectorAll("th.sortable").forEach((th) => {
    th.addEventListener("click", () => handleSort(th.dataset.key));
  });

  // როცა თემა იცვლება, ჩარტები უნდა განახლდეს ფერების შესაცვლელად
  document.getElementById("themeToggle").addEventListener("change", () => {
    if (currentView === "report") {
      updateCharts();
    }
  });
});

// --- ხედის გადართვა ---
function switchView(view) {
  currentView = view;
  const tabData = document.getElementById("tab-data");
  const tabReport = document.getElementById("tab-report");
  const viewTable = document.getElementById("view-table");
  const viewReport = document.getElementById("view-report");
  const sidebar = document.getElementById("sidebar-panel");

  if (view === "data") {
    tabData.classList.add("active");
    tabReport.classList.remove("active");
    viewTable.style.display = "block";
    viewReport.style.display = "none";
    sidebar.style.display = "block";
    renderTable();
  } else {
    tabData.classList.remove("active");
    tabReport.classList.add("active");
    viewTable.style.display = "none";
    viewReport.style.display = "block";
    renderReport();
  }
}

function cleanTagName(tag) {
  if (!tag) return "N/A";
  return tag.replace(/[0-9]/g, "").trim();
}

function getCategoryGroup(row) {
  if (row.CATEGORY === "1" || row.FUNCTION === "2") {
    return "საკარმიდამო";
  }
  return "სავარგული";
}

let chartInstances = {};

function renderReport() {
  if (!tableData || tableData.length === 0) {
    document.querySelector("#report-tbl tbody").innerHTML =
      "<tr><td colspan='5'>მონაცემები არ არის</td></tr>";
    return;
  }

  updateKPIs();
  updateCharts();
  renderPivotTable();
}

function updateKPIs() {
  const total = tableData.length;
  const zones = new Set(tableData.map((d) => d.ZONE).filter(Boolean));

  const tagCounts = {};
  tableData.forEach((d) => {
    const t = cleanTagName(d.TAG);
    tagCounts[t] = (tagCounts[t] || 0) + 1;
  });
  let topTag = "-";
  let maxCount = 0;
  for (const [t, c] of Object.entries(tagCounts)) {
    if (c > maxCount) {
      maxCount = c;
      topTag = t;
    }
  }

  let cat1 = 0,
    cat2 = 0;
  tableData.forEach((d) => {
    if (getCategoryGroup(d) === "საკარმიდამო") cat1++;
    else cat2++;
  });

  animateValue("kpi-total", total);
  document.getElementById("kpi-zones").innerText = zones.size;
  document.getElementById("kpi-top-tag").innerText = `${topTag} (${maxCount})`;
  document.getElementById("kpi-cat-ratio").innerText = `${cat1} / ${cat2}`;
}

function animateValue(id, end) {
  const obj = document.getElementById(id);
  if (!obj) return;
  const start = parseInt(obj.innerText) || 0;
  if (start === end) return;
  let current = start;
  const range = end - start;
  const increment = end > start ? 1 : -1;
  const step = Math.abs(Math.floor(2000 / range));
  const timer = setInterval(() => {
    current += increment;
    obj.innerText = current;
    if (current == end) clearInterval(timer);
  }, Math.max(step, 10));
  obj.innerText = end;
}

function updateCharts() {
  const groupBy = (keyFn) => {
    const counts = {};
    tableData.forEach((d) => {
      const k = keyFn(d);
      counts[k] = (counts[k] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  const tagData = groupBy((d) => cleanTagName(d.TAG)).slice(0, 15);
  createChart("chartTag", "bar", {
    labels: tagData.map((x) => x[0]),
    datasets: [
      {
        label: "რაოდენობა",
        data: tagData.map((x) => x[1]),
        backgroundColor: "#1e40af",
        borderRadius: 4,
      },
    ],
  });

  const zoneData = groupBy((d) => d.ZONE || "N/A");
  createChart("chartZone", "doughnut", {
    labels: zoneData.map((x) => x[0]),
    datasets: [
      {
        data: zoneData.map((x) => x[1]),
        backgroundColor: [
          "#3b82f6",
          "#ef4444",
          "#10b981",
          "#f59e0b",
          "#8b5cf6",
          "#6366f1",
        ],
      },
    ],
  });

  const dateCounts = {};
  tableData.forEach((d) => {
    const date = d.DATE_ ? d.DATE_.split(" ")[0] : "N/A";
    dateCounts[date] = (dateCounts[date] || 0) + 1;
  });
  const sortedDates = Object.keys(dateCounts).sort();
  createChart("chartDate", "line", {
    labels: sortedDates,
    datasets: [
      {
        label: "შესრულებული სამუშაო",
        data: sortedDates.map((d) => dateCounts[d]),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        fill: true,
        tension: 0.3,
      },
    ],
  });

  const catData = groupBy((d) => getCategoryGroup(d));
  createChart("chartCat", "pie", {
    labels: catData.map((x) => x[0]),
    datasets: [
      {
        data: catData.map((x) => x[1]),
        backgroundColor: ["#8b5cf6", "#f59e0b"],
      },
    ],
  });
}

function createChart(canvasId, type, dataConfig) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  // --- Dark Mode-ის შემოწმება ---
  const isDark = document.body.classList.contains("theme-dark");
  const textColor = isDark ? "#e5e5e5" : "#171717";
  const gridColor = isDark ? "#333333" : "#e2e8f0";

  // Chart.js-ის გლობალური ფერების კონფიგურაცია (სურვილისამებრ)
  Chart.defaults.color = textColor;
  Chart.defaults.borderColor = gridColor;

  chartInstances[canvasId] = new Chart(ctx, {
    type: type,
    data: dataConfig,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: type !== "bar",
          labels: { color: textColor }, // ლეგენდის ფერი
        },
        tooltip: { mode: "index", intersect: false },
      },
      scales:
        type === "bar" || type === "line"
          ? {
              y: {
                beginAtZero: true,
                grid: { color: gridColor },
                ticks: { color: textColor },
              },
              x: {
                grid: { display: false },
                ticks: { color: textColor },
              },
            }
          : {},
    },
  });
}

// --- განახლებული Pivot Table (Excel-ის სტილი + მოკლე თარიღები) ---
function renderPivotTable() {
  const thead = document.querySelector("#report-tbl thead");
  const tbody = document.querySelector("#report-tbl tbody");
  tbody.innerHTML = "";
  thead.innerHTML = "";

  const pivotData = {};
  const allDates = new Set();

  // 1. მონაცემების დაჯგუფება
  tableData.forEach((row) => {
    const tag = cleanTagName(row.TAG);
    const dateRaw = row.DATE_ ? row.DATE_.split(" ")[0] : "უცნობი";
    const category = getCategoryGroup(row);

    allDates.add(dateRaw);

    if (!pivotData[tag]) {
      pivotData[tag] = {
        grandTotal: 0,
        sakarmidamo: {},
        savarguli: {},
      };
    }

    pivotData[tag].grandTotal++;

    if (category === "საკარმიდამო") {
      if (!pivotData[tag].sakarmidamo[dateRaw])
        pivotData[tag].sakarmidamo[dateRaw] = 0;
      pivotData[tag].sakarmidamo[dateRaw]++;
    } else {
      if (!pivotData[tag].savarguli[dateRaw])
        pivotData[tag].savarguli[dateRaw] = 0;
      pivotData[tag].savarguli[dateRaw]++;
    }
  });

  const sortedDates = Array.from(allDates).sort();
  const isDark = document.body.classList.contains("theme-dark");

  // 2. ჰედერის აწყობა (მოკლე თარიღებით: 21.11)
  let headerHTML = `<tr>
    <th style="width: 80px; text-align: center;">ჯამურად</th>
    <th style="width: 100px; text-align: center;">TAG</th>
    <th style="width: 120px;">კატეგორია</th>`;

  sortedDates.forEach((d) => {
    // d არის მაგ: "2025-11-21". ჩვენ გვინდა "21.11"
    const parts = d.split("-");
    let shortDate = d;
    if (parts.length === 3) {
      shortDate = `${parts[2]}.${parts[1]}`; // დღე.თვე
    }
    headerHTML += `<th>${shortDate}</th>`;
  });
  headerHTML += "</tr>";
  thead.innerHTML = headerHTML;

  // 3. ტანის აწყობა
  Object.keys(pivotData)
    .sort()
    .forEach((tag) => {
      const data = pivotData[tag];

      let sakBg = isDark ? "#4c1d95" : "#e9d5ff";
      let normBg = isDark ? "#1e1e1e" : "#ffffff";
      let mainBg = isDark ? "#1e1e1e" : "#ffffff";
      let textCol = isDark ? "#e5e5e5" : "#000";

      // რიგი 1: საკარმიდამო (Merged Cells)
      const trSak = document.createElement("tr");
      trSak.innerHTML += `<td rowspan="2" style="font-weight: 800; font-size: 1.1rem; text-align: center; background: ${mainBg}; color: ${textCol}; vertical-align: middle;">${data.grandTotal}</td>`;
      trSak.innerHTML += `<td rowspan="2" style="font-weight: bold; text-align: center; background: ${mainBg}; color: ${textCol}; vertical-align: middle;">${tag}</td>`;
      trSak.innerHTML += `<td style="background: ${sakBg}; color: ${textCol}; font-weight: 500;">საკარმიდამო</td>`;

      sortedDates.forEach((date) => {
        const val = data.sakarmidamo[date] || 0;
        const cellStyle = `text-align: center; background: ${sakBg}; color: ${textCol}; ${
          val ? "font-weight: bold;" : "opacity: 0.5;"
        }`;
        trSak.innerHTML += `<td style="${cellStyle}">${val || "-"}</td>`;
      });

      // რიგი 2: სავარგული
      const trSav = document.createElement("tr");
      trSav.innerHTML += `<td style="background: ${normBg}; color: ${textCol}; font-weight: 500;">სავარგული</td>`;

      sortedDates.forEach((date) => {
        const val = data.savarguli[date] || 0;
        const cellStyle = `text-align: center; background: ${normBg}; color: ${textCol}; ${
          val ? "font-weight: bold;" : "opacity: 0.5;"
        }`;
        trSav.innerHTML += `<td style="${cellStyle}">${val || "-"}</td>`;
      });

      tbody.appendChild(trSak);
      tbody.appendChild(trSav);
    });
}

function loadData(forceRefresh = false) {
  const z = document.getElementById("f-zone").value.trim();
  const s = document.getElementById("f-sector").value.trim();
  const df = document.getElementById("f-from").value;
  let dt = document.getElementById("f-to").value;
  const azVals = [
    ...document.querySelectorAll(
      ".az-menu label:not(.select-all-label) .az-opt:checked"
    ),
  ].map((c) => c.value);

  const qs = new URLSearchParams();
  if (z) qs.set("zone", splitMulti(z).join(" "));
  if (s) qs.set("sector", splitMulti(s).join(" "));
  if (df && !dt) dt = df;
  if (df) qs.set("date_from", df);
  if (dt) qs.set("date_to", dt);
  if (azVals.length) qs.set("azomvis", azVals.join(" "));
  if (forceRefresh) qs.set("refresh", "1");

  setStatus(forceRefresh ? "განახლება..." : "იტვირთება…");

  // ეს უნდა იყოს async ფუნქციის შიგნით, ამიტომ ვაბრუნებთ wrapper-ს
  (async () => {
    try {
      const res = await fetch("/api/data?" + qs.toString());
      if (!res.ok) throw new Error(`HTTP error! ${res.status}`);
      const data = await res.json();

      tableData = data.items || [];

      if (currentView === "data") {
        if (sortState.key) doSort(sortState.key, sortState.asc);
        renderTable();
      } else {
        renderReport();
      }

      setStatus(`მიუღებულია: ${data.count} ჩანაწერი`);
    } catch (error) {
      setStatus(`შეცდომა: ${error.message}`);
    }
  })();
}

function renderTable() {
  const tbody = document.querySelector("#tbl tbody");
  if (!tbody) return;
  activeMaps = {};
  tbody.innerHTML = "";
  tableData.forEach((row, i) => {
    const mapId = `map-${i}`,
      expId = `exp-${i}`;
    const geomText = row.wkt_geom
      ? JSON.stringify(row.wkt_geom)
      : '{"type": "Point", "coordinates": [44.78, 41.72]}';
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${row.TAG || ""}</td><td>${row.CADCODE || ""}</td><td>${
      row.DATE_ || ""
    }</td><td>${row.ZONE || ""}</td><td>${row.SECTOR || ""}</td><td>${
      row.FUNCTION_LABEL || row.FUNCTION || ""
    }</td><td>${row.CATEGORY_LABEL || row.CATEGORY || ""}</td><td>${
      row.AZOMVIS_TIPI_LABEL || row.AZOMVIS_TIPI || ""
    }</td><td><button class="btn blue btn-draw" data-i="${i}">ნახაზი</button></td>`;
    const trExp = document.createElement("tr");
    trExp.className = "expander-row";
    trExp.id = expId;
    trExp.innerHTML = `<td colspan="9"><div class="mini-detail"><div id="${mapId}" class="mini-map"></div><textarea class="geom-text" readonly>${geomText}</textarea></div></td>`;
    tr.querySelector(".btn-draw").addEventListener("click", (e) => {
      const btn = e.currentTarget,
        exp = document.getElementById(expId),
        isOpen = exp.style.display === "table-row";
      btn.classList.toggle("active", !isOpen);
      if (isOpen) {
        exp.style.display = "none";
        if (activeMaps[mapId]) {
          activeMaps[mapId].remove();
          delete activeMaps[mapId];
        }
      } else {
        exp.style.display = "table-row";
        initMiniMap(i, geomText);
        setTimeout(() => {
          if (activeMaps[mapId]) activeMaps[mapId].invalidateSize();
        }, 150);
      }
    });
    tbody.appendChild(tr);
    tbody.appendChild(trExp);
  });
}
function handleSort(key) {
  if (sortState.key === key) sortState.asc = !sortState.asc;
  else {
    sortState.key = key;
    sortState.asc = true;
  }
  doSort(key, sortState.asc);
  updateSortIcons();
  renderTable();
}
function doSort(key, asc) {
  tableData.sort((a, b) => {
    let valA = a[key] ? a[key].toString().toLowerCase() : "";
    let valB = b[key] ? b[key].toString().toLowerCase() : "";
    const numA = parseFloat(valA),
      numB = parseFloat(valB);
    let comp =
      !isNaN(numA) && !isNaN(numB) && isFinite(valA) && isFinite(valB)
        ? numA - numB
        : valA.localeCompare(valB);
    return asc ? comp : -comp;
  });
}
function updateSortIcons() {
  document.querySelectorAll(".sort-icon").forEach((i) => (i.innerText = ""));
  if (sortState.key) {
    const th = document.querySelector(`th[data-key="${sortState.key}"]`);
    if (th)
      th.querySelector(".sort-icon").innerText = sortState.asc ? "▲" : "▼";
  }
}
function initProj4() {
  if (typeof proj4 !== "undefined") {
    proj4.defs(
      "EPSG:32638",
      "+proj=utm +zone=38 +ellps=WGS84 +units=m +no_defs"
    );
    proj4.defs("WGS84", "+proj=longlat +ellps=WGS84 +no_defs");
  }
}
function initDateInputs() {
  const f = document.getElementById("f-from");
  if (f) {
    f.value = new Date().toISOString().slice(0, 10);
    document.getElementById("f-to").value = "";
  }
}
function initDropdowns() {
  const d = document.getElementById("az-selected"),
    m = document.getElementById("az-menu"),
    ok = document.getElementById("az-ok"),
    all = document.getElementById("az-select-all"),
    chks = document.querySelectorAll(".az-menu .az-opt");
  if (d) {
    d.addEventListener("click", () => m.classList.toggle("show"));
    ok.addEventListener("click", () => {
      m.classList.remove("show");
      updateAz();
    });
    if (all)
      all.addEventListener("change", (e) => {
        chks.forEach((c) => (c.checked = e.target.checked));
        updateAz();
      });
    chks.forEach((c) =>
      c.addEventListener("change", () => {
        if (all) all.checked = [...chks].every((x) => x.checked);
        updateAz();
      })
    );
    updateAz();
  }
  function updateAz() {
    const c = [...chks].filter((x) => x.checked),
      txt =
        c.length === 0
          ? "არცერთი"
          : c.length === chks.length
          ? "ყველა"
          : c.map((x) => x.closest("label").innerText).join(", ");
    d.innerText = txt + " ▼";
  }
}
function splitMulti(s) {
  return s
    ? [...new Set(s.replace(/,/g, " ").split(/\s+/).filter(Boolean))]
    : [];
}
function setStatus(t) {
  document.getElementById("status").innerText = t;
}
function initTheme() {
  const t = localStorage.getItem("theme");
  if (t) document.body.className = t;
  const c = document.getElementById("themeToggle");
  if (c) {
    c.checked = t === "theme-dark";
    c.addEventListener("change", () => {
      document.body.className = c.checked ? "theme-dark" : "theme-light";
      localStorage.setItem("theme", document.body.className);
    });
  }
}
function initMiniMap(idx, txt) {
  if (typeof L === "undefined") return;
  const mid = `map-${idx}`,
    el = document.getElementById(mid);
  if (!el) return;
  if (activeMaps[mid]) {
    activeMaps[mid].remove();
    delete activeMaps[mid];
  }
  const m = L.map(el, { zoomControl: true, attributionControl: false }).setView(
    [41.72, 44.78],
    9
  );
  activeMaps[mid] = m;
  L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
    maxZoom: 20,
  }).addTo(m);
  try {
    const g = JSON.parse(txt.replace(/^"|"$/g, "").replace(/\\"/g, '"'));
    if (g) {
      const l = L.geoJSON(
        { ...g, coordinates: reprojectCoordinates(g.coordinates) },
        {
          style: (f) => ({ color: "#ff7800", weight: 3 }),
          pointToLayer: (f, ll) =>
            L.circleMarker(ll, {
              radius: 6,
              fillColor: "#ff7800",
              color: "#000",
            }),
        }
      ).addTo(m);
      if (l.getBounds().isValid()) m.fitBounds(l.getBounds());
    }
  } catch (e) {}
}
function reprojectCoordinates(c) {
  if (Array.isArray(c) && c.length === 2 && typeof c[0] === "number")
    return proj4("EPSG:32638", "WGS84", c);
  return c.map(reprojectCoordinates);
}
// --- Excel ექსპორტი ---
function exportReportToExcel() {
  const table = document.getElementById("report-tbl");
  if (!table || table.rows.length < 2) {
    alert("მონაცემები არ არის");
    return;
  }
  // ქმნის Excel ფაილს ცხრილის სტრუქტურის მიხედვით (Merged Cells შენარჩუნდება)
  const wb = XLSX.utils.table_to_book(table, { sheet: "Report" });
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `WFS_Report_${dateStr}.xlsx`);
}
