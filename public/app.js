document.addEventListener("DOMContentLoaded", () => {
    // 1. UI Navigation
    const navLinks = document.querySelectorAll('.nav-links li');
    const screens = document.querySelectorAll('.screen');
    const titleText = document.getElementById('current-view-title');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const tabId = link.getAttribute('data-tab');
            const navText = link.querySelector('.nav-text').innerText;
            titleText.innerHTML = navText + '<span class="blink">_</span>';

            screens.forEach(screen => {
                screen.classList.remove('active');
                if (screen.id === `screen-${tabId}`) {
                    screen.classList.add('active');
                }
            });
        });
    });

    // 2. System Websocket (Fix cứng vào Server nội bộ trên PC)
    let wsHost = window.location.hostname;
    // Nếu chạy trên Github Pages, tự động ép kết nối trỏ về thiết bị chạy ngầm trên máy vật lý
    if (wsHost.includes('github.io')) wsHost = '127.0.0.1';

    // Lưu ý: Kết nối Websocket từ trang HTTPS (Github) tới máy Local (WS không bảo mật) sẽ bị trình duyệt chặn!
    const wsUrl = `ws://${wsHost}:18789/?type=webui`;
    const socketStatusEl = document.getElementById('socket-status');
    const socketTextEl = document.getElementById('socket-text');

    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const btnSend = document.getElementById('btn-send');
    const logsContainer = document.getElementById('system-logs');

    let ws;
    let msgCount = 0;

    function connectWebSocket() {
        socketTextEl.textContent = 'CONNECTING...';
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            socketStatusEl.className = 'status-indicator online';
            socketTextEl.textContent = 'LINK ESTABLISHED';
            logTerminalEvent('SYS', `WSS Channel opened at ${wsUrl}`);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleIncomingMessage(data);
            } catch (e) {
                logTerminalEvent('ERR', `Failed to parse data payload.`);
            }
        };

        ws.onclose = () => {
            socketStatusEl.className = 'status-indicator offline';
            socketTextEl.textContent = 'CONNECTION LOST';
            logTerminalEvent('SYS', `Connection severed. Re-linking in 3000ms...`);
            setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (err) => {
            logTerminalEvent('ERR', `Socket protocol failure.`);
            ws.close();
        };
    }

    function handleIncomingMessage(msg) {
        // Tăng đếm Telemetry
        msgCount++;
        document.getElementById('context-count').textContent = String(msgCount).padStart(3, '0');

        if (msg.type === 'system') {
            appendSystemMessage(`[SYS] ${msg.message}`);
            logTerminalEvent('SYS', msg.message);
        } else if (msg.type === 'chat') {
            appendMessage('ai', msg.content);
            logTerminalEvent('AI_RESP', `Received ${msg.content.length} bytes.`);
        } else if (msg.type === 'error') {
            appendSystemMessage(`[CRIT_ERR] ${msg.content}`);
            logTerminalEvent('CRIT', msg.content);
        }
    }

    function sendMessage() {
        const text = chatInput.value.trim();
        if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;

        const payload = {
            id: crypto.randomUUID(),
            type: 'chat',
            channelId: 'terminal-ui',
            content: text
        };

        ws.send(JSON.stringify(payload));
        appendMessage('user', text);
        logTerminalEvent('USER', `Transmitted command: ${text}`);
        chatInput.value = '';
    }

    function appendMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}-msg`;
        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';
        bubble.textContent = text;

        msgDiv.appendChild(bubble);
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function appendSystemMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message system-msg';
        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';
        bubble.textContent = text;
        msgDiv.appendChild(bubble);
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function logTerminalEvent(type, block) {
        const div = document.createElement('div');
        div.textContent = `[${new Date().toISOString().split('T')[1]}] [${type}] > ${block}`;
        logsContainer.appendChild(div);
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    btnSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    connectWebSocket();
});
