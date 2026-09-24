---
layout: section
---

# Bases de l’apprentissage supervisé

Comment transformer des exemples annotés en un modèle qui généralise ?

<!--
Présenter la question centrale et annoncer les objectifs de ce bloc.
-->

---
hideInToc: true
---

# Une observation, une cible, une prédiction

<StepFlow :steps='["Observation x", "Modèle fθ(x)", "Prédiction ŷ", "Comparaison à une cible y"]' />

<div class="lesson-columns">
<div>

Un robot reçoit une image. La cible peut être une **distance**, une **classe**, une **boîte** ou une **pose**.

Les paramètres $\theta$ sont ajustés sur des exemples annotés.

</div>
<div>

<ExampleBlock title="Exemple">

Pour une distance réelle de $8\,\mathrm m$, le modèle prédit $6\,\mathrm m$. La fonction de perte quantifie cette erreur. L'erreur guide ensuite la correction des paramètres du modèle.

</ExampleBlock>

</div>
</div>

<!--
Distinguer données, paramètres et cible. Les paramètres sont partagés entre les observations ; chaque exemple possède sa propre cible.
-->

---
hideInToc: true
---

# Apprendre en minimisant une fonction de coût

Pour un ensemble annoté $\mathcal D=\{(x_i,y_i)\}_{i=1}^{N}$ :

$$
\theta^*=\arg\min_\theta L(\theta),\qquad L(\theta)=\frac1N\sum_{i=1}^{N}\ell(f_\theta(x_i),y_i).
$$

<StepFlow :steps='["Calculer ŷ", "Mesurer ℓ versus la cible y", "Descente de gradient et rétropropagation (backpropagation)", "Le paramètres θ sont modifiés"]' />

<InfoBlock title="À retenir">

**Minimiser la fonction de perte L(θ) sur le jeu de données d’entraînement permet d'apprendre les paramètres θ de la fonction de prédiction f:**
$$ f_\theta(x_i) =  ŷ_i$$

</InfoBlock>

<!--
Lire argmin : chercher les paramètres qui rendent le coût minimal. La fonction est souvent non convexe ; on vise une bonne solution, pas une garantie de minimum global.
-->

---
hideInToc: true
---

# Entraîner puis utiliser le modèle

<div class="lesson-columns">
<div>

Apprendre un modèle:
<StepFlow :steps='["Données annotées", "Descente de gradients", "Paramètres appris"]' />

</div>
<div>

Utiliser un modèle:
<StepFlow :steps='["Nouvelle observation", "Paramètres fixés", "Prédiction"]' />

</div>
</div>

<!--
Une cible GNSS peut servir pendant l’apprentissage sans être disponible pendant la recherche visuelle. Ce lien sera réutilisé dans l’étiquetage multimodal.
-->

---
hideInToc: true
---

# Séparer entraînement, validation et test

| Ensemble | Rôle | Ce qui peut en dépendre |
|---|---|---|
| Entraînement | Calculer la perte et les gradients | Paramètres du réseau |
| Validation | Comparer les choix de modèle | Hyperparamètres, arrêt, sélection |
| Test | Évaluer le modèle retenu | Rapport final de performance |

<StepFlow :steps='["Collecte de données", "Séparation en ensembles indépendants", "Entraînement", "Sélection sur validation", "Évaluation sur test"]' />

<AlertBlock title="Éviter une contamination">

En robotique, séparer par trajet, lieu ou session. Deux images successives d’une vidéo sont fortement corrélées.

</AlertBlock>

<!--
Exemple : répartir aléatoirement toutes les images d’un trajet donne un test trop proche de l’entraînement. Une ville réservée au test mesure une autre généralisation qu’une nouvelle session dans la même ville.
-->

---
hideInToc: true
---

# Le neurone : une transformation suivie d’une activation

<div class="lesson-columns">
<div>

$$
a=w^\top x+b,\qquad h=\tanh(a).
$$

- $w$ pondère les entrées ; $b$ est un biais.
- $a$ est une préactivation.
- Des activations non-linéaires permettent d'apprendre des fonctions plus complexes.

</div>
<div>

<StepFlow :steps='["Entrées x", "Somme pondérée a", "Activation h"]' />

</div>
</div>

<!--
Dessiner mentalement une frontière hauteur/rugosité. Mentionner ReLU comme activation très fréquente ; tanh est utilisée dans la démonstration car sa dérivée est lisse.
-->

---
hideInToc: true
---

# Un réseau compose plusieurs transformations

$$
h^{(1)}=\phi(W_1x+b_1),\qquad h^{(2)}=\phi(W_2h^{(1)}+b_2),\qquad \hat y=g(W_3h^{(2)}+b_3).
$$

<StepFlow :steps='["Mesures", "Caractéristiques simples", "Caractéristiques composées", "Sortie adaptée à la tâche"]' />

<div class="lesson-columns">
<div>

Les **poids** et **biais** constituent les paramètres. Une caractéristique intermédiaire peut décrire une texture, un contour ou une structure.

</div>
<div>

<InfoBlock title="">

Un encodeur transforme une image ou un nuage en caractéristiques (features).
La dernière couche d'un réseau (tête) estime une classe, une boîte, un descripteur, etc à partir des features.

</InfoBlock>

</div>
</div>

<!--
Ne pas développer toutes les architectures ici. La convolution et l’attention restent disponibles en annexe.
-->


---
hideInToc: true
---

# Régression : prédire une quantité continue

<div class="lesson-columns">
<div>

La cible est numérique : profondeur, position, dimensions ou vitesse.

$$
e=\hat y-y,\qquad \ell_{\mathrm{quad}}=\frac12e^2,\qquad \frac{\partial\ell}{\partial\hat y}=e.
$$

Le gradient indique dans quel sens corriger la prédiction.

</div>
<div>

<ExampleBlock title="Exemple calculé">

Distance vraie : $8\,\mathrm m$. Prédiction : $6\,\mathrm m$.

$e=-2\,\mathrm m$, $\ell=\frac12 \cdot (-2)^2\,\mathrm m^2$ et $\partial\ell/\partial\hat y=-2\,\mathrm m$.

Descendre le gradient fait **augmenter** la prédiction $\hat y$ pour réduire l'erreur.

</ExampleBlock>

</div>
</div>


---
hideInToc: true
---

# Exemple de régression : d’une image à un angle de conduite

<LabFrame label="Exemple de conduite par imitation · scènes et valeurs illustratives"><SteeringRegressionLab /></LabFrame>

<p class="lab-caption">Une image 2D → un scalaire. Ici, l’angle est normalisé entre −1 et +1 ; il pourrait aussi être exprimé en radians.</p>

<!--
Chaque paire d’entraînement associe une image avant à l’angle de braquage enregistré au même instant, par exemple auprès d’un conducteur. L’image contient la route, les marquages et les courbes à venir. Il s’agit de régression d’une commande par imitation à partir de données de perception.
Les trois scènes sont trois exemples annotés, pas trois classes : la sortie peut prendre toute valeur continue dans l’intervalle. Le curseur simule une prédiction ; aucun réseau ne traite l’image ici. Départ : y=0.6, prédiction=0.2, erreur=-0.4, perte=0.08. Amener le curseur à 0.6, puis changer la scène. La conversion en radians exige de définir l’angle physique de référence ; le signe positif à droite est la convention choisie dans cet exemple.
-->

---
hideInToc: true
class: example-flow-slide
---

# Classification : des scores aux probabilités

Pour $C$ classes, le réseau prédit des scores $s_1,\ldots,s_C$ appelés logits :

$$
p_c=\frac{\exp(s_c)}{\sum_{k=1}^{C}\exp(s_k)},\qquad \sum_c p_c=1.
$$

<StepFlow :steps='["Image", "Scores [2, 1, 0]", "Softmax", "[0,665 ; 0,245 ; 0,090]"]' />

<ExampleBlock title="Classer une région observée par le robot" v-click>

Dans l’ordre **route, piéton, véhicule**, ces scores donnent 66,5 %, 24,5 % et 9,0 %. Le modèle choisit « route ». Si l’annotation est « piéton », cette prédiction est incorrecte.

</ExampleBlock>

<InfoBlock title="À retenir">

Les scores peuvent être négatifs. Les probabilités sont positives et normalisées. Le score le plus grand reste la classe la plus probable.

</InfoBlock>

<!--
Pour la stabilité numérique, soustraire le score maximal avant l’exponentielle. Une probabilité softmax élevée n’est pas une garantie de bonne calibration.
-->

---
hideInToc: true
---

# Entropie croisée : la probabilité de la bonne classe

Une région contient un **piéton**. Quelle probabilité le modèle attribue-t-il à cette annotation ?

<div class="lesson-columns">
<div>

| Classe $c$ | Cible $y_c$ | Prédiction $p_c$ |
|---|---:|---:|
| Route | 0 | 0,6652 |
| **Piéton** | **1** | **0,2447** |
| Véhicule | 0 | 0,0900 |

L’étiquette **one-hot** vaut 1 pour la bonne classe, 0 pour les autres. Les probabilités $p_c$ viennent du softmax.

</div>
<div>

L’entropie croisée compare la cible $y$ à la distribution prédite $p$ :

$$
\ell_{\mathrm{CE}}=-\sum_{c=1}^{C}y_c\ln p_c.
$$

Seul le terme de la classe annotée $c^*$ reste :

$$
\ell_{\mathrm{CE}}=-\ln p_{c^*}.
$$

</div>
</div>

<ExampleBlock title="La cible sélectionne le terme « piéton »" v-click>

$$
\ell=-[0\ln p_{\mathrm{route}}+1\ln p_{\mathrm{piéton}}+0\ln p_{\mathrm{véhicule}}]
=-\ln(0{,}2447)\approx1{,}408.
$$

Minimiser cette perte encourage le modèle à attribuer **plus de probabilité au piéton**.

</ExampleBlock>

<!--
Reprendre les scores [2,1,0] dans l’ordre route, piéton, véhicule. Les probabilités du tableau sont arrondies à quatre décimales ; leur somme affichée vaut 0.9999. La cible est l’annotation, pas la classe gagnante du réseau. Demander quel terme de la somme survit, puis révéler le calcul. ln désigne le logarithme naturel.
Le nom entropie croisée vient de H(y,p) = −Σ y_c ln p_c : la distribution cible y pondère le coût −ln p_c fourni par la prédiction p. Ici y est one-hot, donc son entropie propre est nulle ; on ne minimise pas simplement l’entropie de p. Une prédiction confiante sur la mauvaise classe reste pénalisée.
Le fait que les termes des classes non cibles soient nuls ne signifie pas que leurs logits ne reçoivent aucun gradient : le softmax couple les probabilités. Le gradient combiné par rapport aux logits est p−y. Cette formulation suppose des classes mutuellement exclusives ; pour plusieurs étiquettes simultanées, utiliser des sorties binaires adaptées.
-->

---
hideInToc: true
---

# Pourquoi une perte logarithmique ?

Avec $p=p_{c^*}$, la perte $-\ln p$ diminue lorsque la probabilité de la bonne classe augmente.

<div class="lesson-columns">
<div>

<CrossEntropyCurve />

À $p=1$ : perte nulle. Si $p\to0$ : perte $\to+\infty$.

</div>
<div>

<ExampleBlock title="Deux prédictions correctes, deux pertes">

La cible est « piéton » ; ordre : route, piéton, véhicule.

| Probabilités prédites | Perte |
|---|---:|
| $(0{,}4;\ 0{,}5;\ 0{,}1)$ | $0{,}693$ |
| $(0{,}05;\ 0{,}9;\ 0{,}05)$ | $0{,}105$ |

Le piéton arrive premier dans les deux cas, mais la seconde prédiction lui donne plus de probabilité.

</ExampleBlock>

</div>
</div>

<InfoBlock title="Ce que l’on entraîne">

La perte évalue la **probabilité de l’annotation**, au-delà du simple verdict correct / incorrect. Sur un mini-lot (batch), on prend la moyenne des pertes des exemples.

</InfoBlock>

<!--
Les points de la courbe reprennent les valeurs −ln(0.8)=0.223 et −ln(0.1)=2.303. Une probabilité encore dix fois plus petite, 0.01, donne 4.605. Chaque division de la probabilité par dix ajoute ln(10) à la perte. Le logarithme est naturel.
Pourquoi précisément un logarithme ? Sous l’hypothèse usuelle d’exemples indépendants conditionnellement au modèle, maximiser la vraisemblance des annotations revient à maximiser le produit des p(y_i|x_i). Le logarithme transforme ce produit en somme. Minimiser la somme des −ln p(y_i|x_i), ou sa moyenne, est donc une maximisation de vraisemblance.
Les limites 0 et 1 sont idéales : avec des logits finis, le softmax donne des probabilités strictement comprises entre 0 et 1. En code, calculer la perte depuis les logits par log-sum-exp pour éviter log(0) dû aux arrondis. Une faible perte sur l’entraînement ne garantit pas une bonne calibration sur de nouvelles données.
-->

---
hideInToc: true
class: lab-slide
---

# Manipuler les scores et l’entropie croisée

<LabFrame><LossLab mode="classification"/></LabFrame>

<p class="lab-caption">Cible « piéton » : augmenter son score fait baisser la perte. Changer ensuite la cible pour comparer.</p>

<!--
Départ : la cible est piéton, mais la route a le plus grand score. Lire p(cible)=0.2447 puis −ln p(cible)=1.408. Augmenter le score du piéton et observer sa probabilité monter pendant que la perte descend. Augmenter ensuite le score de la route : la probabilité du piéton baisse et la perte monte. Les sorties sont liées par la normalisation softmax.
Sans changer les scores, choisir une autre annotation : les barres restent identiques, mais la probabilité utilisée dans la perte change. Les gradients affichés suivent l’ordre route, piéton, véhicule. Le gradient p−y du logit cible est négatif : un pas de descente augmente ce score ; les autres gradients sont positifs et leurs scores diminuent.
-->

---
hideInToc: true
---

# La règle de chaîne relie la perte aux paramètres

Modifier un poids change une activation, puis la prédiction, puis la perte. La règle de chaîne mesure **comment cet effet se transmet**.

$$
a=w_1x+b_1,\qquad h=\tanh(a),\qquad \hat y=w_2h+b_2,\qquad \ell=\tfrac12(\hat y-y)^2.
$$

$$
\frac{\partial\ell}{\partial w_1}=
(\hat y-y)\times w_2\times(1-h^2)\times x.
$$

| $\hat y-y$ | $w_2$ | $1-h^2$ | $x$ |
|---|---|---|---|
| Pente de la perte | Effet de $h$ sur $\hat y$ | Pente de l’activation | Effet de $w_1$ sur $a$ |

<InfoBlock title="Rétropropager">

Le calcul avant fournit $a,h,\hat y$. Le calcul arrière multiplie les dérivées locales pour obtenir la sensibilité de la perte à chaque paramètre.

</InfoBlock>

<!--
Le gradient est une sensibilité locale, pas la valeur optimale du poids. Multiplier le long d’un chemin ; additionner les contributions lorsque plusieurs chemins rejoignent un paramètre. Le facteur 1/2 simplifie la dérivée de la perte quadratique.
-->

---
hideInToc: true
---

# Rétropropagation : un poids, un calcul, un effet

Exemple de braquage : $x=1$, $y=0{,}3$, avec $w_1=b_1=0$, $w_2=0{,}5$ et $b_2=0{,}1$.

| Calcul avant | Valeur | Dérivée locale pour le retour |
|---|---:|---|
| $a=w_1x+b_1$ | $0$ | $\partial a/\partial w_1=x=1$ |
| $h=\tanh(a)$ | $0$ | $\partial h/\partial a=1-h^2=1$ |
| $\hat y=w_2h+b_2$ | $0{,}1$ | $\partial\hat y/\partial h=w_2=0{,}5$ |
| $\ell=\tfrac12(\hat y-y)^2$ | $0{,}02$ | $\partial\ell/\partial\hat y=-0{,}2$ |

<ExampleBlock title="Quel poids faut-il augmenter ?" v-click>

$\partial\ell/\partial w_1=(-0{,}2)\times0{,}5\times1\times1=-0{,}1$.

Avec $\eta=0{,}2$, $w_1'=0-0{,}2(-0{,}1)=0{,}02$. En changeant seulement ce poids, $\hat y'\approx0{,}110$ : l’angle se rapproche de la cible $0{,}3$.

</ExampleBlock>

<!--
Demander le signe avant de révéler la réponse. Pour isoler son effet, seul w1 est modifié ici ; une étape d’entraînement ordinaire met à jour tous les paramètres. tanh(.02)*.5+.1 = .1099987.
-->

---
hideInToc: true
class: lab-slide
disabled: true
---

# Rétropropager dans un réseau calculable à la main

<LabFrame><BackpropLab /></LabFrame>

<p class="lab-caption">Lire les dérivées de droite à gauche, puis appliquer θ ← θ − η∇L.</p>

<!--
Utiliser Étape pour passer du calcul avant aux dérivées. Calculer le signe de ∂ℓ/∂w₁ avant de le révéler. Mettre à jour plusieurs fois et observer la prédiction se rapprocher de y=2.
-->

---
hideInToc: true
---

# Descente de gradient : choisir une direction et un pas

<div class="lesson-columns">
<div>

$$
\theta_{k+1}=\theta_k-\eta\nabla_\theta L(\theta_k).
$$

- Le gradient pointe vers la hausse locale la plus rapide.
- Le signe moins donne une direction de descente.
- $\eta>0$ contrôle la longueur du pas.

</div>
<div>

<ExampleBlock title="Un pas numérique">

$L(w)=\tfrac12(w-3)^2$.

À $w=1$, $\nabla L=-2$.

Avec $\eta=0{,}2$ : $w'=1-0{,}2(-2)=1{,}4$.

La perte passe de $2$ à $1{,}28$.

</ExampleBlock>

</div>
</div>

<!--
Pour une quadratique de courbure a, la convergence impose 0<η<2/a. Ne pas transposer cette borne sans précaution à un réseau profond.
-->

---
hideInToc: true
---

# Lot complet, SGD et mini-lots

Un mini-lot $B$ contient $|B|$ exemples. On **moyenne leurs gradients**, puis on effectue une mise à jour :

$$
g_B=\frac1{|B|}\sum_{i\in B}\nabla_\theta\ell_i,\qquad \theta\leftarrow\theta-\eta g_B.
$$

| Méthode | Exemples par mise à jour | Pour 3 200 images, en une époque |
|---|---:|---:|
| Lot complet | Tous les exemples | 1 mise à jour |
| SGD, un exemple à la fois | 1 | 3 200 mises à jour |
| Mini-lot | 32 dans cet exemple | 100 mises à jour |

<ExampleBlock title="Deux exemples ne poussent pas toujours dans le même sens" v-click>

Pour un même poids, deux images donnent les gradients $-2$ et $+1$. Le mini-lot donne $g_B=(-2+1)/2=-0{,}5$ : avec $\eta=0{,}2$, le poids augmente de $0{,}1$.

</ExampleBlock>

<!--
Une époque est un passage complet sur les données. Le lot complet donne le gradient exact de l’objectif empirique courant ; un mini-lot aléatoire en fournit une estimation moins coûteuse et bruitée. En pratique, SGD désigne aussi souvent l’algorithme utilisé avec des mini-lots.
-->

---
hideInToc: true
class: lab-slide
---

# Comparer les trajectoires d’optimisation

<LabFrame><OptimizationLab /></LabFrame>

<p class="lab-caption">Même objectif et même départ. Modifier η puis la taille du mini-lot ; observer stabilité, bruit et vitesse.</p>

<!--
Comparer η=0.12 et mini-lot=1, puis 6 et 24. À 24, les deux trajectoires coïncident. Augmenter η vers 2.8 pour provoquer une divergence. Les ellipses représentent les niveaux de la quadratique calculés à partir des données.
-->

---
hideInToc: true
disabled: true
---

# Le taux d’apprentissage change le comportement

Même objectif $L(w)=\tfrac12(w-3)^2$, même départ $w_0=1$ et minimum en $w=3$ :

$$
w_{k+1}=w_k-\eta(w_k-3).
$$

| Taux $\eta$ | $w_0\to w_1\to w_2\to w_3$ | Comportement |
|---|---|---|
| $0{,}2$ | $1\to1{,}4\to1{,}72\to1{,}976$ | Approche progressive |
| $1{,}5$ | $1\to4\to2{,}5\to3{,}25$ | Oscillations qui diminuent |
| $3$ | $1\to7\to-5\to19$ | Éloignement du minimum |

<InfoBlock title="Traverser le minimum ne signifie pas toujours diverger">

Ici, l’écart au minimum est multiplié par $1-\eta$ à chaque pas. Il diminue si $|1-\eta|<1$, donc si $0<\eta<2$.

</InfoBlock>

<!--
Cette borne concerne uniquement cette quadratique de courbure 1. Pour un réseau, surveiller perte et gradients ; diminuer le taux peut aider près d’une solution. Un écart entraînement-validation appelle aussi une analyse de généralisation.
-->

---
hideInToc: true
---

# Quand apprendre davantage dégrade la généralisation

<div class="lesson-columns">
<div>

Un modèle très flexible peut apprendre des détails propres aux exemples et au bruit d’annotation. Sa perte d’entraînement continue alors à baisser, tandis que sa perte de validation augmente.

</div>
<div>

<StepFlow :steps='["Signal partagé", "Détails des exemples", "Bruit mémorisé"]' />

</div>
</div><InfoBlock title="Surapprentissage">

Le surapprentissage se diagnostique par l’écart de généralisation, pas uniquement par une faible perte d’entraînement.

</InfoBlock>

<ExampleBlock title="Surapprendre c'est comme surmémoriser" v-click>

Le modèle associe un bâtiment rouge à un virage à droite. Il prédit bien les angles sur ce trajet, mais se trompe sur une route inconnue où un bâtiment rouge précède un virage à gauche.

</ExampleBlock>

<!--
Une différence entre les courbes peut aussi révéler un changement de distribution. Ne pas présenter toute hausse de validation comme une preuve unique de mémorisation.
-->

---
hideInToc: true
class: lab-slide
---

# Choisir le modèle avec la validation

<LabFrame><GeneralizationLab /></LabFrame>

<p class="lab-caption">Explorer capacité, bruit et régularisation. Choisir une époque, puis figer le modèle avant de révéler le test.</p>

<!--
Le simulateur entraîne une régression à bases radiales sur 12 observations bruitées ; validation et test ont chacun 50 observations indépendantes. Commencer capacité=16, bruit=.55, λ=0. Comparer λ=.015. Les courbes sont calculées, non dessinées à la main.
-->

---
hideInToc: true
---

# Régulariser : limiter les solutions trop fragiles

Le but de la régularisation est de prévenir le surapprentissage et assurer la généralisation.

Exemple de régularisation: Pénalisation L2 sur les poids du réseau :

$$
L_{\mathrm{reg}}(\theta)=\underbrace{\frac1N\sum_i\ell_i}_{\text{ajustement aux données}}+
\underbrace{\lambda\sum_j\theta_j^2}_{\text{pénalité sur les poids}}.
$$

Deux solutions donnent la **même perte de données** $0{,}10$. Avec $\lambda=0{,}01$ :

| Poids | $\lVert\theta\rVert^2$ | Pénalité | Coût total |
|---|---:|---:|---:|
| $\theta_A=(3,4)$ | $25$ | $0{,}25$ | $0{,}35$ |
| $\theta_B=(1,2)$ | $5$ | $0{,}05$ | **$0{,}15$** |

<InfoBlock title="Une préférence, à régler sur la validation">

L’objectif préfère ici B. Un $\lambda$ trop grand peut toutefois empêcher d’apprendre le signal : une faible norme ne garantit pas une bonne généralisation.

</InfoBlock>

<!--
Les deux solutions et leurs pertes égales sont hypothétiques. La pénalité dépend de la paramétrisation et de l’échelle des entrées. Ne pas confondre systématiquement pénalisation L2 et weight decay : leur relation dépend de l’optimiseur.
-->

---
hideInToc: true
disabled: true
---

# Arrêt anticipé : choisir aussi la durée d’apprentissage

Suivre l’**erreur quadratique moyenne sur l’angle normalisé**. Enregistrer les paramètres quand la validation s’améliore, puis restaurer le meilleur modèle.

| Époque | Erreur d’entraînement | Erreur de validation |
|---|---:|---:|
| 10 | $0{,}06$ | $0{,}05$ |
| 20 | $0{,}03$ | **$0{,}04$** |
| 30 | $0{,}02$ | $0{,}05$ |
| 40 | $0{,}01$ | $0{,}07$ |

<ExampleBlock title="Quel modèle utiliser pour le braquage ?" v-click>

Dans cet exemple fictif, retenir les poids de l’époque 20. L’époque 40 explique mieux les trajets d’entraînement, mais prédit moins bien ceux de validation.

</ExampleBlock>

<!--
La patience évite d’arrêter à la première fluctuation. Le critère et la patience sont réglés avec la validation. Le test n’intervient qu’après la sélection finale ; il ne sert ni à choisir l’époque ni à régler lambda.
-->

---
hideInToc: true
class: figure-slide
---

# Régularisation Dropout : apprendre avec des sous-réseaux

<div class="lesson-columns">
<div>

<img src="../images/dropout.png" class="paper-figure" alt="Srivastava et al., JMLR 2014, Figure 1" />

</div>
<div>

À l’entraînement, chaque activation est conservée avec probabilité $1-p$.

$$
\tilde h=\frac{mh}{1-p},\quad m\sim\mathrm{Bernoulli}(1-p).
$$

À l’inférence, généralement, toutes les activations sont utilisées : $\tilde h=h$.

Dropout réduit le nombre d'activations et de paramètres affectés lors de l'entraînement. Règle générale: Moins de paramètres pour la même quantité de données réduit les risques de surapprentissage.

</div>
</div>

<div class="citation">Srivastava et al., JMLR 2014, Figure 1. <a href="https://jmlr.org/papers/v15/srivastava14a.html">Article et source de la figure</a>.</div>

<!--
La figure originale présente des neurones supprimés. Notre formule utilise la convention dropout inversé, avec la compensation pendant l’entraînement.
-->

---
hideInToc: true
class: lab-slide
disabled: true
---

# Observer les masques de dropout

<LabFrame><RegularizationLab /></LabFrame>

<p class="lab-caption">Changer le masque, puis passer en inférence. Les activations conservées sont compensées pendant l’entraînement.</p>

<!--
Ne pas confondre dropout et suppression permanente des neurones. La somme varie d’un masque à l’autre, mais son espérance correspond à la somme sans masquage.
-->

---
hideInToc: true
---

# Augmenter des données de robotique

| Observation | Transformations utiles | Cohérence à préserver |
|---|---|---|
| Image couleur | Éclairage, contraste, flou, occultation | Identité de la classe et limites physiques |
| Image + boîtes | Recadrage, translation, redimensionnement | Boîtes et masques transformés ensemble |
| RGB-D / multivue | Transformations compatibles entre capteurs | Profondeur, intrinsèques, correspondances |
| Nuage LiDAR | Rotation autour de la verticale, bruit, retrait de points | Boîtes et poses dans le même repère |

<AlertBlock title="Validité des exemples">

Une augmentation doit représenter une variation plausible de la tâche. Une rotation arbitraire de la gravité peut produire une scène impossible et nuire à l'entraînement.

</AlertBlock>

<!--
Pour un redimensionnement d’image, fx, fy, cx, cy changent. Pour une rotation active d’un nuage, transformer toutes les cibles géométriques correspondantes.
-->

---
hideInToc: true
class: lab-slide
disabled: true
---

# Transformer l’image et ses annotations ensemble

<LabFrame><RegularizationLab mode="augmentation"/></LabFrame>

<p class="lab-caption">Déplacer l’objet, puis désactiver la transformation des étiquettes pour visualiser l’erreur créée.</p>

<!--
La scène est synthétique. Montrer que la luminosité peut changer sans déplacer la boîte, tandis qu’une translation géométrique exige une transformation de l’annotation.
-->

---
hideInToc: true
---

# Une boucle d’apprentissage complète

<StepFlow :steps='["Mini-lot + augmentation", "Prédiction + perte", "Rétropropagation", "Mise à jour"]' />


```python
for x, y in training_loader:
    x, y = augment_together(x, y)
    optimizer.zero_grad()
    prediction = model(x)
    loss = criterion(prediction, y)
    loss.backward()
    optimizer.step()
```

**Exemple image–angle :** un mini-lot contient 32 images RVB ($x$ : $32\times3\times H\times W$) et 32 angles ($y$ : $32\times1$). Le modèle prédit un angle par image.

Validation en mode évaluation, sans gradients ; sauvegarder le meilleur modèle selon le critère choisi.

<!--
Présenter ce code comme pseudocode de la boucle PyTorch. Expliquer que zero_grad évite une accumulation involontaire. Les détails de framework ne sont pas le sujet du cours.
-->

---
hideInToc: true
disabled: true
---

# Vérifier les bases avant d’aborder les objets

| Situation | Diagnostic ou action attendue |
|---|---|
| Entraînement et validation restent mauvais | Capacité, optimisation, données ou cible à examiner |
| Entraînement baisse, validation remonte | Arrêt anticipé, régularisation, données plus diverses |
| La perte explose après une mise à jour | Vérifier taux, gradients, normalisation et calculs |
| Le test sert à choisir le taux | Constituer une validation indépendante |

<InfoBlock title="Question de transfert">

Pour une nouvelle tâche : identifier les entrées, les cibles, la perte, la séparation des données et le critère de sélection.

</InfoBlock>

<!--
Faire proposer des causes avant de lire la colonne droite. Plusieurs explications peuvent être compatibles avec une courbe ; demander une expérience permettant de les départager.
-->
