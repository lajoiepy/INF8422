---
layout: section
---

# Reconnaissance de lieux

Recherche de correspondances entre observations d’un même lieu.

---
hideInToc: true
---

# Localiser par recherche dans une base

<div class="lesson-columns">
<div>

Une observation requête $q$ doit retrouver des observations du même lieu dans une base $\{x_j\}$.

$$z_q=f_\theta(q),\qquad j^*=\arg\min_j d(z_q,z_j).$$

</div>
<div>

Le vecteur $z$ est un **descripteur global**, ou représentation vectorielle (embedding).

<ExampleBlock>

Une image hivernale doit retrouver une rue photographiée en été ; un balayage LiDAR doit rester proche malgré un changement de point de vue.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Espace de descripteurs et apprentissage métrique

<div class="lesson-columns">
<div>

Apprendre une représentation vectorielle signifie rapprocher des observations compatibles et éloigner des lieux distincts.

</div>
<div>

Un **réseau siamois** applique le même encodeur aux deux entrées. Les poids partagés placent les deux représentations dans le même espace.

<InfoBlock>

La dimension et la métrique déterminent mémoire et coût de recherche. Une bonne séparation sur les lieux d’entraînement ne suffit pas pour de nouvelles villes.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Perte contrastive sur une paire

<div class="lesson-columns">
<div>

Avec $y=1$ pour une paire positive, $D=\|z_a-z_b\|_2$ et marge $m$ :

$$\ell=yD^2+(1-y)\max(0,m-D)^2.$$

</div>
<div>

Les positifs sont rapprochés. Les négatifs suffisamment éloignés ne contribuent plus.

<AlertBlock>

Un faux négatif peut forcer deux images du même endroit à s’éloigner. Les erreurs d’association influencent donc la géométrie de l’espace appris.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Perte triplet : imposer un ordre relatif

<div class="lesson-columns">
<div>

Un triplet contient une ancre $a$, un positif $p$ et un négatif $n$ :

$$\ell_{\mathrm{tri}}=\max(0,d(z_a,z_p)-d(z_a,z_n)+m).$$

</div>
<div>

On exige que le positif soit plus proche que le négatif d’au moins la marge $m$.

<ExampleBlock>

Avec distances $0{,}4$ et $0{,}5$, une marge de $0{,}2$ donne une perte de $0{,}1$.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Sélection des négatifs difficiles

<div class="lesson-columns">
<div>

Un négatif déjà éloigné dans l’espace des descripteurs peut avoir une perte nulle ; une rue voisine visuellement similaire fournit un exemple plus discriminant.

</div>
<div>

La **sélection de négatifs difficiles** (hard negative mining) choisit des négatifs proches dans l’espace courant, au sein du mini-lot ou d’une mémoire de descripteurs.

<AlertBlock>

Le négatif le plus difficile peut être une erreur d’étiquette. Utiliser une marge géographique d’exclusion et inspecter les confusions récurrentes.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Agréger des caractéristiques locales

<div class="lesson-columns">
<div>

Un encodeur fournit des vecteurs $x_i$ aux positions de l’image ou du nuage.

</div>
<div>

- Une moyenne globale résume leur présence.
- **GeM** règle la préférence pour les fortes activations.
- **NetVLAD** résume les écarts à des centres appris.

<ExampleBlock>

Un descripteur global compact facilite la recherche ; conserver les caractéristiques locales permet ensuite de vérifier les correspondances.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# GeM : moyenne généralisée

<div class="lesson-columns">
<div>

Pour des activations non négatives d’un canal $c$ :

$$z_c=\left(\frac1N\sum_{i=1}^{N}x_{ic}^{p}\right)^{1/p}.$$

</div>
<div>

$p=1$ donne une moyenne ; une grande valeur privilégie les maxima. $p$ peut être appris.

<InfoBlock>

Normaliser le descripteur final évite que la comparaison dépende uniquement de son amplitude globale.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# NetVLAD : agréger des résidus

<div class="lesson-columns">
<div>

Pour des centres appris $c_k$ et des affectations continues $a_k(x_i)$ :

$$v_k=\sum_i a_k(x_i)(x_i-c_k).$$

</div>
<div>

Concaténer les $v_k$, puis normaliser, donne le descripteur de lieu.

<ExampleBlock>

Deux images peuvent avoir le même nombre de motifs, mais des distributions différentes autour des centres. Les résidus conservent cette information.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
class: demo-slide
---

# Des motifs locaux à un descripteur global

<DemoFrame>
<NetVLADAnimation />
</DemoFrame>

<p class="demo-caption">Changer les centres et observer les affectations ainsi que les résidus agrégés.</p>

---
hideInToc: true
---

# Descripteurs LiDAR

<div class="lesson-columns">
<div>

Un encodeur de points, de voxels creux ou d’image de portée produit des caractéristiques qui sont agrégées globalement.

</div>
<div>

Rappel : l’agrégation d’un ensemble de points doit être indépendante de leur ordre de stockage.

<AlertBlock>

Invariance à l’ordre des points ne signifie pas invariance à la rotation du capteur. La rotation et le recouvrement des balayages exigent un traitement spécifique ou des augmentations adaptées.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Le GPS définit des positifs faibles

<div class="lesson-columns">
<div>

Deux observations proches géographiquement sont des candidates positives, sans annotation humaine de chaque paire.

Mais proximité GPS n’implique pas visibilité commune : rues parallèles, orientations opposées, murs ou erreurs de localisation.

</div>
<div>

<ExampleBlock>

Le robot peut revenir au même point avec sa caméra tournée à 180°. Une distance GPS faible ne garantit pas une paire visuelle exploitable.

</ExampleBlock>

Séparer les seuils de candidats positifs et d’exclusion des négatifs réduit les contradictions.

</div>
</div>

---
hideInToc: true
---

# Apprentissage multi-instances

<div class="lesson-columns">
<div>

Si un sac $\mathcal P(a)$ contient plusieurs positifs potentiels, on peut utiliser le plus compatible :

$$\ell=\max\left(0,\min_{p\in\mathcal P(a)}d(z_a,z_p)-d(z_a,z_n)+m\right).$$

</div>
<div>

La supervision affirme qu’**au moins un** membre du sac correspond, sans imposer lequel.

<AlertBlock>

Si aucun candidat ne montre réellement le même lieu, le sac reste incorrect. La formulation suppose la présence d’au moins un correspondant valide dans le sac.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Chercher à grande échelle

<div class="lesson-columns">
<div>

La recherche exacte compare la requête à tous les descripteurs. Son coût augmente avec la taille de la base.

Un index approximatif utilise partitions, graphes de voisinage ou compression pour consulter moins de candidats.

</div>
<div>

<InfoBlock>

Mesurer le compromis entre rappel de recherche, latence et mémoire. L’approximation de l’index peut réduire le rappel obtenu par la recherche exacte.

</InfoBlock>

La métrique et la normalisation de l’index doivent être celles de l’entraînement.

</div>
</div>

---
hideInToc: true
---

# Vérifier géométriquement les candidats

<div class="lesson-columns">
<div>

1. Retrouver quelques candidats par leur descripteur global.
2. Apparier leurs caractéristiques locales.
3. Estimer une transformation géométrique robuste.
4. Reclasser ou rejeter selon les correspondances cohérentes.

</div>
<div>

<ExampleBlock>

Deux façades répétitives peuvent sembler identiques globalement. Des correspondances incompatibles avec une même géométrie permettent de rejeter le candidat.

</ExampleBlock>

La reconnaissance propose un lieu ; la vérification teste sa cohérence géométrique.

</div>
</div>

---
hideInToc: true
---

# Recall@N : retrouver un candidat correct

$$\operatorname{Recall@N}=\frac{\#\{q:\text{un positif figure parmi les N premiers}\}}{\#\{\text{requêtes évaluées}\}}.$$

Préciser le critère de lieu correct, le recouvrement, la taille de la base et les requêtes admissibles.

<AlertBlock>

Un Recall@20 élevé ne garantit ni une pose correcte ni un premier candidat correct. Les performances de vérification géométrique doivent être distinguées.

</AlertBlock>

---
hideInToc: true
---

# Évaluation sous changements d’apparence

<div class="lesson-columns">
<div>

Constituer des séparations par saison, météo, heure et point de vue.

</div>
<div>

L’invariance à l’éclairage doit préserver les différences entre lieux. Une représentation peu sensible aux textures peut aussi confondre des façades distinctes.

<ExampleBlock title="Question">

Une méthode améliore Recall@1 en été mais perd ses positifs en hiver. Quelle hypothèse sur ses caractéristiques est remise en cause ?

</ExampleBlock>

</div>
</div>

<!--
Réponse : les caractéristiques supposées stables pourraient dépendre de végétation, ombres ou textures saisonnières. Examiner les paires et non seulement le score agrégé.
-->
