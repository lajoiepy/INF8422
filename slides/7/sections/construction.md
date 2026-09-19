---
layout: section
---

# Construction des modèles de fondation

Pré-entraînement à grande échelle et adaptation à des tâches robotiques.

---
hideInToc: true
---

# Objectifs et données du pré-entraînement

<div class="lesson-columns">
<div>

Apprentissage contrastif, masquage, auto-distillation, annotations et pseudo-étiquettes peuvent entraîner des représentations sur des collections très diverses.

</div>
<div>

Un **modèle de fondation** sert de point de départ à plusieurs usages, par adaptation ou conditionnement.

<InfoBlock>

Le terme désigne un modèle pré-entraîné adaptable à plusieurs tâches. Ses performances physiques et métriques doivent être évaluées pour chaque usage.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Données, paramètres et calcul

<div class="lesson-columns">
<div>

Augmenter la taille du modèle sans données suffisantes, ou les données sans calcul suffisant, peut limiter les gains.

Une loi d’échelle empirique peut prendre la forme :

$$L(N_\theta,N_D)\approx L_\infty+aN_\theta^{-\alpha}+bN_D^{-\beta}.$$

</div>
<div>

$N_\theta$ est le nombre de paramètres ; $N_D$ mesure la quantité de données selon une unité fixée. Les coefficients sont ajustés à une famille d’expériences.

<AlertBlock>

Les lois d’échelle décrivent le domaine expérimental étudié. Leur extrapolation aux métriques robotiques exige une validation.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Le transfert sans exemple dépend de la tâche

<div class="lesson-columns">
<div>

**Sans exemple**, ou zero-shot : appliquer un modèle à une tâche sans exemples annotés spécifiques utilisés pour son ajustement.

Un vocabulaire ouvert permet de proposer des descriptions de classes au moment de l’usage.

</div>
<div>

<ExampleBlock>

Comparer une image aux textes « extincteur », « armoire » et « plante » sans entraîner une nouvelle tête pour ces trois classes.

</ExampleBlock>

Les concepts peuvent néanmoins avoir été présents dans le pré-entraînement ; « sans exemple » ne signifie pas « jamais rencontré ».

</div>
</div>

---
hideInToc: true
---

# Rappel : perte InfoNCE

<div class="lesson-columns">
<div>

Une similarité $s$ entre représentations vectorielles définit une classification parmi des candidats :

$$\ell_i=-\log\frac{e^{s(z_i,z_j)/\tau}}{\sum_{k\in\mathcal C_i}e^{s(z_i,z_k)/\tau}}.$$

</div>
<div>

$\mathcal C_i$ contient les candidats, dont le positif $j$. $\tau>0$ est la température ; $s$ est la similarité cosinus.

<InfoBlock>

Pour relier vision et langage, une paire image–légende fournit le couple positif.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# CLIP : aligner images et textes

<div class="lesson-columns">
<div>

Un encodeur visuel et un encodeur textuel produisent des vecteurs normalisés $z_i^I,z_j^T$.

$$S_{ij}=(z_i^I)^\top z_j^T/\tau.$$

</div>
<div>

La diagonale correspond aux paires du mini-lot. On optimise une entropie croisée image→texte et texte→image.

<ExampleBlock>

Une image de tasse se rapproche de sa description, tandis que les autres légendes servent de candidates concurrentes.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
class: figure-slide
---

# Architecture et objectif de CLIP

Identifier les deux encodeurs, la matrice de correspondance et la façon dont une nouvelle liste de classes devient une liste de textes.

L’entraînement aligne des représentations ; l’usage peut se limiter à une comparaison de similarités.

<div class="figure-panel">
<img class="figure" src="./images/clip-apprentissage.png" alt="Radford et al." />
<p class="citation"><a href="https://arxiv.org/abs/2103.00020" target="_blank" rel="noopener">Radford et al. — CLIP, ICML 2021. Figure 1.</a></p>
</div>

---
hideInToc: true
---

# Les légendes du web sont des positifs faibles

<div class="lesson-columns">
<div>

Une légende peut décrire le sujet principal tout en ignorant d’autres objets présents, ou contenir des informations absentes de l’image.

Des doublons, langues et styles de description influencent les concepts appris.

</div>
<div>

<AlertBlock>

Une proximité image–texte ne prouve pas que le modèle localise correctement chaque mot dans l’image.

</AlertBlock>

L’évaluation robotique doit tester objets rares, vues inhabituelles et formulations de requêtes.

</div>
</div>

---
hideInToc: true
---

# Rappel : un enseignant EMA fournit une cible stable

<div class="lesson-columns">
<div>

L’enseignant suit les paramètres de l’élève :

$$\theta_T\leftarrow\mu\theta_T+(1-\mu)\theta_S.$$

</div>
<div>

L’élève apprend une sortie de l’enseignant sur une autre vue ; le gradient ne modifie pas directement la cible.

<InfoBlock>

La stabilité temporelle des cibles doit être complétée par un mécanisme qui évite des représentations identiques pour toutes les images.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# DINO : auto-distiller des caractéristiques visuelles

<div class="lesson-columns">
<div>

DINO compare des distributions de sorties entre vues d’une même image :

$$\ell=-\sum_k p_T^{(k)}\log p_S^{(k)}.$$

</div>
<div>

L’enseignant et l’élève voient des recadrages différents. Centrage et températures font partie de la construction des cibles de DINO.

<ExampleBlock>

Sans noms de classes, certaines caractéristiques peuvent suivre des parties d’objet cohérentes dans des images différentes.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Caractéristiques denses de DINOv2 et DINOv3

<div class="lesson-columns">
<div>

DINOv2 et DINOv3 étendent cette approche par la sélection des données et des objectifs d’entraînement.

Les caractéristiques par patch peuvent servir à la correspondance, la segmentation ou une carte 3D.

</div>
<div>

<AlertBlock>

Des vecteurs DINO ne sont pas automatiquement comparables aux textes d’un encodeur CLIP. Une relation entre ces espaces doit être apprise ou construite explicitement.

</AlertBlock>

<p class="citation">Oquab et al. — DINOv2, TMLR 2024 ; Siméoni et al. — DINOv3, arXiv 2025.</p>

</div>
</div>

---
hideInToc: true
---

# SAM : segmenter à partir d’une indication

<div class="lesson-columns">
<div>

Un encodeur traite l’image et un autre l’indication de conditionnement (**prompt**) : points, boîte ou masque. Un décodeur produit les masques correspondants.

</div>
<div>

<ExampleBlock>

Cliquer une poignée demande une segmentation correspondant à cette indication, sans entraîner une tête pour la classe « poignée ».

</ExampleBlock>

Une indication peut être ambiguë : partie, objet complet ou groupe d’objets. Le masque n’apporte pas nécessairement un nom de catégorie.

</div>
</div>

---
hideInToc: true
class: figure-slide
---

# Un moteur de données pour la segmentation

Une boucle combine modèle, propositions de masques et interventions humaines pour augmenter les annotations.

Le modèle aide à annoter ; les données enrichies servent à améliorer le modèle.

<div class="figure-panel">
<img class="figure" src="./images/sam-moteur-donnees.png" alt="Kirillov et al." />
<p class="citation"><a href="https://arxiv.org/abs/2304.02643" target="_blank" rel="noopener">Kirillov et al. — Segment Anything, ICCV 2023. Figure 1.</a></p>
</div>

---
hideInToc: true
---

# SAM : distinguer les capacités des versions

| Famille | Conditionnement et usage central |
|---|---|
| SAM | Points, boîtes, masques sur une image |
| SAM 2 | Images et suivi de masques en vidéo |
| SAM 3 | Concepts textuels ou exemples visuels, détection et segmentation |

<InfoBlock>

Le choix de version détermine les entrées admises et les sorties disponibles. Préciser le modèle et le type de prompt utilisés.

</InfoBlock>

<p class="citation">Kirillov et al., ICCV 2023 ; Ravi et al., ICLR 2025 ; Carion et al., ICLR 2026.</p>

---
hideInToc: true
---

# Tokenisation du texte

<div class="lesson-columns">
<div>

Un tokeniseur découpe un texte en unités d’un vocabulaire : sous-mots, ponctuation ou autres fragments.

Chaque identifiant est converti en vecteur de représentation vectorielle. Les tokens ne correspondent pas nécessairement à des mots entiers.

</div>
<div>

<ExampleBlock>

Une description robotique contenant des identifiants et des coordonnées peut être découpée en beaucoup de fragments.

</ExampleBlock>

Le nombre de tokens détermine une partie de la mémoire et du coût de traitement.

</div>
</div>

---
hideInToc: true
---

# Apprendre le prochain token

<div class="lesson-columns">
<div>

Un modèle autorégressif factorise la probabilité d’une séquence :

$$p(y_{1:T})=\prod_{t=1}^{T}p(y_t\mid y_{<t}).$$

</div>
<div>

La perte additionne les entropies croisées des tokens observés. Un masque causal interdit de consulter les tokens futurs.

<InfoBlock>

À l’entraînement, le préfixe réel est fourni. À la génération, le modèle réutilise aussi ses propres tokens, qui peuvent contenir des erreurs.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Produire une réponse token par token

<div class="lesson-columns">
<div>

Le décodeur calcule des logits sur le vocabulaire, choisit un token, l’ajoute au contexte et répète.

</div>
<div>

- Choix du maximum : génération déterministe conditionnellement aux calculs.
- Échantillonnage : diversité dépendant de la distribution choisie.
- Limite de longueur et token de fin : critères d’arrêt.

<AlertBlock>

Un texte fluide peut résulter de régularités linguistiques sans être une observation fidèle de la scène.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Un modèle vision-langage génératif

<div class="lesson-columns">
<div>

Une architecture courante assemble :

$$\text{image}\xrightarrow{\text{encodeur visuel}}Z_v\xrightarrow{\text{projecteur}}Z_{\mathrm{LLM}}\xrightarrow{\text{modèle de langage}}\text{texte}.$$

</div>
<div>

Le projecteur adapte les représentations visuelles à la dimension des entrées du modèle de langage. Les tokens visuels conditionnent les réponses avec le prompt textuel.

<ExampleBlock>

Une image et « quel objet est sur la table ? » deviennent un contexte pour générer une description.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Ajuster le modèle par instructions

<div class="lesson-columns">
<div>

Des exemples associent observation, demande et réponse attendue.

L’ajustement supervisé entraîne la production de réponses adaptées à un format ou une tâche : description, comparaison, localisation ou réponse à une question.

</div>
<div>

<InfoBlock>

Il faut distinguer l’apprentissage de l’association vision–langage et l’apprentissage du comportement de réponse.

</InfoBlock>

La précision métrique dépend des observations géométriques disponibles en entrée.

</div>
</div>

---
hideInToc: true
---

# Choisir une adaptation

| Adaptation | Paramètres modifiés | Données nécessaires |
|---|---|---|
| Prompting | Aucun poids | Description et éventuellement exemples en contexte |
| Sonde linéaire | Tête de sortie | Cibles de la tâche |
| Ajustement fin | Partie ou totalité du modèle | Exemples représentatifs |
| Adaptateurs / LoRA | Modules ou mises à jour limitées | Exemples de la tâche |

Comparer les options selon mémoire, coût et qualité mesurée sur le domaine robotique.

---
hideInToc: true
---

# LoRA : apprendre une correction de faible rang

<div class="lesson-columns">
<div>

Pour une matrice gelée $W\in\mathbb R^{d_o\times d_i}$ :

$$W'=W+\frac\alpha r BA,\qquad A\in\mathbb R^{r\times d_i},\ B\in\mathbb R^{d_o\times r}.$$

</div>
<div>

Si $r$ est petit, seuls $r(d_i+d_o)$ paramètres supplémentaires sont entraînés.

<ExampleBlock>

Adapter certaines projections d’attention à des images d’atelier coûte moins de mémoire d’optimisation que modifier toutes leurs matrices.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Adaptateur à goulot d’étranglement

<div class="lesson-columns">
<div>

Un module réduit les canaux, applique une non-linéarité, puis restaure leur dimension :

$$h'=h+W_{\mathrm{up}}\phi(W_{\mathrm{down}}h).$$

</div>
<div>

Le réseau principal peut rester gelé. Le module ajoute une transformation spécifique à la tâche.

<AlertBlock>

Réduire les paramètres entraînés ne supprime pas le coût de passage dans le grand modèle. Latence et mémoire d’inférence doivent être mesurées séparément.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Distiller pour un robot embarqué

<div class="lesson-columns">
<div>

Un enseignant coûteux peut produire des cibles de classes, de profondeur ou de caractéristiques pour entraîner un élève plus petit.

La distillation transfère les sorties ou les caractéristiques de l’enseignant vers une architecture adaptée au robot.

</div>
<div>

<ExampleBlock>

Un enseignant traite des images hors ligne ; un élève compact prédit les caractéristiques nécessaires à une tâche dense en temps réel.

</ExampleBlock>

Le test doit mesurer qualité et latence sur le matériel visé, avec des scènes indépendantes.

</div>
</div>

---
hideInToc: true
---

# Quantifier : représenter les nombres avec moins de bits

<div class="lesson-columns">
<div>

Une quantification affine approxime un poids $w$ par un entier $q$ :

$$q=\operatorname{clip}(\operatorname{round}(w/s)+z),\qquad \hat w=s(q-z).$$

</div>
<div>

$s$ est une échelle et $z$ un point zéro. Moins de bits peut réduire mémoire et transferts.

<AlertBlock>

Le gain de vitesse dépend des noyaux matériels. Les erreurs numériques peuvent affecter différemment langage, frontières de masques et géométrie.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Latence de la chaîne de perception embarquée

<div class="lesson-columns">
<div>

Décodage des images, prétraitements, transfert mémoire, inférence et post-traitements contribuent tous à la latence.

</div>
<div>

La résolution, le nombre de vues et la longueur de sortie font varier le coût.

<InfoBlock>

Rapporter cadence soutenue, mémoire maximale et latence de la sortie utile. Un temps d’inférence isolé ne décrit pas toute la chaîne robotique.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Limites des modèles de fondation en robotique

- Une réponse peut mentionner un objet absent ou une relation incompatible avec les observations.
- La reconnaissance d’une catégorie et l’estimation de sa distance nécessitent des informations différentes.
- Les propriétés physiques restent difficiles à déduire d’une apparence.
- Une sortie tardive peut être inutilisable pour une scène mobile.

<ExampleBlock>

La description « porte ouverte » doit être complétée par la largeur du passage libre, la géométrie du robot et l’état actuel de la scène pour planifier une traversée.

</ExampleBlock>

---
hideInToc: true
---

# Évaluation du transfert vers un domaine robotique

<div class="lesson-columns">
<div>

Définir une tâche, un domaine et des critères vérifiables : objets non vus, requêtes nouvelles, nouveaux bâtiments ou changements de capteur.

</div>
<div>

Comparer un modèle gelé, une adaptation légère et une référence spécialisée.

<AlertBlock>

Les données du pré-entraînement sont parfois partiellement inconnues. Documenter ce que le protocole permet réellement d’affirmer sur la nouveauté du test.

</AlertBlock>

</div>
</div>
