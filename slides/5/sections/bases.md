---
layout: section
---

# Bases de l’apprentissage

Classification d’obstacles à partir d’exemples annotés.

---
hideInToc: true
---

# Entrées, cibles et modèle de prédiction

<div class="lesson-columns">
<div>

Un robot observe une petite région de terrain. Sa hauteur, sa rugosité et son apparence ne disent pas directement si elle est un obstacle.

</div>
<div>

- **Entrée** $x$ : mesures ou caractéristiques d’une observation.
- **Cible** $y$ : réponse fournie dans les données d’entraînement.
- **Modèle** $f_\theta(x)$ : règle de prédiction, réglée par des paramètres $\theta$.

<ExampleBlock title="Exemple">

Apprendre à classer une région en « terrain » ou « obstacle », puis appliquer la règle à une région jamais observée.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Minimisation du risque empirique

<div class="lesson-columns">
<div>

Pour $N$ exemples annotés $\mathcal D=\{(x_i,y_i)\}_{i=1}^{N}$ :

$$\theta^*=\arg\min_\theta L(\theta),\qquad L(\theta)=\underbrace{\frac1N\sum_{i=1}^{N}\ell(f_\theta(x_i),y_i)}_{\text{risque empirique}}.$$

</div>
<div>

La **perte** $\ell$ mesure l’erreur sur un exemple ; $L$ désigne l’objectif agrégé. Une prédiction porte un chapeau : $\hat y=f_\theta(x)$. L’optimisation modifie les paramètres ; elle ne modifie pas les étiquettes.

<AlertBlock title="Généralisation">

L’objectif est de réduire l’erreur sur des scènes indépendantes des données d’entraînement.

</AlertBlock>

</div>
</div>

<!--
Distinguer explicitement la procédure d’entraînement et l’inférence. La distribution du déploiement peut différer de celle de la collecte.
-->



---
hideInToc: true
---

# Ensembles d’entraînement, de validation et de test

| Ensemble | Utilisation |
|---|---|
| Entraînement | Calculer les gradients et ajuster les paramètres |
| Validation | Choisir architecture, réglages et moment d’arrêt |
| Test | Mesurer une fois la performance du système retenu |

**En robotique, séparer par trajet, lieu ou session.** Des images voisines d’une même vidéo se ressemblent trop pour former un test indépendant.

<ExampleBlock>

Un trajet nocturne réservé au test révèle davantage qu’un échantillonnage aléatoire de ses images parmi celles d’entraînement.

</ExampleBlock>

---
hideInToc: true
---

# Le neurone : une somme suivie d’une activation

<div class="lesson-columns">
<div>

Avec $x\in\mathbb R^d$, un neurone calcule :

$$z=w^\top x+b,\qquad h=\phi(z).$$

</div>
<div>

- $w$ pondère les entrées ; $b$ décale le seuil.
- La préactivation $z$ est un score.
- L’activation $\phi$ introduit une non-linéarité.

<ExampleBlock>

Avec hauteur et rugosité, un score linéaire sépare le plan des observations par une droite. Il ne peut pas représenter toutes les formes de frontière.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Perceptron multicouche

<div class="lesson-columns">
<div>

Un **MLP**, ou perceptron multicouche, compose des transformations :

$$h^{(1)}=\phi(W_1x+b_1),\quad h^{(2)}=\phi(W_2h^{(1)}+b_2),\quad z=W_3h^{(2)}+b_3.$$

</div>
<div>

Chaque couche calcule des caractéristiques transmises à la couche suivante. Les matrices sont optimisées conjointement.

<InfoBlock title="Sans activation">

Sans non-linéarité, la composition des couches reste une transformation affine.

</InfoBlock>

</div>
</div>

<!--
Prendre deux critères : obstacle si une surface est très haute OU si elle est basse mais très accidentée. Une combinaison de seuils permet une région de décision plus riche.
-->



---
hideInToc: true
---

# Choisir une activation

| Activation | Formule | Effet |
|---|---|---|
| ReLU | $\max(0,z)$ | Garde les valeurs positives |
| Sigmoïde | $1/(1+e^{-z})$ | Sortie entre 0 et 1 |
| Tanh | $(e^z-e^{-z})/(e^z+e^{-z})$ | Sortie entre −1 et 1 |

ReLU est un choix simple pour les couches cachées. Une sigmoïde peut représenter la sortie d’une classification binaire.

**Saturation** : pour de très grandes valeurs absolues, sigmoïde et tanh varient peu ; leurs gradients deviennent petits.

---
hideInToc: true
---

# Régression : prédire une grandeur

<div class="lesson-columns">
<div>

Pour une distance réelle $y$ et une prédiction $\hat y$ :

$$\ell_{\mathrm{L2}}=(\hat y-y)^2,\qquad \ell_{\mathrm{L1}}=|\hat y-y|.$$

</div>
<div>

- L2 pénalise fortement les grandes erreurs.
- L1 croît proportionnellement à leur amplitude.
- Les unités et l’échelle des cibles affectent la taille de la perte.

<ExampleBlock>

Erreurs de 0,1 m et 1 m : leur rapport de contribution vaut 100 en L2, mais 10 en L1.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Classification : transformer les scores en probabilités

<div class="lesson-columns">
<div>

Pour $C$ classes, le réseau produit les **logits** $z_1,\ldots,z_C$.

$$p_c=\operatorname{softmax}(z)_c=\frac{e^{z_c}}{\sum_{k=1}^{C}e^{z_k}}.$$

</div>
<div>

Les sorties sont positives et leur somme vaut 1. La classe choisie est $\arg\max_c p_c$.

<ExampleBlock>

Avec les logits $(2,1,0)$ pour route, trottoir et véhicule, softmax donne environ $(0{,}665,0{,}245,0{,}090)$.

</ExampleBlock>

</div>
</div>

<!--
Pour la stabilité numérique, soustraire max(z) avant l’exponentielle. Cela ne modifie pas les probabilités.
-->



---
hideInToc: true
---

# Entropie croisée : favoriser la bonne classe

<div class="lesson-columns">
<div>

Si la classe correcte est $y$, l’entropie croisée vaut :

$$\ell_{\mathrm{CE}}=-\log p_y=-\sum_{c=1}^{C}\mathbf1[y=c]\log p_c.$$

</div>
<div>

- $p_y=0{,}9$ : perte proche de $0{,}105$.
- $p_y=0{,}1$ : perte proche de $2{,}303$.

<InfoBlock>

La fonction pénalise une faible probabilité attribuée à la cible. L’argmax seul ne fournirait pas de gradient utile pour apprendre.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Descente de gradient

<div class="lesson-columns">
<div>

Pour une perte $L(\theta)$, le gradient regroupe les dérivées par rapport aux paramètres.

$$\theta\leftarrow\theta-\eta\nabla_\theta L(\theta).$$

</div>
<div>

Le **taux d’apprentissage** $\eta>0$ détermine la longueur du pas. Localement, la direction opposée au gradient diminue la perte.

<AlertBlock>

Un taux trop élevé peut augmenter la perte ou provoquer une divergence ; un taux trop faible ralentit la convergence.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Exemple numérique de descente de gradient

<div class="lesson-columns">
<div>

Prenons $\hat y=wx$, $x=2$, $y=3$, $w=1$ et $L=\frac12(\hat y-y)^2$.

$$\hat y=2,\quad L=0{,}5,\quad \frac{\partial L}{\partial w}=(wx-y)x=-2.$$

</div>
<div>

Avec $\eta=0{,}1$, $w$ devient $1{,}2$. La prédiction vaut alors $2{,}4$ et la perte $0{,}18$.

<ExampleBlock>

Le gradient relie une erreur de sortie à la correction d’un paramètre interne.

</ExampleBlock>

</div>
</div>

<!--
Faire prédire le signe du gradient avant de montrer le calcul. Avec un pas de 1, vérifier que la perte augmente.
-->



---
hideInToc: true
---

# Rétropropager : appliquer la règle de chaîne

<div class="lesson-columns">
<div>

Pour $h=\phi(wx+b)$, $\hat y=vh$ et $L=\ell(\hat y,y)$ :

$$\frac{\partial L}{\partial w}=\frac{\partial L}{\partial\hat y}\;v\;\phi'(wx+b)\;x.$$

</div>
<div>

1. Le passage **avant** calcule les activations et la perte.
2. Le passage **arrière** réutilise ces valeurs pour calculer les dérivées.
3. L’optimiseur applique une mise à jour.

La rétropropagation calcule le gradient ; elle n’est pas, à elle seule, l’algorithme de mise à jour.

</div>
</div>

---
hideInToc: true
---

# SGD : apprendre avec des mini-lots

<div class="lesson-columns">
<div>

Utiliser toutes les images à chaque mise à jour peut être trop coûteux.

$$g_t=\frac1{|B_t|}\sum_{i\in B_t}\nabla_\theta\ell(f_\theta(x_i),y_i),\qquad \theta_{t+1}=\theta_t-\eta g_t.$$

</div>
<div>

$B_t$ est un **mini-lot**. Une **époque** correspond à un passage sur les données d’entraînement.

<AlertBlock>

Mélanger les exemples du mini-lot n’annule pas une fuite entre trajets d’entraînement et de test.

</AlertBlock>

</div>
</div>

---
hideInToc: true
---

# Momentum : accumuler une direction

<div class="lesson-columns">
<div>

Le gradient peut osciller d’un mini-lot à l’autre.

$$m_t=\beta m_{t-1}+(1-\beta)g_t,\qquad \theta_{t+1}=\theta_t-\eta m_t.$$

</div>
<div>

La moyenne mobile $m_t$ atténue les oscillations et conserve les directions persistantes. $\beta$ règle la mémoire.

<InfoBlock>

Une convention sans facteur $(1-\beta)$ est aussi utilisée ; elle change l’échelle effective du pas.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Adam : adapter les pas par paramètre

<div class="lesson-columns">
<div>

Adam suit la moyenne et le carré des gradients :

$$m_t=\beta_1m_{t-1}+(1-\beta_1)g_t,\quad v_t=\beta_2v_{t-1}+(1-\beta_2)g_t^2.$$

$$\hat m_t=\frac{m_t}{1-\beta_1^t},\quad\hat v_t=\frac{v_t}{1-\beta_2^t},\quad\theta_{t+1}=\theta_t-\eta\frac{\hat m_t}{\sqrt{\hat v_t}+\epsilon}.$$

</div>
<div>

Les opérations sont faites composante par composante. La correction initiale compense des moyennes démarrées à zéro.

**Adam reste sensible au taux d’apprentissage et aux données.**

</div>
</div>

<!--
Présenter la division comme une normalisation par l’amplitude récente des gradients.
-->



---
hideInToc: true
---

# Une boucle d’entraînement minimale

```python
for x, y in train_loader:
    optimizer.zero_grad()
    logits = model(x)
    loss = cross_entropy(logits, y)
    loss.backward()
    optimizer.step()
```

- Remettre les gradients à zéro évite leur accumulation involontaire.
- `backward()` calcule les dérivées.
- `step()` modifie les paramètres.

<InfoBlock>

La validation utilise des paramètres fixes et ne participe pas au calcul des gradients.

</InfoBlock>

---
hideInToc: true
---

# Choix du taux d’apprentissage

<div class="lesson-columns">
<div>

Le taux peut suivre un calendrier : augmentation initiale progressive, puis décroissance.

Surveiller ensemble :

</div>
<div>

- la perte d’entraînement ;
- la perte et la métrique de validation ;
- les exemples qualitatifs et les gradients anormaux.

<ExampleBlock>

Une perte décroissante avec un rappel faible sur la classe « obstacle » peut indiquer un déséquilibre des classes.

</ExampleBlock>

</div>
</div>

---
hideInToc: true
---

# Surapprentissage et généralisation

Un réseau très flexible peut mémoriser les scènes d’entraînement et leurs particularités.

| Observation | Interprétation possible |
|---|---|
| Erreurs élevées partout | Capacité, optimisation ou signal insuffisant |
| Erreur d’entraînement faible, validation élevée | Surapprentissage ou décalage de données |
| Validation bonne, nouveau site mauvais | Généralisation géographique insuffisante |

<AlertBlock>

Un bon score moyen peut masquer l’échec sur un type de terrain rare.

</AlertBlock>

---
hideInToc: true
---

# Régulariser les paramètres

<div class="lesson-columns">
<div>

Ajouter une pénalité peut limiter des solutions trop complexes :

$$L_{\mathrm{total}}=L_{\mathrm{données}}+\frac\lambda2\|\theta\|_2^2.$$

</div>
<div>

Avec SGD, cette pénalité correspond à une contraction des poids. **AdamW** applique une décroissance découplée de sa normalisation des gradients.

<InfoBlock>

Le coefficient $\lambda$ règle l’intensité de la régularisation. Une valeur excessive peut provoquer un sous-apprentissage.

</InfoBlock>

</div>
</div>

---
hideInToc: true
---

# Dropout et arrêt précoce

<div class="lesson-columns">
<div>

**Dropout** : à l’entraînement, masquer aléatoirement certaines activations ; adapter leur échelle pour conserver leur espérance.

**Arrêt précoce** : conserver les paramètres ayant le meilleur résultat de validation, avant que l’écart de généralisation se creuse.

</div>
<div>

<AlertBlock>

Les comportements entraînement et évaluation diffèrent : il faut commuter explicitement le modèle en mode évaluation.

</AlertBlock>

Leur efficacité dépend également de la diversité et de la représentativité des données.

</div>
</div>

---
hideInToc: true
---

# Augmentation des données et transformation des cibles

Transformer $x$ en $a(x)$ impose de transformer aussi les cibles géométriques.

| Augmentation | Conséquence sur la cible |
|---|---|
| Variation de luminosité | Classe souvent inchangée |
| Recadrage d’image | Boîtes et masques à recadrer |
| Rotation d’un nuage | Centres, orientations et vecteurs à tourner |
| Miroir horizontal | Orientation et conventions gauche/droite à vérifier |

**L’augmentation doit rester plausible pour le robot et la tâche.**

---
hideInToc: true
---

# Un protocole reproductible

<div class="lesson-columns">
<div>

Fixer et documenter : séparation des trajets, prétraitements, architecture, budget de calcul et choix de validation.

</div>
<div>

1. Comparer à une règle ou à un petit modèle de référence.
2. Examiner les erreurs par classe et par condition de collecte.
3. Tester le modèle retenu sans retoucher ses réglages.

<ExampleBlock title="Question">

Une caméra sale apparaît uniquement dans le test. Quel type de généralisation mesure-t-on ?

</ExampleBlock>

</div>
</div>

<!--
Réponse attendue : un décalage de domaine lié au capteur ; ne pas déplacer ces images dans l’entraînement après avoir observé le score final.
-->



---
hideInToc: true
---

# Données, modèle, perte et optimisation

- Les **données** définissent les exemples disponibles et leurs biais.
- Le **modèle** représente les fonctions possibles.
- La **perte** définit le critère à minimiser.
- L’**optimiseur** cherche des paramètres adaptés à cette perte.
- L’**évaluation** mesure le comportement hors entraînement.

<InfoBlock>

Pour une nouvelle tâche robotique, expliciter ces cinq choix avant de choisir une architecture.

</InfoBlock>
