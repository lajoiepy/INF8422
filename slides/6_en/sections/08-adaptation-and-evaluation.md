---
storyboard: A01
section: Key considerations to remember
class: ssl-slide
---

# Why adapt models in robotics?

A model trained in one context may lose performance when that context changes.

<div class="grid grid-cols-3 gap-6 mt-8">

<div class="bg-blue-50 text-slate-800 p-5 rounded-xl">

### 🌍 Diverse environments
Indoor, outdoor, underwater, aerial

**What changes:** lighting, visibility, obstacles, disturbances

</div>

<div class="bg-teal-50 text-slate-800 p-5 rounded-xl">

### 🎯 Diverse tasks
Navigation, manipulation, inspection, exploration

**What changes:** objectives, accuracy, safety constraints

</div>

<div class="bg-orange-50 text-slate-800 p-5 rounded-xl">

### 🤖 Diverse robots
Wheeled robots, quadrupeds, arms, drones

**What changes:** sensors, actuators, morphology, dynamics

</div>

</div>

<div class="mt-8 p-5 rounded-xl bg-slate-800 text-white text-center">

**Adapt models to transfer what they have learned to new conditions**

<span class="text-lg">Maintain performance while limiting the data and retraining required.</span>

</div>

---
storyboard: S79
section: Key considerations to remember
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

# Head-only training versus LoRA

<AdaptationMechanics mode="paths" :stage="$clicks" />

$$

\hat y=h_\beta(\psi),\qquad \psi=f_\theta(x)

$$

<div class="adapt-cards"><div><b>Head only</b><span>Update β. For a fixed input, the encoder features ψ stay identical.</span></div><div><b>LoRA + head</b><span>Update A, B and β. Internal corrections change ψ even though θ₀ stays frozen.</span></div></div><div class="takeaway">A nonlinear head can decode richer patterns, but cannot recover information absent from its input features.</div>

<div class="citation"><a href="https://arxiv.org/abs/2106.09685">Hu et al. · LoRA · ICLR 2022 · §4</a></div>

---
layout: default
storyboard: L00
---

# LoRA: adapt a model with few parameters

**Low-Rank Adaptation** — learn a low-rank correction while keeping the original weights frozen.

<div class="my-6 text-center">

$$
W_{\text{adapted}} = \underbrace{W_0}_{\text{frozen weights}}
+ \underbrace{\Delta W}_{BA\,:\,\text{learned correction}}
$$

</div>

<div class="grid grid-cols-3 gap-6">

<div class="bg-blue-50 text-slate-800 p-5 rounded-xl">

### ⚙️ Lightweight adaptation
Only two small matrices, **A and B**, are trained.

**Fewer parameters to optimize** and less training memory.

</div>

<div class="bg-teal-50 text-slate-800 p-5 rounded-xl">

### 🔒 Preserved model
The original weights **remain unchanged** during adaptation.

Disable the correction to **recover the initial model**.

</div>

<div class="bg-orange-50 text-slate-800 p-5 rounded-xl">

### 🔄 Modular adaptations
One base model can support **several corrections**.

Load the adaptation for the **domain, task, or robot**.

</div>

</div>

<div class="mt-6 p-4 rounded-xl bg-slate-800 text-white text-center">

**One shared base model + a small correction for each context**

</div>

---
storyboard: L02
class: ssl-slide adaptation-module
clicks: 2
---

# LoRA: Low-Rank Adaptation

<AdaptationMechanics mode="branch" :stage="$clicks" />

$$

z=W_0u+sB(Au),\qquad W_0\in\mathbb R^{d\times k},\ A\in\mathbb R^{q\times k},\ B\in\mathbb R^{d\times q},\ s=\alpha/q

$$

<div class="adapt-cards"><div><b>A: k → q</b><span>Measure q learned combinations of the input coordinates.</span></div><div><b>B: q → d</b><span>Use those q coefficients to form a correction in the output space.</span></div></div><div class="takeaway">Both branches receive the same u; add their outputs.</div>

<div class="citation"><a href="https://arxiv.org/abs/2106.09685">Hu et al. · LoRA · ICLR 2022 · §4</a></div>

---
storyboard: L03
class: ssl-slide adaptation-module
clicks: 2
---

# What does “low rank” constrain?



$$

\Delta W=sBA=s\sum_{j=1}^{q}b_j a_j^\top,\qquad \Delta Wu=s\sum_{j=1}^{q}b_j(a_j^\top u)

$$

<AdaptationMechanics mode="rank" :stage="$clicks" /><div class="adapt-cards"><div><b>Read a direction</b><span>Each row aⱼᵀ extracts one scalar from u.</span></div><div><b>Write a direction</b><span>Each column bⱼ supplies one output direction.</span></div></div><div class="takeaway">rank(ΔW) ≤ q: every correction lies in span(b₁,…,bq). The directions themselves are learned.</div><div class="small-note">The rank constraint applies to ΔW. The effective matrix W₀ + ΔW can remain full rank.</div>

<div class="citation"><a href="https://arxiv.org/abs/2106.09685">Hu et al. · LoRA · ICLR 2022 · §4</a></div>

---
storyboard: L04
class: ssl-slide adaptation-module
clicks: 1
disabled: true
---

# A rank-one update can change every weight



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

</div><div class="takeaway">All six entries of ΔW are nonzero, yet its columns are multiples of B. Low rank does not mean sparse.</div><div class="small-note">Constructed example: this tiny 2 × 3 case explains the algebra; q(d + k) = 5 versus dk = 6 gives little saving.</div>

<div class="citation"><a href="https://arxiv.org/abs/2106.09685">Hu et al. · LoRA · ICLR 2022 · §4</a></div>

---
storyboard: L05
class: ssl-slide adaptation-module
clicks: 0
---

# How many parameters do we train?

<div class="adapt-stats"><div><strong>589,824</strong>Full 768 × 768 matrix</div><div><strong>12,288</strong>A + B with q = 8</div><div><strong>48×</strong>Fewer trainable parameters</div></div>

$$

N_{\rm full}=dk,\qquad N_{\rm LoRA}=q(k+d),\qquad \frac{N_{\rm LoRA}}{N_{\rm full}}\approx2.08\%

$$

<div class="adapt-cards"><div><b>Low q</b><span>Less adapter storage and fewer optimizer states; more restricted corrections.</span></div><div><b>High q</b><span>More capacity and cost</span></div></div><div class="small-note">W₀ remains resident. Activations and gradient propagation through the encoder still cost memory and compute.</div>

<div class="citation"><a href="https://arxiv.org/abs/2106.09685">Hu et al. · LoRA · ICLR 2022 · §4</a></div>

---
storyboard: L06
class: ssl-slide adaptation-module
clicks: 1
disabled: true
---

# Frozen weights do not stop gradient propagation



$$

g=\frac{\partial\mathcal L}{\partial z},\qquad\frac{\partial\mathcal L}{\partial B}=s\,g(Au)^\top,\qquad\frac{\partial\mathcal L}{\partial A}=sB^\top g\,u^\top

$$

<div class="adapt-cards"><div><b>Start at the pretrained function</b><span>A is random, B = 0 ⇒ ΔW = 0.</span></div><div><b>First data gradient</b><span>B can move; A initially receives zero gradient because B = 0.</span></div><div><b>Subsequent steps</b><span>Once B ≠ 0, both factors can learn. W₀ remains fixed.</span></div></div><div v-click="1">

$$

\frac{\partial\mathcal L}{\partial u}=(W_0+sBA)^\top g

$$

<div class="takeaway">Do not detach the encoder path: the gradient must reach earlier trainable LoRA modules.</div></div><div class="small-note">If A and B both start at zero, both data gradients vanish. Formulas show one sample, without regularization.</div>

<div class="citation"><a href="https://arxiv.org/abs/2106.09685">Hu et al. · LoRA · ICLR 2022 · §4</a></div>

---
storyboard: L07
class: ssl-slide adaptation-module
clicks: 0
---

# Where does LoRA act in a Transformer?

<div class="adapt-flow"><span>Tokens uᵢ</span><span>Q, K, V projections<br><b>Selected W₀ + sBA</b></span><span>Attention</span><span>New features ψ</span></div>

$$

Q_i=(W_{Q0}+sB_QA_Q)u_i,\quad V_i=(W_{V0}+sB_VA_V)u_i,\quad K_i=W_{K0}u_i

$$

<div class="adapt-cards"><div><b>Change Q</b><span>Modify which tokens the representation attends to.</span></div><div><b>Change V</b><span>Modify the information carried by the attended tokens.</span></div></div><div class="takeaway">The original paper studies Q/V adaptation. K, output projections and MLP matrices are also possible targets.</div><div class="small-note">Choose layers, matrices, rank and scale on held-out data. Every adapted matrix has its own compatible factors; q is our rank notation.</div>

<div class="citation"><a href="https://arxiv.org/abs/2106.09685">Hu et al. · LoRA · ICLR 2022 · §4.2 · §7.1</a></div>

---
storyboard: L08
class: ssl-slide adaptation-module
clicks: 0
---

# At deployment, fold the correction into the weights

<div class="adapt-flow"><span>W₀u + sB(Au)</span><span>W★ = W₀ + sBA</span><span>W★u</span></div><div class="adapt-cards"><div><b>Before merging</b><span>Store one base model and compact task-specific adapters; switch adapters as needed.</span></div><div><b>After merging</b><span>One ordinary matrix multiplication. No separate LoRA branch for that fixed task.</span></div></div>

$$

(W_0+sBA)u=W_0u+sB(Au)

$$

<div class="small-note">This merges a correction into its own base weights. Combining unrelated models or several task adapters is a different problem.</div>

<div class="citation"><a href="https://arxiv.org/abs/2106.09685">Hu et al. · LoRA · ICLR 2022 · §4</a></div>

---
storyboard: L09
class: ssl-slide adaptation-module
clicks: 1
---

# Head only, LoRA, or full fine-tuning?

<div class="adapt-cards"><div><b>Head only</b><span>Fixed encoder. Cheap training; cache features if preprocessing is fixed. Limited by the available representation.</span></div><div><b>LoRA + head</b><span>Adapt internal features with few parameters. Still backpropagate through the encoder; choose rank and insertion sites.</span></div><div><b>Full fine-tuning</b><span>Most flexible updates. More gradients and optimizer states; greater storage and overfitting risk.</span></div></div>

<div class="citation"><a href="https://arxiv.org/abs/2106.09685">Hu et al. · LoRA · ICLR 2022 · §4</a></div>

---
storyboard: C01
class: ssl-slide adaptation-module
clicks: 0
---

# Useful features may be hidden in different layers

<figure class="adapt-original"><img class="combo-probing" src="../images/combo-probing.svg" alt="Original ComBo layer-wise linear-probing results" /></figure>

<div class="adapt-figure-labels"><span>Digits: CLIP, layer 7</span><span>Distance: MAE, layer 12</span></div><div class="adapt-cards"><div><b>One frozen model</b><span>Its final layer need not be the best representation for the new task.</span></div><div><b>Several frozen models</b><span>Different pretraining objectives can provide complementary information.</span></div></div><div class="takeaway">ComBo learns to read intermediate features from one or several backbones.</div><div class="small-note">Original project figure: validation linear-probe accuracy versus layer. Best model/layer differs between these tasks.</div>

<div class="citation"><a href="https://arxiv.org/abs/2512.01405">Ramtoula et al. · ComBo · NeurIPS 2025 · page projet / project figure</a></div>

---
storyboard: C02
class: ssl-slide adaptation-module
clicks: 0
---

# ComBo: combine features from multiple backbones

<figure class="adapt-original"><img class="combo-architecture" src="../images/combo-architecture.svg" alt="Original ComBo architecture: frozen backbones, projection, Transformer and head" /></figure>

<div><div>For a given task (e.g., segmentation or traversability), we train a small Transformer to combine features from different layers of several models. The result is a mixture of useful, task-specific features.</div></div><div class="takeaway">Fusion happens in feature space. The original backbones remain separate and frozen.</div>

<div class="citation"><a href="https://arxiv.org/abs/2512.01405">Ramtoula et al. · ComBo · NeurIPS 2025 · fig. 3 · §3</a></div>

---
storyboard: C03
class: ssl-slide adaptation-module
clicks: 2
disabled: true
---

# Align positions before combining channels

<AdaptationMechanics mode="align" :stage="$clicks" />

$$

S_i=\operatorname{concat}_{k,\ell}\hat F_{k,\ell}[i,:]\in\mathbb R^D,\qquad t_i=P S_i+b\in\mathbb R^{D\prime}

$$

<div class="adapt-cards"><div><b>Same image position i</b><span>Bilinear interpolation to a common grid; normalize each map. Remove backbone CLS/register tokens.</span></div><div><b>Same learned projection P</b><span>Shared over positions; selects and mixes channels across layers and models. T positions stay T tokens.</span></div></div><div class="small-note">In the paper: align to the smallest grid. Compression reduces channel dimension; interpolation can still lose spatial detail.</div>

<div class="citation"><a href="https://arxiv.org/abs/2512.01405">Ramtoula et al. · ComBo · NeurIPS 2025 · §3 · équation / equation 1</a></div>

---
storyboard: C04
class: ssl-slide adaptation-module
clicks: 0
disabled: true
---

# What does ComBo train?

<div class="adapt-flow"><span>Frozen maps<br>stop-gradient</span><span>Projection P, b</span><span>Transformer F<br>+ learned CLS</span><span>Head hβ<br>Task loss</span></div>

$$

O=\mathcal F([t_{\rm cls};t_1;\ldots;t_T]),\qquad\hat y=h_\beta(o_{\rm cls})

$$

<div class="adapt-cards"><div><b>Training</b><span>Optimize projection, CLS token, Transformer and task head. No gradient through the backbones.</span></div><div><b>Inference</b><span>Still execute every retained backbone, then ComBo.</span></div></div>

<div class="citation"><a href="https://arxiv.org/abs/2512.01405">Ramtoula et al. · ComBo · NeurIPS 2025 · §3–4</a></div>

---
storyboard: C05
class: ssl-slide adaptation-module
clicks: 0
disabled: true
---

# Keep only the backbones useful for the task



$$

P=[P_1\mid\cdots\mid P_K],\qquad s_k=\|P_k\|_F,\qquad\mathcal L=\mathcal L_{\rm task}+\lambda\sum_{k=1}^{K}s_k

$$

<div class="adapt-flow"><span>Train with all<br>+ group penalty</span><span>Rank models<br>by sₖ</span><span>Select a subset</span><span>Retrain ComBo<br>without penalty</span></div><div class="adapt-cards"><div><b>Group by backbone</b><span>Pₖ contains columns corresponding to all selected layers of model k.</span></div><div><b>Interpret with care</b><span>The score depends on the task and competing models; it is not an intrinsic quality rating.</span></div></div><div class="takeaway">The paper keeps the top two models per task. Selection costs training first; it can reduce later inference cost.</div><div class="small-note">Frobenius norm = ℓ₂ norm of all entries of Pₖ. Choose settings on validation, not the test set.</div>

<div class="citation"><a href="https://arxiv.org/abs/2512.01405">Ramtoula et al. · ComBo · NeurIPS 2025 · §3 · sélection / selection</a></div>

---
storyboard: C06
class: ssl-slide adaptation-module
clicks: 0
disabled: true
---

# What do the published comparisons show?

<AdaptationMechanics mode="results" /><div class="adapt-cards"><div><b>One shared backbone</b><span>ComBo improves over final-layer linear probing. LoRA and Adapter+ score higher here.</span></div><div><b>Multiple backbones</b><span>Selected top-two ComBo beats all-four ComBo on the reported aggregate; inference uses two backbones.</span></div></div><div class="small-note">VTAB-1k: 19 classification tasks, 1,000 labeled images per task, 3 seeds. Paper “Global Average”: mean of the three task-group averages. Different panels use different backbones.</div>

<div class="citation"><a href="https://arxiv.org/abs/2512.01405">Ramtoula et al. · ComBo · NeurIPS 2025 · tableaux / tables 1–2</a></div>

---
storyboard: C07
class: ssl-slide adaptation-module
clicks: 0
disabled: true
---

# First adapt the models, then combine their features

<div class="adapt-flow"><span>Each model<br>+ Adapter+</span><span>Freeze the<br>adapted models</span><span>Train ComBo<br>on their features</span></div><div class="adapt-stats"><div><strong>79.9%</strong>DINOv2 + Adapter+</div><div><strong>79.3%</strong>ComBo on adapted models</div><div><strong>78.7%</strong>Joint Multi-Adapter+</div></div><div class="takeaway">Combining adapted models is not guaranteed to beat the best individual model. ComBo avoids joint backbone backpropagation during the fusion stage.</div><div class="small-note">Table 3, same reported VTAB aggregate. Adaptation already had a cost. Table 4 further shows that useful task information can concentrate in the final layer after tuning.</div><div class="small-note">The paper uses Adapter+ here. Replacing it with LoRA is a possible experiment, not this reported result.</div>

<div class="citation"><a href="https://arxiv.org/abs/2512.01405">Ramtoula et al. · ComBo · NeurIPS 2025 · §4.3 · tableaux / tables 3–4</a></div>

---
storyboard: C08
class: ssl-slide adaptation-module
clicks: 1
---

# Choose where the adaptation should happen

<div class="adapt-cards"><div><b>Head only</b><span>Read the final frozen features. Lowest training burden when they already suffice.</span></div><div><b>LoRA</b><span>Change internal computations of a backbone. Compact task updates and mergeable linear branches.</span></div><div><b>ComBo</b><span>Read and combine intermediate features from several models.</span></div></div>



---
storyboard: S80
class: ssl-slide
clicks: 3
disabled: true
---

# Label efficiency

<LabelEfficiency :stage="$clicks" />



---
storyboard: S81
class: ssl-slide
clicks: 2
---

# Splitting robot data correctly

<RobotDataSplit :stage="$clicks" />



---
storyboard: S82
class: ssl-slide
clicks: 3
disabled: true
---

# Evaluating the intended perception task

<TaskEvaluation :stage="$clicks" />



---
storyboard: S83
class: ssl-slide
clicks: 2
disabled: true
---

# Pretext loss and downstream usefulness

<ObjectiveUsefulness :stage="$clicks" />



---
storyboard: S84
class: ssl-slide
clicks: 2
---

# Course synthesis

<CourseSynthesis :stage="$clicks" />


