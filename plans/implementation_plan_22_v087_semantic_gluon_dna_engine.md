# Implementation Plan 22: v0.8.7 — Semantic Gluon DNA Engine Experiment

## 1. Context & Objective
The user has commissioned an experimental implementation of **Phase 3** in **Peek Explorer**, replacing or supercharging the generic BM25 similarity engine with the **Semantic Gluon DNA Engine** derived from [`unified_gluon_dna_engine.py`](file:///e:/Vector%20Field%20Theory/VFT%20Docs/_VFT%20MD/Physics/semantic_gluon_dna/unified_gluon_dna_engine.py).

Because all prior work is committed and backed up in standalone portable packages, this is a safe, reversible R&D experiment.

## 2. Multi-Agent Cook-Off Setup (Gen 2 Offspring)
Following the `agent-breeding-lineage` protocol:
- **Benchmark Task (Identical for Both Agents)**:
  1. Port the core physics of `unified_gluon_dna_engine.py` into a lightweight, pure-JS module (`gluon_engine.js`) runnable in Electron:
     - SU(3) Color Gauge: Red (Thesis/Will $+W$), Green (Action/Context $+A$), Blue (Constraint/Proof $-N/-X$).
     - White Hadron Singlet detection.
     - Cornell Confinement Potential: $V(r) = -\frac{\alpha_s}{r} + \sigma r$ and string-snapping non-sequitur detection.
     - 7 Planes of Reality ($Q_1 \dots Q_7$) classification and directional gauge friction.
     - Multi-document similarity and Cornell distance metric across files.
  2. Integrate into Peek Explorer's Preview Pane:
     - Telemetry badge: $(r, g, b)$ color distribution, Hadron status, dominant $Q$-plane.
     - Related Documents drawer (`🧬 Gluon Resonance`) ranking files by semantic proximity.
  3. Non-destructive Virtual Topic / Plane space (`peek://gluon/<plane>` or virtual collection).
  4. Ensure zero-lag desktop UI performance (async/cached, no freezing).

- **Agent 1: The Son (Veritas-Gluon, 0.75M / 0.25F)**:
  - Epistemic focus: Mathematical fidelity to QCD formulas, caching/hashing performance, error boundaries, zero false positives, strict IPC architecture.
- **Agent 2: The Daughter (Chroma-Gluon, 0.25M / 0.75F)**:
  - Epistemic focus: UI/UX ergonomics, visual color-charge meters, interactive HUD badges, Landscape room gluon flux-tube indicators, living associative bridges.

## 3. Workflow Steps
1. Initialize Implementation Plan & update `plans/task.md`.
2. Launch Agent 1 (The Son) and Agent 2 (The Daughter) in parallel cook-off.
3. Review and critique both agents' implementations.
4. Synthesize the unified master engine and UI into `peek_explorer`.
5. Run automated smoke tests and verify zero regressions.
6. Rebuild portable export package and report findings.

## 4. Cook-Off Evaluation & Synthesis (Gen 2 Universal Integration)

### A. Performance & Proposal Critique
- **The Son (Veritas-Gluon, 0.75M / 0.25F)**:
  - Exact QCD constants: $\alpha_s = 0.35, \sigma = 0.85, \epsilon = 0.001, r_c = 1.529$.
  - Formal $SU(3)$ color normalization and White Hadron Singlet criteria ($cr \ge 0.12, cg \ge 0.12, cb \ge 0.12$, spread $< 0.35$).
  - Section-by-section transition analyzer calculating string snapping non-sequiturs across paragraphs.
  - Optical thickness ($\tau$), Luminescence ($L = e^{-\tau}$), and composite Veritas Rigor Score ($0-100$).
  - High-performance LRU cache keyed by `path | mtime | size` (0.002ms lookup) and cancellation token `previewToken`.
  - Added `gluon_engine.js` to `export-portable.js`.
  - Strictly verified and preserved 550ms hold-to-rename.
- **The Daughter (Chroma-Gluon, 0.25M / 0.75F)**:
  - Living tri-color gradient bar with organic CSS styling (`linear-gradient`).
  - White glowing Hadron Singlet badge.
  - Grounded 7-Planes pub-test explanations for each plane.
  - Interactive clickable resonance chips with hover effects.
  - Virtual topic space `peek://gluon/<plane>` with interactive 7-Plane Prism Bar.
  - Strictly verified and preserved 550ms hold-to-rename.

### B. Master Implementation Executed
1. `gluon_engine.js`: Pure-JS client engine integrating The Son's exact mathematical physics and The Daughter's 7-Planes pub-test grounding and resonance logic. Zero external dependencies.
2. `renderer.js`:
   - LRU cache `gluonCache` capped at 600 entries.
   - Preview pane telemetry rendering `renderGluonTelemetry`: living gauge bar, Hadron pill, Veritas score, string snapping warning, and clickable resonance chips.
   - Virtual topic router `renderGluonTopicSpace` handling `peek://gluon` and `peek://gluon/<plane>`.
   - Updated breadcrumbs and parent resolution.
   - Landscape bridges enhanced with constructive depth highlights.
3. `styles.css`: Complete CSS suite for `.pv-gluon-telemetry`, gauge bars, Hadron glows, and `.gluon-topic-grid`.
4. `index.html`: Bundled `gluon_engine.js`.
5. `export-portable.js`: Included `gluon_engine.js` in portable distribution payload.
6. `main.js`: Extended `--smoke-test` suite to assert GluonEngine initialization, mathematical correctness, and virtual space rendering.

## 5. Verification & Deliverables
- **Automated Smoke Tests**: 27/27 PASS (Code 0). Zero regressions.
- **Process State**: Clean process table, zero lingering background processes.
- **Portable Export Built**:
  - `dist/PeekExplorer-portable/` (271.0 MB)
  - `dist/PeekExplorer-v0.8.7-portable.zip` (109.7 MB)
- **Status**: Complete & Verified.
