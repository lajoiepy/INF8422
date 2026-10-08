# INF8422 — Perception Robotique et Intelligence Spatiale

Site du cours : **https://lajoiepy.github.io/INF8422/**

Diapositives (Slidev) et PDF des cours, publiés au fur et à mesure de la session.

---

## ⚠️ Dépôt généré

**Ne rien éditer ici.** Tout le contenu de ce dépôt — page d'accueil, styles,
`site.yaml`, `slides/`, `pdf/`, workflow — est produit depuis le dépôt de
travail `INF8422_internal` et **écrasé** à chaque publication :

```bash
# depuis INF8422_internal/
./public-site/scripts/add-deck.sh 1              # publie le cours 1 (slides + PDF)
./public-site/scripts/translate-deck.sh 1        # prépare diapos/1_en (traduction Claude)
./public-site/scripts/add-deck.sh 1_en --lang en # ajoute la version anglaise du cours 1
./public-site/scripts/add-deck.sh 5              # cours modulaire : slides.md + sections + PDF
./public-site/scripts/translate-deck.sh 5        # traduit l'entrée et toutes les sections importées
./public-site/scripts/add-deck.sh 5_en --lang en # publie la version anglaise après relecture
./public-site/scripts/sync-site.sh               # pousse seulement les changements de site
```

Toute modification faite directement dans ce dépôt sera perdue.

Les scripts reconnaissent un unique `cours_*.md`, comme pour les cours précédents,
ou `slides.md` en l'absence de `cours_*.md`. Les imports `src:` sont suivis
récursivement ; seules les sections utilisées sont publiées, avec leurs médias,
les composants et leurs dépendances dans `lib/` et `utils/`, ainsi que les fichiers
JSON importés (par exemple `sources/references.json`). Les données importées sont
vérifiées avant la copie. La même détection sert à l'aperçu local et au
déploiement GitHub Actions.

La traduction conserve les chemins des imports et partage son cache entre les
sections. Les retouches manuelles de chaque fichier traduit sont protégées ;
`--overwrite` permet explicitement de les remplacer. Les anciens caches et
empreintes des decks monolithiques restent utilisables. Comme auparavant, les
libellés écrits directement dans les composants Vue ne sont pas traduits.

Pour le cours 5, l'export PDF utilise une page par diapositive et attend le rendu
des démonstrations. Les options PDF des anciens `cours_*.md` restent inchangées.
`--no-pdf` permet de copier seulement les sources ; `--all-media` conserve aussi
les médias qui ne sont pas référencés explicitement. Les scripts nécessitent
Python 3.9 ou plus.

Les tests des scripts se lancent depuis `INF8422_internal/` avec
`python3 -m unittest discover -s public-site/tests -v`. Ils utilisent des dépôts
temporaires et des doublures locales de Claude, npm et Slidev : aucun appel de
traduction payant et aucune modification du dépôt public réel.

## Structure

```
index.html  assets/     page d'accueil bilingue (FR/EN)
site.yaml               liste des sujets et de leurs liens
slides/<id>/            sources Slidev d'un cours (buildées par la CI)
scripts/deck-files.py   détection commune des entrées et sections Slidev
pdf/<id>.pdf            export PDF du même cours
```

La page d'accueil est bilingue : le bouton en haut à droite bascule entre le
français (langue par défaut) et l'anglais. Quand un cours existe en version
anglaise, le lien mène à cette version ; sinon il retombe sur le français, signalé
par une étiquette « fr ».

Le déploiement se fait par GitHub Actions à chaque push sur `main`
(`.github/workflows/deploy.yml`) : chaque deck est buildé avec
`--base /INF8422/slides/<id>/`, puis assemblé avec la page d'accueil et publié
sur GitHub Pages.

## Configuration initiale (une seule fois)

1. Créer le dépôt `github.com/lajoiepy/INF8422` et y pousser ce dossier.
2. **Settings → Pages → Build and deployment → Source = GitHub Actions.**
