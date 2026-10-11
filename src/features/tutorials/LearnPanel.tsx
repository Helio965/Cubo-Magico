import { ChevronLeft, ChevronRight, Eye, Hand, Lightbulb, Play } from 'lucide-react';
import { Fragment, useState, type ReactNode } from 'react';
import { Panel } from '../../components/ui/controls';
import { guardAttempt } from '../../components/controls/guards';
import { demoSetup } from './demo';
import { loadDemo, playerPlay, setPlayerExpectUser } from '../../store/controller';
import { useUI } from '../../store/uiStore';
import { usePlayer } from '../player/playerStore';
import { LESSON_GROUPS, LESSONS, type LessonBlock, type LessonDemo } from './lessons';

/** Formatação inline mínima: **negrito** e `código`. */
function rich(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function Block({ block }: { block: LessonBlock }) {
  if ('p' in block) return <p>{rich(block.p)}</p>;
  if ('ul' in block)
    return (
      <ul>
        {block.ul.map((item, i) => (
          <li key={i}>{rich(item)}</li>
        ))}
      </ul>
    );
  if ('ol' in block)
    return (
      <ol>
        {block.ol.map((item, i) => (
          <li key={i}>{rich(item)}</li>
        ))}
      </ol>
    );
  return (
    <div className="callout is-info">
      <Lightbulb aria-hidden="true" />
      <span>{rich(block.tip)}</span>
    </div>
  );
}


function startDemo(lessonId: string, demo: LessonDemo, action: 'watch' | 'step' | 'do') {
  guardAttempt(() => {
    loadDemo({ size: demo.size, setup: demoSetup(demo), alg: demo.alg, title: demo.title, lessonId });
    if (action === 'watch') playerPlay();
    if (action === 'do') setPlayerExpectUser(true);
  }, 'Abrir a demonstração');
}

export function LearnPanel() {
  const [current, setCurrent] = useState(LESSONS[0].id);
  const highlight = useUI((s) => s.highlight);
  const playerTitle = usePlayer((s) => (s.active && s.kind === 'lesson' ? s.title : null));
  const index = LESSONS.findIndex((l) => l.id === current);
  const lesson = LESSONS[index];

  const go = (i: number) => {
    setCurrent(LESSONS[i].id);
    useUI.setState({ highlight: null });
    document.getElementById('lesson-content')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  return (
    <>
      <Panel index="01" title="Aprender a resolver" id="lessons">
        <p className="lead">Um percurso do zero ao método iniciante, com demonstrações diretamente no cubo 3D.</p>
        <nav className="lesson-nav" aria-label="Lições">
          {LESSON_GROUPS.map((group) => (
            <div key={group}>
              <div className="lesson-group-title micro">{group}</div>
              {LESSONS.filter((l) => l.group === group).map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className="lesson-link"
                  aria-current={l.id === current}
                  onClick={() => go(LESSONS.indexOf(l))}
                  data-testid={`lesson-${l.id}`}
                >
                  <span className="num">{String(LESSONS.indexOf(l) + 1).padStart(2, '0')}</span>
                  {l.title}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </Panel>
      <div id="lesson-content">
        <Panel index={String(index + 1).padStart(2, '0')} title={lesson.title}>
          <div className="lesson-body">
            {lesson.blocks.map((b, i) => (
              <Block key={i} block={b} />
            ))}
          </div>
          {lesson.highlights && (
            <div className="row row-wrap">
              {lesson.highlights.map((h) => {
                const active = highlight?.join() === h.kinds.join();
                return (
                  <button
                    key={h.label}
                    type="button"
                    className={`btn btn-sm ${active ? 'btn-primary' : ''}`}
                    aria-pressed={active}
                    onClick={() => useUI.setState({ highlight: active ? null : h.kinds })}
                  >
                    <Eye aria-hidden="true" /> {h.label}
                  </button>
                );
              })}
            </div>
          )}
          {lesson.demos?.map((demo) => (
            <div className="demo-box" key={demo.title}>
              <span className="micro">
                Demonstração · {demo.size}×{demo.size}
                {playerTitle === demo.title ? ' · carregada' : ''}
              </span>
              <code>{demo.alg}</code>
              {demo.caption && <p className="hint" style={{ marginBottom: 10 }}>{demo.caption}</p>}
              <div className="row row-wrap">
                <button type="button" className="btn btn-sm btn-primary" onClick={() => startDemo(lesson.id, demo, 'watch')} data-testid="demo-watch">
                  <Play aria-hidden="true" /> Assistir
                </button>
                <button type="button" className="btn btn-sm" onClick={() => startDemo(lesson.id, demo, 'step')}>
                  <ChevronRight aria-hidden="true" /> Passo a passo
                </button>
                <button type="button" className="btn btn-sm" onClick={() => startDemo(lesson.id, demo, 'do')}>
                  <Hand aria-hidden="true" /> Executar
                </button>
              </div>
            </div>
          ))}
          <div className="row row-between">
            <button type="button" className="btn btn-sm btn-ghost" disabled={index === 0} onClick={() => go(index - 1)}>
              <ChevronLeft aria-hidden="true" /> Anterior
            </button>
            <span className="micro">
              {index + 1} / {LESSONS.length}
            </span>
            <button type="button" className="btn btn-sm btn-ghost" disabled={index === LESSONS.length - 1} onClick={() => go(index + 1)}>
              Próxima <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </Panel>
      </div>
    </>
  );
}
