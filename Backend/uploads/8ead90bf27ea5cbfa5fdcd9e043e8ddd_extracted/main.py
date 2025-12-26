# Sample Python file with some issues for testing

import math

def bad_function(x, y, z):
    # Very long and complex if-else chain (for complexity tools)
    if x > 0 and y > 0:
        if z > 10:
            print("big")  # print used instead of logging
        elif z > 5:
            print("medium")
        elif z > 3:
            print("small")
        elif z > 1:
            print("tiny")
        else:
            print("zero-ish")
    elif x < 0 or y < 0:
        if z > 100:
            print("negative big")
        elif z > 50:
            print("negative medium")
        else:
            print("negative other")
    else:
        if z == 0:
            print("zero")
        else:
            print("something")

    unused_var = 123  # unused variable
    return x + y + z

def duplicate_logic(a, b):
    if a > b:
        return a - b
    elif a == b:
        return 0
    else:
        return b - a

def duplicate_logic_2(a, b):
    # Almost duplicated logic for JSCPD / similarity tools
    if a > b:
        return a - b
    elif a == b:
        return 0
    else:
        return b - a


if __name__ == "__main__":
    print(bad_function(1, 2, 3))
    print(duplicate_logic(10, 5))
    print(duplicate_logic_2(3, 9))
