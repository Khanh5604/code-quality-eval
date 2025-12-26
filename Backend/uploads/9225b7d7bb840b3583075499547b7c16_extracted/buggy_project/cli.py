
import sys
from utils import load_numbers_from_file, calculate_average


def main():
    # BUG 10: Không kiểm tra số lượng argument, có thể gây IndexError
    filename = sys.argv[1]

    numbers = load_numbers_from_file(filename)

    # BUG 11: Không xử lý ngoại lệ khi file bị lỗi dữ liệu
    avg = calculate_average(numbers)
    print("Average from CLI:", avg)


# BUG 12: Sai tên biến trong check, nên file bị import cũng chạy main()
if __name__ == "__main__":
    mian()
