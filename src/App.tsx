/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Home from './components/Home';
import TrimTool from './components/TrimTool';
import MergeTool from './components/MergeTool';
import SpeedTool from './components/SpeedTool';
import EnhanceTool from './components/EnhanceTool';
import EffectsTool from './components/EffectsTool';
import LyricsTool from './components/LyricsTool';

export default function App() {
  const [tool, setTool] = useState<'home' | 'trim' | 'merge' | 'speed' | 'enhance' | 'effects' | 'lyrics'>('home');

  return (
    <React.Fragment>
      {tool === 'home' && <Home onSelectTool={setTool} />}
      {tool === 'trim' && <TrimTool onBack={() => setTool('home')} />}
      {tool === 'merge' && <MergeTool onBack={() => setTool('home')} />}
      {tool === 'speed' && <SpeedTool onBack={() => setTool('home')} />}
      {tool === 'enhance' && <EnhanceTool onBack={() => setTool('home')} />}
      {tool === 'effects' && <EffectsTool onBack={() => setTool('home')} />}
      {tool === 'lyrics' && <LyricsTool onBack={() => setTool('home')} />}
    </React.Fragment>
  );
}
