const express = require('express');
const cheerio = require('cheerio');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== КОНФИГУРАЦИЯ МАСКИРОВКИ ==========
const SITE_CONFIG = {
    name: "VidStream Downloader Pro",
    tagline: "Download videos from any platform in HD quality",
    version: "v3.2.1",
    fakeStats: {
        users: "1,243,879",
        downloads: "28,451,203",
        successRate: "99.7%"
    },
    supportedPlatforms: [
        "YouTube", "Twitter", "Instagram", "TikTok", "Reddit",
        "Facebook", "Twitch", "Vimeo", "Dailymotion", "Bilibili"
    ]
};

// ========== СПИСКИ USER-AGENT ДЛЯ РОТАЦИИ ==========
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
];

// ========== СПИСКИ ПУБЛИЧНЫХ ПРОКСИ ДЛЯ РОТАЦИИ ==========
const PUBLIC_PROXIES = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
    'https://thingproxy.freeboard.io/fetch/',
    'https://cors-anywhere.herokuapp.com/',
    'https://api.codetabs.com/v1/proxy?quest='
];

// ========== ФУНКЦИИ ДЛЯ МАСКИРОВКИ ==========
function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getRandomDelay() {
    return Math.floor(Math.random() * 1000) + 500; // 500-1500ms
}

function getBrowserHeaders() {
    const userAgent = getRandomUserAgent();
    const isMobile = userAgent.includes('Mobile') || userAgent.includes('iPhone') || userAgent.includes('Android');
    
    const baseHeaders = {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
    };
    
    // Добавляем дополнительные заголовки для Chrome
    if (userAgent.includes('Chrome')) {
        baseHeaders['Sec-Ch-Ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"';
        baseHeaders['Sec-Ch-Ua-Mobile'] = isMobile ? '?1' : '?0';
        baseHeaders['Sec-Ch-Ua-Platform'] = isMobile ? '"Android"' : '"Windows"';
    }
    
    // Добавляем referer для реалистичности
    if (Math.random() > 0.3) {
        baseHeaders['Referer'] = 'https://www.google.com/';
    }
    
    return baseHeaders;
}

function getRandomProxyUrl(targetUrl) {
    const proxy = PUBLIC_PROXIES[Math.floor(Math.random() * PUBLIC_PROXIES.length)];
    return proxy + encodeURIComponent(targetUrl);
}

// ========== ГЛАВНАЯ СТРАНИЦА (МАСКИРОВКА) ==========
app.get('/', (req, res) => {
    const platformButtons = SITE_CONFIG.supportedPlatforms.map(platform => 
        `<button class="platform-btn" onclick="analyzeUrl('${platform.toLowerCase()}')">
            <i class="fab fa-${platform.toLowerCase()}"></i> ${platform}
        </button>`
    ).join('');

    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${SITE_CONFIG.name} - Download Videos Online</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            
            body {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                color: #333;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
            }
            
            header {
                text-align: center;
                padding: 40px 20px;
                background: white;
                border-radius: 20px;
                margin-bottom: 30px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            
            .logo {
                font-size: 2.5rem;
                color: #667eea;
                margin-bottom: 10px;
            }
            
            .logo i {
                margin-right: 15px;
            }
            
            h1 {
                color: #2d3748;
                margin-bottom: 10px;
                font-size: 2.2rem;
            }
            
            .tagline {
                color: #718096;
                font-size: 1.1rem;
                margin-bottom: 30px;
            }
            
            .stats {
                display: flex;
                justify-content: center;
                gap: 40px;
                margin: 30px 0;
                flex-wrap: wrap;
            }
            
            .stat-item {
                text-align: center;
                padding: 20px;
                background: #f7fafc;
                border-radius: 10px;
                min-width: 150px;
            }
            
            .stat-number {
                font-size: 2rem;
                font-weight: bold;
                color: #667eea;
                display: block;
            }
            
            .stat-label {
                color: #718096;
                font-size: 0.9rem;
            }
            
            .main-content {
                background: white;
                padding: 40px;
                border-radius: 20px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                margin-bottom: 30px;
            }
            
            .input-section {
                margin-bottom: 40px;
            }
            
            .input-group {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }
            
            #videoUrl {
                flex: 1;
                min-width: 300px;
                padding: 18px 25px;
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                font-size: 16px;
                transition: border-color 0.3s;
            }
            
            #videoUrl:focus {
                outline: none;
                border-color: #667eea;
            }
            
            #analyzeBtn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 18px 40px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s;
            }
            
            #analyzeBtn:hover {
                transform: translateY(-2px);
            }
            
            .platforms {
                margin-top: 30px;
            }
            
            .platforms h3 {
                margin-bottom: 20px;
                color: #2d3748;
            }
            
            .platform-buttons {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .platform-btn {
                background: #f7fafc;
                border: 2px solid #e2e8f0;
                padding: 15px 25px;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: 500;
            }
            
            .platform-btn:hover {
                background: #667eea;
                color: white;
                border-color: #667eea;
            }
            
            .platform-btn i {
                font-size: 1.2rem;
            }
            
            .browser-window {
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                overflow: hidden;
                margin-top: 30px;
            }
            
            .browser-header {
                background: #f7fafc;
                padding: 15px 20px;
                border-bottom: 2px solid #e2e8f0;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .browser-controls {
                display: flex;
                gap: 8px;
            }
            
            .control {
                width: 12px;
                height: 12px;
                border-radius: 50%;
            }
            
            .close { background: #ff5f57; }
            .minimize { background: #ffbd2e; }
            .maximize { background: #28ca42; }
            
            .browser-url {
                flex: 1;
                background: white;
                padding: 8px 15px;
                border-radius: 20px;
                font-size: 14px;
                color: #718096;
                border: 1px solid #e2e8f0;
            }
            
            .browser-content {
                width: 100%;
                height: 600px;
                border: none;
            }
            
            .status {
                padding: 15px;
                background: #f0f9ff;
                border-radius: 10px;
                margin: 20px 0;
                border-left: 4px solid #3b82f6;
            }
            
            .status.error {
                background: #fef2f2;
                border-left-color: #ef4444;
            }
            
            .status.success {
                background: #f0fdf4;
                border-left-color: #22c55e;
            }
            
            .download-options {
                background: #f7fafc;
                padding: 30px;
                border-radius: 15px;
                margin-top: 30px;
                display: none;
            }
            
            .download-options h3 {
                margin-bottom: 20px;
                color: #2d3748;
            }
            
            .quality-buttons {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .quality-btn {
                background: white;
                border: 2px solid #e2e8f0;
                padding: 15px 25px;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .quality-btn:hover {
                background: #667eea;
                color: white;
                border-color: #667eea;
            }
            
            footer {
                text-align: center;
                padding: 30px;
                color: white;
                font-size: 0.9rem;
            }
            
            .legal {
                margin-top: 20px;
                opacity: 0.8;
                font-size: 0.8rem;
            }
            
            @media (max-width: 768px) {
                .container {
                    padding: 10px;
                }
                
                .main-content {
                    padding: 20px;
                }
                
                .input-group {
                    flex-direction: column;
                }
                
                #videoUrl {
                    min-width: auto;
                }
                
                .browser-content {
                    height: 400px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <header>
                <div class="logo">
                    <i class="fas fa-file-video"></i> ${SITE_CONFIG.name}
                </div>
                <h1>Download Videos from Any Website</h1>
                <p class="tagline">${SITE_CONFIG.tagline} <span class="version">${SITE_CONFIG.version}</span></p>
                
                <div class="stats">
                    <div class="stat-item">
                        <span class="stat-number">${SITE_CONFIG.fakeStats.users}</span>
                        <span class="stat-label">Active Users</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${SITE_CONFIG.fakeStats.downloads}</span>
                        <span class="stat-label">Downloads</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${SITE_CONFIG.fakeStats.successRate}</span>
                        <span class="stat-label">Success Rate</span>
                    </div>
                </div>
            </header>
            
            <div class="main-content">
                <div class="input-section">
                    <h2>Paste Video URL</h2>
                    <p>Enter the URL of any video from supported platforms</p>
                    
                    <div class="input-group">
                        <input type="text" id="videoUrl" placeholder="https://www.youtube.com/watch?v=..." value="https://www.youtube.com">
                        <button id="analyzeBtn" onclick="analyzeVideo()">
                            <i class="fas fa-search"></i> Analyze Video
                        </button>
                    </div>
                    
                    <div class="platforms">
                        <h3>Supported Platforms</h3>
                        <div class="platform-buttons">
                            ${platformButtons}
                        </div>
                    </div>
                </div>
                
                <div id="status" class="status">
                    <i class="fas fa-info-circle"></i> Enter a video URL above to start analysis
                </div>
                
                <div class="download-options" id="downloadOptions">
                    <h3>Available Formats</h3>
                    <div class="quality-buttons" id="qualityButtons">
                        <!-- Will be populated by JavaScript -->
                    </div>
                </div>
                
                <div class="browser-window">
                    <div class="browser-header">
                        <div class="browser-controls">
                            <div class="control close"></div>
                            <div class="control minimize"></div>
                            <div class="control maximize"></div>
                        </div>
                        <div class="browser-url" id="currentUrl">https://vidstream-downloader.com</div>
                    </div>
                    <iframe id="browserFrame" class="browser-content" sandbox="allow-same-origin allow-scripts allow-forms allow-popups"></iframe>
                </div>
            </div>
            
            <footer>
                <p>${SITE_CONFIG.name} is a free online video downloader tool</p>
                <p class="legal">
                    This service complies with DMCA. We do not host any videos, only provide download links from publicly available sources.
                    By using this service, you agree to our Terms of Service.
                </p>
            </footer>
        </div>
        
        <script>
            let currentVideoUrl = '';
            
            function analyzeVideo() {
                const urlInput = document.getElementById('videoUrl');
                const status = document.getElementById('status');
                const iframe = document.getElementById('browserFrame');
                const currentUrl = document.getElementById('currentUrl');
                
                currentVideoUrl = urlInput.value.trim();
                if (!currentVideoUrl) {
                    showStatus('Please enter a video URL', 'error');
                    return;
                }
                
                // Add protocol if missing
                if (!currentVideoUrl.startsWith('http://') && !currentVideoUrl.startsWith('https://')) {
                    currentVideoUrl = 'https://' + currentVideoUrl;
                    urlInput.value = currentVideoUrl;
                }
                
                showStatus('Analyzing video URL and fetching metadata...', '');
                currentUrl.textContent = currentVideoUrl;
                
                // Add random delay to look like real analysis
                setTimeout(() => {
                    const encodedUrl = encodeURIComponent(currentVideoUrl);
                    iframe.src = '/vidstream-fetch?url=' + encodedUrl;
                    
                    iframe.onload = () => {
                        showStatus('✓ Video analysis complete. Browser preview loaded.', 'success');
                        showDownloadOptions();
                    };
                    
                    iframe.onerror = () => {
                        showStatus('✗ Could not analyze this video. Try a different URL or platform.', 'error');
                    };
                }, getRandomDelay());
            }
            
            function analyzeUrl(platform) {
                const urlInput = document.getElementById('videoUrl');
                const urls = {
                    'youtube': 'https://www.youtube.com',
                    'twitter': 'https://twitter.com',
                    'instagram': 'https://instagram.com',
                    'tiktok': 'https://tiktok.com',
                    'reddit': 'https://reddit.com',
                    'facebook': 'https://facebook.com',
                    'twitch': 'https://twitch.tv',
                    'vimeo': 'https://vimeo.com',
                    'dailymotion': 'https://dailymotion.com',
                    'bilibili': 'https://bilibili.com'
                };
                
                if (urls[platform]) {
                    urlInput.value = urls[platform];
                    analyzeVideo();
                }
            }
            
            function showStatus(message, type) {
                const status = document.getElementById('status');
                status.innerHTML = \`<i class="fas fa-\${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i> \${message}\`;
                status.className = 'status ' + (type || '');
            }
            
            function showDownloadOptions() {
                const options = document.getElementById('downloadOptions');
                const buttons = document.getElementById('qualityButtons');
                
                const qualities = [
                    { quality: 'MP4 1080p', size: '185 MB', fakeUrl: '#' },
                    { quality: 'MP4 720p', size: '95 MB', fakeUrl: '#' },
                    { quality: 'MP4 480p', size: '45 MB', fakeUrl: '#' },
                    { quality: 'MP3 Audio', size: '12 MB', fakeUrl: '#' },
                    { quality: 'WEBM 1080p', size: '210 MB', fakeUrl: '#' }
                ];
                
                buttons.innerHTML = qualities.map(q => \`
                    <button class="quality-btn" onclick="fakeDownload('\${q.quality}')">
                        <div>\${q.quality}</div>
                        <small>\${q.size}</small>
                    </button>
                \`).join('');
                
                options.style.display = 'block';
            }
            
            function fakeDownload(quality) {
                showStatus(\`Preparing \${quality} download... This may take a moment.\`, '');
                
                // Fake processing delay
                setTimeout(() => {
                    showStatus(\`✓ \${quality} download ready! Click will start automatically.\`, 'success');
                    
                    // Simulate download start
                    setTimeout(() => {
                        const link = document.createElement('a');
                        link.href = '#';
                        link.download = 'video-' + Date.now() + '.mp4';
                        link.click();
                        
                        showStatus(\`Download started! Check your downloads folder for \${quality} file.\`, 'success');
                    }, 1500);
                }, 2000);
            }
            
            function getRandomDelay() {
                return Math.floor(Math.random() * 1000) + 800;
            }
            
            // Auto-analyze example on load
            window.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    document.getElementById('videoUrl').value = 'https://www.youtube.com';
                    analyzeVideo();
                }, 1000);
            });
            
            // Enter key support
            document.getElementById('videoUrl').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') analyzeVideo();
            });
        </script>
    </body>
    </html>
    `);
});

// ========== ПРОКСИ С МАКСИМАЛЬНОЙ МАСКИРОВКОЙ ==========
app.get('/vidstream-fetch', async (req, res) => {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
        return res.status(400).send(`
            <div style="padding: 40px; text-align: center;">
                <h2>Video Analysis Error</h2>
                <p>No video URL provided. Please go back and enter a valid video URL.</p>
                <button onclick="window.history.back()">← Back to Analyzer</button>
            </div>
        `);
    }
    
    try {
        const decodedUrl = decodeURIComponent(targetUrl);
        
        // Рандомная задержка для реалистичности
        await new Promise(resolve => setTimeout(resolve, Math.random() * 800 + 200));
        
        // Пробуем разные методы по очереди
        let response;
        let lastError;
        
        // Метод 1: Прямой запрос с маскировкой
        try {
            response = await axios.get(decodedUrl, {
                headers: getBrowserHeaders(),
                timeout: 8000,
                maxRedirects: 5
            });
        } catch (error1) {
            lastError = error1;
            
            // Метод 2: Через случайный публичный прокси
            try {
                const proxyUrl = getRandomProxyUrl(decodedUrl);
                response = await axios.get(proxyUrl, {
                    headers: getBrowserHeaders(),
                    timeout: 10000
                });
            } catch (error2) {
                lastError = error2;
                
                // Метод 3: Попробовать с другими настройками
                try {
                    response = await axios.get(decodedUrl, {
                        headers: {
                            ...getBrowserHeaders(),
                            'Accept': '*/*',
                            'Accept-Language': 'en'
                        },
                        timeout: 12000
                    });
                } catch (error3) {
                    throw new Error(`All methods failed: ${error3.message}`);
                }
            }
        }
        
        const html = response.data;
        const contentType = response.headers['content-type'] || 'text/html';
        
        // Удаляем прокси-заголовки из ответа
        const cleanHeaders = {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        };
        
        // Удаляем заголовки, которые выдают прокси
        delete response.headers['via'];
        delete response.headers['x-forwarded-for'];
        delete response.headers['x-forwarded-host'];
        
        // Если это HTML, обрабатываем
        if (contentType.includes('text/html')) {
            const $ = cheerio.load(html);
            
            // Удаляем анти-прокси скрипты
            $('script').each((i, elem) => {
                const scriptContent = $(elem).html() || '';
                if (scriptContent.includes('proxy') || 
                    scriptContent.includes('Cloudflare') || 
                    scriptContent.includes('DDoS') ||
                    scriptContent.includes('security.check')) {
                    $(elem).remove();
                }
            });
            
            // Удаляем теги noscript (часто содержат анти-прокси сообщения)
            $('noscript').remove();
            
            // Переписываем ссылки через наш "анализатор видео"
            $('a[href], link[href], script[src], img[src], iframe[src], form[action], source[src]').each((i, elem) => {
                const attrs = ['href', 'src', 'action'];
                attrs.forEach(attr => {
                    const value = $(elem).attr(attr);
                    if (value) {
                        try {
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
                            
                            // Маскируем под анализ видео
                            $(elem).attr(attr, '/vidstream-fetch?url=' + encodeURIComponent(fullUrl));
                        } catch (e) {
                            // Оставляем как есть
                        }
                    }
                });
            });
            
            // Добавляем скрытые элементы для маскировки
            $('body').prepend(`
                <div style="display: none;">
                    <!-- Маскировочные мета-теги -->
                    <meta name="video-duration" content="245">
                    <meta name="video-quality" content="1080p">
                    <meta name="video-format" content="MP4">
                    <div id="vidstream-player" data-loaded="true"></div>
                </div>
            `);
            
            res.set(cleanHeaders);
            return res.send($.html());
        }
        
        // Если не HTML, отдаём как есть
        res.set(cleanHeaders);
        res.send(html);
        
    } catch (error) {
        console.error('Video analysis error:', error.message);
        
        const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Video Analysis Failed</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; background: #fef2f2; color: #dc2626; }
                .container { max-width: 600px; margin: 0 auto; text-align: center; }
                h2 { margin-bottom: 20px; }
                .suggestion { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
                button { padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>🚫 Video Analysis Failed</h2>
                <p>We couldn't analyze this video due to platform restrictions.</p>
                
                <div class="suggestion">
                    <p><strong>Possible reasons:</strong></p>
                    <ul style="text-align: left; margin: 15px 0;">
                        <li>This video is private or age-restricted</li>
                        <li>The platform is blocking our analysis tool</li>
                        <li>Network connectivity issues</li>
                        <li>Video URL is invalid or expired</li>
                    </ul>
                </div>
                
                <p>Try these alternatives:</p>
                <div style="margin: 20px 0;">
                    <button onclick="window.location.href='/'">← Back to Analyzer</button>
                    <button onclick="window.location.reload()" style="background: #10b981;">🔄 Retry Analysis</button>
                </div>
                
                <p style="font-size: 0.9rem; color: #6b7280; margin-top: 30px;">
                    <i class="fas fa-shield-alt"></i> This is an automated video analysis tool.
                    We comply with all platform terms of service.
                </p>
            </div>
            
            <script>
                // Автоматический редирект через 10 секунд
                setTimeout(() => {
                    window.location.href = '/';
                }, 10000);
            </script>
        </body>
        </html>
        `;
        
        res.status(500).send(errorHtml);
    }
});

// ========== ФЕЙКОВЫЕ КОНЕЧНЫЕ ТОЧКИ ДЛЯ МАСКИРОВКИ ==========
app.get('/api/analyze', (req, res) => {
    res.json({
        success: true,
        videoInfo: {
            title: "Sample Video Title",
            duration: "4:32",
            quality: ["1080p", "720p", "480p"],
            thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
            formats: ["MP4", "WEBM", "MP3"],
            size: "185 MB"
        },
        downloadLinks: [
            { quality: "1080p", format: "MP4", url: "#", size: "185 MB" },
            { quality: "720p", format: "MP4", url: "#", size: "95 MB" },
            { quality: "480p", format: "MP4", url: "#", size: "45 MB" },
            { quality: "Audio", format: "MP3", url: "#", size: "12 MB" }
        ]
    });
});

app.get('/terms', (req, res) => {
    res.send(`
        <div style="max-width: 800px; margin: 40px auto; padding: 30px; background: white; border-radius: 15px;">
            <h1>Terms of Service</h1>
            <p>${SITE_CONFIG.name} is a free online video analysis tool...</p>
        </div>
    `);
});

// ========== ЗАПУСК СЕРВЕРА ==========
app.listen(PORT, () => {
    console.log(`🎬 ${SITE_CONFIG.name} ${SITE_CONFIG.version}`);
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌐 Open: http://localhost:${PORT}`);
    console.log(`⚡ Features: User-Agent rotation, browser masking, anti-block measures`);
});