#!/usr/bin/env python3
"""Extract user and assistant messages from Codex Desktop thread transcripts.

The script accepts a single `.jsonl` file, a directory containing `.jsonl`
transcripts, or a `.zip` archive such as the exported thread bundle.

Usage:
  python scripts/extract_codex_dialogue.py --input StallPass-thread-export.zip --output parsed_threads
  python scripts/extract_codex_dialogue.py --input thread_exports --output parsed_threads
  python scripts/extract_codex_dialogue.py --input some-thread.jsonl --output parsed_threads
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Iterable


TEXT_CONTENT_TYPES = {"input_text", "output_text", "text"}
MEDIA_CONTENT_TYPES = {"image", "local_image"}
VALID_ROLES = {"user", "assistant"}


@dataclass(frozen=True)
class InputFile:
    source_name: str
    source_path: str
    text: str


@dataclass(frozen=True)
class MessageRecord:
    timestamp: str
    role: str
    phase: str
    text: str


@dataclass(frozen=True)
class TranscriptRecord:
    session_id: str
    thread_name: str
    source_path: str
    archived: bool
    message_count: int
    messages: list[MessageRecord]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Extract only user and assistant messages from Codex Desktop "
            "thread transcript jsonl files."
        )
    )
    parser.add_argument(
        "--input",
        required=True,
        help="Path to a transcript .jsonl file, a directory, or an exported .zip archive.",
    )
    parser.add_argument(
        "--output",
        required=True,
        help="Directory where parsed transcript files will be written.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_path = Path(args.input).expanduser().resolve()
    output_path = Path(args.output).expanduser().resolve()

    try:
        manifest_lookup, input_files = collect_input_files(input_path)
        output_path.mkdir(parents=True, exist_ok=True)

        transcripts: list[TranscriptRecord] = []
        for input_file in input_files:
            transcript = extract_transcript(input_file, manifest_lookup)
            if transcript is not None and transcript.message_count > 0:
                transcripts.append(transcript)

        transcripts.sort(key=lambda item: (item.thread_name.lower(), item.session_id))
        write_outputs(output_path, transcripts)
        print(
            json.dumps(
                {
                    "input": str(input_path),
                    "output": str(output_path),
                    "transcript_count": len(transcripts),
                    "message_count": sum(item.message_count for item in transcripts),
                },
                indent=2,
            )
        )
        return 0
    except Exception as exc:  # pragma: no cover - defensive CLI error handling
        print(f"error: {exc}", file=sys.stderr)
        return 1


def collect_input_files(input_path: Path) -> tuple[dict[str, dict[str, object]], list[InputFile]]:
    if not input_path.exists():
        raise FileNotFoundError(f"Input path does not exist: {input_path}")

    if input_path.is_file() and input_path.suffix.lower() == ".zip":
        return collect_zip_input_files(input_path)

    if input_path.is_file() and input_path.suffix.lower() == ".jsonl":
        return {}, [InputFile(source_name=input_path.name, source_path=str(input_path), text=input_path.read_text(encoding="utf-8-sig"))]

    if input_path.is_dir():
        return collect_directory_input_files(input_path)

    raise ValueError("Input must be a .jsonl file, a directory, or a .zip archive.")


def collect_directory_input_files(input_path: Path) -> tuple[dict[str, dict[str, object]], list[InputFile]]:
    manifest_lookup = load_manifest_lookup_from_directory(input_path)
    input_files = [
        InputFile(source_name=path.name, source_path=str(path), text=path.read_text(encoding="utf-8-sig"))
        for path in sorted(input_path.rglob("*.jsonl"))
    ]
    return manifest_lookup, input_files


def collect_zip_input_files(input_path: Path) -> tuple[dict[str, dict[str, object]], list[InputFile]]:
    manifest_lookup: dict[str, dict[str, object]] = {}
    input_files: list[InputFile] = []

    with zipfile.ZipFile(input_path) as archive:
        manifest_lookup = load_manifest_lookup_from_zip(archive)
        for entry in sorted(archive.namelist()):
            if not entry.endswith(".jsonl"):
                continue
            with archive.open(entry, "r") as handle:
                text = handle.read().decode("utf-8-sig")
            input_files.append(
                InputFile(
                    source_name=PurePosixPath(entry).name,
                    source_path=entry,
                    text=text,
                )
            )
    return manifest_lookup, input_files


def load_manifest_lookup_from_directory(input_path: Path) -> dict[str, dict[str, object]]:
    manifest_json = input_path / "manifest.json"
    if manifest_json.exists():
        return build_manifest_lookup(json.loads(manifest_json.read_text(encoding="utf-8-sig")))

    manifest_csv = input_path / "manifest.csv"
    if manifest_csv.exists():
        with manifest_csv.open("r", encoding="utf-8-sig", newline="") as handle:
            rows = list(csv.DictReader(handle))
        return {
            str(row["session_id"]): {
                "thread_name": row.get("thread_name", ""),
                "archived": normalize_archived_value(row.get("archived")),
            }
            for row in rows
            if row.get("session_id")
        }
    return {}


def load_manifest_lookup_from_zip(archive: zipfile.ZipFile) -> dict[str, dict[str, object]]:
    manifest_json_name = next((name for name in archive.namelist() if name.endswith("manifest.json")), "")
    if manifest_json_name:
        with archive.open(manifest_json_name, "r") as handle:
            return build_manifest_lookup(json.loads(handle.read().decode("utf-8-sig")))

    manifest_csv_name = next((name for name in archive.namelist() if name.endswith("manifest.csv")), "")
    if manifest_csv_name:
        with archive.open(manifest_csv_name, "r") as handle:
            rows = list(csv.DictReader(handle.read().decode("utf-8-sig").splitlines()))
        return {
            str(row["session_id"]): {
                "thread_name": row.get("thread_name", ""),
                "archived": normalize_archived_value(row.get("archived")),
            }
            for row in rows
            if row.get("session_id")
        }
    return {}


def build_manifest_lookup(manifest: dict[str, object]) -> dict[str, dict[str, object]]:
    transcripts = manifest.get("transcripts", [])
    if not isinstance(transcripts, list):
        return {}

    lookup: dict[str, dict[str, object]] = {}
    for item in transcripts:
        if not isinstance(item, dict):
            continue
        session_id = item.get("session_id")
        if not session_id:
            continue
        lookup[str(session_id)] = {
            "thread_name": item.get("thread_name", ""),
            "archived": bool(item.get("archived", False)),
        }
    return lookup


def normalize_archived_value(value: object) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return str(value).strip().lower() in {"1", "true", "yes"}


def extract_transcript(
    input_file: InputFile,
    manifest_lookup: dict[str, dict[str, object]],
) -> TranscriptRecord | None:
    lines = [line for line in input_file.text.splitlines() if line.strip()]
    if not lines:
        return None

    session_id = ""
    thread_name = ""
    archived = "archived" in input_file.source_path.replace("/", "\\").lower()
    messages: list[MessageRecord] = []

    for line in lines:
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue

        entry_type = str(entry.get("type", ""))
        payload = entry.get("payload", {})

        if entry_type == "session_meta" and isinstance(payload, dict):
            session_id = str(payload.get("id", session_id))
            manifest_item = manifest_lookup.get(session_id, {})
            thread_name = str(manifest_item.get("thread_name", thread_name)).strip()
            archived = bool(manifest_item.get("archived", archived))
            continue

        if entry_type != "response_item" or not isinstance(payload, dict):
            continue
        if payload.get("type") != "message":
            continue

        role = str(payload.get("role", "")).strip()
        if role not in VALID_ROLES:
            continue

        text = extract_message_text(payload.get("content"))
        if not text:
            continue

        phase = str(payload.get("phase", "")).strip()
        messages.append(
            MessageRecord(
                timestamp=str(entry.get("timestamp", "")),
                role=role,
                phase=phase,
                text=text,
            )
        )

    if not session_id:
        session_id = extract_session_id_from_path(input_file.source_path)

    if not thread_name:
        manifest_item = manifest_lookup.get(session_id, {})
        thread_name = str(manifest_item.get("thread_name", "")).strip() or session_id

    if not session_id:
        raise ValueError(f"Could not determine session id for {input_file.source_path}")

    return TranscriptRecord(
        session_id=session_id,
        thread_name=thread_name,
        source_path=input_file.source_path,
        archived=archived,
        message_count=len(messages),
        messages=messages,
    )


def extract_message_text(content: object) -> str:
    if not isinstance(content, list):
        return ""

    chunks: list[str] = []
    for item in content:
        if not isinstance(item, dict):
            continue
        content_type = str(item.get("type", "")).strip()
        if content_type in TEXT_CONTENT_TYPES:
            text = str(item.get("text", "")).strip()
            if text:
                chunks.append(text)
            continue
        if content_type in MEDIA_CONTENT_TYPES:
            source = str(item.get("image_url") or item.get("path") or "").strip()
            marker = f"[{content_type}]"
            chunks.append(f"{marker} {source}".strip())
    return "\n\n".join(chunk for chunk in chunks if chunk).strip()


def extract_session_id_from_path(path_text: str) -> str:
    match = re.search(r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", path_text, re.IGNORECASE)
    return match.group(1) if match else ""


def write_outputs(output_path: Path, transcripts: Iterable[TranscriptRecord]) -> None:
    json_dir = output_path / "json"
    markdown_dir = output_path / "markdown"
    json_dir.mkdir(parents=True, exist_ok=True)
    markdown_dir.mkdir(parents=True, exist_ok=True)

    transcript_list = list(transcripts)
    manifest_rows: list[dict[str, object]] = []

    for transcript in transcript_list:
        base_name = build_output_basename(transcript)
        json_path = json_dir / f"{base_name}.json"
        markdown_path = markdown_dir / f"{base_name}.md"

        json_payload = {
            "session_id": transcript.session_id,
            "thread_name": transcript.thread_name,
            "source_path": transcript.source_path,
            "archived": transcript.archived,
            "message_count": transcript.message_count,
            "messages": [
                {
                    "timestamp": message.timestamp,
                    "role": message.role,
                    "phase": message.phase,
                    "text": message.text,
                }
                for message in transcript.messages
            ],
        }
        json_path.write_text(json.dumps(json_payload, indent=2), encoding="utf-8")
        markdown_path.write_text(render_markdown(transcript), encoding="utf-8")

        manifest_rows.append(
            {
                "session_id": transcript.session_id,
                "thread_name": transcript.thread_name,
                "archived": transcript.archived,
                "message_count": transcript.message_count,
                "source_path": transcript.source_path,
                "json_path": str(json_path),
                "markdown_path": str(markdown_path),
            }
        )

    manifest = {
        "transcript_count": len(transcript_list),
        "message_count": sum(item.message_count for item in transcript_list),
        "transcripts": manifest_rows,
    }
    (output_path / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def build_output_basename(transcript: TranscriptRecord) -> str:
    thread_name = sanitize_filename(transcript.thread_name)
    if thread_name and thread_name != transcript.session_id:
        return f"{thread_name}-{transcript.session_id}"
    return transcript.session_id


def sanitize_filename(value: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip())
    normalized = normalized.strip("-._")
    return normalized[:80] if normalized else ""


def render_markdown(transcript: TranscriptRecord) -> str:
    lines = [
        f"# {transcript.thread_name}",
        "",
        f"- Session ID: `{transcript.session_id}`",
        f"- Source: `{transcript.source_path}`",
        f"- Archived: `{str(transcript.archived).lower()}`",
        f"- Message count: `{transcript.message_count}`",
        "",
    ]

    for message in transcript.messages:
        phase_suffix = f" ({message.phase})" if message.phase else ""
        lines.extend(
            [
                f"## {message.role.capitalize()}{phase_suffix}",
                "",
                f"`{message.timestamp}`",
                "",
                message.text,
                "",
            ]
        )

    return "\n".join(lines).rstrip() + "\n"


if __name__ == "__main__":
    raise SystemExit(main())
