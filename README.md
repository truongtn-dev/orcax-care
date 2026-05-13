# OrcaXCare

MERN (WDP301): `client` (React + Vite), `server` (Express + Mongoose). React Native có thể thêm sau nếu môn yêu cầu.

| Thư mục | Nội dung |
|----------|----------|
| `client/` | Web UI |
| `server/` | REST API + MongoDB |
| `docs/` | SRS, SDS, biên bản, release |

## MongoDB Atlas (nhóm)

Một cluster free, tạo user + Network Access, copy URI `mongodb+srv://.../<tên-db>?retryWrites=true&w=majority`. Mỗi người tạo `server/.env` từ `.env.example`, **không** commit `.env`.

## Chạy local

```bash
cd server && cp .env.example .env   # Windows: copy .env.example .env
# Sửa MONGODB_URI trong server/.env
npm install && npm run dev
```

Terminal khác:

```bash
cd client && npm install && npm run dev
```

`VITE_API_URL`: xem `client/.env.example` (dev mặc định dùng proxy trong `vite.config.js`).

## GitHub / GitLab

```bash
git remote add origin <url-repo>
git push -u origin main
```

Môn hay dùng GitLab — có thể thêm remote hoặc mirror tương tự.
