import React from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism.css'; 

import './Workspace.css';

const Workspace = ({ mode, value, onChange, onSubmit }) => {
  const wordCount = mode === 'TEXT_PAD' ? value.trim().split(/\s+/).filter(w => w.length > 0).length : 0;

  return (
    <div className="workspace-overlay">
      <div className="workspace-card">
        <div className="workspace-header">
          <div className="workspace-title">
            <h3>{mode === 'CODE' ? 'Coding Challenge' : 'Professional Writing Suite'}</h3>
            <span className="workspace-badge">{mode === 'CODE' ? 'JavaScript Environment' : 'Rich Text Editor'}</span>
          </div>
          <div className="workspace-controls">
            {mode === 'TEXT_PAD' && <span className="word-count">{wordCount} words</span>}
          </div>
        </div>
        
        <div className="workspace-editor-container">
          {mode === 'CODE' ? (
            <div className="code-editor-wrapper">
              <Editor
                value={value}
                onValueChange={onChange}
                highlight={code => highlight(code, languages.js)}
                padding={20}
                style={{
                  fontFamily: '"Fira code", "Fira Mono", monospace',
                  fontSize: 14,
                  backgroundColor: '#1e1e1e',
                  color: '#f0f0f0',
                  minHeight: '400px',
                  borderRadius: '8px',
                }}
              />
            </div>
          ) : (
            <div className="text-editor-wrapper">
              <div className="editor-toolbar">
                <button className="toolbar-btn">B</button>
                <button className="toolbar-btn">I</button>
                <button className="toolbar-btn">U</button>
                <div className="toolbar-divider"></div>
                <button className="toolbar-btn">H1</button>
                <button className="toolbar-btn">H2</button>
                <div className="toolbar-divider"></div>
                <button className="toolbar-btn">List</button>
                <button className="toolbar-btn">Quote</button>
              </div>
              <textarea 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                className="writing-pad"
                placeholder="Start writing your professional response here..."
                spellCheck="true"
              />
            </div>
          )}
        </div>

        <div className="workspace-actions">
          <button onClick={onSubmit} className="btn btn-primary btn-large">
            {mode === 'CODE' ? 'Run & Submit Code' : 'Submit Response'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Workspace;
