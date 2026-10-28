---
storyboard: S79
section: Considérations importantes à retenir
class: ssl-slide
---


# Pourquoi adapter les modèles en robotique ?

Un modèle entraîné dans un contexte peut perdre en performance lorsque ce contexte change.

<div class="grid grid-cols-3 gap-6 mt-8">

<div class="bg-blue-50 text-slate-800 p-5 rounded-xl">

### 🌍 Environnements variés
Intérieur, extérieur, sous-marin, aérien

**Ce qui change :** éclairage, visibilité, obstacles, perturbations

</div>

<div class="bg-teal-50 text-slate-800 p-5 rounded-xl">

### 🎯 Tâches variées
Navigation, manipulation, inspection, exploration

**Ce qui change :** objectifs, précision, contraintes de sécurité

</div>

<div class="bg-orange-50 text-slate-800 p-5 rounded-xl">

### 🤖 Robots variés
Robots à roues, quadrupèdes, bras, drones

**Ce qui change :** capteurs, actionneurs, morphologie, dynamique

</div>

</div>

<div class="mt-8 p-5 rounded-xl bg-slate-800 text-white text-center">

**Adapter les modèles pour transférer les acquis à de nouvelles conditions**

<span class="text-lg">Maintenir les performances tout en limitant les données et le réentraînement nécessaires.</span>

</div>




---
storyboard: S79
section: Considérations importantes à retenir
class: ssl-slide
clicks: 2
---

# Adaptation

<AdaptationChoices :stage="$clicks" />



---
storyboard: L01
class: ssl-slide adaptation-module
clicks: 3
disabled: true
---

# Tête seule ou LoRA : que modifie-t-on ?

<AdaptationMechanics mode="paths" lang="fr" :stage="$clicks" />

$$

\hat y=h_\beta(\psi),\qquad \psi=f_\theta(x)

$$

<div class="adapt-cards"><div><b>Tête seule</b><span>Modifier β. Pour une entrée fixe, les caractéristiques ψ de l’encodeur restent identiques.</span></div><div><b>LoRA + tête</b><span>Modifier A, B et β. Les corrections internes changent ψ, même si θ₀ reste gelé.</span></div></div><div class="takeaway">Une tête non linéaire décode des motifs plus riches, mais ne récupère pas une information absente de ses caractéristiques d’entrée.</div>

<div class="citation"><a href="https://arxiv.org/abs/2106.09685">Hu et al. · LoRA · ICLR 2022 · §4</a></div>

---
layout: default
---

# LoRA : adapter un modèle avec peu de paramètres

**Low-Rank Adaptation** — apprendre une correction de faible rang en gardant les poids d’origine gelés.

<div class="my-6 text-center">

$$
W_{\text{adapté}} = \underbrace{W_0}_{\text{poids gelés}}
+ \underbrace{\Delta W}_{BA\,:\,\text{correction apprise}}
$$

</div>

<div class="grid grid-cols-3 gap-6">

<div class="bg-blue-50 text-slate-800 p-5 rounded-xl">

### ⚙️ Adaptation légère
Seules deux petites matrices **A et B** sont entraînées.

**Moins de paramètres à optimiser** et de mémoire pour l’entraînement.

</div>

<div class="bg-teal-50 text-slate-800 p-5 rounded-xl">

### 🔒 Modèle préservé
Les poids d’origine **restent inchangés** pendant l’adaptation.

Désactiver la correction permet de **retrouver le modèle initial**.

</div>

<div class="bg-orange-50 text-slate-800 p-5 rounded-xl">

### 🔄 Adaptations modulaires
Un même modèle de base peut accueillir **plusieurs corrections**.

Charger l’adaptation correspondant au **domaine, à la tâche ou au robot**.

</div>

</div>

<div class="mt-6 p-4 rounded-xl bg-slate-800 text-white text-center">

**Un modèle de base partagé + une petite correction propre à chaque contexte**

</div>

---
storyboard: L02
class: ssl-slide adaptation-module
clicks: 2
---

# LoRA: Low-Rank Adaptation

<AdaptationMechanics mode="branch" lang="fr" :stage="$clicks" />

$$

z=W_0u+sB(Au),\qquad W_0\in\mathbb R^{d\times k},\ A\in\mathbb R^{q\times k},\ B\in\mathbb R^{d\times q},\ s=\alpha/q

$$

<div class="adapt-cards"><div><b>A : k → q</b><span>Mesurer q combinaisons apprises des coordonnées d’entrée.</span></div><div><b>B : q → d</b><span>Utiliser ces q coefficients pour former une correction dans l’espace de sortie.</span></div></div><div class="takeaway">Les deux branches reçoivent le même u ; on additionne leurs sorties.</div>

<div class="citation"><a href="https://arxiv.org/abs/2106.09685">Hu et al. · LoRA · ICLR 2022 · §4</a></div>

---
storyboard: L03
class: ssl-slide adaptation-module
clicks: 2
---

# Que contraint le « faible rang » ?



$$

\Delta W=sBA=s\sum_{j=1}^{q}b_j a_j^\top,\qquad \Delta Wu=s\sum_{j=1}^{q}b_j(a_j^\top u)

$$

<AdaptationMechanics mode="rank" lang="fr" :stage="$clicks" /><div class="adapt-cards"><div><b>Lire une direction</b><span>Chaque ligne aⱼᵀ extrait un scalaire de u.</span></div><div><b>Écrire une direction</b><span>Chaque colonne bⱼ fournit une direction de sortie.</span></div></div><div class="takeaway">rang(ΔW) ≤ q : toute correction appartient à span(b₁,…,bq). Ces directions sont elles-mêmes apprises.</div><div class="small-note">La contrainte de rang porte sur ΔW. La matrice effective W₀ + ΔW peut rester de rang plein.</div>

<div class="citation"><a href="https://arxiv.org/abs/2106.09685">Hu et al. · LoRA · ICLR 2022 · §4</a></div>

---
storyboard: L04
class: ssl-slide adaptation-module
clicks: 1
disabled: true
---

# Une correction de rang 1 peut changer tous les poids



$$

A=\begin{bmatrix}1&2&-1\end{bmatrix},\quad B=\begin{bmatrix}2\\-1\end{bmatrix},\quad BA=\begin{bmatrix}2&4&-2\\-1&-2&1\end{bmatrix}

$$



$$

u=\begin{bmatrix}1\\0\\1\end{bmatrix}\Rightarrow Au=0,\qquad v=\begin{bmatrix}1\\1\\0\end{bmatrix}\Rightarrow Av=3

$$

<div v-click="1">

$$

\Delta Wu=\begin{bmatrix}0\\0\end{bmatrix},\qquad\Delta Wv=\begin{bmatrix}6\\-3\end{bmatrix}\quad(s=1)

$$

</div><div class="takeaway">Les six entrées de ΔW sont non nulles, mais ses colonnes sont des multiples de B. Faible rang ne signifie pas parcimonieux.</div><div class="small-note">Exemple construit : ce petit cas 2 × 3 explique l’algèbre ; q(d + k) = 5 contre dk = 6 économise peu de paramètres.</div>

<div class="citation"><a href="https://arxiv.org/abs/2106.09685">Hu et al. · LoRA · ICLR 2022 · §4</a></div>

---
storyboard: L05
class: ssl-slide adaptation-module
clicks: 0
---

# Combien de paramètres entraîne-t-on ?

<div class="adapt-stats"><div><strong>589 824</strong>Matrice entière 768 × 768</div><div><strong>12 288</strong>A + B avec q = 8</div><div><strong>48×</strong>Moins de paramètres entraînables</div></div>

$$

N_{\rm full}=dk,\qquad N_{\rm LoRA}=q(k+d),\qquad \frac{N_{\rm LoRA}}{N_{\rm full}}\approx2.08\%

$$

<div class="adapt-cards"><div><b>q faible</b><span>Moins de stockage et d’états d’optimiseur ; corrections plus contraintes.</span></div><div><b>q élevé</b><span>Plus de capacité et de coût</span></div></div><div class="small-note">W₀ reste en mémoire. Les activations et la propagation des gradients dans l’encodeur ont encore un coût.</div>

<div class="citation"><a href="https://arxiv.org/abs/2106.09685">Hu et al. · LoRA · ICLR 2022 · §4</a></div>

---
storyboard: L06
class: ssl-slide adaptation-module
clicks: 1
disabled: true
---

# Des poids gelés n’arrêtent pas les gradients



$$

g=\frac{\partial\mathcal L}{\partial z},\qquad\frac{\partial\mathcal L}{\partial B}=s\,g(Au)^\top,\qquad\frac{\partial\mathcal L}{\partial A}=sB^\top g\,u^\top

$$

<div class="adapt-cards"><div><b>Partir du modèle préentraîné</b><span>A aléatoire, B = 0 ⇒ ΔW = 0.</span></div><div><b>Premier gradient de données</b><span>B peut changer ; le gradient de A est initialement nul car B = 0.</span></div><div><b>Étapes suivantes</b><span>Dès que B ≠ 0, les deux facteurs peuvent apprendre. W₀ reste fixe.</span></div></div><div v-click="1">

$$

\frac{\partial\mathcal L}{\partial u}=(W_0+sBA)^\top g

$$

<div class="takeaway">Ne pas détacher le chemin de l’encodeur : le gradient doit atteindre les modules LoRA entraînables précédents.</div></div><div class="small-note">Si A et B sont tous deux nuls au départ, leurs gradients de données sont nuls. Formules pour un exemple, sans régularisation.</div>

<div class="citation"><a href="https://arxiv.org/abs/2106.09685">Hu et al. · LoRA · ICLR 2022 · §4</a></div>

---
storyboard: L07
class: ssl-slide adaptation-module
clicks: 0
---

# Où LoRA agit-il dans un Transformer ?

<div class="adapt-flow"><span>Tokens uᵢ</span><span>Projections Q, K, V<br><b>W₀ + sBA sélectionnés</b></span><span>Attention</span><span>Nouvelles caractéristiques ψ</span></div>

$$

Q_i=(W_{Q0}+sB_QA_Q)u_i,\quad V_i=(W_{V0}+sB_VA_V)u_i,\quad K_i=W_{K0}u_i

$$

<div class="adapt-cards"><div><b>Changer Q</b><span>Modifier les tokens auxquels la représentation prête attention.</span></div><div><b>Changer V</b><span>Modifier l’information portée par les tokens consultés.</span></div></div><div class="takeaway">L’article original étudie Q/V. Les matrices K, de sortie et des MLP sont aussi des cibles possibles.</div><div class="small-note">Choisir couches, matrices, rang et échelle sur validation. Chaque matrice adaptée possède ses propres facteurs ; q désigne ici le rang.</div>

<div class="citation"><a href="https://arxiv.org/abs/2106.09685">Hu et al. · LoRA · ICLR 2022 · §4.2 · §7.1</a></div>

---
storyboard: L08
class: ssl-slide adaptation-module
clicks: 0
---

# Au déploiement, intégrer la correction aux poids

<div class="adapt-flow"><span>W₀u + sB(Au)</span><span>W★ = W₀ + sBA</span><span>W★u</span></div><div class="adapt-cards"><div><b>Avant intégration</b><span>Conserver une base et de petits adaptateurs par tâche ; changer d’adaptateur au besoin.</span></div><div><b>Après intégration</b><span>Une multiplication matricielle ordinaire. Plus de branche LoRA pour cette tâche fixe.</span></div></div>

$$

(W_0+sBA)u=W_0u+sB(Au)

$$

<div class="small-note">On intègre une correction à ses propres poids de base. Combiner des modèles distincts ou plusieurs adaptateurs de tâches est un autre problème.</div>

<div class="citation"><a href="https://arxiv.org/abs/2106.09685">Hu et al. · LoRA · ICLR 2022 · §4</a></div>

---
storyboard: L09
class: ssl-slide adaptation-module
clicks: 1
---

# Tête seule, LoRA ou ajustement complet ?

<div class="adapt-cards"><div><b>Tête seule</b><span>Encodeur fixe. Entraînement peu coûteux ; cache possible si le prétraitement est fixe. Limité par la représentation disponible.</span></div><div><b>LoRA + tête</b><span>Adapter les caractéristiques avec peu de paramètres. Rétropropager dans l’encodeur ; choisir rang et emplacements.</span></div><div><b>Ajustement complet</b><span>Mises à jour plus libres. Plus de gradients et d’états d’optimiseur ; coût et risque de surapprentissage accrus.</span></div></div>

<div class="citation"><a href="https://arxiv.org/abs/2106.09685">Hu et al. · LoRA · ICLR 2022 · §4</a></div>

---
storyboard: C01
class: ssl-slide adaptation-module
clicks: 0
---

# Les caractéristiques utiles varient selon la couche

<figure class="adapt-original"><img class="combo-probing" src="../images/combo-probing.svg" alt="Résultats originaux ComBo de sondes linéaires selon la couche" /></figure>

<div class="adapt-figure-labels"><span>Chiffres : CLIP, couche 7</span><span>Distance : MAE, couche 12</span></div><div class="adapt-cards"><div><b>Un modèle gelé</b><span>Sa dernière couche n’est pas nécessairement la meilleure pour la nouvelle tâche.</span></div><div><b>Plusieurs modèles gelés</b><span>Des objectifs de préentraînement différents peuvent fournir des informations complémentaires.</span></div></div><div class="takeaway">ComBo apprend à lire des caractéristiques intermédiaires d’un ou plusieurs encodeurs.</div><div class="small-note">Figure originale du projet : précision de validation selon la couche. Le meilleur modèle et la meilleure couche diffèrent entre ces tâches.</div>

<div class="citation"><a href="https://arxiv.org/abs/2512.01405">Ramtoula et al. · ComBo · NeurIPS 2025 · page projet / project figure</a></div>

---
storyboard: C02
class: ssl-slide adaptation-module
clicks: 0
---

# ComBo : combiner les caractéristiques de plusieurs encodeurs

<figure class="adapt-original"><img class="combo-architecture" src="../images/combo-architecture.svg" alt="Architecture ComBo originale : encodeurs gelés, projection, Transformer et tête" /></figure>

<div><div>Pour une tâche donnée (e.g. segmentation, traversabilité, etc), on entraîne un petit transformer qui combine les caractéristiques de plusieurs modèles à des couches différentes. Il en résulte un mélange de caractéristiques utiles spécifiques à la tâche.</div></div><div class="takeaway">La fusion se fait dans l’espace des caractéristiques. Les encodeurs originaux restent distincts et gelés.</div>

<div class="citation"><a href="https://arxiv.org/abs/2512.01405">Ramtoula et al. · ComBo · NeurIPS 2025 · fig. 3 · §3</a></div>

---
storyboard: C03
class: ssl-slide adaptation-module
clicks: 2
disabled: true
---

# Aligner les positions avant de combiner les canaux

<AdaptationMechanics mode="align" lang="fr" :stage="$clicks" />

$$

S_i=\operatorname{concat}_{k,\ell}\hat F_{k,\ell}[i,:]\in\mathbb R^D,\qquad t_i=P S_i+b\in\mathbb R^{D\prime}

$$

<div class="adapt-cards"><div><b>Même position d’image i</b><span>Interpolation bilinéaire vers une grille commune ; normaliser chaque carte. Retirer les tokens CLS/register.</span></div><div><b>Même projection apprise P</b><span>Partagée entre positions ; sélection et mélange des canaux. T positions restent T tokens.</span></div></div><div class="small-note">Dans l’article : alignement sur la plus petite grille. La projection réduit les canaux ; l’interpolation peut perdre du détail spatial.</div>

<div class="citation"><a href="https://arxiv.org/abs/2512.01405">Ramtoula et al. · ComBo · NeurIPS 2025 · §3 · équation / equation 1</a></div>

---
storyboard: C04
class: ssl-slide adaptation-module
clicks: 0
disabled: true
---

# Qu’entraîne ComBo ?

<div class="adapt-flow"><span>Cartes gelées<br>stop-gradient</span><span>Projection P, b</span><span>Transformer F<br>+ CLS appris</span><span>Tête hβ<br>Perte de tâche</span></div>

$$

O=\mathcal F([t_{\rm cls};t_1;\ldots;t_T]),\qquad\hat y=h_\beta(o_{\rm cls})

$$

<div class="adapt-cards"><div><b>Entraînement</b><span>Optimiser projection, token CLS, Transformer et tête. Aucun gradient dans les encodeurs.</span></div><div><b>Inférence</b><span>Exécuter encore chaque encodeur retenu, puis ComBo.</span></div></div>

<div class="citation"><a href="https://arxiv.org/abs/2512.01405">Ramtoula et al. · ComBo · NeurIPS 2025 · §3–4</a></div>

---
storyboard: C05
class: ssl-slide adaptation-module
clicks: 0
disabled: true
---

# Ne garder que les encodeurs utiles à la tâche



$$

P=[P_1\mid\cdots\mid P_K],\qquad s_k=\|P_k\|_F,\qquad\mathcal L=\mathcal L_{\rm task}+\lambda\sum_{k=1}^{K}s_k

$$

<div class="adapt-flow"><span>Tout entraîner<br>+ pénalité groupée</span><span>Classer les modèles<br>selon sₖ</span><span>Sélectionner</span><span>Réentraîner ComBo<br>sans pénalité</span></div><div class="adapt-cards"><div><b>Grouper par encodeur</b><span>Pₖ contient les colonnes de toutes les couches sélectionnées du modèle k.</span></div><div><b>Interpréter avec prudence</b><span>Le score dépend de la tâche et des autres modèles ; ce n’est pas une qualité intrinsèque.</span></div></div><div class="takeaway">L’article garde deux modèles par tâche. La sélection exige un premier entraînement, mais peut réduire le coût d’inférence.</div><div class="small-note">Norme de Frobenius = norme ℓ₂ de toutes les entrées de Pₖ. Choisir les réglages sur validation, pas sur le test.</div>

<div class="citation"><a href="https://arxiv.org/abs/2512.01405">Ramtoula et al. · ComBo · NeurIPS 2025 · §3 · sélection / selection</a></div>

---
storyboard: C06
class: ssl-slide adaptation-module
clicks: 0
disabled: true
---

# Que montrent les comparaisons publiées ?

<AdaptationMechanics mode="results" lang="fr" /><div class="adapt-cards"><div><b>Même encodeur</b><span>ComBo dépasse la sonde linéaire finale. LoRA et Adapter+ obtiennent ici de meilleurs scores.</span></div><div><b>Plusieurs encodeurs</b><span>ComBo avec deux modèles sélectionnés dépasse les quatre sur l’agrégat publié ; deux encodeurs à l’inférence.</span></div></div><div class="small-note">VTAB-1k : 19 tâches, 1 000 images étiquetées par tâche, 3 graines. « Global Average » : moyenne des trois groupes de tâches. Les panneaux utilisent des encodeurs différents.</div>

<div class="citation"><a href="https://arxiv.org/abs/2512.01405">Ramtoula et al. · ComBo · NeurIPS 2025 · tableaux / tables 1–2</a></div>

---
storyboard: C07
class: ssl-slide adaptation-module
clicks: 0
disabled: true
---

# Adapter les modèles, puis combiner leurs caractéristiques

<div class="adapt-flow"><span>Chaque modèle<br>+ Adapter+</span><span>Geler les<br>modèles adaptés</span><span>Entraîner ComBo<br>sur leurs sorties</span></div><div class="adapt-stats"><div><strong>79,9 %</strong>DINOv2 + Adapter+</div><div><strong>79,3 %</strong>ComBo après adaptation</div><div><strong>78,7 %</strong>Multi-Adapter+ conjoint</div></div><div class="takeaway">Combiner ne garantit pas de dépasser le meilleur modèle seul. ComBo évite la rétropropagation conjointe dans les encodeurs pendant la fusion.</div><div class="small-note">Tableau 3, même agrégat VTAB. L’adaptation préalable a déjà un coût. Le tableau 4 montre aussi que l’information utile peut se concentrer dans la dernière couche après adaptation.</div><div class="small-note">L’article utilise ici Adapter+. Le remplacer par LoRA serait une expérience possible, pas le résultat rapporté.</div>

<div class="citation"><a href="https://arxiv.org/abs/2512.01405">Ramtoula et al. · ComBo · NeurIPS 2025 · §4.3 · tableaux / tables 3–4</a></div>

---
storyboard: C08
class: ssl-slide adaptation-module
clicks: 1
---

# Choisir où l’adaptation doit se faire

<div class="adapt-cards"><div><b>Tête seule</b><span>Lire les caractéristiques finales gelées. Faible coût d’entraînement si elles suffisent déjà.</span></div><div><b>LoRA</b><span>Changer les calculs internes d’un encodeur. Corrections compactes et branches linéaires intégrables.</span></div><div><b>ComBo</b><span>Lire et combiner des caractéristiques intermédiaires de plusieurs modèles.</span></div></div>


---
storyboard: S80
class: ssl-slide
clicks: 3
disabled: true
---

# Efficacité des étiquettes (label efficiency)

<LabelEfficiency :stage="$clicks" />



---
storyboard: S81
class: ssl-slide
clicks: 2
---

# Partitionner correctement les données robotiques

<RobotDataSplit :stage="$clicks" />



---
storyboard: S82
class: ssl-slide
clicks: 3
disabled: true
---

# Évaluer la tâche de perception visée

<TaskEvaluation :stage="$clicks" />



---
storyboard: S83
class: ssl-slide
clicks: 2
disabled: true
---

# Perte prétexte et utilité en aval

<ObjectiveUsefulness :stage="$clicks" />



---
storyboard: S84
class: ssl-slide
clicks: 2
---

# Synthèse du cours

<CourseSynthesis :stage="$clicks" />


