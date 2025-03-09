const historyApp = Vue.createApp({
    data() {
        return {
            records: [],
            isSettled: false,
            filterOption: 'unsettled', // 追加
            showPopup: false, // ポップアップ表示用
            popupMessage: '', // ポップアップメッセージ
            confirmAction: null, // 確認アクション
            showNoButton: true, // いいえボタン表示用
            popupDetails: [], // ポップアップに表示する選択データの詳細
            splitRatio: 50 // 割り勘の割合
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
        deleteSelectedRecords() {
            const selectedRecords = this.records.filter(record => record.selected);
            if (selectedRecords.length === 0) {
                this.showPopup = true;
                this.popupMessage = '削除するデータが選択されていません';
                this.showNoButton = false;
                return;
            }
            const idsToDelete = selectedRecords
                .filter(record => !record.isSettled) // 精算済みのレコードを除外
                .map(record => record.id);
            if (idsToDelete.length === 0) {
                this.showPopup = true;
                this.popupMessage = '精算済みのレコードは削除できません';
                this.showNoButton = false;
                return;
            }
            this.showPopup = true;
            this.popupMessage = '選択されたデータを削除してもよろしいですか？';
            this.showNoButton = true;
            this.confirmAction = async () => {
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
                    } else {
                        const errorText = await response.text();
                        this.showPopup = true;
                        this.popupMessage = `データの削除中にエラーが発生しました: ${errorText}`;
                    }
                } catch (error) {
                    console.error('Error deleting records:', error);
                    this.showPopup = true;
                    this.popupMessage = `データの削除中にエラーが発生しました: ${error.message}`;
                }
            };
        },
        markAsSettled() {
            const selectedRecords = this.records.filter(record => record.selected);
            if (selectedRecords.length === 0) {
                this.showPopup = true;
                this.popupMessage = 'データが選択されていません';
                this.showNoButton = false;
                return;
            }
            if (selectedRecords.some(record => record.isSettled)) {
                this.showPopup = true;
                this.popupMessage = '精算済みのデータが選択されています';
                this.showNoButton = false;
                return;
            }
            this.popupDetails = selectedRecords.map(record => ({
                date: this.formatDate(record.date),
                totalAmount: this.formatCurrency(record.totalAmount),
                location: record.location,
                splitRatio: record.splitRatio
            }));
            this.showPopup = true;
            this.popupMessage = '選択されたデータを精算済みにしてもよろしいですか？';
            this.showNoButton = true;
            this.confirmAction = async () => {
                const idsToMarkAsSettled = selectedRecords.map(record => record.id);
                try {
                    const response = await fetch('/api/history/mark-as-settled', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ ids: idsToMarkAsSettled })
                    });
                    if (response.ok) {
                        this.records.forEach(record => {
                            if (idsToMarkAsSettled.includes(record.id)) {
                                record.isSettled = true;
                            }
                        });
                        this.deselectAll(); // 追加: すべての選択状態をリセット
                    } else {
                        const errorText = await response.text();
                        this.showPopup = true;
                        this.popupMessage = `データの更新中にエラーが発生しました: ${errorText}`;
                    }
                } catch (error) {
                    console.error('Error marking records as settled:', error);
                    this.showPopup = true;
                    this.popupMessage = `データの更新中にエラーが発生しました: ${error.message}`;
                }
            };
        },
        goToHome() {
            window.location.href = '/';
        },
        toggleSelection(record) {
            record.selected = !record.selected;
        },
        selectAll() {
            this.filteredRecords.forEach(record => {
                record.selected = true;
            });
        },
        deselectAll() {
            this.filteredRecords.forEach(record => {
                record.selected = false;
            });
        },
        toggleSelectAll() {
            if (this.isAnySelected) {
                this.deselectAll();
            } else {
                this.selectAll();
            }
        },
        closePopup() {
            this.showPopup = false;
            this.popupMessage = '';
            this.confirmAction = null;
            this.popupDetails = [];
        },
        confirmPopup() {
            if (this.confirmAction) {
                this.confirmAction();
            }
            this.closePopup();
        }
    },
    computed: {
        totalAmount() {
            const selectedRecords = this.records.filter(record => record.selected);
            return selectedRecords.reduce((sum, record) => sum + parseFloat(record.totalAmount), 0);
        },
        myShare() {
            return (Math.round(this.totalAmount * (this.splitRatio / 100) / 100) * 100).toFixed(2);
        },
        theirShare() {
            return (Math.round(this.totalAmount * ((100 - this.splitRatio) / 100) / 100) * 100).toFixed(2);
        },
        filteredRecords() {
            if (this.filterOption === 'unsettled') {
                return this.records.filter(record => !record.isSettled);
            } else if (this.filterOption === 'settled') {
                return this.records.filter(record => record.isSettled);
            } else {
                return this.records;
            }
        },
        isAnySelected() {
            return this.filteredRecords.some(record => record.selected);
        }
    }
});

historyApp.mount('#history');
