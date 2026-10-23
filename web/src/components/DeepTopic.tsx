import { Suspense, use, useState } from 'react'
import type { TopicDetail, VizGuide } from '../data/types'
import { vizGuides } from '../data/details'
import { defineStrings, useLang, useStrings } from '../i18n'
import { CodeBlock } from './CodeBlock'
import { Md } from './Md'

export const SECTION_TITLES = {
  en: { explanation: 'Explanation', examples: 'Examples', 'real-case': 'Real-world case', pitfalls: 'Pitfalls', exercise: 'Exercise', interview: 'Interview questions' },
  id: { explanation: 'Penjelasan', examples: 'Contoh', 'real-case': 'Kasus nyata', pitfalls: 'Jebakan umum', exercise: 'Latihan', interview: 'Pertanyaan interview' },
} as const

const S = defineStrings({
  en: {
    examples: 'Examples',
    hint: 'Show hint',
    solution: 'Show solution (try first!)',
    answerAloud: "Answer out loud before moving on. If you can't explain it simply, re-read the explanation.",
    guide: 'Visualization guide',
    walk: 'Walkthrough',
    code: 'In real code',
    case: 'Real-world case',
    challenges: 'Challenges ({n})',
    tryThis: 'Try this',
    answer: 'Show answer',
    loadingGuide: 'Loading guide…',
  },
  id: {
    examples: 'Contoh',
    hint: 'Lihat petunjuk',
    solution: 'Lihat solusi (coba dulu sendiri!)',
    answerAloud: 'Jawab dengan suara keras sebelum lanjut. Kalau belum bisa menjelaskannya dengan sederhana, baca lagi penjelasannya.',
    guide: 'Panduan visualisasi',
    walk: 'Panduan langkah',
    code: 'Di kode nyata',
    case: 'Kasus nyata',
    challenges: 'Tantangan ({n})',
    tryThis: 'Coba ini',
    answer: 'Lihat jawaban',
    loadingGuide: 'Memuat panduan…',
  },
})

function Section({ id, icon, children }: { id: keyof (typeof SECTION_TITLES)['en']; icon: string; children: React.ReactNode }) {
  const lang = useLang()
  return (
    <section className="deep-section" id={id}>
      <h4>
        <span aria-hidden="true">{icon}</span> {SECTION_TITLES[lang][id]}
      </h4>
      {children}
    </section>
  )
}

function Examples({ examples }: { examples: TopicDetail['examples'] }) {
  const [i, setI] = useState(0)
  const s = useStrings(S)
  const ex = examples[i]
  if (!ex) return null
  return (
    <>
      {examples.length > 1 && (
        <div className="ex-tabs" role="tablist" aria-label={s('examples')}>
          {examples.map((e, j) => (
            <button key={j} role="tab" aria-selected={i === j} className={`btn sm${i === j ? ' primary' : ''}`} onClick={() => setI(j)}>
              {e.title}
            </button>
          ))}
        </div>
      )}
      <CodeBlock code={ex.code} title={ex.title} />
      <div className="muted">
        <Md text={ex.note} />
      </div>
    </>
  )
}

export function LessonBody({ detail }: { detail: TopicDetail }) {
  const s = useStrings(S)
  return (
    <>
      <Section id="explanation" icon="📘">
        <div className="lesson-prose">
          <Md text={detail.explanation} />
        </div>
      </Section>
      {detail.examples.length > 0 && (
        <Section id="examples" icon="💻">
          <Examples examples={detail.examples} />
        </Section>
      )}
      <Section id="real-case" icon="🏢">
        <div className="case">
          <h5>{detail.realCase.title}</h5>
          <Md text={detail.realCase.story} />
        </div>
      </Section>
      {detail.pitfalls.length > 0 && (
        <Section id="pitfalls" icon="⚠️">
          {detail.pitfalls.map((p, i) => (
            <div key={i} className="pitfall">
              <div>
                <Md text={p} />
              </div>
            </div>
          ))}
        </Section>
      )}
      <Section id="exercise" icon="🛠️">
        <div className="exercise">
          <Md text={detail.exercise.task} />
          <details className="reveal">
            <summary>{s('hint')}</summary>
            <Md text={detail.exercise.hint} />
          </details>
          <details className="reveal">
            <summary>{s('solution')}</summary>
            <Md text={detail.exercise.solution} />
          </details>
        </div>
      </Section>
      {detail.interview.length > 0 && (
        <Section id="interview" icon="🎤">
          <ol>
            {detail.interview.map((q, i) => (
              <li key={i}>
                <Md text={q} />
              </li>
            ))}
          </ol>
          <p className="subtle">{s('answerAloud')}</p>
        </Section>
      )}
    </>
  )
}

function GuideBody({ id }: { id: string }) {
  const lang = useLang()
  const s = useStrings(S)
  const g: VizGuide | undefined = use(vizGuides(lang))[id]
  const [tab, setTab] = useState<'walk' | 'code' | 'case' | 'challenges'>('walk')
  if (!g) return null
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="tabs" role="tablist" aria-label={s('guide')}>
        {(
          [
            ['walk', s('walk')],
            ['code', s('code')],
            ['case', s('case')],
            ['challenges', s('challenges', { n: g.challenges.length })],
          ] as const
        ).map(([k, label]) => (
          <button key={k} role="tab" className="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'walk' && (
        <>
          <Md text={g.whatYouSee} />
          <h4 className="md-h">{s('tryThis')}</h4>
          <ol>
            {g.steps.map((step, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                <Md text={step} />
              </li>
            ))}
          </ol>
        </>
      )}
      {tab === 'code' && <Md text={g.inCode} />}
      {tab === 'case' && (
        <div className="case">
          <h5>{g.realCase.title}</h5>
          <Md text={g.realCase.story} />
        </div>
      )}
      {tab === 'challenges' &&
        g.challenges.map((c, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <strong>
              {i + 1}. <Md text={c.q} />
            </strong>
            <details className="reveal">
              <summary>{s('answer')}</summary>
              <Md text={c.a} />
            </details>
          </div>
        ))}
    </div>
  )
}

export function VizGuidePanel({ id }: { id: string }) {
  const s = useStrings(S)
  return (
    <Suspense
      fallback={
        <p className="subtle" style={{ marginTop: 16 }}>
          {s('loadingGuide')}
        </p>
      }
    >
      <GuideBody id={id} />
    </Suspense>
  )
}
