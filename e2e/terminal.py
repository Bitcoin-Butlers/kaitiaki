"""Type commands into an interactive shell, the way a person pastes them.

Used by guide-commands.spec.ts. age reads a passphrase only from a terminal,
and an interactive shell parses a pasted line differently from `sh -c`, so the
guide's commands run here, in a pseudo-terminal, one line at a time.

Usage: terminal.py COMMANDS_FILE PASSPHRASE_FILE SHELL [ARGS...]

The shell starts in the current directory. When age asks for a passphrase,
this types the one in PASSPHRASE_FILE, but only if an earlier line already
showed it: a person can type only what the guide made visible.
The full transcript goes to stdout. Exit 1 when a line does not finish.
The whole run stops after TERMINAL_TIMEOUT seconds (default 120), so the
caller still gets the transcript inside its own timeout.
"""

import os
import pty
import re
import select
import signal
import sys
import time

# The echo of the PS1 line shows GUIDE''-READY, so only a real prompt matches.
PROMPT = 'GUIDE-READY> '
SET_PROMPT = "PS1='GUIDE''-READY> '\n"
PASSPHRASE_PROMPT = 'Enter passphrase:'
LINE_TIMEOUT = 60
RUN_TIMEOUT = float(os.environ.get('TERMINAL_TIMEOUT', 120))
# Room after RUN_TIMEOUT to flush the transcript and reap the shell
REAP_TIMEOUT = 5
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
    run_deadline = time.time() + RUN_TIMEOUT

    def read_until(start, done, deadline=None):
        if deadline is None:
            deadline = min(time.time() + LINE_TIMEOUT, run_deadline)
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

    def reaped():
        deadline = time.time() + REAP_TIMEOUT
        while time.time() < deadline:
            if os.waitpid(pid, os.WNOHANG) != (0, 0):
                return True
            time.sleep(0.1)
        return False

    # Let the shell print its first prompt before the first keystroke.
    time.sleep(0.5)
    start = len(out)
    os.write(fd, SET_PROMPT.encode())
    ok = read_until(start, lambda text: PROMPT in text)
    for line in lines:
        if not ok:
            break
        ok = run(line)

    if ok:
        os.write(fd, b'exit\n')
        read_until(len(out), lambda text: False)
    if not ok or not reaped():
        # A command that hangs runs in its own process group under job
        # control, and "exit" stays unread behind it, so kill that group and
        # the shell. Once the shell has ended, tcgetpgrp gives 0, and
        # killpg(0) would stop this script and the test run that started it.
        try:
            job = os.tcgetpgrp(fd)
        except OSError:
            job = 0
        if job > 0 and job != os.getpgrp():
            try:
                os.killpg(job, signal.SIGKILL)
            except OSError:
                pass
        # Not reaped yet, so the pid still names the shell
        try:
            os.kill(pid, signal.SIGKILL)
        except OSError:
            pass
        read_until(len(out), lambda text: False, time.time() + REAP_TIMEOUT)
        reaped()

    sys.stdout.write(clean(bytes(out)))
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
