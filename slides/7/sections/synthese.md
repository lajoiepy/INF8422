---
layout: section
---

# Synthèse

L’application robotique associe les représentations pré-entraînées à des observations géométriques et temporelles.

---
hideInToc: true
---

# Assembler géométrie, sémantique et relations

| Niveau | Information produite | Vérification essentielle |
|---|---|---|
| Géométrie | Points, profondeurs, rayons, poses | Repères et échelle |
| Sémantique | Caractéristiques et objets | Association multivue |
| Relations | Graphe structuré | Ancrage des arêtes |
| Humains | Activités et futurs possibles | Temporalité et plausibilité |

<InfoBlock>

Chaque niveau hérite des erreurs de ses entrées. Inspecter les représentations intermédiaires facilite le diagnostic.

</InfoBlock>

---
hideInToc: true
---

# Critères de conception et d’évaluation

- Provenance des observations associées à chaque sortie.
- Paramètres ajustés et données utilisées pour l’adaptation.
- Mesures géométriques et références sémantiques d’évaluation.
- Latence compatible avec la tâche robotique.
- Comportement défini en présence d’entrées manquantes.

<ExampleBlock>

L’évaluation du système mesure conjointement la qualité des sorties, leur disponibilité temporelle et leur utilité pour la tâche.

</ExampleBlock>
