# 工作室行政管理

獨立的工作室管理網站，使用獨立行政帳密，不使用老師帳號或老師角色。

## 環境變數

複製 `.env.example` 並設定行政登入帳號／密碼、session 簽章密鑰、排課網站網址，以及與排課網站相同的 `STUDIO_ADMIN_API_SECRET`。行政站不保存 Supabase service role key；資料操作由排課伺服器執行。

部署前先在共用 Supabase 專案執行 `db/migration.studio-admin.sql`。行政人員可輸入老師的 LINE ID 直接加入工作室；老師可先在排課網站用 LINE 登入一次，從白名單提示複製自己的 LINE ID。也可使用有效 30 天的邀請連結，老師用 LINE 登入接受邀請。兩種方式都不需要老師加行政人員為好友。

本機啟動：

```sh
npm install
npm run dev
```
