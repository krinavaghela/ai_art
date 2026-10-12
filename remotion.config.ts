import {Config} from '@remotion/cli/config';

// PNG frames keep the alpha channel; the npm scripts pick ProRes 4444 or VP9 to carry it.
Config.setVideoImageFormat('png');
Config.setConcurrency(3); // 8 GB RAM: more tabs crash Chrome on the filter-heavy frames
