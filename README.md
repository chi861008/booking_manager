# 工作室行政管理

獨立的工作室管理網站，使用獨立行政帳密，不使用老師帳號或老師角色。

## 環境變數

複製 `.env.example` 並設定行政登入帳號／密碼、session 簽章密鑰、排課網站網址，以及與排課網站相同的 `STUDIO_ADMIN_API_SECRET`。行政站不保存 Supabase service role key；資料操作由排課伺服器執行。

行政人員登入後可產生有效 30 天、限一人使用的工作室邀請連結，傳給老師；老師用 LINE 登入接受邀請即可加入工作室。

本機啟動：

```sh
npm install
npm run dev
```

## 老師請長假

在工作室老師名單按「請長假」，選開始與結束日、代理老師，再預覽並逐堂確認代課／這週不上／候補。取消長假不會自動改回已轉出的課。老師端首頁保留代理入口，老師設定頁不再顯示長假表單。

此功能仍使用現有 `PILATES_BACKEND_URL` 與 `STUDIO_ADMIN_API_SECRET`，兩個網站需要一起更新部署；不需要新增金鑰。排課端沿用既有 `migration.teacher-leaves.sql` 與代課／順延資料結構。
