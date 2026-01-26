const express = require('express');
const cheerio = require('cheerio');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Главная страница с интерфейсом
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>My Proxy</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #0f172a; color: #f8fafc; }
            .container { max-width: 900px; margin: auto; background: #1e293b; padding: 30px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
            h1 { color: #60a5fa; margin-bottom: 20px; }
            input { width: 70%; padding: 15px; font-size: 16px; border: 2px solid #334155; border-radius: 8px; background: #0f172a; color: white; margin-right: 10px; }
            button { padding: 15px 30px; font-size: 16px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; }
            button:hover { background: #2563eb; }
            .quick-links { margin: 20px 0; }
            .quick-btn { background: #475569; color: white; border: none; padding: 10px 15px; border-radius: 6px; cursor: pointer; margin: 5px; }
            iframe { width: 100%; height: 70vh; border: 2px solid #334155; border-radius: 10px; margin-top: 20px; background: white; }
            .status { margin-top: 10px; color: #94a3b8; }
            .error { color: #f87171; }
            .success { color: #34d399; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔓 Web Proxy</h1>
            <p>Enter any website URL. All traffic will be routed through this proxy.</p>
            
            <div>
                <input type="text" id="url" placeholder="https://www.reddit.com" value="https://www.wikipedia.org">
                <button onclick="loadSite()">Browse</button>
            </div>
            
            <div class="quick-links">
                <button class="quick-btn" onclick="setUrl('https://www.reddit.com')">Reddit</button>
                <button class="quick-btn" onclick="setUrl('https://www.twitter.com')">Twitter</button>
                <button class="quick-btn" onclick="setUrl('https://www.wikipedia.org')">Wikipedia</button>
                <button class="quick-btn" onclick="setUrl('https://www.google.com')">Google</button>
                <button class="quick-btn" onclick="setUrl('https://textise.iitty')">Textise</button>
            </div>
            
            <div id="status" class="status">Ready. Enter a URL and press Browse.</div>
            
            <iframe id="frame" sandbox="allow-same-origin allow-scripts allow-forms allow-popups" title="Proxied Content"></iframe>
            
            <script>
                function setUrl(url) {
                    document.getElementById('url').value = url;
                    loadSite();
                }
                
                async function loadSite() {
                    const urlInput = document.getElementById('url').value.trim();
                    const status = document.getElementById('status');
                    const iframe = document.getElementById('frame');
                    
                    if (!urlInput) return;
                    
                    let targetUrl = urlInput;
                    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
                        targetUrl = 'https://' + targetUrl;
                        document.getElementById('url').value = targetUrl;
                    }
                    
                    status.textContent = 'Connecting to proxy...';
                    status.className = 'status';
                    
                    const encodedUrl = encodeURIComponent(targetUrl);
                    iframe.src = '/fetch?url=' + encodedUrl;
                    
                    iframe.onload = () => {
                        status.textContent = '✓ Loaded successfully via proxy';
                        status.className = 'status success';
                    };
                    
                    iframe.onerror = () => {
                        status.textContent = '✗ Error loading site. Try a different one.';
                        status.className = 'status error';
                    };
                }
                
                // Load example on start
                window.onload = () => {
                    setTimeout(() => {
                        document.getElementById('url').value = 'https://www.wikipedia.org';
                        loadSite();
                    }, 500);
                };
                
                // Open on Enter key
                document.getElementById('url').addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') loadSite();
                });
            </script>
        </div>
    </body>
    </html>
    `);
});

// Маршрут для загрузки сайтов
app.get('/fetch', async (req, res) => {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
        return res.status(400).send('<h2>Error: No URL provided</h2>');
    }
    
    try {
        const decodedUrl = decodeURIComponent(targetUrl);
        
        // Загружаем сайт через axios
        const response = await axios.get(decodedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br'
            },
            timeout: 10000 // 10 секунд таймаут
        });
        
        const html = response.data;
        const contentType = response.headers['content-type'] || 'text/html';
        
        // Если это HTML, обрабатываем
        if (contentType.includes('text/html')) {
            const $ = cheerio.load(html);
            
            // Переписываем ссылки
            $('a[href], link[href], script[src], img[src], iframe[src], form[action]').each((i, elem) => {
                const attrs = ['href', 'src', 'action'];
                attrs.forEach(attr => {
                    const value = $(elem).attr(attr);
                    if (value) {
                        try {
                            // Преобразуем относительные ссылки в абсолютные
                            let fullUrl;
                            if (value.startsWith('http://') || value.startsWith('https://')) {
                                fullUrl = value;
                            } else if (value.startsWith('//')) {
                                fullUrl = 'https:' + value;
                            } else if (value.startsWith('/')) {
                                const baseUrl = new URL(decodedUrl);
                                fullUrl = baseUrl.origin + value;
                            } else {
                                const baseUrl = new URL(decodedUrl);
                                fullUrl = new URL(value, baseUrl.origin).href;
                            }
                            
                            $(elem).attr(attr, '/fetch?url=' + encodeURIComponent(fullUrl));
                        } catch (e) {
                            // Если ошибка парсинга URL, оставляем как есть
                        }
                    }
                });
            });
            
            res.set('Content-Type', contentType);
            return res.send($.html());
        }
        
        // Если не HTML (картинки, CSS и т.д.), отдаём как есть
        res.set('Content-Type', contentType);
        res.send(html);
        
    } catch (error) {
        console.error('Proxy error:', error.message);
        
        const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Proxy Error</title>
        <style>body{font-family:Arial;padding:40px;background:#fef2f2;color:#dc2626}</style>
        </head>
        <body>
            <h2>🚫 Proxy Error</h2>
            <p><strong>Reason:</strong> ${error.message}</p>
            <p><strong>Possible causes:</strong></p>
            <ul>
                <li>The website blocked our proxy server</li>
                <li>Network timeout</li>
                <li>Invalid URL format</li>
            </ul>
            <p>Try a simpler site like <a href="/fetch?url=${encodeURIComponent('https://www.wikipedia.org')}">Wikipedia</a> or <a href="/fetch?url=${encodeURIComponent('https://example.com')}">Example.com</a></p>
            <button onclick="window.history.back()">← Go Back</button>
        </body>
        </html>
        `;
        
        res.status(500).send(errorHtml);
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`✅ Proxy server is running on port ${PORT}`);
    console.log(`🌐 Open: http://localhost:${PORT}`);
});