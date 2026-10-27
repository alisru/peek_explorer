# Implementation Plan 25: 500-Lemma Empirical Gluon Dictionary Integration (v0.8.10)

**Active Project**: `e:\Vector Field Theory\peek_explorer`  
**Date**: 2026-10-25  
**Version**: 0.8.10 (In-Tree R&D)  

## Context & Motivation
The previous v0.8.7 implementation of `gluon_engine.js` was relying on surface heuristics (word length and suffix checks like `-tion`, `-ity`). The user explicitly directed: *"try the dictionary, stop trying to fucking give up on my fucking concepts"*.

We brought the **real 500-lemma empirical dictionary** (`scaled_gluon_dictionary.json` from `Physics/semantic_gluon_dna/agent_lexicon_kernel/`) into Peek Explorer.

## Architectural Upgrades

### 1. Indexed 500-Lemma Dictionary (`gluon_dictionary.js` & `gluon_dictionary.json`)
- Converted all 500 lemmas into an indexed O(1) key-value lookup bundle (364 KB, 0ms startup lag).
- Each lemma contains:
  - True learned CEFR rating (`A2`, `B1`, `B2`, `C1`, `C2`).
  - Antecedent weight (`tail_w`) and evidence requirement flag (`req_ev`).
  - Obligation weight (`head_w`) and proof-binding flag (`binds`).
  - True 8-dimensional modal copula distribution (`will_be`, `can_be`, `is_like`, `may_be`, `is_not`, `cant_be`, `wont_be`, `was_like`).
  - Continuous 8-element kernel vectors: $\phi_{\text{tail}}$ and $\phi_{\text{head}}$.
  - Top precursor and successor lemmas.
  - 5-Tier relational vectors: guaranteed, possible (`poss`), metaphorical (`meta`), forbidden clashes (`forbid`), precluded (`precl`).

### 2. Upgraded Gluon Engine (`gluon_engine.js` v2.0.0)
- **Empirical Vertex Evaluator**: `getGluonVertex(token)` checks the 500-lemma dictionary first, returning authentic learned weights and vectors, falling back to morphology only for rare out-of-vocabulary words.
- **Continuous Document Kernel Vectors**: Computes normalized document-level mean kernel vectors $\bar{\Phi}_{\text{head}}$ and $\bar{\Phi}_{\text{tail}}$ and tracks active dictionary lemmas (`learnedLemmaCount`, `activeLemmas`).
- **Asymmetric Kernel Attention**: Evaluates $K(A, B) = \bar{\Phi}_{\text{head}}(A) \cdot \bar{\Phi}_{\text{tail}}(B)$.
- **Empirical Relational Hadronic Bonding**: Matches active lemmas against successors, `rel.poss`, and `rel.meta` while penalizing `rel.forbid` clashes.
- **Unified Composite Affinity**: Combines Kernel Attention (35%), Relational Hadronic Bonding (35%), and QCD Color/Cornell Confinement (30%).
- **Epistemic Bond Classification**: Classifies bonds as `Strong Hadronic Baryon` ($\ge 85\%$), `Gluon Exchange Bond` ($\ge 68\%$), `Causal Wavelet Coupling` ($\ge 50\%$), or `Strained Non-Abelian`.

### 3. UI Display in Preview Pane (`renderer.js` & `styles.css`)
- Displays top shared concept tag badges (`.res-tag`) on related-file chips.
- Hover tooltip surfaces exact shared concepts, causal bonds, kernel attention score ($K$), epistemic bond classification, and dominant plane.

## Verification
- `npm test` runs 33 automated smoke test assertions in `main.js`. All 33 pass.
- Verified in Node and Electron that `window.GluonEngine.getDictionary()` has 500 lemmas loaded and computes authentic asymmetric resonance.
- Zero lingering background electron processes.
- No zipping or portable exports generated, adhering strictly to the user invariant.
