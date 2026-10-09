import { useState } from 'react'
import { VoiceScreen } from './screens/VoiceScreen'
import { VoiceLessonPlayer } from './components/VoiceLessonPlayer'

export default function App() {
  const [lesson, setLesson] = useState(null)

  return (
    <div className="phone">
      {lesson ? (
        <VoiceLessonPlayer
          key={lesson.id}
          lesson={lesson}
          onFinish={() => setLesson(null)}
          onExit={() => setLesson(null)}
        />
      ) : (
        <VoiceScreen onOpenLesson={setLesson} />
      )}
    </div>
  )
}
