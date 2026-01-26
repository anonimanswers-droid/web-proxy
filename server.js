const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cheerio = require('cheerio');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// Главная страница с интерфейсом
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>My Personal Web Proxy</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f4f4f4; }
            .container { max-width: 800px; margin: auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            h1 { color: #333; }
            #url { width: 70%; padding: 12px; font-size: 16px; border: 2px solid #ddd; border-radius: 5px; }
            button { padding: 12px 24px; font-size: 16px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
            button:hover { background: #0056b3; }
            .quick-links { margin: 20px 0; }
            .quick-btn { background: #28a745; margin: 5px; padding: 8px 15px; color: white; border: none; border-radius: 4px; cursor: pointer; }
            iframe { width: 100%; height: 70vh; border: 2px solid #ccc; border-radius: 5px; margin-top: 20px; }
            .status { margin-top: 10px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔓 My Personal Web Proxy</h1>
            <p>Enter the URL of any website below:</p>
            <input type="text" id="url" placeholder="https://www.reddit.com" value="https://www.reddit.com">
            <button onclick="loadSite()">Go</button>

            <div class="quick-links">
                <p>Quick links:</p>
                <button class="quick-btn" onclick="setUrl('https://www.reddit.com')">Reddit</button>
                <button class="quick-btn" onclick="setUrl('https://www.twitter.com')">Twitter</button>
                <button class="quick-btn" onclick="setUrl('https://www.wikipedia.org')">Wikipedia</button>
                <button class="quick-btn" onclick="setUrl('https://www.youtube.com')">YouTube (may not work)</button>
            </div>

            <div id="status" class="status">Ready. Enter a URL and press Go.</div>

            <iframe id="proxyFrame" sandbox="allow-same-origin allow-scripts allow-forms allow-popups" title="Proxied Content"></iframe>
        </div>

        <script>
            function setUrl(url) {
                document.getElementById('url').value = url;
                loadSite();
            }
            async function loadSite() {
                const urlInput = document.getElementById('url').value.trim();
                const status = document.getElementById('status');
                const iframe = document.getElementById('proxyFrame');

                if (!urlInput) return;

                // Add https if missing
                let targetUrl = urlInput;
                if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
                    targetUrl = 'https://' + targetUrl;
                    document.getElementById('url').value = targetUrl;
                }

                status.textContent = 'Loading...';
                status.style.color = 'orange';

                // The key part: We request our OWN server to fetch and process the page
                const encodedUrl = encodeURIComponent(targetUrl);
                // We'll use a special route /fetch?url=...
                iframe.src = '/fetch?url=' + encodedUrl;

                iframe.onload = () => {
                    status.textContent = 'Loaded via proxy.';
                    status.style.color = 'green';
                };
                iframe.onerror = () => {
                    status.textContent = 'Error loading the site. It might block proxies.';
                    status.style.color = 'red';
                };
            }
            // Load example on start
            window.onload = () => setTimeout(() => loadSite(), 500);
        </script>
    </body>
    </html>
    `);
});

// Маршрут, который загружает и обрабатывает целевую страницу
app.get('/fetch', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('No URL provided');
    }

    try {
        // 1. Загружаем целевую страницу как обычный браузер
        const response = await fetch(decodeURIComponent(targetUrl), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
        });

        const html = await response.text();
        const contentType = response.headers.get('content-type');

        // 2. Обрабатываем HTML с помощью Cheerio (как jQuery на сервере)
        const $ = cheerio.load(html);

        // 3. ПЕРЕЗАПИСЫВАЕМ ВСЕ ССЫЛКИ, чтобы они вели через наш прокси
        $('a[href], link[href], script[src], img[src], iframe[src], form[action]').each((i, elem) => {
            const attrs = ['href', 'src', 'action'];
            attrs.forEach(attr => {
                const value = $(elem).attr(attr);
                if (value) {
                    // Преобразуем относительные и абсолютные ссылки
                    let fullUrl;
                    try {
                        fullUrl = new URL(value, targetUrl).href;
                    } catch (e) {
                        return; // Пропускаем невалидные ссылки
                    }
                    // Меняем ссылку на маршрут /fetch нашего сервера
                    $(elem).attr(attr, '/fetch?url=' + encodeURIComponent(fullUrl));
                }
            });
        });

        // 4. Отправляем модифицированную страницу клиенту
        res.set('Content-Type', contentType);
        res.send($.html());

    } catch (error) {
        console.error('Proxy fetch error:', error);
        res.status(500).send(`Proxy Error: Could not fetch the requested page. The site might be blocking our server. Error details: ${error.message}`);
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Proxy server is running on port ${PORT}`);
});