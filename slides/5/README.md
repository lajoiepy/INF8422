# Apprentissage supervisé pour la perception robotique

Projet Slidev autonome en français. Les sections sont importées dans `slides.md` ; déplacer un bloc `src:` réordonne le cours. Les rappels ne dépendent d’aucune position.

## Utilisation

```sh
npm ci
npm run dev
npm run build
npm run export
```

Node.js 22.12+ ou 24 recommandé par la chaîne installée. Validation effectuée avec Node.js 24.17.0, Slidev 52.16.0 et Chromium. `dist/` contient le site construit. L’export PDF demande Chromium via Playwright ; si nécessaire : `npx playwright install chromium`.

Les figures, les polices libres et les animations sont locales. Les liens bibliographiques peuvent être ouverts en ligne, mais la présentation ne les charge pas pour s’afficher.

## Diapositives

| Section | Nombre |
|---|---:|
| Ouverture | 3 |
| Bases de l’apprentissage | 24 |
| Étiquettes denses | 27 |
| Représentations objet | 41 |
| Cartes HD | 19 |
| Reconnaissance de lieux | 17 |
| Synthèse | 3 |
| **Total** | **134** |

`coverage.json` contient les titres et fichiers de chaque section. `COUVERTURE.md` relie le contenu aux objectifs pédagogiques. Les nombres incluent ouvertures, transitions et synthèses ; les clics des interactions ne sont pas des diapositives supplémentaires.

## Figures

Les méthodes nommées sont reliées aux sources primaires dans [REFERENCES.md](REFERENCES.md).

Figures `TODO` : **aucune**. Voir [le registre des figures](images/SOURCES.md) et `images/sources.json` pour les URL primaires, références, pages et recadrages. Chaque figure est citée sur sa diapositive. Les démonstrations utilisent des données synthétiques pour illustrer les calculs.

## Composants interactifs

Créés pour ce cours :

- ReceptiveFieldDemo : champ réceptif, profondeur et pas
- AttentionDemo : scores, softmax et agrégation de valeurs
- HungarianDemo : réductions, couverture et affectation optimale

Réutilisés et adaptés depuis les supports existants :

- LiftSplatSampling
- TemporalBevWarp
- HdMapChange
- NetVLADAnimation
- AddMetricAnimation

`DemoFrame.vue`, commun aux trois projets mais copié localement, ajoute la réinitialisation et adapte chaque démonstration à la zone disponible. `InfoBlock`, `AlertBlock`, `ExampleBlock` et le pied de page reprennent les conventions Polytechnique. Le composant global lit les métadonnées de Slidev 52 et masque le pied de page sur les couvertures et transitions.

## Validation

Validation : construction réussie, toutes les diapositives parcourues dans Chromium, aucune erreur JavaScript, ressource absente, équation invalide, requête externe ou débordement détecté. Résultats enregistrés dans `tests/validation.json`. Les résultats numériques des nouvelles interactions sont aussi vérifiés, ainsi que l’opacité des nuages de points et la progression du graphe de scène lorsque ces composants sont présents.

Les avertissements de construction concernent des annotations d’optimisation dans une dépendance VueUse ; ils ne bloquent pas les builds.

```sh
npm run check
npm run check:browser
```

Le contrôle statique résout les imports avec le parseur Slidev, vérifie le plafond, les ressources et les renvois interdits, puis permute les sections en mémoire. Le contrôle navigateur sert `dist/` sur une adresse locale temporaire, bloque les requêtes externes, inspecte chaque diapositive, ses images et équations, détecte les expressions mathématiques non rendues, contrôle les débordements et actionne les curseurs. Il écrit ses captures et son rapport dans `/tmp/inf8422-build/qa` suivi du nom du dossier ; variable `SLIDE_QA_DIR` pour changer ce chemin.

Le relevé du style initial est documenté dans [STYLE.md](STYLE.md).

Les notes orales ciblent les calculs, hypothèses, questions et démonstrations.

Les conventions de terminologie et de notation sont décrites dans [NOTATION.md](NOTATION.md).
