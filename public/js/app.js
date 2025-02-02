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
            roundingOption: 'even'
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
        async saveData() {
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
                    alert('データが正常に保存されました');
                } else {
                    alert('データの保存中にエラーが発生しました');
                }
            } catch (error) {
                console.error('Error saving data:', error);
                alert('データの保存中にエラーが発生しました');
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
        }
    }
});

app.mount('#app');
