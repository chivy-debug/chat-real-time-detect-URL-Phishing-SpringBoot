document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const form = this;
    const username = document.getElementById('username');
    const errorMessage = document.getElementById('error-message');
    const submitButton = form.querySelector('.login-btn');
    const loadingIndicator = form.querySelector('.loading');
    const btnText = form.querySelector('.btn-text');

    const usernameValue = username.value.trim();
    if (!usernameValue) {
        showError('Vui lòng nhập tên của bạn');
        return;
    }

    submitButton.disabled = true;
    btnText.style.display = 'none';
    loadingIndicator.classList.add('show');
    errorMessage.classList.remove('show');

    try {
        // Send message to WebSocket for username validation
        stompClient.send("/app/chat.addUser", {}, JSON.stringify({ sender: usernameValue }));

    } catch (error) {
        console.error('Error:', error);
        showError('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
        submitButton.disabled = false;
        btnText.style.display = 'inline';
        loadingIndicator.classList.remove('show');
    }
});

function showError(message) {
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = message;
    errorMessage.classList.remove('show');
    void errorMessage.offsetWidth;
    errorMessage.classList.add('show');
}


document.getElementById('username').addEventListener('input', function (e) {
    const value = e.target.value;
    // Cập nhật regex để cho phép tất cả các ký tự chữ cái (bao gồm có dấu) và các ký tự hợp lệ khác
    if (value && !value.match(/^[A-Za-z0-9_\-\s\u00C0-\u1EF9]+$/)) {
        e.target.setCustomValidity('Tên đăng nhập chỉ được chứa chữ cái, số, gạch dưới, gạch ngang.');
    } else {
        e.target.setCustomValidity('');
    }
});