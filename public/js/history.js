const historyApp = Vue.createApp({
    data() {
        return {
            records: [],
            selectedRecords: [],
            message: '',
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
        async deleteRecord(id) {
            this.showPopup = true;
            this.popupMessage = 'このレコードを削除してもよろしいですか？';
            this.showNoButton = true;
            this.confirmAction = async () => {
                try {
                    const response = await fetch(`/api/history/${id}`, {
                        method: 'DELETE'
                    });
                    if (response.ok) {
                        this.records = this.records.filter(record => record.id !== id);
                    } else {
                        const errorText = await response.text();
                        this.showPopup = true;
                        this.popupMessage = `レコードの削除中にエラーが発生しました: ${errorText}`;
                    }
                } catch (error) {
                    console.error('Error deleting record:', error);
                    this.showPopup = true;
                    this.popupMessage = `レコードの削除中にエラーが発生しました: ${error.message}`;
                }
            };
        },
        async deleteSelectedRecords() {
            if (this.selectedRecords.length === 0) {
                this.showPopup = true;
                this.popupMessage = '削除するデータが選択されていません';
                this.showNoButton = false;
                return;
            }
            const idsToDelete = this.selectedRecords
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
                        this.selectedRecords = [];
                        this.updateSelectedData();
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
        async markAsSettled() {
            this.popupDetails = this.selectedRecords.map(record => ({
                date: this.formatDate(record.date),
                totalAmount: this.formatCurrency(record.totalAmount),
                location: record.location,
                splitRatio: record.splitRatio
            }));
            this.showPopup = true;
            this.popupMessage = '選択されたデータを精算済みにしてもよろしいですか？';
            this.showNoButton = true;
            this.confirmAction = async () => {
                const idsToMarkAsSettled = this.selectedRecords.map(record => record.id);
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
                        this.selectedRecords = [];
                        this.updateSelectedData();
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
        },
        selectAll() {
            this.filteredRecords.forEach(record => {
                record.selected = true;
            });
            this.updateSelectedData();
        },
        deselectAll() {
            this.filteredRecords.forEach(record => {
                record.selected = false;
            });
            this.updateSelectedData();
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
    watch: {
        filterOption() {
            this.deselectAll();
        }
    },
    computed: {
        totalAmount() {
            return this.selectedRecords.reduce((sum, record) => sum + parseFloat(record.totalAmount), 0);
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
        canMarkAsSettled() {
            return this.selectedRecords.every(record => !record.isSettled);
        },
        isAnySelected() {
            return this.filteredRecords.some(record => record.selected);
        }
    }
});

historyApp.mount('#history');
