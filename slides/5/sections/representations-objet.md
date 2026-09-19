---
layout: section
---

# Représentations objet

Détection, segmentation d’instances et estimation de pose.

---
hideInToc: true
---

# Représentation d’un ensemble d’objets

<div class="lesson-columns">
<div>

Rappel : une segmentation sémantique prédit une classe par élément.

La détection cherche un ensemble de descriptions :

$$\mathcal O=\{(c_j,b_j,s_j)\}_{j=1}^{M}.$$

</div>
<div>

$c_j$ est une classe, $b_j$ une boîte et $s_j$ un score. Le nombre $M$ varie selon la scène.

<ExampleBlock>

Une région « véhicule » peut contenir deux voitures qui se touchent dans l’image. Il faut deux instances pour les suivre séparément.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Paramétrer une boîte 2D ou 3D

- En image : centre $(u,v)$, largeur $w$, hauteur $h$.
- En 3D : centre $(x,y,z)$, dimensions $(l,w,h)$ et orientation.
- Sur route, une boîte utilise souvent seulement le lacet $\psi$ ; un objet manipulé peut tourner librement.

<AlertBlock>

Repère, ordre des dimensions et convention d’orientation doivent être explicites. Une incohérence de repère entraîne une erreur de localisation.

</AlertBlock>

---
hideInToc: true
---

# Pertes de classification et de régression

<div class="lesson-columns">
<div>

Une perte multitâche combine plusieurs objectifs :

$$L=\lambda_{\mathrm{cls}}L_{\mathrm{cls}}+\lambda_{\mathrm{box}}L_{\mathrm{box}}+\lambda_{\mathrm{ori}}L_{\mathrm{ori}}.$$

</div>
<div>

Les sorties partagent un encodeur, mais leurs cibles et unités diffèrent.

<ExampleBlock>

Le centre peut être exprimé en mètres, les dimensions en logarithmes et la classe par entropie croisée. Les coefficients règlent leurs contributions relatives.

</ExampleBlock>

La régression de boîte est généralement appliquée aux prédictions associées à un objet.

</div>
</div>

---
hideInToc: true
---

# L1 lissée : une transition entre deux pénalités

<div class="lesson-columns">
<div>

Pour le résidu $r=\hat y-y$ et un seuil $\beta>0$ :

$$\operatorname{smoothL1}(r)=\begin{cases}\frac{r^2}{2\beta}&|r|<\beta\\|r|-\frac\beta2&\text{sinon.}\end{cases}$$

</div>
<div>

La zone quadratique lisse le voisinage de zéro ; la croissance linéaire limite le poids relatif des grands résidus.

<InfoBlock>

Le seuil est lié à l’échelle des variables. Une normalisation cohérente des boîtes facilite son choix.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Déséquilibre entre objets et fond

<div class="lesson-columns">
<div>

Un détecteur dense évalue de nombreuses positions ; seules quelques-unes correspondent à des objets.

La **perte focale** réduit la contribution des exemples faciles :

$$\operatorname{FL}(p_t)=-\alpha_t(1-p_t)^\gamma\log p_t.$$

</div>
<div>

$p_t$ désigne la probabilité attribuée à l’étiquette correcte. Pour $\gamma=0$, on retrouve une entropie croisée pondérée.

<ExampleBlock>

Un fond déjà prédit avec $p_t=0{,}99$ contribue beaucoup moins qu’un piéton mal reconnu.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Ancres : corriger des boîtes de référence

<div class="lesson-columns">
<div>

Disposer des boîtes types à plusieurs positions et échelles donne un ensemble d’hypothèses initiales.

Le réseau prédit pour chaque **ancre** : présence d’objet, classe et corrections géométriques.

$$\Delta x=\frac{x-x_a}{w_a},\qquad \Delta w=\log\frac{w}{w_a}.$$

</div>
<div>

<AlertBlock>

Le choix des tailles et des règles d’association aux annotations peut mal représenter des objets atypiques.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Supprimer les détections redondantes

<div class="lesson-columns">
<div>

La **suppression des non-maxima**, ou NMS :

1. Garder la boîte au plus grand score.
2. Supprimer les boîtes trop recouvrantes, selon un seuil d’IoU.
3. Répéter sur les candidates restantes.

</div>
<div>

<ExampleBlock>

Plusieurs ancres couvrent une voiture ; NMS cherche à n’en garder qu’une.

</ExampleBlock>

Des objets distincts très proches peuvent être supprimés à tort. Le seuil et le traitement par classe influencent le rappel.

</div>
</div>

---
hideInToc: true
---

# Détecteurs à une et à deux étapes

| Détecteur | Fonctionnement | Compromis |
|---|---|---|
| Deux étapes | Propositions de régions, puis classification et raffinement | Calcul concentré sur des candidats |
| Une étape | Sorties denses directement depuis les caractéristiques | Chaîne plus directe |

Les deux familles utilisent une perte de classification et une régression géométrique.

Comparer la latence et les performances sur les petits objets avec un protocole d’évaluation commun.

---
hideInToc: true
---

# Détection par cartes de chaleur de centres

<div class="lesson-columns">
<div>

Une carte de chaleur indique la présence d’un centre d’objet par classe.

À un maximum local, lire :

</div>
<div>

- un décalage fin à l’intérieur de la cellule ;
- les dimensions et la hauteur ;
- l’orientation, et éventuellement la vitesse.

<InfoBlock>

La résolution de la carte limite la séparation de deux centres voisins. Des cibles gaussiennes autour des centres facilitent l’apprentissage.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# PointPillars : des colonnes vers une image BEV

<div class="lesson-columns">
<div>

1. Regrouper les points dans des piliers verticaux du plan horizontal.
2. Encoder chaque pilier par un MLP partagé et une agrégation.
3. Disposer les caractéristiques sur une grille BEV.
4. Utiliser un réseau 2D pour prédire les boîtes 3D.

</div>
<div>

<ExampleBlock>

On conserve une description apprise des hauteurs sans faire toutes les convolutions dans un volume dense.

</ExampleBlock>

La compression verticale impose néanmoins des compromis pour les scènes superposées.

</div>
</div>

---
hideInToc: true
---

# Détection LiDAR par centres

<div class="lesson-columns">
<div>

Un encodeur de voxels ou de piliers produit des caractéristiques BEV. Une tête de type CenterPoint prédit les centres et attributs 3D.

</div>
<div>

Rappel : une carte de chaleur localise des maxima ; des têtes de régression précisent leur géométrie.

<AlertBlock>

Les points deviennent rares à longue portée. La boîte décrit aussi les parties occultées, dont la géométrie est inférée à partir des données d’entraînement.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Détecter en BEV depuis les caméras

<div class="lesson-columns">
<div>

La projection caméra–BEV place les caractéristiques dans un espace commun au véhicule.

Un détecteur BEV peut ensuite prédire centres, dimensions et orientation comme avec le LiDAR.

</div>
<div>

<ExampleBlock>

Une bonne apparence visuelle peut indiquer un véhicule ; une mauvaise profondeur peut déplacer sa boîte de plusieurs cellules.

</ExampleBlock>

La détection dépend donc à la fois de la reconnaissance et de la qualité de la transformation géométrique.

</div>
</div>

---
hideInToc: true
---

# Fusionner caméra et LiDAR

| Fusion | Information combinée | Limite |
|---|---|---|
| Précoce | Points enrichis par l’image | Calibration et visibilité |
| Intermédiaire | Caractéristiques en BEV ou 3D | Alignement des résolutions |
| Tardive | Détections de chaque capteur | Association et doublons |

La caméra apporte texture et catégories ; le LiDAR apporte des distances mesurées.

<AlertBlock>

Décalage temporel et occlusion peuvent rendre deux mesures incompatibles même avec une calibration correcte.

</AlertBlock>

---
hideInToc: true
---

# Segmentation d’instances

<div class="lesson-columns">
<div>

La segmentation d’instances produit un masque distinct pour chaque objet.

</div>
<div>

- Une approche par régions prédit un masque à l’intérieur d’une proposition.
- Une approche par requêtes associe un masque à chaque hypothèse d’objet.
- En 3D, la sortie peut attribuer chaque point à une instance.

<InfoBlock>

Le masque décrit la surface visible. Il ne décrit pas automatiquement le volume complet ou la pose de l’objet.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Agrégation du contexte par attention

<div class="lesson-columns">
<div>

Une région ambiguë peut être interprétée grâce à une autre région de l’image ou une autre caméra.

</div>
<div>

La convolution consulte un voisinage imposé. **L’attention** agrège des valeurs avec des poids calculés à partir des caractéristiques.

<ExampleBlock>

Une requête qui cherche un véhicule peut consulter une roue, un pare-brise et le contexte routier, même s’ils sont éloignés dans les caractéristiques.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Requêtes, clés et valeurs

<div class="lesson-columns">
<div>

Pour des tokens $X\in\mathbb R^{N\times d}$ :

$$Q=XW_Q,\qquad K=XW_K,\qquad V=XW_V.$$

</div>
<div>

- La **requête** est la projection utilisée pour calculer les scores d’association.
- La **clé** est la projection comparée à chaque requête.
- La **valeur** est le vecteur agrégé avec les poids d’attention.

Les matrices $W_Q,W_K,W_V$ sont apprises. Un **token** est une unité de la séquence, représentée ici par un vecteur associé à une position ou une hypothèse d’objet.

</div>
</div>

---
hideInToc: true
---

# Calculer une attention

<div class="lesson-columns">
<div>

$$A=\operatorname{softmax}_{\text{lignes}}\left(\frac{QK^\top}{\sqrt{d_k}}\right),\qquad Y=AV.$$

Chaque ligne de $A$ donne des poids positifs de somme 1 sur les valeurs consultées.

</div>
<div>

Le facteur $\sqrt{d_k}$ limite la croissance de l’amplitude des produits scalaires avec la dimension.

<ExampleBlock>

Avec les poids $(0{,}7,0{,}2,0{,}1)$, la contribution de la valeur de poids $0{,}7$ domine la somme pondérée.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
class: demo-slide
---

# Scores et poids d’attention

<DemoFrame>
<AttentionDemo />
</DemoFrame>

<p class="demo-caption">Modifier les scores de correspondance : les poids et la valeur agrégée évoluent ensemble.</p>

---
hideInToc: true
---

# Auto-attention et attention croisée

<div class="lesson-columns">
<div>

**Auto-attention** : requêtes, clés et valeurs proviennent du même ensemble. Les positions d’image échangent entre elles.

**Attention croisée** : les requêtes viennent d’un ensemble, les clés et valeurs d’un autre.

</div>
<div>

<ExampleBlock>

Des hypothèses d’objets interrogent une carte de caractéristiques issue des caméras. Le nombre d’hypothèses n’a pas besoin d’égaler le nombre de positions d’image.

</ExampleBlock>

Plusieurs têtes d’attention apprennent des projections complémentaires, puis leurs résultats sont combinés.

</div>
</div>

---
hideInToc: true
---

# Structure d’un bloc transformer

<div class="lesson-columns">
<div>

Un bloc combine attention, MLP par token, normalisation et connexions résiduelles.

Schéma simplifié en pré-normalisation :

$$H'=H+\operatorname{Attn}(\operatorname{LN}(H)),\qquad H''=H'+\operatorname{MLP}(\operatorname{LN}(H')).$$

</div>
<div>

**LayerNorm** normalise les canaux d’un token ; elle n’utilise pas les statistiques d’un mini-lot comme BatchNorm.

L’attention globale coûte une matrice de taille $N\times N$.

</div>
</div>

---
hideInToc: true
---

# Encodage positionnel

<div class="lesson-columns">
<div>

Sans information spatiale, l’attention sur un ensemble ne distingue pas les positions par leur ordre de stockage.

On ajoute ou combine un **encodage positionnel** aux caractéristiques : coordonnées apprises, fonctions sinusoïdales ou positions relatives.

</div>
<div>

<ExampleBlock>

La même texture « roue » n’a pas la même signification au-dessous d’une carrosserie et sur une affiche.

</ExampleBlock>

Les positions doivent correspondre au support : pixels, cellules BEV ou points 3D.

</div>
</div>

---
hideInToc: true
---

# DETR : un ensemble de requêtes apprises

<div class="lesson-columns">
<div>

Un nombre fixe de vecteurs appris constitue des **requêtes d’objets**.

Chaque requête consulte les caractéristiques et produit une classe ainsi qu’une boîte. Les requêtes inutilisées prédisent « aucun objet ».

</div>
<div>

<InfoBlock>

Les requêtes sont des vecteurs appris. L’appariement détermine l’objet cible attribué à chacune pendant l’entraînement.

</InfoBlock>

Il faut comparer cet ensemble non ordonné à l’ensemble des annotations.

</div>
</div>

---
hideInToc: true
class: figure-slide
---

# Prédiction d’ensembles dans DETR

Les requêtes produisent plusieurs sorties en parallèle. L’apprentissage relie les prédictions aux annotations par un appariement un-à-un.

<div class="figure-panel">
<img class="figure" src="./images/detr-ensembles.png" alt="Carion et al." />
<p class="citation"><a href="https://arxiv.org/abs/2005.12872" target="_blank" rel="noopener">Carion et al. — DETR, ECCV 2020. Figure 1.</a></p>
</div>

---
hideInToc: true
---

# Apparier avant de calculer la perte

<div class="lesson-columns">
<div>

Pour la cible $i$ et la prédiction $j$, construire un coût :

$$C_{ij}=\lambda_c\,c_{\mathrm{cls}}(y_i,\hat p_j)+\lambda_b\,c_{\mathrm{box}}(b_i,\hat b_j).$$

</div>
<div>

L’appariement hongrois cherche l’affectation injective de coût total minimal :

$$\sigma^*=\arg\min_\sigma\sum_i C_{i,\sigma(i)}.$$

Les prédictions non associées apprennent « aucun objet ». L’algorithme assure une correspondance un-à-un.

</div>
</div>

---
hideInToc: true
class: demo-slide
---

# Appariement de coût total minimal

<DemoFrame>
<HungarianDemo />
</DemoFrame>

<p class="demo-caption">Comparer une sélection gloutonne à l’affectation de coût total minimal sur trois objets.</p>

<!--
Expliquer que l’énumération des six permutations illustre le résultat exact du problème 3×3 ; la procédure hongroise affichée utilise réductions et zéros, pas une énumération à grande échelle.
-->

---
hideInToc: true
---

# Coût d’appariement et perte d’entraînement

<div class="lesson-columns">
<div>

L’affectation choisie détermine quelles prédictions sont comparées à quelles cibles.

$$L=\sum_i\ell(\hat o_{\sigma^*(i)},o_i)+L_{\text{aucun objet}}.$$

</div>
<div>

On rétropropage à travers les pertes des paires retenues ; l’affectation discrète n’est généralement pas différentiée.

<AlertBlock>

Un détecteur d’ensembles peut éviter NMS grâce à sa supervision un-à-un, mais il doit apprendre à ne pas produire de doublons.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Évaluer un détecteur avec AP et mAP

<div class="lesson-columns">
<div>

Faire varier le seuil de score donne une courbe précision–rappel :

$$P=\frac{TP}{TP+FP},\qquad R=\frac{TP}{TP+FN}.$$

</div>
<div>

L’**AP** résume cette courbe selon le protocole choisi ; la **mAP** moyenne les AP des classes ou seuils requis.

<AlertBlock>

Le critère de correspondance peut être une IoU 2D/3D ou une distance entre centres. Des mAP issues de protocoles différents ne sont pas directement comparables.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Pose rigide d’un objet

<div class="lesson-columns">
<div>

La pose rigide transforme un point du modèle d’objet vers la caméra :

$$X_c=R_{c\leftarrow o}X_o+t_{c\leftarrow o},\quad R_{c\leftarrow o}\in SO(3).$$

</div>
<div>

$t_{c\leftarrow o}\in\mathbb R^3$. La transformation rigide $T_{c\leftarrow o}\in SE(3)$ réunit cette rotation et cette translation. Les **six degrés de liberté** sont trois translations et trois rotations.

- Objet connu : géométrie de référence disponible.
- Catégorie : forme et taille peuvent varier entre instances.

<ExampleBlock>

La pose d’une poignée permet de définir l’orientation de la pince pour la saisir.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Points-clés et PnP

<div class="lesson-columns">
<div>

Un réseau prédit des points-clés 2D correspondant à des points 3D connus de l’objet.

La pose minimise l’erreur de reprojection :

$$\min_{R,t}\sum_k\|u_k-\pi(K(RX_k+t))\|^2.$$

</div>
<div>

Ici, $R=R_{c\leftarrow o}$ et $t=t_{c\leftarrow o}$. PnP exploite ces correspondances et la caméra calibrée. Des associations robustes aident lorsque certains points sont occultés.

<AlertBlock>

Des points presque colinéaires, mal distribués ou confondus par une symétrie rendent la pose difficile à déterminer.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Comparer un rendu à l’observation

<div class="lesson-columns">
<div>

Partir d’une pose estimée, rendre le modèle, puis prédire une correction de pose à partir de l’écart avec l’image réelle.

$$T_{k+1}=\Delta T_k\,T_k.$$

</div>
<div>

Les écarts peuvent porter sur silhouette, profondeur ou caractéristiques visuelles.

<InfoBlock>

Le raffinement améliore une initialisation exploitable. Une mauvaise correspondance d’objet ou une forte occlusion peut attirer le système vers une pose incorrecte.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Quaternions et représentation continue 6D

<div class="lesson-columns">
<div>

Un quaternion unitaire $q\in\mathbb R^4$ représente une rotation, mais $q$ et $-q$ décrivent la même orientation.

Une représentation **6D** prédit deux vecteurs $a,b\in\mathbb R^3$ :

$$r_1=\frac a{\|a\|},\quad r_2=\frac{b-(r_1^\top b)r_1}{\|b-(r_1^\top b)r_1\|},\quad r_3=r_1\times r_2.$$

</div>
<div>

La matrice $R=[r_1,r_2,r_3]$ est une rotation. Des vecteurs nuls ou presque colinéaires exigent une stabilisation numérique.

</div>
</div>

---
hideInToc: true
---

# Symétries et équivalence des poses

<div class="lesson-columns">
<div>

Une bouteille cylindrique peut présenter la même apparence après rotation autour de son axe.

Pour le groupe de symétries admissibles $\mathcal S$ :

$$L_{\mathrm{sym}}=\min_{S\in\mathcal S}d(\hat T,TS).$$

</div>
<div>

<ExampleBlock>

Une perte qui impose une orientation arbitraire pénalise des prédictions physiquement équivalentes.

</ExampleBlock>

Les symétries de l’apparence et celles pertinentes pour la manipulation peuvent différer : une étiquette ou une poignée peut rompre une symétrie.

</div>
</div>

---
hideInToc: true
---

# ADD et ADD-S : erreur dans l’espace de l’objet

<div class="lesson-columns">
<div>

Pour les points du modèle $\mathcal M$ :

$$\operatorname{ADD}=\frac1{|\mathcal M|}\sum_{X\in\mathcal M}\|\hat RX+\hat t-(RX+t)\|_2.$$

</div>
<div>

ADD-S remplace le point cible correspondant par son plus proche voisin transformé. Cette variante tolère certaines ambiguïtés symétriques.

<AlertBlock>

ADD-S peut aussi masquer des erreurs par ses associations libres. Indiquer le diamètre, le seuil et les conventions du protocole d’évaluation.

</AlertBlock>

</div>
</div>

---
hideInToc: true
class: demo-slide
---

# Effet des symétries sur ADD et ADD-S

<DemoFrame>
<AddMetricAnimation />
</DemoFrame>

<p class="demo-caption">Comparer les distances entre points correspondants et entre plus proches voisins.</p>

---
hideInToc: true
---

# Pose au niveau de la catégorie

<div class="lesson-columns">
<div>

Deux tasses partagent une catégorie sans partager exactement le même maillage.

Une approche apprend des coordonnées d’objet normalisées ou un espace canonique de catégorie, puis aligne ces correspondances avec les mesures 3D.

</div>
<div>

<ExampleBlock>

La taille et la forme de l’anse varient : l’alignement doit représenter plus qu’une pose d’un modèle rigide unique.

</ExampleBlock>

Évaluer séparément identité de catégorie, échelle, géométrie et pose évite de confondre leurs erreurs.

</div>
</div>

---
hideInToc: true
---

# Annoter une séquence complète hors ligne

<div class="lesson-columns">
<div>

Un système d’auto-étiquetage peut utiliser plusieurs passages, plusieurs capteurs et les observations futures.

</div>
<div>

1. Agréger les observations dans des repères cohérents.
2. Détecter et suivre les objets avec un modèle coûteux.
3. Corriger les boîtes et filtrer les incohérences temporelles.
4. Entraîner un modèle embarqué sur les étiquettes produites.

<AlertBlock>

Le test embarqué doit utiliser seulement les capteurs et instants réellement disponibles à l’inférence.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Pseudo-étiquettes : apprendre d’un enseignant

<div class="lesson-columns">
<div>

Un enseignant prédit une cible sur des observations non annotées. L’élève apprend à reproduire les cibles retenues.

$$\hat y=\arg\max_c p_T(c\mid x),\qquad \text{retenir si }\max_c p_T(c\mid x)>\delta_{\mathrm{pseudo}}.$$

</div>
<div>

Le seuil $\delta_{\mathrm{pseudo}}\in[0,1]$ sélectionne les cibles. Un seuil élevé produit moins de cibles, souvent plus faciles. Les objets rares ou occultés peuvent être éliminés systématiquement.

<InfoBlock>

Une pseudo-étiquette reste une prédiction : ses erreurs peuvent être amplifiées par la boucle d’apprentissage.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Un enseignant stabilisé par EMA

<div class="lesson-columns">
<div>

Mettre à jour l’enseignant à partir de l’élève :

$$\theta_T\leftarrow\mu\theta_T+(1-\mu)\theta_S.$$

</div>
<div>

L’enseignant est une moyenne mobile des paramètres, sans gradient reçu depuis la perte de l’élève.

<ExampleBlock>

Une faible perturbation d’image pour l’enseignant, une perturbation plus forte pour l’élève : l’élève apprend une prédiction cohérente.

</ExampleBlock>

L’EMA lisse les variations temporelles des paramètres ; des erreurs systématiques peuvent persister dans les cibles.

</div>
</div>

---
hideInToc: true
---

# Distillation de distributions et de caractéristiques

<div class="lesson-columns">
<div>

La distillation peut transférer une distribution de scores ou des caractéristiques intermédiaires.

$$L_{\mathrm{distill}}=\tau^2\,\operatorname{KL}\left(p_T^{(\tau)}\;\|\;p_S^{(\tau)}\right),\qquad p^{(\tau)}=\operatorname{softmax}(z/\tau).$$

</div>
<div>

La température $\tau>0$ règle la concentration des distributions. Les indices $T$ et $S$ désignent l’enseignant et l’élève. La KL mesure ici un écart entre distributions.

<AlertBlock>

Le petit modèle peut hériter des biais de l’enseignant ; les performances doivent être mesurées sur des annotations indépendantes.

</AlertBlock>

</div>
</div>

<!--
KL(p||q)=somme p log(p/q). Les sorties de l’enseignant sont figées pour cette perte. La température règle ici la distribution utilisée comme cible de distillation.
-->



---
hideInToc: true
---

# Choisir la représentation utile à l’action

| Besoin robotique | Sortie adaptée |
|---|---|
| Éviter des véhicules | Boîtes 3D et centres |
| Séparer des surfaces visibles | Masques d’instances |
| Saisir un objet connu | Pose 6-DoF et géométrie |
| Réduire l’annotation | Enseignant hors ligne puis élève |

<InfoBlock>

La définition des objets, des symétries admissibles et des métriques dépend de la tâche robotique.

</InfoBlock>
