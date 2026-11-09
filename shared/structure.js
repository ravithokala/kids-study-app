// @ts-check
// GENERATED from apps-script/domain/structure.js by scripts/sync-shared.js. Do not edit here:
// edit that file and run `npm run sync:shared`.

/**
 * The tree of subjects, sections and topics. Each is a row someone adds in the app; nothing here is
 * fixed except the two tracks. A removed row (deleted) hides everything under it.
 *
 * Shared with the phone app: scripts/sync-shared.js copies this file to pwa/shared/.
 */
const Structure = (() => {
  /** Order by the `sort` number, then by name. @param {{ sort: number, name: string }} a @param {{ sort: number, name: string }} b */
  const bySort = (a, b) => (a.sort - b.sort) || a.name.localeCompare(b.name, 'en-GB');

  /**
   * One track's subjects, each with its sections, each with its topics, in order.
   * @param {ReadonlyArray<Subject>} subjects @param {ReadonlyArray<Section>} sections @param {ReadonlyArray<Topic>} topics
   * @param {TrackId} track @returns {SubjectNode[]}
   */
  function tree(subjects, sections, topics, track) {
    return subjects.filter((s) => !s.deleted && s.track === track).sort(bySort).map((s) => ({
      ...s,
      sections: sections.filter((c) => !c.deleted && c.subject_id === s.subject_id).sort(bySort).map((c) => ({
        ...c,
        topics: topics.filter((t) => !t.deleted && t.section_id === c.section_id).sort(bySort),
      })),
    }));
  }

  /**
   * Whether a child in `year` is expected to have met a topic: any-year topics, and those taught in
   * that year or earlier.
   * @param {Topic} topic @param {number} year
   */
  const forYear = (topic, year) => topic.year_group === null || topic.year_group <= year;

  /**
   * The ids of the topics under some subjects, optionally only those for a child's year.
   * @param {ReadonlyArray<SubjectNode>} nodes @param {number} [year] @returns {string[]}
   */
  function topicIds(nodes, year) {
    return nodes.flatMap((s) => s.sections.flatMap((c) => c.topics.filter((t) => year === undefined || forYear(t, year)).map((t) => t.topic_id)));
  }

  /**
   * 'Maths › Fractions, decimals and percentages › Percentages', or '' if the topic or a parent is gone.
   * @param {string} topicId @param {ReadonlyArray<Subject>} subjects @param {ReadonlyArray<Section>} sections @param {ReadonlyArray<Topic>} topics
   */
  function path(topicId, subjects, sections, topics) {
    const topic = topics.find((t) => t.topic_id === topicId && !t.deleted);
    const section = topic && sections.find((c) => c.section_id === topic.section_id && !c.deleted);
    const subject = section && subjects.find((s) => s.subject_id === section.subject_id && !s.deleted);
    return topic && section && subject ? `${subject.name} › ${section.name} › ${topic.name}` : '';
  }

  /** The sort number for a new row at the end of a list. @param {ReadonlyArray<{ sort: number }>} siblings */
  const nextSort = (siblings) => siblings.reduce((max, r) => Math.max(max, r.sort), 0) + 1;

  return { bySort, tree, forYear, topicIds, path, nextSort };
})();

export { Structure };
