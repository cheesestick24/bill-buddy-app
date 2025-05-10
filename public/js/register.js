document.getElementById('registerForm').addEventListener('submit', async function (event) {
    event.preventDefault();
    const formData = new FormData(this);
    const data = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password')
    };
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            window.location.href = '/';
        } else if (response.status === 409) {
            const errorMessage = document.getElementById('errorMessage');
            errorMessage.textContent = 'ユーザー名またはメールアドレスが既に存在します';
            errorMessage.style.display = 'block';
        } else {
            alert('登録に失敗しました');
        }
    } catch (error) {
        console.error('Error during registration:', error);
        alert('登録に失敗しました');
    }
});
