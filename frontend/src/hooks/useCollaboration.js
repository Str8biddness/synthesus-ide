import { useState, useEffect, useCallback, useRef } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

const COLORS = [
  "#FF007F", "#FFD700", "#00FF88", "#00D4FF",
  "#FF6B00", "#A855F7", "#EF4444", "#10B981"
];

const generateUserId = () => {
  const stored = localStorage.getItem("synthesus_user_id");
  if (stored) return stored;
  const id = `user_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem("synthesus_user_id", id);
  return id;
};

const generateUserName = () => {
  const stored = localStorage.getItem("synthesus_user_name");
  if (stored) return stored;
  const adjectives = ["Cosmic", "Stellar", "Quantum", "Nebula", "Nova", "Astral"];
  const nouns = ["Coder", "Dev", "Hacker", "Builder", "Creator", "Wizard"];
  const name = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}`;
  localStorage.setItem("synthesus_user_name", name);
  return name;
};

export const useCollaboration = (roomId, enabled = true) => {
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState([]);
  const [awareness, setAwareness] = useState(null);
  const [ydoc, setYdoc] = useState(null);
  const providerRef = useRef(null);
  const userId = useRef(generateUserId());
  const userName = useRef(generateUserName());
  const userColor = useRef(COLORS[Math.floor(Math.random() * COLORS.length)]);

  useEffect(() => {
    if (!enabled || !roomId) return;

    // Create Y.js document
    const doc = new Y.Doc();
    setYdoc(doc);

    // Get WebSocket URL from backend URL
    const backendUrl = process.env.REACT_APP_BACKEND_URL || "";
    const wsProtocol = backendUrl.startsWith("https") ? "wss" : "ws";
    const wsHost = backendUrl.replace(/^https?:\/\//, "").replace(/\/api$/, "");
    const wsUrl = `${wsProtocol}://${wsHost}/ws/collab`;

    // Create WebSocket provider
    const provider = new WebsocketProvider(wsUrl, roomId, doc, {
      connect: true,
      params: {
        userId: userId.current,
        userName: userName.current,
      },
    });
    providerRef.current = provider;

    // Set up awareness (user presence)
    const awarenessInstance = provider.awareness;
    setAwareness(awarenessInstance);

    // Set local user state
    awarenessInstance.setLocalStateField("user", {
      id: userId.current,
      name: userName.current,
      color: userColor.current,
    });

    // Handle connection status
    provider.on("status", ({ status }) => {
      setIsConnected(status === "connected");
    });

    // Handle awareness updates
    awarenessInstance.on("change", () => {
      const states = awarenessInstance.getStates();
      const userList = [];
      states.forEach((state, clientId) => {
        if (state.user && clientId !== doc.clientID) {
          userList.push({
            clientId,
            ...state.user,
            cursor: state.cursor,
            selection: state.selection,
          });
        }
      });
      setUsers(userList);
    });

    return () => {
      provider.disconnect();
      provider.destroy();
      doc.destroy();
    };
  }, [roomId, enabled]);

  const updateCursor = useCallback((position, selection = null) => {
    if (awareness) {
      awareness.setLocalStateField("cursor", position);
      if (selection) {
        awareness.setLocalStateField("selection", selection);
      }
    }
  }, [awareness]);

  const setUserName = useCallback((name) => {
    userName.current = name;
    localStorage.setItem("synthesus_user_name", name);
    if (awareness) {
      awareness.setLocalStateField("user", {
        id: userId.current,
        name,
        color: userColor.current,
      });
    }
  }, [awareness]);

  const disconnect = useCallback(() => {
    if (providerRef.current) {
      providerRef.current.disconnect();
    }
  }, []);

  const reconnect = useCallback(() => {
    if (providerRef.current) {
      providerRef.current.connect();
    }
  }, []);

  return {
    isConnected,
    users,
    ydoc,
    awareness,
    userId: userId.current,
    userName: userName.current,
    userColor: userColor.current,
    updateCursor,
    setUserName,
    disconnect,
    reconnect,
  };
};

export default useCollaboration;
