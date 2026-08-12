const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const settingsToggle = document.getElementById('settings-toggle');
const settingsPanel = document.getElementById('settings-panel');
const welcomeScreen = document.getElementById('welcome-screen');
const statusText = document.getElementById('status-text');
const temperatureInput = document.getElementById('temperature');
const topKInput = document.getElementById('top-k');
const maxLengthInput = document.getElementById('max-length');

let isGenerating = false;
let conversationStarted = false;

document.addEventListener('DOMContentLoaded', () => {
    loadModelInfo();
    setupEventListeners();
    autoResizeTextarea();
});

async function loadModelInfo() {
    try {
        const response = await fetch('/api/info');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        document.getElementById('info-params').textContent = data.params;
        document.getElementById('info-vocab').textContent = data.vocab_size;
        document.getElementById('info-device').textContent = data.device;
        document.getElementById('info-layers').textContent = data.layers;
        document.getElementById('info-heads').textContent = data.heads;
        document.getElementById('info-embed').textContent = data.embed_dim;
        document.getElementById('info-block').textContent = data.block_size;
        statusText.textContent = data.model_ready
            ? `${data.device} · modèle entraîné`
            : 'Base locale · prête';
    } catch (error) {
        statusText.textContent = 'Serveur indisponible';
        console.error('Chargement des informations impossible :', error);
    }
}

function setupEventListeners() {
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
    messageInput.addEventListener('input', autoResizeTextarea);
    settingsToggle.addEventListener('click', () => {
        settingsPanel.classList.toggle('open');
        settingsToggle.classList.toggle('active');
    });
    temperatureInput.addEventListener('input', () => {
        document.getElementById('temp-value').textContent = temperatureInput.value;
    });
    topKInput.addEventListener('input', () => {
        document.getElementById('topk-value').textContent = topKInput.value;
    });
    maxLengthInput.addEventListener('input', () => {
        document.getElementById('length-value').textContent = maxLengthInput.value;
    });
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            messageInput.value = chip.dataset.text;
            autoResizeTextarea();
            messageInput.focus();
        });
    });
}

function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    messageInput.style.height = `${Math.min(messageInput.scrollHeight, 120)}px`;
}

function timestamp() {
    return new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});
}

function appendMessage(role, text, meta = timestamp()) {
    if (!conversationStarted && welcomeScreen) {
        welcomeScreen.style.display = 'none';
        conversationStarted = true;
    }
    const row = document.createElement('div');
    row.className = `message ${role}`;
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? '👤' : '🤖';
    const body = document.createElement('div');
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = text;
    const metadata = document.createElement('div');
    metadata.className = 'message-meta';
    metadata.textContent = meta;
    body.append(content, metadata);
    row.append(avatar, body);
    messagesContainer.appendChild(row);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showTyping() {
    const row = document.createElement('div');
    row.className = 'typing-indicator';
    row.id = 'typing-indicator';
    row.innerHTML = '<div class="message-avatar">🤖</div><div class="typing-dots"><span></span><span></span><span></span></div>';
    messagesContainer.appendChild(row);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || isGenerating) return;
    isGenerating = true;
    sendBtn.disabled = true;
    messageInput.value = '';
    autoResizeTextarea();
    appendMessage('user', text);
    showTyping();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                message: text,
                temperature: Number(temperatureInput.value),
                top_k: Number(topKInput.value),
                max_length: Number(maxLengthInput.value)
            })
        });
        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error || `Erreur HTTP ${response.status}`);
        appendMessage('ai', data.response, `${timestamp()} · ${data.response_tokens} tokens`);
    } catch (error) {
        appendMessage('ai', `Erreur : ${error.message}`);
    } finally {
        document.getElementById('typing-indicator')?.remove();
        isGenerating = false;
        sendBtn.disabled = false;
        messageInput.focus();
    }
}
