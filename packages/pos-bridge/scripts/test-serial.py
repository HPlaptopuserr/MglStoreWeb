import concurrent.futures
import hashlib
import hmac
import json
import os
import pty
import re
import socket
from pathlib import Path
import shutil
import subprocess
import tempfile
import threading
import time
import tty
import urllib.error
import urllib.request

# POSIX-only integration test. The explicit PTY path never probes real USB ports.
REPO = str(Path(__file__).resolve().parents[3])
SECRET = 'virtual-terminal-e2e-only'
with socket.socket() as listener:
    listener.bind(('127.0.0.1', 0))
    port = listener.getsockname()[1]
BASE = f'http://127.0.0.1:{port}'
master, slave = pty.openpty()
tty.setraw(slave)
os.set_blocking(master, False)
serial_path = os.ttyname(slave)
directory = tempfile.mkdtemp(prefix='pgw-serial-e2e-')
calls = []
active = None
purchase_waiting = threading.Event()
stop = threading.Event()


def emulate():
    global active
    buffer = ''
    while not stop.is_set():
        try:
            buffer += os.read(master, 4096).decode()
        except OSError:
            time.sleep(0.01)
            continue
        while '}>' in buffer:
            end = buffer.index('}>') + 2
            command, buffer = buffer[:end], buffer[end:]
            calls.append(command)
            if 'connection:check' in command:
                response = 'CONNECTED'
            elif 'vendingCancel:' in command:
                response = '<{code:-21,desc:"POS Transaction canceled",data:' + active + '}>'
            elif 'settlement:true' in command:
                response = '<{code:0,terminalID:000001,totalAmount:1400,qrPaymentContainer:[{"merchant":"A,B","amount":1400}]}>'
            else:
                identity = re.search(r'data:([^,}]+)', command).group(1)
                if 'void:true' in command:
                    response = '<{code:0,data:' + identity + '}>'
                else:
                    amount = re.search(r'amount:(\d+)', command).group(1)
                    if amount == '20000':
                        active = identity
                        purchase_waiting.set()
                        continue
                    code = '50' if amount == '30000' else '116' if amount == '11600' else '0'
                    response = '<{code:' + code + ',data:' + identity + ',terminal:000001,amount:' + amount + (',rrn:001234567890,appCode:000123' if code == '0' else '') + '}>'
            # Real driver sees an echo and fragmented terminal reply.
            os.write(master, command.encode())
            for offset in range(0, len(response), 9):
                os.write(master, response[offset:offset + 9].encode())
                time.sleep(0.002)


def sign(text):
    return hmac.new(SECRET.encode(), text.encode(), hashlib.sha256).hexdigest()


def request(endpoint, body=None, signature=True):
    text = json.dumps(body, separators=(',', ':')) if body is not None else None
    headers = {'Content-Type': 'application/json', 'Origin': 'https://vendor.test'}
    if text and signature:
        headers['x-mgl-bridge-signature'] = sign(text) if signature is True else signature
    req = urllib.request.Request(BASE + endpoint, data=text.encode() if text else None, headers=headers)
    try:
        response = urllib.request.urlopen(req, timeout=8)
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read()), error.headers
    raw = response.read().decode()
    if text:
        assert response.headers.get('x-mgl-bridge-signature') == sign(raw), raw
    return response.status, json.loads(raw), response.headers


def start():
    env = dict(os.environ, BRIDGE_PROVIDER='android-pgw', BRIDGE_PORT=str(port), BRIDGE_SHARED_SECRET=SECRET,
               BRIDGE_DATA_DIR=directory, ANDROID_PGW_PORT=serial_path, ANDROID_PGW_TIMEOUT_MS='3000',
               ANDROID_PGW_HEALTH_TIMEOUT_MS='1000', ANDROID_PGW_RESPONSE_IDLE_MS='150',
               BRIDGE_STARTUP_HEALTH_CHECK='false', ANDROID_PGW_AMOUNT_MULTIPLIER='100')
    child = subprocess.Popen(['node', REPO + '/packages/pos-bridge/dist/index.js'], cwd=directory,
                             env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    for _ in range(8):
        if child.poll() is not None:
            raise RuntimeError(child.stdout.read().decode())
        try:
            status, data, _ = request('/health')
            if status == 200:
                assert data['provider'] == 'android-pgw'
                return child
        except (OSError, urllib.error.URLError):
            pass
        time.sleep(0.1)
    child.terminate()
    child.wait(timeout=5)
    print(child.stdout.read().decode(), flush=True)
    print('EMULATOR CALLS', calls, flush=True)
    raise RuntimeError('Virtual serial terminal did not become ready')


thread = threading.Thread(target=emulate, daemon=True)
thread.start()
child = None
try:
    child = start()
    print('PASS native serial driver health over virtual COM', flush=True)
    purchase = {'attemptId': 'approved-attempt', 'amount': 100, 'terminalId': '000001'}
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        responses = list(pool.map(lambda _: request('/charge', purchase), range(5)))
    assert all(status == 200 and data['status'] == 'APPROVED' for status, data, _ in responses)
    assert sum('amount:10000,' in call for call in calls) == 1, calls
    assert responses[0][1]['rrn'] == '001234567890'
    assert responses[0][2].get('Access-Control-Expose-Headers') == 'x-mgl-bridge-signature'
    print('PASS five concurrent signed purchases issue one framed serial purchase', flush=True)
    assert request('/charge', purchase, signature=False)[0] == 401
    assert request('/charge', {**purchase, 'amount': 101}, signature=sign(json.dumps(purchase, separators=(',', ':'))))[0] == 401
    assert request('/charge', {**purchase, 'amount': 101})[0] == 409
    print('PASS unsigned, tampered and reused-identity requests rejected', flush=True)
    child.terminate()
    child.wait(timeout=5)
    child = start()
    assert request('/charge', purchase)[1]['status'] == 'APPROVED'
    assert request('/charge/status', purchase)[1]['status'] == 'APPROVED'
    assert sum('amount:10000,' in call for call in calls) == 1
    print('PASS bridge restart and status recovery preserve the original debit', flush=True)
    command = {'operation': 'void', 'requestId': 'void_approved', 'terminalId': '000001', 'rrn': '001234567890'}
    assert request('/terminal/command', command)[1]['status'] == 'APPROVED'
    assert request('/terminal/command', command)[1]['status'] == 'APPROVED'
    assert sum('void:true' in call for call in calls) == 1
    print('PASS PGW void and replay send one RRN-based void', flush=True)
    settlement = {'operation': 'settlement', 'requestId': 'settlement_shift', 'terminalId': '000001'}
    result = request('/terminal/command', settlement)[1]
    assert result['status'] == 'APPROVED'
    assert result['parsed']['qrPaymentContainer'][0]['merchant'] == 'A,B'
    print('PASS settlement and fragmented nested JSON response', flush=True)
    cancelled = {'attemptId': 'cancelled-attempt', 'amount': 200, 'terminalId': '000001'}
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        pending = pool.submit(request, '/charge', cancelled)
        assert purchase_waiting.wait(timeout=4)
        command = {'operation': 'cancel', 'requestId': 'cancel_request', 'terminalId': '000001', 'attemptId': 'cancelled-attempt'}
        assert request('/terminal/command', command)[1]['status'] == 'FAILED'
        assert pending.result(timeout=6)[1]['status'] == 'DECLINED'
    print('PASS vendingCancel reaches the open serial purchase and original reply resolves it', flush=True)
    unknown = {'attemptId': 'unknown-attempt', 'amount': 300, 'terminalId': '000001'}
    assert request('/charge', unknown)[1]['status'] == 'FAILED'
    assert request('/charge', {**unknown, 'attemptId': 'must-not-dispatch'})[0] == 409
    child.terminate()
    child.wait(timeout=5)
    child = start()
    assert request('/charge/status', unknown)[1]['status'] == 'FAILED'
    assert request('/charge', {**unknown, 'attemptId': 'still-must-not-dispatch'})[0] == 409
    assert not any('must-not-dispatch' in command for command in calls)
    print('PASS uncertain terminal error blocks new purchases across restart', flush=True)
    print('PASS 8 end-to-end groups; synthetic PTY only, no bank or physical terminal', flush=True)
finally:
    if child:
        child.terminate()
        child.wait(timeout=5)
    stop.set()
    thread.join(timeout=2)
    os.close(master)
    os.close(slave)
    shutil.rmtree(directory)
