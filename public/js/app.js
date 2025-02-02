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
            errorMessage: ''
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
                theirShare: this.calculatedAmounts.theirShare
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
                } else {
                    this.saveMessage = 'データの保存中にエラーが発生しました';
                }
            } catch (error) {
                console.error('Error saving data:', error);
                this.saveMessage = 'データの保存中にエラーが発生しました';
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
        }
    }
});

app.mount('#app');
