# 工作室行政管理

獨立的工作室管理網站，使用獨立行政帳密，不使用老師帳號或老師角色。

## 環境變數

複製 `.env.example` 並設定行政登入帳號／密碼、session 簽章密鑰、排課網站網址，以及與排課網站相同的 `STUDIO_ADMIN_API_SECRET`。行政站不保存 Supabase service role key；資料操作由排課伺服器執行。

部署前先在共用 Supabase 專案執行 `db/migration.studio-admin.sql`。老師透過管理頁產生的邀請連結會回到排課網站，由老師使用 LINE 登入接受邀請。

本機啟動：

```sh
npm install
npm run dev
```
