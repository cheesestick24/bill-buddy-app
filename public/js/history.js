const historyApp = Vue.createApp({
    data() {
        return {
            records: []
        };
    },
    async created() {
        try {
            const response = await fetch('/api/history');
            this.records = await response.json();
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    },
    methods: {
        formatDate(dateString) {
            const date = new Date(dateString);
            const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
            return date.toLocaleDateString('ja-JP', options);
        },
        formatCurrency(amount) {
            return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
        }
    }
});

historyApp.mount('#history');
