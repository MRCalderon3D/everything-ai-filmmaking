---
name: music-direction
description: Choose the film's music strategy early — song, score, or silence — so sound leads planning instead of trailing the cut.
origin: everything-ai-filmmaking
category: story
---

# Music Direction

## Purpose
Decide what the music is doing before a single shot is planned. A music brief
written during development gives every downstream step — shot timing, cut
rhythm, sound design — a tempo and an intent to build against, instead of
scoring a finished cut as an afterthought.

## Use When
- Development, once a treatment or story bible exists, before shot planning.
- A commercial or short hangs on one track and the concept must be tested
  against it before anything is boarded.
- Temp music is creeping into planning with no strategy and no licensing plan.

## Inputs
- Story bible or treatment; `production/project.yaml` (production type shapes
  the brief — one track for a spot, cue-level briefs per sequence for cinema).
- Optional strategy override, target era/genre, and reference tracks.
- `rules/audio/music.md` for licensing and temp-track policy.

## Process
1. Pick a strategy per piece or per sequence — on purpose, not by default:
   - **Song-as-concept.** The piece is built around one specific track; its
     structure, tempo map, and lyric moments become the film's blueprint.
     Concept and song are co-dependent — neither survives swapping the other.
   - **Counterpoint.** Music pulls against the visuals to create subtext:
     delicate, joyful music over struggle reshapes it into triumph. Establish
     it at treatment/pitch stage so stakeholders see the intent, not a mistake.
   - **Support.** Conventional mood-matching. The default — still a decision.
   - **Lyric-as-narrative.** Lyrics carry the weight of dialogue, with sync
     points where a specific lyric lands on a specific image.
   - **Minimal/solo.** One instrument creates space and intimacy; the silence
     between notes is part of the storytelling.
2. For song-driven strategies, refuse on-the-nose lyric/image pairing: a lyric
   saying "freedom" over a truck in an open landscape is a cliché with no
   payoff. Find the unexpected way in or change the track.
3. Decide diegetic vs non-diegetic per cue. A character hearing the song
   creates subtext and characterization — there is no faster way to know a
   character than the music they listen to.
4. Target the era for the audience, not the filmmaker: music carries the
   audience's generational memory. Pick the era for the target demographic;
   don't imitate it — reconnect it.
5. Use genre as a signal, knowingly: classical says craft and confidence
   (avoid the overused warhorses); jazz brings tension plus looseness — it
   rushes and drags, and needs edits that lean into its unpredictability;
   quirky/offbeat picks buy brand personality and pattern-break.
6. Map tempo and energy per cue — timestamps or beat markers with an energy
   curve. This map feeds shot timing in `/smart-shot` and cut rhythm in
   `/edit-plan`; write it as the pacing contract it is.
7. Record licensing status per cue from day one: `licensed | commissioned |
   generated | temp`. A temp track that cannot be licensed MUST be flagged
   before the edit falls in love with it (`rules/audio/music.md`).

## Outputs
- `production/story/music-brief.yaml` (music-brief.schema.json): default
  strategy plus cues with scope, genre/era, tempo/energy map, lyric sync
  points, diegetic flag, licensing status, and reference tracks.

## Quality Bar
- Every cue names a strategy; "support" appears as a choice, not a shrug.
- Counterpoint and song-as-concept cues state their intended subtext in notes.
- Every temp or unlicensed reference is flagged `cleared: false`.
- A tempo/energy map exists for every cue that shot planning will pace against.
- Lyric sync points name both the lyric and the image, never just the song.

## Common Failure Modes
- Music chosen after the cut, forcing recuts around an unplanned track.
- On-the-nose lyric pairing that restates the image instead of reframing it.
- A temp track adored for months, then unlicensable at finishing.
- Era or genre picked for the filmmaker's taste, not the audience's memory.
- Counterpoint that reads as an error because it was never pitched as intent.

## Related Agents
- sound-designer
- showrunner
- editor

## Related Commands
- /music-brief
- /edit-plan
- /smart-shot

## Notes
The brief is a contract, not a mood board: `/edit-plan` honors it or escalates
to the showrunner. Silence is a valid cue — write it down like one.
