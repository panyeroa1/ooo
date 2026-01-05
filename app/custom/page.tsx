import { videoCodecs } from 'livekit-client';
import { VideoConferenceClientImpl } from './VideoConferenceClientImpl';
import { isVideoCodec } from '@/lib/types';
import styles from '@/styles/SuccessClass.module.css';

export default async function CustomRoomConnection(props: {
  searchParams: Promise<{
    orbitUrl?: string;
    token?: string;
    codec?: string;
    singlePC?: string;
  }>;
}) {
  const { orbitUrl, token, codec, singlePC } = await props.searchParams;
  if (typeof orbitUrl !== 'string') {
    return <h2>Missing Orbit AI URL</h2>;
  }
  if (typeof token !== 'string') {
    return <h2>Missing Orbit AI token</h2>;
  }
  if (codec !== undefined && !isVideoCodec(codec)) {
    return <h2>Invalid codec, if defined it has to be [{videoCodecs.join(', ')}].</h2>;
  }

  return (
    <main data-lk-theme="default" className={styles.fullHeight}>
      <VideoConferenceClientImpl
        orbitUrl={orbitUrl}
        token={token}
        codec={codec}
        singlePeerConnection={singlePC === 'true'}
      />
    </main>
  );
}
