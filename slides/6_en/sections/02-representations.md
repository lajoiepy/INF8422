---
storyboard: S11
section: Representations for perception
clicks: 1
---

# Encoder representations

<EncoderRepresentation :stage="$clicks" />

$$
\boldsymbol{\psi}=f_\theta(x)
$$

<InfoBlock title="A reusable description">

Representation quality depends on the information available for the intended task.

</InfoBlock>



---
storyboard: S12
clicks: 1
---

# Global and dense features

<GlobalDenseFeatures :stage="$clicks" />




---
storyboard: S13
clicks: 2
---

# Invariance to irrelevant changes

For **recognizing this mug**, lighting and background can be nuisance variables.

We therefore use **augmentations** during training.

<MugBehavior mode="identity" :stage="$clicks" />

<div class="takeaway">Keep the information that identifies the object across the chosen changes.</div>



---
storyboard: S14
clicks: 2
---

# Spatial information needed for action

For **grasping the handle**, its location and orientation must remain accessible.

We therefore use **augmentations** during training.

<MugBehavior mode="pose" :stage="$clicks" />

<div class="takeaway">Corresponding features can stay consistent while their spatial locations change.</div>



---
storyboard: S15
clicks: 1
disabled: true
---

# Augmentations encode assumptions

$$
\widetilde x=A_\xi(x)
$$

<AugmentationAssumptions :stage="$clicks" />

<AlertBlock title="Choose transformations for the information the task needs">

Agreement across views encourages ignoring their differences. Those differences may include useful evidence.

</AlertBlock>



---
storyboard: S16
clicks: 1
---

# Matching and prediction objectives

<MatchingPrediction :stage="$clicks" />

<InfoBlock title="Two mechanisms to follow">

Matching uses a known relation between observations.

Masking uses observed information withheld from the input.

</InfoBlock>


