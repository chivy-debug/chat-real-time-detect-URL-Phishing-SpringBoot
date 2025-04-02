const socket = io();
const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const phishingAlert = document.getElementById("phishing-alert");
const phishingConfirmation = document.getElementById("phishing-confirmation");
const phishingUrlSpan = document.getElementById("phishing-url");
const logoutBtn = document.querySelector(".logout-btn");
const username = "{{ username }}";

// Track joined users to prevent duplicate notifications
const joinedUsers = new Set();
let lastPhishingMessage = null;

// URL detection and conversion function
function convertUrlsToLinks(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
        return `<a href="#" class="message-link" data-url="${url}">${url}</a>`;
    });
}

function createUrlConfirmationDialog(url) {
    const confirmationDialog = document.createElement('div');
    confirmationDialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                z-index: 1000;
                text-align: center;
            `;

    confirmationDialog.innerHTML = `
                  <h3 style="color: #dc3545; margin-bottom: 15px;">⚠️ Cảnh báo truy cập URL</h3>
                  <p style="font-size: 16px; color: #333; margin-bottom: 10px;">Bạn có chắc chắn muốn truy cập URL sau không?</p>
                  <p style="font-size: 14px; color: #6c757d; margin-bottom: 20px;">Vì lí do bảo mật, lưu ý không cung cấp thông tin cá nhân (mật khẩu, số điện thoại,...) để tránh mất tài khoản.</p>
                  <p style="font-size: 18px; font-weight: bold; color: #0d6efd; word-wrap: break-word; margin-bottom: 20px;">${url}</p>
                  <button id="confirm-url" style="background: #0d6efd; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; margin-right: 10px;">Đồng ý</button>
                  <button id="cancel-url" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px;">Hủy</button>
            `;

    document.body.appendChild(confirmationDialog);

    const confirmButton = confirmationDialog.querySelector('#confirm-url');
    const cancelButton = confirmationDialog.querySelector('#cancel-url');

    confirmButton.addEventListener('click', () => {
        window.open(url, '_blank');
        document.body.removeChild(confirmationDialog);
    });

    cancelButton.addEventListener('click', () => {
        document.body.removeChild(confirmationDialog);
    });
}

function addSystemMessage(message) {
    const systemMessage = document.createElement('div');
    systemMessage.classList.add('system-message');
    systemMessage.textContent = message;
    chatBox.appendChild(systemMessage);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    // Simple URL detection regex
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = message.match(urlRegex);

    socket.emit('send_message', {
        sender: username,
        message: message,
        urls: urls || [],
        timestamp: new Date().toISOString()
    });
    messageInput.value = "";
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendMessage();
});

socket.on('receive_message', (data) => {
    const messageDiv = document.createElement('div');
    const messageClass = data.sender === username ? 'sent' : 'received';
    messageDiv.classList.add('message', messageClass);

    // Convert URLs to clickable links
    const messageWithLinks = convertUrlsToLinks(data.message);

    messageDiv.innerHTML = `
                <div class="message-sender">${data.sender}</div>
                <div>${messageWithLinks}</div>
            `;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Add click event to links
    const links = messageDiv.querySelectorAll('.message-link');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const url = e.target.getAttribute('data-url');
            createUrlConfirmationDialog(url);
        });
    });

    // Phishing detection remains the same
    if (data.phishing_detected && data.sender !== username) {
        phishingAlert.textContent = `Cảnh báo: Nghi ngờ URL lừa đảo! (${data.phishing_urls})`;
        phishingAlert.style.display = 'block';

        lastPhishingMessage = {
            element: messageDiv,
            url: data.phishing_urls
        };

        setTimeout(() => {
            phishingAlert.style.display = 'none';
        }, 5000);

        phishingUrlSpan.textContent = data.phishing_urls;
        phishingConfirmation.style.display = 'block';
    }
});

// Phishing confirmation buttons
document.querySelector('.delete-btn').addEventListener('click', () => {
    if (lastPhishingMessage) {
        chatBox.removeChild(lastPhishingMessage.element);
        phishingConfirmation.style.display = 'none';

        socket.emit('delete_phishing_message', {
            url: lastPhishingMessage.url,
            sender: username
        });

        lastPhishingMessage = null;
    }
});

document.querySelector('.cancel-btn').addEventListener('click', () => {
    phishingConfirmation.style.display = 'none';
    lastPhishingMessage = null;
});

// Thêm CSS cho liên kết
const linkStyle = document.createElement('style');
linkStyle.textContent = `
            .message-link {
                color: #0d6efd;
                text-decoration: underline;
                word-break: break-all;
                cursor: pointer;
            }
            .message-link:hover {
                color: #0056b3;
            }
        `;
document.head.appendChild(linkStyle);

// Socket connection and user joined events remain the same
socket.on('connect', () => {
    socket.emit('user_joined', {username: username});
});

socket.on('user_joined', (data) => {
    if (data.username !== username && !joinedUsers.has(data.username)) {
        joinedUsers.add(data.username);
        addSystemMessage(`${data.username} đã tham gia cuộc trò chuyện`);
    }
});

// Logout handling
logoutBtn.addEventListener('click', () => {
    fetch('/logout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({username})
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = data.redirect;
            } else {
                alert(data.message);
            }
        })
        .catch(error => {
            console.error('Logout error:', error);
        });
});

// User logout event
socket.on('user_logout', (data) => {
    addSystemMessage(`${data.username} đã rời khỏi cuộc trò chuyện`);
    joinedUsers.delete(data.username);
});