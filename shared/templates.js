// @ts-check
// GENERATED from apps-script/domain/templates.js by scripts/sync-shared.js. Do not edit here:
// edit that file and run `npm run sync:shared`.

/**
 * The starting subjects, sections and topics. This is the one file to edit to change them; the app
 * only adds what is missing (ids are stable), and sections and topics can always be added, renamed or
 * removed in the app afterwards.
 *
 * !! These are sensible defaults, not the school's syllabus. Check them against the National
 * !! Curriculum, the school's own plans and the 11+ papers the children will sit, and adjust.
 * !! A topic written as ['Name', 5] is taught in Year 5; a plain name applies to any year.
 * !! (First draft 2026-11-09, not yet reviewed.)
 *
 * Shared with the phone app: scripts/sync-shared.js copies this file to pwa/shared/.
 */
const Templates = (() => {
  /** @type {Readonly<Record<TrackId, ReadonlyArray<SeedSubject>>>} */
  const SEED = Object.freeze({
    school: [
      { subject: 'English', sections: [
        { name: 'Spellings', topics: ['Common exception words', 'Prefixes and suffixes', 'Homophones', 'Silent letters'] },
        { name: 'Grammar and punctuation', topics: ['Word classes', 'Tenses', 'Apostrophes', 'Commas', 'Speech punctuation'] },
        { name: 'Reading', topics: ['Retrieval', 'Inference', 'Vocabulary in context', 'Summarising'] },
        { name: 'Writing', topics: ['Narrative', 'Non-fiction', 'Handwriting'] },
      ] },
      { subject: 'Maths', sections: [
        { name: 'Number and place value', topics: ['Place value', 'Rounding', ['Negative numbers', 5], ['Roman numerals', 5]] },
        { name: 'Calculation', topics: ['Addition and subtraction', 'Multiplication tables', 'Long multiplication', 'Division'] },
        { name: 'Fractions, decimals and percentages', topics: ['Fractions', 'Decimals', ['Percentages', 5]] },
        { name: 'Ratio and algebra', topics: [['Ratio and proportion', 6], ['Algebra', 6]] },
        { name: 'Measurement', topics: ['Time', 'Money', 'Length, mass and capacity', 'Perimeter and area'] },
        { name: 'Geometry', topics: ['Shapes', 'Angles', 'Position and direction'] },
        { name: 'Statistics', topics: ['Charts and tables', ['Averages', 6]] },
      ] },
      { subject: 'Science', sections: [
        { name: 'Working scientifically', topics: ['Fair tests', 'Recording results'] },
        { name: 'Biology', topics: ['Plants', 'Animals and humans', 'Living things and habitats'] },
        { name: 'Chemistry', topics: ['Materials', 'States of matter'] },
        { name: 'Physics', topics: ['Forces', 'Light', 'Electricity', 'Earth and space'] },
      ] },
    ],
    'eleven-plus': [
      { subject: 'English', sections: [
        { name: 'Comprehension', topics: ['Fiction extracts', 'Non-fiction extracts', 'Poetry'] },
        { name: 'Vocabulary', topics: ['Synonyms and antonyms', 'Word meanings', 'Cloze'] },
        { name: 'Spelling and grammar', topics: ['Spelling rules', 'Grammar and punctuation'] },
      ] },
      { subject: 'Maths', sections: [
        { name: 'Number', topics: ['Four operations', 'Factors and multiples', 'Powers and roots'] },
        { name: 'Fractions, decimals and percentages', topics: ['Fractions', 'Decimals', 'Percentages'] },
        { name: 'Ratio and algebra', topics: ['Ratio and proportion', 'Algebra'] },
        { name: 'Measures and shape', topics: ['Time and money', 'Perimeter and area', 'Angles'] },
        { name: 'Data and problem solving', topics: ['Data handling', 'Word problems'] },
      ] },
      { subject: 'Verbal reasoning', sections: [
        { name: 'Words', topics: ['Hidden words', 'Anagrams', 'Odd one out', 'Word connections'] },
        { name: 'Codes and logic', topics: ['Letter codes', 'Number codes', 'Logic puzzles'] },
        { name: 'Sequences', topics: ['Letter sequences', 'Number sequences'] },
      ] },
      { subject: 'Non-verbal reasoning', sections: [
        { name: 'Shapes and patterns', topics: ['Odd one out', 'Series and sequences', 'Analogies'] },
        { name: 'Spatial', topics: ['Rotation and reflection', 'Nets and cubes', 'Hidden shapes'] },
      ] },
    ],
  });

  /** A 32-bit FNV-1a hash as 8 hex digits: a stable fingerprint, not a secret. @param {string} text */
  function hash(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  }

  /** 'Fractions, decimals and percentages' → 'fractions-decimals-and' (at most 24 characters). @param {string} name */
  function slug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24).replace(/-+$/, '');
  }

  /**
   * A row's id: the same name in the same place always gives the same id, so seeding twice adds nothing.
   * @param {'sub'|'sec'|'top'} prefix @param {string} where  the full path, e.g. 'school/Maths/Ratio and algebra/Algebra'
   * @param {string} name
   */
  const idFor = (prefix, where, name) => `${prefix}-${slug(name)}-${hash(where)}`;

  /**
   * Every subject, section and topic in the seed, with stable ids and an order.
   * @param {ReadonlyArray<TrackId>} [tracks]
   * @returns {SeedPlan}
   */
  function plan(tracks = ['school', 'eleven-plus']) {
    /** @type {SeedPlan} */
    const out = { subjects: [], sections: [], topics: [] };
    for (const track of tracks) {
      (SEED[track] || []).forEach((subject, si) => {
        const subjectPath = `${track}/${subject.subject}`;
        const subject_id = idFor('sub', subjectPath, subject.subject);
        out.subjects.push({ subject_id, track, name: subject.subject, sort: si + 1 });
        subject.sections.forEach((section, ci) => {
          const sectionPath = `${subjectPath}/${section.name}`;
          const section_id = idFor('sec', sectionPath, section.name);
          out.sections.push({ section_id, subject_id, name: section.name, sort: ci + 1 });
          section.topics.forEach((topic, ti) => {
            const [name, year] = typeof topic === 'string' ? [topic, null] : topic;
            out.topics.push({ topic_id: idFor('top', `${sectionPath}/${name}`, name), section_id, name, year_group: year, sort: ti + 1 });
          });
        });
      });
    }
    return out;
  }

  return { SEED, plan, idFor };
})();

export { Templates };
