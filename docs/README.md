# IssueOps Frontend

Static page (`index.html` + `script.js`) that opens a GitHub Issue with the
`issueops-trigger` label and polls the GitHub REST API until the resulting PR
is merged. Designed to be served from GitHub Pages (`Settings → Pages →
Source: Deploy from a branch → /docs`).

## How credentials are handled

The frontend is fully static — there is no server to hold a secret on the
user's behalf. Because the GitHub API requires authentication to create
issues, the page asks the user for a token at submit time. The flow:

1. **User provides a fine-grained Personal Access Token (PAT)** in the form.
   Recommended scopes (repo-scoped to this repository only):
   - **Issues:** Read and write
   - **Pull requests:** Read
   - **Metadata:** Read (automatic)
2. **The token never leaves the browser**, except as a `Bearer` header on
   requests directly to `https://api.github.com`. It is stored only in
   `sessionStorage`, which is wiped when the tab is closed. It is never sent
   to GitHub Pages itself (Pages is static — no server endpoint to receive
   it) and never written to `localStorage`.
3. **No third-party code paths.** The page has no external script imports —
   `fetch` and DOM APIs only — so the token cannot be exfiltrated by a
   compromised CDN dependency.

### Why a PAT (and not a hardcoded token)

A token committed to a public Pages site would be world-readable. A token
proxied through an Action would still need a place to live. Asking the user
for their own short-lived, narrowly-scoped fine-grained PAT keeps the trust
boundary at the user's browser tab.

### Production-grade alternative: GitHub App + OAuth (PKCE)

For a multi-user deployment, replace the PAT prompt with a GitHub App OAuth
device flow or web flow (PKCE). Outline:

1. Register a GitHub App with `Issues: write` and `Pull requests: read`
   permissions and install it on the repo.
2. From the frontend, redirect to `https://github.com/login/oauth/authorize`
   with the app's client ID and a `state` nonce.
3. Receive the `code` callback and exchange it for a user-to-server token —
   this exchange does require a small server (a Cloudflare Worker or a
   Lambda is sufficient) because the client secret cannot live in the
   browser. The Worker only forwards the code-for-token swap; it never
   stores tokens.
4. Use the returned user-to-server token exactly as the PAT is used today.

This removes the requirement that each user mint their own PAT, at the cost
of operating a tiny token-exchange endpoint.

## Local development

Open `docs/index.html` directly in a browser, or `cd docs && python3 -m
http.server 8000`. All API calls go to `api.github.com`, which sends
permissive CORS headers, so no proxy is needed.

## Contract with the backend workflow

The frontend depends on two conventions in `.github/workflows/issueops-backend.yml`:

- The issue is created with the **`issueops-trigger`** label.
- The workflow posts a comment containing the marker
  **`<!-- issueops-pr -->`** and a `#NNN` PR reference. The frontend uses
  this to discover the PR number without needing `actions:read` permission.
