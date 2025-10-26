import React from 'react';
import './SoilAnalyzerButton.css';

interface SoilAnalyzerButtonProps {
  onClick: () => void;
}

export const SoilAnalyzerButton: React.FC<SoilAnalyzerButtonProps> = ({ onClick }) => {
  return (
    <button 
      className="soil-analyzer-button"
      onClick={onClick}
      title="Soil Analysis"
    >
      <div className="button-icon">🌱</div>
      <div className="button-text">
        <span className="button-title">Soil Analysis</span>
        <span className="button-subtitle">AI-Powered</span>
      </div>
    </button>
  );
};
