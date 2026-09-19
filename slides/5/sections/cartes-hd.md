---
layout: section
---

# Cartes HD

Prédiction de géométrie vectorielle et de topologie routière.

---
hideInToc: true
---

# Géométrie, topologie et attributs d’une carte HD

<div class="lesson-columns">
<div>

Voies, lignes, passages piétons et bordures portent une géométrie ainsi que des relations.

</div>
<div>

- La **géométrie** indique où passent les éléments.
- La **topologie** indique quelles voies sont connectées.
- Les **attributs** précisent type, direction ou usage.

<ExampleBlock>

Deux voies se croisent dans une projection sans nécessairement être connectées : un pont ne forme pas une intersection.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Construire une carte vectorisée en ligne

<div class="lesson-columns">
<div>

À partir des observations autour du véhicule :

$$\text{capteurs}\rightarrow\text{caractéristiques BEV}\rightarrow\text{éléments vectoriels}\rightarrow\text{relations}.$$

</div>
<div>

Une polyligne fournit des points exploitables sans extraire ensuite une ligne depuis un masque raster.

<InfoBlock>

La prédiction couvre une fenêtre locale. Les identités et raccords entre fenêtres demandent un traitement temporel et une association.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Rappel : prédire un ensemble

<div class="lesson-columns">
<div>

Un décodeur à requêtes propose plusieurs objets. L’appariement hongrois associe chaque annotation à une seule proposition en minimisant un coût global.

Pour une carte, remplacer la boîte par une **polyligne** :

$$o_j=(c_j,P_j),\qquad P_j=(p_{j1},\ldots,p_{jK}).$$

</div>
<div>

<ExampleBlock>

Une requête peut représenter une bordure ; ses sorties géométriques suivent les points le long de cette bordure.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# L’ordre des points n’est pas toujours unique

<div class="lesson-columns">
<div>

Une même ligne non orientée peut être annotée dans les deux sens. Un contour fermé accepte aussi des décalages cycliques.

$$d(\hat P,P)=\min_{\pi\in\Pi(P)}\sum_k\|\hat p_k-p_{\pi(k)}\|_1.$$

</div>
<div>

$\Pi(P)$ contient uniquement les réordonnancements qui décrivent le même élément.

<AlertBlock>

Autoriser toutes les permutations détruirait la structure de la polyligne. Une voie orientée ne doit pas perdre son sens de circulation.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Deux niveaux de requêtes

<div class="lesson-columns">
<div>

Les requêtes hiérarchiques séparent **identité de l’élément** et **position dans cet élément**.

$$q_{j,k}=q_j^{\text{élément}}+q_k^{\text{point}}.$$

</div>
<div>

Le décodeur apprend les relations entre points d’une même ligne et entre éléments distincts.

<ExampleBlock>

Les points d’un passage piéton ne doivent pas être mélangés avec ceux d’une bordure voisine, même lorsqu’ils sont proches dans la grille.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
class: figure-slide
---

# MapTR : une carte comme ensemble structuré

La famille MapTR illustre une sortie vectorielle directement apprise, avec une gestion des ordres équivalents et un appariement entre éléments.

Lire l’architecture en distinguant : encodeur des capteurs, caractéristiques BEV, requêtes et sortie de points.

<div class="figure-panel">
<img class="figure" src="./images/maptr-architecture.png" alt="Liao et al." />
<p class="citation"><a href="https://arxiv.org/abs/2208.14437" target="_blank" rel="noopener">Liao et al. — MapTR, ICLR 2023. Architecture du modèle.</a></p>
</div>

---
hideInToc: true
---

# Attention déformable et échantillonnage parcimonieux

<div class="lesson-columns">
<div>

L’attention globale sur toutes les cellules BEV coûte cher.

Une requête prédit des décalages autour d’un point de référence et des poids :

$$y_q=\sum_{m,k}a_{qmk}\,W_mF(r_q+\Delta r_{qmk}).$$

</div>
<div>

$F$ est échantillonné, souvent par interpolation bilinéaire. Les points consultés s’adaptent au contenu.

<InfoBlock>

La parcimonie réduit le coût, mais les références et décalages doivent atteindre les régions pertinentes.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Fusion temporelle dans le repère courant

<div class="lesson-columns">
<div>

Un déplacement du véhicule change les coordonnées d’une même ligne statique.

</div>
<div>

1. Transporter les caractéristiques historiques vers le repère courant.
2. Les combiner avec les observations disponibles.
3. Prédire les éléments de carte mis à jour.

<AlertBlock>

Accumuler sans compensation d’ego-mouvement épaissit les lignes et crée des doublons. Les erreurs de pose se répercutent dans la carte.

</AlertBlock>

</div>
</div>

---
hideInToc: true
class: demo-slide
---

# Aligner une mémoire BEV

<DemoFrame>
<TemporalBevWarp />
</DemoFrame>

<p class="demo-caption">Comparer accumulation brute et transport des caractéristiques par le mouvement du véhicule.</p>

---
hideInToc: true
---

# La topologie se représente par un graphe

<div class="lesson-columns">
<div>

Un graphe $G=(V,E)$ associe une caractéristique à chaque nœud et une relation à chaque arête.

Pour les voies :

</div>
<div>

- nœuds : segments ou voies ;
- arêtes : successeur, voisin de gauche, raccord ;
- attributs : direction, type, géométrie relative.

<ExampleBlock>

La continuité d’une voie occultée peut être soutenue par ses prédécesseurs et successeurs visibles.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Passage de messages sur un graphe

<div class="lesson-columns">
<div>

À une couche $\ell$ :

$$m_i=\sum_{j\in\mathcal N(i)}\phi(h_i^{\ell},h_j^{\ell},e_{ij}),\qquad h_i^{\ell+1}=\psi(h_i^{\ell},m_i).$$

</div>
<div>

Les fonctions $\phi$ et $\psi$ sont apprises, par exemple avec des MLP. Une somme ou moyenne ne dépend pas de l’ordre des voisins.

<InfoBlock>

Chaque couche propage l’information sur un voisinage supplémentaire. La qualité des arêtes initiales conditionne la pertinence des messages.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Prédire des relations entre voies

<div class="lesson-columns">
<div>

Une tête peut classer la relation entre deux représentations de voie :

$$p(r_{ij}\mid h_i,h_j,\Delta g_{ij}).$$

</div>
<div>

$\Delta g_{ij}$ décrit leur géométrie relative. La perte supervise les relations annotées.

<AlertBlock>

La proximité seule ne garantit pas une connexion. Tester direction, niveau vertical et continuité permet de repérer des relations incompatibles.

</AlertBlock>

La qualité de la topologie doit être mesurée séparément de la précision géométrique.

</div>
</div>

---
hideInToc: true
---

# Conditionner la perception par une carte SD

<div class="lesson-columns">
<div>

Une carte de navigation fournit une **information a priori**, disponible avant les observations courantes et souvent approximative.

$$\hat M=f_\theta(F_{\text{capteurs}},\mathbb E_{\text{SD}}(M_{\text{SD}})).$$

</div>
<div>

L’encodeur SD produit des caractéristiques qui sont fusionnées avec celles des capteurs.

<ExampleBlock>

La carte a priori indique un carrefour ; les images précisent les marquages réels et leur emplacement.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Supervision faible : plusieurs sources imparfaites

| Source | Signal utile | Limite |
|---|---|---|
| Carte SD | Connectivité et voies principales | Géométrie grossière |
| Imagerie aérienne | Marquages vus de dessus | Date, occlusions, alignement |
| Agrégation de flotte | Observations répétées | Biais de couverture et corrélation |

Distinguer une source utilisée comme **entrée** d’une source utilisée pour construire les **cibles** d’entraînement.

---
hideInToc: true
---

# Robustesse aux cartes a priori périmées

<div class="lesson-columns">
<div>

Pendant l’entraînement, perturber ou masquer des éléments de la carte a priori : décalages, suppressions, ajouts et fermetures temporaires.

</div>
<div>

Le réseau doit pouvoir exploiter la carte a priori lorsqu’elle concorde avec les observations, puis s’appuyer sur les capteurs lorsqu’elle devient incohérente.

<AlertBlock>

Évaluer séparément les entrées avec carte a priori correcte, absente, bruitée et périmée pour mesurer la contribution des capteurs.

</AlertBlock>

</div>
</div>

---
hideInToc: true
class: demo-slide
---

# Détection des changements cartographiques

<DemoFrame>
<HdMapChange />
</DemoFrame>

<p class="demo-caption">Observer l’effet d’un élément périmé : conserver, supprimer ou remplacer doit dépendre des observations.</p>

---
hideInToc: true
---

# Distance de Chamfer entre éléments

<div class="lesson-columns">
<div>

Pour deux ensembles de points échantillonnés $P,Q$ :

$$d_{\mathrm{Ch}}^{(r)}(P,Q)=\frac1{|P|}\sum_{p\in P}\min_{q\in Q}\|p-q\|_2^r+\frac1{|Q|}\sum_{q\in Q}\min_{p\in P}\|q-p\|_2^r.$$

</div>
<div>

La convention $r=1$ utilise les distances euclidiennes ; $r=2$ leurs carrés. La formule additionne les deux moyennes directionnelles.

<AlertBlock>

La densité d’échantillonnage, les unités et la convention somme ou moyenne des deux termes changent le résultat.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# AP géométrique et validation d’une mise à jour

<div class="lesson-columns">
<div>

Un élément est associé à une annotation de même type si $d_{\mathrm{Ch}}^{(1)}$ respecte le seuil du protocole, exprimé en mètres pour des coordonnées métriques.

Faire varier le score produit une courbe précision–rappel ; moyenner les AP selon classes et seuils requis.

</div>
<div>

<InfoBlock>

Compléter l’AP géométrique par des mesures de raccordement, d’orientation, de continuité temporelle et de détection des changements.

</InfoBlock>

Une modification observée sur plusieurs passages distincts fournit un signal plus solide qu’un simple manque de visibilité.

</div>
</div>
