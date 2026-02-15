insert into public.case_laws (title, court, judgment_date, summary, full_text)
values
  (
    'Sample Property Dispute Judgment',
    'Delhi High Court',
    '2021-08-14',
    'High Court discusses possession rights and admissibility of title documents.',
    'Full judgment sample text for development and testing of semantic search in LegalMitra.'
  ),
  (
    'Sample Consumer Protection Judgment',
    'Supreme Court of India',
    '2020-02-03',
    'Court clarifies deficiency in service standards under consumer law.',
    'Full judgment sample text for consumer protection matter used in Phase 4 demo dataset.'
  ),
  (
    'Sample Bail Principles Judgment',
    'Bombay High Court',
    '2022-11-09',
    'Court reiterates bail principles and proportionality in pre-trial detention.',
    'Full judgment sample text for bail jurisprudence and legal search demonstration.'
  )
on conflict do nothing;
