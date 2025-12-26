
from utils import load_numbers_from_file, calculate_average


def main():
    # Cố gắng đọc file dữ liệu và tính trung bình
    filename = "data/numbers.txt"
    numbers = load_numbers_from_file(filename)
    print("Loaded", len(numbers), "numbers")

    avg = calculate_average(numbers)
    print("Average:", avg)


if __name__ == "__main__":
    main()
