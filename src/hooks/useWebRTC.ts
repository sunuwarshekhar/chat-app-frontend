import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

export type CallType = 'audio' | 'video';

export type CallState = 'idle' | 'outgoing' | 'incoming' | 'active';

export interface IncomingCallInfo {
  callId: string;
  callerId: string;
  callerName: string;
  conversationId: string;
  type: CallType;
}

interface UseWebRTCOptions {
  socket: Socket | null;
}

function getIceServers(): RTCIceServer[] {
  const disableTurn =
    import.meta.env.VITE_TURN_DISABLE === '1' ||
    import.meta.env.VITE_TURN_DISABLE === 'true';
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];
  if (!disableTurn) {
    const turnUrl = import.meta.env.VITE_TURN_URL;
    const turnUser = import.meta.env.VITE_TURN_USERNAME;
    const turnCred = import.meta.env.VITE_TURN_CREDENTIAL;
    if (turnUrl?.trim() && turnUser?.trim() && turnCred?.trim()) {
      for (const url of turnUrl
        .split(',')
        .map((u: string) => u.trim())
        .filter(Boolean)) {
        servers.push({
          urls: url,
          username: turnUser.trim(),
          credential: turnCred.trim(),
        });
      }
    }
  }
  return servers;
}

export function useWebRTC({ socket }: UseWebRTCOptions) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [callType, setCallType] = useState<CallType>('audio');
  const [callId, setCallId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(
    null,
  );
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const [outgoingElapsedSeconds, setOutgoingElapsedSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteTrackCount, setRemoteTrackCount] = useState(0);
  const [remotePeerName, setRemotePeerName] = useState<string>('User');

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const outgoingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const callTypeRef = useRef<CallType>('audio');
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // Queued offer — arrives before acceptCall() sets up the PC
  const pendingOfferRef = useRef<{
    callId: string;
    sdp: RTCSessionDescriptionInit;
  } | null>(null);

  const log = (msg: string, ...args: unknown[]) =>
    console.log(`%c[WebRTC] ${msg}`, 'color:#6366f1;font-weight:bold', ...args);

  const ensureAudioEl = useCallback(() => {
    if (!audioElRef.current) {
      const el = document.createElement('audio');
      el.autoplay = true;
      el.muted = false;
      el.volume = 1;
      el.style.display = 'none';
      document.body.appendChild(el);
      audioElRef.current = el;
      log('Created hidden <audio> element');
    }
    return audioElRef.current;
  }, []);

  const playStream = useCallback(
    (stream: MediaStream) => {
      const el = ensureAudioEl();
      log(
        'playStream() — tracks:',
        stream
          .getTracks()
          .map((t) => `${t.kind}(${t.readyState})`)
          .join(', '),
      );
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.muted = false;
      el.volume = 1;
      el.play()
        .then(() => log('audio.play() resolved ✓'))
        .catch((err) => {
          log(
            'audio.play() blocked:',
            err.name,
            '— retrying on next interaction',
          );
          const retry = () => el.play().catch((e) => log('Retry failed:', e));
          document.addEventListener('pointerup', retry, { once: true });
          document.addEventListener('click', retry, { once: true });
        });
    },
    [ensureAudioEl],
  );

  const cleanup = useCallback(() => {
    log('cleanup()');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (outgoingTimerRef.current) {
      clearInterval(outgoingTimerRef.current);
      outgoingTimerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
      audioElRef.current.pause();
      audioElRef.current.remove();
      audioElRef.current = null;
    }
    pendingOfferRef.current = null;
    remoteStreamRef.current = null;
    setRemoteStream(null);
    setRemoteTrackCount(0);
    setCallState('idle');
    setCallId(null);
    setIncomingCall(null);
    setCallDurationSeconds(0);
    setOutgoingElapsedSeconds(0);
    iceCandidateQueueRef.current = [];
    setIsMuted(false);
    setIsVideoOff(false);
    setRemotePeerName('User');
  }, []);

  const startTimer = useCallback(() => {
    setCallDurationSeconds(0);
    timerRef.current = setInterval(
      () => setCallDurationSeconds((s) => s + 1),
      1000,
    );
  }, []);

  const createPeerConnection = useCallback(
    (cid: string, type: CallType) => {
      if (!socket) return null;
      log(`createPeerConnection() callId=${cid} type=${type}`);
      const pc = new RTCPeerConnection({
        iceServers: getIceServers(),
        iceCandidatePoolSize: 10,
      });

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          log('Sending ICE candidate');
          socket.emit('call_ice_candidate', {
            callId: cid,
            candidate: e.candidate,
          });
        } else {
          log('ICE gathering complete');
        }
      };

      pc.onicegatheringstatechange = () =>
        log('iceGatheringState:', pc.iceGatheringState);
      pc.oniceconnectionstatechange = () =>
        log('iceConnectionState:', pc.iceConnectionState);
      pc.onsignalingstatechange = () =>
        log('signalingState:', pc.signalingState);

      pc.ontrack = (e) => {
        log(`ontrack — kind=${e.track.kind} readyState=${e.track.readyState}`);
        if (!remoteStreamRef.current)
          remoteStreamRef.current = new MediaStream();
        const stream = remoteStreamRef.current;
        if (!stream.getTracks().find((t) => t.id === e.track.id)) {
          stream.addTrack(e.track);
        }
        const snap = new MediaStream(stream.getTracks());
        remoteStreamRef.current = snap;
        setRemoteStream(snap);
        setRemoteTrackCount(snap.getTracks().length);
        playStream(snap);
      };

      pc.onconnectionstatechange = () => {
        log('connectionState:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setCallState('active');
          startTimer();
          if (remoteStreamRef.current) playStream(remoteStreamRef.current);
          setTimeout(() => {
            void pc.getStats().then((stats) => {
              stats.forEach((r) => {
                if (r.type === 'inbound-rtp') {
                  const s = r as RTCInboundRtpStreamStats;
                  log(
                    `inbound-rtp kind=${s.kind} bytesReceived=${s.bytesReceived}`,
                  );
                }
              });
            });
          }, 1000);
        } else if (
          ['disconnected', 'failed', 'closed'].includes(pc.connectionState)
        ) {
          cleanup();
        }
      };

      return pc;
    },
    [socket, cleanup, startTimer, playStream],
  );

  const drainIceCandidateQueue = useCallback(async (pc: RTCPeerConnection) => {
    const queue = iceCandidateQueueRef.current;
    iceCandidateQueueRef.current = [];
    log(`Draining ${queue.length} queued ICE candidates`);
    for (const c of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (err) {
        log('queued addIceCandidate failed:', err);
      }
    }
  }, []);

  const addIceCandidateOrQueue = useCallback(
    async (pc: RTCPeerConnection, candidate: RTCIceCandidateInit) => {
      if (pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          log('addIceCandidate failed:', err);
        }
      } else {
        log('Queuing ICE candidate (no remoteDescription yet)');
        iceCandidateQueueRef.current.push(candidate);
      }
    },
    [],
  );

  const getLocalStream = useCallback(async (type: CallType) => {
    log(`getLocalStream() type=${type}`);
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video',
    });
    log(
      'Got local stream — tracks:',
      stream
        .getTracks()
        .map((t) => `${t.kind}(${t.readyState})`)
        .join(', '),
    );
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  }, []);

  const startCall = useCallback(
    async (conversationId: string, type: CallType, calleeName?: string) => {
      if (!socket || callState !== 'idle') return;
      log(`startCall() type=${type}`);
      callTypeRef.current = type;
      setCallType(type);
      setRemotePeerName(calleeName ?? 'User');
      socket.emit('call_initiate', { conversationId, type });
    },
    [socket, callState],
  );

  const acceptCall = useCallback(async () => {
    if (!socket || !incomingCall) return;
    const { callId: cid, type, callerName } = incomingCall;
    log(`acceptCall() callId=${cid} type=${type}`);

    setCallState('outgoing');
    setCallType(type);
    callTypeRef.current = type;
    setCallId(cid);
    setRemotePeerName(callerName);
    socket.emit('call_accept', { callId: cid });

    remoteStreamRef.current = new MediaStream();

    const pc = createPeerConnection(cid, type);
    if (!pc) return;
    pcRef.current = pc;

    const stream = await getLocalStream(type);
    localStreamRef.current = stream;
    stream.getTracks().forEach((t) => {
      log(`Adding local ${t.kind} track to PC`);
      pc.addTrack(t, stream);
    });

    // Process offer that arrived before the PC was ready
    const pending = pendingOfferRef.current;
    if (pending && pending.callId === cid) {
      log('Processing queued offer now that PC is ready');
      pendingOfferRef.current = null;
      await pc.setRemoteDescription(new RTCSessionDescription(pending.sdp));
      log('Set remote description (queued offer)');
      await drainIceCandidateQueue(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      log('Sending answer SDP (from queued offer)');
      socket.emit('call_answer', { callId: cid, sdp: pc.localDescription });
    }
  }, [
    socket,
    incomingCall,
    createPeerConnection,
    getLocalStream,
    drainIceCandidateQueue,
  ]);

  const rejectCall = useCallback(() => {
    if (!socket || !incomingCall) return;
    socket.emit('call_reject', { callId: incomingCall.callId });
    cleanup();
  }, [socket, incomingCall, cleanup]);

  const endCall = useCallback(() => {
    if (!socket) return;
    if (callId) socket.emit('call_end', { callId });
    cleanup();
  }, [socket, callId, cleanup]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((m) => !m);
  }, []);

  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsVideoOff((v) => !v);
  }, []);

  useEffect(() => {
    if (!socket) return;
    log('Registering socket event listeners');

    const onCallInitiated = ({ callId: cid }: { callId: string }) => {
      log(`← call_initiated callId=${cid}`);
      setCallId(cid);
      setCallState('outgoing');
      void (async () => {
        const type = callTypeRef.current;
        remoteStreamRef.current = new MediaStream();

        const pc = createPeerConnection(cid, type);
        if (!pc) {
          log('ERROR: createPeerConnection returned null');
          return;
        }
        pcRef.current = pc;

        const stream = await getLocalStream(type);
        localStreamRef.current = stream;
        stream.getTracks().forEach((t) => {
          log(`Adding local ${t.kind} track to PC`);
          pc.addTrack(t, stream);
        });

        log('Creating offer...');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        log('Sending offer SDP');
        socket.emit('call_offer', { callId: cid, sdp: pc.localDescription });
      })();
    };

    const onCallIncoming = (data: IncomingCallInfo) => {
      log(`← call_incoming callId=${data.callId} from=${data.callerName}`);
      setIncomingCall(data);
      setRemotePeerName(data.callerName);
      setCallState('incoming');
    };

    const onCallAccepted = ({ callId: cid }: { callId: string }) => {
      log(`← call_accepted callId=${cid}`);
    };

    const onCallOffer = ({
      callId: cid,
      sdp,
    }: {
      callId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      log(`← call_offer callId=${cid}`);
      const pc = pcRef.current;
      if (!pc) {
        // PC not ready yet — callee hasn't tapped Accept. Queue the offer.
        log('PC not ready, queuing offer until acceptCall()');
        pendingOfferRef.current = { callId: cid, sdp };
        return;
      }
      void (async () => {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        log('Set remote description (offer)');
        await drainIceCandidateQueue(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        log('Sending answer SDP');
        socket.emit('call_answer', { callId: cid, sdp: pc.localDescription });
      })();
    };

    const onCallAnswer = ({
      callId: cid,
      sdp,
    }: {
      callId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      log(`← call_answer callId=${cid}`);
      void (async () => {
        const pc = pcRef.current;
        if (!pc) {
          log('ERROR: no pcRef on call_answer');
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        log('Set remote description (answer)');
        await drainIceCandidateQueue(pc);
      })();
    };

    const onIceCandidate = ({
      candidate,
    }: {
      callId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      log('← call_ice_candidate');
      void (async () => {
        const pc = pcRef.current;
        if (!pc) {
          log('Queuing ICE candidate (no PC yet)');
          iceCandidateQueueRef.current.push(candidate);
          return;
        }
        await addIceCandidateOrQueue(pc, candidate);
      })();
    };

    const onCallRejected = () => {
      log('← call_rejected');
      cleanup();
    };
    const onCallEnded = () => {
      log('← call_ended');
      cleanup();
    };
    const onCallError = ({ message }: { message: string }) =>
      log('← call_error:', message);

    socket.on('call_initiated', onCallInitiated);
    socket.on('call_incoming', onCallIncoming);
    socket.on('call_accepted', onCallAccepted);
    socket.on('call_offer', onCallOffer);
    socket.on('call_answer', onCallAnswer);
    socket.on('call_ice_candidate', onIceCandidate);
    socket.on('call_rejected', onCallRejected);
    socket.on('call_ended', onCallEnded);
    socket.on('call_error', onCallError);

    return () => {
      socket.off('call_initiated', onCallInitiated);
      socket.off('call_incoming', onCallIncoming);
      socket.off('call_accepted', onCallAccepted);
      socket.off('call_offer', onCallOffer);
      socket.off('call_answer', onCallAnswer);
      socket.off('call_ice_candidate', onIceCandidate);
      socket.off('call_rejected', onCallRejected);
      socket.off('call_ended', onCallEnded);
      socket.off('call_error', onCallError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  useEffect(() => {
    if (callState === 'outgoing') {
      setOutgoingElapsedSeconds(0);
      const id = setInterval(
        () => setOutgoingElapsedSeconds((s) => s + 1),
        1000,
      );
      outgoingTimerRef.current = id;
      return () => {
        clearInterval(id);
        outgoingTimerRef.current = null;
      };
    }
  }, [callState]);

  return {
    callState,
    callType,
    callId,
    incomingCall,
    remotePeerName,
    callDurationSeconds,
    outgoingElapsedSeconds,
    isMuted,
    isVideoOff,
    localVideoRef,
    remoteStream,
    remoteTrackCount,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  };
}
