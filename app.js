(() => {
  'use strict';

  const config = window.TMDB_CONFIG || {};
  const fallbackCatalog = Array.isArray(window.REELSHELF_CATALOG) ? window.REELSHELF_CATALOG.slice() : [];
  let catalog = fallbackCatalog.slice();

  const categories = ['All', 'Movie', 'Series', 'Animation', 'Documentary', 'Short Film'];
  const genres = ['Sci-Fi', 'Adventure', 'Drama', 'Romance', 'Mystery', 'Thriller', 'South Asian', 'Family', 'Crime', 'Nature', 'Fantasy'];
  const languages = ['All languages', 'English', 'Urdu'];
  const main = document.getElementById('main-content');
  const searchInput = document.getElementById('site-search');
  const searchForm = document.getElementById('search-form');
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');

  if (!main) return;

  const languageNames = {
    en: 'English',
    ur: 'Urdu',
    hi: 'Hindi',
    fr: 'French',
    es: 'Spanish',
    de: 'German',
    ja: 'Japanese',
    ko: 'Korean',
    it: 'Italian',
    pt: 'Portuguese',
    ar: 'Arabic'
  };

  function normalizeLanguage(code) {
    const raw = String(code || '').toLowerCase();
    return languageNames[raw] || (raw ? raw.toUpperCase() : 'English');
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function getState() {
    const params = new URLSearchParams(window.location.search);
    const requestedCategory = params.get('category') || 'All';
    const currentCategory = categories.includes(requestedCategory) ? requestedCategory : 'All';
    const currentGenre = genres.includes(params.get('genre') || '') ? (params.get('genre') || '') : '';
    const requestedLanguage = params.get('language') || 'All languages';
    const currentLanguage = languages.includes(requestedLanguage) ? requestedLanguage : 'All languages';
    const query = (params.get('q') || '').trim();
    const slug = (params.get('movie') || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

    return { params, currentCategory, currentGenre, currentLanguage, query, slug };
  }

  function detailUrl(item) {
    if (!item || !item.slug) return './';
    const params = new URLSearchParams();
    params.set('movie', item.slug);
    return `?${params.toString()}`;
  }

  function listingUrl(overrides = {}, state = getState()) {
    const merged = {
      category: state.currentCategory,
      genre: state.currentGenre,
      language: state.currentLanguage,
      q: state.query,
      ...overrides
    };

    const next = new URLSearchParams();
    if (merged.category && merged.category !== 'All') next.set('category', merged.category);
    if (merged.genre) next.set('genre', merged.genre);
    if (merged.language && merged.language !== 'All languages') next.set('language', merged.language);
    if (merged.q) next.set('q', merged.q);
    if (merged.movie) next.set('movie', merged.movie);

    const search = next.toString();
    return search ? `?${search}` : './';
  }

  function categoryLabel(category) {
    return ({ All: 'All titles', Movie: 'Movies', Documentary: 'Documentaries', 'Short Film': 'Short films' })[category] || category;
  }

  async function tmdbFetch(endpoint, query = {}) {
    const apiKey = String(config.apiKey || '').trim();
    const token = String(config.accessToken || '').trim();
    const headers = { Accept: 'application/json' };

    if (!apiKey && !token) {
      throw new Error('TMDB API key or access token is missing. Add a valid public key to window.TMDB_CONFIG.');
    }

    const url = new URL(`${config.apiBase || 'https://api.themoviedb.org/3'}${endpoint}`);
    url.searchParams.set('language', config.language || 'en-US');

    if (apiKey) {
      url.searchParams.set('api_key', apiKey);
    }

    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      let message = `TMDB request failed with status ${response.status}`;
      try {
        const payload = await response.json();
        if (payload && payload.status_message) {
          message = payload.status_message;
        }
      } catch (error) {
        // Ignore JSON parse issues.
      }
      throw new Error(message);
    }

    return response.json();
  }

  function getPosterUrl(path) {
    if (!path) return 'assets/posters/last-orbit.svg';
    return `${config.imageBase || 'https://image.tmdb.org/t/p'}/w500${path}`;
  }

  const genreMap = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary', 18: 'Drama',
    14: 'Fantasy', 27: 'Horror', 10751: 'Family', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
    53: 'Thriller', 10752: 'War', 37: 'Western'
  };

  function buildGenres(item) {
    const names = [];
    if (Array.isArray(item.genres) && item.genres.length) {
      item.genres.forEach(genre => {
        if (genre && genre.name) names.push(genre.name);
      });
    }
    if (names.length === 0 && Array.isArray(item.genre_ids) && item.genre_ids.length) {
      item.genre_ids.slice(0, 6).forEach(id => {
        const name = genreMap[id] || 'Drama';
        if (!names.includes(name)) names.push(name);
      });
    }
    return names.length ? names.slice(0, 3) : ['Drama'];
  }

  function inferKind(mediaType, runtimeMinutes, genresList) {
    const normalizedGenres = genresList.map(genre => String(genre));
    if (normalizedGenres.includes('Documentary')) return 'Documentary';
    if (normalizedGenres.includes('Animation')) return 'Animation';
    if (mediaType === 'movie' && Number.isFinite(runtimeMinutes) && runtimeMinutes <= 45) return 'Short Film';
    return mediaType === 'movie' ? 'Movie' : 'Series';
  }

  function normalizeTmdbItem(item, mediaType = 'movie') {
    const title = mediaType === 'movie' ? (item.title || 'Untitled') : (item.name || 'Untitled');
    const releaseDate = mediaType === 'movie' ? (item.release_date || '') : (item.first_air_date || '');
    const year = releaseDate ? Number(String(releaseDate).slice(0, 4)) : new Date().getFullYear();
    const language = normalizeLanguage(item.original_language || 'en');
    const genresList = buildGenres(item);
    const runtimeMinutes = mediaType === 'movie'
      ? Number(item.runtime || 0)
      : (Array.isArray(item.episode_run_time) && item.episode_run_time.length ? Number(item.episode_run_time[0]) : 0);
    const kind = inferKind(mediaType, runtimeMinutes, genresList);
    const rating = item.vote_average == null ? 'N/A' : Number(item.vote_average).toFixed(1);
    const runtime = mediaType === 'movie'
      ? (item.runtime ? `${item.runtime} min` : 'HD')
      : (Array.isArray(item.episode_run_time) && item.episode_run_time.length ? `${item.episode_run_time[0]} min` : 'Series');

    return {
      slug: `${mediaType}-${item.id || title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      title,
      year,
      kind,
      genres: genresList,
      language,
      quality: 'HD',
      runtime,
      rating,
      featured: false,
      poster: getPosterUrl(item.poster_path),
      accent: 'violet',
      tagline: item.tagline || (kind === 'Series' ? 'A story worth following.' : 'A story worth discovering.'),
      synopsis: item.overview || 'No description available for this title yet.'
    };
  }

  async function loadTmdbCatalog() {
    const requests = [
      tmdbFetch('/trending/all/week', { page: 1 }),
      tmdbFetch('/trending/all/week', { page: 2 }),
      tmdbFetch('/trending/all/week', { page: 3 }),
      tmdbFetch('/movie/popular', { page: 1 }),
      tmdbFetch('/movie/popular', { page: 2 }),
      tmdbFetch('/movie/popular', { page: 3 }),
      tmdbFetch('/movie/popular', { page: 4 }),
      tmdbFetch('/tv/popular', { page: 1 }),
      tmdbFetch('/tv/popular', { page: 2 }),
      tmdbFetch('/tv/popular', { page: 3 }),
      tmdbFetch('/tv/popular', { page: 4 })
    ];

    const [trending1, trending2, trending3, movie1, movie2, movie3, movie4, series1, series2, series3, series4] = await Promise.all(requests);

    const combined = [
      ...(Array.isArray(trending1 && trending1.results) ? trending1.results : []),
      ...(Array.isArray(trending2 && trending2.results) ? trending2.results : []),
      ...(Array.isArray(trending3 && trending3.results) ? trending3.results : []),
      ...(Array.isArray(movie1 && movie1.results) ? movie1.results : []),
      ...(Array.isArray(movie2 && movie2.results) ? movie2.results : []),
      ...(Array.isArray(movie3 && movie3.results) ? movie3.results : []),
      ...(Array.isArray(movie4 && movie4.results) ? movie4.results : []),
      ...(Array.isArray(series1 && series1.results) ? series1.results : []),
      ...(Array.isArray(series2 && series2.results) ? series2.results : []),
      ...(Array.isArray(series3 && series3.results) ? series3.results : []),
      ...(Array.isArray(series4 && series4.results) ? series4.results : [])
    ];

    const unique = new Map();
    combined.forEach(item => {
      if (!item || !item.id) return;
      const isSeries = item.media_type === 'tv' || Boolean(item.first_air_date);
      unique.set(`${isSeries ? 'tv' : 'movie'}-${item.id}`, item);
    });

    return Array.from(unique.values())
      .filter(item => item && item.poster_path)
      .slice(0, 100)
      .map(item => normalizeTmdbItem(item, item.media_type === 'tv' || Boolean(item.first_air_date) ? 'tv' : 'movie'));
  }

  async function loadCatalog() {
    try {
      const nextCatalog = await loadTmdbCatalog();
      if (Array.isArray(nextCatalog) && nextCatalog.length) {
        catalog = nextCatalog;
        window.REELSHELF_CATALOG = nextCatalog;
        return;
      }
    } catch (error) {
      console.warn('TMDB fetch failed; falling back to the local catalog.', error);
    }

    catalog = fallbackCatalog.slice();
    window.REELSHELF_CATALOG = catalog;
  }

  function cardMarkup(item) {
    const cardGenres = (item.genres || []).slice(0, 2).join(' · ');
    return `
      <a class="movie-card" href="${detailUrl(item)}" aria-label="View details for ${escapeHtml(item.title)}">
        <div class="poster-wrap">
          <img loading="lazy" src="${escapeHtml(item.poster)}" alt="Original artwork for ${escapeHtml(item.title)}">
          <span class="quality-badge">${escapeHtml(item.quality || 'HD')}</span>
          ${item.featured ? '<span class="featured-badge">EDITOR\'S PICK</span>' : ''}
          <span class="poster-hover">View details <b>↗</b></span>
        </div>
        <div class="movie-info">
          <div class="movie-subline"><span>${escapeHtml(item.year)}</span><span>${escapeHtml(item.kind)}</span></div>
          <h3>${escapeHtml(item.title)}</h3>
          <div class="movie-genres">${escapeHtml(cardGenres)}</div>
          <div class="card-bottom"><span>${escapeHtml(item.language)}</span><span class="card-rating"><b>★</b> ${escapeHtml(item.rating || 'N/A')}</span></div>
        </div>
      </a>`;
  }

  function renderFilters(state = getState()) {
    const categoryChips = categories.map(category => `
      <a class="filter-chip ${state.currentCategory === category && !state.currentGenre ? 'selected' : ''}" href="${listingUrl({ category, genre: '' }, state)}">${escapeHtml(categoryLabel(category))}</a>`).join('');
    const genreChips = [
      `<a class="filter-chip ${!state.currentGenre ? 'selected' : ''}" href="${listingUrl({ genre: '' }, state)}">All genres</a>`,
      ...genres.map(genre => `<a class="filter-chip ${state.currentGenre === genre ? 'selected' : ''}" href="${listingUrl({ genre, category: 'All' }, state)}">${escapeHtml(genre)}</a>`)
    ].join('');
    const languageChips = languages.map(language => `
      <a class="filter-chip ${state.currentLanguage === language ? 'selected' : ''}" href="${listingUrl({ language }, state)}">${escapeHtml(language)}</a>`).join('');

    return `
      <div class="filter-group"><span class="filter-group-label">TYPE</span><div class="filter-row" aria-label="Filter titles by type">${categoryChips}</div></div>
      <div class="filter-group"><span class="filter-group-label">GENRE</span><div class="filter-row" aria-label="Filter titles by genre">${genreChips}</div></div>
      <div class="filter-group"><span class="filter-group-label">LANGUAGE</span><div class="filter-row" aria-label="Filter titles by language">${languageChips}</div></div>`;
  }

  function renderHero(featured) {
    if (!featured) return '';
    return `
      <section class="hero" id="top">
        <div class="hero-art"><img src="${escapeHtml(featured.poster)}" alt="Original artwork for ${escapeHtml(featured.title)}"></div>
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <div class="hero-kicker"><span class="kicker-dot"></span> FEATURED STORY <span class="kicker-rule"></span> ${escapeHtml(featured.year)}</div>
          <h1>${escapeHtml(featured.title)}</h1>
          <p class="hero-tagline">${escapeHtml(featured.tagline)}</p>
          <div class="hero-meta"><span class="hero-rating">★ ${escapeHtml(featured.rating || 'N/A')}</span><span>${escapeHtml(featured.kind)}</span><span>${escapeHtml(featured.runtime)}</span></div>
          <p class="hero-description">${escapeHtml(featured.synopsis)}</p>
          <div class="hero-actions"><a class="primary-button" href="${detailUrl(featured)}">Explore title <span>→</span></a><a class="secondary-button" href="https://www.justwatch.com/pk/search?q=${encodeURIComponent(featured.title)}" target="_blank" rel="noopener noreferrer">Find viewing options</a></div>
        </div>
        <div class="hero-index"><span>01</span><span class="index-line"></span><span>${String(catalog.length).padStart(2, '0')}</span><small>CURATED DEMOS</small></div>
        <div class="hero-bottom-label">STORIES THAT STAY WITH YOU</div>
      </section>`;
  }

  function getResults(state = getState()) {
    const needle = state.query.toLocaleLowerCase();
    return catalog.filter(item => {
      const categoryMatch = state.currentCategory === 'All'
        || item.kind === state.currentCategory
        || (Array.isArray(item.genres) && item.genres.includes(state.currentCategory));
      const genreMatch = !state.currentGenre || (Array.isArray(item.genres) && item.genres.includes(state.currentGenre));
      const languageMatch = state.currentLanguage === 'All languages' || (item.language || '').toUpperCase() === state.currentLanguage.toUpperCase();
      const searchable = `${item.title} ${item.kind} ${(item.genres || []).join(' ')} ${(item.language || '')} ${item.year} ${item.synopsis}`.toLocaleLowerCase();
      const queryMatch = !needle || searchable.includes(needle);
      return categoryMatch && genreMatch && languageMatch && queryMatch;
    });
  }

  function renderCatalog(state = getState()) {
    const results = getResults(state);
    const heading = state.query ? `Results for “${escapeHtml(state.query)}”` : state.currentGenre ? escapeHtml(state.currentGenre) : state.currentCategory !== 'All' ? escapeHtml(categoryLabel(state.currentCategory)) : 'Discover';
    const eyebrow = state.query ? 'SEARCH RESULTS' : (state.currentCategory === 'All' && !state.currentGenre && state.currentLanguage === 'All languages' ? 'HANDPICKED FOR YOU' : 'BROWSE COLLECTION');
    const featured = catalog.find(item => item.featured) || catalog[0];
    const titleGrid = results.length
      ? `<div class="poster-grid">${results.map(cardMarkup).join('')}</div>`
      : `<div class="empty-state"><div class="empty-icon">⌕</div><h3>No titles found</h3><p>Try a different title, language, genre, or category.</p><a class="secondary-button" href="./">Clear filters</a></div>`;

    return `
      ${!state.query && state.currentCategory === 'All' && !state.currentGenre && state.currentLanguage === 'All languages' ? renderHero(featured) : ''}
      <section class="section-block catalog-block">
        <div class="section-heading"><div><span class="eyebrow">${eyebrow}</span><h2>${heading}</h2><p class="section-subtitle">Distinct stories, thoughtful picks, and something new to discover.</p></div></div>
        ${renderFilters(state)}
        ${titleGrid}
        <div class="catalog-footnote"><span class="footnote-icon">✦</span><span>All titles and poster artwork should be licensed before publishing.</span></div>
      </section>`;
  }

  function renderDetail(item) {
    const related = catalog.filter(candidate => candidate.slug !== item.slug).slice(0, 4);
    return `
      <div class="breadcrumbs"><a href="./">Discover</a><span>›</span><span>${escapeHtml(item.title)}</span></div>
      <section class="detail-layout">
        <div class="detail-poster"><img src="${escapeHtml(item.poster)}" alt="Original artwork for ${escapeHtml(item.title)}"><span class="poster-badge">${escapeHtml(item.quality || 'HD')}</span></div>
        <div class="detail-copy">
          <div class="eyebrow">REELSHELF PICK <span class="eyebrow-line"></span></div>
          <h1>${escapeHtml(item.title)}</h1>
          <p class="detail-tagline">${escapeHtml(item.tagline)}</p>
          <div class="metadata"><span>${escapeHtml(item.year)}</span><i></i><span>${escapeHtml(item.kind)}</span><i></i><span>${escapeHtml(item.runtime)}</span><i></i><span>${escapeHtml(item.language)}</span></div>
          <div class="detail-rating"><span class="star">★</span><strong>${escapeHtml(item.rating || 'N/A')}</strong><span class="rating-caption">editorial score</span></div>
          <p class="detail-synopsis">${escapeHtml(item.synopsis)}</p>
          <div class="genre-list">${(item.genres || []).map(genre => `<a href="${listingUrl({ genre, category: 'All' })}">${escapeHtml(genre)}</a>`).join('')}</div>
          <a class="primary-button" href="https://www.justwatch.com/pk/search?q=${encodeURIComponent(item.title)}" target="_blank" rel="noopener noreferrer">Find official viewing options <span>→</span></a>
          <p class="legal-note">Availability varies by country. ReelShelf does not host video files or provide unauthorized downloads.</p>
        </div>
      </section>
      <section class="section-block related-block"><div class="section-heading"><div><span class="eyebrow">KEEP EXPLORING</span><h2>You might also like</h2></div><a class="text-link" href="./">View all titles</a></div><div class="poster-grid">${related.map(cardMarkup).join('')}</div></section>`;
  }

  function renderNotFound() {
    return `<section class="empty-state title-not-found"><div class="empty-icon">⌕</div><h3>Title not found</h3><p>This title may have been removed or the link may be incorrect.</p><a class="secondary-button" href="./">Back to catalog</a></section>`;
  }

  function updatePageMetadata(state = getState()) {
    const detailItem = state.slug ? catalog.find(item => item.slug === state.slug) : null;
    const pageTitle = detailItem ? `${detailItem.title} — ReelShelf` : state.currentGenre ? `${state.currentGenre} — ReelShelf` : state.currentCategory !== 'All' ? `${categoryLabel(state.currentCategory)} — ReelShelf` : 'Discover films and series — ReelShelf';
    document.title = pageTitle;

    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.content = detailItem ? detailItem.synopsis : 'Discover original film and series listings, browse by category, and find official viewing options with ReelShelf.';
    }

    document.querySelectorAll('[data-nav-category]').forEach(link => {
      const target = link.getAttribute('data-nav-category');
      link.classList.toggle('active', !detailItem && state.currentCategory === target && !state.currentGenre);
    });
  }

  function renderApplication() {
    const state = getState();
    const detailItem = state.slug ? catalog.find(item => item.slug === state.slug) : null;
    main.innerHTML = state.slug ? (detailItem ? renderDetail(detailItem) : renderNotFound()) : renderCatalog(state);
    updatePageMetadata(state);

    if (searchInput) {
      searchInput.value = state.query;
    }

    const year = document.getElementById('current-year');
    if (year) year.textContent = String(new Date().getFullYear());

    if (searchForm) {
      searchForm.addEventListener('submit', event => {
        event.preventDefault();
        const nextQuery = searchInput ? searchInput.value.trim() : '';
        window.location.href = listingUrl({ q: nextQuery }, state);
      });
    }

    if (menuToggle && nav) {
      menuToggle.addEventListener('click', () => {
        const isOpen = nav.classList.toggle('open');
        menuToggle.setAttribute('aria-expanded', String(isOpen));
        menuToggle.textContent = isOpen ? '✕' : '☰';
      });
    }
  }

  (async function init() {
    main.innerHTML = '<div class="loading-state">Loading ReelShelf…</div>';
    await loadCatalog();
    renderApplication();
  })();
})();
