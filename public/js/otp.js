const otpApp = Vue.createApp({
    data() {
        return {
            otp: '',
            usernameOrEmail: '',
            errorMessage: ''
        };
    },
    methods: {
        async verifyOtp() {
            try {
                const response = await fetch('/verify-otp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ usernameOrEmail: this.usernameOrEmail, otp: this.otp })
                });
                if (response.ok) {
                    window.location.href = '/';
                } else {
                    this.errorMessage = 'OTPの認証に失敗しました';
                    document.getElementById('errorMessage').style.display = 'block';
                }
            } catch (error) {
                console.error('Error during OTP verification:', error);
                this.errorMessage = 'OTPの認証に失敗しました';
                document.getElementById('errorMessage').style.display = 'block';
            }
        }
    },
    mounted() {
        const params = new URLSearchParams(window.location.search);
        this.usernameOrEmail = params.get('usernameOrEmail');
        // Remove email from URL
        params.delete('usernameOrEmail');
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, '', newUrl);
    }
});

const appInstance = otpApp.mount('#otp');

document.getElementById('otpForm').addEventListener('submit', function (event) {
    event.preventDefault();
    appInstance.verifyOtp();
});
