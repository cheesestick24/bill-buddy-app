const loginApp = Vue.createApp({
    data() {
        return {
            username: '',
            password: '',
            errorMessage: ''
        };
    },
    methods: {
        async login() {
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username: this.username, password: this.password })
                });
                if (response.ok) {
                    window.location.href = '/';
                } else {
                    this.errorMessage = 'ログインに失敗しました';
                }
            } catch (error) {
                console.error('Error during login:', error);
                this.errorMessage = 'ログインに失敗しました';
            }
        }
    }
});

loginApp.mount('#login');
