# StayToned website

Static marketing site and privacy policy for [staytoned.farnood.tech](https://staytoned.farnood.tech).

Source of truth for site content lives in this private monorepo under `site/`. GitHub Pages cannot host directly from a private repo on the free plan, so CI publishes `site/` to the public [`FarnoodF/stay-toned-site`](https://github.com/FarnoodF/stay-toned-site) repository.

## Pages

- `/` — product landing page
- `/policy/` — privacy policy (also linked from the mobile app)

## Local preview

From the repository root:

```sh
npx --yes serve site
```

Then open the URL printed in the terminal (typically `http://localhost:3000`).

## Deployment

Pushes to `main` that touch `site/` run [`.github/workflows/deploy-site.yml`](../.github/workflows/deploy-site.yml), which copies the `site/` folder to `main` on the public Pages repo.

### One-time setup (outside this repo)

#### 1. Create the public Pages repo

1. Create a new **public** GitHub repository named `stay-toned-site`.
2. Leave it empty or with a placeholder README.

#### 2. Add a deploy token to this private repo

1. Create a fine-grained GitHub personal access token with **Contents: Read and write** on `FarnoodF/stay-toned-site` only.
2. In `FarnoodF/stay-toned` → **Settings → Secrets and variables → Actions**, add:
   - Name: `SITE_DEPLOY_GITHUB_TOKEN`
   - Value: the token above

#### 3. Enable GitHub Pages on the public repo

In `FarnoodF/stay-toned-site` → **Settings → Pages**:

1. **Source**: Deploy from branch
2. **Branch**: `main` / `/ (root)`
3. After the first deploy from CI, set **Custom domain** to `staytoned.farnood.tech`
4. Enable **Enforce HTTPS** once the certificate is issued

The `site/CNAME` file is copied on each deploy.

#### 4. Porkbun DNS

`staytoned.farnood.tech` currently URL-forwards to `farnood.tech`. Replace that forward with:

| Type  | Host        | Answer               |
| ----- | ----------- | -------------------- |
| CNAME | `staytoned` | `farnoodf.github.io` |

Remove any URL-forwarding rule for the same host so GitHub Pages can serve `/` and `/policy/`.

DNS can take a few minutes to propagate. GitHub may need up to 24 hours to issue HTTPS for the custom domain.

#### 5. Ship content

Merge/push site changes to `main` in `stay-toned`, or run **Actions → Deploy site → Run workflow** manually.

### Store listings

Use `https://staytoned.farnood.tech/policy` as the public privacy policy URL in App Store Connect and Google Play Console.

## Alternatives

If you prefer not to maintain a second GitHub repo:

- **Cloudflare Pages** — deploy `site/` from this repo's Actions with a Cloudflare API token (works with private repos).
- **Netlify** — similar static hosting with a deploy token secret.

The public mirror repo is the simplest fit if you already use GitHub Pages for `farnood.tech`.
