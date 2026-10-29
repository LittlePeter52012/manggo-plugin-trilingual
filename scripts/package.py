from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'manggo.plugin.json').read_text())
output = root / 'dist' / f"manggo-plugin-trilingual-{manifest['version']}.mplugin"
output.parent.mkdir(exist_ok=True)
files = ['manggo.plugin.json', 'main.js', 'prompts.js', 'README.md', 'VALIDATION.md', 'LICENSE']
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in files:
        info = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        archive.writestr(info, (root / name).read_bytes())
digest = hashlib.sha256(output.read_bytes()).hexdigest()
(output.parent / 'SHA256SUMS').write_text(f'{digest}  {output.name}\n')
print(output)
print(digest)
