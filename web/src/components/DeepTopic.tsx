import { Suspense, use, useState } from 'react'
import type { TopicDetail, VizGuide } from '../data/types'
import { levelDetails, vizGuides } from '../data/details'
import { CodeBlock } from './CodeBlock'
import { Md } from './Md'

function Section({ id, icon, title, children }: { id: string; icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="deep-section" id={id}>
      <h4>
        <span aria-hidden="true">{icon}</span> {title}
      </h4>
      {children}
    </section>
  )
}

function Examples({ examples }: { examples: TopicDetail['examples'] }) {
  const [i, setI] = useState(0)
  const ex = examples[i]
  if (!ex) return null
  return (
    <>
      {examples.length > 1 && (
        <div className="ex-tabs" role="tablist" aria-label="Examples">
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
  return (
    <>
      <Section id="explanation" icon="📘" title="Explanation">
        <div className="lesson-prose">
          <Md text={detail.explanation} />
        </div>
      </Section>
      {detail.examples.length > 0 && (
        <Section id="examples" icon="💻" title="Examples">
          <Examples examples={detail.examples} />
        </Section>
      )}
      <Section id="real-case" icon="🏢" title="Real-world case">
        <div className="case">
          <h5>{detail.realCase.title}</h5>
          <Md text={detail.realCase.story} />
        </div>
      </Section>
      {detail.pitfalls.length > 0 && (
        <Section id="pitfalls" icon="⚠️" title="Pitfalls">
          {detail.pitfalls.map((p, i) => (
            <div key={i} className="pitfall">
              <div>
                <Md text={p} />
              </div>
            </div>
          ))}
        </Section>
      )}
      <Section id="exercise" icon="🛠️" title="Exercise">
        <div className="exercise">
          <Md text={detail.exercise.task} />
          <details className="reveal">
            <summary>Show hint</summary>
            <Md text={detail.exercise.hint} />
          </details>
          <details className="reveal">
            <summary>Show solution (try first!)</summary>
            <Md text={detail.exercise.solution} />
          </details>
        </div>
      </Section>
      {detail.interview.length > 0 && (
        <Section id="interview" icon="🎤" title="Interview questions">
          <ol>
            {detail.interview.map((q, i) => (
              <li key={i}>
                <Md text={q} />
              </li>
            ))}
          </ol>
          <p className="subtle">Answer out loud before moving on. If you can't explain it simply, re-read the explanation.</p>
        </Section>
      )}
    </>
  )
}

function Loaded({ level, topicId, fallback }: { level: number; topicId: string; fallback: string }) {
  const details = use(levelDetails(level))
  const d = details[topicId]
  return d ? <LessonBody detail={d} /> : <Md text={fallback} />
}

/** Full lesson: summary first (instant), then the deep content once the level's chunk loads. */
export function DeepTopic({ level, topicId, summary }: { level: number; topicId: string; summary: string }) {
  return (
    <>
      <div className="explain" style={{ marginTop: 0 }}>
        <strong>In short. </strong>
        <Md text={summary} />
      </div>
      <Suspense fallback={<p className="subtle">Loading the full lesson…</p>}>
        <Loaded level={level} topicId={topicId} fallback="" />
      </Suspense>
    </>
  )
}

function GuideBody({ id }: { id: string }) {
  const g: VizGuide | undefined = use(vizGuides())[id]
  const [tab, setTab] = useState<'walk' | 'code' | 'case' | 'challenges'>('walk')
  if (!g) return null
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="tabs" role="tablist" aria-label="Visualization guide">
        {(
          [
            ['walk', 'Walkthrough'],
            ['code', 'In real code'],
            ['case', 'Real-world case'],
            ['challenges', `Challenges (${g.challenges.length})`],
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
          <h4 className="md-h">Try this</h4>
          <ol>
            {g.steps.map((s, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                <Md text={s} />
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
              <summary>Show answer</summary>
              <Md text={c.a} />
            </details>
          </div>
        ))}
    </div>
  )
}

export function VizGuidePanel({ id }: { id: string }) {
  return (
    <Suspense fallback={<p className="subtle" style={{ marginTop: 16 }}>Loading guide…</p>}>
      <GuideBody id={id} />
    </Suspense>
  )
}
