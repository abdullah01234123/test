(() => {
  'use strict';

  const catalog = Array.isArray(window.REELSHELF_CATALOG) ? window.REELSHELF_CATALOG : [];
  const categories = ['All', 'Movie', 'Series', 'Animation', 'Documentary', 'Short Film'];
  const genres = ['Sci-Fi', 'Adventure', 'Drama', 'Romance', 'Mystery', 'Thriller', 'South Asian', 'Family', 'Crime', 'Nature', 'Fantasy'];
  const languages = ['All languages', 'English', 'Urdu'];
  const params = new URLSearchParams(window.location.search);
  const requestedCategory = params.get('category') || 'All';
  const currentCategory = categories.includes(requestedCategory) ? requestedCategory : 'All';
  const currentGenre = genres.includes(params.get('genre') || '') ? (params.get('genre') || '') : '';
  const requestedLanguage = params.get('language') || 'All languages';
  const currentLanguage = languages.includes(requestedLanguage) ? requestedLanguage : 'All languages';
  const query = (params.get('q') || '').trim();
  const slug = (params.get('movie') || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  const detail = slug ? catalog.find(item => item.slug === slug) : null;
  const featured = catalog.find(item => item.featured) || catalog[0];
  const main = document.getElementById('main-content');
  const searchInput = document.getElementById('site-search');
  const searchForm = document.getElementById('search-form');
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');

  if (!main) return;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  function listingUrl(overrides = {}) {
    const state = {
      category: currentCategory,
      genre: currentGenre,
      language: currentLanguage,
      q: query,
      ...overrides
    };
    const next = new URLSearchParams();
    if (state.category && state.category !== 'All') next.set('category', state.category);
    if (state.genre) next.set('genre', state.genre);
    if (state.language && state.language !== 'All languages') next.set('language', state.language);
    if (state.q) next.set('q', state.q);
    const search = next.toString();
    return search ? `?${search}` : './';
  }

  const detailUrl = item => `?movie=${encodeURIComponent(item.slug)}`;
  const officialUrl = title => `https://www.justwatch.com/pk/search?q=${encodeURIComponent(title)}`;

  function cardMarkup(item) {
    const cardGenres = item.genres.slice(0, 2).join(' · ');
    return `
      <a class="movie-card" href="${detailUrl(item)}" aria-label="View details for ${escapeHtml(item.title)}">
        <div class="poster-wrap">
          <img loading="lazy" src="${escapeHtml(item.poster)}" alt="Original artwork for ${escapeHtml(item.title)}">
          <span class="quality-badge">${escapeHtml(item.quality)}</span>
          ${item.featured ? '<span class="featured-badge">EDITOR\'S PICK</span>' : ''}
          <span class="poster-hover">View details <b>↗</b></span>
        </div>
        <div class="movie-info">
          <div class="movie-subline"><span>${escapeHtml(item.year)}</span><span>${escapeHtml(item.kind)}</span></div>
          <h3>${escapeHtml(item.title)}</h3>
          <div class="movie-genres">${escapeHtml(cardGenres)}</div>
          <div class="card-bottom"><span>${escapeHtml(item.language)}</span><span class="card-rating"><b>★</b> ${escapeHtml(item.rating)}</span></div>
        </div>
      </a>`;
  }

  function relatedCardMarkup(item) {
    return `
      <a class="movie-card" href="${detailUrl(item)}" aria-label="View details for ${escapeHtml(item.title)}">
        <div class="poster-wrap"><img loading="lazy" src="${escapeHtml(item.poster)}" alt="Original artwork for ${escapeHtml(item.title)}"><span class="quality-badge">${escapeHtml(item.quality)}</span><span class="poster-hover">View details <b>↗</b></span></div>
        <div class="movie-info"><div class="movie-subline"><span>${escapeHtml(item.year)}</span><span>${escapeHtml(item.kind)}</span></div><h3>${escapeHtml(item.title)}</h3><div class="movie-genres">${escapeHtml(item.genres.slice(0, 2).join(' · '))}</div></div>
      </a>`;
  }

  function categoryLabel(category) {
    return ({ All: 'All titles', Movie: 'Movies', Documentary: 'Documentaries', 'Short Film': 'Short films' })[category] || category;
  }

  function renderFilters() {
    const categoryChips = categories.map(category => `
      <a class="filter-chip ${currentCategory === category && !currentGenre ? 'selected' : ''}" href="${listingUrl({ category, genre: '' })}">${escapeHtml(categoryLabel(category))}</a>`).join('');
    const genreChips = [
      `<a class="filter-chip ${!currentGenre ? 'selected' : ''}" href="${listingUrl({ genre: '' })}">All genres</a>`,
      ...genres.map(genre => `<a class="filter-chip ${currentGenre === genre ? 'selected' : ''}" href="${listingUrl({ genre, category: 'All' })}">${escapeHtml(genre)}</a>`)
    ].join('');
    const languageChips = languages.map(language => `
      <a class="filter-chip ${currentLanguage === language ? 'selected' : ''}" href="${listingUrl({ language })}">${escapeHtml(language)}</a>`).join('');
    return `
      <div class="filter-group"><span class="filter-group-label">TYPE</span><div class="filter-row" aria-label="Filter titles by type">${categoryChips}</div></div>
      <div class="filter-group"><span class="filter-group-label">GENRE</span><div class="filter-row" aria-label="Filter titles by genre">${genreChips}</div></div>
      <div class="filter-group"><span class="filter-group-label">LANGUAGE</span><div class="filter-row" aria-label="Filter titles by language">${languageChips}</div></div>`;
  }

  function renderHero() {
    if (!featured) return '';
    return `
      <section class="hero" id="top">
        <div class="hero-art"><img src="${escapeHtml(featured.poster)}" alt="Original artwork for ${escapeHtml(featured.title)}"></div>
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <div class="hero-kicker"><span class="kicker-dot"></span> FEATURED STORY <span class="kicker-rule"></span> ${escapeHtml(featured.year)}</div>
          <h1>${escapeHtml(featured.title)}</h1>
          <p class="hero-tagline">${escapeHtml(featured.tagline)}</p>
          <div class="hero-meta"><span class="hero-rating">★ ${escapeHtml(featured.rating)}</span><span>${escapeHtml(featured.kind)}</span><span>${escapeHtml(featured.runtime)}</span><span class="quality-pill">${escapeHtml(featured.quality)}</span></div>
          <p class="hero-description">${escapeHtml(featured.synopsis)}</p>
          <div class="hero-actions"><a class="primary-button" href="${detailUrl(featured)}">Explore title <span>→</span></a><a class="secondary-button" href="${officialUrl(featured.title)}" target="_blank" rel="noopener noreferrer">Official viewing options <span>↗</span></a></div>
        </div>
        <div class="hero-index"><span>01</span><span class="index-line"></span><span>${String(catalog.length).padStart(2, '0')}</span><small>CURATED DEMOS</small></div>
        <div class="hero-bottom-label">STORIES THAT STAY WITH YOU</div>
      </section>`;
  }

  function getResults() {
    const needle = query.toLocaleLowerCase();
    return catalog.filter(item => {
      const categoryMatch = currentCategory === 'All' || item.kind === currentCategory;
      const genreMatch = !currentGenre || item.genres.includes(currentGenre);
      const languageMatch = currentLanguage === 'All languages' || item.language === currentLanguage;
      const searchable = `${item.title} ${item.kind} ${item.genres.join(' ')} ${item.language} ${item.year} ${item.synopsis}`.toLocaleLowerCase();
      const queryMatch = !needle || searchable.includes(needle);
      return categoryMatch && genreMatch && languageMatch && queryMatch;
    });
  }

  function renderCatalog() {
    const results = getResults();
    const heading = query ? `Results for “${escapeHtml(query)}”` : currentGenre ? escapeHtml(currentGenre) : currentCategory !== 'All' ? escapeHtml(categoryLabel(currentCategory)) : 'Explore the shelf';
    const eyebrow = query ? 'SEARCH RESULTS' : (currentCategory === 'All' && !currentGenre && currentLanguage === 'All languages' ? 'HANDPICKED FOR YOU' : 'BROWSE COLLECTION');
    const titleGrid = results.length
      ? `<div class="poster-grid">${results.map(cardMarkup).join('')}</div>`
      : `<div class="empty-state"><div class="empty-icon">⌕</div><h3>No titles found</h3><p>Try a different title, language, genre, or category.</p><a class="secondary-button" href="./">Clear filters <span>↗</span></a></div>`;

    return `
      ${!query && currentCategory === 'All' && !currentGenre && currentLanguage === 'All languages' ? renderHero() : ''}
      <section class="section-block catalog-block">
        <div class="section-heading"><div><span class="eyebrow">${eyebrow}</span><h2>${heading}</h2><p class="section-subtitle">Distinct stories, thoughtful picks, and something new to discover.</p></div><div class="result-count"><strong>${results.length}</strong><span>${results.length === 1 ? 'TITLE' : 'TITLES'}</span></div></div>
        ${renderFilters()}
        ${titleGrid}
        <div class="catalog-footnote"><span class="footnote-icon">✦</span><span>All titles and poster artwork on this starter site are fictional demo content. Add only media you have permission to promote.</span></div>
      </section>`;
  }

  function renderDetail(item) {
    const related = catalog.filter(candidate => candidate.slug !== item.slug).slice(0, 4);
    return `
      <div class="breadcrumbs"><a href="./">Discover</a><span>›</span><span>${escapeHtml(item.title)}</span></div>
      <section class="detail-layout">
        <div class="detail-poster"><img src="${escapeHtml(item.poster)}" alt="Original artwork for ${escapeHtml(item.title)}"><span class="poster-badge">${escapeHtml(item.quality)}</span></div>
        <div class="detail-copy">
          <div class="eyebrow">REELSHELF PICK <span class="eyebrow-line"></span></div>
          <h1>${escapeHtml(item.title)}</h1>
          <p class="detail-tagline">${escapeHtml(item.tagline)}</p>
          <div class="metadata"><span>${escapeHtml(item.year)}</span><i></i><span>${escapeHtml(item.kind)}</span><i></i><span>${escapeHtml(item.runtime)}</span><i></i><span>${escapeHtml(item.language)}</span></div>
          <div class="detail-rating"><span class="star">★</span><strong>${escapeHtml(item.rating)}</strong><span class="rating-caption">sample editorial score</span></div>
          <p class="detail-synopsis">${escapeHtml(item.synopsis)}</p>
          <div class="genre-list">${item.genres.map(genre => `<a href="${listingUrl({ genre, category: 'All' })}">${escapeHtml(genre)}</a>`).join('')}</div>
          <a class="primary-button" href="${officialUrl(item.title)}" target="_blank" rel="noopener noreferrer">Find official viewing options <span>↗</span></a>
          <p class="legal-note">Availability varies by country. ReelShelf does not host video files or provide unauthorized downloads.</p>
        </div>
      </section>
      <section class="section-block related-block"><div class="section-heading"><div><span class="eyebrow">KEEP EXPLORING</span><h2>You might also like</h2></div><a class="text-link" href="./">View all titles <span>→</span></a></div><div class="poster-grid compact-grid">${related.map(relatedCardMarkup).join('')}</div></section>`;
  }

  function renderNotFound() {
    return `<section class="empty-state title-not-found"><div class="empty-icon">⌕</div><h3>Title not found</h3><p>This title may have been removed or the link may be incorrect.</p><a class="secondary-button" href="./">Return to the catalogue <span>↗</span></a></section>`;
  }

  function updatePageMetadata() {
    const pageTitle = detail ? `${detail.title} — ReelShelf` : currentGenre ? `${currentGenre} — ReelShelf` : currentCategory !== 'All' ? `${categoryLabel(currentCategory)} — ReelShelf` : 'Discover films and series — ReelShelf';
    document.title = pageTitle;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = detail ? detail.synopsis : 'Discover original film and series listings, browse by category, and find official viewing options with ReelShelf.';
    document.querySelectorAll('[data-nav-category]').forEach(link => {
      const target = link.getAttribute('data-nav-category');
      link.classList.toggle('active', !detail && currentCategory === target && !currentGenre);
    });
  }

  main.innerHTML = slug ? (detail ? renderDetail(detail) : renderNotFound()) : renderCatalog();
  updatePageMetadata();
  if (searchInput) searchInput.value = query;
  const year = document.getElementById('current-year');
  if (year) year.textContent = String(new Date().getFullYear());

  if (searchForm) {
    searchForm.addEventListener('submit', event => {
      event.preventDefault();
      const nextQuery = searchInput ? searchInput.value.trim() : '';
      window.location.href = listingUrl({ q: nextQuery });
    });
  }

  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      menuToggle.textContent = isOpen ? '✕' : '☰';
    });
  }

  const backToTop = document.getElementById('back-to-top');
  if (backToTop) backToTop.addEventListener('click', event => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
