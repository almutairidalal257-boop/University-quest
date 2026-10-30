import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import { createGame } from './phaser/WorldScene';
import { useStore, bus } from './game/store';
import { game, ui, settings, isBlocking } from './game/state';
import { initLogic, refreshWorld } from './game/logic';
import { setVolumes, unlockAudio, sfx, loadVoices } from './game/audio';
import { HUD, Dialogue, Toasts, LocationBanner, RewardPopup, VocabCardModal, TouchControls } from './ui/hud';
import { MainMenu, TeamSetup, CreateCharacter, Intro, HowTo, SettingsPanel } from './ui/menus';
import { Backpack, Journal, Pause, Leaderboard, TeacherTools, jumpToMission } from './ui/panels';
import { FinalScreen } from './ui/final';
import { ListenSort, LinesGame, ProverbGame } from './ui/minigames/m1';
import { MatchGame, SentenceGame } from './ui/minigames/m2';
import { OrderGame, FormalGame, DetectiveGame } from './ui/minigames/m3';
import { FormGame, FolderGame, CheckGame } from './ui/minigames/m4';
import { BuildGame, ChooseGame, WriteGame, SubmitGame } from './ui/minigames/m5';

const GAMES: Record<string, () => JSX.Element> = {
  'm1-listen': ListenSort, 'm1-lines': LinesGame, 'm1-proverb': ProverbGame,
  'm2-match': MatchGame, 'm2-sentences': SentenceGame,
  'm3-order': OrderGame, 'm3-formal': FormalGame, 'm3-detective': DetectiveGame,
  'm4-form': FormGame, 'm4-folder': FolderGame, 'm4-check': CheckGame,
  'm5-build': BuildGame, 'm5-choose': ChooseGame, 'm5-write': WriteGame, 'm5-submit': SubmitGame,
};

let logicReady = false;

export default function App() {
  const u = useStore(ui);
  const st = useStore(settings);
  const host = useRef<HTMLDivElement>(null);
  const phaser = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!logicReady) { initLogic(); loadVoices(); logicReady = true; }
    if (host.current && !phaser.current) phaser.current = createGame(host.current);
    (window as any).__uq = { game, ui, bus, jumpToMission, refreshWorld };
  }, []);

  useEffect(() => { setVolumes({ musicOn: st.musicOn, sfxOn: st.sfxOn, music: st.music, sfx: st.sfx }); }, [st.musicOn, st.sfxOn, st.music, st.sfx]);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const s = ui.get();
      if (e.code === 'Escape') {
        if (s.vocabCard) ui.set({ vocabCard: null });
        else if (s.modal) ui.set({ modal: s.modal === 'settings' || s.modal === 'howto' || s.modal === 'teacher' || s.modal === 'leaderboard' ? (s.screen === 'play' ? 'pause' : null) : null });
        else if (s.minigame) ui.set({ minigame: null });
        else if (s.screen === 'play' && !s.dialogue) ui.set({ modal: 'pause' });
        return;
      }
      if (e.code === 'KeyM') { settings.set({ musicOn: !settings.get().musicOn }); return; }
      if (s.screen !== 'play' || isBlocking()) return;
      if (e.code === 'KeyB') { ui.set({ modal: 'backpack' }); sfx('open'); }
      if (e.code === 'KeyJ') { ui.set({ modal: 'journal' }); sfx('open'); }
      if (e.code === 'KeyH') bus.emit('hud-hint');
    };
    window.addEventListener('keydown', onKey);
    const first = () => unlockAudio();
    window.addEventListener('pointerdown', first, { once: true });
    window.addEventListener('keydown', first, { once: true });
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const Game = u.minigame ? GAMES[u.minigame.id] : null;
  const closeModal = () => ui.set({ modal: null });

  return (
    <div className="stage">
      <div className="phaser-host" ref={host} />
      <div className="ui-root">
        {u.screen === 'menu' && <MainMenu />}
        {u.screen === 'teamsetup' && <TeamSetup />}
        {u.screen === 'create' && <CreateCharacter />}
        {u.screen === 'intro' && <Intro />}
        {u.screen === 'play' && (
          <>
            <HUD />
            <LocationBanner />
            <TouchControls />
            <Dialogue />
            {Game && <Game key={u.minigame!.id + String(u.minigame!.replay)} />}
          </>
        )}
        {u.screen === 'final' && <FinalScreen />}
        <VocabCardModal />
        <RewardPopup />
        {u.modal === 'backpack' && <Backpack onClose={closeModal} />}
        {u.modal === 'journal' && <Journal onClose={closeModal} />}
        {u.modal === 'pause' && <Pause onClose={closeModal} />}
        {u.modal === 'howto' && <HowTo onClose={() => ui.set({ modal: ui.get().screen === 'play' ? 'pause' : null })} />}
        {u.modal === 'settings' && <SettingsPanel onClose={() => ui.set({ modal: ui.get().screen === 'play' ? 'pause' : null })} />}
        {u.modal === 'leaderboard' && <Leaderboard onClose={closeModal} />}
        {u.modal === 'teacher' && <TeacherTools onClose={closeModal} />}
        <Toasts />
        <div className="rotate-hint">🔄 Please rotate your device to landscape</div>
      </div>
    </div>
  );
}
