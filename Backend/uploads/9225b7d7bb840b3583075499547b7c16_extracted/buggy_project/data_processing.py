
def normalize(values):
    """Chuẩn hóa danh sách số về khoảng [0, 1]."""
    if not values:
        # BUG 5: Trả về None thay vì danh sách rỗng
        return

    max_value = max(values)
    if max_value == 0:
        # BUG 6: Chia cho 0 nếu max_value = 0 (đáng lẽ nên trả về toàn 0)
        return [v / max_value for v in values]

    # BUG 7: Nhầm lẫn biến, dùng max thay vì max_value (max là built-in)
    return [v / max for v in values]
