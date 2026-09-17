/* Page navigation adapted from HomeBook Studio Web Exporter v9. No network APIs. */
(() => {
  'use strict';
  const book = window.TSUZURI_BOOK;
  if (!book || !Array.isArray(book.pages) || !book.pages.length) { document.body.textContent = '冊子データを読み込めませんでした。'; return; }
  const $ = id => document.getElementById(id), viewer = $('viewer'), stage = $('stage');
  let anchor = 0, group = 0, single = true, shown = [], pointer = null, zoom = 1;
  let readingMode = 'auto';
  const rtl = book.binding === 'right';
  const isGrid = () => $('mode').value === 'grid';
  const gridColumns = Number.isInteger(book.grid_columns) && book.grid_columns >= 1 && book.grid_columns <= 12 ? book.grid_columns : 5;
  const grid = $('page-grid'), gridButtons = [];
  grid.style.direction = rtl ? 'rtl' : 'ltr';
  function openPage(index = anchor) {
    anchor = index;
    if (isGrid()) $('mode').value = readingMode;
    thumbPanel(false); render(); viewer.focus();
  }
  function sizeGrid() {
    const width = Math.min(viewer.clientWidth, 2400), pad = innerWidth < 700 ? 32 : 48;
    const columns = Math.min(gridColumns, Math.max(1, Math.floor((width - pad + 16) / 136)));
    grid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
    $('overview-summary').textContent = `${book.pages.length}ページ / ${columns}列${columns < gridColumns ? `（設定 ${gridColumns}列）` : ''}`;
  }
  function showGrid() {
    if (!gridButtons.length) book.pages.forEach((page, index) => {
      const button = document.createElement('button'), img = document.createElement('img');
      const caption = document.createElement('span'), name = document.createElement('small');
      button.type = 'button'; button.className = 'grid-page';
      button.setAttribute('aria-label', `${page.label} / ${page.name}を開く`);
      img.src = page.src; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.draggable = false;
      img.style.aspectRatio = `${book.width} / ${book.height}`;
      img.addEventListener('error', () => { img.alt = `${page.label}：ページ画像が見つかりません`; });
      caption.textContent = page.label; name.textContent = page.name;
      button.append(img, caption, name); button.addEventListener('click', () => openPage(index));
      grid.append(button); gridButtons.push(button);
    });
    gridButtons.forEach((button, index) => button.setAttribute('aria-current', index === anchor ? 'page' : 'false'));
    sizeGrid();
    requestAnimationFrame(() => {
      gridButtons[anchor].focus({preventScroll:true});
      gridButtons[anchor].scrollIntoView({block:'nearest', inline:'nearest'});
    });
  }
  function paperStyle(value) {
    stage.setAttribute('data-paper', ['natural', 'soft', 'flat'].includes(value) ? value : 'natural');
  }
  const paperControl = $('paper');
  paperStyle(paperControl ? paperControl.value : 'natural');
  if (paperControl) paperControl.addEventListener('change', event => paperStyle(event.target.value));
  const isSingle = () => $('mode').value === 'single' || ($('mode').value === 'auto' && (innerWidth < 700 || innerHeight > innerWidth));
  function immersive(value) { document.body.classList.toggle('immersive', value); requestAnimationFrame(sizePages); }
  function thumbPanel(value) { $('thumbs').hidden = !value; $('thumb-toggle').setAttribute('aria-expanded', String(value)); if (value) $('thumb-close').focus(); }
  function sizePages() {
    if (isGrid()) { sizeGrid(); return; }
    if (!shown.length) return;
    const pad = innerWidth < 700 ? 24 : 48, cols = shown.length, ratio = book.width / book.height;
    const height = Math.max(20, Math.min(viewer.clientHeight - pad, (viewer.clientWidth - pad) / (ratio * cols))) * zoom;
    stage.style.width = `${height * ratio * cols}px`; stage.style.height = `${height}px`;
    stage.style.marginTop = `${Math.max(pad / 2, (viewer.clientHeight - height) / 2)}px`;
    stage.style.marginBottom = `${pad / 2}px`;
    for (const slot of stage.children) { slot.style.width = `${height * ratio}px`; slot.style.height = `${height}px`; }
  }
  function render() {
    const overview = isGrid();
    pointer = null; document.body.classList.remove('dragging');
    document.body.classList.toggle('overview-mode', overview);
    document.body.classList.toggle('zoomed', !overview && zoom > 1);
    stage.hidden = overview; $('overview').hidden = !overview; $('page-navigation').hidden = overview;
    $('grid-toggle').setAttribute('aria-pressed', String(overview));
    $('grid-toggle').textContent = overview ? '閲覧に戻る' : '一覧表示';
    for (const id of ['zoom','paper','hide-ui']) $(id).disabled = overview;
    $('view-hint').textContent = overview ? 'ページをクリックして開く / Escで戻る' : '中央をタップで操作を隠す';
    if (overview) { immersive(false); thumbPanel(false); showGrid(); return; }
    readingMode = $('mode').value;
    single = isSingle();
    anchor = Math.max(0, Math.min(book.pages.length - 1, anchor));
    group = single ? anchor : Math.max(0, book.spreads.findIndex(pair => pair.includes(anchor)));
    shown = single ? [anchor] : book.spreads[group];
    const facing = shown.length === 2 && shown.every(index => index !== null);
    stage.classList.toggle('open-book', facing);
    stage.classList.toggle('single-leaf', !facing);
    stage.replaceChildren();
    for (const [side, index] of shown.entries()) {
      const slot = document.createElement('div'); slot.className = 'page-slot';
      if (index === null) { slot.classList.add('blank'); slot.setAttribute('aria-hidden', 'true'); }
      else {
        slot.classList.add('paper-page');
        slot.classList.add(facing ? (side === 0 ? 'paper-left' : 'paper-right') : 'paper-alone');
        const page = book.pages[index], img = document.createElement('img');
        img.src = page.src; img.alt = `${page.label} / ${page.name}`; img.draggable = false;
        img.addEventListener('error', () => { img.classList.add('failed'); img.alt = `${page.label}：ページ画像が見つかりません。フォルダー全体をコピーしてください。`; });
        slot.append(img);
      }
      stage.append(slot);
    }
    const indices = shown.filter(i => i !== null), total = single ? book.pages.length : book.spreads.length;
    $('position').textContent = `${Math.min(...indices) + 1}${indices.length > 1 ? '–' + (Math.max(...indices) + 1) : ''} / ${book.pages.length}`;
    $('seek').max = total - 1; $('seek').value = group;
    $('previous').disabled = group === 0; $('next').disabled = group === total - 1;
    document.querySelectorAll('.thumb').forEach((button, i) => button.setAttribute('aria-current', indices.includes(i) ? 'page' : 'false'));
    sizePages(); viewer.scrollTop = 0; viewer.scrollLeft = 0;
  }
  function go(index) {
    if (isGrid()) return;
    const total = single ? book.pages.length : book.spreads.length;
    index = Math.max(0, Math.min(total - 1, index));
    if (index === group) return;
    anchor = single ? index : Math.min(...book.spreads[index].filter(i => i !== null)); render();
  }
  function move(delta) { go(group + delta); }
  $('title').textContent = book.title; document.title = book.title;
  $('previous').addEventListener('click', () => move(-1)); $('next').addEventListener('click', () => move(1));
  $('seek').addEventListener('input', event => go(Number(event.target.value)));
  $('mode').addEventListener('change', render);
  $('grid-toggle').addEventListener('click', () => {
    if (isGrid()) openPage();
    else { $('mode').value = 'grid'; render(); }
  });
  $('zoom').addEventListener('change', event => { zoom = Number(event.target.value); document.body.classList.toggle('zoomed', zoom > 1); sizePages(); });
  $('thumb-toggle').addEventListener('click', () => thumbPanel($('thumbs').hidden));
  $('thumb-close').addEventListener('click', () => { thumbPanel(false); $('thumb-toggle').focus(); });
  $('hide-ui').addEventListener('click', () => immersive(true)); $('restore-ui').addEventListener('click', () => immersive(false));
  $('fullscreen').addEventListener('click', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch (_) { $('fullscreen').textContent = '全画面を利用できません'; } });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { immersive(false); thumbPanel(false); if (isGrid()) openPage(); return; }
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (isGrid()) return; // Arrow/Home/End keys scroll the overview normally.
    if (event.key === 'ArrowLeft') { event.preventDefault(); move(rtl ? 1 : -1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); move(rtl ? -1 : 1); }
    if (event.key === 'Home') { event.preventDefault(); go(0); }
    if (event.key === 'End') { event.preventDefault(); go(single ? book.pages.length - 1 : book.spreads.length - 1); }
  });
  viewer.addEventListener('pointerdown', event => {
    if (isGrid() || event.button !== 0) return;
    pointer = { id:event.pointerId, x:event.clientX, y:event.clientY, left:viewer.scrollLeft, top:viewer.scrollTop, type:event.pointerType };
    viewer.setPointerCapture(event.pointerId);
    if (zoom > 1 && event.pointerType === 'mouse') document.body.classList.add('dragging');
  });
  viewer.addEventListener('pointermove', event => {
    if (pointer && zoom > 1 && pointer.type === 'mouse') { viewer.scrollLeft = pointer.left - event.clientX + pointer.x; viewer.scrollTop = pointer.top - event.clientY + pointer.y; }
  });
  viewer.addEventListener('pointercancel', () => { pointer = null; document.body.classList.remove('dragging'); });
  viewer.addEventListener('pointerup', event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y; pointer = null; document.body.classList.remove('dragging');
    if (zoom > 1) return;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) { move((dx < 0 ? 1 : -1) * (rtl ? -1 : 1)); return; }
    if (Math.abs(dx) + Math.abs(dy) > 15) return;
    const rect = viewer.getBoundingClientRect(), part = (event.clientX - rect.left) / rect.width;
    if (part < .25) move(rtl ? 1 : -1); else if (part > .75) move(rtl ? -1 : 1); else immersive(!document.body.classList.contains('immersive'));
  });
  book.pages.forEach((page, index) => {
    const button = document.createElement('button'), img = document.createElement('img'), caption = document.createElement('span');
    button.type = 'button'; button.className = 'thumb'; button.setAttribute('aria-label', `${page.label}へ移動`);
    img.src = page.thumb; img.alt = ''; img.loading = 'lazy'; caption.textContent = page.label; button.append(img, caption);
    button.addEventListener('click', () => openPage(index)); $('thumb-grid').append(button);
  });
  let pending = false;
  new ResizeObserver(() => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; if (isGrid()) sizeGrid(); else if (single !== isSingle()) render(); else sizePages(); }); }).observe(viewer);
  render();
})();
