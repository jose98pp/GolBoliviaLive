import pathlib
import subprocess
import struct
import time
import xml.etree.ElementTree as ET

OUTPUT = pathlib.Path('android-smoke')
OUTPUT.mkdir(exist_ok=True)
PACKAGE = 'com.golbolivialive.tv'


def adb(*args):
    return subprocess.check_output(['adb', *args], text=True)


def dump(name):
    adb('shell', 'uiautomator', 'dump', '/sdcard/window.xml')
    xml = adb('shell', 'cat', '/sdcard/window.xml')
    (OUTPUT / f'{name}.xml').write_text(xml)
    with (OUTPUT / f'{name}.png').open('wb') as image:
        subprocess.run(['adb', 'exec-out', 'screencap', '-p'], stdout=image, check=True)
    return [node.attrib.get('text', '') for node in ET.fromstring(xml).iter('node')]


def launch():
    adb('shell', 'am', 'force-stop', PACKAGE)
    adb('shell', 'am', 'start', '-W', '-n', PACKAGE + '/.MainActivity')
    time.sleep(12)


adb('install', '-r', '/tmp/golbolivia-apk/app-debug.apk')
adb('logcat', '-c')
adb('shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0')
adb('shell', 'settings', 'put', 'system', 'user_rotation', '0')
adb('shell', 'wm', 'size', '1280x800')
adb('shell', 'wm', 'density', '160')
launch()
assert any('GOLBOLIVIA' in text for text in dump('tablet-home')), 'App home must remain visible'
width, height = struct.unpack('>II', (OUTPUT / 'tablet-home.png').read_bytes()[16:24])
assert width > height, f'Landscape emulator must have a wide display: {width} x {height}'
focused = [n.attrib.get('text', '') for n in ET.parse(OUTPUT / 'tablet-home.xml').iter('node') if n.attrib.get('focused') == 'true']
assert any('Inicio' in text for text in focused), f'Initial focus must be in navigation: {focused}'
# The initial focus is Inicio. Traverse Eventos, Canales, then Guía TV using only D-pad.
adb('shell', 'input', 'keyevent', '22', '22', '22', '23')
time.sleep(2)
assert any('La programación horaria' in text for text in dump('tablet-guide')), 'D-pad must open the channel guide'
adb('shell', 'input', 'keyevent', '22', '22', '23')
time.sleep(2)
assert 'A tu manera' in dump('tablet-settings'), 'D-pad must reach personalization settings'
adb('shell', 'wm', 'size', '720x1280')
adb('shell', 'wm', 'density', '240')
launch()
assert any('GOLBOLIVIA' in text for text in dump('portrait-home')), 'Portrait layout must keep the brand visible'
width, height = struct.unpack('>II', (OUTPUT / 'portrait-home.png').read_bytes()[16:24])
assert height > width, f'Portrait emulator must have a tall display: {width} x {height}'
logs = adb('logcat', '-d', '-s', 'AndroidRuntime:E')
(OUTPUT / 'runtime.log').write_text(logs)
assert 'FATAL EXCEPTION' not in logs, 'Android runtime crashed'
print('Emulator smoke: landscape home, D-pad guide/settings and portrait home passed.')
