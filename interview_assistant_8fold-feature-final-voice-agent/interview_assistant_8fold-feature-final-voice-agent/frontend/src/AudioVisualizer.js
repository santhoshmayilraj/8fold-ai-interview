import React, { useEffect, useRef, useCallback } from 'react';
import './AudioVisualizer.css';


const AudioVisualizer = ({ isListening }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);

  const startVisualizer = useCallback(async () => {
    try {
      // request permission to access the microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create Audio Context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      
      // Create Analyser
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256; // Resolution of bars

      // Connect Source
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);

      const draw = () => {
        if (!analyserRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        analyserRef.current.getByteFrequencyData(dataArray);

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i] / 2; // Scale height

          // Dynamic Color: Green/Blue based on height
          const r = barHeight + (25 * (i/bufferLength));
          const g = 250 * (i/bufferLength);
          const b = 50;

          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

          x += barWidth + 1;
        }

        animationRef.current = requestAnimationFrame(draw);
      };

      draw();
    } catch (err) {
      console.error("Visualizer Error:", err);
    }
  }, []);

  const stopVisualizer = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    
    // Close context and stop tracks to release mic
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isListening) {
      startVisualizer();
    } else {
      stopVisualizer();
    }
    return () => stopVisualizer();
  }, [isListening, startVisualizer, stopVisualizer]);

  return (
    <div className="visualizer-container">
      <canvas 
        ref={canvasRef} 
        width="300" 
        height="60" 
      />
    </div>
  );
};

export default AudioVisualizer;