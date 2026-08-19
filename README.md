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
./public-site/scripts/add-deck.sh 1_en --lang en # ajoute la version anglaise du cours 1
./public-site/scripts/sync-site.sh               # pousse seulement les changements de site
```

Toute modification faite directement dans ce dépôt sera perdue.

## Structure

```
index.html  assets/     page d'accueil bilingue (FR/EN)
site.yaml               liste des sujets et de leurs liens
slides/<id>/            sources Slidev d'un cours (buildées par la CI)
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
