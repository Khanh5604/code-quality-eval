
from utils import calculate_average


def generate_report(values):
    """Tạo báo cáo dạng string."""
    # BUG 8: Sử dụng biến chưa được định nghĩa 'valeus'
    avg = calculate_average(valeus)

    # BUG 9: Lẫn lộn f-string và format
    return f"Report: count={{len(values)}} average={{avg:.2f}}".format(
        count=len(values), avg=avg
    )
