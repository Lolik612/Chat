let socket = null;
let userCount = 0;

function addMessage(text, type = 'system', nick = '', time = '') {
    const chatBox = document.getElementById('chat-box');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;
    
    if (type === 'system') {
        msgDiv.textContent = text;
    } else {
        msgDiv.innerHTML = `<span class="nick">${nick}:</span> ${text} <span class="time">${time}</span>`;
    }
    
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    updateUserCount();
}

function connect() {
    const ip = document.getElementById('ip-input').value;
    const nick = document.getElementById('nick-input').value.trim();
    
    if (!nick) {
        alert('Введите ник!');
        return;
    }
    
    if (!ip.includes(':')) {
        alert('Введите IP:PORT (например: 192.168.1.100:5555)');
        return;
    }
    
    const [host, port] = ip.split(':');
    
    try {
        socket = new WebSocket(`ws://${host}:${port}`);
        
        socket.onopen = function() {
            socket.send(nick);
            document.getElementById('status').textContent = '✅ Подключено';
            document.getElementById('status').className = 'connected';
            document.getElementById('message-input').disabled = false;
            document.getElementById('send-btn').disabled = false;
            addMessage('Подключение установлено!', 'system');
        };
        
        socket.onmessage = function(event) {
            if (event.data.startsWith('📢')) {
                addMessage(event.data, 'system');
            } else {
                try {
                    const data = JSON.parse(event.data);
                    addMessage(data.text, 'other', data.nick, data.time);
                } catch {
                    addMessage(event.data, 'other');
                }
            }
        };
        
        socket.onerror = function(error) {
            addMessage('Ошибка подключения', 'system');
            document.getElementById('status').textContent = '❌ Ошибка';
            document.getElementById('status').className = '';
        };
        
        socket.onclose = function() {
            addMessage('Соединение разорвано', 'system');
            document.getElementById('status').textContent = '❌ Отключено';
            document.getElementById('status').className = '';
            document.getElementById('message-input').disabled = true;
            document.getElementById('send-btn').disabled = true;
        };
        
    } catch (e) {
        alert('Ошибка: ' + e.message);
    }
}

function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    
    if (text && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({text: text}));
        addMessage(text, 'user', 'Вы', new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
        input.value = '';
    }
}

function updateUserCount() {
    const messages = document.querySelectorAll('.message:not(.system)');
    const uniqueUsers = new Set();
    messages.forEach(msg => {
        const nickSpan = msg.querySelector('.nick');
        if (nickSpan) {
            uniqueUsers.add(nickSpan.textContent.replace(':', ''));
        }
    });
    userCount = uniqueUsers.size + 1;
    document.getElementById('user-count').textContent = userCount;
}

// Отправка по Enter
document.getElementById('message-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Получение локального IP (примерно)
window.onload = function() {
    // Пытаемся получить локальный IP через WebRTC (работает не везде)
    const pc = new RTCPeerConnection({iceServers: []});
    pc.createDataChannel('');
    pc.createOffer().then(offer => pc.setLocalDescription(offer));
    pc.onicecandidate = function(ice) {
        if (ice && ice.candidate && ice.candidate.candidate) {
            const ip = ice.candidate.candidate.split(' ')[4];
            if (ip && ip.match(/\d+\.\d+\.\d+\.\d+/)) {
                document.getElementById('ip-input').value = ip + ':5555';
            }
            pc.close();
        }
    };
};
