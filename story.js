(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Edit these for your user type. Everything below them is plumbing.
  // ---------------------------------------------------------------------------
  // metric_ids from GET /api/v1/metrics (or the public dictionary at wardwise.org).
  // Rows appear in this order; ids the API doesn't return for a ward are skipped.
  var METRICS = [
    "c311_response_days",
    "c311_rodent_days",
    "c311_pothole_days",
    "c311_street_light_days",
    "c311_graffiti_days",
    "street_flooding_complaints_per_10000_residents",
    "neighbor_collective_action_pct",
    "community_belonging_pct",
  ];
  var DEFAULT_WARD = "12";

  // Same origin when the page is served by serve.py or, once graduated, by www.wardwise.org
  // (CloudFront routes /api/* there). Anywhere else, call the API host directly.
  var SAME_ORIGIN = /(^|\.)wardwise\.org$|^localhost$|^127\.0\.0\.1$/.test(location.hostname);
  var API_BASE = SAME_ORIGIN ? "" : "https://penlight.wardwise.org";

  var $ = function (id) { return document.getElementById(id); };

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function show(id, html) {
    var el = $(id);
    el.innerHTML = html || "";
    el.hidden = !html;
  }

  var UNIT_SUFFIX = { percent: "%", days: " days", rate_per_10000: " per 10k residents", miles: " mi" };
  function formatValue(value, unit) {
    if (value == null) return "no value";
    var n = Math.abs(value) >= 100 ? Math.round(value).toLocaleString() : (+value).toFixed(1);
    if (unit === "currency") return "$" + n;
    return n + (UNIT_SUFFIX[unit] || (unit ? " " + unit : ""));
  }

  // The key lives in this closure only: never in localStorage, never in the URL, never logged.
  // A query-string key would end up in server logs and browser history (see the API docs).
  async function fetchWard(ward, key) {
    var res = await fetch(API_BASE + "/api/v1/wards/" + encodeURIComponent(ward), {
      headers: { "X-API-Key": key, "Accept": "application/json" },
    });
    var body = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      var err = new Error(body.detail || body.error || ("HTTP " + res.status));
      err.code = body.error;
      throw err;
    }
    return body;
  }

  async function fetchSample() {
    var res = await fetch("sample/ward_12.json");
    return res.json();
  }

  // One rank strip per metric. Rank 1 is always the best ward for that metric's direction,
  // so the strip runs worst → best left to right and "further right" means better on every row.
  function strip(metric) {
    var n = metric.wards_measured || 50;
    var y = 14;
    // Percent coordinates keep the dot round at any width (a stretched viewBox would squash it).
    var x = function (rank) { return (2 + 96 * (n - rank) / Math.max(n - 1, 1)).toFixed(2) + "%"; };
    var tip = metric.label + ": rank " + metric.rank + " of " + n + " (" +
      formatValue(metric.value, metric.unit) + "; average ward " + formatValue(metric.ward_average, metric.unit) + ")";
    return '<svg role="img" aria-label="' + esc(tip) + '">' +
      '<line class="track" x1="2%" x2="98%" y1="' + y + '" y2="' + y + '"/>' +
      '<line class="mid" x1="50%" x2="50%" y1="' + (y - 8) + '" y2="' + (y + 8) + '"/>' +
      // Invisible wider circle: a hover target bigger than the mark.
      '<g><title>' + esc(tip) + '</title>' +
      '<circle cx="' + x(metric.rank) + '" cy="' + y + '" r="14" fill="transparent"/>' +
      '<circle class="dot" cx="' + x(metric.rank) + '" cy="' + y + '" r="7"/></g>' +
      '</svg>';
  }

  function render(data, isSample) {
    var byId = {};
    (data.metrics || []).forEach(function (m) { byId[m.metric_id] = m; });
    var rows = METRICS.map(function (id) { return byId[id]; })
      .filter(function (m) { return m && m.rank != null; });

    $("chart-title").textContent = "Ward " + Number(data.ward && data.ward.ward_number || DEFAULT_WARD) +
      ", rank out of 50 wards" + (isSample ? " (sample numbers)" : "");

    if (!rows.length) {
      $("rows").innerHTML = "<p>None of this page's metrics have a value for this ward and year.</p>";
      return;
    }
    $("rows").innerHTML = rows.map(function (m) {
      return '<div class="row">' +
        '<div class="row-head"><strong>' + esc(m.label) + '</strong>' +
        '<span>rank ' + esc(m.rank) + ' of ' + esc(m.wards_measured || 50) + ' · ' +
        esc(formatValue(m.value, m.unit)) + ' (average ward ' + esc(formatValue(m.ward_average, m.unit)) + ')</span></div>' +
        strip(m) +
        '</div>';
    }).join("") +
      '<div class="row-head" aria-hidden="true"><span>← worse</span><span>better →</span></div>';
  }

  async function showSample(reason) {
    show("notice", "<strong>Sample numbers, made up.</strong> " + esc(reason));
    render(await fetchSample(), true);
  }

  async function onSubmit(event) {
    if (event) event.preventDefault();
    show("error", "");
    var ward = $("ward").value;
    var key = $("key").value.trim();
    if (!key) return showSample("Enter a Ward Wise API key to see real data for your ward.");
    try {
      var data = await fetchWard(ward, key);
      show("notice", "");
      render(data, false);
    } catch (err) {
      var msg;
      if (err.code === "api_key_required" || err.code === "api_key_invalid") {
        msg = "The API didn't accept that key (" + err.code + ").";
      } else if (err instanceof TypeError) {
        // fetch() throws TypeError on network and CORS failures; the API doesn't send CORS headers
        // for other sites yet, so a page on github.io lands here.
        msg = "The browser couldn't reach the API from this site. Run it locally with serve.py, " +
          "or graduate it into a ward-wise-frontend page (see the README).";
      } else {
        msg = "The API returned an error: " + err.message;
      }
      show("error", esc(msg));
      await showSample("Showing these until the real call works.");
    }
  }

  function init() {
    var options = "";
    for (var w = 1; w <= 50; w++) {
      options += '<option value="' + w + '"' + (String(w) === DEFAULT_WARD ? " selected" : "") + ">" + w + "</option>";
    }
    $("ward").innerHTML = options;
    $("controls").addEventListener("submit", onSubmit);
    showSample("Enter a Ward Wise API key to see real data for your ward.");
  }

  init();
})();
