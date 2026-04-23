export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels = [];
  const sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit
  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([bufferArr], { type: 'audio/wav' });
}

export interface AudioFxConfig {
  reverb?: boolean;
  echo?: boolean;
  pitchShift?: number;
}

function createReverbImpulse(audioCtx: BaseAudioContext) {
  const duration = 2; // seconds
  const decay = 2.0;
  const sampleRate = audioCtx.sampleRate;
  const length = sampleRate * duration;
  const impulse = audioCtx.createBuffer(2, length, sampleRate);
  for (let c = 0; c < 2; c++) {
    const channelData = impulse.getChannelData(c);
    for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

export async function applyAudioFx(blob: Blob, fx: AudioFxConfig): Promise<Blob> {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = await audioCtx.decodeAudioData(arrayBuffer);
  
  const pitchRate = fx.pitchShift || 1.0;
  const renderedFrames = Math.ceil(buffer.length / pitchRate) + (fx.reverb || fx.echo ? audioCtx.sampleRate * 2 : 0);
  
  const offlineCtx = new OfflineAudioContext(buffer.numberOfChannels, renderedFrames, audioCtx.sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = pitchRate;
  
  let currentNode: AudioNode = source;

  // Echo Filter
  if (fx.echo) {
     const delayNode = offlineCtx.createDelay();
     delayNode.delayTime.value = 0.3;
     const feedbackGain = offlineCtx.createGain();
     feedbackGain.gain.value = 0.4;
     
     currentNode.connect(delayNode);
     delayNode.connect(feedbackGain);
     feedbackGain.connect(delayNode);
     
     const outputGain = offlineCtx.createGain();
     currentNode.connect(outputGain);
     delayNode.connect(outputGain);
     currentNode = outputGain;
  }

  // Reverb Filter
  if (fx.reverb) {
     const convolver = offlineCtx.createConvolver();
     convolver.buffer = createReverbImpulse(offlineCtx);
     
     const wetGain = offlineCtx.createGain();
     wetGain.gain.value = 0.5;
     const dryGain = offlineCtx.createGain();
     dryGain.gain.value = 0.8;
     
     currentNode.connect(convolver);
     convolver.connect(wetGain);
     currentNode.connect(dryGain);
     
     const outputGain = offlineCtx.createGain();
     dryGain.connect(outputGain);
     wetGain.connect(outputGain);
     currentNode = outputGain;
  }

  currentNode.connect(offlineCtx.destination);
  source.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  return audioBufferToWav(renderedBuffer);
}

export interface MixdownTrack {
  blob: Blob;
  volume: number;
  rate: number;
  preservePitch: boolean;
  isMuted: boolean;
}

export async function mixDownTracks(tracks: MixdownTrack[]): Promise<Blob> {
  const activeTracks = tracks.filter((t) => !t.isMuted);
  if (activeTracks.length === 0) throw new Error("No active tracks to mix.");

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const buffers = await Promise.all(
    activeTracks.map(async (t) => {
      const arrayBuffer = await t.blob.arrayBuffer();
      return audioCtx.decodeAudioData(arrayBuffer);
    })
  );

  const maxFrames = Math.max(
    ...buffers.map((b, i) => Math.ceil(b.length / activeTracks[i].rate))
  );

  if (maxFrames <= 0 || !isFinite(maxFrames)) {
    throw new Error("Invalid track lengths.");
  }

  const offlineCtx = new OfflineAudioContext(2, maxFrames, audioCtx.sampleRate);

  buffers.forEach((buffer, index) => {
    const track = activeTracks[index];
    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;
    
    // OfflineAudioContext interprets playbackRate natively as a pitch+speed shift.
    source.playbackRate.value = track.rate;

    const gainNode = offlineCtx.createGain();
    gainNode.gain.value = track.volume;

    source.connect(gainNode);
    gainNode.connect(offlineCtx.destination);
    source.start(0);
  });

  const renderedBuffer = await offlineCtx.startRendering();
  return audioBufferToWav(renderedBuffer);
}
