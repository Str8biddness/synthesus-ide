import { useState, useEffect, useRef, useCallback } from "react";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export const useWebRTC = (roomId, userId, onRemoteStream, onUserJoined, onUserLeft) => {
  const [localStream, setLocalStream] = useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState([]);
  
  const peerConnections = useRef({});
  const wsRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  // Initialize WebSocket connection for signaling
  const connectSignaling = useCallback(() => {
    if (!roomId || !userId) return;

    const backendUrl = process.env.REACT_APP_BACKEND_URL || "";
    const wsProtocol = backendUrl.startsWith("https") ? "wss" : "ws";
    const wsHost = backendUrl.replace(/^https?:\/\//, "").replace(/\/api$/, "");
    const token = localStorage.getItem("token");
    const wsUrl = `${wsProtocol}://${wsHost}/ws/rtc/${roomId}?userId=${userId}&token=${token || ""}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebRTC signaling connected");
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      await handleSignalingMessage(data);
    };

    ws.onerror = (error) => {
      console.error("WebRTC signaling error:", error);
    };

    ws.onclose = () => {
      console.log("WebRTC signaling disconnected");
    };

    return () => {
      ws.close();
    };
  }, [roomId, userId]);

  const handleSignalingMessage = async (data) => {
    const { type, from, payload } = data;

    switch (type) {
      case "user_joined":
        if (from !== userId) {
          onUserJoined?.(from);
          await createPeerConnection(from, true);
        }
        break;

      case "user_left":
        if (from !== userId) {
          onUserLeft?.(from);
          closePeerConnection(from);
        }
        break;

      case "offer":
        await handleOffer(from, payload);
        break;

      case "answer":
        await handleAnswer(from, payload);
        break;

      case "ice_candidate":
        await handleIceCandidate(from, payload);
        break;

      default:
        break;
    }
  };

  const createPeerConnection = async (peerId, isInitiator) => {
    if (peerConnections.current[peerId]) {
      return peerConnections.current[peerId];
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConnections.current[peerId] = pc;

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage({
          type: "ice_candidate",
          to: peerId,
          payload: event.candidate,
        });
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      onRemoteStream?.(peerId, remoteStream);
      setConnectedPeers((prev) => {
        if (!prev.includes(peerId)) {
          return [...prev, peerId];
        }
        return prev;
      });
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        closePeerConnection(peerId);
      }
    };

    // Create offer if initiator
    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignalingMessage({
        type: "offer",
        to: peerId,
        payload: offer,
      });
    }

    return pc;
  };

  const handleOffer = async (from, offer) => {
    const pc = await createPeerConnection(from, false);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendSignalingMessage({
      type: "answer",
      to: from,
      payload: answer,
    });
  };

  const handleAnswer = async (from, answer) => {
    const pc = peerConnections.current[from];
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const handleIceCandidate = async (from, candidate) => {
    const pc = peerConnections.current[from];
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const closePeerConnection = (peerId) => {
    const pc = peerConnections.current[peerId];
    if (pc) {
      pc.close();
      delete peerConnections.current[peerId];
    }
    setConnectedPeers((prev) => prev.filter((id) => id !== peerId));
  };

  const sendSignalingMessage = (message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ ...message, from: userId }));
    }
  };

  // Start local media stream
  const startMedia = useCallback(async (video = true, audio = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: 320, height: 240, facingMode: "user" } : false,
        audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
      });
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsVideoEnabled(video);
      setIsAudioEnabled(audio);

      // Add tracks to existing peer connections
      Object.values(peerConnections.current).forEach((pc) => {
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
      });

      return stream;
    } catch (error) {
      console.error("Failed to get media:", error);
      return null;
    }
  }, []);

  // Stop local media
  const stopMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: false,
      });

      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);

      // Replace video track in all peer connections
      const screenTrack = screenStream.getVideoTracks()[0];
      Object.values(peerConnections.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      });

      // Handle screen share stop
      screenTrack.onended = () => {
        stopScreenShare();
      };

      return screenStream;
    } catch (error) {
      console.error("Failed to share screen:", error);
      return null;
    }
  }, []);

  // Stop screen sharing
  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);

      // Restore camera video track
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          Object.values(peerConnections.current).forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track?.kind === "video");
            if (sender) {
              sender.replaceTrack(videoTrack);
            }
          });
        }
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMedia();
      stopScreenShare();
      Object.keys(peerConnections.current).forEach(closePeerConnection);
      wsRef.current?.close();
    };
  }, [stopMedia, stopScreenShare]);

  return {
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    connectedPeers,
    startMedia,
    stopMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    connectSignaling,
  };
};

export default useWebRTC;
