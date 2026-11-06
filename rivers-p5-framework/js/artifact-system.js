import { OPENING_CLUE } from './data.js';
import { distance } from './math.js';

/**
 * Owns the ordered story progression. UI buttons ask this class to change state;
 * they never change foundCount directly. This prevents duplicate button presses,
 * canceled dialogs, or interacting with a later object from skipping the trail.
 */
export class ArtifactSystem {
  constructor(world) {
    this.world = world;
    this.reset();
  }

  get currentArtifact() {
    return this.world.artifacts[this.foundCount] ?? null;
  }

  get isBlocked() {
    return Boolean(this.pending || this.journalOpen || this.completed);
  }

  /** Open the choice dialog only for the next artifact and only within reach. */
  interact(point, maxDistance = 3) {
    const artifact = this.currentArtifact;
    if (this.isBlocked || !artifact || artifact.resolved || !point ||
        !Number.isFinite(maxDistance) || maxDistance < 0 ||
        !(distance(point, artifact.position) <= maxDistance)) return false;
    this.pending = artifact;
    return true;
  }

  /** A text verse is always available, even when no recorded audio is supplied. */
  listen() {
    if (!this.pending || this.pending !== this.currentArtifact) return null;
    this.clue = this.pending.definition.verse;
    return this.pending;
  }

  /**
   * Confirm at the moment the choice is made, not just when the dialog opens.
   * Physical VR room movement can move the player out of reach during a dialog.
   * Taking the photograph itself belongs to the renderer, before this call.
   */
  resolve(choice, point) {
    const artifact = this.pending;
    if ((choice !== 'photograph' && choice !== 'restore') || !point ||
        !artifact || artifact !== this.currentArtifact || artifact.resolved ||
        !(distance(point, artifact.position) <= 3)) return null;
    artifact.resolved = true;
    artifact.restored = choice === 'restore';
    artifact.choice = choice;
    this.foundCount += 1;
    this.clue = artifact.definition.verse;
    this.lastDiscovery = artifact;
    this.pending = null;
    this.journalOpen = true;
    this.world.final.unlocked = this.foundCount === this.world.artifacts.length;
    return artifact;
  }

  /** Closing a choice dialog cancels it, without collecting an artifact. */
  close() {
    this.pending = null;
    this.journalOpen = false;
  }

  openJournal() {
    this.pending = null;
    this.journalOpen = true;
  }

  enterSanctuary(point) {
    if (this.isBlocked || !this.world.final.unlocked ||
        this.foundCount !== this.world.artifacts.length || !point ||
        !(distance(point, this.world.final.position) <= 3)) return false;
    this.completed = true;
    return true;
  }

  /** Reuse the same generated world when the player starts the story again. */
  reset() {
    for (const artifact of this.world.artifacts) {
      artifact.resolved = false;
      artifact.restored = false;
      artifact.choice = null;
    }
    this.world.final.unlocked = false;
    this.foundCount = 0;
    this.pending = null;
    this.completed = false;
    this.journalOpen = true;
    this.clue = OPENING_CLUE;
    this.lastDiscovery = null;
  }
}
