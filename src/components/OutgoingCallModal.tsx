import { PhoneIcon, VideoCallIcon } from './CallIcons';

function formatElapsed(secs: number): string {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

interface OutgoingCallModalProps {
  calleeName: string;
  callType: 'audio' | 'video';
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  outgoingElapsedSeconds: number;
  onCancel: () => void;
}

export function OutgoingCallModal({
  calleeName,
  callType,
  localVideoRef,
  outgoingElapsedSeconds,
  onCancel,
}: OutgoingCallModalProps) {
  const isAudio = callType === 'audio';
  return (
    <div className='call-modal-overlay'>
      <div
        className={`call-modal outgoing-call-modal ${isAudio ? 'outgoing-audio' : ''}`}
      >
        {callType === 'video' && (
          <video
            ref={localVideoRef}
            className='call-local-preview'
            autoPlay
            muted
            playsInline
          />
        )}
        <div className={isAudio ? 'outgoing-audio-card' : undefined}>
          <div className={isAudio ? 'outgoing-avatar-wrap' : undefined}>
            <div
              className={`call-modal-avatar ${isAudio ? 'outgoing-avatar' : ''}`}
            >
              {calleeName.charAt(0).toUpperCase()}
            </div>
          </div>
          <p className={`call-modal-name ${isAudio ? 'outgoing-name' : ''}`}>
            {calleeName}
          </p>
          <p className={isAudio ? 'outgoing-status' : 'call-modal-status'}>
            {isAudio ? (
              <>
                <span className='outgoing-status-label'>Calling…</span>
                <span className='outgoing-status-icon'>
                  {callType === 'video' ? (
                    <VideoCallIcon size={18} />
                  ) : (
                    <PhoneIcon size={18} />
                  )}
                </span>
              </>
            ) : (
              <>
                Calling…{' '}
                <VideoCallIcon size={18} className='outgoing-status-icon-svg' />
              </>
            )}
          </p>
          <div className='outgoing-duration-wrap'>
            <span className='outgoing-duration'>
              {formatElapsed(outgoingElapsedSeconds)}
            </span>
          </div>
          <div className='call-modal-actions'>
            <button
              type='button'
              className='call-btn end-btn'
              onClick={onCancel}
            >
              <span className='call-btn-icon'>✕</span>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
