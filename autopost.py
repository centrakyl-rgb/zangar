from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import error, parse, request


DEFAULT_POSTS_FILE = "posts.md"
DEFAULT_STATE_FILE = "state.json"
MAX_TELEGRAM_TEXT = 4096
MAX_PHOTO_CAPTION = 1024


class AutopostError(Exception):
    pass


@dataclass
class Post:
    post_id: str
    marker: str
    text: str
    image: Path | None = None


def load_dotenv(path: Path = Path(".env")) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def read_state(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"published_ids": [], "history": []}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise AutopostError(f"State-файл повреждён: {path}") from exc
    data.setdefault("published_ids", [])
    data.setdefault("history", [])
    return data


def write_state(path: Path, state: dict[str, Any]) -> None:
    path.write_text(
        json.dumps(state, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def make_post_id(marker: str, body: str) -> str:
    digest = hashlib.sha1(f"{marker}\n{body}".encode("utf-8")).hexdigest()[:12]
    safe_marker = re.sub(r"[^a-zA-Z0-9а-яА-ЯёЁ_-]+", "-", marker).strip("-").lower()
    return f"{safe_marker}-{digest}" if safe_marker else digest


def parse_posts(path: Path) -> list[Post]:
    if not path.exists():
        raise AutopostError(f"Файл с постами не найден: {path}")

    text = path.read_text(encoding="utf-8").strip()
    if not text:
        return []

    matches = list(re.finditer(r"^###\s+(.+?)\s*$", text, flags=re.MULTILINE))
    posts: list[Post] = []

    for index, match in enumerate(matches):
        marker = match.group(1).strip()
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        body = text[start:end].strip()
        if not body:
            continue

        body, image = extract_metadata(body, path.parent)
        posts.append(Post(post_id=make_post_id(marker, body), marker=marker, text=body, image=image))

    return posts


def extract_metadata(body: str, base_dir: Path) -> tuple[str, Path | None]:
    lines = body.splitlines()
    image: Path | None = None
    clean_lines: list[str] = []

    for line in lines:
        match = re.match(r"^\s*(image|картинка|photo)\s*:\s*(.+?)\s*$", line, flags=re.IGNORECASE)
        if match:
            image = (base_dir / match.group(2)).resolve()
            continue
        clean_lines.append(line)

    return "\n".join(clean_lines).strip(), image


def get_next_post(posts: list[Post], state: dict[str, Any]) -> Post | None:
    published = set(state.get("published_ids", []))
    for post in posts:
        if post.post_id not in published:
            return post
    return None


def split_text(text: str, limit: int = MAX_TELEGRAM_TEXT) -> list[str]:
    chunks: list[str] = []
    current = ""
    for paragraph in text.split("\n\n"):
        addition = paragraph if not current else f"{current}\n\n{paragraph}"
        if len(addition) <= limit:
            current = addition
            continue
        if current:
            chunks.append(current)
        while len(paragraph) > limit:
            chunks.append(paragraph[:limit])
            paragraph = paragraph[limit:]
        current = paragraph
    if current:
        chunks.append(current)
    return chunks


def telegram_request(token: str, method: str, **kwargs: Any) -> dict[str, Any]:
    url = f"https://api.telegram.org/bot{token}/{method}"
    data = kwargs.get("data") or {}
    files = kwargs.get("files") or {}

    if files:
        body, content_type = encode_multipart(data, files)
        headers = {"Content-Type": content_type}
    else:
        body = parse.urlencode(data).encode("utf-8")
        headers = {"Content-Type": "application/x-www-form-urlencoded"}

    req = request.Request(url, data=body, headers=headers, method="POST")
    try:
        with request.urlopen(req, timeout=30) as response:
            status_code = response.status
            response_text = response.read().decode("utf-8")
    except error.HTTPError as exc:
        status_code = exc.code
        response_text = exc.read().decode("utf-8", errors="replace")
    except error.URLError as exc:
        raise AutopostError(f"Не удалось подключиться к Telegram: {exc}") from exc

    try:
        payload = json.loads(response_text)
    except ValueError:
        payload = {}

    if 200 <= status_code < 300:
        if payload.get("ok"):
            return payload

    description = payload.get("description", response_text)

    if status_code == 401:
        raise AutopostError("Неправильный TELEGRAM_BOT_TOKEN. Проверь токен от BotFather.")
    if status_code == 400:
        raise AutopostError(
            "Telegram вернул ошибку 400. Чаще всего это неправильный TELEGRAM_CHAT_ID "
            f"или неверный формат запроса. Ответ Telegram: {description}"
        )
    if status_code == 403:
        raise AutopostError(
            "Бот не может писать в этот канал. Добавь бота в администраторы канала "
            f"и дай право публиковать сообщения. Ответ Telegram: {description}"
        )
    raise AutopostError(f"Telegram вернул ошибку {status_code}: {description}")


def encode_multipart(data: dict[str, Any], files: dict[str, Any]) -> tuple[bytes, str]:
    boundary = f"----telegram-autopost-{uuid.uuid4().hex}"
    chunks: list[bytes] = []

    for key, value in data.items():
        chunks.append(f"--{boundary}\r\n".encode("utf-8"))
        chunks.append(f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode("utf-8"))
        chunks.append(str(value).encode("utf-8"))
        chunks.append(b"\r\n")

    for key, file_obj in files.items():
        filename = Path(getattr(file_obj, "name", "image")).name
        content = file_obj.read()
        chunks.append(f"--{boundary}\r\n".encode("utf-8"))
        chunks.append(
            f'Content-Disposition: form-data; name="{key}"; filename="{filename}"\r\n'.encode("utf-8")
        )
        chunks.append(b"Content-Type: application/octet-stream\r\n\r\n")
        chunks.append(content)
        chunks.append(b"\r\n")

    chunks.append(f"--{boundary}--\r\n".encode("utf-8"))
    return b"".join(chunks), f"multipart/form-data; boundary={boundary}"


def send_post(token: str, chat_id: str, post: Post, dry_run: bool = False) -> list[int]:
    if dry_run:
        print("DRY RUN: пост не отправлен.")
        print(f"ID: {post.post_id}")
        print(post.text)
        if post.image:
            print(f"Картинка: {post.image}")
        return []

    message_ids: list[int] = []

    if post.image:
        if not post.image.exists():
            raise AutopostError(f"Картинка для поста не найдена: {post.image}")
        with post.image.open("rb") as image_file:
            data = {"chat_id": chat_id}
            if len(post.text) <= MAX_PHOTO_CAPTION:
                data["caption"] = post.text
            payload = telegram_request(token, "sendPhoto", data=data, files={"photo": image_file})
            message_ids.append(payload["result"]["message_id"])
        if len(post.text) > MAX_PHOTO_CAPTION:
            for chunk in split_text(post.text):
                payload = telegram_request(token, "sendMessage", data={"chat_id": chat_id, "text": chunk})
                message_ids.append(payload["result"]["message_id"])
        return message_ids

    for chunk in split_text(post.text):
        payload = telegram_request(token, "sendMessage", data={"chat_id": chat_id, "text": chunk})
        message_ids.append(payload["result"]["message_id"])
    return message_ids


def mark_published(state: dict[str, Any], post: Post, message_ids: list[int]) -> None:
    state.setdefault("published_ids", []).append(post.post_id)
    state.setdefault("history", []).append(
        {
            "post_id": post.post_id,
            "marker": post.marker,
            "message_ids": message_ids,
            "published_at": datetime.now(timezone.utc).isoformat(),
        }
    )


def main() -> int:
    load_dotenv()

    parser = argparse.ArgumentParser(description="Telegram autoposting")
    parser.add_argument("--posts-file", default=os.getenv("POSTS_FILE", DEFAULT_POSTS_FILE))
    parser.add_argument("--state-file", default=os.getenv("STATE_FILE", DEFAULT_STATE_FILE))
    parser.add_argument("--dry-run", action="store_true", help="Показать следующий пост, но не отправлять")
    args = parser.parse_args()

    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")

    if not args.dry_run:
        if not token:
            raise AutopostError("Не найден TELEGRAM_BOT_TOKEN. Добавь его в .env или GitHub Secrets.")
        if not chat_id:
            raise AutopostError("Не найден TELEGRAM_CHAT_ID. Добавь его в .env или GitHub Secrets.")

    posts_path = Path(args.posts_file)
    state_path = Path(args.state_file)
    posts = parse_posts(posts_path)
    if not posts:
        raise AutopostError(f"В файле {posts_path} нет постов в формате '### Пост 1'.")

    state = read_state(state_path)
    post = get_next_post(posts, state)
    if post is None:
        print("Новых постов нет: все посты из файла уже опубликованы.")
        return 0

    print(f"Следующий пост: {post.marker} ({post.post_id})")
    message_ids = send_post(token or "", chat_id or "", post, dry_run=args.dry_run)

    if not args.dry_run:
        mark_published(state, post, message_ids)
        write_state(state_path, state)
        print(f"Пост опубликован. Message ID: {message_ids}")

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AutopostError as exc:
        print(f"Ошибка: {exc}", file=sys.stderr)
        raise SystemExit(1)
