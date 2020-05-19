import pprint

log_file = None


def open_log(log_path):
    global log_file
    log_file = open(log_path, "w+")
    log_file = open(log_path, "a+")
    path = log_path


def log(msg="", print_msg=True):
    if not isinstance(msg, str):
        msg = pprint.pformat(msg)

    if print_msg:
        print(msg)
    log_file.write(msg + "\n")
    log_file.flush()
