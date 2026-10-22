import { useState } from 'react'
import { Note, Segmented, StepControls, useStepper } from './common'

type Step = { line: number; stack: string[]; micro: string[]; macro: string[]; out: string[]; note: string }

const SCENARIOS: Record<string, { code: string[]; steps: Step[] }> = {
  basic: {
    code: [
      "console.log('A')",
      "setTimeout(() => console.log('B'), 0)",
      "Promise.resolve().then(() => console.log('C'))",
      "queueMicrotask(() => console.log('D'))",
      "console.log('E')",
    ],
    steps: [
      { line: -1, stack: ['main()'], micro: [], macro: [], out: [], note: 'The script starts running on the call stack.' },
      { line: 0, stack: ['main()', "log('A')"], micro: [], macro: [], out: ['A'], note: 'Synchronous log runs immediately.' },
      { line: 1, stack: ['main()', 'setTimeout'], micro: [], macro: ['timer → log B'], out: ['A'], note: 'setTimeout hands its callback to the timer queue (a macrotask). Even 0 ms means "later".' },
      { line: 2, stack: ['main()', 'then'], micro: ['then → log C'], macro: ['timer → log B'], out: ['A'], note: 'A resolved Promise schedules its callback as a microtask.' },
      { line: 3, stack: ['main()', 'queueMicrotask'], micro: ['then → log C', 'micro → log D'], macro: ['timer → log B'], out: ['A'], note: 'queueMicrotask adds another microtask, in order.' },
      { line: 4, stack: ['main()', "log('E')"], micro: ['then → log C', 'micro → log D'], macro: ['timer → log B'], out: ['A', 'E'], note: 'Still synchronous: E prints before any queued work.' },
      { line: -1, stack: [], micro: ['then → log C', 'micro → log D'], macro: ['timer → log B'], out: ['A', 'E'], note: 'Stack is empty. The event loop now drains ALL microtasks before any macrotask.' },
      { line: -1, stack: ["log('C')"], micro: ['micro → log D'], macro: ['timer → log B'], out: ['A', 'E', 'C'], note: 'First microtask runs.' },
      { line: -1, stack: ["log('D')"], micro: [], macro: ['timer → log B'], out: ['A', 'E', 'C', 'D'], note: 'Second microtask runs. Microtask queue is empty.' },
      { line: -1, stack: ["log('B')"], micro: [], macro: [], out: ['A', 'E', 'C', 'D', 'B'], note: 'Only now does the loop take ONE macrotask: the timer callback.' },
      { line: -1, stack: [], micro: [], macro: [], out: ['A', 'E', 'C', 'D', 'B'], note: 'Final order: A E C D B. Sync → microtasks → macrotasks.' },
    ],
  },
  async: {
    code: [
      'async function load() {',
      "  console.log('1')",
      '  await null',
      "  console.log('3')",
      '}',
      'load()',
      "setTimeout(() => console.log('4'))",
      "console.log('2')",
    ],
    steps: [
      { line: 5, stack: ['main()', 'load()'], micro: [], macro: [], out: [], note: 'Calling an async function runs its body synchronously until the first await.' },
      { line: 1, stack: ['main()', 'load()', "log('1')"], micro: [], macro: [], out: ['1'], note: '1 prints synchronously.' },
      { line: 2, stack: ['main()', 'load()'], micro: ['resume load()'], macro: [], out: ['1'], note: 'await pauses load(); the rest of the function is scheduled as a microtask.' },
      { line: 6, stack: ['main()', 'setTimeout'], micro: ['resume load()'], macro: ['timer → log 4'], out: ['1'], note: 'Timer callback goes to the macrotask queue.' },
      { line: 7, stack: ['main()', "log('2')"], micro: ['resume load()'], macro: ['timer → log 4'], out: ['1', '2'], note: 'Back in main: 2 prints.' },
      { line: 3, stack: ['load()', "log('3')"], micro: [], macro: ['timer → log 4'], out: ['1', '2', '3'], note: 'Stack empty → microtasks first: load() resumes after await.' },
      { line: -1, stack: ["log('4')"], micro: [], macro: [], out: ['1', '2', '3', '4'], note: 'Then the timer macrotask. Order: 1 2 3 4.' },
    ],
  },
}

export default function EventLoop() {
  const [key, setKey] = useState<'basic' | 'async'>('basic')
  const sc = SCENARIOS[key]!
  const s = useStepper(sc.steps.length)
  const st = sc.steps[s.i]!

  return (
    <div>
      <Segmented
        label="Scenario"
        value={key}
        onChange={v => {
          setKey(v)
          s.reset()
        }}
        options={[
          { value: 'basic', label: 'Timers vs Promises' },
          { value: 'async', label: 'async / await' },
        ]}
      />
      <StepControls s={s} total={sc.steps.length} />
      <div className="viz-stage">
        <div className="grid cols-2" style={{ gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)' }}>
          <div className="lane">
            <h4>Code</h4>
            {sc.code.map((l, i) => (
              <div key={i} className={`code-line${st.line === i ? ' hl' : ''}`}>
                {l}
              </div>
            ))}
          </div>
          <div className="lane">
            <h4>Console output</h4>
            {st.out.map((o, i) => (
              <div key={i} className="chip o">
                {o}
              </div>
            ))}
          </div>
        </div>
        <div className="grid cols-3" style={{ marginTop: 12 }}>
          <div className="lane">
            <h4>Call stack (top ↑)</h4>
            <div style={{ display: 'flex', flexDirection: 'column-reverse' }}>
              {st.stack.map((f, i) => (
                <div key={f + i} className="chip a">
                  {f}
                </div>
              ))}
            </div>
          </div>
          <div className="lane">
            <h4>Microtask queue</h4>
            {st.micro.map(m => (
              <div key={m} className="chip v">
                {m}
              </div>
            ))}
          </div>
          <div className="lane">
            <h4>Macrotask queue</h4>
            {st.macro.map(m => (
              <div key={m} className="chip w">
                {m}
              </div>
            ))}
          </div>
        </div>
      </div>
      <Note>{st.note}</Note>
    </div>
  )
}
