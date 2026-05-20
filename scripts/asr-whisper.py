#!/usr/bin/env python3
"""
影刀 · fasterwhisper ASR 包装脚本

输入音频文件路径 + 可选 model 大小,输出 JSON segments 到 stdout。
被 vite middleware spawn 调用。

用法:
  python3 scripts/asr-whisper.py <audio.mp3> [model=base] [lang=zh]

  例:
    python3 scripts/asr-whisper.py /tmp/v.mp3 base zh
"""
import json
import sys

try:
    from faster_whisper import WhisperModel
except ImportError as exc:
    print(json.dumps({"error": f"faster_whisper not installed: {exc}"}), file=sys.stderr)
    sys.exit(1)


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: asr-whisper.py <audio> [model=base] [lang=zh]", file=sys.stderr)
        return 2

    audio = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "base"
    language = sys.argv[3] if len(sys.argv) > 3 else "zh"

    try:
        # CPU + int8 量化(平衡速度和质量,Docker 内无 GPU)
        model = WhisperModel(model_size, device="cpu", compute_type="int8")
        segments_iter, info = model.transcribe(
            audio,
            language=language,
            beam_size=5,
            vad_filter=True,
        )
        segments = []
        full_text_parts = []
        for seg in segments_iter:
            segments.append({
                "start": round(seg.start, 3),
                "end": round(seg.end, 3),
                "text": seg.text.strip(),
            })
            full_text_parts.append(seg.text.strip())

        result = {
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
            "duration": round(info.duration, 3),
            "segments": segments,
            "text": "".join(full_text_parts),
        }
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"error": f"transcribe failed: {exc}"}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
