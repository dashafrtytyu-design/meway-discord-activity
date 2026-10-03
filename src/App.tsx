import { useMemo, useState } from 'react'
import './App.css'
import { missions, type Mission } from './data'

type Page =
  | 'Главная'
  | 'Миссии'
  | 'Игры'
  | 'Квизы'
  | 'Слова'
  | 'Челленджи'
  | 'Награды'
  | 'Профиль'

const menu: { icon: string; name: Page }[] = [
  { icon: '🏠', name: 'Главная' },
  { icon: '🎯', name: 'Миссии' },
  { icon: '🎮', name: 'Игры' },
  { icon: '📝', name: 'Квизы' },
  { icon: '📚', name: 'Слова' },
  { icon: '🔥', name: 'Челленджи' },
  { icon: '🏆', name: 'Награды' },
  { icon: '👤', name: 'Профиль' },
]

const levelData = [
  { xp: 500, icon: '🌱', name: 'BEGINNER' },
  { xp: 1000, icon: '📚', name: 'LEARNER' },
  { xp: 2000, icon: '🔥', name: 'ACTIVE LEARNER' },
  { xp: 3000, icon: '⭐', name: 'ENGLISH EXPLORER' },
  { xp: 5000, icon: '👑', name: 'ENGLISH MASTER' },
  { xp: 10000, icon: '💎', name: 'MASTER ZONE' },
]

function Topbar({
  title,
  subtitle,
  xp,
}: {
  title: string
  subtitle: string
  xp: number
}) {
  return (
    <header className="topbar">
      <div>
        <p className="hello">{subtitle}</p>
        <h1>{title}</h1>
      </div>

      <div className="user">
        <div className="xp">⚡ {xp} XP</div>
        <div className="avatar">D</div>
      </div>
    </header>
  )
}

function Home({
  openPage,
  xp,
}: {
  openPage: (page: Page) => void
  xp: number
}) {
  const available = missions.filter((mission) => mission.status === 'published')

  return (
    <>
      <Topbar
        title="Привет, путешественник!"
        subtitle="Добро пожаловать в MEWAY ✈️"
        xp={xp}
      />

      <section className="hero">
        <div className="heroText">
          <div className="tag">ТВОЁ ПРИКЛЮЧЕНИЕ НАЧИНАЕТСЯ</div>

          <h2>
            Твой путь к <span>английскому</span>
            <br />
            начинается здесь
          </h2>

          <p>
            Выполняй миссии, изучай новые слова, проходи квизы, играй
            и получай XP. Каждый шаг приближает тебя к свободному английскому.
          </p>

          <div className="heroButtons">
            <button
              className="primary"
              onClick={() => openPage('Миссии')}
            >
              Начать путешествие →
            </button>

            <button
              className="secondary"
              onClick={() => openPage('Профиль')}
            >
              Мой прогресс
            </button>
          </div>
        </div>

        <div className="mascotCard">
          <div className="stars">✦　✧　✦</div>
          <div className="plane">✈️</div>

          <div className="bubble">
            <b>MEWAY</b>
            <span>Your way to English</span>
          </div>
        </div>
      </section>

      <section className="stats">
        <div className="statCard">
          <div className="statIcon blue">🎯</div>
          <div>
            <span>Доступно миссий</span>
            <strong>{available.length}</strong>
          </div>
        </div>

        <div className="statCard">
          <div className="statIcon purple">⚡</div>
          <div>
            <span>Всего XP</span>
            <strong>{xp}</strong>
          </div>
        </div>

        <div className="statCard">
          <div className="statIcon orange">🔥</div>
          <div>
            <span>Серия занятий</span>
            <strong>4 дня</strong>
          </div>
        </div>

        <div className="statCard">
          <div className="statIcon green">📚</div>
          <div>
            <span>Изучено слов</span>
            <strong>18</strong>
          </div>
        </div>
      </section>

      <div className="sectionTitle">
        <span>ПРОДОЛЖАЙ УЧИТЬСЯ</span>
        <h3>Что будем делать сегодня?</h3>
      </div>

      <section className="activities">
        <article className="activity">
          <div className="activityIcon">🎯</div>
          <span className="smallTag">МИССИИ</span>
          <h4>Продолжить обучение</h4>
          <p>Выбирай задания по уровню и получай XP за прохождение.</p>
          <button onClick={() => openPage('Миссии')}>
            Открыть миссии →
          </button>
        </article>

        <article className="activity">
          <div className="activityIcon">🧠</div>
          <span className="smallTag">КВИЗЫ</span>
          <h4>Проверь себя</h4>
          <p>Короткие тесты помогут закрепить изученный материал.</p>
          <button onClick={() => openPage('Квизы')}>
            Открыть квизы →
          </button>
        </article>

        <article className="activity">
          <div className="activityIcon">🎮</div>
          <span className="smallTag">ИГРЫ</span>
          <h4>Учись играя</h4>
          <p>Мини-игры для слов, грамматики и быстрого повторения.</p>
          <button onClick={() => openPage('Игры')}>
            Открыть игры →
          </button>
        </article>
      </section>
    </>
  )
}

function MissionsPage({
  xp,
  startMission,
}: {
  xp: number
  startMission: (mission: Mission) => void
}) {
  const [level, setLevel] = useState('Все')
  const [search, setSearch] = useState('')

  const published = useMemo(
    () =>
      missions.filter((mission) => {
        const isPublished = mission.status === 'published'
        const matchesLevel = level === 'Все' || mission.level === level
        const query = search.toLowerCase()

        const matchesSearch =
          mission.title.toLowerCase().includes(query) ||
          mission.category.toLowerCase().includes(query)

        return isPublished && matchesLevel && matchesSearch
      }),
    [level, search]
  )

  return (
    <>
      <Topbar
        title="Миссии"
        subtitle="MEWAY · Учись и получай XP ✈️"
        xp={xp}
      />

      <section className="missionHero">
        <div>
          <span className="missionEyebrow">ТВОЙ ПУТЬ К АНГЛИЙСКОМУ</span>

          <h2>
            Выбери следующую <span>миссию</span>
          </h2>

          <p>
            Проходи задания, проверяй знания и открывай новые уровни.
          </p>
        </div>

        <div className="missionHeroNumber">
          <strong>{published.length}</strong>
          <span>доступно сейчас</span>
        </div>
      </section>

      <section className="missionControls">
        <input
          type="text"
          placeholder="🔎 Поиск миссий..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="levelFilters">
          {['Все', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((item) => (
            <button
              key={item}
              className={level === item ? 'filterActive' : ''}
              onClick={() => setLevel(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="missionGrid">
        {published.map((mission) => (
          <article className="missionCard" key={mission.id}>
            <div className="missionCardTop">
              <div className="missionIcon">{mission.icon}</div>
              <div className="missionXP">⚡ +{mission.xp} XP</div>
            </div>

            <div className="missionMeta">
              <span className="levelPill">{mission.level}</span>
              <span>{mission.category}</span>
            </div>

            <h3>{mission.title}</h3>
            <p>{mission.description}</p>

            <div className="missionInfo">
              <span>🕐 {mission.duration}</span>
              <span>📝 {mission.tasks.length} заданий</span>
            </div>

            <button
              className="missionStart"
              disabled={mission.tasks.length === 0}
              onClick={() => startMission(mission)}
            >
              {mission.tasks.length > 0 ? 'Начать миссию →' : 'Скоро'}
            </button>
          </article>
        ))}
      </section>

      {published.length === 0 && (
        <div className="emptyState">
          <div>🔍</div>
          <h3>Ничего не найдено</h3>
          <p>Попробуй изменить уровень или поисковый запрос.</p>
        </div>
      )}
    </>
  )
}

function MissionPlayer({
  mission,
  onBack,
  onComplete,
}: {
  mission: Mission
  onBack: () => void
  onComplete: (xp: number) => void
}) {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selected, setSelected] = useState('')
  const [checked, setChecked] = useState(false)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)

  const question = mission.tasks[questionIndex]
  const isCorrect = selected === question?.correctAnswer

  function checkAnswer() {
    if (!selected || checked) return

    setChecked(true)

    if (selected === question.correctAnswer) {
      setScore((value) => value + 1)
    }
  }

  function nextQuestion() {
    if (questionIndex + 1 >= mission.tasks.length) {
      setFinished(true)
      return
    }

    setQuestionIndex((value) => value + 1)
    setSelected('')
    setChecked(false)
  }

  if (finished) {
    const percent = Math.round((score / mission.tasks.length) * 100)

    return (
      <>
        <Topbar
          title="Миссия завершена!"
          subtitle="MEWAY · Отличная работа ✨"
          xp={0}
        />

        <section className="resultCard">
          <div className="resultIcon">🏆</div>
          <span className="smallTag">РЕЗУЛЬТАТ</span>
          <h2>{mission.title}</h2>

          <div className="resultScore">{percent}%</div>

          <p>
            Правильных ответов: <b>{score}</b> из{' '}
            <b>{mission.tasks.length}</b>
          </p>

          <div className="earnedXP">
            ⚡ Награда: +{mission.xp} XP
          </div>

          <button
            className="primaryAction"
            onClick={() => {
              onComplete(mission.xp)
              onBack()
            }}
          >
            Получить XP и продолжить →
          </button>
        </section>
      </>
    )
  }

  return (
    <>
      <Topbar
        title={mission.title}
        subtitle={`Миссия · ${mission.level} · ${mission.category}`}
        xp={0}
      />

      <section className="quizShell">
        <button className="backButton" onClick={onBack}>
          ← Вернуться к миссиям
        </button>

        <div className="questionProgress">
          <div>
            <span>
              Вопрос {questionIndex + 1} из {mission.tasks.length}
            </span>
            <b>+{mission.xp} XP</b>
          </div>

          <div className="questionProgressBar">
            <div
              style={{
                width: `${
                  ((questionIndex + 1) / mission.tasks.length) * 100
                }%`,
              }}
            />
          </div>
        </div>

        <article className="questionCard">
          <div className="questionIcon">{mission.icon}</div>

          <span className="smallTag">{mission.category}</span>
          <h2>{question.question}</h2>

          <div className="answers">
            {question.options.map((option, index) => {
              let className = 'answerButton'

              if (selected === option) {
                className += ' selectedAnswer'
              }

              if (checked && option === question.correctAnswer) {
                className += ' correctAnswer'
              }

              if (
                checked &&
                selected === option &&
                option !== question.correctAnswer
              ) {
                className += ' wrongAnswer'
              }

              return (
                <button
                  key={option}
                  className={className}
                  disabled={checked}
                  onClick={() => setSelected(option)}
                >
                  <span>{String.fromCharCode(65 + index)}</span>
                  {option}
                </button>
              )
            })}
          </div>

          {!checked ? (
            <button
              className="primaryAction"
              disabled={!selected}
              onClick={checkAnswer}
            >
              Проверить ответ
            </button>
          ) : (
            <>
              <div className={isCorrect ? 'feedback correct' : 'feedback wrong'}>
                <strong>
                  {isCorrect ? '✓ Правильно!' : 'Попробуем запомнить'}
                </strong>
                <p>{question.explanation}</p>
              </div>

              <button className="primaryAction" onClick={nextQuestion}>
                {questionIndex + 1 === mission.tasks.length
                  ? 'Посмотреть результат →'
                  : 'Следующий вопрос →'}
              </button>
            </>
          )}
        </article>
      </section>
    </>
  )
}

function PlaceholderPage({
  page,
  xp,
}: {
  page: Exclude<Page, 'Главная' | 'Миссии' | 'Профиль'>
  xp: number
}) {
  const info = {
    Игры: ['🎮', 'Игры', 'Учись английскому через интерактивные мини-игры.'],
    Квизы: ['📝', 'Квизы', 'Проверяй знания в быстрых тематических квизах.'],
    Слова: ['📚', 'Слова', 'Изучай новую лексику и повторяй изученные слова.'],
    Челленджи: ['🔥', 'Челленджи', 'Выполняй ежедневные и недельные испытания.'],
    Награды: ['🏆', 'Награды', 'Открывай достижения за свой прогресс.'],
  }[page]

  return (
    <>
      <Topbar
        title={info[1]}
        subtitle="MEWAY · Your way to English"
        xp={xp}
      />

      <section className="comingPage">
        <div>{info[0]}</div>
        <span className="smallTag">MEWAY</span>
        <h2>{info[1]}</h2>
        <p>{info[2]}</p>

        <div className="comingBadge">
          Этот раздел мы подключим следующим этапом
        </div>
      </section>
    </>
  )
}

function ProfilePage({
  xp,
  nickname,
  setNickname,
}: {
  xp: number
  nickname: string
  setNickname: (value: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(nickname)

  const nextLevel =
    levelData.find((level) => xp < level.xp) ??
    levelData[levelData.length - 1]

  return (
    <>
      <Topbar
        title="Профиль"
        subtitle="MEWAY · Твой прогресс"
        xp={xp}
      />

      <section className="profileCard">
        <div className="profileAvatar">D</div>

        <div className="profileIdentity">
          <span className="smallTag">УЧЕНИК MEWAY</span>

          {editing ? (
            <div className="nicknameEditor">
              <input
                value={draftName}
                maxLength={24}
                onChange={(event) => setDraftName(event.target.value)}
              />

              <button
                onClick={() => {
                  const clean = draftName.trim()

                  if (clean) {
                    setNickname(clean)
                    setEditing(false)
                  }
                }}
              >
                Сохранить
              </button>
            </div>
          ) : (
            <>
              <h2>{nickname}</h2>
              <button
                className="editProfile"
                onClick={() => setEditing(true)}
              >
                ✏️ Изменить профиль
              </button>
            </>
          )}
        </div>
      </section>

      <section className="profileStats">
        <article>
          <span>⚡ XP</span>
          <strong>{xp}</strong>
        </article>

        <article>
          <span>🌱 Следующий уровень</span>
          <strong>{nextLevel.name}</strong>
        </article>

        <article>
          <span>🔥 Серия</span>
          <strong>4 дня</strong>
        </article>
      </section>

      <section className="levelsCard">
        <span className="smallTag">УРОВНИ MEWAY</span>
        <h3>Твой путь развития</h3>

        <div className="levelList">
          {levelData.map((level) => (
            <div
              className={`levelRow ${
                xp >= level.xp ? 'levelUnlocked' : ''
              }`}
              key={level.name}
            >
              <span className="levelEmoji">{level.icon}</span>

              <div>
                <strong>{level.name}</strong>
                <small>{level.xp} XP</small>
              </div>

              <b>{xp >= level.xp ? '✓' : '🔒'}</b>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

function App() {
  const [activePage, setActivePage] = useState<Page>('Главная')
  const [activeMission, setActiveMission] = useState<Mission | null>(null)
  const [xp, setXp] = useState(120)
  const [nickname, setNickname] = useState('Путешественник')

  function openPage(page: Page) {
    setActiveMission(null)
    setActivePage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function completeMission(reward: number) {
    setXp((value) => value + reward)
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <button
          className="logo logoButton"
          onClick={() => openPage('Главная')}
        >
          <div className="logoPlane">✈</div>

          <div>
            <strong>MEWAY</strong>
            <span>Your way to English</span>
          </div>
        </button>

        <nav>
          {menu.map((item) => (
            <button
              key={item.name}
              className={`navItem ${
                activePage === item.name && !activeMission ? 'active' : ''
              }`}
              onClick={() => openPage(item.name)}
            >
              <span>{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>

        <div className="sidebarBottom">
          <div className="levelBadge">🌱 BEGINNER</div>

          <div className="miniProgress">
            <div className="miniProgressTop">
              <span>Ваш прогресс</span>
              <b>{xp} / 500 XP</b>
            </div>

            <div className="progressBar">
              <div
                className="progressFill"
                style={{ width: `${Math.min((xp / 500) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </aside>

      <main className="content">
        {activeMission ? (
          <MissionPlayer
            mission={activeMission}
            onBack={() => setActiveMission(null)}
            onComplete={completeMission}
          />
        ) : activePage === 'Главная' ? (
          <Home openPage={openPage} xp={xp} />
        ) : activePage === 'Миссии' ? (
          <MissionsPage
            xp={xp}
            startMission={(mission) => {
              setActiveMission(mission)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        ) : activePage === 'Профиль' ? (
          <ProfilePage
            xp={xp}
            nickname={nickname}
            setNickname={setNickname}
          />
        ) : (
          <PlaceholderPage page={activePage} xp={xp} />
        )}
      </main>
    </div>
  )
}

export default App