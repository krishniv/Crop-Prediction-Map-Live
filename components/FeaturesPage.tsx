import React from 'react';
import './FeaturesPage.css';

interface FeaturesPageProps {
  onBack?: () => void;
}

export const FeaturesPage: React.FC<FeaturesPageProps> = ({ onBack }) => {
  const features = [
    {
      icon: 'apps',
      title: 'Crop Recommendations',
      description: 'Get AI-powered crop recommendations based on your farm location, soil type, climate, and seasonal conditions.'
    },
    {
      icon: 'map',
      title: '3D Interactive Map',
      description: 'Visualize your farm location on an interactive 3D map with detailed terrain and location information.'
    },
    {
      icon: 'wb_sunny',
      title: 'Weather Data',
      description: 'Access real-time weather information including temperature, humidity, wind speed, and forecasts for your location.'
    },
    {
      icon: 'science',
      title: 'Soil Analysis',
      description: 'Upload soil images for AI-powered analysis to get detailed nutrient information and fertilizer recommendations.'
    },
    {
      icon: 'analytics',
      title: 'Yield Predictions',
      description: 'Receive data-driven yield estimates and crop performance predictions to optimize your farming decisions.'
    },
    {
      icon: 'newspaper',
      title: 'Agricultural News',
      description: 'Stay updated with the latest agricultural news, trends, and best practices from trusted sources.'
    }
  ];

  return (
    <div className="features-page">
      <div className="features-container">
        <div className="features-header">
          <h1 className="page-title">
            <span className="material-symbols-outlined">apps</span>
            AgriConnect Features
          </h1>
          <p className="page-subtitle">Discover how AgriConnect can help optimize your farming operations</p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">
                <span className="material-symbols-outlined">{feature.icon}</span>
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="features-cta">
          <button 
            className="cta-button"
            onClick={onBack}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

