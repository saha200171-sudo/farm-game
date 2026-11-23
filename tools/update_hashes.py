"""Отпечатки файлов игры для «умного обновления» (v293). ЗАПУСКАТЬ ПЕРЕД КАЖДОЙ ЗАГРУЗКОЙ (git push):
    python tools/update_hashes.py
Считает короткий отпечаток (sha1, 8 знаков) каждого файла в assets/, lib/, icons/ и manifest и вписывает список
в index.html и sw.js (строка с меткой @@HASHES@@). Изменился файл — изменился отпечаток — телефон докачает только его."""
import hashlib, json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H = {}
for top in ['assets', 'lib', 'icons']:
    for d, _, fs in os.walk(os.path.join(ROOT, top)):
        for f in fs:
            p = os.path.join(d, f); r = os.path.relpath(p, ROOT).replace(os.sep, '/')
            H[r] = hashlib.sha1(open(p, 'rb').read()).hexdigest()[:8]
H['manifest.webmanifest'] = hashlib.sha1(open(os.path.join(ROOT, 'manifest.webmanifest'), 'rb').read()).hexdigest()[:8]
line = 'const ASSET_HASH = ' + json.dumps(dict(sorted(H.items())), separators=(',', ':'), ensure_ascii=False) + '; // @@HASHES@@'
for f in ['index.html', 'sw.js']:
    p = os.path.join(ROOT, f); s = open(p, encoding='utf-8').read()
    s2, n = re.subn(r'const ASSET_HASH = .*?; // @@HASHES@@', lambda m: line, s)
    assert n == 1, f
    if s2 != s: open(p, 'w', encoding='utf-8', newline='').write(s2)
print(len(H), 'файлов; список обновлён в index.html и sw.js')
