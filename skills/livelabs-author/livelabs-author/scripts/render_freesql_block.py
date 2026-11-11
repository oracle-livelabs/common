#!/usr/bin/env python3
import argparse
import html
import sys


def render_link(url: str) -> str:
    return f"[Run this example in FreeSQL]({url})"


def render_button(url: str, label: str) -> str:
    safe_url = html.escape(url, quote=True)
    if label == "Run in FreeSQL":
        return f'<freesql-button src="{safe_url}">'
    safe_label = html.escape(label)
    return f'<freesql-button src="{safe_url}">\n\n**{safe_label}**'


def render_embed(url: str, height: int) -> str:
    safe_url = html.escape(url, quote=True)
    return (
        f'<iframe\n'
        f'            class="freesql-embed"\n'
        f'            data-freesql-src="{safe_url}"\n'
        f'            height="{height}px"\n'
        f'            width="100%"\n'
        f'            scrolling="no"\n'
        f'            frameborder="0"\n'
        f'            allowfullscreen="true"\n'
        f'            name="FreeSQL Embedded Playground"\n'
        f'            title="FreeSQL"\n'
        f'            style="width: 100%; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;"\n'
        f'        >FreeSQL Embedded Playground</iframe>'
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Render a FreeSQL link, button, or embed block from a share URL.")
    parser.add_argument("share_url", help="FreeSQL share URL")
    parser.add_argument("--mode", choices=["link", "button", "embed"], default="embed")
    parser.add_argument("--label", default="Run in FreeSQL")
    parser.add_argument("--height", type=int, default=640)
    args = parser.parse_args()

    if "freesql" not in args.share_url.lower():
        print("Warning: URL does not look like a FreeSQL URL.", file=sys.stderr)

    if args.mode == "link":
        print(render_link(args.share_url))
    elif args.mode == "button":
        print(render_button(args.share_url, args.label))
    else:
        print(render_embed(args.share_url, args.height))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
