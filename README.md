# Band Mate

Web app quản lý Tạm Band. Đặc tả: `PRD_BandMate_v1.0.md` (Claude Project "Vibe Coding_ Band Mate").

- Giao diện: React (Vite) + react-i18next (vi/en) · `src/`
- Database / đăng nhập: Supabase · migration ở `supabase/migrations/`, server function ở `supabase/functions/`
- Hosting: Netlify (`netlify.toml`)

Chạy thử trên máy: `cp .env.example .env && npm i && npm run dev`

Quy tắc: RLS mọi bảng, không xóa cứng, giao diện chỉ dùng publishable key, mọi chữ trên giao diện nằm trong `src/locales/vi.json` + `en.json`.
