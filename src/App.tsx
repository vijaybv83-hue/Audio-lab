/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Home from './components/Home';
import TrimTool from './components/TrimTool';
import MergeTool from './components/MergeTool';
import SpeedTool from './components/SpeedTool';

export default function App() {
  const [tool, setTool] = useState<'home' | 'trim' | 'merge' | 'speed'>('home');

  return (
    <React.Fragment>
      {tool === 'home' && <Home onSelectTool={setTool} />}
      {tool === 'trim' && <TrimTool onBack={() => setTool('home')} />}
      {tool === 'merge' && <MergeTool onBack={() => setTool('home')} />}
      {tool === 'speed' && <SpeedTool onBack={() => setTool('home')} />}
    </React.Fragment>
  );
}
