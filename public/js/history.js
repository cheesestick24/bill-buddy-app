const historyApp = Vue.createApp({
    data() {
        return {
            records: [],
            selectedRecords: [],
            message: '',
            isSettled: false,
            filterOption: 'unsettled' // 追加
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
        },
        async deleteRecord(id) {
            if (!confirm('このレコードを削除してもよろしいですか？')) {
                return;
            }
            try {
                const response = await fetch(`/api/history/${id}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    this.records = this.records.filter(record => record.id !== id);
                } else {
                    const errorText = await response.text();
                    alert(`レコードの削除中にエラーが発生しました: ${errorText}`);
                }
            } catch (error) {
                console.error('Error deleting record:', error);
                alert(`レコードの削除中にエラーが発生しました: ${error.message}`);
            }
        },
        async deleteSelectedRecords() {
            if (!confirm('選択されたデータを削除してもよろしいですか？')) {
                return;
            }
            const idsToDelete = this.selectedRecords.map(record => record.id);
            try {
                const response = await fetch('/api/history/bulk-delete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ids: idsToDelete })
                });
                if (response.ok) {
                    this.records = this.records.filter(record => !idsToDelete.includes(record.id));
                    this.selectedRecords = [];
                    this.updateSelectedData();
                } else {
                    const errorText = await response.text();
                    alert(`データの削除中にエラーが発生しました: ${errorText}`);
                }
            } catch (error) {
                console.error('Error deleting records:', error);
                alert(`データの削除中にエラーが発生しました: ${error.message}`);
            }
        },
        goToHome() {
            window.location.href = '/';
        },
        updateSelectedData() {
            this.selectedRecords = this.records.filter(record => record.selected);
            this.message = '';
        },
        copyToClipboard() {
            if (this.selectedRecords.length === 0) {
                this.message = '選択されたデータがありません';
                return;
            }
            const totalAmount = this.formatCurrency(this.totalAmount);
            const myShare = this.formatCurrency(this.myShare);
            const theirShare = this.formatCurrency(this.theirShare);
            const textToCopy = `
                合計金額: ${totalAmount}
                私の金額: ${myShare}
                相手の金額: ${theirShare}
            `;

            navigator.clipboard.writeText(textToCopy).then(() => {
                this.message = 'クリップボードにコピーしました';
            }).catch(err => {
                console.error('Error copying to clipboard:', err);
                this.message = 'クリップボードへのコピーに失敗しました';
            });
        },
        toggleSelection(record) {
            record.selected = !record.selected;
            this.updateSelectedData();
        }
    },
    computed: {
        totalAmount() {
            return this.selectedRecords.reduce((sum, record) => sum + parseFloat(record.totalAmount), 0);
        },
        myShare() {
            return this.selectedRecords.reduce((sum, record) => sum + parseFloat(record.myShare), 0);
        },
        theirShare() {
            return this.selectedRecords.reduce((sum, record) => sum + parseFloat(record.theirShare), 0);
        },
        filteredRecords() {
            if (this.filterOption === 'unsettled') {
                return this.records.filter(record => !record.isSettled);
            } else if (this.filterOption === 'settled') {
                return this.records.filter(record => record.isSettled);
            } else {
                return this.records;
            }
        }
    }
});

historyApp.mount('#history');
