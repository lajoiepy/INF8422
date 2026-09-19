---
layout: section
---

# Modèles de fondation géométriques

Prédiction de profondeur, de poses et de géométrie multivue.

---
hideInToc: true
---

# Rappel : ambiguïté d’échelle monoculaire

<div class="lesson-columns">
<div>

Une projection relie profondeur, pose et coordonnées image. En monoculaire, plusieurs échelles peuvent produire les mêmes projections.

</div>
<div>

Les modèles géométriques apprennent des régularités de forme et d’échelle depuis leurs données.

<InfoBlock>

Un a priori appris contraint l’estimation à partir des régularités des données. Une mesure métrique indépendante reste nécessaire pour lever l’ambiguïté géométrique.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Profondeur relative et profondeur métrique

<div class="lesson-columns">
<div>

**Relative** : ordre ou forme des profondeurs, éventuellement définis à une échelle et un décalage près selon la représentation.

**Métrique** : sortie exprimée dans une unité physique, généralement le mètre.

</div>
<div>

<ExampleBlock>

« Le mur est derrière la chaise » nécessite moins d’information que « le mur est à 2,4 m ».

</ExampleBlock>

Préciser aussi si le réseau prédit profondeur suivant l’axe optique, distance au centre caméra ou profondeur inverse.

</div>
</div>

---
hideInToc: true
---

# Depth Anything : apprendre avec des données diversifiées

<div class="lesson-columns">
<div>

La famille Depth Anything combine de grandes collections et des cibles produites ou enrichies par des modèles enseignants.

Les versions et jeux de poids peuvent viser profondeur relative ou adaptation métrique.

</div>
<div>

<AlertBlock>

La tête de sortie et les données d’ajustement déterminent la convention de profondeur et son unité.

</AlertBlock>

<p class="citation">Yang et al. — Depth Anything, CVPR 2024 ; Depth Anything V2, NeurIPS 2024.</p>

</div>
</div>

---
hideInToc: true
---

# Metric3D : tenir compte de la caméra

<div class="lesson-columns">
<div>

Une même taille en pixels ne correspond pas à la même taille physique pour toutes les focales.

Metric3D utilise une formulation canonique liée à la caméra pour apprendre une profondeur métrique sur des données hétérogènes.

</div>
<div>

<ExampleBlock>

Changer la focale sans en informer le système peut modifier l’interprétation d’un objet apparemment agrandi.

</ExampleBlock>

<p class="citation">Yin et al. — Metric3D, ICCV 2023 ; Hu et al. — Metric3D v2, TPAMI 2024.</p>

</div>
</div>

---
hideInToc: true
---

# Perte invariante à l’échelle et au décalage

<div class="lesson-columns">
<div>

Pour certaines représentations relatives, comparer après alignement affine :

$$L_{\mathrm{ssi}}=\min_{a,b}\frac1{|\Omega|}\sum_{u\in\Omega}\rho(a\hat d(u)+b-d(u)).$$

</div>
<div>

$d$ est la cible ; $\hat d$ la prédiction. La pénalité $\rho$ est définie sur la profondeur ou sur la profondeur inverse selon le modèle.

<AlertBlock>

La perte n’exige plus que le réseau retrouve les valeurs absolues. Un faible score après alignement ne démontre donc pas une prédiction métrique correcte.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Cartes de points : coordonnées 3D par pixel

<div class="lesson-columns">
<div>

Une **carte de points** (pointmap) $X\in\mathbb R^{H\times W\times3}$ associe un point 3D à chaque pixel.

</div>
<div>

Selon le modèle, les points sont exprimés dans le repère de la vue, d’une vue de référence ou d’un repère commun.

<InfoBlock>

La correspondance pixel–point est conservée. Une profondeur seule exige en plus les rayons de caméra pour produire ces coordonnées.

</InfoBlock>

</div>
</div>

---
hideInToc: true
class: figure-slide
---

# DUSt3R : deux images vers des cartes de points

Deux images sont encodées, puis échangent de l’information par attention croisée. Le modèle prédit leurs cartes de points dans un repère partagé.

Cette géométrie peut ensuite servir à estimer relations de caméras, profondeur ou correspondances.

<div class="figure-panel">
<img class="figure" src="./images/dust3r-vue-ensemble.png" alt="Wang et al." />
<p class="citation"><a href="https://arxiv.org/abs/2312.14132" target="_blank" rel="noopener">Wang et al. — DUSt3R, CVPR 2024. Figure 1.</a></p>
</div>

---
hideInToc: true
class: demo-slide
---

# Cartes de points dans un repère commun

<DemoFrame>
<DUSt3RPointmapAnimation />
</DemoFrame>

<p class="demo-caption">Observer comment des pixels de vues différentes peuvent produire des coordonnées dans un même repère.</p>

---
hideInToc: true
---

# Comparer des cartes de points

<div class="lesson-columns">
<div>

Une perte géométrique compare prédictions et références après la normalisation exigée par le modèle :

$$L_{\mathrm{geom}}=\sum_{i,u}\left\|\frac{\hat X_i(u)}{\hat s}-\frac{X_i(u)}{s}\right\|.$$

</div>
<div>

Les échelles $\hat s$ et $s$ normalisent respectivement la prédiction et la référence. Les masques de validité excluent les cibles absentes.

<AlertBlock>

Les repères et normalisations doivent être identiques dans les deux termes. Chaque famille définit son protocole exact.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Pondérer par une confiance prédite

<div class="lesson-columns">
<div>

Une forme de perte géométrique pondérée est :

$$L=\sum_u\left(c_u\,e_u-\lambda\log c_u\right),\qquad c_u>0.$$

</div>
<div>

Le premier terme pondère l’erreur géométrique. Le second empêche une réduction triviale de tous les poids vers zéro.

<InfoBlock>

Le score sert ici à sélectionner ou pondérer des prédictions. Il n’est pas automatiquement une probabilité d’exactitude étalonnée.

</InfoBlock>

</div>
</div>

<!--
Rester sur le rôle de ce terme dans l’optimisation ; la quantification de l’incertitude n’est pas développée. Les contraintes exactes sur c dépendent du modèle.
-->



---
hideInToc: true
---

# MASt3R : ajouter des caractéristiques d’appariement

<div class="lesson-columns">
<div>

MASt3R relie géométrie prédite et descripteurs locaux pour retrouver des correspondances entre images.

La structure 3D et les associations visuelles peuvent être exploitées conjointement pour la localisation.

</div>
<div>

<AlertBlock>

Un modèle par paire doit encore relier les résultats de plusieurs paires pour reconstruire une séquence cohérente.

</AlertBlock>

<p class="citation">Leroy, Cabon et Revaud — Grounding Image Matching in 3D with MASt3R, ECCV 2024.</p>

</div>
</div>

---
hideInToc: true
---

# De la paire à plusieurs vues

<div class="lesson-columns">
<div>

Traiter séparément toutes les paires d’images multiplie calculs et contraintes d’alignement.

Une architecture multivue échange directement entre les tokens de plusieurs images et prédit leurs propriétés ensemble.

</div>
<div>

<ExampleBlock>

Une façade visible dans trois vues peut soutenir la géométrie d’une quatrième partiellement occultée.

</ExampleBlock>

La quantité de mémoire augmente avec le nombre de vues et de tokens.

</div>
</div>

---
hideInToc: true
class: figure-slide
---

# VGGT : plusieurs sorties dans une seule passe

VGGT prédit poses de caméra, profondeur, cartes de points et caractéristiques pour le suivi de points à partir de plusieurs vues.

Des têtes spécialisées partagent une représentation visuelle.

<div class="figure-panel">
<img class="figure" src="./images/vggt-architecture.png" alt="Wang et al." />
<p class="citation"><a href="https://arxiv.org/abs/2503.11651" target="_blank" rel="noopener">Wang et al. — VGGT, CVPR 2025, meilleur article. Architecture.</a></p>
</div>

---
hideInToc: true
---

# Attention intra-vue et globale

<div class="lesson-columns">
<div>

L’attention **intra-vue** échange entre patchs d’une image ; l’attention **globale** échange entre images.

Alterner les deux permet de construire des caractéristiques locales puis de relier les observations.

</div>
<div>

<InfoBlock>

Le mécanisme de transformer est commun ; le choix des ensembles de tokens consultés encode la structure multivue.

</InfoBlock>

Une corrélation apprise entre vues n’impose pas à elle seule toutes les contraintes d’une reconstruction rigide exacte.

</div>
</div>

---
hideInToc: true
class: demo-slide
---

# Alternance des attentions dans VGGT

<DemoFrame>
<VGGTAlternatingAttentionAnimation />
</DemoFrame>

<p class="demo-caption">Suivre les tokens consultés en attention intra-vue, puis en attention globale.</p>

---
hideInToc: true
---

# Cohérence entre poses, profondeurs et cartes de points

<div class="lesson-columns">
<div>

Des poses et profondeurs prédites peuvent reconstruire des points qui diffèrent de la carte de points prédite directement.

Comparer ces sorties constitue un contrôle de cohérence utile :

$$X_{w}(u)=R_{w\leftarrow c}\left(D(u)K^{-1}\tilde u\right)+t_{w\leftarrow c}.$$

</div>
<div>

<AlertBlock>

Convertir les sorties dans un même repère et une même échelle avant de les comparer ou de les fusionner.

</AlertBlock>

Une optimisation géométrique peut encore être utile après une prédiction en une passe.

</div>
</div>

---
hideInToc: true
---

# Rappel : permuter un ensemble

<div class="lesson-columns">
<div>

Pour des points d’entrée, une description globale peut être invariante ; des sorties par point doivent suivre la permutation.

Pour des vues :

$$F(\pi I)=\pi F(I).$$

</div>
<div>

On souhaite que réordonner les images réordonne leurs sorties de façon correspondante, sous les conventions de repère du modèle.

<InfoBlock>

L’équivariance impose que les sorties suivent la permutation des entrées, sous une même convention de repère.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# π³ : équivariance par permutation des vues

<div class="lesson-columns">
<div>

π³ utilise une architecture équivariante par permutation des vues et prédit une géométrie sans désigner une image comme référence fixe.

Cela réduit la dépendance à une vue initiale mal choisie.

</div>
<div>

<AlertBlock>

La géométrie dépend du contenu et du recouvrement des vues. Le choix du repère et de l’échelle globale reste à préciser.

</AlertBlock>

<p class="citation">Wang et al. — π³: Permutation-Equivariant Visual Geometry Learning, ICLR 2026.</p>

</div>
</div>

---
hideInToc: true
---

# π³X : conditionnement par des données géométriques

<div class="lesson-columns">
<div>

Le dépôt officiel propose π³X, avec injection optionnelle de poses, intrinsèques et profondeur, ainsi qu’une reconstruction métrique approximative.

Cette extension illustre l’intérêt de combiner des a priori appris et des mesures partielles.

</div>
<div>

<InfoBlock>

Ces capacités sont documentées dans le dépôt π³X. Les résultats de l’article π³ portent sur la configuration originale.

</InfoBlock>

<p class="citation">Équipe π³ — mise à jour π³X, dépôt officiel, décembre 2025. Vérification : septembre 2026.</p>

</div>
</div>

---
hideInToc: true
---

# MapAnything : accepter des entrées hétérogènes

<div class="lesson-columns">
<div>

MapAnything combine images et informations géométriques optionnelles : paramètres de caméra, poses ou profondeurs selon les entrées disponibles.

Le modèle vise une reconstruction métrique dans un cadre commun.

</div>
<div>

<ExampleBlock>

Un robot disposant de profondeur pour certaines vues peut la fournir, tandis que d’autres vues ne contiennent que du RGB.

</ExampleBlock>

<p class="citation">Keetha et al. — MapAnything: Universal Feed-Forward Metric 3D Reconstruction, 3DV 2026.</p>

</div>
</div>

---
hideInToc: true
---

# Masques de validité des entrées géométriques

<div class="lesson-columns">
<div>

Des entrées hétérogènes imposent de distinguer valeur absente et valeur mesurée.

</div>
<div>

- Une profondeur manquante n’est pas une profondeur nulle.
- Une pose fournie doit respecter le repère attendu.
- Les intrinsèques doivent suivre les redimensionnements d’image.

<AlertBlock>

Une information a priori erronée peut déplacer la reconstruction prédite. Tester entrée RGB seule, information correcte et information perturbée permet d’évaluer cette dépendance.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Cartes de rayons : décrire la caméra par pixel

<div class="lesson-columns">
<div>

Un rayon associe une origine $o(u)$ et une direction $r(u)$ :

$$X(u)=o(u)+\rho(u)r(u).$$

</div>
<div>

Si $r$ est unitaire, $\rho$ est la portée, c’est-à-dire la distance le long du rayon. D’autres conventions utilisent la profondeur axiale.

<InfoBlock>

La représentation peut décrire la géométrie de projection sans se limiter à un unique vecteur de paramètres de caméra.

</InfoBlock>

</div>
</div>

---
hideInToc: true
class: figure-slide
---

# Depth Anything 3 : profondeur et rayons

Depth Anything 3 apprend conjointement des sorties de profondeur et de rayons pour différentes configurations de vues.

La même représentation permet de relier structure de scène et géométrie des observations.

<div class="figure-panel">
<img class="figure" src="./images/da3-architecture.png" alt="Lin et al." />
<p class="citation"><a href="https://arxiv.org/abs/2511.10647" target="_blank" rel="noopener">Lin et al. — Depth Anything 3, ICLR 2026. Architecture.</a></p>
</div>

---
hideInToc: true
---

# Données réelles et synthétiques pour la géométrie

<div class="lesson-columns">
<div>

Les jeux réels apportent diversité et apparence ; les données synthétiques apportent des cibles géométriques denses et contrôlées.

</div>
<div>

Pour les mélanger : harmoniser unités, repères, masques de validité et conventions de caméra.

<AlertBlock>

Une cible dense issue d’un rendu peut ignorer des phénomènes réels : transparence, spéculaire, flou, déformation ou bruit de mesure.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Tête de rendu sur un modèle géométrique

<div class="lesson-columns">
<div>

Une tête peut convertir les caractéristiques et points prédits en primitives visibles depuis de nouveaux points de vue.

</div>
<div>

Une sortie de type Gaussian splatting contient position, forme, opacité et apparence de primitives 3D.

<InfoBlock>

Le modèle géométrique fournit un support spatial ; la tête de rendu ajoute une représentation d’apparence. Une image plausible ne suffit pas à vérifier la précision métrique du support.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Mémoire et traitement des longues séquences

<div class="lesson-columns">
<div>

L’attention globale relie beaucoup de tokens ; garder toute une vidéo augmente rapidement mémoire et calcul.

Trois stratégies :

</div>
<div>

- traiter des fenêtres avec recouvrement ;
- conserver un état ou une mémoire compacte ;
- construire des sous-cartes puis les aligner.

<AlertBlock>

Une mémoire finie peut oublier des régions. Des fenêtres indépendantes peuvent dériver en échelle ou en orientation.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# CUT3R : maintenir un état persistant

<div class="lesson-columns">
<div>

CUT3R met à jour un état interne à mesure que les images arrivent. Cet état conserve une information géométrique réutilisable.

$$h_t=U(h_{t-1},I_t),\qquad \hat X_t=G(h_t,I_t).$$

</div>
<div>

Ce schéma illustre le traitement en flux, sans recalculer toutes les vues comme un lot unique.

<p class="citation">Wang et al. — Continuous 3D Perception Model with Persistent State, CVPR 2025.</p>

</div>
</div>

---
hideInToc: true
class: figure-slide
---

# TALO : relier des sous-cartes cohérentes

TALO traite la reconstruction en ligne par sous-cartes et alignement, en exploitant des modèles géométriques existants.

L’alignement des sous-cartes vise à maintenir la cohérence des poses et de l’échelle sur l’ensemble de la séquence.

<div class="figure-panel">
<img class="figure" src="./images/talo-pipeline.png" alt="Zhang et al." />
<p class="citation"><a href="https://arxiv.org/abs/2512.02341" target="_blank" rel="noopener">Zhang et al. — TALO, CVPR 2026 (figure de la version arXiv 2025). Architecture de reconstruction en ligne.</a></p>
</div>

---
hideInToc: true
---

# Localisation et SLAM avec ces représentations

<div class="lesson-columns">
<div>

Les modèles peuvent fournir correspondances, géométrie locale ou contraintes entre vues à un système de localisation.

</div>
<div>

Une reconstruction complète doit encore traiter revisites, cohérence des poses et gestion de la mémoire.

<AlertBlock>

Des reconstructions locales plausibles peuvent s’aligner incorrectement dans un lieu répétitif. La vérification géométrique permet de rejeter les associations incompatibles.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Relocaliser dans une carte existante

<div class="lesson-columns">
<div>

Comparer une image actuelle à des vues ou caractéristiques de la carte, puis exploiter les correspondances et points 3D pour estimer sa pose.

</div>
<div>

Rappel : un descripteur global propose des candidats ; les correspondances locales et leur géométrie servent à valider la localisation.

<InfoBlock>

Le modèle géométrique peut enrichir ces associations, mais le test doit inclure changements de point de vue, apparence et objets mobiles.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Modèles géométriques et tâches représentatives

| Besoin | Famille illustrative |
|---|---|
| Profondeur généraliste | Depth Anything, Metric3D |
| Géométrie et appariement par paire | DUSt3R, MASt3R |
| Multi-vues en une passe | VGGT, π³ |
| Conditions géométriques partielles | MapAnything, π³X |
| Profondeur et rayons | Depth Anything 3 |
| Traitement en flux et cohérence globale | CUT3R, TALO |

<p class="citation">Références et versions vérifiées en septembre 2026 ; détails dans le registre des sources du projet.</p>

---
hideInToc: true
---

# Tester les limites géométriques

<div class="lesson-columns">
<div>

Mesurer erreur de profondeur, poses, correspondances et cohérence de reconstruction avec des références indépendantes.

Déclarer tout alignement autorisé : rigide, similarité ou autre jauge.

</div>
<div>

<AlertBlock>

Un alignement global peut cacher une erreur d’échelle ; des alignements par fenêtre peuvent cacher une dérive.

</AlertBlock>

Ajouter mémoire, latence, longueur des séquences et robustesse aux vues sans recouvrement.

</div>
</div>
