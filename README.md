# code-quality-eval
Hệ thống web đánh giá chất lượng mã nguồn tự động
README này tập trung vào cách chạy, cấu hình và demo hệ thống; phần phân tích lý thuyết được trình bày trong báo cáo luận văn.

## Mục tiêu

- Phân tích chất lượng mã nguồn bằng phân tích tĩnh.
- Định lượng chất lượng theo các tiêu chí đo lường.
- Hỗ trợ cải thiện khả năng bảo trì mã nguồn.

## Phạm vi

- Ngôn ngữ chính: JavaScript / TypeScript (có hỗ trợ Java qua PMD).
- Không sử dụng AI, không sinh mã.
- Tiêu chí: style, complexity, duplication, comment.

## Kiến trúc tổng quát

- Backend API điều phối phân tích.
- Các công cụ phân tích tĩnh (ESLint, CLOC, JSCPD, PMD).
- Supabase lưu kết quả và lịch sử phân tích.

## Kịch bản demo nhanh

1) Khởi động backend: `npm start` (hoặc `npm run dev` nếu muốn watch).
2) Upload zip dự án qua API `/api/analyze` (hoặc giao diện nếu có) với người dùng đã đăng nhập.
3) Khởi động frontend (Vite):
   - `cd Frontend`
   - `npm install` (lần đầu)
   - `npm run dev` và mở URL mà Vite hiển thị (mặc định http://localhost:5173).
4) Kiểm tra quota: nếu vượt cấu hình `QUOTA_MAX_UPLOADS_PER_DAY` hoặc `QUOTA_MAX_ARCHIVES_PER_USER`, API trả 429.
5) Xem báo cáo: gọi `/api/analyses` và `/api/analyses/:id` để kiểm tra kết quả lưu vào Supabase, bao gồm CLOC/JSCPD.
6) (Tùy chọn) Chạy PMD cho dự án Java: đảm bảo `pmd` có trong PATH, sau đó chạy `node Backend/tools/pmdRunner.js <path-to-java-project>` để lấy errorCount và ccAvg.
7) Chạy test: `npm test` (gồm unit test scorer + storeSupabase).

## Cập nhật Supabase (lưu CLOC/JSCPD)

Chạy SQL migration để bổ sung cột lưu kết quả CLOC và JSCPD (dùng Supabase SQL editor hoặc chuỗi kết nối Postgres tương ứng):

```
psql "<chuỗi-kết-nối-Postgres-Supabase>" -f Backend/web/db/migrations/2025-12-22_add_cloc_jscpd_columns.sql
```

Sau khi chạy, cần phân tích lại dự án (upload lại) để dữ liệu CLOC/JSCPD được lưu và hiện trên giao diện.

## Cập nhật Supabase (lưu trọng số đánh giá)

Chạy migration để tạo bảng lưu trọng số theo người dùng:

```
psql "<chuỗi-kết-nối-Postgres-Supabase>" -f Backend/web/db/migrations/2025-12-22_add_user_settings.sql
```

Sau khi chạy, trang Settings sẽ đọc/ghi trọng số thật và áp dụng cho các lần phân tích mới.

## Yêu cầu môi trường

- Node.js 18+ và npm.
- Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` trong `.env`.
- ESLint, JSCPD, CLOC đã cài (được gọi qua npm scripts/tools).
- PMD (phân tích Java, mô-đun mở rộng): cần lệnh `pmd` trong PATH, ruleset dùng `category/java/quickstart.xml`. Nếu thiếu, PMD sẽ không chạy được và không ảnh hưởng luồng phân tích JS/TS mặc định.

## Cleanup duplicated issues (once)
Nếu đã chạy phân tích trước 2025-12-22 có thể có bản ghi `analysis_issues` trùng. Chạy:

```
cd Backend
node tools/dedupeAnalysisIssues.js
```

