#!/bin/sh
# 画面キャプチャ用の依存を取得する(CDN に出られない環境向け)。
# three.js r128 と Font Awesome 6.4.0 を npm から取り、.vendor/ に展開する(git 管理外)。
set -e
D="$(cd "$(dirname "$0")" && pwd)/.vendor"
mkdir -p "$D" && cd "$D"
[ -f three/package/build/three.js ] || { npm pack three@0.128.0 >/dev/null 2>&1 && mkdir -p three && tar xzf three-0.128.0.tgz -C three; }
[ -f fa/package/css/all.min.css ] || { npm pack @fortawesome/fontawesome-free@6.4.0 >/dev/null 2>&1 && mkdir -p fa && tar xzf fortawesome-fontawesome-free-6.4.0.tgz -C fa; }
echo "vendor ready: $D"
