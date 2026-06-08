# Budget Smarts

A self-contained personal budget dashboard, password-protected for free GitHub Pages.

## How the password protection works

The published `index.html` is **encrypted** with AES-256-GCM. The repo can be
**public** — the served page contains only ciphertext and is unreadable until
someone enters the correct password, which decrypts the real app in the browser
(using the built-in WebCrypto API, no external libraries).

The plaintext source (`app.plain.html`) is **git-ignored** and never published.

## Using the app

1. Open the GitHub Pages URL (e.g. `https://<user>.github.io/finance/`).
2. Enter the password to unlock.
3. Use **Import JSON** to load your data, then tag expenses in the Budget Editor.

## Editing the app later

```bash
# 1. Recover the editable source from the encrypted file
node decrypt.js "<your-password>"        # index.html -> app.plain.html

# 2. Edit app.plain.html as needed

# 3. Re-encrypt (overwrites index.html), then commit & push
node encrypt.js "<your-password>"        # app.plain.html -> index.html
```

## Changing the password

Just re-encrypt with a new password:

```bash
node decrypt.js "<old-password>"
node encrypt.js "<new-password>"
```

## Notes

- The password is required to read the app, but anyone who knows it can read the
  source after decryption. This is the standard protection level for static
  sites — suitable for casual privacy, not for secrets.
- Your budget data lives in your browser's `localStorage` (per device) and is
  never stored in the repo. Use Export JSON to back it up.
