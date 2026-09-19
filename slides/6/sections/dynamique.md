---
layout: section
---

# Environnements dynamiques

Suivi, flux de scène, découverte d’objets et prévision d’occupation.

---
hideInToc: true
---

# Suivi par détection et association

<div class="lesson-columns">
<div>

Le suivi multiobjet associe les détections entre instants et conserve une identité de trajectoire.

</div>
<div>

Une prédiction de mouvement fournit des positions attendues. Un coût combine distance, classe et apparence.

<InfoBlock>

Détection et suivi sont des points de départ supervisés. Les observations temporelles peuvent ensuite fournir un signal sans annotations de mouvement denses.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Rappel : apparier des ensembles sans doublons

<div class="lesson-columns">
<div>

L’appariement hongrois minimise un coût global sous contrainte un-à-un.

Pour le suivi, les lignes représentent les pistes existantes et les colonnes les détections courantes.

</div>
<div>

<AlertBlock>

Une piste peut disparaître et une nouvelle détection peut apparaître. Des seuils d’admissibilité et des états non associés sont nécessaires.

</AlertBlock>

Une affectation minimale forcée entre éléments incompatibles crée des changements d’identité.

</div>
</div>

---
hideInToc: true
class: demo-slide
---

# Suivre plusieurs agents

<DemoFrame>
<MotSandboxAnimation />
</DemoFrame>

<p class="demo-caption">Observer les associations lors des croisements et les conséquences d’une détection manquée.</p>

---
hideInToc: true
---

# Le flux de scène décrit un déplacement 3D

<div class="lesson-columns">
<div>

Pour un point $X\in P_t$, le flux de scène $v(X)$ est un déplacement 3D sur l’intervalle observé :

$$X'=X+v(X).$$

</div>
<div>

Les deux nuages doivent être exprimés dans un même repère, ou la convention doit inclure explicitement l’ego-mouvement.

<ExampleBlock>

Un piéton traverse la rue pendant que le véhicule tourne. Sans compensation du mouvement du capteur, tous les bâtiments semblent aussi se déplacer.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Flux image et flux 3D

| Quantité | Unité | Ambiguïté |
|---|---|---|
| Flux optique | Pixels par intervalle | Profondeur et projection |
| Flux de scène | Mètres par intervalle | Correspondances entre surfaces |
| Vitesse | Mètres par seconde | Intervalle temporel à préciser |

Un petit déplacement image peut correspondre à un grand mouvement 3D lointain.

<InfoBlock>

La fréquence des observations fait partie de la définition des cibles et des métriques.

</InfoBlock>

---
hideInToc: true
class: demo-slide
---

# Séparer scène statique et objet mobile

<DemoFrame>
<SceneFlowAnimation />
</DemoFrame>

<p class="demo-caption">Compenser l’ego-mouvement avant d’interpréter les déplacements résiduels.</p>

---
hideInToc: true
---

# Volumes de coût : représenter les candidats

<div class="lesson-columns">
<div>

Comparer les caractéristiques entre observations produit un ensemble de coûts ou similarités :

$$C(u,\Delta)=\langle F_t(u),F_{t+1}(u+\Delta)\rangle.$$

</div>
<div>

En 3D, les candidats peuvent être des voisins dans l’autre nuage. Le réseau exploite la forme du volume et le contexte pour choisir une correspondance.

<AlertBlock>

Le meilleur candidat peut se trouver hors de la fenêtre de recherche ; agrandir celle-ci augmente mémoire et ambiguïté.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Affiner le mouvement de façon itérative

<div class="lesson-columns">
<div>

Partir d’un champ initial, consulter les coûts autour de la position estimée, puis prédire une correction :

$$v^{k+1}=v^k+\Delta v^k.$$

</div>
<div>

Un état récurrent peut conserver les informations accumulées ; les paramètres du module de mise à jour peuvent être partagés entre itérations.

<ExampleBlock>

Une estimation grossière retrouve le véhicule ; des mises à jour locales affinent le déplacement de ses contours.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Apprendre sans flux de référence

<div class="lesson-columns">
<div>

Après déplacement, les points $P'_t=\{X+v(X):X\in P_t\}$ devraient rejoindre les surfaces observées dans $P_{t+1}$.

$$L_{\mathrm{NN}}=\frac1{|P_t|}\sum_{X\in P_t}\min_{Y\in P_{t+1}}\|X+v(X)-Y\|_2^2.$$

</div>
<div>

<InfoBlock>

Cette perte fournit un signal de proximité géométrique sans correspondances annotées.

</InfoBlock>

Le plus proche voisin peut appartenir à une autre surface ou à un autre point physique.

</div>
</div>

---
hideInToc: true
---

# Chamfer : comparer dans les deux sens

<div class="lesson-columns">
<div>

Ajouter le terme inverse réduit les régions de l’observation future que la prédiction ignore :

$$L_{\mathrm{Ch}}=d_{\mathrm{Ch}}^{(2)}(P'_t,P_{t+1})=L_{\mathrm{NN}}+\frac1{|P_{t+1}|}\sum_{Y\in P_{t+1}}\min_{X'\in P'_t}\|Y-X'\|_2^2.$$

</div>
<div>

La notation $d_{\mathrm{Ch}}^{(2)}$ désigne ici la somme des deux moyennes de distances euclidiennes au carré, en m² pour des points métriques.

<AlertBlock>

Une surface uniforme permet des glissements tangentiels sans grande variation de Chamfer. Les changements de visibilité peuvent imposer des associations impossibles.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Cohérence de cycle avant–arrière

<div class="lesson-columns">
<div>

Estimer un flux $v_{t\to s}$ et un flux inverse $v_{s\to t}$ :

$$L_{\mathrm{cycle}}=\sum_X\|v_{t\to s}(X)+v_{s\to t}(X+v_{t\to s}(X))\|_2.$$

</div>
<div>

Si les correspondances sont valides, l’aller-retour doit revenir au point initial.

<AlertBlock>

Deux champs erronés peuvent être cohérents entre eux. Le cycle complète l’observation ; il ne remplace pas une contrainte géométrique ou photométrique.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Lisser sans effacer les frontières

<div class="lesson-columns">
<div>

Des points voisins sur la même surface ont souvent des mouvements proches :

$$L_{\mathrm{smooth}}=\sum_{(i,j)}w_{ij}\|v_i-v_j\|^2.$$

</div>
<div>

Choisir $w_{ij}$ selon distance, apparence ou appartenance estimée à une région.

<ExampleBlock>

Les points d’une portière suivent un mouvement commun, mais les points de la route voisine ne doivent pas être entraînés avec eux.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Rigidité par morceaux

<div class="lesson-columns">
<div>

Une région rigide suit une transformation commune :

$$X_i+v_i\simeq R_kX_i+t_k\quad\text{pour }i\in\mathcal C_k.$$

</div>
<div>

On peut aussi préserver les distances internes entre points d’une même région.

<InfoBlock>

Cet a priori de rigidité réduit les correspondances incompatibles tout en permettant plusieurs mouvements dans la scène.

</InfoBlock>

Un humain articulé ou un tissu déformable ne constitue pas nécessairement un seul morceau rigide.

</div>
</div>

---
hideInToc: true
---

# Découverte d’objets par cohérence du mouvement

<div class="lesson-columns">
<div>

Regrouper les points selon la compatibilité de leurs trajectoires et leur proximité fournit des candidats objets.

</div>
<div>

Ces regroupements peuvent devenir des pseudo-étiquettes de détection, enrichies sur plusieurs observations.

<AlertBlock>

Deux objets peuvent bouger ensemble ; un objet immobile ne se distingue pas par ce signal. Le mouvement produit une partition utile mais incomplète de la scène.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Prévision de l’occupation 4D

<div class="lesson-columns">
<div>

Une représentation 4D associe espace et temps :

$$O(x,y,z,t+\Delta).$$

</div>
<div>

L’objectif est de prévoir où la matière sera présente, y compris si elle se déplace ou devient visible.

<ExampleBlock>

Pour anticiper un piéton qui traverse, une boîte actuelle ne suffit pas ; il faut représenter plusieurs instants futurs.

</ExampleBlock>

Le futur enregistré fournit une cible d’apprentissage, sans annotation humaine de chaque voxel.

</div>
</div>

---
hideInToc: true
---

# Un transformer sur des séquences

<div class="lesson-columns">
<div>

Associer aux tokens spatiaux une information de temps et de position. L’attention relie observations passées et contexte local.

</div>
<div>

Un décodeur prédit plusieurs horizons à partir du passé disponible.

<AlertBlock>

Les tokens futurs utilisés comme cibles ne doivent jamais devenir des entrées du prédicteur évalué. Masques causaux et construction des exemples doivent respecter cette séparation.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Prédire plusieurs horizons

<div class="lesson-columns">
<div>

Une sortie peut contenir une grille par horizon :

$$\hat O_{1:H}=f_\theta(O_{-K:0},\text{poses},\text{caractéristiques}).$$

</div>
<div>

Une perte cumulée pondère les horizons : $L=\sum_h\lambda_hL_h$.

<InfoBlock>

Plus l’horizon augmente, moins une extrapolation de vitesse constante suffit. Les interactions et la géométrie de la scène deviennent importantes.

</InfoBlock>

L’évaluation doit rapporter les horizons séparément.

</div>
</div>

---
hideInToc: true
---

# Visibilité et supervision par LiDAR

<div class="lesson-columns">
<div>

Un rayon indique de l’espace libre avant le premier retour et une surface près du retour. Au-delà, il ne donne généralement pas d’information directe.

</div>
<div>

<AlertBlock>

Une cellule sans point LiDAR n’est pas automatiquement vide. Elle peut être occultée ou ne pas avoir été échantillonnée.

</AlertBlock>

La supervision doit tenir compte du parcours des rayons et des cellules effectivement observables.

</div>
</div>

---
hideInToc: true
---

# Rendu différentiable le long d’un rayon

<div class="lesson-columns">
<div>

Pour une probabilité d’arrêt $\alpha_i$ dans la cellule $i$ :

$$T_i=\prod_{j<i}(1-\alpha_j),\qquad w_i=T_i\alpha_i.$$

</div>
<div>

$T_i$ est la transmittance jusqu’à la cellule ; $w_i$ est le poids du premier retour à cet endroit.

Le produit transforme une grille prédite en distribution de portée. Il peut être différentié pour apprendre à partir du retour LiDAR observé.

</div>
</div>

---
hideInToc: true
---

# Une portée observée supervise plusieurs cellules

<div class="lesson-columns">
<div>

Si le retour se situe dans la cellule $k$ :

$$L_{\mathrm{ray}}=-\log w_k=-\sum_{j<k}\log(1-\alpha_j)-\log\alpha_k.$$

</div>
<div>

Le signal favorise l’espace libre avant le retour et une terminaison à sa position.

<InfoBlock>

La masse résiduelle $\prod_j(1-\alpha_j)$ représente l’absence de retour dans la portée modélisée ; elle ne doit pas disparaître du modèle.

</InfoBlock>

</div>
</div>

---
hideInToc: true
class: demo-slide
---

# Occlusion et contributions le long d’un rayon

<DemoFrame>
<VolumeRenderingRayAnimation />
</DemoFrame>

<p class="demo-caption">Augmenter l’opacité proche réduit le poids des cellules lointaines, même si elles sont occupées.</p>

---
hideInToc: true
---

# Apprendre une occupation à partir de balayages futurs

<div class="lesson-columns">
<div>

Le modèle prédit les volumes futurs depuis le passé. À l’entraînement, un rendu utilise les origines et directions des rayons du balayage futur pour comparer les retours.

</div>
<div>

Ces rayons définissent où la cible a été mesurée.

<AlertBlock>

Utiliser une pose future enregistrée pour construire la perte n’autorise pas à la fournir au prédicteur embarqué, sauf si le protocole la suppose réellement connue.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Erreur de point final du flux

<div class="lesson-columns">
<div>

Avec un flux de référence $v_i$ :

$$\operatorname{EPE}=\frac1N\sum_i\|\hat v_i-v_i\|_2.$$

</div>
<div>

Préciser l’unité, le repère, l’intervalle temporel et les points évalués.

<InfoBlock>

Une moyenne dominée par la scène statique peut masquer des erreurs sur les agents mobiles. Rapporter aussi sous-ensembles mobiles, distances et occultations.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Métriques d’occupation future

<div class="lesson-columns">
<div>

Comparer les cellules observables par IoU, précision et rappel, séparément par horizon.

Comparer aussi les retours rendus aux distances LiDAR mesurées lorsque le protocole le prévoit.

</div>
<div>

<AlertBlock>

Un score calculé seulement sur les retours ne teste pas tout l’espace libre. Un score sur toutes les cellules peut inventer des négatifs dans les zones inconnues.

</AlertBlock>

Documenter masque de visibilité, taille des voxels et portée évaluée.

</div>
</div>

---
hideInToc: true
---

# Détecter les changements à long terme

<div class="lesson-columns">
<div>

Comparer des passages séparés dans un repère commun permet d’identifier apparition, disparition ou déplacement persistant.

Distinguer :

</div>
<div>

- objet temporairement mobile ;
- objet durablement déplacé ;
- différence d’éclairage ou de visibilité ;
- erreur d’alignement entre passages.

<ExampleBlock>

Une voiture absente n’implique pas une place définitivement libre ; une barrière réobservée peut justifier une mise à jour persistante.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Limites de la supervision par mouvement

<div class="lesson-columns">
<div>

Le signal temporel apporte correspondances, objets et occupation future, mais dépend du recouvrement et des hypothèses physiques.

</div>
<div>

<ExampleBlock>

Un flux nul minimise l’erreur d’une scène statique correctement alignée. Une évaluation dominée par ces points décrit peu la qualité du flux sur les objets mobiles.

</ExampleBlock>

Des mouvements cohérents peuvent provenir de causes différentes ; leur interprétation nécessite aussi le contexte géométrique et les interactions observées.

</div>
</div>
