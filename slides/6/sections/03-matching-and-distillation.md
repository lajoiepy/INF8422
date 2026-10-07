---
storyboard: S17
section: Appariement, effondrement et auto-distillation
class: ssl-slide
clicks: 2
disabled: true
---

# Construire deux vues

<ViewPairs :stage="$clicks" />



---
storyboard: S18
class: ssl-slide
clicks: 1
---

# Encodeur et tête de projection

<EncoderProjection :stage="$clicks" />

<MathLine :formula="$clicks ? String.raw`\boldsymbol{\psi}_i^{(v)}=f_\theta(\widetilde x_i^{(v)})\qquad\mathbf q_i^{(v)}=g_\phi(\boldsymbol{\psi}_i^{(v)})` : String.raw`\boldsymbol{\psi}_i^{(v)}=f_\theta(\widetilde x_i^{(v)})`" small />

<SSLControls />


<div class="takeaway">L’objectif compare q. Plusieurs tâches différentes en aval (downstream) peuvent réutiliser ψ de l’encodeur.</div>



---
storyboard: S19
class: ssl-slide
clicks: 2
disabled: true
---

# Ancre, positif et négatifs

<ContrastiveLab mode="candidates" :stage="$clicks" />

<div class="takeaway">Le positif est l’autre vue de la même observation originale.</div>



---
storyboard: S20
class: ssl-slide
clicks: 1
---

# Similarité et température

<ContrastiveLab mode="temperature" :stage="$clicks" />



---
storyboard: S21
class: ssl-slide
clicks: 3
---

# Perte contrastive

<ContrastiveLab mode="loss" :stage="$clicks" />



---
storyboard: S22
class: ssl-slide
clicks: 2
---

# Effet de l’objectif sur les représentations

<ContrastiveLab mode="motion" :stage="$clicks" />

<div class="takeaway">Augmenter l’accord avec le positif relativement aux vues concurrentes.</div>



---
storyboard: S23
class: ssl-slide
clicks: 3
disabled: true
---

# Faux négatifs et raccourcis

<MatchingFailures :stage="$clicks" />

<div class="takeaway">Une relation construite est utile si elle conserve les indices nécessaires à la tâche.</div>



---
storyboard: S24
class: ssl-slide
clicks: 2
---

# Représentation constante: Effondrement

<CollapseLab :stage="$clicks" />

<div class="takeaway">Il faut éviter qu'une solution optimale possible de l'apprentissage soit l'effondrement (collapse) de la représentation.</div>



---
storyboard: S25
class: ssl-slide
clicks: 2
---

# Perte de dimensions de représentation

<FeatureDimensions :stage="$clicks" />



---
storyboard: S26
class: ssl-slide
clicks: 3
---

# Régularisation: Variance-Invariance-Covariance (VICReg)

<VICRegLab :stage="$clicks" />



---
storyboard: S27
class: ssl-slide
clicks: 2
---

# Auto-Distillation: Apprendre des cibles fournies par un enseignant

<TeacherTraining mode="overview" :stage="$clicks" />

<InfoBlock title="Une cible qui évolue pendant l’apprentissage">

L’étudiant prédit une sortie enseignante à partir d’une autre vue de l’observation.

</InfoBlock>



---
storyboard: S28
class: ssl-slide
clicks: 2
---

# Architecture de DINO

<DINOArchitecture :stage="$clicks" />

<div class="takeaway">Apparier les distributions; mettre à jour étudiant et enseignant selon des règles distinctes.</div>



---
storyboard: S29
class: ssl-slide
clicks: 2
---

# Appariement de distributions dans DINO

<DINOProbability :stage="$clicks" />



---
storyboard: S30
class: ssl-slide
clicks: 2
---

# Mises à jour par gradient et moyennes mobiles

<TeacherTraining mode="updates" :stage="$clicks" />



---
storyboard: S31
class: ssl-slide
---

# Résumé de l'apprentissage de représentation

<MatchingSummary />

<InfoBlock title="L'objectif d'une bonne représentation">

Conserver l’information utile à la tâche visée.

Ignorer le reste.

</InfoBlock>



