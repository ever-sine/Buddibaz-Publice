BUDDHIBAZ V32 — CLOUDFLARE WORKER PUBLIC DASHBOARD + NGROK

यह पैकेज आपके मौजूदा Cloudflare Workers Git deployment के लिए है।
Admin/Main/Croma आपके Windows PC पर ही रहेंगे। Cloudflare पर केवल Public Dashboard है।

GITHUB में पुरानी files हटाकर इस ZIP की CONTENTS repository root में upload करें:
  wrangler.jsonc
  src/index.js
  public/index.html
  public/public-dashboard.css
  public/public-dashboard.js
  .gitignore

Cloudflare:
1. Existing project buddibaz-publice खोलें.
2. Settings > Variables and Secrets में variable जोड़ें:
   NGROK_BACKEND_URL = https://plywood-faction-casino.ngrok-free.dev
3. Build command खाली रखें.
4. Deploy command: npx wrangler deploy
5. GitHub commit के बाद deployment run/retry करें.

Show:
1. PC पर Buddhibaz V32 server + ngrok चालू रखें.
2. Admin > Start Public Show से random show code लें.
3. Players को दें:
   https://buddibaz-publice.salmanahmadofficalii90.workers.dev/public-dashboard?show=YOUR_SHOW_CODE
4. दो phones पर Login > Question > Answer > Top 3 > Manual Winner/LOSS test करें.

IMPORTANT:
- ngrok URL बदलने पर Cloudflare variable NGROK_BACKEND_URL बदलें और redeploy करें.
- यह Worker केवल login/me/answer/logout public API routes proxy करता है; Admin API नहीं.
- Public data polling लगभग हर 4 sec है; Cloudflare free usage limits लागू हैं.
- PC/Node/ngrok show के दौरान online रहना जरूरी है.
