---
storyboard: S11
section: Représentations pour la perception
clicks: 1
---

# Représentations de l’encodeur

<EncoderRepresentation :stage="$clicks" />

$$
\boldsymbol{\psi}=f_\theta(x)
$$

<InfoBlock title="Une description réutilisable">

La qualité d’une représentation dépend de l’information disponible pour la tâche visée.

</InfoBlock>



---
storyboard: S12
clicks: 1
---

# Caractéristiques globales et denses

<GlobalDenseFeatures :stage="$clicks" />




---
storyboard: S13
clicks: 2
---

# Invariance aux changements non pertinents

Pour **reconnaître cette tasse**, l’éclairage et l’arrière-plan peuvent être des variables parasites.

On procède donc à des **augmentations** lors de l'entraînement.

<MugBehavior mode="identity" :stage="$clicks" />

<div class="takeaway">Conserver l’information qui identifie l’objet malgré les changements choisis.</div>



---
storyboard: S14
clicks: 2
---

# Information spatiale nécessaire à l’action

Pour **saisir l’anse**, sa position et son orientation doivent rester accessibles.

On procède donc à des **augmentations** lors de l'entraînement.

<MugBehavior mode="pose" :stage="$clicks" />

<div class="takeaway">Les caractéristiques correspondantes peuvent rester cohérentes alors que leurs positions changent.</div>



---
storyboard: S15
clicks: 1
disabled: true
---

# Les transformations encodent des hypothèses

$$
\widetilde x=A_\xi(x)
$$

<AugmentationAssumptions :stage="$clicks" />

<AlertBlock title="Choisir les transformations selon l’information nécessaire">

L’accord entre vues encourage à ignorer leurs différences. Ces différences peuvent contenir des indices utiles.

</AlertBlock>



---
storyboard: S16
clicks: 1
---

# Objectifs d’appariement et de prédiction

<MatchingPrediction :stage="$clicks" />

<InfoBlock title="Deux mécanismes à suivre">

L’appariement utilise une relation connue entre observations.

Alors que le masquage utilise une information observée retirée de l’entrée.

</InfoBlock>


