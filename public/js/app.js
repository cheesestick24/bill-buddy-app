const app = Vue.createApp({
    data() {
        return {
            myAmount: 0,
            theirAmount: 0,
            totalAmount: 0,
            location: '',
            memo: '',
            date: new Date().toISOString().split('T')[0],
            splitRatio: 50,
            roundingOption: 'even',
            saveMessage: '',
            errorMessage: '',
            username: '', // 追加
            isSettled: false,
            showOptionalFields: false, // 追加
            category: '' // デフォルト値を空白に変更
        };
    },
    computed: {
        calculatedAmounts() {
            const myShare = (this.totalAmount * (this.splitRatio / 100)).toFixed(2);
            const theirShare = (this.totalAmount * ((100 - this.splitRatio) / 100)).toFixed(2);
            return {
                myShare: this.applyRounding(myShare),
                theirShare: this.applyRounding(theirShare)
            };
        },
        formattedDate() {
            const date = new Date(this.date);
            const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
            return date.toLocaleDateString('ja-JP', options);
        }
    },
    methods: {
        applyRounding(amount) {
            let roundedAmount;
            if (this.roundingOption === 'even') {
                roundedAmount = Math.round(amount / 100) * 100;
            } else if (this.roundingOption === 'more') {
                roundedAmount = Math.ceil(amount / 100) * 100;
            } else {
                roundedAmount = Math.floor(amount / 100) * 100;
            }
            return roundedAmount;
        },
        formatCurrency(amount) {
            return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
        },
        async saveData() {
            if (this.totalAmount <= 0) {
                this.errorMessage = '合計金額は0円以上でなければなりません';
                return;
            }
            this.errorMessage = '';
            const data = {
                date: this.date,
                totalAmount: this.totalAmount,
                location: this.location,
                memo: this.memo,
                splitRatio: this.splitRatio,
                roundingOption: this.getRoundingOptionInJapanese(),
                myShare: this.calculatedAmounts.myShare,
                theirShare: this.calculatedAmounts.theirShare,
                isSettled: this.isSettled,
                category: this.category // 追加
            };
            try {
                const response = await fetch('/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                if (response.ok) {
                    this.saveMessage = 'データが正常に保存されました';
                    this.resetForm();
                } else {
                    const errorText = await response.text();
                    this.saveMessage = `データの保存中にエラーが発生しました: ${errorText}`;
                }
            } catch (error) {
                console.error('Error saving data:', error);
                this.saveMessage = `データの保存中にエラーが発生しました: ${error.message}`;
            }
        },
        getRoundingOptionInJapanese() {
            if (this.roundingOption === 'even') {
                return '四捨五入';
            } else if (this.roundingOption === 'more') {
                return '相手が多め';
            } else {
                return '自分が多め';
            }
        },
        goToHistory() {
            window.location.href = '/history';
        },
        goToLogin() {
            window.location.href = '/login';
        },
        async checkLogin() {
            try {
                const response = await fetch('/api/check-login');
                if (response.ok) {
                    const data = await response.json();
                    this.username = data.username; // ユーザー名を設定
                } else {
                    this.goToLogin();
                }
            } catch (error) {
                console.error('Error checking login status:', error);
                this.goToLogin();
            }
        },
        async logout() {
            try {
                const response = await fetch('/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if (response.ok) {
                    window.location.href = '/html/logout.html'; // ログアウト後にログアウト画面に遷移
                } else {
                    const errorText = await response.text();
                    console.error(`Error during logout: ${errorText}`);
                }
            } catch (error) {
                console.error('Error during logout:', error);
            }
        },
        keepSessionAlive() {
            setInterval(async () => {
                try {
                    await fetch('/api/check-login');
                } catch (error) {
                    console.error('Error keeping session alive:', error);
                }
            }, 15 * 60 * 1000); // 15分ごとにリクエストを送信
        },
        resetForm() {
            this.myAmount = 0;
            this.theirAmount = 0;
            this.totalAmount = 0;
            this.location = '';
            this.memo = '';
            this.date = new Date().toISOString().split('T')[0];
            this.splitRatio = 50;
            this.roundingOption = 'even';
            this.saveMessage = '';
            this.errorMessage = '';
            this.category = ''; // デフォルト値を空白に変更
        },
        toggleOptionalFields() {
            this.showOptionalFields = !this.showOptionalFields;
        }
    },
    mounted() {
        this.checkLogin();
        this.keepSessionAlive(); // セッションを延長するためのリクエストを開始
    }
});

app.mount('#app');
