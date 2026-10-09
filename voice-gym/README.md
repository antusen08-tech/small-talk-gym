# Voice Gym · 声音与口齿训练

每天 5 分钟的发声与吐字训练。**独立应用**：与根目录的 Small Talk Gym 没有共享代码、数据库或导航，可单独开发、单独部署。

（"Voice Gym" 只是工作名，正式品牌名尚未决定。）

## 运行

```bash
cd voice-gym
npm install
npm run dev     # http://localhost:5174
npm run build
```

部署到 Vercel：新建项目，**Root Directory 设为 `voice-gym`**，框架选 Vite。无需任何环境变量。

## 结构

- `src/data/voiceLessons.js`：14 节课的内容（纯数据）。每节 = learn / timer / read / speak 若干步。增删课程只改这里。
- `src/components/VoiceLessonPlayer.jsx`：通用播放器，按 step 类型渲染，不为每节课写专用界面。
- `src/screens/VoiceScreen.jsx`：课程列表、今日一节、连续天数。
- `src/lib/voiceAnalysis.js`：分析纯函数（语速、清晰度、音量、句尾变弱、停顿）与反馈文案。
- `src/lib/useVoiceRecorder.js`：录音、实时音量、语音转文字（浏览器内完成，音频不上传）。
- `src/lib/voiceProgress.js`：进度存 `localStorage`，免登录即可每天打卡。

## 说明

- 语音转文字需要 Chrome / Edge；其他浏览器仍可录音并分析音量、句尾与停顿。
- 反馈是场景化观察，不打"对/错"分。
- 练习语言：每个 step 可设 `lang`（默认 `en-US`）；练中文发音时改成 `zh-CN` 并换文本。
