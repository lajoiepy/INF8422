---
layout: section
---

# Synthèse

Relier supervision, représentation, géométrie et décision robotique.

<!--
Présenter la question centrale et annoncer les objectifs de ce bloc.
-->

---
hideInToc: true
---

# Concevoir un système supervisé

| Question | Exemples du cours |
|---|---|
| Quelle cible est réellement disponible ? | Classe, boîte, pose, polyligne, position GNSS |
| Quelle représentation sert la tâche ? | Probabilités, volume d’objet, carte, descripteur |
| Quelle perte exprime l’erreur pertinente ? | Entropie croisée, régression, géométrie, marge |
| Quelle vérification protège l’usage robotique ? | Validation indépendante, visibilité, géométrie, incertitude |

<InfoBlock title="Garbage In Garbage Out">

En apprentissage supervisé, le nerf de la guerre est la qualité des données d'entraînement. Si on n'a pas de bonnes données, on obtiendra de mauvais résultats.

</InfoBlock>

<!--
Demander un exemple de panne pour chaque ligne. Distinguer performance moyenne et conséquences d’une erreur acceptée par le système.
-->
