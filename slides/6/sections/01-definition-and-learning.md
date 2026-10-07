---
storyboard: S02
section: Définition et mécanismes d’apprentissage
clicks: 3
---

# Signaux de supervision disponibles pour un robot

<SupervisionSignals :stage="$clicks" />

<InfoBlock title="Une règle doit définir la cible">

Les données enregistrées peuvent fournir un signal d’apprentissage si l’on définit une relation valide entre les observations.

</InfoBlock>



---
storyboard: S03
clicks: 1
---

# Définition de l’apprentissage auto-supervisé

<div class="definition">L’apprentissage auto-supervisé entraîne un modèle à partir de signaux de supervision dérivés automatiquement des données elles-mêmes, sans nécessiter d’étiquettes annotées manuellement pour cette étape d’apprentissage.</div>

<TargetOrigin mode="definition" :stage="$clicks" />

<div class="takeaway">L’origine de la cible d’apprentissage détermine le régime de supervision.</div>



---
storyboard: S04
clicks: 2
---

# Apprentissages supervisé, auto-supervisé et semi-supervisé

<TargetOrigin mode="settings" :stage="$clicks" />

<InfoBlock title="La fonction de perte (coût) ne suffit pas à identifier le régime">

L’erreur quadratique et l’entropie croisée peuvent autant comparer des prédictions à des cibles manuelles ou automatiques.

</InfoBlock>



---
storyboard: S05
clicks: 2
---

# Tâches prétextes et cibles automatiques

<TargetOrigin mode="examples" :stage="$clicks" />

<div class="small-note intro-note">Une tâche prétexte construit une représentation par prédiction ou appariement. </div>



---
storyboard: S06
clicks: 1
---

# Préentraînement et ajustement fin facultatif

<LearningRoutes mode="pretraining" :stage="$clicks" />

<ExampleBlock title="Deux choix d’adaptation">

Geler l’encodeur et entraîner une tête de tâche, ou ajuster l’encodeur avec la tête.

</ExampleBlock>



---
storyboard: S07
clicks: 2
---

# Apprentissage direct à partir de résultats mesurés

<LearningRoutes mode="direct" :stage="$clicks" />




---
storyboard: S08
clicks: 3
---

# Masquage: Entrée, prédiction et cible

<TrainingStep :stage="$clicks" />

<div class="small-note intro-note">i identifie une observation · Θ regroupe les paramètres de l’encodeur et du décodeur · M sélectionne les positions masquées</div>



---
storyboard: S09
clicks: 3
class: training-update-slide
---

#  Masquage: Perte et mise à jour des paramètres

<TrainingStep :stage="4+$clicks" numerical />



---
storyboard: S10
---

#  Masquage: Ce qui reste après l’apprentissage

<TrainingStep :stage="8" retained />

<LearningRoutes mode="deployment" />

<div class="takeaway">Évaluer la représentation conservée sur la tâche de perception visée.</div>


