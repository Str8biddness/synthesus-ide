import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Link,
  Copy,
  Check,
  UserPlus,
  Circle,
  Wifi,
  WifiOff,
  Edit,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export const CollaborationPanel = ({
  isConnected,
  users,
  roomId,
  userName,
  userColor,
  onSetUserName,
  onCreateRoom,
  onJoinRoom,
}) => {
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [newUserName, setNewUserName] = useState(userName);
  const [copied, setCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);

  const copyRoomLink = () => {
    const link = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Room link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinRoom = () => {
    if (joinRoomId.trim()) {
      onJoinRoom(joinRoomId.trim());
      setShowJoinDialog(false);
      setJoinRoomId("");
    }
  };

  const handleSaveName = () => {
    if (newUserName.trim()) {
      onSetUserName(newUserName.trim());
      setIsEditingName(false);
      toast.success("Name updated!");
    }
  };

  return (
    <div data-testid="collaboration-panel" className="h-full flex flex-col bg-[#0B0B14]/60">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-pink-500" />
            <h2 className="font-heading font-semibold text-white">Collaboration</h2>
          </div>
          <div className="flex items-center gap-1">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
          </div>
        </div>

        {/* Connection Status */}
        <div className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 ${
          isConnected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
        }`}>
          <Circle className={`w-2 h-2 ${isConnected ? "fill-green-500" : "fill-red-500"}`} />
          {isConnected ? "Connected" : "Disconnected"}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Your Profile */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 uppercase tracking-wider">Your Profile</label>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: userColor }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
              {isEditingName ? (
                <div className="flex-1 flex gap-2">
                  <Input
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="input-cosmic h-8 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  />
                  <Button size="sm" onClick={handleSaveName} className="btn-cosmic h-8">
                    Save
                  </Button>
                </div>
              ) : (
                <>
                  <span className="text-sm text-white flex-1">{userName}</span>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Room Info */}
          {roomId && (
            <div className="space-y-2">
              <label className="text-xs text-zinc-400 uppercase tracking-wider">Current Room</label>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <code className="text-xs text-pink-400 bg-black/30 px-2 py-1 rounded">
                    {roomId.slice(0, 8)}...
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyRoomLink}
                    className="text-zinc-400 hover:text-white h-7"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-[10px] text-zinc-500">Share this link to invite others</p>
              </div>
            </div>
          )}

          {/* Room Actions */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 uppercase tracking-wider">Actions</label>
            <div className="flex gap-2">
              <Button
                data-testid="create-room-btn"
                onClick={onCreateRoom}
                className="flex-1 btn-cosmic text-sm"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                New Room
              </Button>
              <Button
                data-testid="join-room-btn"
                variant="outline"
                onClick={() => setShowJoinDialog(true)}
                className="flex-1 btn-secondary text-sm"
              >
                <Link className="w-4 h-4 mr-2" />
                Join Room
              </Button>
            </div>
          </div>

          {/* Active Users */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 uppercase tracking-wider">
              Active Users ({users.length + 1})
            </label>
            <div className="space-y-2">
              {/* Current user */}
              <div className="flex items-center gap-3 p-2 rounded-lg bg-pink-500/10 border border-pink-500/30">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: userColor }}
                >
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-white flex-1">{userName}</span>
                <span className="text-[10px] text-pink-400">You</span>
              </div>

              {/* Other users */}
              <AnimatePresence>
                {users.map((user) => (
                  <motion.div
                    key={user.clientId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: user.color }}
                    >
                      {user.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <span className="text-sm text-zinc-300 flex-1">{user.name || "Anonymous"}</span>
                    {user.cursor && (
                      <span className="text-[10px] text-zinc-500">
                        L{user.cursor.lineNumber}
                      </span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {users.length === 0 && (
                <p className="text-xs text-zinc-500 text-center py-4">
                  No other users in this room yet
                </p>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Join Room Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="bg-[#0B0B14] border-white/10">
          <DialogHeader>
            <DialogTitle className="gradient-text">Join Collaboration Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400 uppercase tracking-wider">Room ID or Link</Label>
              <Input
                data-testid="join-room-input"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="Enter room ID..."
                className="input-cosmic"
                onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
              />
            </div>
            <Button onClick={handleJoinRoom} className="w-full btn-cosmic">
              Join Room
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollaborationPanel;
