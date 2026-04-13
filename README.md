# Dots-Boxes

Dots and Boxes on GitHub Pages.

## GitHub Pages setup

1. Go to **Settings → Pages** in your GitHub repository.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Choose the `main` branch and the `/ (root)` folder.
4. Save and wait for the Pages URL to appear.

The site serves static assets from the repository root: `index.html`, `styles.css`, `main.js`, and `favicon.svg`.

## Local usage

Open `index.html` directly in your browser, or use a local static server:

```sh
python -m http.server 8000
```

Then visit `http://localhost:8000`.
