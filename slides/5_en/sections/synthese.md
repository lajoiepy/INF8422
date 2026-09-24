---
layout: section
---

# Synthesis

Connect supervision, representation, geometry, and robotic decision-making.

<!--
Present the central question and announce the objectives of this block.
-->

---
hideInToc: true
---

# Designing a Supervised System

| Question | Examples from the course |
|---|---|
| What target is actually available? | Class, box, pose, polyline, GNSS position |
| What representation serves the task? | Probabilities, object volume, map, descriptor |
| What loss expresses the relevant error? | Cross-entropy, regression, geometry, margin |
| What check protects robotic use? | Independent validation, visibility, geometry, uncertainty |

<InfoBlock title="Garbage In Garbage Out">

In supervised learning, the crux of the matter is the quality of the training data. Without good data, you get bad results.

</InfoBlock>

<!--
Ask for an example of a failure for each row. Distinguish average performance from the consequences of an error accepted by the system.
-->
