// ==UserScript==
// @name         GitHub Contribution Shooter
// @namespace    https://github.com/
// @version      1.0
// @description  Pesawat kecil terbang di atas grafik kontribusi GitHub dan "menembaki" kotak-kotaknya (efek visual saja, tidak mengubah data).
// @author       you
// @match        https://github.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  function findGraphSvg() {
    // Grafik kontribusi ada di dalam elemen dengan class "js-calendar-graph-svg" atau
    // container dengan data-testid berbeda tergantung layout GitHub saat ini.
    return (
      document.querySelector('.js-calendar-graph-svg') ||
      document.querySelector('svg.ContributionCalendar-grid') ||
      document.querySelector('[data-testid="calendar-graph"] svg')
    );
  }

  function getCells(svg) {
    // Setiap kotak kontribusi biasanya <rect> atau <td> tergantung versi GitHub.
    let cells = Array.from(svg.querySelectorAll('rect.ContributionCalendar-day'));
    if (cells.length === 0) {
      cells = Array.from(svg.querySelectorAll('rect'));
    }
    return cells;
  }

  function init() {
    const svg = findGraphSvg();
    if (!svg) return; // bukan halaman profil, atau grafik belum termuat

    const cells = getCells(svg);
    if (cells.length === 0) return;

    const container = svg.closest('div') || svg.parentElement;
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }

    // Buat layer overlay untuk pesawat + efek tembakan
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '9999';
    container.appendChild(overlay);

    const plane = document.createElement('div');
    plane.textContent = '✈️';
    plane.style.position = 'absolute';
    plane.style.fontSize = '18px';
    plane.style.transition = 'left 0.35s linear, top 0.35s linear';
    plane.style.transform = 'translate(-50%, -50%) rotate(90deg)';
    overlay.appendChild(plane);

    const containerRect = () => container.getBoundingClientRect();

    function cellCenter(cell) {
      const r = cell.getBoundingClientRect();
      const c = containerRect();
      return {
        x: r.left - c.left + r.width / 2,
        y: r.top - c.top + r.height / 2,
      };
    }

    function shootAt(cell) {
      const { x, y } = cellCenter(cell);

      // gerakkan pesawat ke atas target
      plane.style.left = x + 'px';
      plane.style.top = (y - 20) + 'px';

      setTimeout(() => {
        // efek "peluru"
        const bullet = document.createElement('div');
        bullet.style.position = 'absolute';
        bullet.style.left = x + 'px';
        bullet.style.top = (y - 18) + 'px';
        bullet.style.width = '3px';
        bullet.style.height = '8px';
        bullet.style.background = '#ffdd55';
        bullet.style.borderRadius = '2px';
        bullet.style.transition = 'top 0.15s linear';
        overlay.appendChild(bullet);

        requestAnimationFrame(() => {
          bullet.style.top = y + 'px';
        });

        setTimeout(() => {
          bullet.remove();

          // efek ledakan pada kotak
          const originalFill = cell.getAttribute('fill');
          const originalStyle = cell.style.filter;
          cell.style.filter = 'brightness(3) drop-shadow(0 0 4px orange)';
          if (originalFill) cell.setAttribute('fill', '#ff5500');

          const boom = document.createElement('div');
          boom.textContent = '💥';
          boom.style.position = 'absolute';
          boom.style.left = x + 'px';
          boom.style.top = y + 'px';
          boom.style.fontSize = '14px';
          boom.style.transform = 'translate(-50%, -50%)';
          overlay.appendChild(boom);

          setTimeout(() => {
            boom.remove();
            cell.style.filter = originalStyle;
            if (originalFill) cell.setAttribute('fill', originalFill);
          }, 200);
        }, 150);
      }, 300);
    }

    let i = 0;
    // tembak kotak secara berurutan (bisa juga diacak dengan cells.sort(()=>Math.random()-0.5))
    const interval = setInterval(() => {
      if (i >= cells.length) {
        clearInterval(interval);
        setTimeout(() => overlay.remove(), 1000);
        return;
      }
      shootAt(cells[i]);
      i++;
    }, 400);
  }

  // Tunggu grafik kontribusi selesai dimuat (kadang dimuat via AJAX)
  const observer = new MutationObserver(() => {
    if (findGraphSvg()) {
      observer.disconnect();
      setTimeout(init, 500);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // fallback jika sudah ada saat load
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (findGraphSvg()) init();
    }, 1000);
  });
})();
