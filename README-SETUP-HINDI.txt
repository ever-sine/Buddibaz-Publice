BUDDHIBAZ V32 - CLOUDFLARE PAGES FREE PUBLIC DASHBOARD

1. Make a NEW GitHub repository with the CONTENTS of this ZIP at the repository root.
2. Cloudflare > Workers & Pages > Create Pages > Connect to Git.
3. Choose the repo; Framework preset None; Build command blank; output directory /.
4. In Cloudflare Pages > Settings > Variables and Secrets, add:
   NGROK_BACKEND_URL = https://YOUR-CURRENT-NGROK.ngrok-free.app
5. Redeploy after saving the variable.
6. Run Buddhibaz V32 server and ngrok on your Windows PC.
7. Start Public Show in your PC Admin. Copy the show= code from its link.
8. Public link: https://YOUR-PROJECT.pages.dev/public-dashboard?show=YOUR_SHOW_CODE
9. Test 2 phones: login, answer, 30s timer, live ranking, manual winner.

Only the Public Dashboard is hosted. Admin and history remain on PC.
No Firebase required. Four PUBLIC API routes are proxied via Pages Functions.
A fresh random ngrok URL requires changing NGROK_BACKEND_URL and redeploying.
Cloudflare free quotas apply; each participant polls every 4 seconds.
Your PC, Node server and ngrok must remain online during the show.
Do NOT upload the entire Buddhibaz project or any Admin files.
Cloudflare deployment and real-phone tests are NOT performed by this package.
