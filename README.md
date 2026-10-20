# ReelShelf — GitHub Pages version

This is the static HTML, CSS, and JavaScript edition of ReelShelf. It does not require PHP, Node.js, a database, or server-side hosting. The demo catalogue uses fictional titles and original SVG poster artwork.

## Publish it on GitHub Pages

1. Download and extract this project ZIP.
2. Open your GitHub repository. If you do not have one, create a new repository named `reelshelf`.
3. Upload the **contents of this folder** into the repository root. `index.html` must be at the top level, next to the `assets` folder. Do not upload only the ZIP file and do not place the contents inside an extra nested folder.
4. In the repository, open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select branch `main` and folder `/(root)`, then click **Save**.
7. Wait for the Pages deployment to finish, then open the URL shown on the Pages settings screen. It normally looks like `https://YOUR-USERNAME.github.io/reelshelf/`.

## Test locally

You can open `index.html` directly in a browser. For a closer match to GitHub Pages, you can also run a simple static server from this folder:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000/`.

## Included features

- Responsive dark entertainment catalogue design.
- Featured story hero section.
- Poster grid with quality, year, type, language, and sample rating labels.
- Search across title, type, genre, language, year, and synopsis.
- Filters for content type, genre, and language.
- Individual title detail views using URL query parameters, for example `?movie=the-last-orbit`.
- Related titles and links to search official viewing options.
- Mobile navigation and accessible labels.

## How it works

All catalogue records live in `assets/catalog.js`. The browser-side page logic is in `assets/app.js`. Styling is in `assets/style.css`, and original sample poster artwork is stored in `assets/posters/`. Query-string links work on GitHub Pages because each view is rendered by JavaScript from the same `index.html` page.

To add a title, add a record to `assets/catalog.js` and add its artwork under `assets/posters/`. Use a unique slug and only use media data and artwork you own or are allowed to publish.

## Important limitations

GitHub Pages serves static files only. This site therefore has no PHP execution, database, server-side login, or admin dashboard. Search/filter/detail views run in the visitor's browser. External official-viewing search links require an internet connection.
