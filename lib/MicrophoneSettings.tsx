import React from 'react';
import { useKrispNoiseFilter } from '@livekit/components-react/krisp';
import { TrackToggle } from '@livekit/components-react';
import { MediaDeviceMenu } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { isLowPowerDevice } from './client-utils';

export function MicrophoneSettings() {
  const { isNoiseFilterEnabled, setNoiseFilterEnabled, isNoiseFilterPending } = useKrispNoiseFilter(
    {
      filterOptions: {
        bufferOverflowMs: 100,
        bufferDropMs: 200,
        quality: isLowPowerDevice() ? 'low' : 'medium',
        onBufferDrop: () => {
          console.warn(
            'krisp buffer dropped, noise filter versions >= 0.3.2 will automatically disable the filter',
          );
        },
      },
    },
  );

  React.useEffect(() => {
    // enable Krisp by default on non-low power devices
    setNoiseFilterEnabled(!isLowPowerDevice());
  }, [setNoiseFilterEnabled]);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-semibold text-slate-300">Default Input</span>
        <section className="lk-button-group">
          <TrackToggle source={Track.Source.Microphone}>Microphone</TrackToggle>
          <div className="lk-button-group-menu">
            <MediaDeviceMenu kind="audioinput" />
          </div>
        </section>
      </div>

      <button
        className={`w-full py-2.5 px-4 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-widest ${
          isNoiseFilterEnabled 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
        }`}
        onClick={() => setNoiseFilterEnabled(!isNoiseFilterEnabled)}
        disabled={isNoiseFilterPending}
      >
        {isNoiseFilterPending ? 'Processing...' : (isNoiseFilterEnabled ? 'Disable Enhance' : 'Enable Enhance')}
      </button>
    </div>
  );
}
