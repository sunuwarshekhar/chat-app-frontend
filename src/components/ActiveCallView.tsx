import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  MicIcon,
  MicOffIcon,
  CameraIcon,
  CameraOffIcon,
  HangUpIcon,
} from './CallIcons';

interface ActiveCallViewProps {
  calleeName: string;
  callType: 'audio' | 'video';
  durationSeconds: number;
  isMuted: boolean;
  isVideoOff: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteStream: MediaStream | null;
  remoteTrackCount: number;
  onMute: () => void;
  onVideoToggle: () => void;
  onHangup: () => void;
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function ActiveCallView({
  calleeName,
  callType,
  durationSeconds,
  isMuted,
  isVideoOff,
  localVideoRef,
  remoteStream,
  remoteTrackCount,
  onMute,
  onVideoToggle,
  onHangup,
}: ActiveCallViewProps) {
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Video calls only: attach remote stream to the <video> element for the visual feed.
  // Audio is handled entirely inside useWebRTC via Web Audio API + a body-appended
  // <audio> element, so it works on mobile regardless of component mount timing.
  useEffect(() => {
    if (callType !== 'video') return;
    const el = remoteVideoRef.current;
    if (!el || !remoteStream) return;
    if (el.srcObject !== remoteStream) {
      el.srcObject = remoteStream;
    }
    // muted=false so the <video> element also plays audio (desktop fallback).
    // On mobile, the Web Audio API path in useWebRTC handles audio.
    el.muted = false;
    el.volume = 1;
    el.play().catch((err) => {
      console.warn('[ActiveCallView] video play() blocked:', err);
      const retry = () => {
        el.play().catch(console.warn);
      };
      document.addEventListener('pointerup', retry, { once: true });
    });
  }, [callType, remoteStream, remoteTrackCount]);

  const overlay = (
    <div className='call-modal-overlay call-modal-overlay--fullscreen'>
      <div className='call-modal active-call-modal'>
        {callType === 'video' ? (
          <div className='call-video-container'>
            {/*
              No key prop — stable element, srcObject updated imperatively.
              muted={false} attr must match the el.muted=false set in useEffect
              (React will warn if they diverge after mount).
            */}
            <video
              ref={remoteVideoRef}
              className='call-remote-video'
              autoPlay
              playsInline
              muted={false}
              title='Remote video'
            />
            <div className='call-local-pip-wrap'>
              <video
                ref={localVideoRef}
                className='call-local-pip'
                autoPlay
                muted
                playsInline
                title='You'
              />
              <span className='call-pip-label'>You</span>
            </div>
          </div>
        ) : (
          // Audio call — no <audio> element here.
          // Audio playback is managed entirely in useWebRTC (Web Audio API).
          <div className='call-audio-layout'>
            <div className='call-modal-avatar call-audio-avatar'>
              {calleeName.charAt(0).toUpperCase()}
            </div>
            <p className='call-modal-name'>{calleeName}</p>
          </div>
        )}

        <div
          className={`call-duration-container ${callType === 'audio' ? 'audio-duration' : 'video-duration'}`}
        >
          <p className='call-duration'>{formatDuration(durationSeconds)}</p>
        </div>

        <div className='call-modal-actions active-call-actions'>
          <button
            type='button'
            className={`call-control-btn ${isMuted ? 'active' : ''}`}
            onClick={onMute}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOffIcon size={22} /> : <MicIcon size={22} />}
          </button>
          {callType === 'video' && (
            <button
              type='button'
              className={`call-control-btn ${isVideoOff ? 'active' : ''}`}
              onClick={onVideoToggle}
              title={isVideoOff ? 'Start Video' : 'Stop Video'}
            >
              {isVideoOff ? (
                <CameraOffIcon size={22} />
              ) : (
                <CameraIcon size={22} />
              )}
            </button>
          )}
          <button
            type='button'
            className='call-btn end-btn'
            onClick={onHangup}
            title='Hang up'
          >
            <span className='call-btn-icon'>
              <HangUpIcon size={22} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
