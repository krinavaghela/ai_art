import React from 'react';
import {Composition} from 'remotion';
import {Scene, FPS, DURATION} from './scene/Scene';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="KituPaint" component={Scene} width={1920} height={1080} fps={FPS} durationInFrames={DURATION * FPS} />
  </>
);
