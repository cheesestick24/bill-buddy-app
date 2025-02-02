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
        // shareViaLine() {
        //     const message = `場所: ${this.location}\nメモ: ${this.memo}\n私の金額: ${this.calculatedAmounts.myShare}\n相手の金額: ${this.calculatedAmounts.theirShare}`;
        //     const url = `https://line.me/R/msg/text/?${encodeURIComponent(message)}`;
        //     window.open(url, '_blank');
        // }
    }
});

app.mount('#app');
