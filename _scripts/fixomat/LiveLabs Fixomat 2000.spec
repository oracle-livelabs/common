# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_submodules

hiddenimports = ['concurrent', 'concurrent.futures']
hiddenimports += collect_submodules('PIL')


a = Analysis(
    ['/Users/klazarz/Documents/GitHub/livelabs/common/_scripts/fixomat/fixomat.py'],
    pathex=[],
    binaries=[('/Users/klazarz/Documents/GitHub/livelabs/common/_scripts/fixomat/build/oxipng', '.')],
    datas=[],
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='LiveLabs Fixomat 2000',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='LiveLabs Fixomat 2000',
)
app = BUNDLE(
    coll,
    name='LiveLabs Fixomat 2000.app',
    icon=None,
    bundle_identifier=None,
)
