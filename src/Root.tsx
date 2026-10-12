import React from 'react';
import {AbsoluteFill, Composition} from 'remotion';
import {Scene, FPS, DURATION} from './scene/Scene';

// Same film on warm paper, for players that can't show video transparency (Safari, mobile).
const OnPaper: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#f7f2e8'}}>
    <Scene />
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="CatPaint" component={Scene} width={1920} height={1080} fps={FPS} durationInFrames={DURATION * FPS} />
    <Composition id="CatPaintOnPaper" component={OnPaper} width={1920} height={1080} fps={FPS} durationInFrames={DURATION * FPS} />
  </>
);
