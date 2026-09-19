---
layout: section
---

# Étiquettes denses

Segmentation sémantique d’images, de nuages de points et de grilles BEV.

---
hideInToc: true
---

# Segmentation sémantique : une classe par élément

La segmentation sémantique attribue une classe à chaque élément observé.

| Support | Entrée | Sortie |
|---|---|---|
| Image | $H\times W\times3$ | $H\times W\times C$ scores |
| Nuage | $N\times d$ | $N\times C$ scores |
| BEV | Observations des capteurs | $X\times Y\times C$ scores |

Deux voitures portent la même classe. Les distinguer individuellement nécessite une représentation d’instances.

---
hideInToc: true
---

# Coût d’une couche dense sur une image

<div class="lesson-columns">
<div>

Une image de $640\times480$ contient 921 600 valeurs RGB. Une couche dense de 1 000 neurones demanderait environ **922 millions de poids**.

</div>
<div>

Pour reconnaître une bordure, le même motif local peut servir en plusieurs positions.

<InfoBlock title="Partage des paramètres">

Partager un petit détecteur local réduit le nombre de paramètres et exploite la structure spatiale de l’image.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Convolution : déplacer un filtre partagé

<div class="lesson-columns">
<div>

Pour une entrée $x$ et un noyau $K$, une carte de caractéristiques est calculée par :

$$h_{i,j,o}=\phi\left(b_o+\sum_{a,b,c}K_{a,b,c,o}\,x_{i+a,j+b,c}\right).$$

</div>
<div>

Le même noyau est utilisé en chaque position. Plusieurs canaux de sortie détectent différents motifs.

<ExampleBlock>

Un filtre peut répondre à une transition verticale de couleur ; un autre à une texture répétitive du sol.

</ExampleBlock>

</div>
</div>

<!--
Les bibliothèques de deep learning implémentent généralement une corrélation croisée, appelée convolution par convention.
-->



---
hideInToc: true
---

# Canaux, pas et padding

<div class="lesson-columns">
<div>

- **Canaux** : plusieurs caractéristiques au même endroit.
- **Stride**, ou pas : espacement des positions évaluées.
- **Padding** : valeurs ajoutées aux bords pour contrôler la taille.

Pour une dimension $H$, un noyau $k$, un padding $p$ et un pas $s$ :

$$H_{\mathrm{sortie}}=\left\lfloor\frac{H+2p-k}{s}\right\rfloor+1.$$

</div>
<div>

Un pas plus grand réduit calcul et résolution, mais peut faire disparaître les petits objets.

</div>
</div>

---
hideInToc: true
---

# Champ réceptif et contexte spatial

<div class="lesson-columns">
<div>

Le **champ réceptif** d’une activation est l’ensemble des entrées qui peuvent l’influencer.

Deux convolutions $3\times3$, de pas 1, donnent un champ réceptif théorique $5\times5$.

</div>
<div>

<ExampleBlock>

Un pixel gris peut appartenir à une route, un mur ou une voiture. Le voisinage permet de lever l’ambiguïté.

</ExampleBlock>

Augmenter la profondeur, le pas ou la dilatation étend ce contexte, avec des effets différents sur la résolution.

</div>
</div>

---
hideInToc: true
class: demo-slide
---

# Évolution du champ réceptif

<DemoFrame>
<ReceptiveFieldDemo />
</DemoFrame>

<p class="demo-caption">Modifier le nombre de couches et le pas pour observer l’étendue du champ réceptif et l’espacement des sorties.</p>

<!--
Faire comparer le saut entre cellules de sortie et l’étendue du contexte accumulé.
-->

---
hideInToc: true
---

# Équivariance et invariance par translation

<div class="lesson-columns">
<div>

Pour une translation $T$ :

$$f(Tx)=T f(x)\quad\text{(équivariance)},\qquad f(Tx)=f(x)\quad\text{(invariance)}.$$

</div>
<div>

- La segmentation doit déplacer le masque quand l’objet se déplace.
- En classification globale, la cible est souvent invariante à la translation.

<AlertBlock>

Padding, sous-échantillonnage et bords empêchent une équivariance parfaite à toutes les translations.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Pooling : résumer un voisinage

<div class="lesson-columns">
<div>

Le max-pooling garde la plus grande activation d’une fenêtre ; le pooling moyen en prend la moyenne.

Ils réduisent la résolution et peuvent rendre une représentation moins sensible à de petits déplacements.

</div>
<div>

<ExampleBlock>

Pour détecter la présence d’un motif, sa position précise importe peu. Pour tracer une bordure de trottoir, cette position reste essentielle.

</ExampleBlock>

Une architecture dense doit donc combiner **contexte global** et **détails locaux**.

</div>
</div>

---
hideInToc: true
---

# ResNet : apprendre une correction

<div class="lesson-columns">
<div>

Un bloc résiduel calcule :

$$h_{\ell+1}=h_\ell+F_\ell(h_\ell).$$

</div>
<div>

La branche $F_\ell$ apprend une correction. Le chemin direct facilite la circulation de l’information et des gradients.

Si les dimensions changent, une projection aligne les deux branches avant l’addition.

<InfoBlock>

Les connexions résiduelles facilitent l’optimisation de réseaux profonds en introduisant un chemin direct pour les gradients.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Normalisation par lots

<div class="lesson-columns">
<div>

À l’entraînement, BatchNorm normalise chaque canal à l’aide des statistiques du mini-lot et, en convolution, des positions spatiales :

$$\hat h=\frac{h-\mu_B}{\sqrt{\sigma_B^2+\epsilon}},\qquad y=\gamma\hat h+\beta.$$

</div>
<div>

$\gamma$ et $\beta$ sont appris. À l’inférence, on utilise des statistiques accumulées.

<AlertBlock>

De très petits lots ou un changement de domaine peuvent rendre ces statistiques peu adaptées.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Encodeur-décodeur : contexte puis résolution

<div class="lesson-columns">
<div>

**Encodeur** : transforme l’image en caractéristiques plus abstraites, souvent moins résolues.

**Décodeur** : remonte vers une grille dense par suréchantillonnage et convolution.

</div>
<div>

<ExampleBlock>

Les caractéristiques à basse résolution décrivent le contexte routier ; les caractéristiques fines localisent les frontières.

</ExampleBlock>

L’interpolation seule ne recrée pas les détails perdus : le réseau doit disposer d’informations locales.

</div>
</div>

---
hideInToc: true
---

# U-Net : conserver les détails

<div class="lesson-columns">
<div>

Les **connexions de saut** transfèrent les caractéristiques fines de l’encodeur au décodeur de même résolution.

$$h_{\mathrm{decode}}=F\big([\operatorname{up}(h_{\mathrm{grossier}}),h_{\mathrm{fin}}]\big).$$

</div>
<div>

$[\cdot,\cdot]$ désigne une concaténation de canaux.

<InfoBlock>

Dans ce schéma, ResNet utilise une addition résiduelle et U-Net une concaténation entre caractéristiques de même résolution.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# La perte d’une prédiction dense

<div class="lesson-columns">
<div>

Appliquer une entropie croisée à chaque élément annoté :

$$L=-\frac1{|\Omega|}\sum_{u\in\Omega}w_{y_u}\log p_u(y_u).$$

</div>
<div>

$\Omega$ exclut les pixels ou points non annotés. Le poids $w_c$ peut compenser une classe rare.

<AlertBlock>

Étiqueter les éléments inconnus comme du fond apprend une erreur systématique. Une pondération excessive des rares annotations bruitées peut aussi dégrader le modèle.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# IoU : mesurer un recouvrement

<div class="lesson-columns">
<div>

Pour une classe, comparer les ensembles prédits $P$ et annotés $G$ :

$$\operatorname{IoU}=\frac{|P\cap G|}{|P\cup G|}=\frac{TP}{TP+FP+FN}.$$

</div>
<div>

La **mIoU** moyenne les IoU des classes évaluées.

<ExampleBlock>

80 points corrects, 10 faux positifs et 30 points manqués donnent $80/120\simeq0{,}667$.

</ExampleBlock>

Documenter la gestion des classes absentes et des éléments ignorés dans le protocole.

</div>
</div>

---
hideInToc: true
---

# Permutation des points d’un nuage

<div class="lesson-columns">
<div>

La même scène peut être stockée dans n’importe quel ordre de points.

Pour une permutation $\pi$ :

</div>
<div>

- un descripteur global doit être **invariant** : $f(\pi X)=f(X)$ ;
- des classes par point doivent être **équivariantes** : $g(\pi X)=\pi g(X)$.

<AlertBlock>

Un MLP appliqué à la concaténation brute de tous les points dépend de leur ordre et de leur nombre.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# PointNet : traiter puis agréger

<div class="lesson-columns">
<div>

Chaque point $x_i$ passe dans le même MLP $\phi$ :

$$h_i=\phi(x_i),\qquad g_k=\max_i h_{i,k}.$$

</div>
<div>

L’agrégation par maximum est indépendante de l’ordre. Pour segmenter, combiner information locale et contexte global :

$$\hat y_i=\psi([h_i,g]).$$

<ExampleBlock>

Le contexte global signale une scène de rue ; les caractéristiques locales indiquent quels points appartiennent à un véhicule.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
class: figure-slide
---

# Architecture de PointNet

Le même MLP traite chaque point. Une agrégation symétrique forme le contexte global ; la segmentation le combine aux caractéristiques locales.

<div class="figure-panel">
<img class="figure" src="./images/pointnet-architecture.png" alt="Qi et al." />
<p class="citation"><a href="https://arxiv.org/abs/1612.00593" target="_blank" rel="noopener">Qi et al. — PointNet, CVPR 2017. Figure 2.</a></p>
</div>

---
hideInToc: true
---

# PointNet++ : construire des voisinages

<div class="lesson-columns">
<div>

Une agrégation globale seule décrit mal les structures locales fines.

</div>
<div>

1. Échantillonner des points de référence.
2. Grouper leurs voisins selon la distance.
3. Appliquer un réseau partagé et agréger localement.
4. Répéter pour obtenir une hiérarchie de tailles de voisinages.

La densité LiDAR varie avec la distance. Les rayons de voisinage et le nombre de voisins influencent les structures représentées.

</div>
</div>

---
hideInToc: true
---

# Convolutions 3D creuses

<div class="lesson-columns">
<div>

Voxeliser le nuage donne une grille, mais la majorité de ses cellules sont vides.

Une convolution **creuse** calcule sur les sites actifs et leurs voisinages, sans allouer toute la grille dense.

</div>
<div>

<ExampleBlock>

Dans une rue, les mesures se concentrent sur des surfaces ; une grille dense alloue aussi de la mémoire aux cellules vides.

</ExampleBlock>

Le voxel fin conserve les détails mais augmente le nombre de sites actifs. Une voxelisation grossière peut fusionner piéton et arrière-plan.

</div>
</div>

---
hideInToc: true
---

# Choisir un support de segmentation

| Représentation | Atout | Limite |
|---|---|---|
| Image | Texture, réseaux efficaces | Géométrie à reconstruire |
| Points | Coordonnées mesurées | Voisinages irréguliers |
| Voxels creux | Structure locale 3D | Quantification spatiale |
| BEV | Carte alignée sur la navigation | Hauteur comprimée ou canalisée |

<InfoBlock>

Le bon support dépend de la sortie utile au robot, de la portée et du budget mémoire.

</InfoBlock>

---
hideInToc: true
---

# Projection caméra–BEV et profondeur

<div class="lesson-columns">
<div>

Une cellule image définit un **rayon**. La profondeur détermine la position du point 3D sur ce rayon.

Pour un pixel homogène $\tilde u$ et une profondeur $d$ :

$$X_c=dK^{-1}\tilde u,\qquad X_r=R_{r\leftarrow c}X_c+t_{r\leftarrow c}.$$

</div>
<div>

$K$ est la matrice intrinsèque. $R_{r\leftarrow c}$ et $t_{r\leftarrow c}$ transforment les coordonnées du repère caméra $c$ vers le repère robot $r$.

Une seule hypothèse de sol plan est insuffisante pour les objets élevés. Il faut répartir ou estimer la profondeur.

</div>
</div>

---
hideInToc: true
---

# Lift-splat : distribuer puis accumuler

<div class="lesson-columns">
<div>

Le réseau prédit une caractéristique $f(u)$ et des poids de profondeur $p(d\mid u)$.

$$F(u,d)=p(d\mid u)\,f(u).$$

</div>
<div>

- **Lift** : placer ces caractéristiques pondérées le long du rayon.
- **Splat** : les accumuler dans les cellules BEV correspondantes.
- Un réseau BEV prédit ensuite les classes ou les objets.

<InfoBlock>

Une supervision BEV peut guider cet apprentissage même sans profondeur dense annotée.

</InfoBlock>

</div>
</div>

---
hideInToc: true
class: demo-slide
---

# Projection des hypothèses de profondeur en BEV

<DemoFrame>
<LiftSplatSampling />
</DemoFrame>

<p class="demo-caption">Déplacer les hypothèses de profondeur : leur projection change de cellule au sol.</p>

---
hideInToc: true
class: figure-slide
---

# Projection et échantillonnage dans Simple-BEV

Les choix de projection déterminent où les caractéristiques d’image rejoignent la grille 3D ou BEV.

Comparer le transport depuis les pixels et l’échantillonnage depuis une grille aide à séparer **géométrie connue** et **caractéristiques apprises**.

<div class="figure-panel">
<img class="figure" src="./images/simplebev-projection.png" alt="Harley et al." />
<p class="citation"><a href="https://simple-bev.github.io/simple_bev_sep30.pdf" target="_blank" rel="noopener">Harley et al. — Simple-BEV, ICRA 2023. Figure 1.</a></p>
</div>

---
hideInToc: true
---

# Transférer un réseau pré-entraîné

<div class="lesson-columns">
<div>

Des filtres appris sur ImageNet peuvent initialiser l’encodeur d’une tâche robotique.

- Remplacer la tête de classification par la sortie utile.
- Geler d’abord l’encodeur si les annotations sont rares.
- Ajuster ensuite certaines couches avec un taux plus faible.

</div>
<div>

<AlertBlock>

Texture de route nocturne, image thermique et nuage LiDAR ne suivent pas la distribution des photographies ImageNet.

</AlertBlock>

Comparer à une initialisation aléatoire avec le même protocole.

</div>
</div>

---
hideInToc: true
---

# Analyse des erreurs de segmentation

<div class="lesson-columns">
<div>

La mIoU agrégée doit être complétée par une analyse des erreurs selon les conditions d’observation.

Examiner les erreurs sur :

</div>
<div>

- les frontières et petits objets ;
- les longues distances et classes rares ;
- les conditions météo et les capteurs dégradés ;
- les régions sans annotation fiable.

<ExampleBlock title="Limite de la segmentation">

La classe « route » décrit une catégorie visuelle ; l’adhérence et l’effort de passage nécessitent des mesures supplémentaires.

</ExampleBlock>

</div>
</div>
