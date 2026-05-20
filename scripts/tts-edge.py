#!/usr/bin/env python3
"""
影刀 · Edge TTS 包装脚本

调用 microsoft/edge-tts 的 Python API,把文本合成 mp3 写到磁盘。
被 vite middleware spawn 调用。

用法:
  python3 scripts/tts-edge.py <out.mp3> <voice> <<<TEXT>>>
  例:
  echo "你好" | python3 scripts/tts-edge.py /tmp/out.mp3 zh-CN-XiaoxiaoNeural
"""
import asyncio
import sys
import edge_tts


async def synth(text: str, voice: str, out_path: str) -> None:
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(out_path)


def main() -> int:
    if len(sys.argv) < 3:
        print("usage: tts-edge.py <out.mp3> <voice> < text-on-stdin", file=sys.stderr)
        return 2

    out_path = sys.argv[1]
    voice = sys.argv[2]
    text = sys.stdin.read().strip()
    if not text:
        print("error: empty text on stdin", file=sys.stderr)
        return 3

    try:
        asyncio.run(synth(text, voice, out_path))
    except Exception as exc:  # noqa: BLE001
        print(f"edge-tts failed: {exc}", file=sys.stderr)
        return 1

    print(out_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
