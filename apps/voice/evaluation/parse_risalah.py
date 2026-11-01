"""Convert a Mahkamah Konstitusi risalah (``pdftotext -layout`` output) into reference turns.

Usage: uv run python evaluation/parse_risalah.py risalah.txt > reference.json
Each turn: {"n": 12, "role": "KETUA", "name": "ARSUL SANI", "start": 118.0, "text": "..."}.
``start`` is the risalah's own offset from the opening, in seconds.
"""

from __future__ import annotations

import json
import re
import sys

TURN = re.compile(r"^\s*(\d+)\.\s+([A-Z][A-Z .,()/'-]*?):\s*([A-Z .,'()-]*?)\s*\[(\d+):(\d+)\]\s*$")
NOISE = re.compile(r"^\s*(KETUK PALU.*|SIDANG (DIBUKA|DITUTUP).*|\d+)\s*$")


def parse(text: str) -> list[dict]:
    turns: list[dict] = []
    for line in text.splitlines():
        match = TURN.match(line)
        if match:
            n, role, name, minutes, secs = match.groups()
            turns.append(
                {
                    "n": int(n),
                    "role": role.strip(),
                    "name": name.strip(),
                    "start": int(minutes) * 60 + int(secs),
                    "text": "",
                }
            )
        elif turns and line.strip() and not NOISE.match(line):
            turns[-1]["text"] = (turns[-1]["text"] + " " + line.strip()).strip()
    return turns


if __name__ == "__main__":
    json.dump(parse(open(sys.argv[1]).read()), sys.stdout, ensure_ascii=False, indent=1)
