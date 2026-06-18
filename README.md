# WePay Gateway Proxy

Fixed-host VPS gateway for TermWai WePay calls.

## What It Does

- Render backend calls this gateway with `X-Internal-Token`.
- Gateway adds `username` and `password_hash = MD5(WEPAY_PASSWORD)`.
- Gateway posts only to `https://www.wepay.in.th/client_api.json.php`.
- WePay callback hits `/wepay/callback`.
- Gateway relays callback to Render backend with `X-Internal-Token`.

## Env

```env
PORT=3000
INTERNAL_TOKEN=change-me-long-random-token
WEPAY_USERNAME=
WEPAY_PASSWORD=
RENDER_CALLBACK=https://api.termwai.in.th/api/wepay/callback
PUBLIC_BASE_URL=https://proxy.termwai.in.th
```

No `password_hash` env. Gateway computes it every request.

## Local Run

```bash
npm ci
cp .env.example .env
npm run build
npm start
```

## API

All non-callback routes require:

```http
X-Internal-Token: <INTERNAL_TOKEN>
```

Routes:

- `GET /healthz`
- `POST /wepay/balance`
- `POST /wepay/payee-info`
- `POST /wepay/purchase`
- `POST /wepay/get-output`
- `POST /wepay/callback`

## VPS Install

DNS:

```text
Type: A
Host: proxy
Value: 34.123.33.216
Proxy status: DNS Only
```

Ubuntu packages:

```bash
sudo apt update
sudo apt -y upgrade
sudo apt -y install curl git nginx ufw
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt -y install nodejs
sudo npm install -g pm2
```

Firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

App:

```bash
sudo mkdir -p /opt/wepay-gateway
sudo chown -R $USER:$USER /opt/wepay-gateway
cd /opt/wepay-gateway
git clone <repo-url> .
cd wepay-gateway-proxy
npm ci
cp .env.example .env
nano .env
npm run build
pm2 start dist/index.js --name wepay-gateway
pm2 save
pm2 startup
```

Nginx:

```nginx
server {
    listen 80;
    server_name proxy.termwai.in.th;

    client_max_body_size 1m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 35s;
        proxy_read_timeout 35s;
    }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/wepay-gateway /etc/nginx/sites-enabled/wepay-gateway
sudo nginx -t
sudo systemctl reload nginx
```

SSL:

```bash
sudo apt -y install certbot python3-certbot-nginx
sudo certbot --nginx -d proxy.termwai.in.th
sudo certbot renew --dry-run
```

Render backend env:

```env
WEPAY_GATEWAY_BASE_URL=https://proxy.termwai.in.th
WEPAY_GATEWAY_INTERNAL_TOKEN=<same-token-as-vps>
WEPAY_CALLBACK_URL=https://proxy.termwai.in.th/wepay/callback
```

## Smoke

```bash
curl -i https://proxy.termwai.in.th/healthz
curl -i -X POST https://proxy.termwai.in.th/wepay/balance \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: $INTERNAL_TOKEN" \
  -d '{}'
```

Callback relay:

```bash
curl -i -X POST https://proxy.termwai.in.th/wepay/callback \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "dest_ref=ORDER00001&transaction_id=12345&status=2&sms=test"
```

## Ops

```bash
pm2 status
pm2 logs wepay-gateway
pm2 restart wepay-gateway
sudo journalctl -u nginx -f
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log
```
