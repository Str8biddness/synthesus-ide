// Sample project data for the IDE
export const SAMPLE_FILES = [
  {
    name: "synthesus-project",
    type: "folder",
    path: "/synthesus-project",
    children: [
      {
        name: "src",
        type: "folder",
        path: "/synthesus-project/src",
        children: [
          {
            name: "index.js",
            type: "file",
            path: "/synthesus-project/src/index.js",
            content: `// SYNTHESUS AI IDE - Entry Point
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root')
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
          },
          {
            name: "App.jsx",
            type: "file",
            path: "/synthesus-project/src/App.jsx",
            content: `// Main Application Component
import { useState, useEffect } from 'react';

export default function App() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      const response = await fetch('/api/data');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };
  
  return (
    <div className="app">
      <h1>Hello World</h1>
    </div>
  );
}`,
          },
          {
            name: "utils.js",
            type: "file",
            path: "/synthesus-project/src/utils.js",
            content: `// Utility Functions

export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US').format(new Date(date));
};

export const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};`,
          },
        ],
      },
      {
        name: "package.json",
        type: "file",
        path: "/synthesus-project/package.json",
        content: `{
  "name": "synthesus-project",
  "version": "1.0.0",
  "dependencies": {
    "react": "^19.0.0"
  }
}`,
      },
      {
        name: "README.md",
        type: "file",
        path: "/synthesus-project/README.md",
        content: `# SYNTHESUS Project

A cosmic journey into AI-powered development.

## Getting Started

\`\`\`bash
npm install
npm start
\`\`\``,
      },
    ],
  },
];
