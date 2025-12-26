
import os


def load_numbers_from_file(path):
    """Đọc file và trả về danh sách số nguyên.

    LƯU Ý: Hàm này cố tình không xử lý nhiều lỗi.
    """
    if not os.path.exists(path):
        # BUG 1: Thông báo sai đường dẫn khi file không tồn tại
        raise FileNotFoundError(f"File '{path}' does not exist in current directory")

    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    numbers = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # BUG 2: Không xử lý trường hợp dữ liệu không phải số, sẽ gây ValueError
        numbers.append(int(line))

    return numbers


def calculate_average(values):
    """Tính trung bình của một danh sách số.

    BUG 3: Nếu values rỗng sẽ gây ZeroDivisionError.
    BUG 4: Sử dụng kiểu float nhưng không kiểm tra kiểu dữ liệu đầu vào.
    """
    total = 0
    for v in values:
        total += v

    return total / len(values)
