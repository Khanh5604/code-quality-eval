
Dự án Python nhỏ với một số lỗi cố ý để thực hành phân tích và đánh giá code.

Cấu trúc:
- buggy_project/
  - main.py        : Chương trình chính, đọc file và tính trung bình.
  - utils.py       : Hàm đọc file và tính trung bình.
  - data_processing.py : Hàm normalize có nhiều lỗi logic.
  - report.py      : Hàm generate_report với lỗi logic & runtime.
  - cli.py         : Chương trình CLI với lỗi về xử lý tham số và tên hàm.
- data/
  - numbers.txt    : File dữ liệu mẫu, có dòng không phải số để gây lỗi.

Gợi ý khi phân tích:
- Chạy thử `python -m buggy_project.main` và `python buggy_project/cli.py data/numbers.txt`
- Dùng pylint/flake8/mypy để phân tích tĩnh.
- Tìm các lỗi về:
  + Xử lý ngoại lệ
  + Kiểm tra đầu vào
  + Biến chưa định nghĩa
  + Sai cú pháp f-string / format
  + Sai điều kiện, chia cho 0, trả về None không mong muốn, ...
