#!/usr/bin/env python3
"""Inventaire Slidev commun a la publication, traduction, preview et CI.

Sans dependances Python tierces. Les anciens cours_*.md gardent la priorite ;
slides.md est accepte lorsqu'aucun cours_*.md n'est present.
"""
import argparse
import os
from pathlib import Path
import re
import sys

CODE_DIRS = ('components', 'layouts', 'lib', 'utils', 'public', 'snippets', 'setup', 'styles')
CODE_EXT = {'.vue', '.ts', '.js', '.mjs', '.css', '.md'}
MEDIA_EXT = r'png|jpe?g|gif|svg|webp|avif|mp4|webm'
MEDIA = re.compile(r'[\w@.,/+-]+\.(?:' + MEDIA_EXT + r')\b', re.I)
JSON_IMPORT = re.compile(
    r'\b(?:from\s*|import\s*(?:\(\s*)?|require\s*\(\s*)'
    r'[\x27"](\.{1,2}/[^\x27"]+\.json)[\x27"]')


def entry(root):
    candidates = sorted(root.glob('cours_*.md'))
    if len(candidates) > 1:
        raise ValueError('Plusieurs decks dans %s : %s' %
                         (root, ', '.join(p.name for p in candidates)))
    if candidates:
        return candidates[0].name
    if (root / 'slides.md').is_file():
        return 'slides.md'
    raise ValueError('Aucun cours_*.md ni slides.md dans %s' % root)


def local_path(root, path):
    path = path.resolve()
    if not path.is_relative_to(root):
        raise ValueError('Chemin hors du deck : %s' % path)
    return path


def imports(text):
    """src: des blocs frontmatter, sans lire les exemples de code Markdown."""
    lines = text.splitlines()
    fence = None
    i = 0
    while i < len(lines):
        line = lines[i]
        match = re.match(r'^\s*(`{3,}|~{3,})', line)
        if match:
            marker = match.group(1)
            if fence is None:
                fence = marker
            elif marker[0] == fence[0] and len(marker) >= len(fence):
                fence = None
        if not fence and line.strip() == '---' and i + 1 < len(lines) and re.match(r'^[\w-]+:', lines[i + 1]):
            i += 1
            while i < len(lines) and lines[i].strip() != '---':
                match = re.match(r'^src:\s*(?:"([^"]+)"|\x27([^\x27]+)\x27|([^#\s]+))', lines[i])
                if match:
                    yield next(v for v in match.groups() if v is not None)
                i += 1
        i += 1


def markdown(root):
    root = root.resolve()
    result, visited, active = [], set(), set()

    def visit(path):
        path = local_path(root, path)
        if path in active:
            raise ValueError('Import circulaire : %s' % path)
        if path in visited:
            return
        if not path.is_file():
            raise ValueError('Section introuvable : %s' % path)
        active.add(path)
        result.append(path.relative_to(root).as_posix())
        for ref in imports(path.read_text(encoding='utf-8')):
            if re.match(r'\w+://', ref):
                raise ValueError('Import distant non pris en charge : %s' % ref)
            visit(path.parent / ref)
        active.remove(path)
        visited.add(path)

    visit(root / entry(root))
    return result


def source_files(root):
    sources = {root / p for p in markdown(root)}
    sources.update(root.glob('*.vue'))
    sources.update(root.glob('*.css'))
    for name in ('vite.config.ts', 'uno.config.ts'):
        if (root / name).is_file():
            sources.add(root / name)
    for folder in CODE_DIRS:
        sources.update(p for p in (root / folder).rglob('*') if p.is_file() and p.suffix in CODE_EXT)
    return sorted(sources)


def data(root):
    """JSON importes par le code publie, sans copier les notes de recherche."""
    root = root.resolve()
    result = set()
    for source in source_files(root):
        for ref in JSON_IMPORT.findall(source.read_text(encoding='utf-8')):
            path = local_path(root, source.parent / ref)
            if not path.is_file():
                raise ValueError('Donnees importees introuvables : %s (%s)' % (ref, source))
            result.add(path.relative_to(root).as_posix())
    return sorted(result)


def media(root, all_media=False):
    root = root.resolve()
    if all_media:
        result = []
        for folder, dirs, names in os.walk(root):
            dirs[:] = [d for d in dirs if d not in {'.git', '.venv', 'node_modules', 'dist'}]
            for name in names:
                path = Path(folder) / name
                if re.fullmatch(r'\.(?:' + MEDIA_EXT + ')', path.suffix, re.I):
                    result.append(path.relative_to(root).as_posix())
        return sorted(result)
    result = set()
    for source in source_files(root):
        for match in MEDIA.finditer(source.read_text(encoding='utf-8')):
            ref = match.group()
            # Priorite au chemin relatif au fichier. Le repli a la racine
            # conserve les anciens chemins interpretes par Slidev/Vite.
            candidates = [source.parent / ref, root / ref.lstrip('./'), root / 'public' / ref.lstrip('/')]
            for candidate in candidates:
                candidate = candidate.resolve()
                if candidate.is_relative_to(root) and candidate.is_file():
                    result.add(candidate.relative_to(root).as_posix())
                    break
    return sorted(result)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('entry', 'markdown', 'media', 'data'))
    parser.add_argument('root', type=lambda s: Path(s).resolve())
    parser.add_argument('--all-media', action='store_true')
    args = parser.parse_args()
    try:
        values = ([entry(args.root)] if args.command == 'entry' else markdown(args.root)
                  if args.command == 'markdown' else data(args.root)
                  if args.command == 'data' else media(args.root, args.all_media))
        print('\n'.join(values))
    except (ValueError, OSError) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
