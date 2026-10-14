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

## Netlify 部署與登入設定

此專案是 Next.js 應用，需要 Netlify 的 Next.js 執行環境與伺服器函式，不能只上傳靜態頁面。

在 Netlify 此網站的 Environment variables 設定 `STUDIO_ADMIN_USERNAME`、`STUDIO_ADMIN_PASSWORD`、`STUDIO_ADMIN_SESSION_SECRET`、`PILATES_BACKEND_URL`、`STUDIO_ADMIN_API_SECRET`。登入帳密與 session 密鑰需提供給 Functions／執行階段，並套用到實際使用的 Production 或 Deploy Preview 環境。可選 All scopes 時使用 All scopes。秘密值僅在 Netlify 設定中安全輸入，不寫入儲存庫。

修改環境變數後，從 Deploys 重新部署。GitHub push 只有在 Netlify 此網站已連接該儲存庫與分支時，才會觸發自動部署。

登入顯示「行政登入帳密尚未設定」代表伺服器未讀到帳密設定；「帳號或密碼錯誤」代表帳密驗證未通過；「行政登入尚未設定完整」代表缺少 session 簽章設定。已成功登入但排課系統拒絕行政連線時，會另行顯示連線驗證錯誤，請確認兩站的 `STUDIO_ADMIN_API_SECRET` 一致。
