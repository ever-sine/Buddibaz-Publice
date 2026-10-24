PERMANENT PUBLIC URL: https://buddibaz-publice.salmanahmadofficalii90.workers.dev/

GitHub: Replace the old Worker deployment files with CONTENTS of cloudflare/ folder.
Keep the existing NGROK_BACKEND_URL runtime variable in Cloudflare Settings.
Cloudflare Build command: empty; Deploy command: npx wrangler deploy.
PC: Replace server.js ONLY after backing up your existing file, then restart PC server and ngrok.
Admin: Start Public Show as before. Players use the same URL every show.
The Worker polls current show every 5 seconds, so start/stop may take up to ~5 seconds.
Player must login again for each new show; scores remain separated by session.
PC and ngrok must stay online. Update NGROK_BACKEND_URL if random ngrok address changes.
