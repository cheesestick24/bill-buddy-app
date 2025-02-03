# Bill Buddy App

Bill Buddy App は、ユーザーが請求書を管理し、共有するための Web アプリケーションです。ユーザーは請求書の記録を保存し、履歴を確認することができます。

## セットアップ

### 必要条件

- Node.js (バージョン 14 以上)
- npm (Node.js に含まれています)
- Azure SQL Database
- Gmail アカウント (OTP 送信用)

### インストール

1. リポジトリをクローンします。

   ```bash
   git clone https://github.com/yourusername/bill-buddy-app.git
   cd bill-buddy-app
   ```

2. 依存関係をインストールします。

   ```bash
   npm install
   ```

3. 環境変数を設定します。`.env` ファイルを作成し、以下の内容を追加します。

   ```plaintext
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-email-password
   ```

### 実行

開発サーバーを起動します。

```bash
npm start
```

ブラウザで以下の URL にアクセスします。

```url
http://localhost:3000
```

### テスト

テストを実行します。

```bash
npm test
```

## 使用方法

1. 新規登録ページでユーザー名とメールアドレスを入力して登録します。
2. ログインページでユーザー名またはメールアドレスを入力して OTP を送信します。
3. メールで受け取った OTP を入力してログインします。
4. 請求書の記録を保存し、履歴を確認します。

## ディレクトリ構造

```txt
bill-buddy-app/
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── login.js
│   │   └── otp.js
│   ├── index.html
│   ├── login.html
│   ├── otp.html
│   └── register.html
├── database/
│   └── schema.sql
├── .env.template
├── server.mjs
├── package.json
└── README.md
```

## ライセンス

<!-- このプロジェクトは、[ISC ライセンス](LICENSE)の下でライセンスされています。 -->
