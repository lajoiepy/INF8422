---
storyboard: S17
section: Matching, collapse, and self-distillation
class: ssl-slide
clicks: 2
disabled: true
---

# Constructing two views

<ViewPairs :stage="$clicks" />



---
storyboard: S18
class: ssl-slide
clicks: 1
---

# Encoder and projection head

<EncoderProjection :stage="$clicks" />

<MathLine :formula="$clicks ? String.raw`\boldsymbol{\psi}_i^{(v)}=f_\theta(\widetilde x_i^{(v)})\qquad\mathbf q_i^{(v)}=g_\phi(\boldsymbol{\psi}_i^{(v)})` : String.raw`\boldsymbol{\psi}_i^{(v)}=f_\theta(\widetilde x_i^{(v)})`" small />

<SSLControls />


<div class="takeaway">The objective compares q. Many different downstream tasks can reuse encoder features ψ.</div>



---
storyboard: S19
class: ssl-slide
clicks: 2
disabled: true
---

# Anchor, positive, and negatives

<ContrastiveLab mode="candidates" :stage="$clicks" />

<div class="takeaway">A positive is the other view of the same original observation.</div>



---
storyboard: S20
class: ssl-slide
clicks: 1
---

# Similarity and temperature

<ContrastiveLab mode="temperature" :stage="$clicks" />



---
storyboard: S21
class: ssl-slide
clicks: 3
---

# Contrastive loss

<ContrastiveLab mode="loss" :stage="$clicks" />



---
storyboard: S22
class: ssl-slide
clicks: 2
---

# How the objective changes representations

<ContrastiveLab mode="motion" :stage="$clicks" />

<div class="takeaway">Increase agreement with the positive relative to the competing views.</div>



---
storyboard: S23
class: ssl-slide
clicks: 3
disabled: true
---

# False negatives and shortcuts

<MatchingFailures :stage="$clicks" />

<div class="takeaway">A constructed relation is useful only when it preserves the task's evidence.</div>



---
storyboard: S24
class: ssl-slide
clicks: 2
---

# Constant representation: Collapse

<CollapseLab :stage="$clicks" />

<div class="takeaway">The learning objective must avoid collapse of the representation as a possible optimal solution.</div>



---
storyboard: S25
class: ssl-slide
clicks: 2
---

# Loss of feature dimensions

<FeatureDimensions :stage="$clicks" />




---
storyboard: S26
class: ssl-slide
clicks: 3
---

# Regularization: Variance-Invariance-Covariance (VICReg)

<VICRegLab :stage="$clicks" />



---
storyboard: S27
class: ssl-slide
clicks: 2
---

# Self-distillation: Learning targets from a teacher

<TeacherTraining mode="overview" :stage="$clicks" />

<InfoBlock title="A target that evolves during learning">

The student predicts a teacher output from a different view of the observation.

</InfoBlock>



---
storyboard: S28
class: ssl-slide
clicks: 2
---

# DINO architecture

<DINOArchitecture :stage="$clicks" />

<div class="takeaway">Match teacher and student distributions; update their parameters by different rules.</div>



---
storyboard: S29
class: ssl-slide
clicks: 2
---

# Distribution matching in DINO

<DINOProbability :stage="$clicks" />



---
storyboard: S30
class: ssl-slide
clicks: 2
---

# Gradient updates and moving averages

<TeacherTraining mode="updates" :stage="$clicks" />



---
storyboard: S31
class: ssl-slide
---

# Summary of representation learning

<MatchingSummary />

<InfoBlock title="The goal of a good representation">

Keep the information useful for the intended task.

Ignore the rest.

</InfoBlock>



