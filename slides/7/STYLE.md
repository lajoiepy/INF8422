# Style des supports existants

Audit effectué avant rédaction sur les projets `1`, `2_1`, `2_4`, `3`, `4` et les archives thématiques. Aucun de ces supports n’a été modifié.

## Identité visuelle

- Thème `default`, version installée 0.25.0 ; Slidev 52.16.0.
- Format 16:9, canvas de 980 pixels, navigation hash, langue française.
- Titre de fenêtre `%s — INF8422`, identité de l’enseignant et de Polytechnique Montréal.
- Sans-serif Avenir Next puis Nunito Sans ; monospace Fira Code. Nunito Sans et Fira Code sont désormais intégrées localement avec leurs licences libres.
- Rouge `#CF1C24`, orange `#F15A22`, vert `#25B34B`, bleu `#00BDF2`, gris `#333333`.
- Titres rouges soulignés ; couvertures et transitions sans soulignement ; logo et barre de quatre couleurs.

## Compositions observées

Comptage des déclarations et structures Markdown, avant création des nouveaux projets :

| Support | Titres principaux | Cover | Section | Two-cols-header | Grilles deux colonnes |
|---|---:|---:|---:|---:|---:|
| Introduction | 102 | 1 | 7 | 32 | 17 |
| Géométrie | 27 | 1 | 4 | 11 | 5 |
| Estimation d’état | 82 | 1 | 8 | 1 | 49 |
| SLAM | 72 | 1 | 5 | 8 | 24 |
| Représentations | 93 | 1 | 10 | 0 | 58 |

Le layout standard avec grilles HTML est très fréquent. Les nouveaux supports reprennent cette logique avec `lesson-columns`, tout en donnant toute la largeur aux figures détaillées, tableaux et équations longues. Ils gardent une idée centrale par diapositive, généralement quelques paragraphes ou trois à cinq points, et un encadré de définition, d’exemple ou de limite.

Les équations sont en KaTeX, avec variables définies et exemple robotique. Le code reste court et sert à expliquer une procédure ; aucune démonstration n’exécute un modèle distant.

## Structure et composants

Couverture, objectifs, plan, transitions nommées, rappels conceptuels, contenu et synthèse. Les composants `InfoBlock`, `AlertBlock`, `ExampleBlock` sont repris localement. Les composants spécialisés sont réutilisés depuis les archives pertinentes ; `DemoFrame` les redimensionne et les réinitialise.

Les anciens supports possèdent peu de notes orales explicites. Beaucoup de commentaires sont des indications d’images ou du contenu désactivé. Le choix retenu pour les nouveaux supports est celui de notes ciblées sur les calculs, les questions et les interactions.

Les renvois positionnels des anciens supports ne sont pas repris. Le plan dynamique affiche des puces et le pied de page ne comporte pas de compteur. Les noms de dossiers servent uniquement à l’organisation du projet.

Les composants SVG adaptés fixent la taille des textes et l’opacité par des styles explicites afin d’éviter leur réinterprétation par les utilitaires CSS de Slidev.
