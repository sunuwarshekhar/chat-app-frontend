import './CallModals.css';
import { PhoneIcon, VideoCallIcon } from './CallIcons';

interface IncomingCallModalProps {
  callerName: string;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallModal({
  callerName,
  callType,
  onAccept,
  onReject,
}: IncomingCallModalProps) {
  return (
    <div className='call-modal-overlay'>
      <div className='call-modal incoming-call-modal'>
        <div className='call-modal-avatar'>
          {callerName.charAt(0).toUpperCase()}
        </div>
        <p className='call-modal-name'>{callerName}</p>
        <p className='call-modal-status incoming-call-type'>
          Incoming{' '}
          {callType === 'video' ? (
            <>
              <VideoCallIcon size={18} className='incoming-call-icon' /> Video
            </>
          ) : (
            <>
              <PhoneIcon size={18} className='incoming-call-icon' /> Voice
            </>
          )}{' '}
          Call…
        </p>
        <div className='call-modal-actions'>
          <button
            type='button'
            className='call-btn reject-btn'
            onClick={onReject}
          >
            <span className='call-btn-icon'>✕</span>
            Decline
          </button>
          <button
            type='button'
            className='call-btn accept-btn'
            onClick={onAccept}
          >
            <span className='call-btn-icon'>✓</span>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
