const historyApp = Vue.createApp({
    data() {
        return {
            records: [], // 履歴データのリスト。APIから取得し、表示や操作に使用。
            filterOption: 'unsettled', // フィルタリングオプション（未精算、精算済み、すべて）を管理。
            splitRatio: 50, // 割り勘比率を管理（デフォルトは50%）。

            showPopup: false, // 通常のポップアップの表示状態を管理。
            popupMessage: '', // 通常のポップアップに表示するメッセージ。
            confirmAction: null, // 通常のポップアップで実行するアクション（関数）を格納。
            showNoButton: true, // 通常のポップアップに「いいえ」ボタンを表示するかどうかを管理。
            popupDetails: [], // 通常のポップアップに表示する詳細情報（選択されたデータの情報など）。

            showDeletePopup: false, // 削除確認ポップアップの表示状態を管理。
            deletePopupMessage: '', // 削除確認ポップアップに表示するメッセージ。
            deleteConfirmAction: null, // 削除確認ポップアップで実行するアクション（関数）を格納。

            currentPage: 1, // 現在のページ番号（ページング機能で使用）。
            itemsPerPage: 9 // 1ページあたりに表示するアイテム数（ページング機能で使用）。
        };
    },
    async created() {
        // コンポーネント作成時に履歴データをAPIから取得
        try {
            const response = await fetch('/api/history');
            this.records = await response.json();
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    },
    methods: {
        // 日付を「YYYY年MM月DD日 (曜日)」形式に整形
        formatDate(dateString) {
            const date = new Date(dateString);
            const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
            return date.toLocaleDateString('ja-JP', options);
        },
        // 金額を日本円形式にフォーマット
        formatCurrency(amount) {
            return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
        },
        // 選択されたレコードを削除する処理
        deleteSelectedRecords() {
            const selectedRecords = this.records.filter(record => record.selected);
            if (selectedRecords.length === 0) {
                // レコードが選択されていない場合の警告
                this.showPopup = true;
                this.popupMessage = '削除するデータが選択されていません';
                this.showNoButton = false;
                return;
            }
            const idsToDelete = selectedRecords
                .filter(record => !record.isSettled)
                .map(record => record.id);
            if (idsToDelete.length === 0) {
                // 精算済みレコードのみ選択されていた場合の警告
                this.showPopup = true;
                this.popupMessage = '精算済みのレコードは削除できません';
                this.showNoButton = false;
                return;
            }
            // 削除確認ポップアップ表示とアクションの設定
            this.showDeletePopup = true;
            this.deletePopupMessage = '選択されたデータを削除してもよろしいですか？';
            this.deleteConfirmAction = async () => {
                try {
                    const response = await fetch('/api/history/bulk-delete', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ ids: idsToDelete })
                    });
                    if (response.ok) {
                        // 削除後、ローカルのデータを更新
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
        // 選択されたレコードを精算済みに更新する処理
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
            // ポップアップで表示する詳細情報の準備
            this.popupDetails = selectedRecords.map(record => ({
                date: this.formatDate(record.date),
                totalAmount: this.formatCurrency(record.totalAmount),
                location: record.location
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
                        // 成功時、対象レコードのフラグを更新
                        this.records.forEach(record => {
                            if (idsToMarkAsSettled.includes(record.id)) {
                                record.isSettled = true;
                            }
                        });
                        this.toggleSelectAll(); // 選択状態をリセット
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
        // ホーム画面へ遷移
        goToHome() {
            window.location.href = '/';
        },
        // 個別レコードの選択状態を切り替え
        toggleSelection(record) {
            record.selected = !record.selected;
        },
        // 一括選択/解除
        toggleSelectAll() {
            const anySelected = this.isAnySelected;
            this.filteredRecords.forEach(record => {
                record.selected = !anySelected;
            });
        },
        // 通常ポップアップを閉じる
        closePopup() {
            this.showPopup = false;
            this.popupMessage = '';
            this.confirmAction = null;
            this.popupDetails = [];
        },
        // 通常ポップアップの「はい」処理を実行
        confirmPopup() {
            if (this.confirmAction) {
                this.confirmAction().then(() => {
                    // 精算処理が成功した後に全てのレコードの選択状態を解除
                    this.records.forEach(record => record.selected = false);
                }).catch(error => {
                    console.error('Error during confirm action:', error);
                });
            }
            this.closePopup();
        },
        // 削除確認ポップアップを閉じる
        closeDeletePopup() {
            this.showDeletePopup = false;
            this.deletePopupMessage = '';
            this.deleteConfirmAction = null;
        },
        // 削除確認ポップアップの「はい」処理を実行
        confirmDeletePopup() {
            if (this.deleteConfirmAction) {
                this.deleteConfirmAction();
            }
            this.closeDeletePopup();
        },
        // ページを変更
        changePage(page) {
            if (page > 0 && page <= this.totalPages) {
                this.currentPage = page;
            }
        }
    },
    computed: {
        // 未精算のレコードの合計金額を計算
        totalAmount() {
            return this.records
                .filter(record => !record.isSettled)
                .reduce((sum, record) => sum + parseFloat(record.totalAmount), 0);
        },
        // 自分の負担合計
        myTotalAmount() {
            return this.records
                .filter(record => !record.isSettled)
                .reduce((sum, record) => sum + parseFloat(record.myShare), 0);
        },
        // 相手の負担合計
        theirTotalAmount() {
            return this.records
                .filter(record => !record.isSettled)
                .reduce((sum, record) => sum + parseFloat(record.theirShare), 0);
        },
        // フィルタリングされたレコード（未精算／精算済み／すべて）
        filteredRecords() {
            if (this.filterOption === 'unsettled') {
                return this.records.filter(record => !record.isSettled);
            } else if (this.filterOption === 'settled') {
                return this.records.filter(record => record.isSettled);
            }
            return this.records;
        },
        // 現在のページに表示するレコード
        paginatedRecords() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            return this.filteredRecords.slice(start, start + this.itemsPerPage);
        },
        // 一部でも選択されているかどうか
        isAnySelected() {
            return this.filteredRecords.some(record => record.selected);
        },
        // 総ページ数
        totalPages() {
            return Math.ceil(this.filteredRecords.length / this.itemsPerPage);
        }
    }
});

historyApp.mount('#history');
