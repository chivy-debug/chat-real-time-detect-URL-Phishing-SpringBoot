'use strict';

var usernamePage = document.querySelector('#username-page');
var chatPage = document.querySelector('#chat-page');
var usernameForm = document.querySelector('#usernameForm');
var messageForm = document.querySelector('#messageForm');
var messageInput = document.querySelector('#message-input');
var messageArea = document.querySelector('#chat-box');
var connectingElement = document.querySelector('.connecting');

var stompClient = null;
var username = null;

var colors = [
    '#2196F3', '#32c787', '#00BCD4', '#ff5652',
    '#ffc107', '#ff85af', '#FF9800', '#39bbb0'
];

function removeStylesheet(href) {
    var linkElements = document.querySelectorAll('link[rel="stylesheet"]');

    linkElements.forEach(function(link) {
        if (link.href.includes(href)) {
            link.parentNode.removeChild(link); // Loại bỏ link CSS
        }
    });
}

function connect(event) {
    event.preventDefault();
    username = document.querySelector('#username').value.trim();

    if (username) {
        // Store username in session storage
        sessionStorage.setItem('username', username);

        // Redirect to the chat page (chat.html)
        window.location.href = 'chat.html';
    }
}

function onConnected() {
    stompClient.subscribe('/topic/chat', onMessageReceived);
    stompClient.send("/app/chat.addUser", {}, JSON.stringify({sender: username, type: 'JOIN'}));
    connectingElement.classList.add('hidden');
}

function onError(error) {
    connectingElement.textContent = 'Not able to connect. Please try again';
    connectingElement.style.color = 'red';
}

function sendMessage(event) {
    event.preventDefault();

    var messageContent = messageInput.value.trim();
    console.log(messageContent);

    if (messageContent && stompClient) {
        var chatMessage = {
            sender: username,
            content: messageInput.value,
            type: 'CHAT'
        };

        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
        messageInput.value = '';
    }
}

function onMessageReceived(payload) {
    var message = JSON.parse(payload.body);

    var messageElement = document.createElement('li');

    if (message.type === 'JOIN') {
        messageElement.classList.add('event-message');
        message.content = message.sender + ' joined!';
    } else if (message.type === 'LEAVE') {
        messageElement.classList.add('event-message');
        message.content = message.sender + ' left!';
    } else {
        messageElement.classList.add('chat-message');

        var avatarElement = document.createElement('i');
        var avatarText = document.createTextNode(message.sender[0]);
        avatarElement.appendChild(avatarText);
        avatarElement.style['background-color'] = getAvatarColor(message.sender);

        messageElement.appendChild(avatarElement);

        var usernameElement = document.createElement('span');
        var usernameText = document.createTextNode(message.sender);
        usernameElement.appendChild(usernameText);
        messageElement.appendChild(usernameElement);
    }

    var textElement = document.createElement('p');
    var messageText = document.createTextNode(message.content);
    textElement.appendChild(messageText);

    messageElement.appendChild(textElement);

    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight;
}

function getAvatarColor(messageSender) {
    var hash = 0;
    for (var i = 0; i < messageSender.length; i++) {
        hash = 31 * hash + messageSender.charCodeAt(i);
    }
    var index = Math.abs(hash % colors.length);
    return colors[index];
}

if (usernameForm != null) {
    usernameForm.addEventListener('submit', connect, true);
}

if (messageForm != null) {
    messageForm.addEventListener('submit', sendMessage, true);
}
