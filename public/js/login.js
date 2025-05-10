const loginApp = Vue.createApp({
    data() {
        return {
            email: '',
            password: '',
            errorMessage: '',
            isLoading: false
        };
    },
    methods: {
        async login() {
            this.isLoading = true;
            this.errorMessage = ''; // エラーメッセージをリセット
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: this.email,
                        password: this.password
                    })
                });
                if (response.ok) {
                    console.log('Login successful');
                    window.location.href = '/html/history.html'; // ログイン成功後のリダイレクト先
                } else if (response.status === 401) {
                    this.errorMessage = 'メールアドレスまたはパスワードが正しくありません';
                } else if (response.status === 404) {
                    this.errorMessage = 'ユーザーが見つかりません。新規登録してください';
                } else {
                    const errorText = await response.text();
                    this.errorMessage = `ログインに失敗しました: ${errorText}`;
                }
            } catch (error) {
                console.error('Error during login:', error);
                this.errorMessage = 'ログインに失敗しました';
            } finally {
                this.isLoading = false;
            }
        }
    }
});

const appInstance = loginApp.mount('#login');

document.getElementById('loginForm').addEventListener('submit', function (event) {
    event.preventDefault();
    appInstance.login();
});
