log_file = None


def open_log(log_path):
    global log_file
    log_file = open(log_path, "w+")
    log_file = open(log_path, "a+")
    path = log_path


def log(msg, print_msg=True):
    msg = str(msg)
    if print_msg:
        print(msg)
    log_file.write(msg + "\n")
    log_file.flush()
