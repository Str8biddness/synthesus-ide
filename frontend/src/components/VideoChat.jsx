import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Monitor,
  MonitorOff,
  Maximize2,
  Minimize2,
  Users,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useWebRTC } from "@/hooks/useWebRTC";

const VideoTile = ({ stream, name, color, isMuted, isLocal, isSmall }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-[#0B0B14] border border-white/10 ${
        isSmall ? "w-32 h-24" : "w-full aspect-video"
      }`}
    >
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
            style={{ backgroundColor: color || "#FF007F" }}
          >
            {name?.charAt(0)?.toUpperCase() || "?"}
          </div>
        </div>
      )}
      
      {/* Name badge */}
      <div className="absolute bottom-2 left-2 flex items-center gap-2">
        <span className="px-2 py-1 bg-black/60 rounded text-xs text-white backdrop-blur-sm">
          {isLocal ? "You" : name || "User"}
        </span>
        {isMuted && <MicOff className="w-3 h-3 text-red-500" />}
      </div>
    </div>
  );
};

export const VideoChat = ({ roomId, userId, userName, userColor, users, onClose }) => {
  const [isInCall, setIsInCall] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState({});
  
  const handleRemoteStream = useCallback((peerId, stream) => {
    setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
  }, []);

  const handleUserJoined = useCallback((peerId) => {
    console.log("User joined:", peerId);
  }, []);

  const handleUserLeft = useCallback((peerId) => {
    setRemoteStreams((prev) => {
      const updated = { ...prev };
      delete updated[peerId];
      return updated;
    });
  }, []);

  const {
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
  } = useWebRTC(roomId, userId, handleRemoteStream, handleUserJoined, handleUserLeft);

  const joinCall = async () => {
    await startMedia(true, true);
    connectSignaling();
    setIsInCall(true);
  };

  const leaveCall = () => {
    stopMedia();
    stopScreenShare();
    setIsInCall(false);
    setRemoteStreams({});
  };

  const handleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      await startScreenShare();
    }
  };

  const participantCount = Object.keys(remoteStreams).length + (localStream ? 1 : 0);

  return (
    <motion.div
      data-testid="video-chat"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`fixed ${
        isExpanded
          ? "inset-4 z-50"
          : "bottom-4 right-4 w-80 z-40"
      } bg-[#0B0B14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0B0B14]/80">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-pink-500" />
          <span className="font-heading font-semibold text-white">
            {isInCall ? "In Call" : "Video Chat"}
          </span>
          {isInCall && (
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
              {participantCount} {participantCount === 1 ? "participant" : "participants"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-white"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-white"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Video Grid */}
      <ScrollArea className="flex-1 p-4">
        {isInCall ? (
          <div className={`grid gap-3 ${
            isExpanded
              ? participantCount <= 2 ? "grid-cols-2" : "grid-cols-3"
              : "grid-cols-1"
          }`}>
            {/* Local video */}
            <VideoTile
              stream={localStream}
              name={userName}
              color={userColor}
              isMuted={!isAudioEnabled}
              isLocal
            />
            
            {/* Remote videos */}
            {Object.entries(remoteStreams).map(([peerId, stream]) => {
              const remoteUser = users.find((u) => u.id === peerId);
              return (
                <VideoTile
                  key={peerId}
                  stream={stream}
                  name={remoteUser?.name || "User"}
                  color={remoteUser?.color}
                  isMuted={false}
                  isLocal={false}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-pink-400" />
            </div>
            <h3 className="text-lg font-heading font-semibold text-white mb-2">
              Start a Video Call
            </h3>
            <p className="text-sm text-zinc-400 mb-6 max-w-xs">
              Join the call to collaborate face-to-face with your team
            </p>
            <Button
              data-testid="join-call-btn"
              onClick={joinCall}
              className="btn-cosmic px-6"
            >
              <Video className="w-4 h-4 mr-2" />
              Join Call
            </Button>
          </div>
        )}
      </ScrollArea>

      {/* Controls */}
      {isInCall && (
        <div className="flex items-center justify-center gap-3 p-4 border-t border-white/10 bg-[#0B0B14]/80">
          <Button
            data-testid="toggle-audio-btn"
            variant="ghost"
            size="icon"
            className={`h-12 w-12 rounded-full ${
              isAudioEnabled
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-red-500/20 text-red-500 hover:bg-red-500/30"
            }`}
            onClick={toggleAudio}
          >
            {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>
          
          <Button
            data-testid="toggle-video-btn"
            variant="ghost"
            size="icon"
            className={`h-12 w-12 rounded-full ${
              isVideoEnabled
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-red-500/20 text-red-500 hover:bg-red-500/30"
            }`}
            onClick={toggleVideo}
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>
          
          <Button
            data-testid="screen-share-btn"
            variant="ghost"
            size="icon"
            className={`h-12 w-12 rounded-full ${
              isScreenSharing
                ? "bg-pink-500/20 text-pink-500 hover:bg-pink-500/30"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
            onClick={handleScreenShare}
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          </Button>
          
          <Button
            data-testid="leave-call-btn"
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-red-500 text-white hover:bg-red-600"
            onClick={leaveCall}
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      )}
    </motion.div>
  );
};

export default VideoChat;
