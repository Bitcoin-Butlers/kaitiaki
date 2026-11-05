"""Type commands into an interactive shell, the way a person pastes them.

Used by guide-commands.spec.ts. age reads a passphrase only from a terminal,
and an interactive shell parses a pasted line differently from `sh -c`, so the
guide's commands run here, in a pseudo-terminal, one line at a time.

Usage: terminal.py COMMANDS_FILE PASSPHRASE_FILE SHELL [ARGS...]

The shell starts in the current directory. When age asks for a passphrase,
this types the one in PASSPHRASE_FILE, but only if an earlier line already
showed it: a person can type only what the guide made visible.
The full transcript goes to stdout. Exit 1 when a line does not finish.
"""

import os
import pty
import re
import select
import sys
import time

# The echo of the PS1 line shows GUIDE''-READY, so only a real prompt matches.
PROMPT = 'GUIDE-READY> '
SET_PROMPT = "PS1='GUIDE''-READY> '\n"
PASSPHRASE_PROMPT = 'Enter passphrase:'
LINE_TIMEOUT = 60
ESCAPES = re.compile(r'\x1b\[[0-9;?]*[A-Za-z]|\x1b[=>]|\r')


def clean(raw):
    return ESCAPES.sub('', raw.decode('utf-8', errors='replace'))


def main():
    commands_file, passphrase_file, shell = sys.argv[1], sys.argv[2], sys.argv[3:]
    with open(commands_file) as f:
        lines = f.read().splitlines()
    with open(passphrase_file) as f:
        passphrase = f.read().strip()

    pid, fd = pty.fork()
    if pid == 0:
        os.execvp(shell[0], shell)

    out = bytearray()

    def read_until(start, done):
        deadline = time.time() + LINE_TIMEOUT
        while time.time() < deadline:
            text = clean(bytes(out[start:]))
            if done(text):
                return True
            ready, _, _ = select.select([fd], [], [], 0.2)
            if ready:
                try:
                    chunk = os.read(fd, 4096)
                except OSError:
                    return done(clean(bytes(out[start:])))
                if not chunk:
                    return done(clean(bytes(out[start:])))
                out.extend(chunk)
        return False

    def run(line):
        start = len(out)
        os.write(fd, (line + '\n').encode())
        answered = False
        while True:
            if not read_until(start, lambda text: PROMPT in text or
                              (not answered and PASSPHRASE_PROMPT in text)):
                return False
            text = clean(bytes(out[start:]))
            if answered or PROMPT in text:
                return True
            typed = passphrase if passphrase in clean(bytes(out[:start])) else ''
            os.write(fd, (typed + '\n').encode())
            answered = True

    # Let the shell print its first prompt before the first keystroke.
    time.sleep(0.5)
    start = len(out)
    os.write(fd, SET_PROMPT.encode())
    ok = read_until(start, lambda text: PROMPT in text)
    for line in lines:
        if not ok:
            break
        ok = run(line)

    os.write(fd, b'exit\n')
    read_until(len(out), lambda text: False)
    os.waitpid(pid, 0)

    sys.stdout.write(clean(bytes(out)))
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
