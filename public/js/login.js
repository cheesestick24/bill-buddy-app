const loginApp = Vue.createApp({
    data() {
        return {
            usernameOrEmail: '',
            errorMessage: '',
            isLoading: false
        };
    },
    methods: {
        async sendOtp() {
            this.isLoading = true;
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ usernameOrEmail: this.usernameOrEmail })
                });
                if (response.ok) {
                    console.log('OTP sent successfully');
                    window.location.href = `/otp?usernameOrEmail=${encodeURIComponent(this.usernameOrEmail)}`;
                } else if (response.status === 404) {
                    console.log('User not found, redirecting to register');
                    window.location.href = '/register';
                } else {
                    const errorText = await response.text();
                    this.errorMessage = `OTPの送信に失敗しました: ${errorText}`;
                    document.getElementById('errorMessage').style.display = 'block';
                }
            } catch (error) {
                console.error('Error during OTP sending:', error);
                this.errorMessage = 'OTPの送信に失敗しました';
                document.getElementById('errorMessage').style.display = 'block';
            } finally {
                this.isLoading = false;
            }
        }
    }
});

const appInstance = loginApp.mount('#login');

document.getElementById('loginForm').addEventListener('submit', function (event) {
    event.preventDefault();
    appInstance.sendOtp();
});

document.getElementById('registerButton').addEventListener('click', function (event) {
    if (appInstance.isLoading) {
        event.preventDefault();
    }
});
